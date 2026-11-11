import * as Schema from "effect/Schema";
import { TrimmedNonEmptyString } from "./baseSchemas.ts";

export const BROWSER_PROFILE_NAME_MAX_LENGTH = 48;
export const BROWSER_PROFILE_MAX_COUNT = 24;

/** Control characters could collide with client cache-key delimiters and select another partition. */
export const BrowserProfileId = TrimmedNonEmptyString.check(
  Schema.isMaxLength(64),
  Schema.isPattern(/^[^\p{Cc}]+$/u),
);
export type BrowserProfileId = typeof BrowserProfileId.Type;

export const BrowserProfileName = TrimmedNonEmptyString.check(
  Schema.isMaxLength(BROWSER_PROFILE_NAME_MAX_LENGTH),
);

export const BrowserProfileKind = Schema.Literals(["persistent", "incognito"]);
export type BrowserProfileKind = typeof BrowserProfileKind.Type;

export const BROWSER_PROFILE_USER_AGENT_MAX_LENGTH = 512;

/** "chrome" derives a Chrome identity from the running engine; "custom" sends `customUserAgent`. */
export const BrowserProfileUserAgentMode = Schema.Literals(["native", "chrome", "custom"]);
export type BrowserProfileUserAgentMode = typeof BrowserProfileUserAgentMode.Type;

/** Header values must stay printable ASCII; Chromium rejects anything else. */
export const BrowserProfileCustomUserAgent = TrimmedNonEmptyString.check(
  Schema.isMaxLength(BROWSER_PROFILE_USER_AGENT_MAX_LENGTH),
  Schema.isPattern(/^[\x20-\x7E]+$/),
);

export const BrowserProfile = Schema.Struct({
  id: BrowserProfileId,
  name: BrowserProfileName,
  kind: BrowserProfileKind,
  userAgentMode: Schema.optionalKey(BrowserProfileUserAgentMode),
  customUserAgent: Schema.optionalKey(BrowserProfileCustomUserAgent),
});
export type BrowserProfile = typeof BrowserProfile.Type;

export const DEFAULT_BROWSER_PROFILE_ID: BrowserProfileId = "default";
export const INCOGNITO_BROWSER_PROFILE_ID: BrowserProfileId = "incognito";

export const BUILT_IN_BROWSER_PROFILES: ReadonlyArray<BrowserProfile> = [
  { id: DEFAULT_BROWSER_PROFILE_ID, name: "Default", kind: "persistent" },
  { id: INCOGNITO_BROWSER_PROFILE_ID, name: "Incognito", kind: "incognito" },
];

export function isBuiltInBrowserProfileId(id: string): boolean {
  return BUILT_IN_BROWSER_PROFILES.some((profile) => profile.id === id);
}

/** Deduplicates ids sharing a partition; only the built-in incognito id is actually ephemeral. */
export function resolveBrowserProfiles(
  userProfiles: ReadonlyArray<BrowserProfile>,
): ReadonlyArray<BrowserProfile> {
  const seen = new Set(BUILT_IN_BROWSER_PROFILES.map((profile) => profile.id));
  const resolved = [...BUILT_IN_BROWSER_PROFILES];
  for (const profile of userProfiles) {
    if (seen.has(profile.id)) continue;
    seen.add(profile.id);
    resolved.push(profile.kind === "persistent" ? profile : { ...profile, kind: "persistent" });
  }
  return resolved;
}

export function findBrowserProfile(
  profiles: ReadonlyArray<BrowserProfile>,
  id: string | undefined,
): BrowserProfile | undefined {
  return id === undefined ? undefined : profiles.find((profile) => profile.id === id);
}

/**
 * Chrome's reduced User-Agent for the running engine: app and Electron tokens removed, version
 * reduced to `<major>.0.0.0`. The platform token is already Chrome's frozen one.
 */
export function chromeUserAgentFor(nativeUserAgent: string): string {
  return nativeUserAgent
    .replace(/( \(KHTML, like Gecko\)) .*?( Chrome\/)/, "$1$2")
    .replace(/ Electron\/\S+/, "")
    .replace(/ Chrome\/(\d+)[\d.]*/, " Chrome/$1.0.0.0");
}

/**
 * The User-Agent a profile's guests should use, or undefined to keep Electron's native one.
 * Built-in profiles never override: a rewritten identity breaks Cloudflare Turnstile.
 * An explicit "native" returns the exact native string so a live guest can switch back.
 */
export function browserProfileUserAgent(
  nativeUserAgent: string,
  profile: BrowserProfile | undefined,
): string | undefined {
  if (profile === undefined || isBuiltInBrowserProfileId(profile.id)) return undefined;
  switch (profile.userAgentMode) {
    case undefined:
      return undefined;
    case "native":
      return nativeUserAgent;
    case "chrome":
      return chromeUserAgentFor(nativeUserAgent);
    case "custom":
      return profile.customUserAgent ?? nativeUserAgent;
  }
}

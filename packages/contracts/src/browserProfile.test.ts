import { describe, expect, it } from "@effect/vitest";
import * as Schema from "effect/Schema";

import {
  BUILT_IN_BROWSER_PROFILES,
  DEFAULT_BROWSER_PROFILE_ID,
  INCOGNITO_BROWSER_PROFILE_ID,
  resolveBrowserProfiles,
  browserProfileUserAgent,
  chromeUserAgentFor,
  BrowserProfile,
} from "./browserProfile.ts";

const work: BrowserProfile = { id: "profile-work", name: "Work", kind: "persistent" };

describe("resolveBrowserProfiles", () => {
  it("drops stored entries that collide with a built-in id", () => {
    const resolved = resolveBrowserProfiles([
      { id: DEFAULT_BROWSER_PROFILE_ID, name: "Hijacked", kind: "persistent" },
      { id: INCOGNITO_BROWSER_PROFILE_ID, name: "Not incognito", kind: "persistent" },
      work,
    ]);

    expect(resolved).toEqual([...BUILT_IN_BROWSER_PROFILES, work]);
  });
});

describe("resolveBrowserProfiles normalization", () => {
  it("reports a custom incognito profile as persistent", () => {
    const resolved = resolveBrowserProfiles([
      { id: "throwaway", name: "Throwaway", kind: "incognito" },
    ]);

    expect(resolved.find((profile) => profile.id === "throwaway")).toEqual({
      id: "throwaway",
      name: "Throwaway",
      kind: "persistent",
    });
  });
});

describe("browser profile User-Agent", () => {
  const native =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) T3CodeAlpha/0.1.6 Chrome/152.0.7977.130 Electron/44.10.0 Safari/537.36";
  const chrome =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36";

  it("derives Chrome's reduced identity from the running engine on every platform", () => {
    for (const platform of [
      "Macintosh; Intel Mac OS X 10_15_7",
      "Windows NT 10.0; Win64; x64",
      "X11; Linux x86_64",
    ]) {
      expect(
        chromeUserAgentFor(native.replace("Macintosh; Intel Mac OS X 10_15_7", platform)),
      ).toBe(chrome.replace("Macintosh; Intel Mac OS X 10_15_7", platform));
    }
  });

  it("keeps the native identity unless a user profile opts in", () => {
    expect(browserProfileUserAgent(native, undefined)).toBeUndefined();
    expect(browserProfileUserAgent(native, work)).toBeUndefined();
    expect(
      browserProfileUserAgent(native, {
        id: DEFAULT_BROWSER_PROFILE_ID,
        name: "Default",
        kind: "persistent",
        userAgentMode: "chrome",
      }),
    ).toBeUndefined();
    expect(browserProfileUserAgent(native, { ...work, userAgentMode: "native" })).toBe(native);
    expect(browserProfileUserAgent(native, { ...work, userAgentMode: "chrome" })).toBe(chrome);
  });

  it("sends the custom identity, falling back to native until one is saved", () => {
    expect(
      browserProfileUserAgent(native, {
        ...work,
        userAgentMode: "custom",
        customUserAgent: "UA/1",
      }),
    ).toBe("UA/1");
    expect(browserProfileUserAgent(native, { ...work, userAgentMode: "custom" })).toBe(native);
  });

  it("rejects custom identities that cannot be sent as a header", () => {
    const isProfile = Schema.is(BrowserProfile);
    expect(isProfile({ ...work, userAgentMode: "custom", customUserAgent: chrome })).toBe(true);
    expect(isProfile({ ...work, customUserAgent: "UA\r\nX-Injected: 1" })).toBe(false);
    expect(isProfile({ ...work, customUserAgent: "Navigateur/1 é" })).toBe(false);
    expect(isProfile({ ...work, userAgentMode: "firefox" })).toBe(false);
  });
});

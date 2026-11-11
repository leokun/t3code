# Import browser sessions

The desktop app can import cookies from another browser so you can reuse its signed-in sessions
in the preview browser.

Open **Settings → Browser → Browser profiles → Add profile**, then choose a browser under
**Import from**. Close the source browser before importing, and allow an operating-system keyring
unlock prompt if one appears.

This is a one-time copy. Later login changes stay separate between the two browsers, and some
sites may still require you to sign in again.

On macOS, Safari imports need Full Disk Access. Choose **Allow**, drag T3 Code into the
System Settings permission list, and turn access on. **Continue** becomes available when access
is detected. macOS may require you to quit and reopen T3 Code before the grant applies; reopen
the import wizard afterward. You can revoke Full Disk Access once the import is done.

On Windows, import supports Firefox, Zen, and Helium profiles that use standard profile encryption.
Other Chromium-based browsers use app-bound encryption and cannot be imported. Partitioned cookies
are skipped on all platforms.

## Sites that reject the preview browser

Some sites show an "unsupported browser" page because the preview identifies itself as Electron.
Add a profile, open its **⋯** menu, and set **User-Agent** to **Chrome**, or **Custom…** to enter
your own. Reload open tabs of that profile to apply it. The Default and Incognito profiles always
keep the native identity, because some sign-in checks such as Cloudflare Turnstile fail with a
rewritten one. If a site already sent you to its unsupported page, open the site's home page again.

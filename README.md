# CleanFrame

A quiet, remote-friendly home screen for Samsung The Frame: family photographs, a clock, local weather, streaming apps, and HDMI shortcuts.

This is Yitzi’s fork of [Nathan Clark’s CleanFrame](https://github.com/nthnclrk/CleanFrame). It extends the original interface with private family-photo imports, configurable weather, an Adults app folder, and shortcuts for a cable box and Nex Playground. The original MIT licence and third-party notices are retained.

![CleanFrame interface with a bundled wallpaper](docs/images/cleanframe-dock.jpg)

*The screenshot shows the upstream interface with a bundled wallpaper. Personal family photos are deliberately excluded from this repository.*

## What works

- **Family-photo backgrounds:** import a folder of exported photos, preserve the complete photograph with blurred fills, and rotate through the family collection. The local installation uses a five-minute interval.
- **Weather beneath the clock:** temperature, conditions, and daily high/low; editable US ZIP code and Fahrenheit/Celsius in Settings.
- **Streaming shortcuts:** Netflix, Disney+, Prime Video, HBO Max, Apple TV, Paramount+, and Peacock, subject to what is installed on the TV.
- **Adults folder:** groups Netflix, HBO Max, Apple TV, Paramount+, and Peacock. Paramount+ can also appear on the main dock.
- **HDMI shortcuts:** Fios TV on HDMI 1 and Nex Playground on HDMI 4 in this installation.
- **Art shortcut:** opens the TV’s Art application.
- **Remote-first interface:** directional navigation, selection, Back, saved preferences, configurable Home apps, Dock/List layouts, backgrounds, typography, and focus styles.
- **Optional native Home integration:** configured and tested separately on this installation, with a private recovery baseline. Installing the widget alone does not replace Samsung Home.

The Adults folder is organization, not a parental-control boundary. Netflix opens its normal application; direct launch into a particular Kids profile is not implemented. Configure profile restrictions inside each streaming service.

## Try it on your computer

The supported development baseline is Node.js 22+ and Python 3.10+. The browser preview does not require a TV, certificates, or a Samsung account.

```sh
git clone https://github.com/itsme188/CleanFrame.git
cd CleanFrame
npm ci
npm run dev:public
```

Open [localhost:4795/home/](http://localhost:4795/home/). Use arrow keys, Enter, and Escape, or click the controls. Actual app launches, HDMI changes, and Samsung system screens require the TV.

The public preview uses bundled Manrope, Geist, and Newsreader fonts. It excludes private photos and personal defaults. `npm run dev` additionally loads a private overlay if one exists locally.

## Set up your own TV

This is a source project, **not a universal one-click installer**. Start with the [TV setup guide](docs/agent-tv-setup-guide.md), [agent guide](docs/for-agents.md), and [development notes](docs/development.md). Some older documentation and the native helper describe the upstream author’s different TV; see the compatibility table below before using device tools.

1. Verify your model, firmware, and Tizen version. Put the TV and development computer on the same local network.
2. Install the official Samsung/Tizen TV development tools and enable Developer Mode on the TV.
3. Create your own Samsung author and distributor certificates. Include your TV’s DUID in the distributor certificate. Keep keys and passwords private.
4. Give an independent installation its own package/application identity. Update identity references consistently in `app/config.xml`, `app/device.js`, checks, and any device helpers. Preserve that identity and author certificate for subsequent updates.
5. Discover the installed app IDs on your TV and adapt shortcuts and HDMI ports. Service IDs can differ between installations.
6. Configure ignored local signing/device files, build, install, and confirm the result physically with your remote.
7. Consider native Home routing only as a separate, explicitly planned step with an exact-value recovery baseline. The app can also be opened manually.

Local tooling expects `.local/tizen-sdk/`, `.local/device.json` containing a `host` field, and `.local/signing.json` with the saved Samsung profile:

```json
{
  "profiles_path": "/absolute/path/to/your/sdk-data/profile/profiles.xml",
  "profile": "YourSamsungProfile"
}
```

Once the SDK, identity, certificates, and local files are correctly prepared:

```sh
npm run package
npm run tv:install
npm run tv:launch
```

These commands sign and deploy a **personal build**. It can include private photos and licensed local fonts; do not upload that widget as a public release. They are not an unattended setup process for someone else’s TV.

## Add and update family photos

An Apple Photos album is convenient for organizing the collection, but **automatic album synchronization is not implemented**. The current workflow is explicit export, import, package, and install:

1. Create an album in Apple Photos, such as `CleanFrame`.
2. Export the album into a local folder. High-quality JPEG exports are suitable. Dragging photos out also works when the resulting files retain adequate resolution.
3. With Python’s Pillow library available, import that folder:

   ```sh
   python3 scripts/import-family-photos.py "/absolute/path/to/exported-photos"
   ```

4. Preview with `npm run dev`, then rebuild and install using the existing signing identity.

The importer accepts JPEG, PNG, TIFF, and HEIC/HEIF. HEIC conversion uses macOS `sips`; use JPEG exports on other platforms. It creates 1920×1080 TV images and precomputed material assets, preserves complete portrait photographs, removes EXIF metadata from generated JPEGs, and leaves source files unchanged. The TV interface is rendered at a logical 1080p resolution, even on a 4K panel.

Generated photos and the catalogue live under ignored `.local/personal/overlay/`. Only files referenced by the current catalogue enter the personal package. Re-import the complete desired collection when changing the album. Old generated files may remain locally, but unreferenced photos are not packaged. Choose a family photo to keep rotation within that collection; the bundled wallpapers remain available separately.

## Configure weather

Open **Settings → Weather**, enter a five-digit US ZIP code, select Fahrenheit or Celsius, and save. You can change the location or turn weather off from the same panel.

The public source has no personal ZIP default and makes no weather request until configured. Settings and cached weather are stored locally on the device. Weather uses Open-Meteo forecasts and its GeoNames-backed geocoding service; a lookup sends the ZIP code, and the forecast request sends the resolved coordinates. No API key is required by the current implementation. Review provider terms for your intended deployment.

Weather refreshes approximately every 15 minutes while the app is visible. Requests have timeouts, old responses cannot replace newer settings, and stale cached data is labelled. Very old cached data expires. Internet access is required for fresh conditions.

## Apps, folders, and remote behaviour

Use the Home app editor to choose and reorder entries. The private installation currently has Fios, Disney+, Prime Video, Playground, Art, Netflix, Paramount+, and Adults. Private defaults can add entries without putting personal configuration into shared source.

The Adults folder contains five launch targets and supports Back to the previous view. Apps must be installed and signed in separately. Opening a streaming app hands control to that app; its Back behaviour and exit dialog belong to the streaming service.

HDMI selection does not necessarily wake the connected device. Nex Playground currently needs its own remote to wake it. Back behaviour on an HDMI input depends on the TV and routing setup. The Samsung Home button opens Samsung Home unless native routing has been separately configured.

## Tested hardware and current limits

Results recorded on 2026-10-20:

| Setup | Evidence |
| --- | --- |
| This fork: Samsung QN65LS03BDFXZA / LS03B, firmware T-PTMAKUC-1720.7, Tizen 6.5, ARMv7 | Signed installation and launch succeeded. Owner confirmed family-photo background and weather on the TV. |
| App/input navigation on this installation | Owner confirmed Fios, Prime Video, Playground, and Art launch; return to CleanFrame was confirmed after separate native routing work. Art launch was slow. |
| Disney+ | Initially opened, then stalled at its loading spinner when launched through both CleanFrame and Samsung Home. Cause remains unresolved. |
| Additional streaming targets | Netflix, HBO Max, Apple TV, Paramount+, and Peacock IDs were discovered; folder launch requests passed browser tests. Physical verification of every added app is still pending. |
| Upstream reference | Samsung QA55LS03DAWXXY / LS03D, firmware 2130.0, Tizen 9.0. Its separate historical record is in [TV status](docs/tv-status.md). |
| Other hardware | No compatibility claim. Android TV, Google TV, LG webOS, and Roku need separate implementations. |

The native helper checked into `scripts/native-home/` targets the **upstream reference setup**, not this fork’s LS03B. Do not run it against a different TV. This installation used a separately adapted, private recovery toolkit; it is not part of the public clone. Its Home assignment was applied, restored with exact-value verification, and reapplied. Startup/autostart settings were not intentionally changed. Power-on behaviour has not been fully verified.

Undocumented native routing can stop working after firmware updates. Keep the original baseline and recovery tools, and restore the original assignment before uninstalling the app or changing its identity.

## Development and verification

The TV runtime is plain HTML, CSS, and ES5-compatible JavaScript. Blur/material images are computed ahead of time to avoid costly live effects on the TV.

```sh
npm run check
npx playwright install chromium
CLEANFRAME_PUBLIC_FONTS=1 npm run check:browser
node scripts/check-family-features.mjs
npm run check:public
```

With a local photo overlay, also run:

```sh
node scripts/check-personal.mjs
```

Source checks cover manifest/resources, HDMI launch handling, and weather behaviour. Browser checks exercise navigation, settings, folders, launch targets, location editing, persistence, and layout. Personal checks verify photo bundles and family-only rotation. Mocked browser app launches do not establish that a streaming service works on the physical TV.

For an unsigned public export, use:

```sh
npm run export:public
```

This writes `dist/CleanFrame-public-unsigned.wgt` with public fonts and notices, excluding the private overlay. It still needs an appropriate identity and certificates for installation. Check third-party redistribution terms before publishing any binary assets.

| Location | Purpose |
| --- | --- |
| `app/main.js`, `app/style.css` | Home interface, panels, preferences, focus, rotation |
| `app/device.js` | Tizen app discovery, app launches, HDMI selection |
| `app/weather.js` | Weather settings, requests, cache, and display |
| `app/assets/local-config.js` | Empty shared defaults; replaced only by a private overlay |
| `scripts/import-family-photos.py` | Local photo preparation |
| `scripts/personal_assets.py` | Private-asset allowlist and packaging boundary |
| `scripts/package-local.py` | Signing through the saved official Samsung profile |
| `.local/`, `dist/` | Ignored tools, settings, certificates, photos, recovery data, generated packages |
| [Development](docs/development.md), [testing](docs/testing.md), [interaction](docs/interaction-behaviour.md) | Implementation details and test guidance |

## Privacy and sharing

Commit source, tests, and documentation. Keep family photographs, ZIP defaults, credentials, certificates, SDKs, TV addresses, device identifiers, recovery baselines, and generated personal widgets out of Git. The checked-in local configuration is empty; private assets are injected only for local previews and builds. The public-source checker is useful but is not a complete secret or licence audit.

Friends should clone or fork the repository and set up their own TV identity, certificates, location, and photo collection. They should not reuse another household’s signed personal widget or private setup files.

## Credits and licence

Based on [Nathan Clark’s CleanFrame](https://github.com/nthnclrk/CleanFrame). Original code and documentation use the [MIT licence](LICENSE). Fonts, photographs, and logos retain their own terms: see [third-party notices](THIRD_PARTY_NOTICES.md) and [asset sources](docs/asset-sources.md). Paid Pangram font binaries are excluded from source and public exports.

CleanFrame is an independent project with no Samsung or streaming-service affiliation. Contributions should preserve remote navigation, local preferences, private/public asset separation, and the distinction between browser tests and physical-TV evidence. See [CONTRIBUTING.md](CONTRIBUTING.md).

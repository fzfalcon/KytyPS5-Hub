# KytyPS5 Updater 0.3.0

Fixes and changes:
- Application renamed to KytyPS5 Updater.
- Source folder labels now match actual folder names: Senaxx, Jetsku, Official.
- Native Rust commands open approved GitHub HTTPS URLs in the default browser and folders in the operating system file manager.
- Platform filtering excludes clearly labelled macOS/Linux assets from Windows downloads and excludes Windows/macOS assets from Linux downloads.
- Download history records platform separately, so Windows and Linux status is not shared.
- On startup, checks for latest published releases and prompts to download Windows builds not found in the local download history.
- Existing download history remains stored in the app config directory.

Notes:
- Platform matching uses asset filenames. Use Show all assets if repository asset names are ambiguous.
- ZIP extraction remains supported; other formats are downloaded but not automatically extracted.
- "Up to date" means the current release tag has a completed download record for the selected platform; it does not imply cryptographic authenticity.
- This package must pass GitHub Actions compilation and a fresh install/runtime test before being marked verified for public release.

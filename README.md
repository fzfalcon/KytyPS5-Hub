KytyPS5 Updater
A Windows desktop release manager for three KytyPS5 repositories.
Display name	GitHub repository	Latest releases
Senaxx (Wolverine)	Senaxx/KytyPS5	Releases
Jetsku (Astro Bot)	Jetsku/KytyPS5	Releases
Official	KytyPS5/KytyPS5	Releases
Features
Checks all three repositories automatically when the app starts.
Detects the latest published release, including prereleases.
Shows release tags, publication dates, release type, asset count, and approximate total size.
Downloads assets into separate folders for each source.
Supports Windows x64 and Linux asset filtering.
Saves download location settings and download history.
Provides a startup prompt when new builds are detected.
Supports ZIP extraction, opening download folders, and launching detected Windows executables.
Provides a Windows x64 installer and portable executable through GitHub Actions.
Important Behavior and Limitations
The application checks published GitHub Releases. It does not currently retrieve arbitrary GitHub Actions artifacts or automatically compile builds from repository commits.
Some repositories may have no published releases or downloadable binaries. The app reports this instead of presenting source-code archives as runnable emulator builds.
The latest published release may be a stable release or a prerelease.
Platform filtering depends on asset filenames. Use Show all assets when filenames do not clearly identify the platform.
Automatic extraction currently supports ZIP archives. Other formats may need to be extracted manually.
The portable executable may require additional Windows runtime dependencies. The installer is recommended for most users.
This is an independent community utility and is not affiliated with Sony or the KytyPS5 developers.
Download Destination Layout
For example, when selecting `D:\Emulators\KytyPS5`:
```text
D:\Emulators\KytyPS5\
├── Senaxx\
│   └── <release-tag>\
├── Jetsku\
│   └── <release-tag>\
└── Official\
    └── <release-tag>\
```
Each source has its own folder, with downloaded assets organized by release tag. Incomplete downloads should not be treated as completed builds.
Technology Stack
Tauri 2 + Rust
React + TypeScript + Vite
GitHub REST API
GitHub Actions for Windows x64 builds
Build with GitHub Actions
Upload the project to your GitHub repository.
Open the Actions tab.
Select Build KytyPS5 Updater for Windows.
Run the workflow and wait for it to complete.
Download the generated Windows installer or portable executable from the workflow artifacts.
No local Windows CMD build is required. Successful compilation and runtime testing should be completed before publishing a stable release.
Repository Security
The application uses the GitHub API to retrieve public release information. Public repository metadata does not require a personal access token, although GitHub's unauthenticated API rate limits apply.
Only download and launch builds from sources you trust.
License
MIT License. See LICENSE.
Version 0.3.0
This version includes the application rename, source-specific folders, platform-aware download history, startup update prompts, and improvements to release-page and folder opening.
Tags
#KytyPS5 #KytyPS5Updater #PS5Emulator #PlayStation5 #Wolverine #AstroBot #Windows #Linux #OpenSource #GitHub #Gaming #Emulation

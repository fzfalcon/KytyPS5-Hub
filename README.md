# KytyPS5 Updater

A Windows desktop release manager for three KytyPS5 repositories.

| Display Name | GitHub Repository | Latest Releases |
|---|---|---|
| Senaxx (Wolverine) | [Senaxx/KytyPS5](https://github.com/Senaxx/KytyPS5) | [View Releases](https://github.com/Senaxx/KytyPS5/releases) |
| Jetsku (Astro Bot) | [Jetsku/KytyPS5](https://github.com/Jetsku/KytyPS5) | [View Releases](https://github.com/Jetsku/KytyPS5/releases) |
| Official | [KytyPS5/KytyPS5](https://github.com/KytyPS5/KytyPS5) | [View Releases](https://github.com/KytyPS5/KytyPS5/releases) |

## Features

- Automatically checks all three repositories when the application starts.
- Detects the latest published releases, including prereleases.
- Displays release tags, publication dates, release type, asset count, and approximate download size.
- Downloads builds into separate folders for each source.
- Supports Windows x64 and Linux asset filtering.
- Saves download location settings and download history.
- Displays startup notifications for new builds.
- Supports automatic ZIP extraction.
- Provides options to open download folders and launch detected Windows executables.
- Supports Windows installer and portable executable builds through GitHub Actions.

## Important Behavior and Limitations

- The application checks published GitHub Releases. It does not currently download arbitrary GitHub Actions artifacts or compile builds directly from repository commits.
- Some repositories may not have published releases or downloadable binaries. The application reports this instead of treating source-code archives as runnable emulator builds.
- The latest published release may be stable or a prerelease.
- Platform filtering depends on asset filenames. Use **Show All Assets** when filenames do not clearly identify the platform.
- Automatic extraction currently supports ZIP archives. Other formats may require manual extraction.
- The portable executable may require additional Windows runtime dependencies. The installer is recommended for most users.
- This is an independent community project and is not affiliated with Sony or the KytyPS5 developers.

## Download Destination

Choose your preferred drive and parent folder. The application organizes downloads by source and release version.

Example:

```text
D:\Emulators\KytyPS5\
├── Senaxx\
│   └── <release-tag>\
├── Jetsku\
│   └── <release-tag>\
└── Official\
    └── <release-tag>\
```

Each source has its own folder, with downloaded assets organized by release tag.

## Build with GitHub Actions

1. Upload the project files to your GitHub repository.
2. Open the **Actions** tab.
3. Select **Build KytyPS5 Updater for Windows**.
4. Run the workflow and wait for it to finish.
5. Download the generated Windows installer or portable executable from the workflow artifacts.

The application is designed to build on GitHub-hosted Windows runners without requiring a local CMD build.

## Technology Stack

- **Desktop Framework:** Tauri 2
- **Backend:** Rust
- **Frontend:** React, TypeScript, and Vite
- **Release Information:** GitHub REST API
- **Build Automation:** GitHub Actions

## Security

- Uses the GitHub API to retrieve public release information.
- Public repository metadata does not require a personal access token, although GitHub API rate limits apply.
- Only download and launch builds from sources you trust.
- Review downloaded files before running unfamiliar executables.

## License

This project is distributed under the MIT License. See [LICENSE](LICENSE).

## Version 0.3.0

Includes the application rename, source-specific download folders, platform-aware download history, startup update prompts, and improvements to release-page and folder opening.

## Tags

#KytyPS5 #KytyPS5Updater #PS5Emulator #PlayStation5 #Wolverine #AstroBot #Windows #Linux #OpenSource #GitHub #Gaming #Emulation

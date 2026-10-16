# KytyPS5 Hub

A Windows desktop release manager for three KytyPS5 repositories:

| Display name | GitHub repository |
|---|---|
| Wolverine | [Senaxx/KytyPS5](https://github.com/Senaxx/KytyPS5) |
| Astro Bot | [Jetsku/KytyPS5](https://github.com/Jetsku/KytyPS5) |
| Official | [KytyPS5/KytyPS5](https://github.com/KytyPS5/KytyPS5) |

## Features

- Checks all three repositories automatically when the app starts.
- Detects the most recently published non-draft release, including prereleases.
- Shows release tag, date, stable/prerelease status, asset count, and approximate total size.
- Downloads release assets to separate folders under a user-selected parent folder.
- Saves the parent folder setting in the app configuration directory.
- GitHub Actions builds a Windows x64 NSIS installer and a portable executable artifact.

## Important behavior and limitations

- This first version checks **published GitHub Releases**. It does not yet discover arbitrary GitHub Actions artifacts or build executables from commits.
- Some repositories may have no published releases or no binary assets attached to a release. In that case, the app reports that state instead of mislabeling source archives as runnable emulator builds.
- The selected release is the latest published release by publication timestamp, whether stable or prerelease. The UI labels the release type.
- Downloads are saved in `<chosen folder>/<source>/<release tag>/`.
- The portable executable may need Microsoft Visual C++ runtime dependencies available on the target Windows system. The installer is the recommended first choice.
- This is a community utility, not an official Sony or KytyPS5 project. Repository names and game names are used only to identify source feeds.

## Build without local CMD

1. Create a new GitHub repository named `KytyPS5-Hub`.
2. Upload the complete contents of this project to the repository's `main` branch.
3. Open **Actions** and enable workflows if GitHub asks.
4. Select **Build KytyPS5 Hub for Windows** and click **Run workflow**, or push a commit to `main`.
5. Open the successful workflow run and download the `KytyPS5-Hub-Windows-x64` artifact.
6. Extract the artifact ZIP. Install using the NSIS `.exe`, or try `KytyPS5-Hub-Portable.exe`.

The workflow uses GitHub-hosted Windows runners; no local Windows compiler or CMD build is needed. npm caching is intentionally disabled until a package-lock.json is committed, avoiding setup-node cache failures. The workflow needs repository Actions permission to write release assets when a `v*` tag is pushed.

## Download destination layout

Example when selecting `D:\Emulators\KytyPS5`:

```text
D:\Emulators\KytyPS5\
├── Wolverine\
│   └── <release-tag>\
├── Astro Bot\
│   └── <release-tag>\
└── Official\
    └── <release-tag>\
```

Each asset is downloaded into the matching release-tag folder. Existing files with the same filename in that same release folder are replaced only after the new download has completed.

## Stack

- Tauri 2 + Rust
- React + TypeScript + Vite
- GitHub REST API
- GitHub Actions (Windows x64)

## Repository security

The app downloads only HTTPS release assets whose URL host is `github.com`. GitHub may redirect the request to its asset delivery host; if a repository's asset URL requires a different redirect flow, the downloader may need adjustment. No GitHub token is required for public repository release metadata; unauthenticated API rate limits apply.

## License

MIT. See `LICENSE`.

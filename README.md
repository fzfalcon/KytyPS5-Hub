# KytyPS5 Updater

**One app. Three sources. All your KytyPS5 builds in one place.**

KytyPS5 Updater is a Windows desktop application that checks and downloads the latest published KytyPS5 builds from three independent GitHub repositories.

## Features

- **Automatic Updates** — Check for new releases when the app starts.
- **Three Build Sources** — Track Senaxx, Jetsku, and Official KytyPS5 builds.
- **Platform Selection** — Filter available assets for Windows x64 or Linux.
- **Fast Downloads** — Download multiple release assets concurrently.
- **Organized Storage** — Keep each source and release in a separate folder.
- **Download History** — Track previously downloaded builds.
- **ZIP Extraction** — Extract supported ZIP archives automatically.
- **Quick Access** — Open download folders and launch detected Windows executables.
- **Modern Interface** — Manage your builds through a dark desktop interface.

## Supported Sources

| Developer | Build | Repository | Releases |
|---|---|---|---|
| Senaxx | Wolverine | [Senaxx/KytyPS5](https://github.com/Senaxx/KytyPS5) | [View Releases](https://github.com/Senaxx/KytyPS5/releases) |
| Jetsku | Astro Bot | [Jetsku/KytyPS5](https://github.com/Jetsku/KytyPS5) | [View Releases](https://github.com/Jetsku/KytyPS5/releases) |
| Official | Upstream | [KytyPS5/KytyPS5](https://github.com/KytyPS5/KytyPS5) | [View Releases](https://github.com/KytyPS5/KytyPS5/releases) |

## Download

**[Download KytyPS5 Updater for Windows](https://github.com/fzfalcon/KytyPS5-Hub/releases/latest)**

Download the installer or portable executable from the latest release's **Assets** section.

## How to Use

1. Install or launch KytyPS5 Updater.
2. Choose a download location on your preferred drive.
3. Select your platform. Windows x64 is the default.
4. Check the available releases.
5. Download the build you want.
6. Open the downloaded folder or launch a detected Windows executable.

## Download Organization

Builds are stored separately for each developer and release version.

```text
KytyPS5/
├── Senaxx/
│   └── <release-version>/
├── Jetsku/
│   └── <release-version>/
└── Official/
    └── <release-version>/
```

## Important Notes

- Available downloads depend on the assets published by each repository.
- Platform detection depends on asset filenames. Use the all-assets option when a platform cannot be identified clearly.
- Automatic extraction currently supports ZIP archives.
- Linux builds can be downloaded, but this Windows application does not launch Linux executables.
- Only download and run files from sources you trust.

## Disclaimer

KytyPS5 Updater is an independent community project. It is not affiliated with, endorsed by, or officially supported by Sony or the maintainers of the repositories listed above.

All trademarks and game names belong to their respective owners.

## License

Released under the [MIT License](LICENSE).

---

**Tags:** #KytyPS5 #KytyPS5Updater #PS5Emulator #Wolverine #AstroBot #Windows #Linux #OpenSource #Gaming #Emulation

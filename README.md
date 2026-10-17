# PS4&5onPC Hub

**Native PC ports, PS4/PS5 development builds, emulators and compatibility projects in one place.**

PS4&5onPC Hub is a community project catalog and release updater for Windows. It checks the latest published releases from curated public GitHub sources and organizes downloads by project and release.

## Explore

- **PS4 PC Ports:** Native PC port projects and maintained forks for PS4-origin games, including P.T. and Bloodborne.
- **PS5 Development:** KytyPS5, game-specific community builds, AnyPS5, prosper and related compatibility-layer research.
- **Emulators & Tools:** shadPS4, fpPS4, Kyty and other related PC projects.
- **Live release checks:** Release tags, dates, prerelease status, assets and download links from GitHub.
- **One library:** Search sources, filter assets by platform, store versions separately, extract supported ZIP files, and open downloaded folders.

## Current Source Catalog

### PS4 Native PC Port Projects

| Project | Source |
|---|---|
| P.T. PC Port | [LoreanXavier/pt-pc](https://github.com/LoreanXavier/pt-pc) |
| Bloodborne Linux upstream | [deadinside28/bloodborne_pc](https://github.com/deadinside28/bloodborne_pc) |
| Bloodborne Windows | [Supermedo/bloodborne_pc](https://github.com/Supermedo/bloodborne_pc) |
| BloodBorneButPc | [Awakenchan/BloodBorneButPc](https://github.com/Awakenchan/BloodBorneButPc) |
| Bloodborne Win32 port | [Mrsuss60/bloodborne_pc_windows_port](https://github.com/Mrsuss60/bloodborne_pc_windows_port) |
| Bloodborne setup fork | [Jgamrot/bloodborne_pc](https://github.com/Jgamrot/bloodborne_pc) |
| Bloodborne Crowned Workshop | [TatsunaKyo/bloodborne_pc](https://github.com/TatsunaKyo/bloodborne_pc) |
| bbhost | [droogie/bbhost](https://github.com/droogie/bbhost) |
| Bloodborne Linux fork | [ayozetr/bloodborne_linux](https://github.com/ayozetr/bloodborne_linux) |
| Bloodborne macOS source | [Wooloomooloo2/bloodborne_mac_port](https://github.com/Wooloomooloo2/bloodborne_mac_port) |
| Bloodborne achievement fork | [pyL1nx/bloodborne_pc](https://github.com/pyL1nx/bloodborne_pc) |

### PS5 Development

| Project | Source |
|---|---|
| KytyPS5 Official | [KytyPS5/KytyPS5](https://github.com/KytyPS5/KytyPS5) |
| Senaxx — Wolverine builds | [Senaxx/KytyPS5](https://github.com/Senaxx/KytyPS5) |
| Jetsku — Astro Bot and compatibility builds | [Jetsku/KytyPS5](https://github.com/Jetsku/KytyPS5) |
| AnyPS5 | [boykopovar/AnyPS5](https://github.com/boykopovar/AnyPS5) |
| prosper | [mattias800/prosper](https://github.com/mattias800/prosper) |
| prosperNG | [snapetech-org/prosperNG](https://github.com/snapetech-org/prosperNG) |

### Emulators & Tools

| Project | Source |
|---|---|
| shadPS4 | [shadps4-emu/shadPS4](https://github.com/shadps4-emu/shadPS4) |
| fpPS4 | [red-prig/fpPS4](https://github.com/red-prig/fpPS4) |
| Kyty | [InoriRus/Kyty](https://github.com/InoriRus/Kyty) |

## How it works

1. Open the app and let it check the configured public GitHub sources.
2. Browse by PS4 PC ports, PS5 development, or emulators and tools.
3. Search by game, project, developer, or repository.
4. Select Windows x64, Linux x64, macOS, or show all available assets.
5. Download a release and manage it from the project card or recent-downloads list.

## Important Notes

- Source metadata and release tags are fetched live from GitHub; a listed release is not a guarantee that its build is playable.
- Some projects publish source code or CI builds without a tagged release. Those sources may have no downloadable release in the app; use the linked repository for current development details.
- Native PC ports, emulators, and console-side ports are different project types. The catalog labels them separately to avoid implying they work the same way.
- Platform detection is based on asset filenames. Review ambiguous filenames before downloading.
- Automatic extraction currently supports ZIP archives. Other formats may need manual extraction.
- Some native PC ports require game data from your own legally obtained copy. The app does not distribute game assets, firmware, keys, or copyrighted game files.
- The catalog is curated from public GitHub projects and Reddit community discussions. Forks may be experimental, unverified, inactive, or superseded by another branch.
- This is an independent community project and is not affiliated with Sony or the listed developers.

## Community Sources

- [r/BloodbornePC](https://www.reddit.com/r/BloodbornePC/) — Bloodborne native-PC project and fork discussions.
- [r/emulators](https://www.reddit.com/r/emulators/) — emulator and compatibility-layer discussions.
- [r/ps4homebrew](https://www.reddit.com/r/ps4homebrew/) — PS4 console-side ports and homebrew. These are not necessarily PC ports.
- [AnyPS5 compatibility notes](https://anyps5.dev/) — community reports for PS5-on-PC projects.

## Technology

- Tauri 2 + Rust
- React + TypeScript + Vite
- GitHub REST API
- GitHub Actions for Windows x64 builds

## License

MIT License. See [LICENSE](LICENSE).

## Tags

#PS4and5onPC #PS4onPC #PS5onPC #NativePCPorts #BloodbornePC #PTPCPort #KytyPS5 #AnyPS5 #shadPS4 #Emulation #GamePreservation #OpenSource

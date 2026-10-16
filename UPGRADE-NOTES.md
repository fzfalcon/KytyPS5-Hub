# KytyPS5 Hub 0.2.0 upgrade notes

Added:
- Source names and folders: Senaxx, Jetsku, Official.
- Tauri opener plugin for release links and local folder opening.
- Persistent download manifest/history.
- Up to three release assets downloaded concurrently.
- Windows x64 default platform filter, Linux x64, and show-all options.
- Automatic safe ZIP extraction with path traversal checks.
- Executable discovery and launch support for Windows `.exe` files.
- Recent downloads panel and Open Folder / Launch Emulator actions.

Limitations to understand:
- Automatic extraction currently supports ZIP archives only. Other formats remain downloaded for manual handling.
- Platform detection is filename-based and intentionally keeps generic assets under the Windows filter; use Show all assets when unsure.
- A build is marked Up to date when its release tag exists in the saved download manifest. This indicates a successful app download record, not cryptographic authenticity.
- The downloader does not yet support GitHub Actions artifacts or build-from-commit workflows.
- Launching runs the selected `.exe` as the current Windows user; only launch executables from repositories you trust.
- Compilation and runtime behavior must be verified by the next GitHub Actions build; no Windows CI run has been performed from this environment.

# PS4&5onPC Hub build checklist

- [ ] Upload the complete project to the public or private GitHub repository.
- [ ] Confirm the default branch is `main`.
- [ ] Enable GitHub Actions if disabled.
- [ ] Run **Build PS4&5onPC Hub for Windows**.
- [ ] Download the workflow artifact `PS4and5onPC-Hub-Windows-x64`.
- [ ] Install the NSIS installer on Windows 10/11 x64.
- [ ] Verify PS4/PS5 category navigation, search, platform filtering, GitHub links, folder selection, and download history.
- [ ] Verify a source with published binary assets can be downloaded; confirm no unrelated OS asset is selected.
- [ ] Verify no startup modal appears and new-release information remains on the dashboard.

## Important
This source project still needs a real Windows GitHub Actions run and installer test before release. Some repositories publish source code or CI builds but no GitHub Releases assets. Those remain linked in the catalog and must not be marked as ready-to-run binaries.

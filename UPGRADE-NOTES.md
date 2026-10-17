# PS4&5onPC Hub v0.4.0

- Rebranded the app as PS4&5onPC Hub.
- Added PS4 native-PC-port catalog, including P.T. and multiple Bloodborne community forks discovered through current Reddit discussions.
- Added PS5 development sources: official KytyPS5, Senaxx, Jetsku, AnyPS5, prosper and prosperNG.
- Added related PC emulation tools: shadPS4, fpPS4 and Kyty.
- Added PS4/PS5 console-logo-style section badges, category navigation and project search.
- Removed the startup update modal. New releases and update statuses are shown inline on the dashboard.
- Extended source-specific download folders to support the expanded catalog.
- Added macOS filtering to the platform selector.\n- Separate download directories by platform to prevent cross-platform assets from colliding.\n- Added an AnyPS5 compatibility tracker shortcut.
- Updated README and Windows GitHub Actions artifact names.

Research caveat:
The catalog is a curated starting list, not an exhaustive census of every public fork. Release data is queried live from GitHub Releases at runtime. Repositories without published releases may show no release data even if their main branch or CI pipeline has newer code. Reddit discussions are leads for discovery; they are not independent proof of a project's security, maturity or playability.

Build verification:
This source package has not been compiled in a fresh Windows GitHub Actions run from this environment. Build and test it before issuing a public release.

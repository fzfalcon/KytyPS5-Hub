# GitHub Actions build checklist

- [ ] Create the repository and upload all files, including hidden `.github` directory.
- [ ] Confirm default branch is `main`.
- [ ] Enable Actions if disabled.
- [ ] Run `Build KytyPS5 Hub for Windows`.
- [ ] Download workflow artifact `KytyPS5-Hub-Windows-x64`.
- [ ] Install the generated NSIS installer on Windows 10/11 x64.
- [ ] Choose a destination folder and check all three sources.
- [ ] Test one release that has downloadable assets.

## If the workflow fails

Open the failed step in the Actions log. Common first-build issues are dependency download failures, missing Windows SDK prerequisites, or a source configuration issue. Fix the indicated project file and rerun Actions. No local CMD build is required.

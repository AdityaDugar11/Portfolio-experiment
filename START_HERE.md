# Start Here — Safe Reset Procedure

## Do not delete the old folder

The old experiment is currently the only copy of its local work and may contain useful source assets. The failed Antigravity conversation cannot be reverted to the requested step because an earlier step was cleared. That does not mean the local project files are unrecoverable.

## Safe approach

1. Leave the old project directory untouched as a backup.
2. Create a new, separate directory for this clean experiment.
3. Clone `https://github.com/AdityaDugar11/Portfolio-experiment.git` into that new directory.
4. Copy the contents of this documentation pack into the cloned repository.
5. Add only the original portrait and approved reference image assets after checking them.
6. Commit the documentation as the first commit.
7. Open the new folder in Antigravity and start a new conversation there.
8. Ask Antigravity to read `AGENTS.md` and every file under `docs/`, then audit and propose a plan. Tell it not to code yet.

## Example shell commands

Replace `~/Documents/Portfolio-experiment` with a new path that does not already exist. Do not point it at the old experimental folder.

```bash
mkdir -p ~/Documents
cd ~/Documents
git clone https://github.com/AdityaDugar11/Portfolio-experiment.git
cd Portfolio-experiment
```

Copy the files from the extracted documentation pack into this folder, then:

```bash
git status --short
git add README.md AGENTS.md START_HERE.md docs
git commit -m "docs: establish portfolio direction and agent instructions"
git push -u origin main
```

The GitHub repository was verified as existing, public, with default branch `main` and size zero at the time it was checked. The GitHub integration refused direct file writes with HTTP 403, so these files are provided locally for you to push from your machine.

## First Antigravity instruction

```text
This is a fresh portfolio experiment. Before writing code, read README.md, AGENTS.md, START_HERE.md and every document under docs/. Inspect the repository and available assets. Do not delete, overwrite, scaffold, install dependencies, change the theme or implement anything yet. Give me a concise inventory of the current state, the assets you found, any missing assets, and a proposed step-by-step Act 01 implementation plan. Wait for my approval.
```

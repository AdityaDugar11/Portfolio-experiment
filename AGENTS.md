# AGENT INSTRUCTIONS — READ FIRST

These instructions apply to every coding agent and every conversation working in this repository. Read this file and the relevant files under `docs/` before making changes.

## 1. Start with inspection, not implementation

Before editing:
1. Read `README.md` and all files under `docs/`.
2. Inspect the actual repository tree, git status, package manager files, assets and existing code.
3. Establish whether this is a clean scaffold or an existing application. Never assume either.
4. Identify which assets are present and which still need to be supplied by the owner.
5. Write a concise audit and proposed implementation plan.
6. Wait for approval before scaffolding, changing the global theme, replacing architecture, or implementing chapters.

## 2. Non-negotiable design decisions

- Project title: **THE LIVING SIGNAL**.
- The approved Act 01 reference is the second five-stage storyboard shared by the owner on 4 November 2026.
- Maintain the warm peach, warm ivory, soft sky-blue and coral visual family.
- The cloud/sky environment is a core visual requirement, not an optional flat gradient.
- Orbital rings progressively draw around the portrait as scroll progresses.
- Glowing nodes travel along paths; five topic cards appear progressively and connect to those paths.
- Portrait remains proportionate and fully visible at the final state.
- Introductory text and header leave the scene as the portrait becomes central.
- The experience reverses naturally on upward scroll.

## 3. Explicitly rejected directions

Do not reintroduce:
- Flat beige/ivory canvas with a basic CSS gradient as the entire environment.
- Thin random loops without a deliberate orbital composition.
- Generic dashboard cards scattered around the screen.
- A large cropped face portrait or portrait that hides most of the body.
- Duplicate visible HTML and WebGL portraits.
- Grey portrait backing, pedestal, shelf, floor shadow or triangular shadow.
- Abstract glass sculptures, random spheres, arbitrary particles or unrelated architecture.
- Static storyboard image or prerecorded video as a substitute for an interactive scene.
- Dark-dominant styling, deep blue, blue-violet, dominant teal, rose-wine, muted gold or sage.
- Generic sections that all repeat the same card layout.
- Invented biography, accomplishments, metrics, clients, expertise or work history.

## 4. Protect existing work and data

- Never delete the project directory or bulk-delete files as a shortcut.
- Never run destructive commands such as `rm -rf`, `git clean -fdx`, or forced resets without explicit, specific approval.
- Before replacing files, inspect their contents and preserve anything user-authored or reusable.
- Do not overwrite original reference assets.
- Do not change global theme tokens, typography, navigation or unrelated chapters while fixing Act 01 unless explicitly approved.
- Keep changes scoped and reviewable.
- Do not commit, push, deploy or publish unless explicitly asked.
- Never store secrets or API keys in the repository.

## 5. Content and identity constraints

- `docs/STORY_CONTENT.md` is the content source of truth.
- The owner is a Software Engineering student; represent experience and learning honestly.
- Never use the phrase “I'm a passionate developer”.
- Do not add Bikaner, hometown or location references.
- Use the exact contact details in `docs/PROJECT_BRIEF.md`.
- Use actual public pinned repositories for the work chapter; verify data rather than inventing it.

## 6. Audio constraints

- Remove/disable the broken previous audio implementation.
- Audio remains OFF and absent until the owner chooses a track and approves integration.
- Do not reuse the previously supplied YouTube track.
- Scrolling, navigation, page load and React rerenders must never enable audio.
- Do not substitute unlicensed stock music.

## 7. Implementation discipline

- Implement one approved milestone at a time.
- Act 01 must be reviewed and explicitly approved before work starts on Act 02.
- Do not redesign the entire website while fixing one chapter.
- Do not claim functionality based only on compilation or type checks.
- Validate the actual browser experience: slow scroll, fast scroll, reverse scroll and mobile.
- Clean up event listeners, animation contexts, observers and WebGL resources.
- Respect reduced-motion preferences and provide a graceful non-WebGL fallback.

## 8. Required report after each milestone

Report:
1. Files changed.
2. What changed and why.
3. What was deliberately left untouched.
4. Commands/tests run and their actual results.
5. Browser validation performed.
6. Known limitations.
7. Screenshots or recording from the actual implementation.

Do not proceed to the next milestone until the owner approves it.

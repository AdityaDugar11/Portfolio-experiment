# Implementation Plan and Approval Gates

## Milestone 0 — Safe setup

1. Preserve the previous experimental folder as a backup.
2. Clone this documentation-first repository into a new, separate directory.
3. Verify the clone, branch and working tree.
4. Inspect assets the owner chooses to migrate.
5. Do not copy generated experimental outputs or duplicates without review.
6. Do not start implementation until the owner approves the audit and plan.

## Milestone 1 — Repository audit and design plan

Deliver a repository/file inventory, useful assets/dependencies, proposed application structure, asset requirements (especially cloud environment and portrait), implementation risks, and a short Act 01 plan. No major code changes yet.

## Milestone 2 — Act 01 prototype

Implement only the initial introduction, cloud environment, portrait composition, scroll transition, progressive orbital ring formation, five sequential topic cards/connectors, final discovery state and reverse scrolling.

## Milestone 3 — Act 01 functionality and polish

Implement contact modal and keyboard behaviour; remove broken audio and keep the site silent; responsive layout; reduced-motion handling; performance tuning; accessibility; browser validation.

## Milestone 4 — Owner review

Provide browser recording and screenshots at 0%, 20%, 40%, 60%, 85% and 100%, plus reverse scroll. Stop. Do not build Chapter 02 until the owner explicitly approves Act 01.

## Milestones 5–13 — Chapters 02–10

After Act 01 approval, build each chapter as its own milestone using `STORY_CONTENT.md`. Give each a distinct visual concept while preserving visual continuity. Review major chapter concepts before implementing large scenes. Avoid repetitive cards/sections.

## Git discipline

Work on a feature branch once the application is scaffolded. Commit at meaningful checkpoints. Do not force-push or rewrite shared history. Do not commit secrets/API keys. Do not deploy unless explicitly approved.

## Approval semantics

Approval applies only to the milestone presented. Act 01 approval does not automatically approve a global redesign, all remaining chapters, audio integration or deployment.

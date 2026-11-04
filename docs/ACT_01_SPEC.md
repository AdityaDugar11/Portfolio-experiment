# Act 01 — The Beginning: Detailed Specification

## Purpose

Act 01 introduces Aditya, then transforms the introductory composition into a visual map of five technical interests. The story progression is: identity → portrait focus → orbital system → connected topics.

The approved second storyboard is the visual target. Recreate its intent, not its exact pixels.

## Stage A — Initial introduction (0–20%)

Show the navigation/header, discipline eyebrow, “Aditya Dugar”, quote “I follow questions until they become something I can build.”, short introduction, Initiate Inquiry and Explore Portfolio actions, portrait, and atmospheric cloud environment.

The text and portrait must be balanced and must not overlap. Keep the portrait proportionate. The environment must have depth and visible cloud character. Rings and topic cards must not dominate this first state.

## Stage B — Transition (20–40%)

As the visitor scrolls, the header fades/moves out, name/quote/description/buttons disappear, portrait moves towards the centre and scales to fit, and the first faint orbital curve starts to draw. Do not leave ghosted introductory text behind the portrait.

## Stage C — Orbital formation (40–60%)

Additional elliptical and curved paths form around the portrait at varied orientations and depths. Animate path drawing progressively from scroll progress. Small connection nodes travel along the paths. Lines use restrained coral/peach illumination. Rings must feel like one designed system, not random lines or identical flat circles. Do not obscure the face.

## Stage D — Topic reveals (60–85%)

Reveal five cards progressively, not all at once:

1. **Software Engineering** — Building software, architecture and practical applications.
2. **AI & Local LLMs** — Local inference, model experimentation and intelligent systems.
3. **Autonomous Agents** — Agents, tool use, automation and multi-agent workflows.
4. **Linux & System Design** — Linux environments, infrastructure and system-level experimentation.
5. **Creative Technology** — ComfyUI, generative workflows, GPU computing and interactive experiences.

Each card has a clear icon, topic title, short accurate description and connector visibly attached to a deliberate point on the orbital system. Cards should feel integrated into the cinematic scene, with readable contrast and deliberate spacing—not like generic dashboard widgets.

## Stage E — Final discovery (85–100%)

Show the complete portrait, centrally positioned and not excessively large; keep the cloud environment visible; fully form the orbital system; show all five cards and their connections; keep text readable; hide the header; avoid clipping and overlap.

## Scroll mechanics

- One coherent chapter timeline, mapped to scroll progress.
- Slow, fast and reverse scrolling must work.
- No arbitrary time-based animation causing scene drift independent of scroll.
- Use a suitable pinned scene/long runway after testing actual layout.
- Ensure ancestor overflow rules do not break sticky positioning.
- No horizontal overflow, sudden jumps, trapped scroll or excessive blank runway.
- Browser refresh and responsive layout must behave predictably.

## Portrait

Use the supplied portrait after verifying its real path. Preserve its aspect ratio and transparency. Never stretch it or crop away most of the body during the final state. Do not duplicate visible HTML/WebGL portrait layers. No grey panel, pedestal, shelf or floor shadow. A transparent texture on 3D geometry is acceptable if used honestly and without distortion.

## Environment

The cloud environment is a core requirement. Prefer a properly licensed cloud/sky image or texture with layered depth and subtle parallax, or a carefully built procedural scene if it actually looks convincing. A flat beige gradient with lines is not sufficient. Do not add unrelated architecture, buildings or fantasy scenery.

## Contact

Initiate Inquiry and Get in Touch open an accessible modal. Escape and visible close button must close it. Outside click may close it. Lock background scroll while open; manage focus and restore it to the opener. Use exact owner email and LinkedIn.

## Audio

No track is active until the owner chooses a properly licensed track. See `AUDIO_DECISION.md`.

## Responsive behaviour

Desktop is the primary art direction. Tablet/mobile require intentional re-composition, not merely shrinking desktop positions. Keep portrait and labels readable; move cards into a suitable arrangement when radial positioning no longer fits; maintain the progression; reduce GPU load; support reduced motion.

## Acceptance

Act 01 is not complete until actual browser captures/recording are available at 0%, 20%, 40%, 60%, 85% and 100%, plus reverse-scroll evidence. The owner must approve the actual visual result.

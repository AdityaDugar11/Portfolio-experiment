# QA and Acceptance Checklist

## Before implementation
- [ ] Read `AGENTS.md` and all project docs.
- [ ] Inspect actual repository and assets.
- [ ] Confirm approved storyboard has been supplied.
- [ ] Confirm no destructive changes are planned.
- [ ] Present audit and plan.

## Act 01 visuals
- [ ] Initial state resembles the approved storyboard.
- [ ] Cloud environment has visible depth and cloud character.
- [ ] Peach/ivory/sky/coral palette is preserved.
- [ ] Name/text do not collide with portrait.
- [ ] Header visible initially.
- [ ] Portrait proportions correct and fully visible at final state.
- [ ] Header and intro leave during transition.
- [ ] First orbital curve draws progressively.
- [ ] Additional rings form a deliberate composition.
- [ ] Glowing nodes travel on the correct paths.
- [ ] Five topic cards appear progressively.
- [ ] Connectors terminate at their associated cards/nodes.
- [ ] Cards remain readable and do not cover portrait.
- [ ] Final state shows complete portrait and all five cards.
- [ ] Reverse scroll restores previous states.
- [ ] No random loops, generic dashboard styling or unrelated objects.

## Functionality
- [ ] Initiate Inquiry opens contact modal.
- [ ] Get in Touch opens contact modal.
- [ ] Escape closes modal.
- [ ] Visible close button works.
- [ ] Outside click behaviour is intentional.
- [ ] Background scroll locked while modal open.
- [ ] Focus managed/restored.
- [ ] Email and LinkedIn links correct.
- [ ] No audio starts automatically.
- [ ] Scroll/navigation/rerender never turns audio on.
- [ ] Site remains silent until a track is selected.

## Responsive/accessibility
- [ ] Desktop.
- [ ] Tablet.
- [ ] Mobile.
- [ ] Reduced motion.
- [ ] Keyboard navigation.
- [ ] Screen-reader-readable content.
- [ ] Adequate contrast.
- [ ] WebGL fallback.

## Performance
- [ ] No unnecessary high-cost continuous rendering.
- [ ] No excessive post-processing.
- [ ] No memory leak after repeated scroll.
- [ ] Three.js resources disposed correctly.
- [ ] No duplicate animation loops.
- [ ] No duplicate scroll listeners.
- [ ] Acceptable performance on mid-range mobile.

## Evidence required
Provide actual screenshots at 0%, 20%, 40%, 60%, 85%, 100%, reverse-scroll evidence, modal/Escape test, mobile screenshot, build/lint/type-check output and known limitations. A passing build alone is not acceptance.

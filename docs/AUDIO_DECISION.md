# Audio Decision — The Living Signal

## Current Status: Site is 100% Silent

Per `MASTER_CREATIVE_BRIEF.md` (Section 8) and explicit owner instructions:
- The previous distorted/crackling audio implementation has been permanently removed.
- The previously supplied YouTube track is permanently rejected.
- Until an approved, properly licensed replacement track is chosen:
  - The website remains completely silent.
  - No audio files will be loaded or fetched.
  - No audio context will autoplay.
  - Page load, navigation, scroll, and component rerenders will never trigger sound.
  - The visible sound toggle shown in the master storyboard will be rendered in a muted/inactive state.

---

## Desired Musical & Sound Direction

- **Style**: Sweet, warm, gentle, and tasteful instrumental lo-fi / ambient track with subtle cinematic depth.
- **Strict Audio Constraints**:
  - ❌ No vocals.
  - ❌ No lyrics.
  - ❌ No spoken narration.
  - ❌ No harsh percussion, clipping, or crackling.
  - Soft, atmospheric textures that enhance the visual storytelling without overwhelming it.

---

## Selection & Licensing Protocol

1. Provide three vetted candidate tracks with:
   - Direct listening preview links.
   - Exact track name, artist, and composer.
   - Clear commercial/personal portfolio licensing and attribution requirements.
   - Verified local hosting / streaming rights.
2. No ripping or downloading from YouTube or unlicensed streaming platforms.
3. Audio integration will occur only after explicit owner review and selection.

---

## Future Playback Architecture (Post-Approval)

- **Default State**: MUTED (sound toggle visible in top nav bar per master storyboard).
- **User-Initiated Activation**: Sound plays only after an explicit click on the sound toggle.
- **Volume Ramping**: Smooth logarithmic fade-in (e.g. 1.2s ramp) on play, smooth fade-out on pause.
- **Persistence**: Single audio controller across all chapters and sequence transitions (no restarting or resetting state during scrolling).
- **Silent Degradation**: Graceful error handling if autoplay policy blocks playback or audio fails to load.

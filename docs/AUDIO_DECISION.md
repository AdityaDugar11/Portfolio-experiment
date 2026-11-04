# Audio Decision

## Current decision: no background track

The previous implementation sounded distorted/crackly and had a bug that caused sound to turn back on after being disabled. Remove or disable that implementation. Do not reuse the previously supplied YouTube track.

Until the owner explicitly selects a replacement:
- The site is silent.
- No audio is loaded for autoplay.
- No audio starts on page load.
- Scrolling never enables audio.
- Navigation never enables audio.
- React rerenders never enable audio.
- Do not show a toggle implying audio is playing when no track has been selected.

## Desired direction

The owner wants a sweet, warm, gentle and tasteful instrumental lo-fi/ambient track with subtle cinematic quality, no vocals, soft dynamics, no crackling/clipping and no harsh percussion.

## Selection process

Before integrating audio, provide three candidate tracks with direct listening links, exact track/artist, licence and attribution conditions, whether commercial/personal portfolio use is allowed, and whether local hosting/embedding is permitted. Do not rip, download or extract audio from YouTube or streaming platforms. Do not claim a licence without checking it. Wait for explicit owner selection.

## Future playback requirements

When a track is approved: default OFF; playback starts only after explicit user action; ON/OFF state cannot be reset by scroll or rerender; smooth volume ramp; one persistent audio instance; no restart at chapter transitions; gracefully handle playback rejection and loading errors; accurately reflect playback state.

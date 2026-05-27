# Public assets

## Optional hero video

The landing hero can play a looping background video. Drop any one of these into
this folder:

- `hero.mp4`  (preferred — H.264/AAC, ~8–15s loop, cool / cinematic aesthetic)
- `hero.webm` (fallback for some browsers)

Suggested clip styles that fit the STRIDE chrome aesthetic:
- Slow-moving dark satellite / cityscape footage
- Abstract chrome-on-black product renders
- Glassy data-grid / particle motion in cool neutrals

If neither file exists, the hero still looks intentional — the animated silver
lens-flare layers in [`src/components/VideoBackdrop.tsx`](../src/components/VideoBackdrop.tsx)
carry the visual on their own.

# Multiply — cinematic promo (Remotion)

30-second cinematic promo video rendered programmatically. Zero external video tools required — runs locally, outputs MP4.

## Render it

```bash
cd promo
pnpm install
pnpm render              # → out/multiply-promo.mp4   (H.264, crf=16, 1920x1080)
# or:
pnpm render:hq           # → out/multiply-promo-hq.mp4  (crf=12, near-lossless)
pnpm render:web          # → out/multiply-promo-web.mp4 (crf=20, smaller file)
```

## Edit it live

```bash
pnpm start               # → opens Remotion Studio at http://localhost:3000
```

Scrub the timeline, change text, swap images, re-render with one click.

## Timeline (30s · 1920×1080 · 30fps)

| t | Scene | Visual |
|---|---|---|
| 0.0–3.0s | Cold open | Black. White dot expands from center, glows purple. |
| 3.0–7.0s | Problem | "Sales is still mostly human." + monospace subline |
| 7.0–10.0s | Turn | "Until now." — huge, slow, cinematic |
| 10.0–14.0s | Title | **multiply** with shimmer sweep + "The Swarm Outreach Engine" |
| 14.0–19.0s | Orchestra | Agent Orchestra image + 7 role names fly in |
| 19.0–24.0s | Swarm | 5×5 grid of live tiles — mode badges flip Cold → Warm → Hot → Booked |
| 24.0–27.0s | Memory | Knowledge Graph image + counters tick to 94 nodes / 157 edges |
| 27.0–29.0s | KPI | Big numbers: 25 DIALS · 5 CONNECTS · 1 MEETING · 12 LEARNINGS |
| 29.0–30.0s | Close | **multiply** + live URL |

Full-bleed dark background, particle field, faint grid, scanlines, vignette — Bloomberg-terminal-meets-cinema.

## Assets used

- `public/agent-orchestra.png` — the 7-role orchestra diagram
- `public/knowledge-graph.png` — the Cognee live graph (94 nodes, 157 edges)

Drop replacements into `public/` with the same filenames to re-skin.

## Adding music / VO

Remotion supports audio via `<Audio src={staticFile('bg.mp3')} />`. Drop an MP3 into `public/` and wrap it at the top of `<MultiplyPromo>`.

Suggested tracks (royalty-free, no account needed):
- Artlist / Epidemic Sound — search "cinematic tech drone", "synth pulse", "ambient build"
- YouTube Audio Library — filter by "Cinematic", "Dark", "Inspirational"

For a voice-over, generate it externally (ElevenLabs, OpenAI TTS) and drop the MP3 into `public/vo.mp3`, then add `<Audio>` inside each relevant `<Sequence>`.

## Script (for external AI-video tools: Sora, Runway, Veo, Pika)

See `SCRIPT.md` for shot-by-shot prompts you can paste into any cinematic AI-video tool — in case you want an even higher-production hero cut to intercut with the Remotion render.

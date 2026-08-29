# Neon Snake

The Nokia snake mechanics, rendered in neon. Vanilla JavaScript on an HTML5 canvas —
no build step, no dependencies, no framework.

## Play

Open `index.html` in a browser. That's it.

## Controls

| Key | Action |
| --- | --- |
| `←` `↑` `→` `↓` or `WASD` | Steer |
| `Space` / `P` | Pause |
| `R` | Restart |
| `M` | Mute |
| `Esc` | Back to menu |

On a touch device: **swipe to steer** — anywhere in the layout, not just the
board — and a long drag can chain several turns without lifting your finger.
The on-screen arrow buttons are optional: the start screen has an **Arrow
buttons: Show / Hide** choice, remembered across sessions, and hiding them gives
the space back to the board. The centre button of the pad pauses. Tapping the
**Sound** readout in the HUD mutes. Touch steering activates only on
`(pointer: coarse)` devices, so a mouse drag on a desktop never steers.

### Adding it to a phone home screen

Open the site, then Share → *Add to Home Screen*. It installs with the neon icon
from `icons/`, launches full-screen with no browser chrome, and locks to portrait.
iOS ignores SVG favicons for home-screen icons, which is why `icons/` holds real
PNGs rather than the inline SVG used for the browser tab.

## Rules

- One point per apple. The snake grows by one segment each time.
- Fixed speed of ~9 moves per second on every map — difficulty comes from length alone.
- Running into yourself always ends the run.

## Choices made before the run starts

**Map size** changes how many cells the board is divided into. The board occupies the
same space on screen either way, so a larger map means smaller cells and longer runs.

| Size | Grid |
| --- | --- |
| Small | 15 × 15 |
| Medium | 25 × 25 |
| Large | 35 × 35 |

**Wall mode** decides what the edge of the board does.

| Mode | Behaviour |
| --- | --- |
| Solid Walls | Hitting an edge ends the run (classic Nokia) |
| Wrap Around | The snake reappears on the opposite side |

## What changes as you score

- **Every 5 points** the snake picks a new neon hue. It never picks a colour close to
  the current map's apple, so the snake can't camouflage against its own food.
- **Every 10 points** the map changes. This is cosmetic: the grid, the speed, and the
  collision rules stay identical. The accent colour bleeds out of the canvas into the
  page chrome, so the whole page shifts with it.
- **At 100 points** the **Golden** map takes over *permanently*: the board becomes a
  bright slab of polished gold bullion, and the snake turns **solid gold** for the rest
  of the run. Hue changes stop; it stays gold.

| Score | Map |
| --- | --- |
| 0–9 | Techy — circuit traces and solder nodes, magenta chip |
| 10–19 | Grassy — neon blades and pollen, red apple |
| 20–29 | Blocky — pastel-neon confetti tiles, cyan cube |
| 30–39 | Medieval — a castle great hall: flagstones, a runner, columns, window light, walls hung with heraldry |
| 40–49 | Sky — stars and drifting cloud, a small sun |
| 50–59 | War Map — topographic contours and advance routes, target reticle |
| 60–69 | Tree Trunks — bark grain and knots, teal berry |
| 70–79 | Western — desert dusk and cacti, sheriff's star |
| 80–89 | Candy — diagonal stripes and sprinkles, mint sweet |
| 90–99 | wraps back to Techy |
| **100+** | **Golden** — a glimmering slab of gold bullion, cut diamonds for apples. Gold snake, permanent |

Nine maps cover ten 10-point bands before 100, so 90–99 repeats Techy. Moving the
golden level to 90, or adding a tenth map, would close that gap.

High scores are saved per map size **and** wall mode, so a Wrap score never outranks a
Solid one. They live in `localStorage` on your own machine.

Once a run passes your record, the **Best** readout climbs along with your score for the
rest of that run, so you can watch the record being set. Nothing is written to storage
until you actually die — the save happens at the end of the run, not on every apple.

## Layout

```
index.html        markup, HUD, overlays, D-pad
css/style.css     neon shell; accent colours are CSS custom properties re-tinted per theme
site.webmanifest  home-screen install metadata
icons/            app icons (PNG, generated - see below)
js/config.js      sizes, speed, cadence, storage helpers
js/audio.js       Web Audio blips (no audio files)
js/themes.js      the three maps: background painters and apple shapes
js/snake.js       pure game state - movement, growth, food, collision. No DOM.
js/ui.js          screens, HUD, menu selectors, high scores
js/main.js        boot, fixed-timestep loop, input, swipe/pad handling, rendering
```

Scripts are classic `<script>` tags rather than ES modules, which is what lets
`index.html` run straight off the filesystem with no server.

## Notes on the implementation

- **Turns are queued, not applied instantly.** Two keys pressed inside a single tick
  would otherwise let the snake reverse into itself. Each turn is validated against the
  last *applied* direction.
- **The background is painted once** to an offscreen canvas per theme and blitted each
  frame, so per-frame cost is flat no matter how detailed a map is.
- **The glow is one fill for the whole snake**, not one per segment — a single shadow
  render instead of dozens.
- **Food spawns from a list of free cells**, not by rejection sampling, so it stays
  instant even when the snake covers most of a small board.
- **The Golden board is light, so it carries its own page colour.** A theme sets the
  page background from `pageBg` where it has one, falling back to `ground`; without that
  split, the bright gold board would wash out the light HUD text. On that level the
  snake and the diamonds also take a dark rim, since a glow alone does not hold an edge
  against a bright surface.
- **A map's apple colour is chosen against that map's own floor.** Medieval's apple is an
  emerald, not the obvious crimson: the hall has a deep red runner down the middle, and a
  red gem sitting on it would be near-invisible.
- **The board is sized off the space left over** on touch layouts
  (`min(96vw, 100dvh - reserve)`) rather than a fixed fraction of the viewport, so
  the D-pad can never be pushed off the bottom of a short phone screen.
- **The icons are generated, not hand-drawn.** `tools/make-icons.js` is a small
  software rasteriser — signed distance fields for the rounded segments, hex apple
  and glow, supersampled and box-downsampled, then written out through a minimal
  PNG encoder built on Node's `zlib`. No image library, no binary assets to trust.
  Regenerate with `node tools/make-icons.js icons`.

## Deploying

Static files, no build. On Vercel the project needs no build command and an output
directory of `.`; pushes to `main` deploy automatically.

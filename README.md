# Year

[![Netlify Status](https://api.netlify.com/api/v1/badges/2f96de23-ea35-4e2c-b6c9-f41b41f86dfb/deploy-status)](https://app.netlify.com/sites/damonzucconi-year/deploys)

> Sister, time, it be time, ya know wha mean? Dread.

By default, the year increments 30 times per second; 1,800 years per minute; 108,000 years per hour. Every time it does, a calendar is rendered with each month laid on top of one another.

I like that one can just keep clicking in calendaring software and schedule something to occur 20 years from now. Will Google exist in 20 years to remind me of my upcoming event? Will I?

When you schedule something with someone else, there's the ritual overlaying of calendars. One "finds a time" — a hole of potential in our routines. I made this after imagining the stack of calendars that scheduling creates in one's mind when pursuing those holes. (2016)

- **State**: production
- **Production**:
  - **URL**: https://year.work.damonzucconi.com/
  - **URL**: https://damonzucconi-year.netlify.com/
- **Host**: https://app.netlify.com/sites/damonzucconi-year/overview
- **Deploys**: Merged PRs to `dzucconi/year#master` are automatically deployed to production. [Manually trigger a deploy](https://app.netlify.com/sites/damonzucconi-year/deploys?filter=master)

## Development

Requires Node.js 20.19 or later, or Node.js 22.12 or later.

```sh
npm install
npm run dev
```

Run the complete verification suite with:

```sh
npm run check
```

The application has no runtime dependencies. Vite emits the production site to `dist/`.

## Parameters

| Parameter                | Description                                                                  | Default                                             |
| ------------------------ | ---------------------------------------------------------------------------- | --------------------------------------------------- |
| `mode`                   | Use `scroll` for the endless calendar; any other value uses the stacked work | stacked                                             |
| `year`                   | Initial signed integer year                                                  | current year multiplied by a random factor from 1–9 |
| `background`             | Any supported CSS color, or `random`                                         | `white` stacked; `black` scroll                     |
| `color`                  | Any supported CSS color, or `random`                                         | `red` stacked; `white` scroll                       |
| `play`                   | Start stacked playback or scroll-mode autoscroll                             | `false`                                             |
| `subtitles`              | Show the sequence of questions about the future                              | `false`                                             |
| `fps`                    | Stacked mode's nonnegative years per second                                  | `30`                                                |
| `speed`                  | Scroll mode's signed target CSS pixels per second, from −3600–3600           | `1800`                                              |
| `refreshIntervalSeconds` | Refresh interval; `0` disables it                                            | `3600`                                              |
| `seed`                   | Reproduce the random year factor and requested random colors                 | —                                                   |

Examples:

```text
?year=2240&play=true&fps=12
?mode=scroll&year=2240
?mode=scroll&play=true&speed=1800
?mode=scroll&background=random&color=random&seed=example
```

In scroll mode, year numbering is astronomical: year `0` exists and negative integers represent earlier proleptic-Gregorian years. Autoplay uses iPhone-like inertial flicks — a fast throw, an exponential coast, then a brief rest, an overlapping flick that picks up mid-coast, or an occasional glance — while preserving `speed` as its target CSS pixels per second, so the motion feels consistent across layout widths. The calendar is drawn from a bounded cache of opaque Canvas 2D year and month tiles; rendering resolution is capped at 2× device scale to limit mobile fill rate and memory. Touch and wheel input use the browser's native scrolling and momentum, then feed the same infinite calendar position while pausing autoplay; the centered control or Space resumes it. A compact semantic calendar mirrors the current year for assistive technology. The pointer and control fade after inactivity, mouse movement restores them, and double-clicking toggles fullscreen in either mode. Reduced-motion preferences start autoplay in a paused state.

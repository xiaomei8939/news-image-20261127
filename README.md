# The World in One Image — Friday 27 November 2026

[![make.fun bounty](https://img.shields.io/badge/make.fun-bounty-blue)](https://make.fun/c/news-image-20261127)
[![Reward](https://img.shields.io/badge/reward-%24100%20prize%20pool-green)](https://make.fun/c/news-image-20261127)
[![Rank](https://img.shields.io/badge/rank-awaiting%20judging-lightgrey)](https://make.fun/c/news-image-20261127)

A single 1024×1024 news infographic summing up the world's news of
**Friday 27 November 2026** — seven verified stories across the Middle East,
Europe, the USA, Asia and the markets, each with its source.

## The image

`entry.png` — 1024 × 1024 px, PNG, **29,497 bytes**

- SHA-256: `8035b6f0ad23ad8cdca24c43efce5234dc6f4606f919ec8fa80838de1c4d19de`
- Deterministic: running the program twice produces byte-identical output
  (verified — same SHA-256 on both runs).

## The seven stories

| # | Headline | Verified against |
|---|----------|------------------|
| 01 | Drones over Kuwait kill two Italians | AP via AsiaOne, “Israeli strikes kill 10 in Gaza as Iranian drones kill 2 Italians in Kuwait”; Al Jazeera live blog, 26–27 Nov 2026; Firstpost globe roundup, 27 Nov 2026 |
| 02 | Strikes kill 10 in Gaza as truce frays | AP via AsiaOne, same report, 27 Nov 2026 |
| 03 | Trump tells Putin: pull back | The Japan Times, “Trump urges Putin to end ‘military aggression’ in Europe”, 27 Nov 2026; Reuters, 27 Nov 2026 |
| 04 | Europe picks a new central bank chief | Reuters, “Euro countries pick Spain's De Cos as ECB chief, Costa says”, 26 Nov 2026; CNN, 26 Nov 2026 |
| 05 | Oil jumps past $93 as Gulf fears grow | Reuters, “Oil rises on supply concerns as Iran claims mine strikes on ships”, 26 Nov 2026; Dawn, “Oil prices rebound”, 27 Nov 2026 |
| 06 | Tanker capsizes off Ibiza; one dead | Reuters via CNA, “Crew member dies after diesel tanker capsizes off Ibiza”, 27 Nov 2026; Al Jazeera, 26 Nov 2026 |
| 07 | Blast rocks Bangkok refinery; nine hurt | CNN, “At least 9 injured by large explosion and fire at major oil facility in Bangkok”, 26 Nov 2026; Al Jazeera, 26 Nov 2026 |

Footer ticker: Black Friday falls on 27 November 2026 (Salesforce forecast
≈ $357bn global online sales, via Raconteur) and UK net migration fell to
77,000 (ONS figures, via Firstpost, 27 Nov 2026).

Every fact in the image was checked against reporting published on
27 November 2026 before the image was drawn. Nothing is invented.

## How it is made

`main.ts` is a self-contained Node 22 program using only the standard
library. It draws the whole image in code — a tiny software rasteriser, a
hand-written 5×7 bitmap font, simple vector pictograms (drone, peace sign,
flags, bank, oil barrel, capsized tanker, refinery) and a hand-rolled PNG
encoder (zlib deflate + CRC32). No network, no downloaded images or fonts,
no external code.

## Run it

```sh
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts   # writes out/entry.png
```

Requires Node 22 (the grader runs Node 22.23.4). Without
`MAKEFUN_OUTPUT_DIR` it defaults to `./out/entry.png`.

## Files

- `main.ts` — the program (entrypoint)
- `entry.png` — the image it produces (also reproducible by running it)
- `README.md` — this file
- `LICENSE` — MIT
- `.makefun/owner.json` — payout wallet claim

## License

MIT — see `LICENSE`. Copyright (c) 2026 xiaomei8939.

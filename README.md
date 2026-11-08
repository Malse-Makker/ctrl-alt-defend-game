# CTRL-ALT-DEFEND

**English** | [Nederlands](README.nl.md)

*"I'll put this with the rest of the focus."*

A browser tower defense about defending your working day against your colleagues. You hold them
off with whatever is on your desk: a coffee machine, an auto-reply, and later headphones, a
stapler and a shredder. Towers are objects, enemies are people.

Play: **https://game.makkers.net** (no download, no install).

This is a remake of an earlier Godot version of the same game; all the ideas come from there.

> **About this project:** CTRL-ALT-DEFEND is made with the help of AI (Claude), as a personal
> play and learning project about AI, game design and 3D in the browser. Automated testing and
> deployment (CI/CD with GitHub Actions) is part of that learning too. Non-commercial, part of
> the makkers collection.

## What is in it now (v0.9.1)

- **Level 1, Open-Plan Office**: 21 waves and The Head of Comms.
- **Level 2, Coffee Corner**: 22 waves and The Repair Guy (no Coffee while he is around). Opens
  once you finish level 1.
- **Level 3, Meeting Room**: 21 waves, The Presenter (beams Chasers next to your desk) and the
  projector mini-game: right cable in the right port, right display setting, or no building.
- **Level 4, Canteen**: 22 waves on a spiral round the tables, wet floor where you cannot build,
  the lunch break (a crowd of Interns, and everyone walks faster for a while) and The Cleaner.
- **Towers**: Coffee Machine, Auto-Reply, Headphones (everyone in range stops for a moment),
  Office Artillery (reaches the whole floor, breaks shields), The Shredder (a zone that shares its
  damage and reveals hidden colleagues; it only slows if you jam it), Quick Reply (builds up
  damage on the same target), Thumbtacks (piles of tacks on the walkway, they hit hidden
  colleagues too) and Self-Service (hits everyone in a small circle).
- **Colleagues**: Intern, New Hire, Requester, Chaser, Chatterbox (silences towers), Old Guard
  (archive box as a shield, the Shredder may not touch it), Board Member (immune to anything in
  person) and Impersonator (invisible until a Shredder zone shows him up).
- **Upgrades like Bloons TD 6**: every tower has three paths of four tiers. One path may go to
  tier 4, a second to tier 2, the third stays shut (4-2-0). Tier 3 changes what the tower does,
  tier 4 is the showpiece.
- **A look per path**: from tier 3 a tower looks like the path you chose (the Shredder first, the
  rest follows).
- **The Expense Claim** (Coffee Machine, path 2): Coffee goes into a pot with interest; you decide
  when to claim. Too early is a waste, too late too: a full pot stops growing.
- **Bosses**: The Head of Comms (his Interns soak up your shots), The Repair Guy (blocks all
  income), The Presenter (a loading screen that comes back every phase, Chasers next to your
  desk) and The Cleaner (hurries everyone along, sweeps up tacks, mops Shredders).
- **Targeting** per tower (First, Last, Closest, Farthest, Most HP, Least HP).
- **Top bar**: which floor you are on, Settings (sound and the rest) and Go home, without leaving
  the game.
- **Speeds** 1x, 2x, 4x, 8x, pause, and calling waves early for points.
- **Visible feedback** on every hit: flying mail, damage numbers, BLOCKED/IMMUNE.
- **New colleagues introduce themselves** with what to build against them.
- **End screen** with WHAT HURT YOU (sorted by Focus lost), your towers with damage per Coffee,
  and **feedback** (how much fun was it, 0-10, plus a comment) in one click.
- **Give up** takes you to the end screen with your numbers, not back to the menu.
- **Progress** (stars, Recognition) is kept in your own browser.
- **Play together** (up to 8 players): host a game and share the code or the link
  (`game.makkers.net/?join=CODE`). The host picks the level, the number of players, shared money
  or everyone their own (income split, give Coffee to each other), and where people build:
  anywhere, top and bottom, left and right, four quarters or a patch each. The server runs the
  game; your browser only shows what happens.

## Controls

| Key / mouse | What |
|---|---|
| Left mouse | place or select a tower |
| Shift + click | place several of the same tower in a row |
| Right mouse | cancel; drag = look around |
| Scroll wheel | zoom |
| Space | start the day / next wave |
| 1-9 | pick a tower from the shop |
| , . / | buy the next tier of path 1, 2 or 3 (like in Bloons) |
| C | claim an Expense Claim pot |
| F | change speed |
| P / Esc | pause |
| R | reset the camera |

## How it is built

| Folder | What |
|---|---|
| `src/sim/` | the game rules: pure TypeScript, no browser needed. Fixed time step, seeded random, so every round can be replayed |
| `src/sim/data/` | towers, colleagues, levels and waves. All the numbers live here |
| `src/render/` | Three.js: isometric camera, the office, colleagues, effects |
| `src/ui/` | HUD and screens (plain DOM with CSS grid/flex). All player text is in `src/ui/text.ts` |
| `server/mp/` | multiplayer server (Node + WebSockets): rooms with a join code, runs the same `src/sim` as the browser |
| `server/relay/` | a small Flask service that stores feedback and round numbers (SQLite) and forwards them to Discord/Mattermost |
| `art/blender/` | Python scripts that build every 3D model, icon and preview in Blender |
| `public/` | the built models (`.glb`), icons and sound effects |
| `tools/` | balance report, bots, UI check in a real browser, release script |

More background, decisions and pitfalls (in Dutch): [HANDOFF.md](HANDOFF.md). The build plan per
phase: [docs/BOUWPLAN.md](docs/BOUWPLAN.md).

## Contributing

Pull requests are welcome, also when they are written with AI. Read
[CONTRIBUTING.md](CONTRIBUTING.md) first (setup, checks, how to open a PR) and
[AGENTS.md](AGENTS.md) (the house rules; AI tools read it on their own). Every PR runs the tests
and the UI check automatically.

## Running it locally

You need Node.js 24.

```bash
npm install
npm run dev
```

Open http://127.0.0.1:5173. The feedback relay does not run locally; sending feedback then says
"Could not send it". To try multiplayer locally, start this in a second terminal

```bash
npm run mp
```

and open two tabs.

### Tests

```bash
npm run check          # typecheck + all tests (rules, economy, content, balance bots)
npm run balance        # balance report: HP per wave and what five bots do with every level
npx tsx tools/uicheck.ts   # plays through the screens in headless Chrome, screenshots in shots/,
                           # reports text that overlaps, sticks out or falls off the screen
npx tsx tools/uicheck.ts --mp-only   # host and guest in two browsers: lobby, start, building
```

The relay has its own tests:

```bash
cd server/relay && pip install -r requirements-dev.txt && python -m pytest -q
```

### Rebuilding models and icons

You need Blender 5.x.

```bash
blender -b --python art/blender/build_models.py      # every model into public/models
blender -b --python art/blender/icons.py             # icons into public/icons
blender -b --python art/blender/preview.py -- --out art/previews/diorama.png
blender -b --python art/blender/projector_ui.py      # the projector mini-game pictures + port positions
```

Add `-- --only intern,coffee_1` to build just a few.

## Deploying

The game runs in Docker on the OVH server (`/home/ubuntu/ctrl-alt-defend-game`), behind Nginx
Proxy Manager on game.makkers.net. Three containers: `web` (nginx with the built game), `mp` (the
multiplayer server, on `/mp`) and `relay` (feedback). In NPM, "Websockets Support" must be on for
game.makkers.net. The tests run inside the Docker build: an image with failing tests does not get
made.

Every push to `main` runs the tests in GitHub Actions and then deploys, once the
`SSH_PRIVATE_KEY` secret is set on the repo (the same deploy key as the other makkers projects).

First time on the server:

```bash
git clone https://github.com/Malse-Makker/ctrl-alt-defend-game.git /home/ubuntu/ctrl-alt-defend-game
cd /home/ubuntu/ctrl-alt-defend-game && cp .env.example .env   # fill in the port and webhook(s)
sudo mkdir -p /opt/ctrl-alt-defend-game && sudo chown 10001 /opt/ctrl-alt-defend-game   # the relay runs as uid 10001
GIT_COMMIT=$(git rev-parse --short HEAD) docker compose up -d --build
```

Feedback to Mattermost: create an incoming webhook for the channel in Mattermost, put the URL in
`.env` on the server as `MATTERMOST_WEBHOOK_URL=` and load it with `docker compose up -d relay`.

New pull requests are posted in Mattermost too, through the `MATTERMOST_WEBHOOK_URL` secret on the
GitHub repo (`.github/workflows/pr-notify.yml`).

A release: bump `VERSION`, write a section at the top of `CHANGELOG.md`, commit, then run
`tools/release.sh` (or `tools/release.sh --ssh` while the Actions key is not there).

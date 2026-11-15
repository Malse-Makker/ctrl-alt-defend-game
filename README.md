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

## What is in it now (v0.49.0)

Fifteen floors in three blocks (junior, medior, senior). Each floor opens once you finish the one
before, brings something new to build and ends with a boss.

| Floor | What is special | New towers | Boss |
|---|---|---|---|
| 1 Reception | speed gates where everyone stops to scan their pass | Coffee Machine, Auto-Reply | The Head of Comms |
| 2 Coffee Corner | a small kitchen full of furniture | Headphones, Office Artillery | The Repair Guy |
| 3 Presentation Room | rows of tables, a projector that cuts out (fix the cables) | Quick Reply, Self-Service | The Presenter |
| 4 Canteen | a spiral round the tables, a soup queue for Thumbtacks only, the lunch break | The Shredder, Thumbtacks | The Cleaner |
| 5 Boardroom | a loop round the table | Keyboard Smash, Office Chair (one each) | Your Line Manager |
| 6 Work From Home | walls that block sight, bad wifi, the internet drops out | Reply All | The Baby |
| 7 The Car Park | build in empty bays only, exhaust fumes cut your range | Delegation | The Smoking Colleague |
| 8 Hot Desks | build on flex desks, some reserved every wave, the desk phone | Pomodoro Timer | The Head of Comms |
| 9 Town Hall | two entrances, a tribune that reaches further, the fire alarm | Motivational Poster | The Repair Guy |
| 10 Boardroom II | a glass room whose blinds come down | | Your Line Manager |
| 11 The Merger | DIGITAL towers on one side, PHYSICAL on the other, moving boxes | | The Consultant |
| 12 HR Room | a one-way mirror, forms that stop you upgrading | | The HR Manager |
| 13 Server Room | the cold slows reloading, a closed room, the cooling fails | | The Cleaner |
| 14 Release Night | dark office, only the desk lamps light it, pizza | | The Project Manager |
| 15 Boardroom III | two entrances, faster blinds, a 360-degree review | | Your Line Manager, 360 |

**Towers** are things from your desk, each with its own trick: the Coffee Machine (Coffee, or a
pot with interest), Auto-Reply, Headphones (everyone in range stops for a moment), Office
Artillery (the whole floor), The Shredder (a zone that reveals hidden colleagues), Quick Reply
(three at once), Thumbtacks (piles on the walkway), Self-Service ("please hold"), Keyboard Smash
and the Office Chair (specials, one each), Reply All (lands on a crowd), Delegation (jumps on,
harder every time), the Pomodoro Timer (lobs over walls) and the Motivational Poster (makes the
towers round it better). DIGITAL towers need the internet and slow down on bad wifi; PHYSICAL ones
do not.

**Upgrades like Bloons TD 6**: three paths of four tiers, one path to tier 4, a second to tier 2,
the third stays shut (4-2-0). You can see every combination on the tower itself: each path at tier
1 or 2 adds its own piece in the path's colour, and at tier 3 and 4 the tower becomes something
else entirely. Small lights on the floor in front of it count the tiers.

**Colleagues**: the Intern, the New Hire, the Chaser, the Requester (two Chasers come out), the
Chatterbox (towers near him stop), the Speakerphone Caller (all the attention), and two things a
colleague can shrug off, like lead and camo: a **box** (the Old Guard's archive, the Board
Member's laptop: only towers that break boxes get through) and being **hidden** (the
Impersonator, the Cold Caller: only towers that see hidden colleagues can aim at them; Tracking
Pixel and Paper Trail find them for good).

**Bosses** force a different approach, not just more HP: The Repair Guy stops all income, The
Presenter's loading screen comes back every phase, The Baby takes all the attention, The
Consultant covers for everyone else, The HR Manager audits your favourite tower, The Project
Manager speeds everyone up. On six floors a side door with a red sign shows where a boss's people
will come in.

**And further**

- **Saying what does not work**: icons over colleagues and towers, "BOUNCED OFF", the reason a
  tower is idle, a hint when a colleague gets through, and "Who is who" with every colleague and
  what beats them.
- **Placing**: the build grid shows where a tower may stand and where it would see nothing, and
  how much of the walkway it covers.
- **Speeds** 1x to 8x, pause, calling waves early for points, targeting per tower.
- **End screen** with what hurt you, your towers' damage per Coffee, and feedback in one click.
- **Progress and Recognition** in your own browser: stars earn perks for your next game.
- **Play together** (up to 8 players): host a game and share the code or the link
  (`game.makkers.net/?join=CODE`). Shared money or everyone their own, and where everyone builds.
  The server runs the game; your browser only shows it.

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

## License

[CC BY-NC 4.0](LICENSE): use it, share it and change it for anything non-commercial, as long as
you credit "CTRL-ALT-DEFEND by Malse-Makker" with a link to this repo. No commercial use.

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
blender -b --python art/blender/contactsheet.py -- shots headphones   # all 49 upgrade combinations
```

Add `-- --only intern,coffee_core` to build just a few. Every tower is 13 parts: a core, a module
per path for tier 1 and 2 that sits in that path's slot, and a hero per path for tier 3 and 4. The
game puts them together for each combination of upgrades (`modelFor` and `modulesFor` in
`src/sim/data/towers.ts`); `tower_parts()` in `build_models.py` does the same in Blender, which is
what the contact sheet uses. Add `--tile 40` to see the sheet at playing distance, or `--sides` to
see the core and the heroes from all four sides.

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

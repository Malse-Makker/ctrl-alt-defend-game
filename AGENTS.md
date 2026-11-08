# Rules for contributors and AI agents

These are the house rules for CTRL-ALT-DEFEND. They apply to every pull request, whether a
person or an AI agent wrote it. AI tools (Claude Code, Codex, Cursor, Copilot and others) read
this file automatically; if yours does not, paste it into the chat first.

Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup and the pull request flow. This file is the
checklist of things that must stay true.

## The game in short

- A tower defense about defending your working day. **Towers are objects from your desk**
  (Coffee Machine, Auto-Reply, Headphones, a stapler, a shredder). **Enemies are colleagues**
  (The Intern, The Chaser, The Old Guard). Nobody gets hurt: colleagues are "dealt with".
- Resources: **Focus** is your health (a colleague reaching your desk costs Focus), **Coffee** is
  money. Every tower has its own verb: if a new tower just "shoots the one in front", it is not
  different enough.
- Upgrades work like Bloons TD 6: three paths of four tiers, rule **4-2-0** (one path to tier 4,
  a second to tier 2, the third stays shut). Tier 3 changes what the tower does.
- Bosses must force a different approach, not just have more HP.
- Tone: dry, recognisable office humour. Short sentences. No exclamation marks unless something
  is actually on fire.

## Hard rules (a PR that breaks one of these is not merged)

1. **`npm run check` passes** (typecheck plus every test) and **`npm run build` passes**.
2. **Every change in behaviour comes with a test** in `tests/`. A bug fix comes with a test that
   fails without the fix. Do not delete or loosen an existing test to make a PR pass; if a test
   is wrong, say why in the PR.
3. **The simulation stays deterministic.** Everything in `src/sim/` is pure TypeScript with no
   DOM, no `Math.random`, no `Date`, no timers. Randomness goes through the game's seeded RNG
   (`this.rng`). The same simulation runs on the multiplayer server, so anything that is not
   deterministic breaks multiplayer.
4. **State the player sees must survive a snapshot.** If you add game state that the screen
   shows, add it to `toSnapshot()` and `applySnapshot()` in `src/sim/game.ts`, and test the round
   trip (see `tests/level4.test.ts`, "snapshots carry the new state").
5. **All damage goes through `Game.damage()`**, so shields and immunities cannot be skipped.
6. **Player-facing text is English, plain ASCII, no em-dashes (use a colon, comma or full stop).**
   It lives in the data files (`src/sim/data/`) or in `src/ui/text.ts`, where
   `tests/content.test.ts` checks it. Never build text into the page with `innerHTML`; use the
   `h()` helper in `src/ui/dom.ts`, which sets `textContent`.
7. **Content is data.** New towers, colleagues, upgrades and levels go in `src/sim/data/`
   (`towers.ts`, `colleagues.ts`, `levels.ts`). Upgrade effects are folded in `computeStats()`.
8. **Balance changes come with numbers.** Run `npm run balance` before and after and put both in
   the PR. `tests/balance.test.ts` and `tests/economy.test.ts` hold the rules (good play is
   flawless, Auto-Replies alone are not enough, an upgrade beats buying another copy). Do not
   change their thresholds without measuring.
9. **UI changes come with screenshots.** Run `npx tsx tools/uicheck.ts` (needs Google Chrome or
   Chromium). It plays through the screens in a headless browser, reports text that overlaps,
   sticks out or falls off the screen, and saves screenshots in `shots/`. It must report
   `0 UI problem(s), 0 browser error(s)`. Attach the relevant screenshots to the PR.
10. **3D models and icons are built by the Blender scripts** in `art/blender/`, never edited by
    hand. A new model gets a builder in `build_models.py`, a name in `MODEL_NAMES`
    (`src/render/assets.ts`) and an icon in `icons.py`. Sounds go in `public/sfx/`, the `SOUNDS`
    list in `src/audio/sfx.ts`, and a line in `art/SOUND.md`.
11. **No secrets, ever.** Do not commit `.env`, webhook URLs, keys or tokens. Do not change the
    deploy workflow, `docker-compose.yml`, the nginx config or the security headers unless the PR
    is about exactly that and says why.
12. **Dependencies are pinned to exact versions.** No new dependency without a reason in the PR,
    and never one that pulls in a large framework for a small job.
13. **Leave `VERSION` and `CHANGELOG.md` alone.** The maintainer writes those at release time.
    Put a one-line, player-facing changelog entry in the PR description instead.
14. **No real brands, people or copyrighted material** in names, art or text.

## How to work

- One topic per pull request. Small PRs get merged; a PR that touches thirty files for one idea
  gets sent back.
- Match the code around you: naming, comment style (comments say why, not what), file layout.
- Read before you write: `README.md` ("Hoe het in elkaar zit"), the data files, and the test for
  the area you change. The tests show how things are meant to behave.
- Run the game (`npm run dev`) and actually play the thing you changed.
- If you are an AI agent: do not claim something works without running the check that proves
  it. Report test output honestly, including failures.

## Where things are

| Path | What |
|---|---|
| `src/sim/` | the game rules: simulation, data, bots, commands. Pure, deterministic |
| `src/sim/data/` | towers, colleagues, levels and waves: all the numbers |
| `src/render/` | Three.js: the floor, the models, effects |
| `src/ui/` | HUD, menus, screens (DOM) |
| `src/session.ts` | glues a game to the screen, input and sound |
| `server/mp/` | multiplayer server (runs the same simulation) |
| `server/relay/` | feedback relay (Flask, SQLite) with its own pytest tests |
| `tests/` | vitest: rules, economy, content, balance bots, multiplayer, per level |
| `tools/` | balance report, UI check, release script |
| `art/blender/` | scripts that build every model and icon |

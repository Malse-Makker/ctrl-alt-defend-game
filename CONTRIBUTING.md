# Contributing

Thanks for wanting to help with CTRL-ALT-DEFEND. Pull requests are welcome, including ones
written with an AI tool, as long as they follow the rules in [AGENTS.md](AGENTS.md) and come
with tests.

Play the current version at **https://game.makkers.net** first, so you know what you are
changing.

## Before you start

- **Small fix or polish** (a bug, a typo, a layout problem): just open a pull request.
- **Something bigger** (a new tower, colleague, level, mechanic, or a change in balance): open an
  issue first and describe the idea. The game has a design behind it (see "The game in short"
  in AGENTS.md), and it is a shame to build something that does not fit.

## Setup

You need Node.js 24 and git. For the UI check also Google Chrome or Chromium. For models and
icons Blender 5.x (only if you change art).

```bash
git clone https://github.com/<you>/ctrl-alt-defend-game.git
cd ctrl-alt-defend-game
npm install
npm run dev          # the game at http://127.0.0.1:5173
npm run mp           # optional, in a second terminal: the multiplayer server
```

## The checks

Run all of these before you open a pull request:

```bash
npm run check                 # typecheck + all tests
npm run build                 # production build
npx tsx tools/uicheck.ts      # for UI changes: screens in headless Chrome, screenshots in shots/
npm run balance               # for balance changes: what five bots do with every level
```

The relay (feedback server) has its own tests, only needed if you touch `server/relay/`:

```bash
cd server/relay && pip install -r requirements-dev.txt && python -m pytest -q
```

The same checks run on GitHub for every pull request.

## Writing tests

Tests live in `tests/` and use vitest. The simulation runs without a browser, so most tests
build a small level, place towers and run the clock:

```ts
import { Game } from '../src/sim/game';
import { corridor } from './helpers';

it('Thumbtacks hit The Impersonator without seeing him', () => {
  const g = new Game(corridor(['impersonator:1@1'], { towers: ['thumbtacks'] }));
  g.coffee = 500;
  const t = g.place('thumbtacks', 8, 1).tower!;
  g.start();
  g.runFor(20);
  expect(t.stats.damage).toBeGreaterThan(0);
});
```

`corridor()` is a straight walkway from left to right along y = 2.5. Look at
`tests/level4.test.ts` for more examples, including the multiplayer snapshot round trip.

## Opening the pull request

1. Fork the repo, make a branch with a short name (`fix-shredder-range`, `tower-office-chair`).
2. Keep it to one topic.
3. Fill in the pull request template: what and why, how to test, the checklist, a one-line
   changelog entry, screenshots for anything visible, balance numbers for anything that changes
   difficulty.
4. Say which AI tool you used, if any, and confirm you read and understood every line of the
   diff. You are responsible for what you submit, not the tool.

By opening a pull request you agree that your contribution is published under the same license
as the rest of the game, [CC BY-NC 4.0](LICENSE), with the game credited to Malse-Makker.

The maintainer reviews, may ask for changes, and handles the version number, the changelog and
the release. Merged changes go live on game.makkers.net with the next release.

## Using an AI agent

Point your agent at `AGENTS.md` before it writes anything (Claude Code reads it through
`CLAUDE.md`, most other tools read `AGENTS.md` directly). A good first prompt:

> Read AGENTS.md and CONTRIBUTING.md. Then [your task]. Write tests first, run `npm run check`
> and `npm run build`, and for UI changes run `npx tsx tools/uicheck.ts`. Do not touch VERSION,
> CHANGELOG.md, the deploy files or anything with secrets.

Then read the diff yourself before you push.

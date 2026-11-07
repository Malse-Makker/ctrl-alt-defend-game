// Balance report: npm run balance [-- --level 1]
// Prints HP-equivalent per wave and what each bot does with the level. Run it after every change
// to towers, colleagues, waves or economy, and put the numbers in the commit message or HANDOFF.

import { COLLEAGUES } from '../src/sim/data/colleagues';
import { LEVELS } from '../src/sim/data/levels';
import { TOWERS } from '../src/sim/data/towers';
import { parseWave, waveDuration, waveHp } from '../src/sim/waves';
import { BOTS, runBot } from './bots';

const args = process.argv.slice(2);
const only = args.includes('--level') ? Number(args[args.indexOf('--level') + 1]) : null;
const seeds = [1, 2];

function pad(s: string | number, n: number): string {
  return String(s).padStart(n);
}

console.log('TOWERS (DPS per Coffee, cumulative)');
for (const def of Object.values(TOWERS)) {
  if (def.role !== 'damage') continue;
  let spent = 0;
  const row = def.levels.map((lv) => {
    spent += lv.cost;
    const dps = lv.damage! / lv.interval!;
    return `${lv.name}: ${dps.toFixed(2)} dps, ${(dps / spent).toFixed(3)}/C`;
  });
  console.log(`  ${def.name.padEnd(16)} ${row.join(' | ')}`);
}

for (const level of Object.values(LEVELS)) {
  if (only !== null && level.id !== only) continue;
  console.log(`\nLEVEL ${level.id}: ${level.name}`);
  console.log('  wave   HP-eq   secs  colleagues');
  let total = 0;
  let prev = 0;
  level.waves.forEach((spec, i) => {
    const groups = parseWave(spec);
    const hp = waveHp(groups);
    total += hp;
    const jump = prev > 0 ? ((hp / prev - 1) * 100).toFixed(0) + '%' : '';
    const who = groups.map((g) => `${g.count} ${COLLEAGUES[g.type].name.replace('The ', '')}`).join(', ');
    console.log(`  ${pad(i + 1, 4)} ${pad(hp, 7)} ${pad(waveDuration(groups).toFixed(1), 6)}  ${who}  ${jump}`);
    prev = hp;
  });
  console.log(`  total HP-eq ${total}`);

  console.log('\n  bot      seed  result  focus  stars  waves  1st-leak  deepest  coffee-earned  end  build');
  for (const bot of BOTS) {
    for (const seed of seeds) {
      const r = runBot(level, bot, seed);
      console.log(
        `  ${r.bot.padEnd(8)} ${pad(seed, 4)}  ${(r.won ? 'WON' : 'LOST').padEnd(6)} ${pad(r.focus, 5)}  ${pad(r.stars, 5)}  ${pad(
          r.wavesReached,
          5,
        )}  ${pad(r.firstLeakWave || '-', 8)}  ${pad((r.deepest * 100).toFixed(0) + '%', 7)}  ${pad(r.coffeeEarned, 13)}  ${pad(r.coffeeEnd, 4)}  ${r.build}`,
      );
      if (seed === 1 && Object.keys(r.leaks).length > 0) console.log(`           leaks: ${JSON.stringify(r.leaks)}`);
    }
  }
  const solid = runBot(level, BOTS.find((b) => b.name === 'solid')!, 1);
  console.log(`\n  solid bot, Coffee in hand at each wave start: ${solid.coffeeByWave.join(' ')}`);
}

// Every tower that fires at a colleague throws something of its own.

import { describe, expect, it } from 'vitest';
import { TOWERS } from '../src/sim/data/towers';
import { PROJECTILE_LOOK, projectileFor } from '../src/render/projectiles';

describe('projectiles', () => {
  it('the five mail towers and Office Artillery each throw their own thing', () => {
    const shooters = ['autoreply', 'quickreply', 'selfservice', 'replyall', 'delegation', 'artillery'];
    const kinds = shooters.map(projectileFor);
    expect(new Set(kinds).size).toBe(shooters.length);
  });

  it('every tower that aims gets a projectile with a look', () => {
    for (const def of Object.values(TOWERS)) {
      if (def.role !== 'damage') continue;
      expect(PROJECTILE_LOOK[projectileFor(def.id)], def.id).toBeDefined();
    }
  });
});

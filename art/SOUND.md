# Geluid

Alle effecten in `public/sfx/` zijn gemaakt met de sfx-MCP-server (`sfx_export` /
`sfx_from_description`), 44,1 kHz mono WAV. Afspelen gaat via `src/audio/sfx.ts`; daar staan per
geluid ook het volume (`GAIN`) en hoe vaak het mag klinken (`THROTTLE`).

Een nieuw geluid: maak het met de MCP-server direct in `public/sfx/<naam>.wav`, zet de naam in
`SOUNDS` in `sfx.ts`, en speel het af vanuit `session.ts` (`sfx.play('<naam>')`).

| Bestand | Wanneer | Hoe gemaakt |
|---|---|---|
| shot, hit, kill | schot, treffer, collega afgehandeld | v0.1 |
| leak | collega bereikt je bureau | v0.1 |
| coffee | Coffee binnen | v0.1 |
| place, upgrade, sell, deny, click | bouwen en menu's | v0.1 |
| wave, boss, bossphase | nieuwe golf, boss, boss-fase | v0.1 |
| win, lose, split | einde, Requester splitst | v0.1 |
| pulse | Headphones-puls | v0.4 |
| staple | Office Artillery | v0.4 |
| tacks | Thumbtacks laat een hoopje vallen | preset `click`, profiel `mechanical-click`, 2400 Hz, ruis 0.35, herhaling 25 ms |
| mop | The Cleaner veegt punaises op of dweilt een Shredder | preset `swoosh`, profiel `muffled-distant`, 300 Hz, ruis 0.85 |
| lunch | lunchpauze begint | preset `success`, profiel `soft-notification`, 880 Hz sinus, toon omlaag |
| smash | Keyboard Smash slaat op het looppad | preset `hit`, profiel `punchy-impact`, 180 Hz, ruis 0.6, herhaling 30 ms |
| roll | de bureaustoel gaat rijden | preset `swoosh`, profiel `mechanical-click`, 420 Hz, tremolo (wieltjes) |

# Geluid

Alle effecten in `public/sfx/` zijn gemaakt met de sfx-MCP-server (`sfx_export` /
`sfx_from_description`), 44,1 kHz mono WAV. Afspelen gaat via `src/audio/sfx.ts`; daar staan per
geluid ook het volume (`GAIN`) en hoe vaak het mag klinken (`THROTTLE`).

Een nieuw geluid: maak het met de MCP-server direct in `public/sfx/<naam>.wav`, zet de naam in
`SOUNDS` in `sfx.ts`, en speel het af vanuit `session.ts` (`sfx.play('<naam>')`).

| Bestand | Wanneer | Hoe gemaakt |
|---|---|---|
| shot, hit, kill | mail verstuurd (swoosh), papier-klap, verfrommeld papier | v0.14: `swoosh`, `hit`/`mechanical-click`, `explosion`/`muffled-distant` met crackle |
| leak | collega bereikt je bureau: doffe plof | v0.14: `hit`/`punchy-impact`, 140 Hz omlaag |
| coffee | Coffee binnen: borrelende machine | v0.14: `blip`, 260 Hz sinus, herhaling 55 ms (bubbels), wow |
| place, upgrade | iets op een bureau zetten, belletje | v0.14: `footstep`/`punchy-impact`; `powerup`/`soft-notification` |
| sell, deny, click | menu's | v0.1 |
| wave | nieuwe golf: notificatie-ding-dong | v0.14: `success`/`soft-notification`, 988 Hz |
| boss, bossphase | boss, boss-fase | v0.1 |
| win, lose, split | einde, Requester splitst | v0.1 |
| pulse | Headphones-puls | v0.4 |
| staple | Office Artillery | v0.4 |
| tacks | Thumbtacks laat een hoopje vallen | preset `click`, profiel `mechanical-click`, 2400 Hz, ruis 0.35, herhaling 25 ms |
| mop | The Cleaner veegt punaises op of dweilt een Shredder | preset `swoosh`, profiel `muffled-distant`, 300 Hz, ruis 0.85 |
| lunch | lunchpauze begint | preset `success`, profiel `soft-notification`, 880 Hz sinus, toon omlaag |
| smash | Keyboard Smash slaat op het looppad | preset `hit`, profiel `punchy-impact`, 180 Hz, ruis 0.6, herhaling 30 ms |
| roll | de bureaustoel gaat rijden | preset `swoosh`, profiel `mechanical-click`, 420 Hz, tremolo (wieltjes) |
| cash | pot claimen, Coffee krijgen van een collega | preset `coin`, profiel `bright-ui-tick` |
| key1-3, keyspace | iemand typt op de achtergrond; sneller en harder bij weinig Focus (`setTyping` in `sfx.ts`) | preset `click`, profiel `mechanical-click`, 1500-2300 Hz; spatie 700 Hz |
| cry | The Baby krijgt een huilbui | preset `alarm`, profiel `soft-notification`, 620 Hz met trillende toonhoogte |
| gate | een collega scant zijn pasje bij het poortje (Reception) | preset `blip`, profiel `bright-ui-tick`, 1650 Hz sinus, toon omhoog, 0,16 s |
| projector | de beamer slaat aan, 3 s voor de projector-mini-game (Presentation Room) | preset `engine`, profiel `mechanical-click`, 180 Hz blok omhoog met tremolo, plus een fluittoon van 900 Hz, 1,4 s |
| phone | de bureautelefoon gaat over (Hot Desks) | preset `alarm`, profiel `soft-notification`, 1150 Hz sinus met tremolo en een blokgolf-LFO van 2,5 Hz (tring-tring), 1,3 s |
| tick | een Pomodoro Timer lanceert een tomaat | preset `click`, profiel `mechanical-click`, 1900 Hz, herhaling 70 ms (tikken) |
| splat | een tomaat landt | preset `hit`, profiel `punchy-impact`, 220 Hz omlaag, veel ruis, crackle |

# Bouwplan

Bron van waarheid voor de inhoud: de ontwerpbijbel in `07_REMAKE_PROMPT.md`, deel 2. Die staat alleen lokaal
bij de maker (niet in git).
Elke fase eindigt live op game.makkers.net, met tests, balansmeting en een UI-controle.

## Fase 1: één speelbaar level (v0.1.x), KLAAR

- Engine: simulatie in pure TypeScript, Three.js-weergave, DOM-HUD.
- Level 1 Open-Plan Office met 21 golven en The Head of Comms.
- Coffee Machine en Auto-Reply met upgrades, zijsporen en targeting.
- The Intern, The New Hire, The Requester (splitst in Chasers), The Chaser.
- Eindscherm (WHAT HURT YOU), feedback met één knop, rondecijfers naar de relay (SQLite).
- Tests: regels, economie, content, balans-bots, relay, UI-controle in headless Chrome.

## Tussendoor (KLAAR): upgrades zoals Bloons (v0.2) en multiplayer (v0.3)

## Fase 2: het junior-blok (v0.4 tot v0.7)

Volgorde volgt de ontgrendeling uit de bijbel (één nieuwe toren per level).

1. **Level 2 Coffee Corner** (KLAAR, v0.4.0): Headphones, Office Artillery, The Shredder; The
   Chatterbox, The Old Guard, The Board Member en The Repair Guy.
2. **Level 3 Meeting Room** (KLAAR, v0.5.0): Quick Reply, The Presenter, de projector-mini-game.
3. **Level 4 Canteen** (KLAAR, v0.6.0): Thumbtacks, Self-Service, The Impersonator (onzichtbaar),
   The Cleaner, lunchpauze-zwerm, natte-vloer-vakken.
4. **Level 5 Boardroom** (KLAAR, v0.12.0): Keyboard Smash, de bureaustoel (idee van de maker: rijdt in een rechte
   lijn die je zelf kiest, raakt en verliest HP, rijdt dan terug), Your Line Manager (drie fases).
   Daarvoor of tussendoor: eigen modellen per pad op tier 3 en 4, toren voor toren.
5. (KLAAR, v0.13.0) Meta-shop met Recognition (Startup Budget, Extra Caffeine, Bulk Discount, Smoke Break) en de
   promotie na L5.

Per level: modellen in Blender (zelfde stijl), golven vertaald uit v0.88 en daarna gemeten met de
bots, een eigen boss-mechaniek die een andere aanpak afdwingt.

## Nieuw leveldesign (besluit maker, 2026-11-12)

Alle 15 levels opnieuw ingericht volgens `/home/mick/projecten/CTRL-ALT-DEFEND/docs/leveldesign/`
(tegelraster, meubels op schaal, zichtblokkades, een eigen kaartregel per level).
KLAAR (2026-11-13, v0.17.0 tot v0.31.0): alle 15 levels naar het nieuwe ontwerp, plus de
zichtregel (alle meubels blokkeren zicht, rood bereik zoals Bloons), DIGITAL/PHYSICAL, de
Pomodoro Timer (L8) en de Motivational Poster (L9), en de bosses The Consultant (L11), The HR
Manager (L12), The Project Manager (L14) en Your Line Manager, 360 (L15). Per level staan de
keuzes en metingen in HANDOFF.md.

Nog open uit deze ronde (zie HANDOFF.md, "OPEN"): de balans van L9 tot en met L13 en L15 haalt
met de bots niet "goed spelen is foutloos" (L13 het zwaarst), en de eigen mini-game voor de
laatste boss.

## Fase 3: medior en senior

KLAAR: Level 6 Work From Home (v0.15.0): zichtmuren, No Internet-dino, Reply All, The Cold Caller,
The Baby.
KLAAR: Level 7 The Car Park (v0.16.0): uitlaatgassen, Delegation, The Phone Caller, The Smoking
Colleague.

KLAAR: levels 8-15 met hun hazards (telefoon, brandalarm, jaloezieën, formulier, oververhitting,
pizza) en de torens Pomodoro Timer en Motivational Poster.
Nog te doen: Ctrl+Alt+Del als knop met cooldown, Boss Rush en Endless.

## Balansronde als alle levels en torens er zijn (besluit maker, 2026-11-08)

- **Te veel torens geven Coffee.** Nu: Coffee Machine (de economietoren), Office Artillery
  (Expense the Staples, Supply Drop), The Shredder (Recycling, Compactor) en Self-Service (Closed as
  Resolved). Plan: Coffee hoort bij de Coffee Machine en hooguit één andere toren; de rest krijgt
  een ander tier-effect. Pas aanpakken als alle content er is, dan in één keer meten met de bots.

## Open punten uit de bijbel om bij de juiste fase op te pakken

- The Expense Claim (tweede economie-toren): bij fase 2, na de meta-shop.
- The Shredder laat schade plakken; Thumbtacks negeren zicht; Poster lvl 3 geeft korting.
- The Whiteboard (detectie-toren) zodra er onzichtbare collega's zijn.
- The Steering Committee terug als boss of klasse-breuk: vragen aan de maker.
- Abilities tijdens een ronde (Ctrl+Alt+Del), zodat er meer te doen is.

# Bouwplan

Bron van waarheid voor de inhoud: de ontwerpbijbel in `07_REMAKE_PROMPT.md` (oude repo, deel 2).
Elke fase eindigt live op game.makkers.net, met tests, balansmeting en een UI-controle.

## Fase 1: één speelbaar level (v0.1.x), KLAAR

- Engine: simulatie in pure TypeScript, Three.js-weergave, DOM-HUD.
- Level 1 Open-Plan Office met 21 golven en The Head of Comms.
- Coffee Machine en Auto-Reply met upgrades, zijsporen en targeting.
- The Intern, The New Hire, The Requester (splitst in Chasers), The Chaser.
- Eindscherm (WHAT HURT YOU), feedback met één knop, rondecijfers naar de relay (SQLite).
- Tests: regels, economie, content, balans-bots, relay, UI-controle in headless Chrome.

## Fase 2: het junior-blok (v0.2 tot v0.5)

Volgorde volgt de ontgrendeling uit de bijbel (één nieuwe toren per level).

1. **Level 2 Coffee Corner**: Headphones, Office Artillery, The Shredder; The Chatterbox en
   The Repair Guy (geen Coffee zolang hij leeft). Softlock-regel: Headphones vóór de eerste
   Chatterbox.
2. **Level 3 Meeting Room**: Quick Reply, The Presenter, de projector-mini-game.
3. **Level 4 Canteen**: Thumbtacks, Self-Service, The Impersonator (onzichtbaar), The Cleaner,
   lunchpauze-zwerm, natte-vloer-vakken.
4. **Level 5 Boardroom**: Keyboard Smash, Your Line Manager (drie fases).
5. Meta-shop met Recognition (Startup Budget, Extra Caffeine, Bulk Discount, Smoke Break) en de
   promotie na L5.

Per level: modellen in Blender (zelfde stijl), golven vertaald uit v0.88 en daarna gemeten met de
bots, een eigen boss-mechaniek die een andere aanpak afdwingt.

## Fase 3: medior en senior (v0.6 tot v1.0)

Levels 6-15 met hun hazards en mini-games (No Internet-dino, telefoon, brandalarm, formulier,
pizza, oververhitting), de resterende torens (Reply All, Delegation, Pomodoro, Motivational Poster,
Ctrl+Alt+Del als knop met cooldown), de collega's met immuniteiten (Board Member, Cold Caller,
Old Guard met schild, Phone Caller), en daarna Boss Rush en Endless.

## Open punten uit de bijbel om bij de juiste fase op te pakken

- The Expense Claim (tweede economie-toren): bij fase 2, na de meta-shop.
- The Shredder laat schade plakken; Thumbtacks negeren zicht; Poster lvl 3 geeft korting.
- The Whiteboard (detectie-toren) zodra er onzichtbare collega's zijn.
- The Steering Committee terug als boss of klasse-breuk: vragen aan de maker.
- Abilities tijdens een ronde (Ctrl+Alt+Del), zodat er meer te doen is.

# Overdracht

Voor de volgende chat. Lees dit, dan `docs/BOUWPLAN.md`, dan de ontwerpbijbel
(`/home/mick/projecten/CTRL-ALT-DEFEND/07_REMAKE_PROMPT.md`, deel 2; alleen lokaal, niet in git. De
oude Godot-repo wordt gearchiveerd en privé).

## Stand: v0.33.0 (2026-11-13), nog niet live (live: 0.24.0); alle 15 levels staan erin; review stap 1-3 klaar

Fase 1 is af: level 1 speelbaar in de browser, twee torens, vier collega's plus boss, feedback en
rondecijfers via de relay (naar Mattermost). v0.2.0: upgrades zoals Bloons TD 6. v0.3.0:
multiplayer. v0.4.0: level 2. v0.5.0: level 3. v0.6.0: level 4. v0.6.1: settings in het spel,
levelnaam, ranges. v0.7.0: eerste eigen looks per pad (Shredder). v0.8.0: Headphones = stilzetten, Shredder =
schade (besluit maker), Go home, blauwe schilden. v0.9.0: torenrechten in multiplayer (standaard
ieder zijn eigen; `ownTowers`), verkoop betaalt ieder zijn eigen deel terug (`paidBy`), Offshore
Account claimt al je potten. v0.9.1: gerenderde projector (`art/blender/projector_ui.py`).
v0.10.0: Coffee Corner opnieuw als vierkant keukentje (14x14, besluit maker: levels moeten
eruitzien als hun naam); elk level kan een eigen `look` hebben (vloer, looppad, muur). Zie CHANGELOG.md.

Looks per pad: `pathModels` in `towers.ts` (tier 3 en 4 per pad, modellen `<toren>_p<pad>_<tier>`).
Klaar: Shredder. Nog te doen: Coffee Machine, Auto-Reply, Headphones, Office Artillery, Quick
Reply, Thumbtacks, Self-Service. `tests/assets.test.ts` faalt als een model of icoon ontbreekt.

**Volgorde van de maker (2026-11-08): upgrades (klaar) -> multiplayer (klaar) -> levels 2-15
(level 2 t/m 5 klaar; volgende: de meta-shop met Recognition en de promotie na L5, looks per pad
voor de overige torens, daarna levels 6-15).**

### Review torens en collega's (2026-11-13): besluiten van de maker

De review staat lokaal in `/home/mick/projecten/CTRL-ALT-DEFEND/docs/review/TORENS_EN_COLLEGAS.md`
(niet in git). Kern: niets schrappen, het gat zit in de uitleg. We werken het plan in 14 stappen af
(hoofdstuk 10), elke stap een versie. Besluiten (nummers uit hoofdstuk 11):

1. Old Guard: de regel blijft, het spel legt hem uit (briefing, icoon, zichtbaar ketsen, eerst
   alleen, hint als hij doorloopt).
2. Kaart nieuwe collega: de eerste keer pauzeren. Bij een replay mag het de flow niet breken: een
   schakelaar "tips aan/uit" bij opnieuw spelen, dezelfde schakelaar globaal in settings, plus een
   knop "tips resetten".
3. Introducties herschikken: L2 Headphones + Artillery, L3 Quick Reply + Self-Service, L4 Shredder +
   Thumbtacks. Balansronde L2-L5, nieuwe botscripts.
4. DIGITAL/PHYSICAL houden en zichtbaar maken (kleur, icoon, doorgestreept icoon op immune collega's).
5. Chatterbox: Noise Cancelling (tier 2) beschermt ook de torens binnen bereik van die Headphones.
   Kring tekenen.
6. Artillery houdt zicht (ik, volgt uit v0.18). Tekst eerlijk, gedekt pad met percentage.
7. Stop-halvering weg voor gewone collega's; bosses houden hun weerstand.
8. Brown Noise repareren (ik): onthuld tot de volgende puls.
9. Self-Service: eigen werkwoord, vertragen ("Please hold"), weinig schade.
10. The Phone Caller heet voortaan **The Speakerphone Caller**, ander uiterlijk. Eis maker:
    collega's blijven mensen, torens blijven voorwerpen.
11. `zoneProof` weg (ik): is de doos stuk, dan mag de Shredder.
12. Quick Reply wordt de zwerm-toren: opbouw weg, KEEP TYPING krijgt een ander effect.
13. Eerst tier-stippen uit de code, daarna voorwerpjes per pad (ik).
14. Reply All: grotere straal, minder schade per mail.

Voortgang: stap 1 teksten (0.31.1), stap 2 kaart + tips (0.32.0), stap 3 briefing (0.33.0). Volgende:
stap 4 "zeggen wat niet werkt" (iconen boven collega's, idle-reden per toren in de snapshot, zes
stil-iconen, kring van de Chatterbox). Let op bij stap 8: de counters-test in `tests/explain.test.ts`
eist dat elke collega een counter in de winkel heeft waar hij voor het eerst komt.
Uicheck: `SETUP` zet `tipsSeen` en `briefingsHidden` vol, zodat kaarten en briefings geen flow
ophouden; `level2Flow` test de wachtende kaart, `briefingFlow` (`--brief-only`) de briefings.

### Level 15 Boardroom III (v0.31.0)
- Kaart = L10 plus een achterdeur rechts (pad 2 voegt aan de rechterkant in, `splitPaths`) en een
  champagnebar; jaloezieën elke 20 s (`every: 10`, 10 s dicht). 22 golven van de Boardroom.
- **Your Line Manager, 360** (id `finalreview`, de golf-notatie kent alleen letters): Line
  Manager-mechaniek plus `reviewers`: bij 66% komt de Head of Comms terug, bij 33% de Presenter, met
  20% van hun HP (event `reviewer`, toast).
- **OPEN, voor de maker:** (1) het ontwerp noemt "een eigen mini-game voor de laatste boss" zonder
  invulling; het hazard-systeem kent per level één hazard (hier de jaloezieën), dus nog niet
  gebouwd. (2) Balans: met 1100 HP + 240 schild en reviewers op 35% verloor goed spelen; rond
  660-720 HP valt het om. Nu 600 + 150 en 20%: goed spelen 82/75 Focus en 2 sterren, eerst koffie
  40 (seeds 1 en 2). Daarmee is de eindbaas lichter dan de Line Manager van L5 (720 + 180), maar
  hij neemt twee reviewers mee.

### Level 14 Release Night (v0.30.0)
- Kaart uit het ontwerp, bureau op (20, 10) (stoel). Licht `*`: in het donker `DARK_RANGE` 0,6 van
  het bereik (niet voor `global`), `isLit` (ook binnen de lichtcirkel van een gepakte pizza),
  notitie in het paneel, gele lichtplekken, donkere vloer.
- Pizza (hazard `pizza`, eerst 40 s, elke 40 s, 8 s): een pizza op een vrije tegel binnen 2 van het
  pad; klik hem (opdracht `pizza`, `takePizza`): 5 + resterende seconden Coffee en 20 s licht in
  straal 1,5. In de snapshot (`hz.pz`, `hz.pl`). Bots pakken hem na 2 s.
- **The Project Manager** (nieuwe boss, bijbel): hoe langer hij op de vloer is, hoe sneller
  iedereen loopt: +2,5% per seconde tot x1,8 (`rush`).
- Bots tellen voor plekken nu het effectieve bereik in het donker (`rankSpots`), anders bouwden ze
  in het donker. Eerdere levels ongewijzigd.
- Nieuwe modellen: `projectmanager` (+ icoon), `lamp_desk`, `pizza_boxes`, `pizza`.
- Balans (seeds 1 en 2): op 70% van de Hot Desks-aantallen wint goed spelen met 97 Focus en 3
  sterren, eerst koffie met 89 en 2. Op 100%: 65 en 2 sterren voor allebei.

### Level 13 Server Room (v0.29.0)
- Kaart uit het ontwerp (34x9), bureau op (32, 4) (stoel). `k` koud: `COLD_RATE` 0,5 (herlaad x2)
  via `isCold` in `liveStats`, notitie in het paneel, wit-blauwe vloer. `~` kabels: bouwbaar,
  getekend door `World`. `closedZone` (rect): `pickTargets` laat torens binnen alleen binnen
  richten en buiten alleen buiten, behalve `global` (Artillery, Pomodoro). Alleen voor richtende
  torens; puls/zone/punaises houden zich niet aan de zone (mijn keuze, de muren doen het meeste).
- Oververhitting (hazard `overheat`, eerst 45 s, elke 45 s, 12 s): niet koud, maar 3 rookwolken
  op het pad in de ruimte (zoals L7).
- Boss: Cleaner x1,9 (bijbel). Bots: `seenCoverage` kent de gesloten zone.
- Modellen `server_rack` (los deel `RackLights`, knippert; flikkert bij oververhitting),
  `server_cart`, `cable_reel`, `floor_cables`, `noc_wall`.
- **OPEN, balans L13 (de zwaarste):** op de Hot Desks-golven verloor iedereen, ook op 55%. Met de
  helft van de Old Guards wint goed spelen met 19 Focus en 1 ster, eerst koffie met 10 (seeds 1 en
  2). Boss-HP (x1,0 tot x1,9) maakte geen verschil. Test eist alleen winnen. Opties: kou minder
  streng (bijv. 30%), of bouwplekken in de gang/NOC die de ruimte wel in mogen.

### Level 12 HR Room (v0.28.0)
- Kaart uit het ontwerp, muren uit het raster als `walls`. Bureau (14, 8) aan de gesprekstafel.
- Doorkijkspiegel `m`: in `lineOfSight` doorzichtig als je naar het oosten kijkt, een muur naar
  het westen. Collega-effecten op torens (Chatterbox, huilende Baby, Line Manager-rem, taunt) eisen
  op zo'n kaart dat de collega de toren ziet (`seenBy`). Let op: vanuit de observatiekamer reikt
  alleen lang bereik tot het pad (Artillery, Pomodoro), een Auto-Reply niet.
- Formulier (hazard `form`, eerst 50 s, elke 50 s, 12 s): mini-game `src/ui/form.ts` (drie
  pagina's, vinkje, tekenen); zolang hij openstaat kun je niet upgraden (`canUpgrade`). Bots
  vullen hem in na 5 s.
- **The HR Manager** (nieuwe boss, bijbel): elke 9 s (6 s in fase 3) wordt de torensoort waar je
  het meeste Coffee in stak 5 s geaudit (`quiet = 'audit'`, sil 5, event `audit`, toast).
- Nieuwe modellen: `hrmanager` (+ icoon), `filing_cabinet`, `safe`, `complaint_box`,
  `one_way_mirror`.
- **OPEN, balans L12:** op de Hot Desks-golven winnen goed spelen en eerst koffie met 59 Focus en 2
  sterren (seeds 1 en 2); de HR Manager en twee Old Guards komen door. Lichtere golven
  veranderden het niet (de bots leunen op Auto-Replies, precies wat zij audit).

### Level 11 The Merger (v0.27.0)
- Volgorde gewisseld met HR Room (ontwerp): `LEVEL_NAMES` aangepast.
- Bedrijfscultuur: `ONLY` kent nu ook damage-klassen (`a` -> digital, `p` -> physical). Torens
  zonder klasse (Coffee Machine, Headphones, Poster) mogen op beide helften (mijn keuze). De
  startup krijgt een betonvloer, de soeprij-strepen gelden alleen nog voor `n`.
- Verhuisdozen `x`: blokkeren bouwen en zicht; `clearBoxes` (opdracht `clear`, `BOX_COST` 40)
  maakt er vrije vloer van voor elke toren; in de snapshot (`cl`). Klik op dozen in het spel.
  Model `moving_boxes` per tegel in `World`.
- **The Consultant** (nieuwe boss, bijbel koppelt hem aan de fusie): zolang hij op de vloer is
  krijgen anderen 70% schade (fase 3: 50%) en lopen ze x1,15. Valt hij: iedereen naar 50% HP en
  1,5 s stil (`collapse` in `damage()`, event `collapse`). Model + icoon `consultant`.
- Bot: stap `{ clear: true }` bestaat (doos met het meeste pad), maar maakte L11 slechter: niet
  in het script. De meting is dus zonder dozen (het slechtste geval).
- **OPEN, balans L11:** twee korte banen zoals L9, en per bedrijf de helft van je torens. Met de
  Hot Desks-golven verloor goed spelen; nu de helft van de Old Guards en x0,85: goed spelen en
  eerst koffie 51 Focus, 2 sterren (seeds 1 en 2). Test eist winnen met >= 2 sterren.
- Nieuwe modellen: `pingpong_table`, `beanbag`, `neon_sign`, `moving_boxes`.

### Level 10 Boardroom II (v0.26.0)
- Kaart = L5 (pad, bureau op (10, 10)) plus de glazen kamer `B` met deur onderaan, kunstwerk
  (`sculpture`) en bar rechts. `B`: doorzichtig, maar tijdens hazard `blinds` (eerst 30 s, dan elke
  20 s na het opgaan, 10 s dicht = om de 30 s, 2 s waarschuwing met geluid `blinds`) blokkeert het
  zicht (`blindsDown`, `isBlinds`, in `lineOfSight`). Model `glass_blinds` met los deel
  `BlindSlats` dat de render laat zakken (deels tijdens de waarschuwing).
- Boss: Line Manager x1,4 (bijbel).
- **Fout gevonden en opgelost:** `pickTargets` keek alleen naar zicht als er muren waren; op een
  kaart met alleen jaloezieën schoten torens erdoorheen. En de Poster mocht niet ver van het pad
  staan (de "too far"-regel gold voor alles behalve koffie); nu ook niet voor `support`. Tests.
- **OPEN, balans L10 (voor de maker):** de glazen wand staat pal langs het pad, dus binnen bouw je
  altijd 2 tegels van het pad, en om de 30 s staan binnen en buiten los. Gemeten (seeds 1 en 2):
  met 15 medior-golven verloor goed spelen (ook met L8-golven en met L5-golven gespreid over 15);
  met de 22 golven van L5 won goed spelen met 49/83. Nu: de 22 L5-golven x0,85 (boss niet):
  goed spelen 70 Focus/2 sterren en 100/3; eerst koffie 100/3. Test eist winnen met >= 2 sterren.
  Daarmee heeft L10 22 golven (medior is verder 15). Optie: de glazen kamer een tegel naar binnen.

### Level 9 Town Hall (v0.25.0)
- Kaart uit het ontwerp, twee ingangen (`level.splitPaths`: binnen een golf om en om, zodat beide
  banen tegelijk druk zijn; mijn keuze). Bureau op (10, 11) i.p.v. tegen het scherm (stoel). De
  `n`-tegels (middenpad, podium) zijn `-` geworden: de Thumbtacks-regel is van de Canteen.
- Tribune `^`: +25% bereik (`RAISED_RANGE`, `isRaised`). Treden zijn decor met `raise: 0.18`: een
  toren staat er met zijn kastje op (`raiseAt` in world.ts, `lift` in Actors).
- Brandalarm (hazard `firealarm`): iedereen 2 s stil, dan 6 s x1,4 (via `lunchHaste`).
- **Motivational Poster** (rol `support`, L9, mijn ontwerp): basis bereik 2,5, torens erin vuren
  10% sneller (`buffRate` 0,9, via de bestaande Headphones-buff). Paden: HANG IN THERE (sneller; T3
  zien verborgen; T4 x0,6 herlaad en +20% schade), FRAMED PRINT (+10/+20%; T3 door schilden en +1;
  T4 +45%), LED WALL (groter; T2 hun bereik +10%; T3 upgrades 15% goedkoper; T4 +20% bereik, 25%
  korting). `posterAura(t)` in game.ts, beste poster per soort telt. Modellen `poster_1-3` + iconen.
- Nieuwe modellen: `tribune_step`, `auditorium_seats`, `control_desk`, `tv_camera`, `stage_screen`
  (laag gehouden: een hoog scherm onderaan verborg het podium). Geluid `alarm`.
- Bots: nieuwe plek-soorten `support` (Poster waar de meeste geïnvesteerde torens binnen bereik
  staan) en `view` (tegel met het meeste zichtbare pad op vol bereik).
- **OPEN, balans L9 (voor de maker):** twee korte banen van ~20 tegels die pas vlak voor je bureau
  samenkomen. Goed spelen wint met 51 Focus en 2 sterren (Repair Guy, twee Board Members, een Old
  Guard komen door); eerst koffie wint met 9-17 Focus. Geen golf- of bossinstelling maakte goed
  spelen foutloos (boss x0,7 tot x1,8 en golven x0,65 tot x1 gemeten; de Repair Guy komt steeds
  door: de banen zijn te kort). Test eist nu winnen met >= 2 sterren. Opties: langere banen (bijv.
  om de tribunes heen), of het samenkomstpunt hoger in de zaal.

### Level 8 Hot Desks (v0.24.0), keuzes maker met knoppen
- **Pomodoro Timer** (rol `mortar`, PHYSICAL, L8): richt op een tegel, hele vloer, **geen zicht
  nodig** (keuze maker). Elke 3 s een tomaat, landt na `MORTAR_FLIGHT` (0,7 s) op iedereen binnen
  `aoe` (1 tegel) van de tegel. Standaard gericht op het dichtstbijzijnde looppad. Paden (mijn
  ontwerp): FOCUS SPRINT (sneller; T3 twee tomaten `doubleShot`; T4 nog sneller +5), DEEP WORK
  (harder; T2 door schilden; T3 brandende plek `crater` 3 s 5/s; T4 x2,5 en 5 s 9/s), BREAK TIME
  (wijder; T2 stilzetten 0,4 s; T3 terugduwen 1 tegel; T4 wekker 1,2 s stil, 1,6 terug, wijder).
  Opdracht `aim`, knop "Pick a tile" in het paneel, rode richtcirkel. Snapshot: `ax/ay`, `craters`.
- **Flexbureaus** `b`: alleen daar bouwen. Op elke `b`-tegel staat een leeg `flex_desk`-model dat
  verdwijnt als er een toren staat (een toren staat dus nooit op een tafel). `level.reserve` = 3
  lege bureaus per golf gereserveerd (seeded, event `reserved`, rood bordje en rode tint, in de
  snapshot `hz.rs`).
- **Telefoon** (keuze maker: klik + mini-game): hazard `phone` (eerst 50 s, elke 45 s, 6 s
  overgaan). Gaat over op een bureau met een toren. Schuift in beeld (`src/ui/phone.ts`): rood
  ophangen = 5 + resterende seconden Coffee; groen opnemen of laten liggen = dat bureau 15 s
  "stuck on the phone" (toren `quiet = 'phone'`, sil 4, niet bouwen). Opdracht `phone {hang}`.
  Bots hangen na 2 s op.
- Boss: Head of Comms met `level.bossHpMult` 1,8.
- Nieuwe modellen: `pomodoro_1-3` (+ iconen), `tomato_shell`, `flex_desk`, `lockers`, `phone_booth`,
  `desk_phone`, `reserved_sign`. Geluiden `phone`, `tick`, `splat`.
- Bureau op (18, 10) in plaats van tegen de rand (stoel).
- Balans (seeds 1 en 2): goed spelen 92 Focus, 3 sterren; eerst koffie 88, 2 sterren; beginner,
  spam, idle verliezen. Nieuw script (punaises vroeg, Pomodoro als tweede zwaargewicht). Tests in
  balance.test.ts zoals L7.

### Level 7 The Car Park (v0.23.0)
- Kaart uit het ontwerp (26x17, auto 2x3). Bureau op (24, 13) in plaats van tegen de rand (stoel),
  naast de liften. Alleen bouwen in een leeg vak `P` (9 vakken, 54 tegels); witte vaklijnen in
  `World` (randen van `P`-tegels). **Auto's blokkeren zicht** (regel maker: alle meubels/spullen),
  anders dan het ontwerp. Thumbtacks en Shredder reiken alleen vanuit de onderste rij vakken.
- Nieuwe modellen `car_long_blue/red/white`, `van_long`, `stairwell`, `garage_lift`.
- Melding op kale vloer (`-`): "Not on this bit of floor. Look for the green tiles." in plaats van
  "Something is already standing there." (`bare` in game.ts, test).
- Balans: op de nieuwe kaart verloor iedereen (goed spelen golf 15, oude kaart 95 Focus).
  Gemeten: ook met doorzichtige auto's verloor goed spelen 52 Focus: de vakken liggen 2 tegels van
  het pad. Twee ingrepen: (1) L7-botscript draait om Office Artillery in de vakken met het meeste
  uitzicht, plus een tweede Auto-Reply voor de Board Members (alleen DIGITAL); (2) alle aantallen
  in de golven x0,85 (boss blijft). Resultaat (seeds 1 en 2): goed spelen 92 Focus, 3 sterren; eerst
  koffie 92, 3 sterren; beginner, spam, idle verliezen.

### Level 6 Work From Home (v0.22.0)
- Kaart uit het ontwerp: vier kamers, muren uit het raster als `walls` (een losse muurtegel kan
  verticaal met `along: 'y'`). Bureau (11, 3) in het thuiskantoor, collega's komen van boven, de
  stoel staat erachter op (11, 4) (in het ontwerp stond daar een meubel). Geen router-model en
  geen kat meer (geen plek in het raster).
- Slechte wifi `f`: `BAD_WIFI` = 0,6, `game.slowWifi(t)` deelt de herlaadtijd in `liveStats` (alleen
  DIGITAL), notitie `wifiNote` in het torenpaneel, de slaapkamervloer heeft een blauwgrijze tint.
- Nieuwe modellen: `nightstand`, `wardrobe`, `laundry_basket`, `armchair`, `coffee_table`,
  `file_boxes`.
- Balans L6 (oude kaart -> nieuwe): goed spelen 92 -> 100 Focus, 3 sterren, verste 90%. Eerst
  koffie 40 -> 34 Focus, 1 ster (wint; test eist alleen winnen). Beginner, spam en idle verliezen.
- Live-uicheck van 0.21.0 gaf een keer "claim all button missing at 1024x700" (lokaal niet);
  opnieuw gedraaid: 0 UI problem(s), 0 browser error(s). Een hapering.

### Level 5 Boardroom (v0.21.0)
- Kaart uit het ontwerp (basis voor L10 en L15). Afwijking: het bureau staat op (10, 10) in plaats
  van tegen de onderrand, anders past je stoel er niet achter (regel maker). Nieuwe modellen
  `floor_lamp` (hoog, in de binnenhoeken van de lus) en `trophy_cabinet`; de wandkast rechtsboven
  staat met de boeken naar de camera.
- **Botfix:** `rankSpots(g, range, sighted)`: alleen torens die richten tellen gezien pad; zones,
  pulsen, punaises en de stoel tellen gewoon bereik. Daardoor kwam de stoel weer op zijn baan.
- Botscripts: L5 neemt een tweede Coffee Machine na de Artillery en Artillery eerder naar tier 4
  (die houdt de Line Manager tegen); L2 zet de Headphones bij het bureau.
- Balans (seeds 1 en 2, oude kaart -> nieuwe): L5 goed spelen 97 -> 100 Focus, 3 sterren, verste
  88%; eerst koffie 92 (3 sterren) -> 85 (2 sterren). L2 goed spelen blijft foutloos (marge 1,4
  tegel). L6 eerst koffie 48 -> 40 (1 ster, wint). Rest gelijk.

### Level 4 Canteen (v0.20.0)
- Kaart uit het ontwerp; pad gelijk aan het oude L4. Nieuwe modellen `canteen_long` (tafelstuk met
  banken), `salad_bar` (hoog, glazen kap), `serving_counter` (warmhoudlampen, geen achterwand: die
  stond als muur naar de camera).
- Soeprij `n`: `ONLY` in `grid.ts` (letter -> toegestane torenrol), `game.tileAllows(def, x, y)` in
  `canPlace`, `isRestrictedTile`. Geen meubel, zicht vrij. Getekend als gele strepen
  (`stripes()` in world.ts). `World.showBuildGrid(defId)` bouwt het raster per toren (de rij is
  alleen groen voor Thumbtacks). uicheck: `l4-queue-grid.png`.
- Balans L4 gelijk aan de oude kaart: goed spelen en eerst koffie foutloos (verste 91%), beginner
  en spam verliezen (Impersonators), idle verliest in golf 7.

### Level 3 Presentation Room (v0.19.0)
- Kaart uit het ontwerp, maar **zonder laptopregel** (keuze maker): de `L`-tegels zijn tafels met
  een laptop (`conference_table`), je bouwt op de vloer. Pad 61,5 tegels (oude Meeting Room 41,5).
  Bureau = lessenaar op (16, 2), collega's komen van onderen; je laptop staat ernaast.
- Nieuwe modellen: `beamer` (losse delen `BeamerLamp` en `BeamerBeam`), `speaker`, `whiteboard`,
  `conference_table`, `conference_chair`, `chair_stack`. `projector_screen` heeft nu losse delen
  `ScreenSlide` en `ScreenNoSignal` (tekst via `_text()` in build_models.py).
- Aankondiging projector: `HAZARD_WARN` = 3 s, `game.hazardWarning`, event `hazardWarn` (geluid
  `projector.wav`, toast `projWarn`), `hazardNext` zit in de snapshot (`hz.next`) zodat een kopie
  online ook waarschuwt. `World.updateBeamer`: lamp rood knipperend, bundel flikkert, NO SIGNAL;
  tijdens de mini-game geen bundel. uicheck: `l3-warning.png`.
- DIGITAL/PHYSICAL: `DamageClass = 'digital' | 'physical'` (was written/in_person), teksten van The
  Board Member en The Cold Caller mee. Label in de winkel (laptop of hand rechtsboven) en voluit in
  het torenpaneel (`classTag` in hud.ts). Test: elke toren de juiste soort (content.test.ts).
- **Botfout opgelost:** wilde de bot bouwen terwijl de projector kapot was, dan sloeg hij die stap
  over (L3: nooit Coffee Machine of Artillery). Nu wacht hij (`hazardBlocks` in `runScript`).
- Balans L3 (seeds 1 en 2): goed spelen foutloos, 3 sterren, nieuw script (Artillery vroeg op de
  plek met het meeste uitzicht, Quick Replies bij het bureau). **De Presenter komt tot 2,3 tegels**
  van je bureau (oude kaart 7,9); test nu > 2. Eerst koffie 98 Focus, 3 sterren (was 80, 2).
  Beginner en spam verliezen. Andere levels gelijk.

### Zicht (v0.18.0, besluit maker 2026-11-12)
- Alle meubels blokkeren zicht, hoog of laag (`grid.ts` SIGHT: `# H R t w x`; zonder raster: elke
  `decor`-rect). Glas (`g`) niet. Meubels op het looppad (poortjes) nooit. Alles zit in `walls`
  van `Game`, dus de stoel stopt nu ook tegen meubels.
- `needsSight(def)`: wat op iemand richt heeft zicht nodig (role `damage` en `smash`: Auto-Reply,
  Artillery (keuze maker: ook Artillery), Quick Reply, Self-Service, Reply All, Delegation,
  Keyboard Smash). Wat in een zone werkt niet: Headphones, Shredder, Thumbtacks, stoel.
- Rood zoals Bloons: `Actors.showBlind` tekent vakjes van 1/4 tegel binnen het bereik die de toren
  niet ziet (Artillery: de hele vloer), bij plaatsen en bij een geselecteerde toren. uicheck:
  `l2-blind-spots.png`.
- Bots: `rankSpots` telt altijd alleen gezien looppad; `spotFor('far')` zoekt de plek met het
  meeste uitzicht (eerst > 2,5 tegel van het pad, anders overal). Dat laatste maakte Artillery in
  L2 weer bruikbaar.
- Balans (seeds 1 en 2, voor -> na): L1 goed spelen foutloos, verste 72% -> 62%. **L2 goed spelen
  foutloos, maar de Chatterbox komt tot 1,5 tegel van je bureau (verste 75% -> 96%)**: de krukken
  langs de bar verbergen het eerste stuk, de verdediging zit laat in de route, en de Chatterbox
  legt die torens stil. L2-test meet nu in tegels (> 1); eerst koffie 100 -> 96. L3, L4, L5, L7
  gelijk; L6 eerst koffie 43 -> 48 (1 ster, was al zo). Bij het L2-botscript staat Artillery nu
  vroeger (na de Coffee Machine). Als de maker L2 te krap vindt: krukken weg bij de bar.

### Nieuw leveldesign (v0.17.0, besluit maker 2026-11-12)
De maker heeft met een andere sessie alle 15 levels opnieuw ontworpen:
`/home/mick/projecten/CTRL-ALT-DEFEND/docs/leveldesign/` (`LEVELDESIGN.md`, `levels.json`,
`levelNN.svg/.txt`; alleen lokaal). **Daaruit bouwen, level voor level; de maker reviewt eerst
L1 en L2, daarna de rest.** Art-stijl blijft, alleen de inrichting is nieuw.
- Tegelraster: `LevelDef.grid` (letters, zie `src/sim/grid.ts`). Met een raster beslist alleen het
  raster over bouwen (`.` en de speciale bouwletters) en zicht (`#`, `H`, `R`); `decor` is dan
  alleen nog wat je ziet. `tests/grid.test.ts` controleert dat het looppad in het raster precies
  het pad van de waypoints is, en dat meubels niet op bouwtegels staan (behalve werkbladen).
- Poortje (`G`): collega's staan `GATE_HOLD` (0,4 s) stil (`gates` in `game.ts`, event `gate`,
  piepje `gate.wav`). Het model `speed_gate` heeft een los deel `GateFlap` dat de render laat
  openzwaaien (`World.update`), de draairichting wordt berekend uit de looprichting.
- Werkbladen (`o`): decor met `surface` (hoogte van het blad). Torens staan erop zonder hun kastje:
  `side_desk` in de Blender-scripts is getagd, `kit.join` maakt er een los kind `<naam>_Desk` van,
  en de render verbergt dat (`Actors.standOn`). Aanwijzen met de muis gebeurt op de hoogte van het
  blad (`View.groundAt(px, py, height)`), anders klik je op de tegel erachter.
- Glazen gevel: `look.glassFront` laat de muur langs x = 0 weg; `glass_front` en `glass_doors`
  zijn decor.
- **Review L1 door de maker (v0.17.1), en dus afwijkend van het ontwerp:** een poortje waar je
  omheen kunt lopen is niet logisch. Nu loopt een lage glazen wand (`glass_partition`, echt
  doorzichtig: `mat(..., alpha=)` in `kit.py`) over de hele hoogte op x = 13, met de logowand en
  de poortjes erin; de enige weg is door het poortje (test). Iedereen loopt eerst langs de
  receptiebalie (4 lang, receptioniste erachter, postvakken tegen de muur), dan door de poortjes
  naar de kantoorkant met jouw bureau, bureaus, printer en de liften. De garderobe midden in de
  kamer is een ronde kapstok bij de deur geworden.
- Jouw bureau (besluit maker, v0.17.2): overal looppad, bureau, stoel in een lijn; collega's
  komen altijd recht op de voorkant af. `chairTile(level)` in `game.ts` is de tegel achter het
  bureau (in de looprichting), daar mag je niet bouwen; `deskTurn(level)` draait het model.
  Geen uitzondering meer aan de rand: dan gaat het bureau een tegel naar binnen (L2, L3, L5 in
  v0.17.2). Test voor alle levels in `tests/grid.test.ts`. Gevolg: L3 goed spelen 7,9 tegels marge
  (was 8,9; de L3-test meet nu in tegels, > 5), L5 goed spelen 97 Focus (was 99), eerst koffie 92
  (was 100), allebei 3 sterren. L2 goed spelen 9,2 tegels marge.
- **Review L2 door de maker (v0.17.2), keuze met knoppen:** alleen op de vloer bouwen, de
  keuken krap ingericht. Werkbladen zijn weer gewone meubels (geen `surface` meer in L2; de code
  voor werkbladen blijft voor latere levels: laptopplekken L3, flexbureaus L8). 65 bouwtegels
  (ontwerp: 33 op werkbladen, L1 heeft 135); de maker koos "~45-55", ik kwam op 65 zonder de
  keuken vol te proppen, en de balans bleef goed. Extra meubels: bank + picknicktafel links,
  statafels met krukken in de bovenste lus, waterkoeler en prullenbakken bij je bureau, twee
  natte-vloerbordjes bij de koffiemachines, de bar loopt tot de hoek. Nieuwe test: elke tegel
  `t`/`H`/`R`/`w` in een raster heeft echt een meubel (anders zie je vloer waar je niet mag bouwen).
- Bouwraster (keuze maker: overal): bij het plaatsen zijn bouwtegels groen (op bladhoogte als er
  een werkblad is) en kale vloer waar je niet mag bouwen (`-`, of buiten je vak in multiplayer)
  donkerder. `World.buildGrid` is nu een groep met twee InstancedMeshes. uicheck maakt
  `l2-build-grid.png`.
- Balans L2 na de nieuwe keuken (bots, seeds 1 en 2): goed spelen foutloos, verste collega 73%
  (was 68%); eerst koffie 100 Focus en 3 sterren (was 96); beginner en spam verliezen nog op de
  Old Guard; idle verliest op golf 7.
- Paden eindigen op x.0 van je bureau (zoals altijd), niet in het midden van de tegel.
- Balans L1 (33,5 tegels, oude kaart 30,5): goed spelen foutloos, The Head of Comms blijft 9,5 tegels
  van je bureau (oude kaart: 17). Beginner 77 Focus (oud 73), alleen Auto-Replies 79 (oud 80). De
  test meet de marge in tegels (> 5). Golven en boss ongewijzigd. L2: goed spelen 12 tegels marge
  (was 10,2), beginner en spam verliezen.
- Nog niet gedaan uit het ontwerp: het hernoemen naar DIGITAL/PHYSICAL (`damageClass`) met een
  label in het torenmenu. Dat komt bij level 3 (laptopplekken), waar het voor het eerst telt.

### Level 7 (v0.16.0): ontwerpkeuzes die ik maakte
- Uitlaatgassen (`type: 'smoke'`): elke 45 s twee wolken (straal 2,4) op willekeurige plekken
  naast het pad, 14 s lang. Torens erin krijgen `rangeMult` 0,55 via `rangeFactor(t)` in
  `liveStats`; Artillery (globaal) negeert het. Wolken zitten in de snapshot (`smoke`).
- Delegation: ketting (`bounce`) met `bounceMult` (elke sprong x1,4, later x1,6 en x2) en
  `bounceRange`. Auto-Reply houdt `bounceMult` 1. Economie-test telt een ketting als de som van
  de sprongen in een groep van vijf (`chain`).
- The Phone Caller: `taunt` (zoals de Baby) plus `pointResist` 0,5: pure single-target-torens
  (1 doel, geen aoe/splash/bounce) doen hem half. Dwingt een groepstoren af.
- The Smoking Colleague: aura (straal 3,2, bereik x0,6) en elke 6 s een wolk achter zich; hulpjes
  zijn Chatterboxes.
- Balans (bots, seeds 1 en 2): goed spelen wint met 3 sterren en 95/100 Focus, eerst koffie wint
  met 96, alleen Auto-Replies verliest in golf 9.
- uicheck meet nu ook tekst die verticaal uit zijn vak loopt (vond de rook-notitie die over
  UPGRADES heen liep; `.status` krimpt niet meer).

### Level 6 (v0.15.0): ontwerpkeuzes die ik maakte
- Zichtmuren: `level.walls` (tegels). Blokkeren bouwen en zicht (`lineOfSight`, monsters om de
  0,2 tegel); alleen niet-globale schietende torens hebben zicht nodig (Artillery lobt erover),
  pulsen/zones/punaises niet. De stoel stopt bij een muur. Bots tellen met muren alleen zichtbaar
  looppad (`seenCoverage`).
- No Internet (`type: 'nointernet'`): WRITTEN-torens van spelers die nog niet opgelost hebben zijn
  stil (`quiet = 'net'`). De dino-minigame (`src/ui/dino.ts`) vult in ~6 s schoon rennen;
  `hazardOpenFor(player)` toont de juiste minigame. **Bots lossen deze na 8 s op** (een echte speler
  doet dat ook); de projector laten ze liggen (zwaarste geval).
- Waarom een toren stil is: `tower.quiet` = chat / cry / net, in de snapshot als `sil` 1/2/3.
- Reply All: `aoe` (iedereen binnen de straal van het doelwit). Economie-test telt aoe als het
  verwachte aantal geraakten in een groep met 0,8 tegel tussenruimte. Het cirkel-pad staat op
  plek 3 (nut), zoals bij andere torens.
- The Baby: `taunt` (torens binnen 3 richten eerst op hem) en `cry` (elke 11 s 2,5 s stil binnen
  2,8; Noise Cancelling hoort het niet). Geen hulpjes (`addCount: 0`).
- Medior-curve: 15 golven, start ~110 HP-eq, ~15% per golf. Goed spelen: 92 Focus en 3 sterren
  (één Old Guard glipt door tijdens de Baby-golf: zijn mechaniek). Eerst koffie wint met 1 ster.

### Geluid (v0.14.0, wens van de maker)
- Kantoorgeluiden opnieuw gemaakt met de sfx-MCP (zie `art/SOUND.md`).
- Typen op de achtergrond: `Sfx.setTyping(on, stress)`, stress = 1 - Focus/start-Focus. Gemeten in
  een echte browser: 2 aanslagen/s bij volle Focus, 12 bij 10 Focus, 0 bij pauze. Eigen schuif
  (`settings.ambience`). Uit in menu's, demo, pauze en op het eindscherm.

### Meta-shop (v0.13.0)
- `src/meta/perks.ts`: de vier perks uit de bijbel. Ze tellen alleen in je eigen spel (niet online,
  niet in de menu-demo): `perkOptions(save)` geeft `extraCoffee`, `extraFocus`, `costMult`.
- Smoke Break is een verbruiksitem (`save.smokes`), te gebruiken via de knop in de bovenbalk;
  `game.takeBreak()` geeft Focus terug tot de start-Focus.
- Promotie: `completeLevel` geeft `promoted` ('Medior', 'Senior', 'Specialist') de eerste keer dat
  je level 5, 10 of 15 haalt; het eindscherm toont het.

### Level 5 (v0.12.0): ontwerpkeuzes die ik maakte
- Specials: `special: true` op TowerDef, maximaal één per speler (`canPlace`). Ze hebben wel drie
  paden, zoals de rest.
- Keyboard Smash (`role: 'smash'`): slag rond de eerste collega in bereik, daarna een `Barrier` op
  0,6 tegel vóór die collega. Collega's stoppen 0,3 ervoor en trappen hem kapot met hun Focus-waarde
  per seconde (bosses 25). Eén toetsenbord per toren; het blokkeert iedereen (ook de Board Member).
- Bureaustoel (`role: 'chair'`, idee van de maker): richting 0-3 (+x, +y, -x, -y), standaard de
  baan die het meeste looppad kruist; daarna kiest de speler met de pijlen (`dir`-opdracht). Hij
  rijdt alleen als er iemand in de baan staat. Elke klap kost hem zoveel HP als hij schade doet.
  Langs het looppad gericht raakt hij veel meer dan dwars erover: dat is de slimme plaatsing.
- Your Line Manager: `addsFromPhase` (peer reviewers pas vanaf fase 2) en `towerSlow` (fase 3:
  torens binnen 3,2 herladen 1,4x trager). Getuned van 950+250 naar 720+180; goed spelen haalt
  99-100 Focus (soms glipt één Chaser van een peer reviewer door). De balanstest eist >= 95 en 3
  sterren.
- Bot-les: zet een dure upgrade niet midden in een script, de bot spaart er dan voor en koopt
  niets anders (`SCRIPTS[5]`).
- Fout gevonden: de geluiden van v0.6.0 waren nooit aangesloten. `tests/assets.test.ts` eist nu dat
  elk `.wav` in `SOUNDS` staat.

### Level 4 (v0.6.0): ontwerpkeuzes die ik maakte
- Nieuwe torenrol `trap` (Thumbtacks): legt hoopjes (`game.piles`) op het looppad binnen bereik.
  Elk hoopje heeft `pierce` punaises; elke punaise raakt een collega, elke collega hooguit een keer
  per hoopje. Hoopjes negeren zicht (raken de Impersonator), niet de Board Member (in_person).
  Max 24 hoopjes per toren, de oudste verdwijnt. Targeting kiest welk derde van het looppad in
  bereik (bij je bureau, bij de deur, dichtbij, ver weg) of overal; daarbinnen willekeurig (seeded,
  dus deterministisch en gelijk in multiplayer, want de server rekent).
- Self-Service is gewoon een `damage`-toren met `targets: 99` en een kleine straal. Herlaadtijd
  0,8 s: bij 1,0 s vuurde hij maar een keer per voorbijganger.
- De economie-test vergelijkt kopieen nu tegen dezelfde menigte (Self-Service-kopieen raken ook
  vijf), en heeft een eigen regel voor punaises (schade per seconde als elke punaise raak is).
- The Cleaner: `haste` (collega's binnen 1,8 lopen x1,4) en `sweep` (hoopjes binnen 1,4 weg,
  Shredder-zones waar hij in loopt 6 s uit, met een natte-vloerbordje). Zijn eigen Chasers lopen
  voor hem uit en stappen soms nog op een hoopje; hij zelf nooit.
- Lunchpauze is een hazard zonder mini-game (`type: 'lunch'`): elke 70 s een stoet Interns en
  iedereen x1,3 sneller, 8 s lang. Niet tijdens de boss-golf, zodat de dag kan eindigen.
- Natte vloer is decor (`wet_floor`, blokkeert bouwen) op zes goede plekken in de spiraal.
- Geen Godot-golftabel om te vertalen (de oude Canteen gebruikte geschrapte collega's): gebouwd op
  de curve van L3, Impersonator vanaf golf 4, vloeiend 6-14% per golf.

### Level 3 (v0.5.0): ontwerpkeuzes die ik maakte
- Quick Reply: nieuw `ramp`-mechaniek. Elke treffer op hetzelfde doelwit +6% tot x2 (paden tillen
  dat op tot x5, `rampKeep` houdt een deel vast bij wisselen). Alleen het eerste doelwit bouwt op;
  extra doelwitten (Reply in Thread) krijgen basisschade. De economie-tests rekenen met de
  opbouw mee (een kale Quick Reply is tegen een zwerm bewust slecht).
- The Presenter roept zijn Chasers niet naast zich op maar op 82% van de route (`addsAt`), en zijn
  schild laadt bij elke fase opnieuw (`shieldRecharge`). Verste-collega-meting telt alleen echte
  collega's, geen opgeroepen hulpjes (anders meet je altijd ~82%).
- Hazards zijn generiek in de simulatie (`level.hazard`, `hazardOn/Until/Solved`, opdracht
  `solve`), zodat Boardroom III en latere mini-games hetzelfde pad gebruiken. Projector: eerst na
  45 s, daarna elke 40 s, 10 s venster, beloning 5 + resterende seconden. Blokkeert alleen bouwen,
  niet upgraden of verkopen. Online lost iedereen zijn eigen projector op; hij gaat uit als
  iedereen klaar is of de tijd op is. De UI volgt de state (`hazardBlocks(me)`), niet de events,
  zodat hij ook na een reconnect klopt.
- De bots lossen de projector nooit op: de balansmeting is dus het slechtste geval.

### Level 2 (v0.4.0): ontwerpkeuzes die ik maakte
- Nieuwe torensoorten in de simulatie: `pulse` (Headphones: elke paar seconden iedereen in de straal)
  en `zone` (Shredder: werkt doorlopend op wie erin staat, schade gedeeld tenzij `unshared`).
- Stuns: bosses hebben `stunResist`, herhaalde stuns landen korter (`stunFalloff`, herstelt na 5 s).
- De Chatterbox negeert vertraging en alleen stuns van Headphones werken. **Afwijking van de oude
  versie:** Headphones met NOISE CANCELLING tier 2+ zijn immuun voor zijn geklets. In Godot moest je
  ze net buiten zijn praatafstand zetten; dat bleek in de test onvindbaar en botste met de
  speeltestklacht "onduidelijk wat er gebeurt". Terugdraaien = `silenceProof` weghalen.
- The Repair Guy blokkeert alle inkomsten (kills, salaris, machines, rente, Supply Drop). Verkopen,
  pot claimen en Coffee geven werken wel: dat is geen inkomen.
- Niets raakt een collega die nog buiten de deur staat (`onFloor`): de Artillery schoot ze anders al
  achter de muur neer.
- Golftabel L2 opnieuw opgebouwd vanuit de vertaalde v0.88-tabel tot een vloeiende curve (4-12% per
  golf, piek vlak voor de boss); de oude zaagde van -46% naar +209%.
- Levels openen pas als het vorige level gehaald is (sterren > 0), zodat torens een voor een komen.
- Bots: de "goede speler" volgt per level een bouwvolgorde (`SCRIPTS` in `src/sim/bots.ts`).

### Hoe multiplayer werkt
- `server/mp/rooms.ts` (kamers, pure logica) + `server/mp/server.ts` (WebSockets op `/mp`). De server
  draait dezelfde `src/sim/Game`; browsers sturen `Command`s (`src/sim/commands.ts`, gedeeld met
  singleplayer) en krijgen 10x per seconde een `Snapshot` + events. De browser voedt daarmee een
  kopie van `Game` (`applySnapshot`) en stapt die nooit zelf; posities worden tussen snapshots
  gladgestreken.
- Spelersstoel = token in sessionStorage: na een haperende verbinding komt je browser vanzelf terug.
- Alleen de host: golf oproepen, snelheid, pauze, opgeven, terug naar lobby. Sterren en Recognition
  alleen in singleplayer; het rondeverslag naar de relay stuurt alleen de host.
- Origin-controle op de socket (`ALLOWED_ORIGINS`), max 8 KB per bericht, 30 berichten/s per
  verbinding, kamers opgeruimd na 2 min zonder spelers.
- Valkuil: de server wordt gebundeld met esbuild als **CommonJS** (`npm run build:mp`); als ESM
  crasht `ws` op "Dynamic require of events".
- In NPM moet "Websockets Support" aan staan voor game.makkers.net (staat aan sinds 2026-11-08).
- Standaard in een nieuwe lobby: ieder eigen geld, inkomen gedeeld (besluit maker 2026-11-08).
- **Open punt:** in een lange `uicheck --mp` ronde bleef de gast een keer hangen na Join (lobby
  verscheen niet). Daarna 7 keer niet meer te reproduceren, ook niet live. De test bewaart bij een
  fout nu screenshot + schermtekst van elke pagina (`mp-fail-*.png`): kijk daar eerst.
- Testvalkuil: met twee pagina's open krijgt de achterste pagina geen animatieframes; wachten in
  puppeteer moet dan met `polling: 250`, niet met de standaard (raf).
Multiplayer-besluiten: de server draait de simulatie (WebSocket-container), join-code + link, tot 8
spelers, de host kiest het aantal spelers, gedeeld geld of ieder eigen geld (inkomen gedeeld door het
aantal spelers, Coffee geven aan elkaar), en waar je bouwt: overal, of vakken (boven/onder,
links/rechts, 4 delen) waarbij de host spelers indeelt (bijv. 1, 2, 5, 6 onder). De simulatie heeft
portemonnees, eigenaar per toren, `gift()` en `buildAreas` al.

## Besluiten (van de maker, 2026-11-07)

| Onderwerp | Besluit |
|---|---|
| Engine | Three.js + TypeScript + Vite (geen Unity) |
| Art | isometrisch kantoor-diorama, orthografische camera, low-poly flat-shaded, rustig kantoorpalet, één felle kleur per collega |
| Feedback | eigen relay in dezelfde docker-compose; webhook alleen in `.env` op de server |
| Repo | publiek |
| Upgrades | 3 paden x 4 tiers, regel 4-2-0 (Bloons), tier 3 verandert gedrag, tier 4 paradepaardje |
| Hosting | Docker op de OVH-server, game.makkers.net |
| Modellen (2026-11-08) | elk pad krijgt op tier 3 en tier 4 een eigen model (zoals Bloons), toren voor toren over een paar releases |
| Bureaustoel (2026-11-08) | nieuwe toren op level 5 naast Keyboard Smash; de speler kiest na het plaatsen de richting (vier pijlen). Rijdt in een rechte lijn, raakt collega's en verliest zelf HP per treffer; bij 0 HP of na x tegels terug naar het begin. Upgrades: o.a. bereik en HP |
| Bijdragen (2026-11-08) | PR's van anderen (ook met AI) welkom volgens AGENTS.md en CONTRIBUTING.md; nieuwe PR's geven een melding in Mattermost (repo-secret `MATTERMOST_WEBHOOK_URL`) |
| Levels (2026-11-08) | een level moet eruitzien als zijn naam: eigen vloer (`look`) en inrichting; Coffee Corner is een klein vierkant keukentje |
| Licentie (2026-11-08) | CC BY-NC 4.0: iedereen mag het gebruiken, niet commercieel, met credits aan Malse-Makker |
| Eigen werk (2026-11-08) | direct op `main`, geen PR's; PR's zijn voor anderen |
| Oude repo (2026-11-08) | Malse-Makker/CTRL-ALT-DEFEND wordt gearchiveerd en privé; de ontwerpbijbel blijft lokaal |

## Werkwijze

- Overleg in het Nederlands, in-game tekst Engels, droog, geen em-dashes, alleen ASCII
  (`tests/content.test.ts` bewaakt dat).
- Commits als `malse-makker <games@makkers.net>`, sleutel `~/.ssh/makkersgames` (lokaal ingesteld).
- Na elke wijziging: `npm run check`, bij balanswerk `npm run balance`, bij UI-werk
  `npx tsx tools/uicheck.ts` en de screenshots echt bekijken.
- VERSION + CHANGELOG.md bijwerken, dan `tools/release.sh`.

## Balans (gemeten met tools/balance.ts, v0.2.0)

Level 1, totaal HP-equivalent 4234, golven stijgen vloeiend 10-20% per golf (geen zaagtand meer).

| Bot | Uitkomst |
|---|---|
| idle (één toren) | verliest op golf 11 |
| beginner (6 Auto-Replies, elk tier 1) | wint, 73 Focus, 2 sterren (boss lekt) |
| spam (alleen kale torens) | wint, 80 Focus, 2 sterren (boss lekt) |
| solid (4 torens naar 3-2-0, half op Most HP bij de boss) | foutloos, verste collega op 44% |
| greedy (koffie + Expense Claim, twee torens naar 4-2-0) | foutloos, meeste Coffee (736) |

Level 2: idle verliest op golf 7, alleen Auto-Replies (beginner, spam) verliest (Old Guard), goed
spelen foutloos (verste 38%), eerst koffie wint met 81 Focus en de meeste Coffee (783).

Level 3 (totaal 4934 HP-eq): idle verliest op golf 8, alleen Auto-Replies verliest op golf 20,
goed spelen foutloos (verste 76%, de Presenter zelf), eerst koffie wint met 83 Focus. Allemaal
zonder ooit de projector te repareren.

Level 4 (totaal ~5800 HP-eq): idle verliest op golf 7, alleen Auto-Replies verliest op golf 15
(de Impersonators lopen er langs), goed spelen en eerst koffie allebei foutloos. Verste collega 91%:
dat is het laatste stuk van de spiraal, waar de beste plekken hun werk doen.

Prijsregels in `tests/economy.test.ts`: tier 1 van een schadepad is beter dan een derde kopie, tier 3
en 4 zijn tegen een groep beter dan hetzelfde geld in kopieen, elke brouw-upgrade verdient zich binnen
4 minuten terug. Modellen wisselen nog op hoogste tier (0-1, 2-3, 4); eigen modellen per pad horen bij
de art-pass.

`tests/balance.test.ts` legt deze verhoudingen vast. Faalt die na een wijziging: eerst meten, dan
pas drempels aanpassen.

## Valkuilen die al zijn opgelost (niet opnieuw introduceren)

**Blender (headless)**
- `matrix_world` wordt pas bijgewerkt na `view_layer.update()`. Zonder dat zakken armen en benen
  door de vloer na `set_origin` + parenten. `kit.parent()` doet de update.
- `box()`/`cyl()` bakken hun positie in de mesh. `rotation_euler` op zo'n onderdeel draait om de
  wereld-oorsprong en slingert het weg. Gebruik `kit.tilt()` (draait de mesh om een eigen punt).
- In een scène met meerdere poppetjes heten armen `ArmR.001`. Zoek op prefix.

**Three.js**
- Sinds r155 rekent het licht fysisch: intensiteiten moeten ongeveer π keer hoger dan vroeger,
  anders wordt alles grauw.
- Een HP-balk als kind van een draaiend poppetje draait mee. Positie-groep en draai-groep apart.

**Browser / CSS**
- `[hidden]` verliest van een eigen `display: flex`. Staat nu globaal op `display: none !important`.
- De ingebouwde browser van de desktop-app heeft geen WebGL. Gebruik `tools/uicheck.ts`
  (headless Chrome met SwiftShader).
- tsx/esbuild zet `__name()` om functies heen; functies die naar de pagina gaan (puppeteer
  evaluate) hebben een shim nodig. Staat in uicheck.ts.

**nginx**
- Een `types { }`-blok in een server-blok vervangt de hele MIME-tabel: dan komt de JavaScript als
  octet-stream en start de game niet. Niet doen.
- Security-headers op server-niveau, niet in een location (die laat de rest vallen).

## Speeldata lezen (uit de Godot-versie, geldt nog steeds)

- Vroeg oproepen is een besmet signaal: spelers raffelen een verloren ronde af. Kijk naar verdiende
  Coffee en kills ernaast.
- Kijk naar wat er lekte vóór je aan torens sleutelt. "Te zwaar" bleek vaak een golftabel.
- Vergelijk met de winnende ronde van dezelfde speler en let op de versie.
- `docker compose exec relay python report.py` op de server.

## Server

- Map `/home/ubuntu/ctrl-alt-defend-game`, data in `/opt/ctrl-alt-defend-game` (SQLite).
- Poort 8090 (`WEB_PORT` in `.env`); Nginx Proxy Manager stuurt game.makkers.net daarheen.
  Sinds 2026-11-07 live. De oude `office-td` (downloadpagina van de Godot-.exe) is gestopt maar
  niet verwijderd: terugzetten = `WEB_PORT=8091` in `.env`, `docker compose up -d --no-build`,
  dan `cd ../office-td && docker compose start`.
- Feedback gaat naar Mattermost zodra `MATTERMOST_WEBHOOK_URL` in `.env` staat
  (`docker compose up -d relay` om hem te laden). `curl -s http://127.0.0.1:8090/api/health`
  laat `"forward": true` zien als dat gelukt is.
- Auto-deploy uit GitHub Actions werkt zodra de repo-secret `SSH_PRIVATE_KEY` er staat. Tot die
  tijd: `tools/release.sh --ssh`.
- SSH-verbindingen bundelen: poort 22 gaat dicht bij te veel losse verbindingen.

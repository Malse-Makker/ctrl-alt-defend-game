# Overdracht

Voor de volgende chat. Lees dit, dan `docs/BOUWPLAN.md`, dan de ontwerpbijbel
(`/home/mick/projecten/CTRL-ALT-DEFEND/07_REMAKE_PROMPT.md`, deel 2; alleen lokaal, niet in git. De
oude Godot-repo wordt gearchiveerd en privé).

## Stand: v0.15.0 (2026-11-08)

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

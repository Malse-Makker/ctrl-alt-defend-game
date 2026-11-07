# Overdracht

Voor de volgende chat. Lees dit, dan `docs/BOUWPLAN.md`, dan de ontwerpbijbel
(`/home/mick/projecten/CTRL-ALT-DEFEND/07_REMAKE_PROMPT.md`, deel 2).

## Stand: v0.2.0 (2026-11-08)

Fase 1 is af: level 1 speelbaar in de browser, twee torens, vier collega's plus boss, feedback en
rondecijfers via de relay (naar Mattermost). v0.2.0: upgrades zoals Bloons TD 6. Zie CHANGELOG.md.

**Volgorde van de maker (2026-11-08): upgrades (klaar) -> multiplayer -> levels 2-15.**
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

# Overdracht

Voor de volgende chat. Lees dit, dan `docs/BOUWPLAN.md`, dan de ontwerpbijbel
(`/home/mick/projecten/CTRL-ALT-DEFEND/07_REMAKE_PROMPT.md`, deel 2).

## Stand: v0.1.0 (2026-11-07)

Fase 1 is af: level 1 speelbaar in de browser, twee torens, vier collega's plus boss, feedback en
rondecijfers via de relay. Zie CHANGELOG.md.

## Besluiten (van de maker, 2026-11-07)

| Onderwerp | Besluit |
|---|---|
| Engine | Three.js + TypeScript + Vite (geen Unity) |
| Art | isometrisch kantoor-diorama, orthografische camera, low-poly flat-shaded, rustig kantoorpalet, één felle kleur per collega |
| Feedback | eigen relay in dezelfde docker-compose; webhook alleen in `.env` op de server |
| Repo | publiek |
| Hosting | Docker op de OVH-server, game.makkers.net |

## Werkwijze

- Overleg in het Nederlands, in-game tekst Engels, droog, geen em-dashes, alleen ASCII
  (`tests/content.test.ts` bewaakt dat).
- Commits als `malse-makker <games@makkers.net>`, sleutel `~/.ssh/makkersgames` (lokaal ingesteld).
- Na elke wijziging: `npm run check`, bij balanswerk `npm run balance`, bij UI-werk
  `npx tsx tools/uicheck.ts` en de screenshots echt bekijken.
- VERSION + CHANGELOG.md bijwerken, dan `tools/release.sh`.

## Balans (gemeten met tools/balance.ts, v0.1.0)

Level 1, totaal HP-equivalent 4234, golven stijgen vloeiend 10-20% per golf (geen zaagtand meer).

| Bot | Uitkomst |
|---|---|
| idle (één toren) | verliest op golf 11 |
| beginner (6 Auto-Replies, max lvl 2) | wint, 74 Focus, 2 sterren (boss lekt) |
| spam (alleen lvl 1-torens) | wint, 80 Focus, 2 sterren (boss lekt) |
| solid (upgraden, ESCALATION, half op Most HP bij de boss) | foutloos, verste collega op 47% van de route |
| greedy (eerst koffie) | foutloos |

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
- Poort uit `.env` (`WEB_PORT`, standaard 8091). game.makkers.net wees in de Godot-tijd naar
  `office-td` op 8090 (downloadpagina van de .exe).
- SSH-verbindingen bundelen: poort 22 gaat dicht bij te veel losse verbindingen.

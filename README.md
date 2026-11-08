# CTRL-ALT-DEFEND

*"I'll put this with the rest of the focus."*

Een tower defense in de browser over het verdedigen van je werkdag tegen je collega's. Je houdt
ze tegen met wat er op je bureau staat: een koffiezetapparaat, een auto-reply, en later een
koptelefoon, een nietmachine en een versnipperaar. Torens zijn voorwerpen, vijanden zijn mensen.

Speel: **https://game.makkers.net** (geen download, geen installatie).

Dit is de remake van een eerdere Godot-versie van dezelfde game; alle ideeën komen daarvandaan.

> **Over dit project:** CTRL-ALT-DEFEND is gemaakt met hulp van AI (Claude), als persoonlijk
> speel- en leerproject om meer te leren over AI, over gamedesign en over 3D in de browser. Ook
> het automatisch testen en uitrollen (CI/CD via GitHub Actions) is onderdeel van dat leerproces.
> Niet-commercieel, onderdeel van de makkers-collectie.

## Wat er nu in zit (v0.7.0)

- **Level 1, Open-Plan Office**: 21 golven en The Head of Comms.
- **Level 2, Coffee Corner**: 22 golven en The Repair Guy (geen Coffee zolang hij er is). Gaat open
  als je level 1 haalt.
- **Level 3, Meeting Room**: 21 golven, The Presenter (beamt Chasers naast je bureau) en de
  projector-mini-game: kabels in de juiste poort, juiste beeldscherm-instelling, anders niet bouwen.
- **Level 4, Canteen**: 22 golven over een spiraal rond de tafels, natte vloer waar je niet mag
  bouwen, de lunchpauze (een stoet Interns en iedereen loopt even sneller) en The Cleaner.
- **Torens**: Coffee Machine, Auto-Reply, Headphones (vertraagt en stunt een hele straal),
  Office Artillery (raakt de hele verdieping, breekt schilden), The Shredder (zone die vertraagt,
  onthult en schade verdeelt), Quick Reply (bouwt schade op tegen hetzelfde doelwit), Thumbtacks
  (punaise-hoopjes op het pad, zien ook onzichtbare collega's) en Self-Service (raakt iedereen in een
  kleine cirkel).
- **Collega's**: Intern, New Hire, Requester, Chaser, Chatterbox (legt torens stil), Old Guard
  (archiefdoos als schild, de Shredder mag er niet aan), Board Member (immuun voor in persoon) en
  Impersonator (onzichtbaar tot een Shredder-zone hem laat zien).
- **Upgrades zoals Bloons TD 6**: elke toren heeft drie paden van vier tiers. Eén pad mag naar
  tier 4, een tweede naar tier 2, het derde blijft dicht (4-2-0). Tier 3 verandert wat de toren
  doet, tier 4 is het paradepaardje.
- **The Expense Claim** (Coffee Machine, pad 2): Coffee gaat in een pot met rente; jij kiest wanneer
  je claimt. Te vroeg is zonde, te laat ook: een volle pot groeit niet meer.
- **Bosses**: The Head of Comms (zijn Interns vangen je schoten op), The Repair Guy (blokkeert alle
  inkomsten), The Presenter (laadscherm dat bij elke fase terugkomt, Chasers naast je bureau) en
  The Cleaner (jaagt iedereen op, veegt punaises weg, dweilt Shredders).
- **Targeting** per toren (First, Last, Closest, Farthest, Most HP, Least HP).
- **Snelheden** 1x, 2x, 4x, 8x, pauze, en golven vroeg oproepen voor punten.
- **Zichtbare feedback** op elke treffer: vliegende mails, schadegetallen, BLOCKED/IMMUNE.
- **Nieuwe collega's stellen zich voor** met wat je ertegen bouwt.
- **Eindscherm** met WHAT HURT YOU (gesorteerd op Focus-verlies), je torens met schade per
  Coffee, en **feedback** (hoe leuk was het, 0-10, plus opmerking) met één knop.
- **Give up** brengt je naar het eindscherm met je cijfers, niet terug naar het menu.
- **Voortgang** (sterren, Recognition) wordt in je eigen browser bewaard.
- **Samen spelen** (tot 8 spelers): host een spel en deel de code of de link
  (`game.makkers.net/?join=CODE`). De host kiest het level, het aantal spelers, gedeeld geld of
  ieder eigen geld (inkomen gedeeld, Coffee aan elkaar geven), en waar je bouwt: overal, boven en
  onder, links en rechts, vier kwarten of een eigen stuk. De server draait het spel; je browser
  laat alleen zien wat er gebeurt.

## Bediening

| Toets / muis | Wat |
|---|---|
| Linkermuis | toren plaatsen of selecteren |
| Shift + klik | meerdere van dezelfde toren achter elkaar plaatsen |
| Rechtermuis | annuleren; slepen = rondkijken |
| Scrollwiel | zoomen |
| Spatie | dag starten / volgende golf |
| 1-9 | toren uit de winkel kiezen |
| , . / | volgende tier van pad 1, 2 of 3 kopen (zoals in Bloons) |
| C | pot van een Expense Claim claimen |
| F | snelheid wisselen |
| P / Esc | pauze |
| R | camera terugzetten |

## Hoe het in elkaar zit

| Map | Wat |
|---|---|
| `src/sim/` | de spelregels: pure TypeScript, geen browser nodig. Vaste tijdstap, seeded random, dus elke ronde is reproduceerbaar |
| `src/sim/data/` | torens, collega's, levels en golven. Hier zitten alle getallen |
| `src/render/` | Three.js: isometrische camera, kantoor, collega's, effecten |
| `src/ui/` | HUD en schermen (gewone DOM met CSS grid/flex). Alle spelerstekst staat in `src/ui/text.ts` |
| `server/mp/` | multiplayer-server (Node + WebSockets): kamers met join-code, draait dezelfde `src/sim` als de browser |
| `server/relay/` | kleine Flask-service die feedback en rondecijfers opslaat (SQLite) en doorstuurt naar Discord/Mattermost |
| `art/blender/` | Python-scripts die alle 3D-modellen, icoontjes en previews bouwen in Blender |
| `public/` | de gebouwde modellen (`.glb`), icoontjes en geluidseffecten |
| `tools/` | balansrapport, bots, UI-controle in een echte browser, releasescript |

Meer achtergrond, beslissingen en valkuilen: [HANDOFF.md](HANDOFF.md). Het bouwplan per fase:
[docs/BOUWPLAN.md](docs/BOUWPLAN.md).

## Meebouwen

Pull requests zijn welkom, ook als ze met AI geschreven zijn. Lees eerst
[CONTRIBUTING.md](CONTRIBUTING.md) (opzet, checks, hoe je een PR instuurt) en
[AGENTS.md](AGENTS.md) (de huisregels; AI-tools lezen die vanzelf). Elke PR draait automatisch de
tests en de UI-check.

## Lokaal draaien

Nodig: Node.js 24.

```bash
npm install
npm run dev
```

Open http://127.0.0.1:5173. De feedback-relay draait lokaal niet mee; feedback versturen geeft
dan netjes "Could not send it". Multiplayer lokaal testen: start in een tweede terminal

```bash
npm run mp
```

en open twee tabbladen.

### Testen

```bash
npm run check          # typecheck + alle tests (regels, economie, content, balans-bots)
npm run balance        # balansrapport: HP per golf en wat vijf bots met level 1 doen
npx tsx tools/uicheck.ts   # speelt de schermen door in headless Chrome, maakt screenshots in shots/
                           # en meldt tekst die overlapt, uitsteekt of van het scherm valt
npx tsx tools/uicheck.ts --mp-only   # host en gast in twee browsers: lobby, start, bouwen
```

De relay heeft eigen tests:

```bash
cd server/relay && pip install -r requirements-dev.txt && python -m pytest -q
```

### Modellen en icoontjes opnieuw bouwen

Nodig: Blender 5.x.

```bash
blender -b --python art/blender/build_models.py      # alle modellen naar public/models
blender -b --python art/blender/icons.py             # icoontjes naar public/icons
blender -b --python art/blender/preview.py -- --out art/previews/diorama.png
```

Met `-- --only intern,coffee_1` bouw je er een paar.

## Uitrollen

De game draait in Docker op de OVH-server (`/home/ubuntu/ctrl-alt-defend-game`), achter Nginx
Proxy Manager op game.makkers.net. Drie containers: `web` (nginx met de gebouwde game), `mp` (de
multiplayer-server, via `/mp`) en `relay` (feedback). In NPM moet bij game.makkers.net
"Websockets Support" aan staan. Tests draaien mee in de Docker-build: een image met falende tests komt er niet.

Elke push naar `main` draait de tests in GitHub Actions en rolt daarna uit, zodra de secret
`SSH_PRIVATE_KEY` in de repo staat (dezelfde deploy-sleutel als de andere makkers-projecten).

Eerste keer op de server:

```bash
git clone https://github.com/Malse-Makker/ctrl-alt-defend-game.git /home/ubuntu/ctrl-alt-defend-game
cd /home/ubuntu/ctrl-alt-defend-game && cp .env.example .env   # poort en webhook(s) invullen
sudo mkdir -p /opt/ctrl-alt-defend-game && sudo chown 10001 /opt/ctrl-alt-defend-game   # de relay draait als uid 10001
GIT_COMMIT=$(git rev-parse --short HEAD) docker compose up -d --build
```

Feedback naar Mattermost: maak in Mattermost een incoming webhook voor het kanaal, zet de URL als
`MATTERMOST_WEBHOOK_URL=` in `.env` op de server en laad hem met `docker compose up -d relay`.

Een release: `VERSION` ophogen, bovenaan `CHANGELOG.md` een sectie schrijven, committen, en dan
`tools/release.sh` (of `tools/release.sh --ssh` zolang de Actions-sleutel er niet is).

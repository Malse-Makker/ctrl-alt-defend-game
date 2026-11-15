# CTRL-ALT-DEFEND

[English](README.md) | **Nederlands**

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

## Wat er nu in zit (v0.49.0)

Vijftien verdiepingen in drie blokken (junior, medior, senior). Een verdieping gaat open zodra je de
vorige haalt, brengt iets nieuws om te bouwen en eindigt met een boss.

| Verdieping | Wat er bijzonder is | Nieuwe torens | Boss |
|---|---|---|---|
| 1 Reception | poortjes waar iedereen stopt om zijn pas te scannen | Coffee Machine, Auto-Reply | The Head of Comms |
| 2 Coffee Corner | een klein keukentje vol meubels | Headphones, Office Artillery | The Repair Guy |
| 3 Presentation Room | rijen tafels, een projector die uitvalt (kabels goed steken) | Quick Reply, Self-Service | The Presenter |
| 4 Canteen | een spiraal om de tafels, een soeprij alleen voor Thumbtacks, de lunchpauze | The Shredder, Thumbtacks | The Cleaner |
| 5 Boardroom | een rondje om de vergadertafel | Keyboard Smash, Office Chair (een per speler) | Your Line Manager |
| 6 Work From Home | muren waar je niet doorheen kijkt, slechte wifi, het internet valt weg | Reply All | The Baby |
| 7 The Car Park | alleen bouwen in lege vakken, uitlaatgassen verkorten je bereik | Delegation | The Smoking Colleague |
| 8 Hot Desks | bouwen op flexplekken, elke golf een paar gereserveerd, de bureautelefoon | Pomodoro Timer | The Head of Comms |
| 9 Town Hall | twee ingangen, een tribune die verder reikt, het brandalarm | Motivational Poster | The Repair Guy |
| 10 Boardroom II | een glazen kamer waarvan de jaloezieen dichtgaan | | Your Line Manager |
| 11 The Merger | links alleen DIGITAL torens, rechts alleen PHYSICAL, verhuisdozen | | The Consultant |
| 12 HR Room | een doorkijkspiegel, formulieren waardoor je niet kunt upgraden | | The HR Manager |
| 13 Server Room | de kou vertraagt het herladen, een dichte ruimte, de koeling valt uit | | The Cleaner |
| 14 Release Night | donker kantoor, alleen bureaulampen geven licht, pizza | | The Project Manager |
| 15 Boardroom III | twee ingangen, snellere jaloezieen, een 360-gradenbeoordeling | | Your Line Manager, 360 |

**Torens** zijn spullen van je bureau, elk met een eigen kunstje: de Coffee Machine (Coffee, of een
pot met rente), Auto-Reply, Headphones (iedereen in bereik staat even stil), Office Artillery (de
hele vloer), The Shredder (een zone die verborgen collega's laat zien), Quick Reply (drie tegelijk),
Thumbtacks (hoopjes op het looppad), Self-Service ("please hold"), Keyboard Smash en de Office
Chair (specials, een per speler), Reply All (landt op een groep), Delegation (springt door, elke
keer harder), de Pomodoro Timer (gooit over muren) en de Motivational Poster (maakt de torens
eromheen beter). DIGITAL torens hebben internet nodig en worden traag op slechte wifi; PHYSICAL
torens niet.

**Upgrades zoals Bloons TD 6**: drie paden van vier tiers, een pad tot tier 4, een tweede tot tier
2, het derde blijft dicht (4-2-0). Elke combinatie zie je aan de toren zelf: elk pad op tier 1 of 2
zet er een eigen onderdeel in de padkleur op, en op tier 3 en 4 wordt de toren iets heel anders.
Lampjes op de vloer ervoor tellen de tiers.

**Collega's**: de Intern, de New Hire, de Chaser, de Requester (er komen twee Chasers uit), de
Chatterbox (torens bij hem vallen stil), de Speakerphone Caller (alle aandacht), en twee dingen
waar een collega zich niets van aantrekt, zoals lood en camo bij Bloons: een **doos** (het archief
van de Old Guard, de laptop van de Board Member: alleen torens die dozen breken komen erdoor) en
**verborgen** zijn (de Impersonator, de Cold Caller: alleen torens die verborgen collega's zien
kunnen op ze mikken; Tracking Pixel en Paper Trail vinden ze voorgoed).

**Bosses** vragen een andere aanpak, niet alleen meer HP: The Repair Guy stopt alle inkomsten, het
laadscherm van The Presenter komt elke fase terug, The Baby trekt alle aandacht, The Consultant
dekt de rest, The HR Manager doet audits op je favoriete toren, The Project Manager jaagt iedereen
op. Op zes verdiepingen laat een zijdeur met een rood bordje zien waar de mensen van een boss
binnenkomen.

**Verder**

- **Zeggen wat niet werkt**: icoontjes boven collega's en torens, "BOUNCED OFF", waarom een toren
  stilstaat, een tip als er iemand doorkomt, en "Who is who" met elke collega en wat tegen hem helpt.
- **Neerzetten**: het bouwraster laat zien waar een toren mag staan en waar hij niets zou zien, en
  hoeveel van het looppad hij bestrijkt.
- **Snelheden** 1x tot 8x, pauze, golven vroeg oproepen voor punten, doelkeuze per toren.
- **Eindscherm** met wat je pijn deed, de schade per Coffee van je torens, en feedback in een klik.
- **Voortgang en Recognition** in je eigen browser: sterren leveren perks op voor je volgende spel.
- **Samen spelen** (tot 8 spelers): host een spel en deel de code of de link
  (`game.makkers.net/?join=CODE`). Gedeeld geld of ieder zijn eigen, en waar iedereen bouwt. De
  server draait het spel; je browser laat het alleen zien.

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

## Licentie

[CC BY-NC 4.0](LICENSE): gebruiken, delen en aanpassen mag, voor alles wat niet commercieel is,
zolang je "CTRL-ALT-DEFEND by Malse-Makker" noemt met een link naar deze repo. Geen commercieel
gebruik.

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
blender -b --python art/blender/projector_ui.py      # plaatjes en poortposities van de projector-minigame
blender -b --python art/blender/contactsheet.py -- shots headphones   # alle 49 upgradecombinaties
```

Met `-- --only intern,coffee_core` bouw je er een paar. Elke toren bestaat uit 13 onderdelen: een
kern, per pad een module voor tier 1 en 2 die in het slot van dat pad komt, en per pad een held
voor tier 3 en 4. Het spel zet ze per combinatie van upgrades in elkaar (`modelFor` en
`modulesFor` in `src/sim/data/towers.ts`); `tower_parts()` in `build_models.py` doet hetzelfde in
Blender, en dat gebruikt het contactblad. Met `--tile 40` zie je het blad op speelafstand, met
`--sides` de kern en de helden van alle vier kanten.

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

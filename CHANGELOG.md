# Changelog

Alle nennenswerten Änderungen an der Nachbarschaftshilfe stehen hier, die neuesten oben.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.1.0/).

## [Unveröffentlicht]

### Sicherheit

- `setup.html` verlangt einen PIN mit mindestens 10 Zeichen (bisher 4). `payload.js` liegt öffentlich auf dem Server;
  ein 4-stelliger Zahlen-PIN ließ sich dort offline in rund einer Stunde durchprobieren. Hinweistext, README und
  Screenshot angepasst. Eine schon eingerichtete `payload.js` funktioniert weiter, sollte aber mit einem längeren PIN
  neu erzeugt werden.

### Intern

- Browsertest `tests/browser.mjs` (läuft mit `tests/run.sh`): Einrichtung, falscher und richtiger
  PIN, manipulierte `payload.js`, fehlende Einrichtung; der Webhook ist gemockt und wird genau einmal per POST an die
  entschlüsselte Adresse aufgerufen.
- CHANGELOG allgemein formuliert, ohne lokalen Pfad zur eigenen Testumgebung; bewusste Testlücke in `CLAUDE.md` notiert.
- Testskripte nennen in Meldungen und Kommentaren keinen lokalen Pfad mehr, sondern verweisen auf einen Container mit den Testwerkzeugen und die README.

## 2026-10-14

- Lizenz auf AGPLv3 umstellen und Quelltext-Link ergänzen

## 2026-10-04

- Nachbarschaftshilfe: Home-Assistant-Webhook per PIN auslösen
- README: Screenshots von Hauptseite und Einrichtung ergänzen

Die Einträge bis hier sind aus der Git-Historie übernommen.

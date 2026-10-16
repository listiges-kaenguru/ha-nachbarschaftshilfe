# Nachbarschaftshilfe – Hinweise für Claude

Statische Seite, die nach PIN-Eingabe eine Home-Assistant-Automation per Webhook auslöst. Die Webhook-URL liegt
AES-GCM-verschlüsselt in `payload.js` (Schlüssel per PBKDF2 aus dem PIN). Öffentliches Repo, AGPL-3.0-or-later.

## Orientierung

- `README.md` – Funktionsweise, Dateien (was veröffentlicht wird), PIN ändern, Sicherheitshinweise
- `CHANGELOG.md` – Änderungen; jede Änderung unter `## [Unveröffentlicht]` eintragen
- `IDEEN.md` – ToDo und Ideen; Erledigtes ins CHANGELOG
- `CONTRIBUTING.md` – Mitwirken

## Regeln

- Texte und Doku auf Deutsch.
- **Niemals** `payload.js` (auch verschlüsselt), echte Webhook-URLs oder PINs committen; `payload.js` ist per
  `.gitignore` ausgeschlossen. `index_ALT_ohne-PIN_NICHT-HOCHLADEN.html` bleibt lokal und wird nie veröffentlicht.
- Sicherheitsmechanismen nicht aufweichen (PBKDF2-Iterationen, steigende Wartezeit nach Fehlversuchen).
- Keine externen Ressourcen; die Seite braucht HTTPS (Web Crypto).
- Ändert sich, welche Dateien veröffentlicht werden, die Tabelle „Dateien“ in der README anpassen.

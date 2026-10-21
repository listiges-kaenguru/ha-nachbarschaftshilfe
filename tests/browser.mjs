// Browsertest: Einrichtung (setup.html) und Auslösen (index.html) mit gemocktem Home-Assistant-Webhook.
// payload.js wird im Test erzeugt und über page.route ausgeliefert, nie gespeichert. Braucht Playwright
// und Chromium (Pfad zur package.json in $PW); tests/run.sh startet den Webserver.
import { createRequire } from 'node:module';

if (!process.env.PW) { console.error('$PW fehlt – zeigt auf die package.json eines installierten Playwright (siehe README)'); process.exit(2); }
const { chromium } = createRequire(process.env.PW)('playwright');
const URL = process.env.APP_URL || 'http://localhost:8091/';
const WEBHOOK = 'https://ha.example.invalid/api/webhook/test-id-123';
const PIN = 'Garten-Tor-2026';

let failed = 0;
const check = (name, ok, info = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ' ' + info}`); if (!ok) failed++; };

const browser = await chromium.launch();
const context = await browser.newContext();
const errors = [];
const aufrufe = [];
const fremd = [];
// Webhook mocken, alles andere außerhalb von localhost abbrechen
await context.route(/^https?:\/\/(?!localhost[:/])/, (r) => {
  if (r.request().url() === WEBHOOK) {
    aufrufe.push({ url: r.request().url(), methode: r.request().method() });
    return r.fulfill({ status: 200, body: '', headers: { 'access-control-allow-origin': '*' } });
  }
  fremd.push(r.request().url());
  return r.abort();
});
let payload = 'const PAYLOAD = null;';
await context.route('**/payload.js', (r) => r.fulfill({ contentType: 'text/javascript', body: payload }));

const status = (page) => page.textContent('#statusText');

/** setup.html ausfüllen, Ergebnis (Inhalt für payload.js) oder null */
async function einrichten(url, pin, pin2 = pin) {
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL + 'setup.html');
  await page.fill('#url', url);
  await page.fill('#pin', pin);
  await page.fill('#pin2', pin2);
  // Formular per JS absenden: prüft die Logik in setup.js, nicht nur die Browser-Validierung (minlength)
  await page.evaluate(() => document.getElementById('setupForm').dispatchEvent(new Event('submit', { cancelable: true })));
  await page.waitForFunction(() => !/wird verschlüsselt/i.test(document.getElementById('statusText').textContent), null, { timeout: 15000 });
  const out = await page.$eval('#result', (r) => (r.classList.contains('hidden') ? null : document.getElementById('out').value));
  const meldung = await status(page);
  await page.close();
  return { out, meldung };
}
async function entsperren(pin) {
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL);
  await page.fill('#pinInput', pin);
  await page.click('#pinBtn');
  await page.waitForFunction(() => !/wird geprüft/i.test(document.getElementById('statusText').textContent), null, { timeout: 15000 });
  return page;
}

// --- Einrichtung ---------------------------------------------------------------------------------------
const kurz = await einrichten(WEBHOOK, '123456789');
check('PIN mit 9 Zeichen wird abgelehnt', kurz.out === null && /mindestens 10/i.test(kurz.meldung), JSON.stringify(kurz));
const ungleich = await einrichten(WEBHOOK, PIN, PIN + 'x');
check('ungleiche PINs werden abgelehnt', ungleich.out === null && /stimmen nicht/i.test(ungleich.meldung), JSON.stringify(ungleich));
const ok = await einrichten(WEBHOOK, PIN);
check('Einrichtung erzeugt payload.js', /^const PAYLOAD = \{.*\};\n$/s.test(ok.out ?? ''), JSON.stringify(ok));
check('payload.js enthält weder URL noch PIN', !ok.out?.includes('ha.example') && !ok.out?.includes(PIN));
check('payload.js nutzt 600 000 PBKDF2-Runden', /"it":600000/.test(ok.out ?? ''));
const zweiter = await einrichten(WEBHOOK, PIN);
check('zweite Einrichtung: anderes Salz und IV', zweiter.out !== ok.out);
const genau10 = await einrichten(WEBHOOK, '0123456789');
check('PIN mit genau 10 Zeichen ist erlaubt', genau10.out !== null, JSON.stringify(genau10));

// --- Auslösen ------------------------------------------------------------------------------------------
payload = 'const PAYLOAD = null;';
let page = await context.newPage();
await page.goto(URL);
check('ohne payload.js: Hinweis und gesperrtes Eingabefeld',
  /nicht eingerichtet/.test(await status(page)) && await page.isDisabled('#pinInput'));
await page.close();

payload = ok.out;
page = await entsperren('falscher-pin-123');
check('falscher PIN: Fehlermeldung, kein Auslöse-Knopf', /falscher pin/i.test(await status(page)) && !(await page.isVisible('#triggerBtn')));
await page.close();
page = await entsperren(PIN.toLowerCase());
check('PIN unterscheidet Groß-/Kleinschreibung', !(await page.isVisible('#triggerBtn')));
await page.close();

page = await entsperren(PIN);
check('richtiger PIN entsperrt', await page.isVisible('#triggerBtn'));
check('PIN-Feld ist danach geleert', (await page.$eval('#pinInput', (i) => i.value)) === '');
check('vor dem Klick kein Webhook-Aufruf', aufrufe.length === 0);
await page.click('#triggerBtn');
await page.waitForFunction(() => /erfolgreich|fehlgeschlagen|fehler/i.test(document.getElementById('statusText').textContent));
check('Klick ruft genau den entschlüsselten Webhook per POST auf', aufrufe.length === 1 && aufrufe[0].methode === 'POST', JSON.stringify(aufrufe));
check('Erfolgsmeldung', /erfolgreich/i.test(await status(page)));
await page.close();

// Manipulierte payload.js: verändertes Chiffrat / falsches Salz → richtiger PIN schlägt fehl, nichts wird ausgelöst
const p = JSON.parse(ok.out.replace(/^const PAYLOAD = /, '').replace(/;\n$/, ''));
const kippe = (b64) => { const b = Buffer.from(b64, 'base64'); b[0] ^= 1; return b.toString('base64'); };
for (const [name, aend] of [['Chiffrat', { c: kippe(p.c) }], ['Salz', { s: kippe(p.s) }], ['IV', { i: kippe(p.i) }], ['Runden', { it: 1000 }]]) {
  payload = 'const PAYLOAD = ' + JSON.stringify({ ...p, ...aend }) + ';';
  page = await entsperren(PIN);
  check(`manipuliert (${name}): richtiger PIN entsperrt nicht`, !(await page.isVisible('#triggerBtn')) && /falscher pin/i.test(await status(page)));
  await page.close();
}
payload = 'const PAYLOAD = {"it":600000,"s":"!!kein base64!!","i":"","c":""};';
page = await entsperren(PIN);
check('kaputte payload.js: Fehlermeldung statt Absturz', !(await page.isVisible('#triggerBtn')) && /falscher pin/i.test(await status(page)));
await page.close();

check('Webhook insgesamt genau einmal aufgerufen', aufrufe.length === 1, JSON.stringify(aufrufe));
check('keine anderen Anfragen nach außen', fremd.length === 0, fremd.join(' '));
check('keine Fehler auf den Seiten', errors.length === 0, errors.join(' | '));
await browser.close();
console.log(`\n${failed ? `${failed} Prüfung(en) fehlgeschlagen` : 'Alle Prüfungen bestanden'}`);
process.exit(failed ? 1 : 0);

// Die Webhook-URL ist mit AES-GCM verschlüsselt (PAYLOAD aus payload.js);
// der Schlüssel wird per PBKDF2 aus dem PIN abgeleitet. Weder URL noch PIN
// stehen im Quelltext. payload.js erzeugst du lokal mit setup.html.

const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function decryptTarget(pin) {
  const material = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: b64(PAYLOAD.s), iterations: PAYLOAD.it },
    material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64(PAYLOAD.i) }, key, b64(PAYLOAD.c));
  return new TextDecoder().decode(plain);
}

const pinForm = document.getElementById('pinForm');
const pinInput = document.getElementById('pinInput');
const pinBtn = document.getElementById('pinBtn');
const btn = document.getElementById('triggerBtn');
const lead = document.getElementById('lead');

let target = null;
let failedAttempts = 0;

const hasPayload = typeof PAYLOAD !== 'undefined' && PAYLOAD;

if (!hasPayload || !window.crypto || !crypto.subtle) {
  pinInput.disabled = true;
  pinBtn.disabled = true;
  showStatus('error', !hasPayload
    ? 'Diese Seite ist noch nicht eingerichtet.'
    : 'Dein Browser unterstützt die benötigte Verschlüsselung nicht (HTTPS erforderlich).');
}

pinForm.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  pinInput.disabled = true;
  pinBtn.disabled = true;
  pinInput.removeAttribute('aria-invalid');
  showStatus('loading', 'PIN wird geprüft …');

  try {
    target = await decryptTarget(pinInput.value);
    pinInput.value = '';
    pinForm.classList.add('hidden');
    lead.textContent = 'Entsperrt. Du kannst die Automation jetzt auslösen.';
    btn.classList.remove('hidden');
    btn.focus();
    hideStatus();
  } catch {
    failedAttempts++;
    // Wachsende Wartezeit nach Fehlversuchen
    const wait = Math.min(1000 * 2 ** (failedAttempts - 1), 30000);
    pinInput.setAttribute('aria-invalid', 'true');
    showStatus('error', wait > 1000
      ? `Falscher PIN. Nächster Versuch in ${Math.round(wait / 1000)} Sekunden möglich.`
      : 'Falscher PIN.');
    await new Promise(r => setTimeout(r, wait));
    pinInput.disabled = false;
    pinBtn.disabled = false;
    pinInput.focus();
    pinInput.select();
  }
});

btn.addEventListener('click', async () => {
  btn.disabled = true;
  btn.setAttribute('aria-busy', 'true');
  showStatus('loading', 'Automation wird ausgelöst …');

  try {
    const response = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      referrerPolicy: 'no-referrer',
    });

    if (response.ok) {
      showStatus('success', 'Automation erfolgreich ausgelöst.');
    } else {
      showStatus('error', `Aufruf fehlgeschlagen (HTTP ${response.status} ${response.statusText}).`);
    }
  } catch (err) {
    showStatus('error', 'Netzwerkfehler oder CORS-Problem: ' + ((err && err.message) || err));
  } finally {
    btn.disabled = false;
    btn.removeAttribute('aria-busy');
  }
});

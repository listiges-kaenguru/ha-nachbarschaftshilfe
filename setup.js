// Verschlüsselt die Webhook-URL mit einem aus dem PIN abgeleiteten Schlüssel.
// Läuft komplett lokal im Browser, es wird nichts gesendet.

const ITERATIONS = 600000;
const toB64 = bytes => btoa(String.fromCharCode(...bytes));

async function encrypt(url, pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const material = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
    material, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, new TextEncoder().encode(url)));
  return { it: ITERATIONS, s: toB64(salt), i: toB64(iv), c: toB64(ct) };
}

const form = document.getElementById('setupForm');
const urlInput = document.getElementById('url');
const pin = document.getElementById('pin');
const pin2 = document.getElementById('pin2');
const goBtn = document.getElementById('goBtn');
const result = document.getElementById('result');
const out = document.getElementById('out');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');

if (!window.crypto || !crypto.subtle) {
  goBtn.disabled = true;
  showStatus('error', 'Dein Browser unterstützt die benötigte Verschlüsselung hier nicht. Öffne die Datei direkt (file://) oder über HTTPS.');
}

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  pin2.removeAttribute('aria-invalid');

  if (pin.value !== pin2.value) {
    pin2.setAttribute('aria-invalid', 'true');
    showStatus('error', 'Die PINs stimmen nicht überein.');
    pin2.focus();
    return;
  }

  goBtn.disabled = true;
  showStatus('loading', 'Wird verschlüsselt …');
  try {
    const payload = await encrypt(urlInput.value.trim(), pin.value);
    out.value = 'const PAYLOAD = ' + JSON.stringify(payload) + ';\n';
    pin.value = pin2.value = '';
    result.classList.remove('hidden');
    showStatus('success', 'Fertig. Lade payload.js herunter und ersetze damit die Datei im Projektordner.');
    downloadBtn.focus();
  } catch (err) {
    showStatus('error', 'Fehler: ' + ((err && err.message) || err));
  } finally {
    goBtn.disabled = false;
  }
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(out.value);
    showStatus('success', 'Inhalt in die Zwischenablage kopiert.');
  } catch {
    out.focus();
    out.select();
    showStatus('error', 'Kopieren nicht möglich. Der Text ist markiert, bitte mit Strg+C kopieren.');
  }
});

downloadBtn.addEventListener('click', () => {
  const blob = new Blob([out.value], { type: 'text/javascript' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'payload.js';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

// Farbschema: Hell / Dunkel / System.
// Wird im <head> ohne defer geladen, damit das gespeicherte Schema vor dem
// ersten Rendern gesetzt ist (verhindert Aufblitzen).

(() => {
  const root = document.documentElement;

  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') root.dataset.theme = saved;
  } catch {}

  document.addEventListener('DOMContentLoaded', () => {
    const current = document.getElementById('theme-' + (root.dataset.theme || 'system'));
    if (current) current.checked = true;

    document.querySelectorAll('input[name="theme"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const value = radio.value;
        if (value === 'system') delete root.dataset.theme;
        else root.dataset.theme = value;
        try {
          if (value === 'system') localStorage.removeItem('theme');
          else localStorage.setItem('theme', value);
        } catch {}
      });
    });
  });
})();

// Gemeinsame Statusanzeige für beide Seiten
const STATUS_ICONS = {
  loading: '<svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-9-9"/></svg>',
  success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>',
  error:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/></svg>',
};

function showStatus(type, text) {
  const box = document.getElementById('status');
  box.className = 'status show ' + type;
  document.getElementById('statusIcon').innerHTML = STATUS_ICONS[type];
  document.getElementById('statusText').textContent = text;
}

function hideStatus() {
  document.getElementById('status').className = 'status';
  document.getElementById('statusText').textContent = '';
}

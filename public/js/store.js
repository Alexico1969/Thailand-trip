// localStorage helpers. All keys are namespaced with "bb:" so the app
// never collides with anything else living on the same origin.

const PREFIX = 'bb:';

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch (err) {
    toast('Storage full — this change may not be saved. Try clearing some photos.');
    return false;
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch (err) {
    /* ignore */
  }
}

// Minimal toast system shared across the app.
let toastTimer = null;
export function toast(message) {
  let el = document.getElementById('bb-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'bb-toast';
    el.className = 'bb-toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

import { load, save, toast } from '../store.js';
import { DISHES } from '../data/dishes.js';

const STORE_KEY = 'passport:progress';
const PHOTO_MAX_EDGE = 800;

function getProgress() {
  return load(STORE_KEY, {});
}

export async function init(root) {
  root.innerHTML = `
    <div class="card">
      <div class="card-title-row">
        <h2>Street Food Passport</h2>
        <button class="btn small outline" id="export-btn">Export diary</button>
      </div>
      <div id="progress-area"></div>
    </div>
    <div class="dish-grid" id="dish-grid"></div>
    <div id="sheet-root"></div>
  `;

  root.querySelector('#export-btn').addEventListener('click', exportDiary);
  paint(root);
}

function paint(root) {
  const progress = getProgress();
  const doneCount = DISHES.filter((d) => progress[d.id]?.done).length;
  const pct = Math.round((doneCount / DISHES.length) * 100);

  root.querySelector('#progress-area').innerHTML = `
    <div class="progress-label">${doneCount}/${DISHES.length} dishes conquered 🎉</div>
    <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
  `;

  const grid = root.querySelector('#dish-grid');
  grid.innerHTML = DISHES.map((d) => {
    const entry = progress[d.id];
    return `
      <button class="dish-card ${entry?.done ? 'done' : ''}" data-id="${d.id}">
        ${entry?.done ? '<span class="done-check">✅</span>' : ''}
        <div class="dish-english">${escapeHtml(d.english)}</div>
        <div class="dish-phonetic">${escapeHtml(d.phonetic)}</div>
        <div class="dish-spice">${'🌶️'.repeat(d.spice) || '—'}</div>
        ${entry?.rating ? `<div class="stars" style="font-size:0.9rem;">${'★'.repeat(entry.rating)}${'☆'.repeat(5 - entry.rating)}</div>` : ''}
      </button>
    `;
  }).join('');

  grid.querySelectorAll('.dish-card').forEach((card) => {
    card.addEventListener('click', () => openDetail(root, card.dataset.id));
  });
}

function openDetail(root, dishId) {
  const dish = DISHES.find((d) => d.id === dishId);
  const progress = getProgress();
  const entry = progress[dishId] || { done: false, rating: 0, note: '', photo: null };
  const sheetRoot = root.querySelector('#sheet-root');

  sheetRoot.innerHTML = `
    <div class="bb-sheet-backdrop" id="detail-backdrop">
      <div class="bb-sheet" role="dialog" aria-modal="true" aria-label="${escapeHtml(dish.english)}">
        <button class="bb-sheet-close" id="detail-close">✕</button>
        <h2>${escapeHtml(dish.english)}</h2>
        <div class="muted" style="font-size:1.1rem; margin-bottom:4px;">${escapeHtml(dish.thai)} · <em>${escapeHtml(dish.phonetic)}</em></div>
        <p>${escapeHtml(dish.desc)}</p>
        <p><strong>Spice:</strong> ${'🌶️'.repeat(dish.spice) || 'none'}</p>
        <p><strong>How to order:</strong> "${escapeHtml(dish.order)}"</p>
        ${dish.heads_up ? `<div class="banner-offline">⚠️ ${escapeHtml(dish.heads_up)}</div>` : ''}

        ${entry.done ? `
          <div class="field">
            <label>Your rating</label>
            <div class="stars" id="rating-stars">
              ${[1, 2, 3, 4, 5].map((n) => `<button data-n="${n}" class="${n <= entry.rating ? 'on' : ''}">★</button>`).join('')}
            </div>
          </div>
          <div class="field">
            <label for="dish-note">Note</label>
            <textarea id="dish-note" placeholder="What did you think?">${escapeHtml(entry.note || '')}</textarea>
          </div>
          <div class="field">
            <label for="dish-photo">Photo (optional)</label>
            ${entry.photo ? `<img class="photo-preview" src="${entry.photo}" alt="${escapeHtml(dish.english)} photo">` : ''}
            <input type="file" accept="image/*" capture="environment" id="dish-photo">
          </div>
          <button class="btn block outline" id="undo-btn">Mark as "to try" again</button>
        ` : `
          <button class="btn block" id="eat-btn">I ate this! 🎉</button>
        `}
      </div>
    </div>
  `;

  const close = () => { sheetRoot.innerHTML = ''; };
  sheetRoot.querySelector('#detail-close').addEventListener('click', close);
  sheetRoot.querySelector('#detail-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'detail-backdrop') close();
  });

  if (!entry.done) {
    sheetRoot.querySelector('#eat-btn').addEventListener('click', () => {
      const current = getProgress();
      current[dishId] = { done: true, rating: 0, note: '', photo: null, date: new Date().toISOString().slice(0, 10) };
      save(STORE_KEY, current);
      close();
      paint(root);
      openDetail(root, dishId);
    });
  } else {
    sheetRoot.querySelectorAll('#rating-stars button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const current = getProgress();
        current[dishId].rating = Number(btn.dataset.n);
        save(STORE_KEY, current);
        close();
        paint(root);
        openDetail(root, dishId);
      });
    });
    sheetRoot.querySelector('#dish-note').addEventListener('change', (e) => {
      const current = getProgress();
      current[dishId].note = e.target.value;
      save(STORE_KEY, current);
      paint(root);
    });
    sheetRoot.querySelector('#dish-photo').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const dataUrl = await downscaleTo800(file);
        const current = getProgress();
        current[dishId].photo = dataUrl;
        const okSave = save(STORE_KEY, current);
        if (okSave) { close(); paint(root); openDetail(root, dishId); }
      } catch (err) {
        toast('Could not save that photo — storage may be full.');
      }
    });
    sheetRoot.querySelector('#undo-btn').addEventListener('click', () => {
      const current = getProgress();
      current[dishId] = { done: false, rating: 0, note: '', photo: null };
      save(STORE_KEY, current);
      close();
      paint(root);
    });
  }
}

function downscaleTo800(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('decode failed'));
      img.onload = () => {
        let { width, height } = img;
        const longEdge = Math.max(width, height);
        if (longEdge > PHOTO_MAX_EDGE) {
          const scale = PHOTO_MAX_EDGE / longEdge;
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function exportDiary() {
  const progress = getProgress();
  const eaten = DISHES.filter((d) => progress[d.id]?.done);
  const win = window.open('', '_blank');
  if (!win) { toast('Please allow pop-ups to export your diary.'); return; }

  const rows = eaten.map((d) => {
    const e = progress[d.id];
    return `
      <div style="break-inside:avoid; border:1px solid #ccc; border-radius:12px; padding:14px; margin-bottom:14px;">
        <h3 style="margin:0 0 4px;">${escapeHtml(d.english)} <span style="font-weight:400; color:#666;">(${escapeHtml(d.thai)})</span></h3>
        <div>${'★'.repeat(e.rating || 0)}${'☆'.repeat(5 - (e.rating || 0))} — eaten ${escapeHtml(e.date || '')}</div>
        ${e.note ? `<p>${escapeHtml(e.note)}</p>` : ''}
        ${e.photo ? `<img src="${e.photo}" style="max-width:100%; max-height:300px; border-radius:8px;">` : ''}
      </div>
    `;
  }).join('');

  win.document.write(`
    <!doctype html><html><head><meta charset="utf-8"><title>My Bangkok Food Diary</title>
    <style>body{font-family:sans-serif; max-width:640px; margin:24px auto; padding:0 16px; color:#22262E;} h1{font-family:sans-serif;}</style>
    </head><body>
    <h1>🍜 My Bangkok Food Diary</h1>
    <p>${eaten.length} of ${DISHES.length} dishes conquered.</p>
    ${rows || '<p>No dishes marked eaten yet!</p>'}
    </body></html>
  `);
  win.document.close();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

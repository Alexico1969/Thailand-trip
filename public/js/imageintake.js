// Shared photo intake widget for the Converter and Menu Decoder tools.
// Renders a tappable/drop/paste zone, downscales any chosen image client-side
// (max 1568px long edge, JPEG q0.8) and hands back a data URL.
const MAX_EDGE = 1568;
const JPEG_QUALITY = 0.8;

export function mountPhotoIntake(container, { onImage, onError }) {
  container.innerHTML = `
    <div class="photo-drop" id="photo-drop" tabindex="0" role="button" aria-label="Add a photo">
      <span class="big-icon">📷</span>
      <div>Tap to take/choose a photo, or drag one here</div>
      <div class="muted" style="margin-top:4px;">Paste from clipboard also works</div>
    </div>
    <input type="file" accept="image/*" capture="environment" id="photo-input" style="display:none;">
  `;

  const drop = container.querySelector('#photo-drop');
  const input = container.querySelector('#photo-input');

  const handleFile = (file) => {
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
      onError?.('That file is not an image — please choose a photo.');
      return;
    }
    downscaleImage(file)
      .then((dataUrl) => onImage(dataUrl))
      .catch((err) => onError?.(err.message || 'Could not read that image.'));
  };

  drop.addEventListener('click', () => input.click());
  drop.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
  });
  input.addEventListener('change', () => handleFile(input.files[0]));

  ['dragover', 'dragenter'].forEach((evt) =>
    drop.addEventListener(evt, (e) => { e.preventDefault(); drop.classList.add('dragover'); })
  );
  ['dragleave', 'drop'].forEach((evt) =>
    drop.addEventListener(evt, (e) => { e.preventDefault(); drop.classList.remove('dragover'); })
  );
  drop.addEventListener('drop', (e) => {
    const file = e.dataTransfer?.files?.[0];
    handleFile(file);
  });

  drop.addEventListener('paste', (e) => {
    const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith('image/'));
    if (item) handleFile(item.getAsFile());
  });
  document.addEventListener('paste', (e) => {
    if (!container.isConnected) return;
    const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith('image/'));
    if (item) handleFile(item.getAsFile());
  });
}

function downscaleImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.onload = () => {
      img.onerror = () => reject(new Error('That file could not be decoded as an image.'));
      img.onload = () => {
        let { width, height } = img;
        const longEdge = Math.max(width, height);
        if (longEdge > MAX_EDGE) {
          const scale = MAX_EDGE / longEdge;
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

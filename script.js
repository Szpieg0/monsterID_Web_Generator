const SOURCE_MONSTER_SIZE = 120;
const EXPORT_SCALE = 4;
const MONSTER_SIZE = SOURCE_MONSTER_SIZE * EXPORT_SCALE;
const PARTS = {
  legs: 5,
  hair: 5,
  arms: 5,
  body: 15,
  eyes: 15,
  mouth: 10
};

const PART_ORDER = ['legs', 'hair', 'arms', 'body', 'eyes', 'mouth'];

const resultImage = document.getElementById('monster-result');
const statusNode = document.getElementById('status');
const galleryNode = document.getElementById('gallery');
const downloadCurrentLink = document.getElementById('download-current');
const panelV1 = document.getElementById('panel-v1');
const panelV2 = document.getElementById('panel-v2');
const modeButtons = document.querySelectorAll('.mode-button');
const colorInput = document.getElementById('body-color');
const countInput = document.getElementById('monster-count');
const randomCountInput = document.getElementById('random-count');
const infoResolutionNode = document.getElementById('info-resolution');
const infoCacheNode = document.getElementById('info-cache');
const infoDurationNode = document.getElementById('info-duration');
const infoBatchNode = document.getElementById('info-batch');
const selectNodes = {
  legs: document.getElementById('pick-legs'),
  hair: document.getElementById('pick-hair'),
  arms: document.getElementById('pick-arms'),
  body: document.getElementById('pick-body'),
  eyes: document.getElementById('pick-eyes'),
  mouth: document.getElementById('pick-mouth')
};

const imageCache = new Map();

initialize();

function initialize() {
  populatePartSelects();
  updateEngineInfo({ durationMs: null, batchSize: 0 });

  document.getElementById('generate-button').addEventListener('click', generateMonsterV1);
  document.getElementById('generate-custom-button').addEventListener('click', generateMonsterV2);

  modeButtons.forEach((button) => {
    button.addEventListener('click', () => switchMode(button.dataset.mode));
  });
}

function populatePartSelects() {
  for (const part of PART_ORDER) {
    const select = selectNodes[part];
    for (let i = 1; i <= PARTS[part]; i += 1) {
      const option = document.createElement('option');
      option.value = String(i);
      option.textContent = `${partLabel(part)} ${i}`;
      select.append(option);
    }
  }
}

function partLabel(part) {
  const labels = {
    legs: 'Nogi',
    hair: 'Włosy',
    arms: 'Ręce',
    body: 'Tułów',
    eyes: 'Oczy',
    mouth: 'Usta'
  };
  return labels[part] || part;
}

function switchMode(mode) {
  const isV1 = mode === 'v1';
  panelV1.hidden = !isV1;
  panelV2.hidden = isV1;

  modeButtons.forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });

  statusNode.textContent = isV1
    ? 'Tryb wersji 1: losowanie 1-50 w pełni losowych potworków.'
    : 'Tryb wersji 2: wybierz składniki i liczbę potworków (1-50).';
}

async function generateMonsterV1() {
  statusNode.textContent = 'Generowanie losowych MonsterID (wersja 1)…';
  const startedAt = performance.now();

  try {
    const requestedCount = Number.parseInt(randomCountInput.value, 10);
    const count = clamp(Number.isNaN(requestedCount) ? 1 : requestedCount, 1, 50);
    randomCountInput.value = String(count);

    const seed = `${Date.now()}-${Math.random()}`;
    const rng = createRngFromSeed(seed);
    const monsters = await Promise.all(
      Array.from({ length: count }, async (_, index) => {
        const picks = randomPicks(rng);
        const color = randomBodyColor(rng);
        const canvas = await renderMonsterCanvas({ picks, color });
        return {
          dataUrl: canvas.toDataURL('image/png'),
          filename: `monsterid-v1-${index + 1}.png`,
          alt: describeMonster(picks)
        };
      })
    );

    showPrimaryResult(monsters[0].dataUrl, monsters[0].alt, monsters[0].filename);
    renderGallery(monsters.length > 1 ? monsters.slice(1) : []);

    const duration = performance.now() - startedAt;
    statusNode.textContent = `Wygenerowano ${count} losowych MonsterID w wersji 1 (${Math.round(duration)} ms).`;
    updateEngineInfo({ durationMs: duration, batchSize: count });
  } catch (error) {
    handleGenerationError(error);
  }
}

async function generateMonsterV2() {
  statusNode.textContent = 'Generowanie MonsterID (wersja 2)…';
  const startedAt = performance.now();

  try {
    const picks = {
      legs: Number.parseInt(selectNodes.legs.value, 10),
      hair: Number.parseInt(selectNodes.hair.value, 10),
      arms: Number.parseInt(selectNodes.arms.value, 10),
      body: Number.parseInt(selectNodes.body.value, 10),
      eyes: Number.parseInt(selectNodes.eyes.value, 10),
      mouth: Number.parseInt(selectNodes.mouth.value, 10)
    };

    const requestedCount = Number.parseInt(countInput.value, 10);
    const count = clamp(Number.isNaN(requestedCount) ? 1 : requestedCount, 1, 50);
    countInput.value = String(count);

    const baseColor = hexToRgba(colorInput.value || '#60a5fa');
    const rng = createRngFromSeed(`${Date.now()}-${Math.random()}-${JSON.stringify(picks)}`);

    const monsters = await Promise.all(
      Array.from({ length: count }, async (_, index) => {
        const color = index === 0 ? baseColor : mutateColor(baseColor, rng);
        const canvas = await renderMonsterCanvas({ picks, color });
        return {
          dataUrl: canvas.toDataURL('image/png'),
          filename: `monsterid-v2-${index + 1}.png`,
          alt: describeMonster(picks)
        };
      })
    );

    showPrimaryResult(monsters[0].dataUrl, monsters[0].alt, monsters[0].filename);
    renderGallery(monsters.length > 1 ? monsters.slice(1) : []);

    const duration = performance.now() - startedAt;
    statusNode.textContent = `Wygenerowano ${count} MonsterID w wersji 2 (${Math.round(duration)} ms).`;
    updateEngineInfo({ durationMs: duration, batchSize: count });
  } catch (error) {
    handleGenerationError(error);
  }
}

function showPrimaryResult(dataUrl, alt, filename) {
  resultImage.src = dataUrl;
  resultImage.alt = alt;
  resultImage.hidden = false;

  downloadCurrentLink.href = dataUrl;
  downloadCurrentLink.target = '_blank';
  downloadCurrentLink.rel = 'noopener noreferrer';
  downloadCurrentLink.removeAttribute('download');
  downloadCurrentLink.textContent = `Otwórz ${filename} w nowej karcie`;
  downloadCurrentLink.hidden = false;
}

function renderGallery(monsters) {
  galleryNode.replaceChildren();

  monsters.forEach((monster, index) => {
    const article = document.createElement('article');
    article.className = 'gallery-item';

    const img = document.createElement('img');
    img.src = monster.dataUrl;
    img.alt = `${monster.alt} #${index + 1}`;
    img.width = 120;
    img.height = 120;

    const link = document.createElement('a');
    link.href = monster.dataUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = `Otwórz ${monster.filename}`;

    article.append(img, link);
    galleryNode.append(article);
  });
}

function handleGenerationError(error) {
  console.error(error);
  statusNode.textContent = 'Nie udało się wygenerować MonsterID. Spróbuj ponownie.';
}

function updateEngineInfo({ durationMs, batchSize }) {
  infoResolutionNode.textContent = `${MONSTER_SIZE}×${MONSTER_SIZE} px`;
  infoCacheNode.textContent = `${imageCache.size} plików`;
  infoDurationNode.textContent = durationMs == null ? '—' : `${Math.round(durationMs)} ms`;
  infoBatchNode.textContent = String(batchSize);
}

function randomPicks(rng) {
  return {
    legs: randInt(rng, 1, PARTS.legs),
    hair: randInt(rng, 1, PARTS.hair),
    arms: randInt(rng, 1, PARTS.arms),
    body: randInt(rng, 1, PARTS.body),
    eyes: randInt(rng, 1, PARTS.eyes),
    mouth: randInt(rng, 1, PARTS.mouth)
  };
}

function randomBodyColor(rng) {
  return [randInt(rng, 20, 235), randInt(rng, 20, 235), randInt(rng, 20, 235), 255];
}

function mutateColor(baseColor, rng) {
  const variance = 45;
  return [
    clamp(baseColor[0] + randInt(rng, -variance, variance), 20, 235),
    clamp(baseColor[1] + randInt(rng, -variance, variance), 20, 235),
    clamp(baseColor[2] + randInt(rng, -variance, variance), 20, 235),
    255
  ];
}

function describeMonster(picks) {
  return `MonsterID (nogi ${picks.legs}, włosy ${picks.hair}, ręce ${picks.arms}, tułów ${picks.body}, oczy ${picks.eyes}, usta ${picks.mouth}).`;
}

async function renderMonsterCanvas({ picks, color }) {
  const canvas = document.createElement('canvas');
  canvas.width = SOURCE_MONSTER_SIZE;
  canvas.height = SOURCE_MONSTER_SIZE;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, SOURCE_MONSTER_SIZE, SOURCE_MONSTER_SIZE);

  await drawPart(ctx, `parts/legs_${picks.legs}.png`);
  await drawPart(ctx, `parts/hair_${picks.hair}.png`);
  await drawPart(ctx, `parts/arms_${picks.arms}.png`);

  const bodyCanvas = document.createElement('canvas');
  bodyCanvas.width = SOURCE_MONSTER_SIZE;
  bodyCanvas.height = SOURCE_MONSTER_SIZE;
  const bodyCtx = bodyCanvas.getContext('2d');

  await drawPart(bodyCtx, `parts/body_${picks.body}.png`);

  floodFillBody(bodyCtx, {
    x: 60,
    y: 60,
    color
  });

  ctx.drawImage(bodyCanvas, 0, 0);

  await drawPart(ctx, `parts/eyes_${picks.eyes}.png`);
  await drawPart(ctx, `parts/mouth_${picks.mouth}.png`);

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = MONSTER_SIZE;
  exportCanvas.height = MONSTER_SIZE;
  const exportCtx = exportCanvas.getContext('2d');
  exportCtx.imageSmoothingEnabled = false;
  exportCtx.drawImage(canvas, 0, 0, MONSTER_SIZE, MONSTER_SIZE);

  return exportCanvas;
}

async function drawPart(ctx, src) {
  const image = await loadImage(src);
  ctx.drawImage(image, 0, 0, SOURCE_MONSTER_SIZE, SOURCE_MONSTER_SIZE);
}

function loadImage(src) {
  if (imageCache.has(src)) {
    return imageCache.get(src);
  }

  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Nie udało się załadować ${src}`));
    img.src = src;
  });

  imageCache.set(src, promise);
  return promise;
}

function hexToRgba(hex) {
  const normalized = hex.replace('#', '');
  const isValid = /^[0-9a-fA-F]{6}$/.test(normalized);
  if (!isValid) return [96, 165, 250, 255];

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return [r, g, b, 255];
}

function floodFillBody(ctx, { x, y, color }) {
  const imageData = ctx.getImageData(0, 0, SOURCE_MONSTER_SIZE, SOURCE_MONSTER_SIZE);
  const { data } = imageData;
  const start = (y * SOURCE_MONSTER_SIZE + x) * 4;
  const target = [data[start], data[start + 1], data[start + 2], data[start + 3]];

  if (sameColor(target, color)) return;

  const stack = [[x, y]];
  while (stack.length) {
    const [cx, cy] = stack.pop();
    if (cx < 0 || cy < 0 || cx >= SOURCE_MONSTER_SIZE || cy >= SOURCE_MONSTER_SIZE) continue;

    const idx = (cy * SOURCE_MONSTER_SIZE + cx) * 4;
    const current = [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
    if (!sameColor(current, target)) continue;

    data[idx] = color[0];
    data[idx + 1] = color[1];
    data[idx + 2] = color[2];
    data[idx + 3] = color[3];

    stack.push([cx + 1, cy]);
    stack.push([cx - 1, cy]);
    stack.push([cx, cy + 1]);
    stack.push([cx, cy - 1]);
  }

  ctx.putImageData(imageData, 0, 0);
}

function sameColor(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createRngFromSeed(seedText) {
  const seed = parseInt(md5(seedText).slice(0, 6), 16) || Date.now();
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return function rng() {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function md5(input) {
  const hc = '0123456789abcdef';
  function rh(n) {
    let j;
    let s = '';
    for (j = 0; j <= 3; j += 1) {
      s += hc.charAt((n >> (j * 8 + 4)) & 0x0f) + hc.charAt((n >> (j * 8)) & 0x0f);
    }
    return s;
  }
  function ad(x, y) {
    const l = (x & 0xffff) + (y & 0xffff);
    const m = (x >> 16) + (y >> 16) + (l >> 16);
    return (m << 16) | (l & 0xffff);
  }
  function rl(n, c) {
    return (n << c) | (n >>> (32 - c));
  }
  function cm(q, a, b, x, s, t) {
    return ad(rl(ad(ad(a, q), ad(x, t)), s), b);
  }
  function ff(a, b, c, d, x, s, t) {
    return cm((b & c) | (~b & d), a, b, x, s, t);
  }
  function gg(a, b, c, d, x, s, t) {
    return cm((b & d) | (c & ~d), a, b, x, s, t);
  }
  function hh(a, b, c, d, x, s, t) {
    return cm(b ^ c ^ d, a, b, x, s, t);
  }
  function ii(a, b, c, d, x, s, t) {
    return cm(c ^ (b | ~d), a, b, x, s, t);
  }
  function sb(x) {
    const nblk = ((x.length + 8) >> 6) + 1;
    const blks = new Array(nblk * 16).fill(0);
    for (let i = 0; i < x.length; i += 1) {
      blks[i >> 2] |= x.charCodeAt(i) << ((i % 4) * 8);
    }
    blks[x.length >> 2] |= 0x80 << ((x.length % 4) * 8);
    blks[nblk * 16 - 2] = x.length * 8;
    return blks;
  }

  const x = sb(input);
  let a = 1732584193;
  let b = -271733879;
  let c = -1732584194;
  let d = 271733878;

  for (let i = 0; i < x.length; i += 16) {
    const oa = a;
    const ob = b;
    const oc = c;
    const od = d;

    a = ff(a, b, c, d, x[i], 7, -680876936);
    d = ff(d, a, b, c, x[i + 1], 12, -389564586);
    c = ff(c, d, a, b, x[i + 2], 17, 606105819);
    b = ff(b, c, d, a, x[i + 3], 22, -1044525330);
    a = ff(a, b, c, d, x[i + 4], 7, -176418897);
    d = ff(d, a, b, c, x[i + 5], 12, 1200080426);
    c = ff(c, d, a, b, x[i + 6], 17, -1473231341);
    b = ff(b, c, d, a, x[i + 7], 22, -45705983);
    a = ff(a, b, c, d, x[i + 8], 7, 1770035416);
    d = ff(d, a, b, c, x[i + 9], 12, -1958414417);
    c = ff(c, d, a, b, x[i + 10], 17, -42063);
    b = ff(b, c, d, a, x[i + 11], 22, -1990404162);
    a = ff(a, b, c, d, x[i + 12], 7, 1804603682);
    d = ff(d, a, b, c, x[i + 13], 12, -40341101);
    c = ff(c, d, a, b, x[i + 14], 17, -1502002290);
    b = ff(b, c, d, a, x[i + 15], 22, 1236535329);

    a = gg(a, b, c, d, x[i + 1], 5, -165796510);
    d = gg(d, a, b, c, x[i + 6], 9, -1069501632);
    c = gg(c, d, a, b, x[i + 11], 14, 643717713);
    b = gg(b, c, d, a, x[i], 20, -373897302);
    a = gg(a, b, c, d, x[i + 5], 5, -701558691);
    d = gg(d, a, b, c, x[i + 10], 9, 38016083);
    c = gg(c, d, a, b, x[i + 15], 14, -660478335);
    b = gg(b, c, d, a, x[i + 4], 20, -405537848);
    a = gg(a, b, c, d, x[i + 9], 5, 568446438);
    d = gg(d, a, b, c, x[i + 14], 9, -1019803690);
    c = gg(c, d, a, b, x[i + 3], 14, -187363961);
    b = gg(b, c, d, a, x[i + 8], 20, 1163531501);
    a = gg(a, b, c, d, x[i + 13], 5, -1444681467);
    d = gg(d, a, b, c, x[i + 2], 9, -51403784);
    c = gg(c, d, a, b, x[i + 7], 14, 1735328473);
    b = gg(b, c, d, a, x[i + 12], 20, -1926607734);

    a = hh(a, b, c, d, x[i + 5], 4, -378558);
    d = hh(d, a, b, c, x[i + 8], 11, -2022574463);
    c = hh(c, d, a, b, x[i + 11], 16, 1839030562);
    b = hh(b, c, d, a, x[i + 14], 23, -35309556);
    a = hh(a, b, c, d, x[i + 1], 4, -1530992060);
    d = hh(d, a, b, c, x[i + 4], 11, 1272893353);
    c = hh(c, d, a, b, x[i + 7], 16, -155497632);
    b = hh(b, c, d, a, x[i + 10], 23, -1094730640);
    a = hh(a, b, c, d, x[i + 13], 4, 681279174);
    d = hh(d, a, b, c, x[i], 11, -358537222);
    c = hh(c, d, a, b, x[i + 3], 16, -722521979);
    b = hh(b, c, d, a, x[i + 6], 23, 76029189);
    a = hh(a, b, c, d, x[i + 9], 4, -640364487);
    d = hh(d, a, b, c, x[i + 12], 11, -421815835);
    c = hh(c, d, a, b, x[i + 15], 16, 530742520);
    b = hh(b, c, d, a, x[i + 2], 23, -995338651);

    a = ii(a, b, c, d, x[i], 6, -198630844);
    d = ii(d, a, b, c, x[i + 7], 10, 1126891415);
    c = ii(c, d, a, b, x[i + 14], 15, -1416354905);
    b = ii(b, c, d, a, x[i + 5], 21, -57434055);
    a = ii(a, b, c, d, x[i + 12], 6, 1700485571);
    d = ii(d, a, b, c, x[i + 3], 10, -1894986606);
    c = ii(c, d, a, b, x[i + 10], 15, -1051523);
    b = ii(b, c, d, a, x[i + 1], 21, -2054922799);
    a = ii(a, b, c, d, x[i + 8], 6, 1873313359);
    d = ii(d, a, b, c, x[i + 15], 10, -30611744);
    c = ii(c, d, a, b, x[i + 6], 15, -1560198380);
    b = ii(b, c, d, a, x[i + 13], 21, 1309151649);
    a = ii(a, b, c, d, x[i + 4], 6, -145523070);
    d = ii(d, a, b, c, x[i + 11], 10, -1120210379);
    c = ii(c, d, a, b, x[i + 2], 15, 718787259);
    b = ii(b, c, d, a, x[i + 9], 21, -343485551);

    a = ad(a, oa);
    b = ad(b, ob);
    c = ad(c, oc);
    d = ad(d, od);
  }

  return rh(a) + rh(b) + rh(c) + rh(d);
}

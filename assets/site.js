/* xsections.co. Everything that moves on this page is computed by an unmodified copy of the Xsections simulation,
   compiled to WebAssembly (engine/). This script only draws what the engine computes, and translates the page. */
(() => {
  'use strict';
  const root = document.documentElement;
  const css = name => getComputedStyle(root).getPropertyValue(name).trim();
  const $ = id => document.getElementById(id);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const TAU = Math.PI * 2, TICK = 1 / 30, GRADES = 'ABCDEF';
  const CONFIG = window.XSECTIONS_CONFIG || {};
  const DICT = window.XS_I18N;

  // ================================================================== language
  // The English is the page itself: keep it, then swap in the French when asked.
  const english = new Map(), englishAttr = new Map();
  document.querySelectorAll('[data-i18n]').forEach(el => english.set(el, el.innerHTML));
  document.querySelectorAll('[data-i18n-attr]').forEach(el => {
    const attrs = {};
    el.dataset.i18nAttr.split(';').forEach(pair => { const name = pair.split(':')[0]; attrs[name] = el.getAttribute(name); });
    englishAttr.set(el, attrs);
  });
  const metaDesc = document.querySelector('meta[name="description"]');
  const englishMeta = { title: document.title, desc: metaDesc ? metaDesc.content : '' };
  const store = {
    get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* private window */ } },
  };
  function pickLang() {
    let asked = null;
    try { asked = new URLSearchParams(location.search).get('lang'); } catch (e) { /* no query string */ }
    if (asked === 'en' || asked === 'fr') return asked;
    const saved = store.get('xs-lang');
    if (saved === 'en' || saved === 'fr') return saved;
    return (navigator.languages || [navigator.language]).some(l => /^fr\b/i.test(l || '')) ? 'fr' : 'en';
  }
  let lang = pickLang();
  const t = (key, vars) => {
    let s = DICT.both[lang][key] ?? DICT.both.en[key] ?? key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => vars[k]);
    return s;
  };
  const fmt = (value, digits = 0) => value.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
  const reasons = () => t('reasons').split('|');
  function applyLang() {
    const fr = lang === 'fr';
    root.lang = lang;
    for (const [el, html] of english) { const key = el.dataset.i18n; el.innerHTML = fr && DICT.fr[key] != null ? DICT.fr[key] : html; }
    for (const [el, attrs] of englishAttr) {
      el.dataset.i18nAttr.split(';').forEach(pair => { const [name, key] = pair.split(':'); el.setAttribute(name, fr && DICT.fr[key] != null ? DICT.fr[key] : attrs[name]); });
    }
    document.title = fr ? DICT.fr['meta.title'] : englishMeta.title;
    if (metaDesc) metaDesc.content = fr ? DICT.fr['meta.desc'] : englishMeta.desc;
    document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    buildTicker();
    document.dispatchEvent(new CustomEvent('langchange'));
  }
  const onLang = fn => document.addEventListener('langchange', fn);
  document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.lang === lang) return;
    lang = b.dataset.lang; store.set('xs-lang', lang); applyLang();
  }));

  // ================================================================== links, menu, glass
  const steam = String(CONFIG.steam || '').trim();
  document.querySelectorAll('[data-steam]').forEach(a => { if (!steam) a.hidden = true; else if (a.tagName === 'A') a.href = steam; });
  document.querySelectorAll('[data-nosteam]').forEach(a => { a.hidden = Boolean(steam); });

  const menuBtn = $('menu-btn'), navLinks = $('nav-links');
  const setMenu = open => { menuBtn.setAttribute('aria-expanded', String(open)); document.body.classList.toggle('menu-open', open); };
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  navLinks.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  const navAnchors = [...navLinks.querySelectorAll('a')];
  const spy = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) navAnchors.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + entry.target.id));
  }), { rootMargin: '-40% 0px -55% 0px' });
  ['fix', 'engine', 'bench', 'game', 'community'].forEach(id => spy.observe($(id)));
  const nav = document.querySelector('.nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Glass catches the light under the pointer.
  let litEl = null;
  document.addEventListener('pointermove', e => {
    const el = e.target.closest && e.target.closest('.glass');
    if (litEl && litEl !== el) litEl.classList.remove('lit');
    litEl = el;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    el.classList.add('lit');
  }, { passive: true });

  function buildTicker() {
    const track = $('ticker');
    const items = t('ticker').split('|').map(s => `<span>${s}</span>`).join('');
    track.innerHTML = items + items;
  }

  // ================================================================== screenshots
  const viewer = $('viewer'), shots = [...document.querySelectorAll('[data-shot]')];
  let shown = 0;
  function showShot(i) {
    shown = (i + shots.length) % shots.length;
    const img = shots[shown].querySelector('img');
    $('viewer-img').src = `img/shots/${shots[shown].dataset.shot}.webp`;
    $('viewer-img').alt = img.alt; $('viewer-cap').textContent = img.alt;
  }
  shots.forEach((b, i) => b.addEventListener('click', () => {
    showShot(i);
    if (typeof viewer.showModal === 'function') viewer.showModal(); else viewer.setAttribute('open', '');
  }));
  $('viewer-close').addEventListener('click', () => viewer.close());
  $('viewer-prev').addEventListener('click', () => showShot(shown - 1));
  $('viewer-next').addEventListener('click', () => showShot(shown + 1));
  viewer.addEventListener('click', e => { if (e.target === viewer) viewer.close(); });
  viewer.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') showShot(shown - 1); if (e.key === 'ArrowRight') showShot(shown + 1); });

  // ================================================================== drawing helpers
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function seeded(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let v = Math.imul(seed ^ seed >>> 15, 1 | seed); v = v + Math.imul(v ^ v >>> 7, 61 | v) ^ v; return ((v ^ v >>> 14) >>> 0) / 4294967296; }; }
  function mix(a, b, k) {
    const ch = s => [(s >> 16) & 255, (s >> 8) & 255, s & 255];
    const ca = ch(parseInt(a.slice(1), 16)), cb = ch(parseInt(b.slice(1), 16));
    return 'rgb(' + ca.map((v, i) => Math.round(v + (cb[i] - v) * k)).join(',') + ')';
  }
  function makeGlow(rgb, a) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, `rgba(${rgb},${a})`); grd.addColorStop(.35, `rgba(${rgb},${a * .45})`); grd.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64); return c;
  }
  function hull(points) {
    const p = [...points].sort((a, b) => a.x - b.x || a.y - b.y), cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lo = [], up = [];
    for (const q of p) { while (lo.length > 1 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (const q of p.reverse()) { while (up.length > 1 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  const len = p => Math.hypot(p.x, p.y);
  const parseGeometry = raw => {
    const paths = [];
    for (let k = 0; k < raw.length;) {
      const kind = raw[k], width = raw[k + 1], n = raw[k + 2], pts = [];
      for (let i = 0; i < n; i++) pts.push({ x: raw[k + 3 + 2 * i], y: raw[k + 4 + 2 * i] });
      paths.push({ kind, width, pts }); k += 3 + 2 * n;
    }
    return paths;
  };
  const parseState = a => {
    const m = new Map(), n = a[5];
    for (let i = 0, k = 6; i < n; i++, k += 10) m.set(a[k], { x: a[k + 1], y: a[k + 2], dx: a[k + 3], dy: a[k + 4], v: a[k + 5], acc: a[k + 6], l: a[k + 7], w: a[k + 8], wait: a[k + 9] });
    return { time: a[0], exited: a[1], hes: a[2], grid: a[3], entered: a[4], m };
  };
  const setGrade = (el, score) => {
    if (score[0]) { el.textContent = GRADES[score[3]]; el.dataset.level = String(score[3]); }
    else { el.textContent = '–'; el.dataset.level = ''; }
  };

  // Road signs, drawn like the ones on the map: 0 priority to the right (AB1), 1 stop, 2 give way, 3 lights, 4 roundabout, 5 priority road.
  function tri(g, r, down) {
    g.beginPath();
    for (let i = 0; i < 3; i++) { const a = (down ? Math.PI / 2 : -Math.PI / 2) + i * TAU / 3; g.lineTo(Math.cos(a) * r, Math.sin(a) * r + (down ? -r * 0.15 : r * 0.15)); }
    g.closePath();
  }
  function drawSign(g, kind, x, y, r) {
    g.save(); g.translate(x, y); g.lineJoin = 'round';
    if (kind === 0) {
      tri(g, r, false); g.fillStyle = '#fff'; g.fill(); g.lineWidth = r * 0.22; g.strokeStyle = '#d6433a'; g.stroke();
      g.strokeStyle = '#1b2232'; g.lineWidth = r * 0.16; g.beginPath(); g.moveTo(-r * 0.28, -r * 0.05); g.lineTo(r * 0.28, r * 0.5); g.moveTo(r * 0.28, -r * 0.05); g.lineTo(-r * 0.28, r * 0.5); g.stroke();
    } else if (kind === 1) {
      g.beginPath(); for (let i = 0; i < 8; i++) { const a = TAU * (i + 0.5) / 8; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath();
      g.fillStyle = '#d6433a'; g.fill(); g.lineWidth = Math.max(1, r * 0.1); g.strokeStyle = '#fff'; g.stroke();
      if (r > 6) { g.fillStyle = '#fff'; g.font = `700 ${r * 0.62}px Lexend, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('STOP', 0, r * 0.04); }
    } else if (kind === 2) {
      tri(g, r, true); g.fillStyle = '#fff'; g.fill(); g.lineWidth = r * 0.24; g.strokeStyle = '#d6433a'; g.stroke();
    } else if (kind === 3) {
      const w = r * 0.9, h = r * 2;
      rr(g, -w / 2, -h / 2, w, h, w * 0.35); g.fillStyle = '#222838'; g.fill();
      ['#ff5a4e', '#ffc04a', '#3fcf7f'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(0, -h / 2 + h * (i + 0.5) / 3, w * 0.28, 0, TAU); g.fill(); });
    } else if (kind === 4) {
      g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fillStyle = '#2c6bcc'; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = r * 0.14;
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + i * TAU / 3; g.beginPath(); g.arc(0, 0, r * 0.5, a + 0.25, a + 1.75); g.stroke();
        const e = a + 1.75, hx = Math.cos(e) * r * 0.5, hy = Math.sin(e) * r * 0.5, tx = -Math.sin(e), ty = Math.cos(e);
        g.fillStyle = '#fff'; g.beginPath(); g.moveTo(hx + tx * r * 0.28, hy + ty * r * 0.28); g.lineTo(hx - ty * r * 0.2, hy + tx * r * 0.2); g.lineTo(hx + ty * r * 0.2, hy - tx * r * 0.2); g.fill();
      }
    } else if (kind === 5) {
      g.rotate(Math.PI / 4); g.fillStyle = '#fff'; g.fillRect(-r * 0.72, -r * 0.72, r * 1.44, r * 1.44); g.fillStyle = '#f3c21b'; g.fillRect(-r * 0.48, -r * 0.48, r * 0.96, r * 0.96);
      g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 0.8; g.strokeRect(-r * 0.72, -r * 0.72, r * 1.44, r * 1.44);
    }
    g.restore();
  }
  function signIcon(c, kind) {
    const d = 2, s = 30; c.width = c.height = s * d; const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, s, s);
    drawSign(g, kind, s / 2, s / 2, 12.5);
  }
  const drawSigns = () => document.querySelectorAll('canvas.sign[data-sign]').forEach(c => signIcon(c, +c.dataset.sign));
  drawSigns();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawSigns);

  // Night palette of the map, read once from the page's tokens.
  const CARS = ['#f2876b', '#f6d46a', '#9fcbea', '#a9d9b1', '#f3ead8', '#e86f6f', '#c9b3e8', '#f7b267'].map(c => mix(c, '#141a3a', .5));
  const REASON_TOKENS = [null, '--x-slate', '--stop', '--x-violet', '--x-blue', '--x-orange', '--x-yellow', '--x-green', '--stop', '--x-blue', '--stop'];
  let PAL = null;
  function palette() {
    if (PAL) return PAL;
    PAL = {
      road: css('--tr-road'), edge: css('--tr-edge'), dash: css('--tr-dash'), island: css('--tr-island'), grass: css('--tr-grass'),
      tree: css('--tr-tree'), tree2: css('--tr-tree-2'), orange: css('--x-orange'), reason: REASON_TOKENS.map(k => k && css(k)),
      glow: {
        warm: makeGlow('255,226,170', .85), red: makeGlow('255,60,50', .9), lamp: makeGlow('255,200,120', .5), held: makeGlow('255,150,80', .95),
        green: makeGlow('80,230,140', .9), amber: makeGlow('255,200,80', .9), stop: makeGlow('255,80,70', .9),
      },
    };
    return PAL;
  }
  function drawCar(ctx, p, hx, hy, b, id, alpha, S, flipY) {
    const pal = palette();
    const l = b.l * S, w = b.w * S, r = w * 0.32, braking = b.acc < -0.4 || b.v < 0.4;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(flipY ? -hy : hy, hx));
    ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(pal.glow.warm, l * 0.35, -w * 1.1, l * 1.9, w * 2.2); ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = CARS[id % CARS.length]; rr(ctx, -l / 2, -w / 2, l, w, r); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.10)'; rr(ctx, -l * 0.2, -w * 0.36, l * 0.4, w * 0.72, r * 0.7); ctx.fill();
    ctx.fillStyle = 'rgba(10,14,30,.6)'; ctx.fillRect(l * 0.2, -w * 0.33, l * 0.09, w * 0.66);
    ctx.fillStyle = 'rgba(255,244,214,.95)'; ctx.fillRect(l / 2 - 1.6, -w * 0.38, 1.6, w * 0.22); ctx.fillRect(l / 2 - 1.6, w * 0.16, 1.6, w * 0.22);
    const s = braking ? l * 1.1 : l * 0.6;
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha * (braking ? 1 : 0.5);
    ctx.drawImage(pal.glow.red, -l / 2 - s * 0.55, -s / 2, s, s);
    ctx.globalAlpha = alpha; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = braking ? '#ff4b3e' : '#a8322c'; ctx.fillRect(-l / 2, -w * 0.4, 1.6, w * 0.24); ctx.fillRect(-l / 2, w * 0.16, 1.6, w * 0.24);
    ctx.restore();
  }

  // ================================================================== the engine
  let enginePromise = null, SIM = null;
  const engine = () => enginePromise || (enginePromise = (async () => {
    // Relative to the page, not to this script, so the same files work at the site root and in a preview.
    const { dotnet } = await import(new URL('engine/dotnet.js', document.baseURI).href);
    const runtime = await dotnet.withConfig({ disableIntegrityCheck: true }).create();
    SIM = (await runtime.getAssemblyExports('Host.dll')).Sim;
    return SIM;
  })());
  const nextFrame = () => new Promise(requestAnimationFrame);

  // Runs a loop only while its element is on screen and the tab is visible.
  function whileVisible(el, frame) {
    let visible = false, raf = 0, last = 0;
    const loop = now => { const dt = Math.min(0.1, (now - last) / 1000); last = now; frame(dt, now); raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0; };
    const start = () => { if (!raf && visible && !document.hidden && !reduceMotion.matches) { last = performance.now(); raf = requestAnimationFrame(loop); } };
    new IntersectionObserver(e => { visible = e[0].isIntersecting; start(); }, { rootMargin: '80px' }).observe(el);
    document.addEventListener('visibilitychange', start);
    reduceMotion.addEventListener('change', start);
    return { start, get visible() { return visible; } };
  }

  // ================================================================== slot 0: the roundabout of the hero
  async function heroSim() {
    const Sim = await engine();
    Sim.Init(2027, 6);
    const stage = $('hero-stage'), cv = $('hero-sim'), ctx = cv.getContext('2d');
    const layer = document.createElement('canvas'), lctx = layer.getContext('2d');
    const ROT = -0.7; // the engine's E/N/W/S arms, turned into an X
    const paths = parseGeometry(Sim.Geometry(0));
    const lanes = paths.filter(p => p.kind === 0);
    const inbound = lanes.filter(l => len(l.pts[0]) > 40 && len(l.pts[l.pts.length - 1]) < len(l.pts[0]));
    const ring = lanes.filter(l => Math.max(...l.pts.map(len)) < 30);
    const ringR = ring.length ? ring[0].pts.reduce((a, p) => a + len(p), 0) / ring[0].pts.length : 14;
    const ringW = ring.length ? ring[0].width : 4;
    const reach = Math.max(...lanes.map(l => Math.max(...l.pts.map(len))));
    const armDirs = inbound.map(l => { const p = l.pts[0], d = len(p); return { x: p.x / d, y: p.y / d }; });
    let W = 1, H = 1, dpr = 1, C = { x: 0, y: 0 }, S = 1, speed = 1;
    const toScreen = p => { const x = p.x, y = -p.y, c = Math.cos(ROT), s = Math.sin(ROT); return { x: C.x + S * (x * c - y * s), y: C.y + S * (x * s + y * c) }; };
    const stroke = (g, pts, w, color, dash) => {
      g.strokeStyle = color; g.lineWidth = w; g.setLineDash(dash || []);
      g.beginPath(); pts.forEach((p, i) => { const q = toScreen(p); i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y); }); g.stroke();
    };
    function layout() {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(2, devicePixelRatio || 1); W = Math.max(1, r.width); H = Math.max(1, r.height);
      cv.width = layer.width = Math.round(W * dpr); cv.height = layer.height = Math.round(H * dpr);
      C = { x: W / 2, y: H / 2 };
      S = Math.min(W, H) * 0.24 / (ringR + ringW / 2);
      drawLayer();
    }
    function drawLayer() {
      const g = lctx, pal = palette();
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      g.lineCap = 'round'; g.lineJoin = 'round';
      const rnd = seeded(42);
      for (let n = 0; n < 90; n++) {
        const th = rnd() * TAU, dist = (ringR + 10) + rnd() * 48, tr = 1.6 + rnd() * 1.8;
        const p = { x: Math.cos(th) * dist, y: Math.sin(th) * dist };
        const clear = armDirs.every(a => { const along = p.x * a.x + p.y * a.y, lat = Math.abs(p.x * a.y - p.y * a.x); return along < 0 || lat > 6.5 + tr; });
        if (!clear) continue;
        const q = toScreen(p), r = tr * S;
        g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(q.x + r * 0.45, q.y + r * 0.55, r, r * 0.8, 0, 0, TAU); g.fill();
        g.fillStyle = pal.tree2; g.beginPath(); g.arc(q.x, q.y, r, 0, TAU); g.fill();
        g.fillStyle = pal.tree; g.beginPath(); g.arc(q.x - r * 0.2, q.y - r * 0.22, r * 0.72, 0, TAU); g.fill();
      }
      paths.forEach(p => stroke(g, p.pts, (p.width + 2.6) * S, pal.edge));
      paths.forEach(p => stroke(g, p.pts, (p.width + 0.15) * S, pal.road));
      const c = toScreen({ x: 0, y: 0 });
      g.fillStyle = pal.edge; g.beginPath(); g.arc(c.x, c.y, (ringR - ringW / 2) * S, 0, TAU); g.fill();
      g.fillStyle = pal.island; g.beginPath(); g.arc(c.x, c.y, (ringR - ringW / 2 - 1) * S, 0, TAU); g.fill();
      const lw = Math.max(1.1, 0.15 * S);
      inbound.forEach(l => {
        const pts = l.pts.map((p, i) => {
          const q = l.pts[Math.min(i + 1, l.pts.length - 1)], o = l.pts[Math.max(i - 1, 0)];
          const dx = q.x - o.x, dy = q.y - o.y, d = Math.hypot(dx, dy) || 1;
          return { x: p.x - dy / d * l.width / 2, y: p.y + dx / d * l.width / 2 };
        });
        stroke(g, pts, lw, pal.dash, [1.3 * S, 1.6 * S]);
        const end = l.pts[l.pts.length - 1], prev = l.pts[l.pts.length - 2];
        const dx = end.x - prev.x, dy = end.y - prev.y, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
        stroke(g, [{ x: end.x - nx * l.width * 0.45, y: end.y - ny * l.width * 0.45 }, { x: end.x + nx * l.width * 0.45, y: end.y + ny * l.width * 0.45 }], Math.max(1.4, 0.3 * S), pal.dash, [0.5 * S, 0.5 * S]);
      });
      g.setLineDash([]);
      g.globalCompositeOperation = 'lighter';
      armDirs.forEach(a => {
        for (let d = ringR + 9, side = 1; d < reach; d += 16, side = -side) {
          const q = toScreen({ x: a.x * d + a.y * side * 6.2, y: a.y * d - a.x * side * 6.2 }), s = 10 * S;
          g.drawImage(pal.glow.lamp, q.x - s / 2, q.y - s / 2, s, s);
          g.fillStyle = 'rgba(255,236,200,.9)'; g.beginPath(); g.arc(q.x, q.y, Math.max(1.4, 0.22 * S), 0, TAU); g.fill();
        }
      });
      g.globalCompositeOperation = 'source-over';
    }
    let prev = parseState(Sim.State(0)), cur = prev, acc = 0;
    const tick = () => { Sim.Step(0, 1); prev = cur; cur = parseState(Sim.State(0)); };
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      ctx.drawImage(layer, 0, 0, W, H);
      const k = Math.min(1, acc / TICK);
      for (const [id, b] of cur.m) {
        const a = prev.m.get(id) || b;
        const p = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
        const alpha = Math.max(0, Math.min(1, (reach - 6 - len(p)) / 18));
        if (alpha <= 0) continue;
        const q = toScreen(p);
        if (q.x < -40 || q.y < -40 || q.x > W + 40 || q.y > H + 40) continue;
        const h = toScreen({ x: p.x + a.dx + (b.dx - a.dx) * k, y: p.y + a.dy + (b.dy - a.dy) * k });
        drawCar(ctx, q, h.x - q.x, h.y - q.y, b, id, alpha, S, false);
      }
    }
    const hud = () => {
      const s = Sim.Score(0);
      setGrade($('hh-grade'), s);
      $('hh-flow').textContent = fmt(s[4]);
      $('hh-delay').textContent = s[0] ? fmt(s[1], 1) : '–';
      $('hh-hes').textContent = fmt(cur.hes);
    };
    layout();
    // The first two minutes of the day, played at once, a few seconds per frame.
    for (let warmed = 0; warmed < 120 * 30; warmed += 300) { Sim.Step(0, 299); tick(); await nextFrame(); }
    root.classList.add('live-sim');
    draw(); hud();
    let hudAt = 0;
    whileVisible(stage, (dt, now) => {
      acc += dt * speed;
      let guard = 0;
      while (acc >= TICK && guard++ < 24) { tick(); acc -= TICK; }
      if (guard >= 24) acc = 0;
      draw();
      if (now - hudAt > 500) { hudAt = now; hud(); }
    }).start();
    document.querySelectorAll('[data-hspeed]').forEach(b => b.addEventListener('click', () => {
      speed = +b.dataset.hspeed;
      document.querySelectorAll('[data-hspeed]').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
    }));
    let rt;
    new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { layout(); draw(); }, 120); }).observe(cv);
    onLang(hud);
  }

  // ================================================================== a random junction, drawn from one engine slot
  class Plate {
    constructor(canvas, slot, viewR) {
      this.cv = canvas; this.ctx = canvas.getContext('2d');
      this.layer = document.createElement('canvas'); this.lctx = this.layer.getContext('2d');
      this.slot = slot; this.viewR = viewR; this.rule = 0; this.scope = false; this.treeSeed = 1;
      this.W = 1; this.H = 1; this.dpr = 1; this.S = 1; this.acc = 0; this.exits = [];
      this.paths = []; this.lanes = []; this.ring = []; this.ringR = 0; this.ringW = 0;
      this.approaches = []; this.arms = []; this.conflicts = []; this.lights = [];
    }
    toScreen(p) { return { x: this.W / 2 + p.x * this.S, y: this.H / 2 - p.y * this.S }; }
    size() {
      const r = this.cv.parentElement.getBoundingClientRect();
      this.dpr = Math.min(2, devicePixelRatio || 1); this.W = Math.max(1, r.width); this.H = Math.max(1, r.height);
      this.cv.width = this.layer.width = Math.round(this.W * this.dpr); this.cv.height = this.layer.height = Math.round(this.H * this.dpr);
      this.S = Math.min(this.W, this.H) / 2 / this.viewR;
    }
    load(rule, treeSeed) {
      const slot = this.slot;
      this.rule = rule; this.treeSeed = treeSeed;
      this.paths = parseGeometry(SIM.Geometry(slot));
      this.lanes = this.paths.filter(p => p.kind === 0);
      this.ring = rule === 4 ? this.lanes.filter(l => Math.max(...l.pts.map(len)) < 45) : [];
      this.ringR = this.ring.length ? this.ring.reduce((a, l) => a + l.pts.reduce((b, p) => b + len(p), 0) / l.pts.length, 0) / this.ring.length : 0;
      this.ringW = this.ring.length ? this.ring[0].width : 0;
      const ap = SIM.Approaches(slot); this.approaches = [];
      for (let k = 0; k < ap.length; k += 7) this.approaches.push({ x: ap[k], y: ap[k + 1], dx: ap[k + 2], dy: ap[k + 3], w: ap[k + 4], control: ap[k + 5], light: ap[k + 6] });
      const ar = SIM.Arms(slot); this.arms = [];
      for (let k = 0; k < ar.length; k += 4) this.arms.push({ x: ar[k], y: ar[k + 1], in: ar[k + 2], out: ar[k + 3] });
      this.readConflicts(); this.readLights(); this.reset();
    }
    readConflicts() {
      const c = SIM.Conflicts(this.slot); this.conflicts = [];
      for (let k = 0; k < c.length; k += 4) this.conflicts.push({ x: c[k], y: c[k + 1], merge: c[k + 2] === 1, held: c[k + 3] === 1 });
    }
    readLights() { const ap = SIM.Approaches(this.slot); this.lights = []; for (let k = 6; k < ap.length; k += 7) this.lights.push(ap[k]); }
    refresh() { if (this.rule === 3) this.readLights(); if (this.scope) this.readConflicts(); }
    reset() { this.prev = this.cur = parseState(SIM.State(this.slot)); this.acc = 0; this.exits = []; }
    tick() {
      SIM.Step(this.slot, 1);
      this.prev = this.cur; this.cur = parseState(SIM.State(this.slot));
      for (let i = this.prev.exited; i < this.cur.exited; i++) this.exits.push(this.cur.time);
      while (this.exits.length && this.exits[0] < this.cur.time - 60) this.exits.shift();
    }
    drawLayer() {
      const g = this.lctx, pal = palette(), W = this.W, H = this.H, S = this.S;
      const toScreen = p => this.toScreen(p);
      const stroke = (pts, w, color, dash) => {
        g.strokeStyle = color; g.lineWidth = w; g.setLineDash(dash || []);
        g.beginPath(); pts.forEach((p, i) => { const q = toScreen(p); i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y); }); g.stroke();
      };
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); g.clearRect(0, 0, W, H);
      g.lineCap = 'round'; g.lineJoin = 'round';
      const c = toScreen({ x: 0, y: 0 }), ring = this.ring, ringR = this.ringR, ringW = this.ringW;
      g.fillStyle = pal.grass; g.fillRect(0, 0, W, H);
      const rnd = seeded(this.treeSeed * 7 + this.arms.length), samples = [];
      this.paths.forEach(p => p.pts.forEach((q, i) => { if (i % 2 === 0) samples.push({ x: q.x, y: q.y, w: p.width }); }));
      const span = Math.max(W, H) / 2 / S;
      for (let n = 0; n < 150; n++) {
        const p = { x: (rnd() * 2 - 1) * span, y: (rnd() * 2 - 1) * span }, tr = 1.5 + rnd() * 1.8;
        if (ring.length && len(p) < ringR - ringW / 2 - tr - 1.5) {
          if (len(p) > ringR * 0.55 || rnd() > 0.4) continue;
        } else if (samples.some(s => Math.hypot(s.x - p.x, s.y - p.y) < s.w / 2 + 2.4 + tr)) continue;
        if (!ring.length && len(p) < 14) continue;
        const q = toScreen(p), r = tr * S;
        g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(q.x + r * 0.45, q.y + r * 0.55, r, r * 0.8, 0, 0, TAU); g.fill();
        g.fillStyle = pal.tree2; g.beginPath(); g.arc(q.x, q.y, r, 0, TAU); g.fill();
        g.fillStyle = pal.tree; g.beginPath(); g.arc(q.x - r * 0.2, q.y - r * 0.22, r * 0.72, 0, TAU); g.fill();
      }
      const ends = [];
      this.lanes.forEach(l => [l.pts[0], l.pts[l.pts.length - 1]].forEach(p => { if (len(p) < 32) ends.push(p); }));
      const area = !ring.length && ends.length > 2 ? hull(ends) : null;
      const poly = (pts, fill, strokeW) => {
        g.beginPath(); pts.forEach((p, i) => { const q = toScreen(p); i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y); }); g.closePath();
        g.fillStyle = fill; g.fill(); g.strokeStyle = fill; g.lineWidth = strokeW; g.setLineDash([]); g.stroke();
      };
      const laneW = this.lanes.length ? this.lanes[0].width : 3.5;
      this.paths.forEach(p => stroke(p.pts, (p.width + 2.6) * S, pal.edge));
      if (area) poly(area, pal.edge, (laneW + 2.6) * S);
      this.paths.forEach(p => stroke(p.pts, (p.width + 0.15) * S, pal.road));
      if (area) poly(area, pal.road, (laneW + 0.15) * S);
      if (ring.length) {
        g.fillStyle = pal.edge; g.beginPath(); g.arc(c.x, c.y, (ringR - ringW / 2) * S, 0, TAU); g.fill();
        g.fillStyle = pal.island; g.beginPath(); g.arc(c.x, c.y, (ringR - ringW / 2 - 1) * S, 0, TAU); g.fill();
      }
      const lw = Math.max(1, 0.14 * S);
      this.lanes.forEach(l => {
        if (ring.includes(l) || l.pts.length < 4) return;
        const off = l.pts.map((p, i) => {
          const q = l.pts[Math.min(i + 1, l.pts.length - 1)], o = l.pts[Math.max(i - 1, 0)];
          const dx = q.x - o.x, dy = q.y - o.y, d = Math.hypot(dx, dy) || 1;
          return { x: p.x - dy / d * l.width / 2, y: p.y + dx / d * l.width / 2 };
        });
        const mid = l.pts[Math.floor(l.pts.length / 2)], mo = off[Math.floor(off.length / 2)];
        const twin = { x: mid.x + (mo.x - mid.x) * 2, y: mid.y + (mo.y - mid.y) * 2 };
        const twoWay = this.lanes.some(o => o !== l && o.pts.some(p => Math.hypot(p.x - twin.x, p.y - twin.y) < 0.9));
        if (twoWay && len(l.pts[0]) > len(l.pts[l.pts.length - 1])) stroke(off, lw, pal.dash, [1.4 * S, 1.6 * S]);
      });
      g.setLineDash([]);
      const rb = this.rule === 4;
      this.approaches.forEach(a => {
        const nx = a.dy, ny = -a.dx;
        const across = [{ x: a.x - nx * a.w * 0.48, y: a.y - ny * a.w * 0.48 }, { x: a.x + nx * a.w * 0.48, y: a.y + ny * a.w * 0.48 }];
        const isRing = rb && a.control === 1;
        if (a.control === 2 || a.control === 4) stroke(across, Math.max(2, 0.45 * S), pal.dash);
        else if (a.control === 3 && !isRing) stroke(across, Math.max(1.6, 0.35 * S), pal.dash, [0.55 * S, 0.45 * S]);
        g.setLineDash([]);
        if (isRing) return;
        const kind = a.control === 0 ? 0 : a.control === 1 ? 5 : a.control === 2 ? 1 : a.control === 3 ? 2 : null;
        if (kind === null) return;
        const p = toScreen({ x: a.x + nx * (a.w / 2 + 1.8) - a.dx * 2.2, y: a.y + ny * (a.w / 2 + 1.8) - a.dy * 2.2 });
        const r = Math.max(5.5, 1.15 * S);
        g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(p.x + 1.5, p.y + 2, r * 0.9, 0, TAU); g.fill();
        drawSign(g, kind, p.x, p.y, r);
      });
      g.globalCompositeOperation = 'lighter';
      this.arms.forEach((a, i) => {
        const d = len(a), ux = a.x / d, uy = a.y / d;
        for (let r = (ring.length ? ringR : 8) + 10, side = i % 2 ? 1 : -1; r < span * 1.3; r += 17, side = -side) {
          const q = toScreen({ x: ux * r + uy * side * 7, y: uy * r - ux * side * 7 }), s = 11 * S;
          g.drawImage(pal.glow.lamp, q.x - s / 2, q.y - s / 2, s, s);
        }
      });
      g.globalCompositeOperation = 'destination-in';
      const fg = g.createRadialGradient(c.x, c.y, Math.min(W, H) * 0.36, c.x, c.y, Math.max(W, H) * 0.62);
      fg.addColorStop(0, 'rgba(0,0,0,1)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = fg; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
    }
    draw() {
      const ctx = this.ctx, pal = palette(), W = this.W, H = this.H, S = this.S;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      ctx.drawImage(this.layer, 0, 0, W, H);
      const k = Math.min(1, this.acc / TICK), reach = Math.max(W, H) / 2 / S * 1.05;
      if (this.rule === 3) this.approaches.forEach((a, i) => {
        const l = this.lights[i] ?? a.light; if (l < 0) return;
        const nx = a.dy, ny = -a.dx, p = this.toScreen({ x: a.x + nx * (a.w / 2 + 1.6) - a.dx * 1.2, y: a.y + ny * (a.w / 2 + 1.6) - a.dy * 1.2 });
        const glow = [pal.glow.green, pal.glow.amber, pal.glow.stop][l], col = ['#3fcf7f', '#ffc04a', '#ff5a4e'][l];
        const b0 = this.toScreen({ x: a.x - nx * a.w * 0.46 - a.dx * 0.4, y: a.y - ny * a.w * 0.46 - a.dy * 0.4 }), b1 = this.toScreen({ x: a.x + nx * a.w * 0.46 - a.dx * 0.4, y: a.y + ny * a.w * 0.46 - a.dy * 0.4 });
        const mid = { x: (b0.x + b1.x) / 2, y: (b0.y + b1.y) / 2 }, s = Math.max(22, 5.5 * S);
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.9;
        ctx.drawImage(glow, mid.x - s / 2, mid.y - s / 2, s, s); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = col; ctx.lineWidth = Math.max(2.5, 0.55 * S); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(b0.x, b0.y); ctx.lineTo(b1.x, b1.y); ctx.stroke();
        const w = Math.max(7, 1.3 * S), h = w * 2.5;
        ctx.save(); ctx.translate(p.x, p.y);
        ctx.fillStyle = 'rgba(0,0,0,.3)'; rr(ctx, -w / 2 + 1.5, -h / 2 + 2, w, h, w * 0.4); ctx.fill();
        rr(ctx, -w / 2, -h / 2, w, h, w * 0.4); ctx.fillStyle = '#1a1f2e'; ctx.fill();
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.stroke();
        for (let q = 0; q < 3; q++) { ctx.fillStyle = q === 2 - l ? col : 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.arc(0, -h / 2 + h * (q + 0.5) / 3, w * 0.3, 0, TAU); ctx.fill(); }
        ctx.restore();
      });
      if (this.scope) this.conflicts.forEach(c => {
        const q = this.toScreen(c), r = Math.max(2.4, 0.55 * S);
        if (c.held) { const s = r * 7; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(pal.glow.held, q.x - s / 2, q.y - s / 2, s, s); ctx.globalCompositeOperation = 'source-over'; }
        ctx.lineWidth = Math.max(1.2, 0.16 * S); ctx.strokeStyle = c.held ? pal.orange : 'rgba(220,230,255,.75)';
        ctx.fillStyle = c.held ? pal.orange : 'transparent';
        ctx.beginPath();
        if (c.merge) { ctx.moveTo(q.x, q.y - r); ctx.lineTo(q.x + r, q.y); ctx.lineTo(q.x, q.y + r); ctx.lineTo(q.x - r, q.y); ctx.closePath(); }
        else ctx.arc(q.x, q.y, r * 0.8, 0, TAU);
        if (c.held) ctx.fill();
        ctx.stroke();
      });
      for (const [id, b] of this.cur.m) {
        const a = this.prev.m.get(id) || b;
        const p = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
        const alpha = Math.max(0, Math.min(1, (reach - len(p)) / 14));
        if (alpha <= 0) continue;
        const q = this.toScreen(p);
        drawCar(ctx, q, a.dx + (b.dx - a.dx) * k, a.dy + (b.dy - a.dy) * k, b, id, alpha, S, true);
        if (this.scope && b.wait > 0 && pal.reason[b.wait]) {
          const rad = Math.max(3, 0.75 * S);
          ctx.globalAlpha = alpha; ctx.fillStyle = pal.reason[b.wait]; ctx.strokeStyle = '#0b1030'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(q.x, q.y, rad, 0, TAU); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
        }
      }
    }
  }

  // ================================================================== slots 2 and 3: before / after
  async function duel() {
    const box = $('duel'), msg = $('duel-msg'), msgText = $('duel-msg-text'), bar = $('duel-progress');
    try { await engine(); }
    catch (error) { msg.classList.add('down'); msgText.textContent = t('engineDown'); throw error; }
    const A = new Plate($('duel-a'), 2, 44), B = new Plate($('duel-b'), 3, 44);
    const ds = { seed: 404, arms: 4, fix: 4, flow: 6, speed: 2, traffic: 7 };
    const WARM_MIN = 3;
    let ready = false, build = 0;
    const press = (sel, test) => document.querySelectorAll(sel).forEach(b => b.setAttribute('aria-pressed', String(test(b))));
    const fixLabel = () => { $('db-rule').textContent = t('rule.' + ds.fix); const s = $('db-sign'); s.dataset.sign = String(ds.fix); signIcon(s, ds.fix); };
    function score() {
      [[2, 'da'], [3, 'db']].forEach(([slot, id]) => {
        const s = SIM.Score(slot);
        setGrade($(id + '-grade'), s);
        $(id + '-delay').textContent = s[0] ? fmt(s[1]) : '–';
        $(id + '-flow').textContent = fmt(s[4]);
        $(id + '-queue').textContent = fmt(s[6]);
      });
    }
    async function rebuild() {
      const token = ++build;
      ready = false; box.classList.add('busy'); msg.hidden = false; msgText.textContent = t('warming', { n: WARM_MIN }); bar.style.width = '0%';
      await nextFrame();
      if (!SIM.LabNew(2, ds.seed, ds.arms, 25, 0, true)) { ds.seed++; return rebuild(); }
      SIM.LabShare(2, 3);
      const fits = SIM.LabRoundaboutFits(3), rbButton = document.querySelector('[data-fix="4"]');
      rbButton.disabled = !fits; rbButton.title = fits ? '' : t('noRoundabout');
      if (!fits && ds.fix === 4) ds.fix = 3;
      SIM.LabRule(2, 0, ds.traffic, ds.flow);
      if (SIM.LabRule(3, ds.fix, ds.traffic, ds.flow)) { ds.fix = 1; SIM.LabRule(3, ds.fix, ds.traffic, ds.flow); }
      press('[data-fix]', b => +b.dataset.fix === ds.fix); fixLabel();
      const WARM = WARM_MIN * 60 * 30;
      for (let done = 0; done < WARM; done += 300) {
        SIM.Step(2, 300); SIM.Step(3, 300);
        bar.style.width = `${(done + 300) / WARM * 100}%`;
        await nextFrame();
        if (token !== build) return;
      }
      A.load(0, ds.seed); B.load(ds.fix, ds.seed);
      A.size(); B.size(); A.drawLayer(); B.drawLayer(); A.draw(); B.draw(); score();
      ready = true; box.classList.remove('busy'); msg.hidden = true;
    }
    document.querySelectorAll('[data-fix]').forEach(b => b.addEventListener('click', () => {
      if (b.disabled || +b.dataset.fix === ds.fix) return; ds.fix = +b.dataset.fix; rebuild();
    }));
    document.querySelectorAll('[data-dflow]').forEach(b => b.addEventListener('click', () => {
      if (+b.dataset.dflow === ds.flow) return; ds.flow = +b.dataset.dflow; press('[data-dflow]', o => o === b); rebuild();
    }));
    document.querySelectorAll('[data-dspeed]').forEach(b => b.addEventListener('click', () => { ds.speed = +b.dataset.dspeed; press('[data-dspeed]', o => o === b); }));
    $('fix-new').addEventListener('click', () => {
      ds.seed = 1 + Math.floor(Math.random() * 99998); ds.arms = Math.random() < 0.7 ? 4 : 5; ds.traffic = 1 + Math.floor(Math.random() * 999); rebuild();
    });
    let scoreAt = 0;
    whileVisible(box, (dt, now) => {
      if (!ready) return;
      A.acc += dt * ds.speed;
      let guard = 0;
      while (A.acc >= TICK && guard++ < 30) { A.tick(); B.tick(); A.acc -= TICK; }
      if (guard >= 30) A.acc = 0;
      B.acc = A.acc;
      A.refresh(); B.refresh(); A.draw(); B.draw();
      if (now - scoreAt > 500) { scoreAt = now; score(); }
    });
    let rt;
    new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { if (!ready) return; A.size(); B.size(); A.drawLayer(); B.drawLayer(); A.draw(); B.draw(); }, 120); }).observe(box);
    onLang(() => { fixLabel(); if (ready) score(); else msgText.textContent = t('warming', { n: WARM_MIN }); });
    await rebuild();
  }

  // ================================================================== slot 1: the test bench
  async function bench() {
    const host = $('lab'), msg = $('lab-msg');
    try { await engine(); }
    catch (error) { msg.innerHTML = `<div>${t('engineDown')}</div>`; throw error; }
    const plate = new Plate($('lab-canvas'), 1, 50);
    const st = { arms: 4, bend: 25, oneway: 0, rule: 0, flow: 6, seed: 2027, traffic: 7, speed: 1 };
    const press = (sel, test) => document.querySelectorAll(sel).forEach(b => b.setAttribute('aria-pressed', String(test(b))));
    const randomSeed = () => 1 + Math.floor(Math.random() * 99998);
    const fmtClock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const ruleTitle = r => r === 1 || r === 2 ? t('rule.long.' + r) : t('rule.' + r);
    let roundaboutFits = true, comparing = false, lastResults = null;

    function describe() {
      const one = plate.arms.filter(a => !(a.in && a.out)).length;
      const n = plate.arms.length;
      $('lab-desc').textContent = `${one ? t('armsOneWay', { n, k: one }) : t('arms', { n })} · ${t('drawn')}`;
      $('lab-seed').textContent = t('seed', { n: st.seed });
      $('lab-rule-name').textContent = ruleTitle(st.rule);
      $('lab-flow-out').textContent = t('flowOut', { n: st.flow });
    }
    const waitbar = $('lab-waitbar'), waitkeys = $('lab-waitkeys');
    function hud() {
      const cur = plate.cur, names = reasons();
      const s = SIM.Score(1);
      setGrade($('ls-grade'), s);
      $('ls-delay').textContent = s[0] ? fmt(s[1], 1) : '–';
      $('ls-flow').textContent = fmt(plate.exits.length);
      let waiting = 0; const by = new Array(REASON_TOKENS.length).fill(0);
      for (const v of cur.m.values()) { if (v.v < 0.5) waiting++; if (v.wait > 0 && v.wait < by.length) by[v.wait]++; }
      $('ls-wait').textContent = fmt(waiting);
      $('ls-hes').textContent = fmt(cur.hes); $('ls-grid').textContent = fmt(cur.grid);
      $('ls-cp').textContent = fmt(plate.conflicts.length);
      $('lab-clock').textContent = t('clock', { t: fmtClock(cur.time) });
      const total = by.reduce((a, b) => a + b, 0) || 1;
      waitbar.innerHTML = by.map((n, i) => n ? `<i style="width:${n / total * 100}%;background:var(${REASON_TOKENS[i]})"></i>` : '').join('');
      const present = by.map((n, i) => [n, i]).filter(([n]) => n > 0).sort((a, b) => b[0] - a[0]);
      waitkeys.innerHTML = present.length
        ? present.map(([n, i]) => `<span><i style="background:var(${REASON_TOKENS[i]})"></i>${names[i]} · ${n}</span>`).join('')
        : `<span class="muted">${t('clear')}</span>`;
    }
    function newJunction(seed) {
      st.seed = seed ?? randomSeed();
      if (!SIM.LabNew(1, st.seed, st.arms, st.bend, st.oneway, true)) return newJunction(st.seed + 1);
      roundaboutFits = SIM.LabRoundaboutFits(1);
      const rb = document.querySelector('[data-rule="4"]');
      rb.disabled = !roundaboutFits; rb.title = roundaboutFits ? '' : t('noRoundabout');
      if (!roundaboutFits && st.rule === 4) st.rule = 0;
      clearCompare();
      applyRule();
    }
    function applyRule() {
      const error = SIM.LabRule(1, st.rule, st.traffic, st.flow);
      if (error) { console.warn('Test bench:', error); if (st.rule !== 0) { st.rule = 0; return applyRule(); } }
      press('[data-rule]', b => +b.dataset.rule === st.rule);
      plate.load(st.rule, st.seed); describe();
      for (let i = 0; i < 900; i++) plate.tick(); // half a minute of traffic, so the scene is never empty
      plate.refresh(); plate.drawLayer(); plate.draw(); hud();
    }

    $('lab-new').addEventListener('click', () => { if (!comparing) newJunction(); });
    document.querySelectorAll('[data-arms]').forEach(b => b.addEventListener('click', () => {
      if (comparing) return; st.arms = +b.dataset.arms; press('[data-arms]', o => o === b); newJunction(st.seed);
    }));
    document.querySelectorAll('[data-bend]').forEach(b => b.addEventListener('click', () => {
      if (comparing) return; st.bend = +b.dataset.bend; press('[data-bend]', o => o === b); newJunction(st.seed);
    }));
    document.querySelectorAll('[data-oneway]').forEach(b => b.addEventListener('click', () => {
      if (comparing) return; st.oneway = +b.dataset.oneway; press('[data-oneway]', o => o === b); newJunction(st.seed);
    }));
    document.querySelectorAll('[data-rule]').forEach(b => b.addEventListener('click', () => {
      if (b.disabled || comparing) return; st.rule = +b.dataset.rule; applyRule();
    }));
    const flow = $('lab-flow');
    flow.addEventListener('input', () => { st.flow = +flow.value; $('lab-flow-out').textContent = t('flowOut', { n: st.flow }); SIM.SetFlow(1, st.flow); });
    document.querySelectorAll('[data-lspeed]').forEach(b => b.addEventListener('click', () => { st.speed = +b.dataset.lspeed; press('[data-lspeed]', o => o === b); }));
    $('lab-scope').addEventListener('click', e => {
      plate.scope = !plate.scope; e.currentTarget.setAttribute('aria-pressed', String(plate.scope)); host.classList.toggle('scope', plate.scope);
      plate.readConflicts(); plate.draw();
    });

    // Five rules on the same arrivals, five simulated minutes each.
    const cmp = $('lab-cmp'), progress = $('lab-progress'), go = $('lab-go');
    function clearCompare() { cmp.hidden = true; cmp.innerHTML = ''; lastResults = null; $('lab-go-label').textContent = t('cmp.go'); }
    async function compare() {
      if (comparing) return;
      comparing = true; go.disabled = true; host.classList.add('busy');
      const label = $('lab-go-label'), DURATION = 5 * 60 * 30, results = [];
      progress.hidden = false; const bar = progress.querySelector('i');
      for (let r = 0; r < 5; r++) {
        label.textContent = t('ruleRunning', { rule: t('rule.' + r) });
        if ((r === 4 && !roundaboutFits) || SIM.LabRule(1, r, st.traffic, st.flow)) { results.push(null); continue; }
        for (let done = 0; done < DURATION; done += 450) {
          SIM.Step(1, Math.min(450, DURATION - done));
          bar.style.width = `${(r + done / DURATION) / 5 * 100}%`;
          await nextFrame();
        }
        const a = SIM.State(1), s = SIM.Score(1);
        results.push({ passed: a[1], hes: a[2], delay: s[0] ? s[1] : 0, level: s[0] ? s[3] : 0 });
      }
      bar.style.width = '100%';
      lastResults = results; showCompare(true);
      setTimeout(() => { progress.hidden = true; bar.style.width = '0'; }, 500);
      label.textContent = t('again'); go.disabled = false; comparing = false; host.classList.remove('busy');
      applyRule();
    }
    function showCompare(animate) {
      const results = lastResults; if (!results) return;
      const ok = results.filter(Boolean);
      const metric = (title, unit, key, better, color, digits = 0, grade = false) => {
        const values = ok.map(r => r[key]), max = Math.max(...values, 1e-9);
        const best = better === 'max' ? Math.max(...values) : Math.min(...values);
        return `<div><h4>${t(title)}<small>${t(unit)}</small></h4>${results.map((r, i) => r
          ? `<div class="cmp-row${r[key] === best ? ' best' : ''}"><span>${t('rule.' + i)}</span><span class="t"><i data-w="${Math.max(2, r[key] / max * 100)}" style="--c:var(${color})${animate ? '' : `;width:${Math.max(2, r[key] / max * 100)}%`}"></i></span><span class="v">${fmt(r[key], digits)}${grade ? ` <b class="grade mini" data-level="${r.level}">${GRADES[r.level]}</b>` : ''}</span></div>`
          : `<div class="cmp-row na"><span>${t('rule.' + i)}</span><span class="t"></span><span class="v">–</span></div>`).join('')}</div>`;
      };
      cmp.innerHTML = metric('cmp.passed', 'cmp.passed.u', 'passed', 'max', '--x-green')
        + metric('cmp.delay', 'cmp.delay.u', 'delay', 'min', '--x-orange', 0, true)
        + metric('cmp.hes', 'cmp.hes.u', 'hes', 'min', '--x-violet');
      cmp.hidden = false;
      if (animate) requestAnimationFrame(() => requestAnimationFrame(() => cmp.querySelectorAll('i[data-w]').forEach(i => { i.style.width = i.dataset.w + '%'; })));
    }
    go.addEventListener('click', compare);

    plate.size();
    newJunction(st.seed);
    msg.hidden = true;
    let hudAt = 0;
    whileVisible($('lab-canvas'), (dt, now) => {
      if (comparing) return;
      plate.acc += dt * st.speed;
      let guard = 0;
      while (plate.acc >= TICK && guard++ < 40) { plate.tick(); plate.acc -= TICK; }
      if (guard >= 40) plate.acc = 0;
      plate.refresh(); plate.draw();
      if (now - hudAt > 400) { hudAt = now; hud(); }
    });
    let rt;
    new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { plate.size(); plate.drawLayer(); plate.draw(); }, 120); }).observe(plate.cv.parentElement);
    onLang(() => {
      describe(); hud(); showCompare(false);
      if (lastResults && !comparing) $('lab-go-label').textContent = t('again');
      const rb = document.querySelector('[data-rule="4"]'); rb.title = roundaboutFits ? '' : t('noRoundabout');
    });
  }

  // ================================================================== start
  // The hero first; the duel and the bench warm up only when the reader gets near them.
  const whenNear = (el, fn) => {
    const io = new IntersectionObserver(entries => { if (entries[0].isIntersecting) { io.disconnect(); fn(); } }, { rootMargin: '120% 0px' });
    io.observe(el);
  };
  applyLang();
  heroSim().catch(error => { console.warn('Xsections engine unavailable:', error); root.classList.add('no-sim'); })
    .finally(() => {
      whenNear($('duel'), () => duel().catch(error => console.warn('Before/after unavailable:', error)));
      whenNear($('lab'), () => bench().catch(error => console.warn('Test bench unavailable:', error)));
    });
})();

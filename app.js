(() => {
  'use strict';

  // ---------- 設定 ----------

  const DEFAULT_MESSAGE = '生まれてきてくれてありがとう。\n素敵な一年になりますように！';
  const CANDLE_COLORS = ['#ff8fab', '#8ecae6', '#ffd166', '#95d5b2', '#cdb4db', '#ffb4a2'];
  const CONFETTI_COLORS = ['#ff5d8f', '#ffc233', '#4cc9f0', '#80ed99', '#b892ff', '#ff8c42', '#ffffff'];

  // 息の判定は「ちょっと甘め」。強く吹けば 0.3〜0.5 秒、そこそこでも 1 秒ほどで消える。
  const BLOW_RATE = 2.4;     // 吹いている間に炎の体力が減る速さ（強さ 1 のとき / 秒）
  const RECOVER_RATE = 0.35; // 吹くのをやめたときに炎が戻る速さ（/ 秒）

  const params = new URLSearchParams(location.search);
  const friendName = (params.get('name') || '').trim().slice(0, 40);
  const message = (params.get('msg') || '').trim().slice(0, 400) || DEFAULT_MESSAGE;
  const candleCount = clamp(parseInt(params.get('candles'), 10) || 5, 1, 12);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const $ = (id) => document.getElementById(id);
  const svg = $('cake');
  const promptEl = $('prompt');
  const hintEl = $('hint');
  const againBtn = $('again');
  const celebrationEl = $('celebration');
  const roomGlow = $('room-glow');

  let state = 'lit'; // lit → dark → party
  const candles = [];

  // ---------- 小物 ----------

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  function el(tag, attrs, parent) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }

  // 毎回同じ飾りつけになるよう、シード付きの乱数を使う
  function seeded(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // ---------- ケーキの飾りつけ ----------

  const TOP = { cx: 200, cy: 215, rx: 115, ry: 26 };
  const frontEdge = (x) => TOP.cy + TOP.ry * Math.sqrt(Math.max(0, 1 - ((x - TOP.cx) / TOP.rx) ** 2));

  function buildDecorations() {
    const r = seeded(20);

    // 上から垂れるクリーム
    const drips = [];
    for (let x = 95; x < 310; x += 17 + r() * 10) drips.push({ x, len: 8 + r() * 20, w: 5 + r() * 3 });
    let d = `M${TOP.cx - TOP.rx} ${TOP.cy}`;
    for (let x = TOP.cx - TOP.rx; x <= TOP.cx + TOP.rx; x += 2) {
      let off = 5;
      for (const dr of drips) off += dr.len * Math.exp(-(((x - dr.x) / dr.w) ** 2));
      d += ` L${x} ${(frontEdge(x) + off).toFixed(1)}`;
    }
    for (let x = TOP.cx + TOP.rx; x >= TOP.cx - TOP.rx; x -= 4) d += ` L${x} ${frontEdge(x).toFixed(1)}`;
    el('path', { d: d + 'Z', fill: '#fbeee6' }, $('drips'));

    // 側面のスプリンクル
    const sprinkles = $('sprinkles');
    for (let i = 0; i < 34; i++) {
      const x = 95 + r() * 210;
      const y = frontEdge(x) + 30 + r() * 60;
      if (y > 262 && y < 292) continue; // リボンの上は避ける
      el('rect', {
        x: -3.5, y: -1.2, width: 7, height: 2.4, rx: 1.2,
        fill: CANDLE_COLORS[i % CANDLE_COLORS.length],
        transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${Math.floor(r() * 180)})`,
      }, sprinkles);
    }

    // ふちのホイップといちご（奥から順に描く）
    const rim = $('rim');
    const items = [];
    const N = 18;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      items.push({ x: TOP.cx + Math.cos(a) * 104, y: TOP.cy - 2 + Math.sin(a) * 20, berry: i % 2 === 0 });
    }
    items.sort((p, q) => p.y - q.y);
    for (const it of items) {
      const g = el('g', { transform: `translate(${it.x.toFixed(1)} ${it.y.toFixed(1)})` }, rim);
      el('ellipse', { cx: 0, cy: 1, rx: 11, ry: 7.5, fill: '#fffaf6' }, g);
      el('ellipse', { cx: -3, cy: -1.5, rx: 4, ry: 2.2, fill: '#fff', opacity: .9 }, g);
      if (it.berry) {
        const b = el('g', { transform: 'translate(0 -6)' }, g);
        el('path', { d: 'M0 -7 C6 -7 8 -1 6 3 C4 7 1 9 0 9 C-1 9 -4 7 -6 3 C-8 -1 -6 -7 0 -7Z', fill: '#e63950' }, b);
        el('path', { d: 'M-4 -7 L0 -4 L4 -7 L1 -8 L0 -10 L-1 -8Z', fill: '#4caf50' }, b);
        for (const [sx, sy] of [[-2.5, -2], [2.5, -1], [0, 3], [-3, 3], [3, 4]]) {
          el('circle', { cx: sx, cy: sy, r: .7, fill: '#ffe08a' }, b);
        }
        el('ellipse', { cx: -2.5, cy: -3.5, rx: 1.4, ry: 2.2, fill: '#fff', opacity: .35 }, b);
      }
    }
  }

  // ---------- ろうそく ----------

  const FLAME_OUTER = 'M0 0 C-9 -5 -10 -17 0 -36 C10 -17 9 -5 0 0Z';
  const FLAME_INNER = 'M0 -1 C-4 -4 -5 -11 0 -20 C5 -11 4 -4 0 -1Z';

  function candlePositions(n) {
    if (n === 1) return [{ x: 200, y: 214 }];
    // ケーキの上に輪っか状に並べる。手前と奥のろうそくが重ならないよう、偶数本のときは少し回す
    const pts = [];
    const rx = Math.min(74, 30 + n * 6);
    const ry = rx * (TOP.ry / TOP.rx) * 0.95;
    const offset = Math.PI / 2 + (n % 2 === 0 ? Math.PI / n / 2 : 0);
    for (let i = 0; i < n; i++) {
      const a = offset + (i / n) * Math.PI * 2;
      pts.push({ x: 200 + Math.cos(a) * rx, y: 212 + Math.sin(a) * ry });
    }
    return pts.sort((p, q) => p.y - q.y);
  }

  function buildCandles() {
    const group = $('candles');
    candlePositions(candleCount).forEach((p, i) => {
      const h = 50 + Math.random() * 6;
      const color = CANDLE_COLORS[i % CANDLE_COLORS.length];
      const g = el('g', { class: 'candle is-igniting', transform: `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})` }, group);

      el('ellipse', { cx: 0, cy: 0, rx: 7, ry: 2.5, fill: '#000', opacity: .12 }, g);
      el('rect', { x: -4.5, y: -h, width: 9, height: h, rx: 2.5, fill: color }, g);
      el('rect', { x: -4.5, y: -h, width: 9, height: h, rx: 2.5, fill: 'url(#p-stripes)' }, g);
      el('rect', { x: -3.5, y: -h + 1, width: 2.4, height: h - 2, rx: 1.2, fill: '#fff', opacity: .3 }, g);
      el('rect', { class: 'candle-shade', x: -4.5, y: -h, width: 9, height: h, rx: 2.5, fill: '#0d0614' }, g);
      el('path', { class: 'wick', d: `M0 ${-h} q1.2 -3 0 -6`, fill: 'none', 'stroke-width': 1.6, 'stroke-linecap': 'round' }, g);

      const anchor = el('g', { transform: `translate(0 ${-h - 4})` }, g);
      const flame = el('g', { class: 'flame' }, anchor);
      const ignite = el('g', { class: 'ignite', style: `animation-delay:${(0.3 + i * 0.12).toFixed(2)}s` }, flame);
      el('circle', { class: 'glow', cx: 0, cy: -14, r: 28, fill: 'url(#g-glow)' }, ignite);
      const flick = el('g', {
        class: 'flicker',
        style: `animation-duration:${rand(1.1, 1.8).toFixed(2)}s;animation-delay:-${rand(0, 2).toFixed(2)}s`,
      }, ignite);
      el('path', { d: FLAME_OUTER, fill: 'url(#g-flame)' }, flick);
      el('path', { d: FLAME_INNER, fill: '#fffbe8', opacity: .95 }, flick);
      el('ellipse', { cx: 0, cy: -3, rx: 2.2, ry: 3.5, fill: '#7ab8ff', opacity: .5 }, flick);

      candles.push({
        g, flame, anchor,
        x: p.x, fy: p.y - h - 4,
        lit: true,
        health: 1,
        lean: 0,
        dir: rand(0.75, 1.25),
        tough: rand(0.75, 1.3),
        phase: rand(0, 6.28),
      });
    });
  }

  function extinguish(c) {
    if (!c.lit) return;
    c.lit = false;
    c.health = 0;
    c.g.classList.remove('is-igniting');
    c.g.classList.add('is-out');
    puffSmoke(c);
    updateLighting();
    if (candles.every((k) => !k.lit)) finish();
  }

  function puffSmoke(c) {
    const smoke = el('g', { transform: 'translate(0 -4)' }, c.anchor);
    const drift = rand(-14, 14);
    for (let i = 0; i < 5; i++) {
      el('circle', {
        class: 'smoke',
        cx: rand(-1.5, 1.5), cy: -i * 2, r: rand(2.5, 4),
        fill: '#d8d0e2',
        style: `--dx:${(drift + rand(-6, 6)).toFixed(1)}px;animation-delay:${(i * 0.13).toFixed(2)}s`,
      }, smoke);
    }
    setTimeout(() => smoke.remove(), 3200);
  }

  function updateLighting() {
    const lit = candles.filter((c) => c.lit).length / candles.length;
    roomGlow.style.opacity = lit.toFixed(2);
    svg.style.setProperty('--dark', state === 'party' ? 0 : ((1 - lit) * 0.6).toFixed(2));
  }

  // ---------- マイク（息の判定） ----------

  let audioCtx = null;
  const mic = { status: 'pending', analyser: null, buf: null, floor: null, warmup: 0, level: 0 };

  function getAudioCtx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
      audioCtx.addEventListener('statechange', refreshMicHint);
    }
    return audioCtx;
  }

  async function startMic() {
    if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicStatus('unavailable');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // 息の「ザーッ」という音を消されないよう、ノイズ抑制などは切っておく
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const ctx = getAudioCtx();
      if (!ctx) throw new Error('Web Audio unsupported');
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(analyser);
      mic.analyser = analyser;
      mic.buf = new Float32Array(analyser.fftSize);
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
      setMicStatus('active');
    } catch (err) {
      setMicStatus('unavailable');
    }
  }

  // 0（静か）〜 1（思いきり吹いている）の強さを返す
  function readBlow(dt) {
    if (!mic.analyser || audioCtx.state !== 'running') return 0;
    const buf = mic.buf;
    mic.analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    const rms = Math.sqrt(sum / buf.length);

    // 最初の少しの間で、部屋の静かさ（環境音の大きさ）を覚える
    if (mic.floor === null) mic.floor = rms;
    if (mic.warmup < 0.6) {
      mic.warmup += dt;
      mic.floor += (rms - mic.floor) * 0.15;
      return 0;
    }

    const lo = Math.max(mic.floor * 3, 0.02);
    const hi = Math.max(mic.floor * 8, 0.09);
    const s = clamp((rms - lo) / (hi - lo), 0, 1);

    // 立ち上がりは素早く、収まりはゆっくり
    mic.level += (s - mic.level) * (s > mic.level ? 0.5 : 0.12);

    // 吹いていない間は環境音の基準をゆっくり追いかける
    if (s === 0) {
      const k = rms < mic.floor ? 0.05 : 0.004;
      mic.floor = clamp(mic.floor + (rms - mic.floor) * k * dt * 60, 0.0008, 0.05);
    }
    return mic.level < 0.03 ? 0 : mic.level;
  }

  // ---------- ヒント ----------

  let helpTimer = null;

  function setHint(content) {
    hintEl.textContent = '';
    if (content instanceof Node) hintEl.appendChild(content);
    else if (content) hintEl.textContent = content;
    hintEl.classList.toggle('is-empty', !content);
  }

  function setMicStatus(status) {
    mic.status = status;
    refreshMicHint();
  }

  function refreshMicHint() {
    if (state !== 'lit') return;
    clearTimeout(helpTimer);
    if (mic.status === 'unavailable') {
      helpTimer = setTimeout(() => state === 'lit' && setHint('ろうそくをタップして消してね'), 1400);
      return;
    }
    if (mic.status === 'active' && audioCtx && audioCtx.state !== 'running') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = '🎤 マイクをオンにする';
      btn.addEventListener('click', () => audioCtx.resume());
      setHint(btn);
      return;
    }
    setHint('');
    if (mic.status === 'active') {
      // しばらく消えなかったら、タップでもいいよと教える
      helpTimer = setTimeout(() => state === 'lit' && setHint('ろうそくをタップしても消せるよ'), 9000);
    }
  }

  // ---------- 入力：タップ / キーボード ----------

  function toSvgPoint(e) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  // ケーキのどこを触っても、いちばん近いろうそくが消える
  svg.addEventListener('pointerdown', (e) => {
    if (state !== 'lit') return;
    const p = toSvgPoint(e);
    let best = null;
    let bestD = Infinity;
    for (const c of candles) {
      if (!c.lit) continue;
      const d = Math.hypot(p.x - c.x, (p.y - (c.fy - 15)) * 0.6);
      if (d < bestD) { bestD = d; best = c; }
    }
    if (best) {
      extinguish(best);
      if (navigator.vibrate) navigator.vibrate(15);
    }
  });

  svg.addEventListener('keydown', (e) => {
    if (state !== 'lit' || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    const c = candles.find((k) => k.lit);
    if (c) extinguish(c);
  });

  // ブラウザは操作があるまで音声を止めていることがあるので、最初のタップで起こす
  window.addEventListener('pointerdown', () => {
    const ctx = getAudioCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }, { capture: true });

  // ---------- 毎フレームの更新 ----------

  let last = performance.now();

  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const strength = state === 'lit' ? readBlow(dt) : 0;

    for (const c of candles) {
      if (!c.lit) continue;
      if (strength > 0) {
        c.health -= (dt * strength * BLOW_RATE) / c.tough;
        if (c.health <= 0) { extinguish(c); continue; }
      } else {
        c.health = Math.min(1, c.health + dt * RECOVER_RATE);
      }
      const target = strength * 30 * c.dir;
      c.lean += (target - c.lean) * Math.min(1, dt * 12);
      const gust = strength > 0 ? Math.sin(now / 55 + c.phase) * 7 * strength : 0;
      const s = 0.55 + 0.45 * c.health;
      c.flame.setAttribute('transform',
        `skewX(${(c.lean + gust).toFixed(2)}) scale(${(s * (1 + strength * 0.12)).toFixed(3)} ${(s * (1 - strength * 0.35)).toFixed(3)})`);
    }
    requestAnimationFrame(tick);
  }

  // ---------- お祝い ----------

  function finish() {
    state = 'dark';
    clearTimeout(helpTimer);
    setHint('');
    document.body.className = 'is-dark';
    setTimeout(celebrate, 1100);
  }

  function celebrate() {
    state = 'party';
    document.body.className = 'is-party';
    updateLighting();
    celebrationEl.classList.remove('is-hiding', 'is-shown');
    celebrationEl.hidden = false;
    void celebrationEl.offsetWidth; // アニメーションを最初から再生させる
    celebrationEl.classList.add('is-shown');
    againBtn.hidden = false;
    confetti.start();
    music.play();
  }

  function relight() {
    state = 'lit';
    document.body.className = 'is-lit';
    music.stop();
    confetti.stop();
    againBtn.hidden = true;
    celebrationEl.classList.add('is-hiding');
    setTimeout(() => { if (state !== 'party') celebrationEl.hidden = true; }, 500);
    candles.forEach((c, i) => {
      c.lit = true;
      c.health = 1;
      c.lean = 0;
      c.g.classList.remove('is-out', 'is-igniting');
      c.g.querySelector('.ignite').style.animationDelay = `${(0.2 + i * 0.12).toFixed(2)}s`;
      void c.g.getBBox();
      c.g.classList.add('is-igniting');
    });
    updateLighting();
    refreshMicHint();
  }

  againBtn.addEventListener('click', relight);

  function fillGreeting() {
    const nameEl = $('name');
    const chars = Array.from(friendName);
    chars.forEach((ch, i) => {
      const span = document.createElement('span');
      span.textContent = ch === ' ' ? ' ' : ch;
      span.style.setProperty('--i', i);
      nameEl.appendChild(span);
    });
    celebrationEl.style.setProperty('--n', chars.length);
    celebrationEl.classList.toggle('no-name', !friendName);
    $('message').textContent = message;
    if (friendName) document.title = `${friendName}、お誕生日おめでとう！`;
  }

  // ---------- 紙吹雪 ----------

  const confetti = (() => {
    const canvas = $('confetti');
    const ctx2d = canvas.getContext('2d');
    let parts = [];
    let raf = 0;
    let rainUntil = 0;
    let lastT = 0;
    let W = 0;
    let H = 0;
    const scale = reducedMotion ? 0.3 : 1;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn(x, y, vx, vy) {
      const r = Math.random();
      parts.push({
        x, y, vx, vy,
        rot: rand(0, 6.28), vr: rand(-7, 7),
        tilt: rand(0, 6.28), vt: rand(4, 9),
        w: rand(6, 10), h: rand(9, 15),
        term: rand(110, 210),
        sway: rand(15, 45),
        color: pick(CONFETTI_COLORS),
        shape: r < 0.25 ? 'circle' : r < 0.4 ? 'ribbon' : 'rect',
      });
    }

    function burst() {
      const n = Math.round(90 * scale);
      const speed = Math.max(H, 600) * 1.6;
      for (const side of [-1, 1]) {
        for (let i = 0; i < n; i++) {
          // 画面の左下・右下から、内側の上へ向けて打ち上げる
          const a = rand(12, 38) * Math.PI / 180;
          const v = speed * rand(0.55, 1);
          spawn(side < 0 ? rand(-10, W * 0.08) : rand(W * 0.92, W + 10), H * rand(0.82, 0.95),
            -side * Math.sin(a) * v, -Math.cos(a) * v);
        }
      }
    }

    function draw(p) {
      ctx2d.save();
      ctx2d.translate(p.x, p.y);
      ctx2d.rotate(p.rot);
      ctx2d.scale(1, Math.cos(p.tilt));
      ctx2d.fillStyle = p.color;
      if (p.shape === 'circle') {
        ctx2d.beginPath();
        ctx2d.arc(0, 0, p.w * 0.45, 0, Math.PI * 2);
        ctx2d.fill();
      } else if (p.shape === 'ribbon') {
        ctx2d.fillRect(-p.w * 0.2, -p.h * 0.9, p.w * 0.4, p.h * 1.8);
      } else {
        ctx2d.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx2d.restore();
    }

    function frame(t) {
      const dt = Math.min(0.04, (t - lastT) / 1000 || 0.016);
      lastT = t;
      if (t < rainUntil && Math.random() < 0.9 * scale) {
        for (let i = 0; i < 2; i++) spawn(rand(0, W), -20, rand(-30, 30), rand(40, 120));
      }
      const drag = Math.pow(0.12, dt);
      ctx2d.clearRect(0, 0, W, H);
      parts = parts.filter((p) => p.y < H + 40);
      for (const p of parts) {
        p.vx *= drag;
        p.vy = p.vy * drag + 900 * dt;
        if (p.vy > p.term) p.vy = p.term;
        p.tilt += p.vt * dt;
        p.rot += p.vr * dt;
        p.x += (p.vx + Math.sin(p.tilt * 0.5) * p.sway) * dt;
        p.y += p.vy * dt;
        draw(p);
      }
      if (parts.length || t < rainUntil) raf = requestAnimationFrame(frame);
      else raf = 0;
    }

    window.addEventListener('resize', () => { if (raf) resize(); });

    return {
      start() {
        resize();
        burst();
        rainUntil = performance.now() + 4000;
        if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(frame); }
      },
      stop() { rainUntil = 0; },
    };
  })();

  // ---------- オルゴールのハッピーバースデー ----------

  const music = (() => {
    const MELODY = [
      [67, .75], [67, .25], [69, 1], [67, 1], [72, 1], [71, 2],
      [67, .75], [67, .25], [69, 1], [67, 1], [74, 1], [72, 2],
      [67, .75], [67, .25], [79, 1], [76, 1], [72, 1], [71, 1], [69, 2],
      [77, .75], [77, .25], [76, 1], [72, 1], [74, 1], [72, 3],
    ];
    const BEAT = 0.42;
    let master = null;

    function note(ctx, out, midi, t, len) {
      const f = 440 * Math.pow(2, (midi - 69) / 12);
      for (const [mult, vol] of [[1, 1], [2, 0.25], [3, 0.08]]) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f * mult;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0008, t + Math.max(0.9, len * 1.6));
        o.connect(g).connect(out);
        o.start(t);
        o.stop(t + Math.max(1, len * 1.7));
      }
    }

    return {
      play() {
        const ctx = getAudioCtx();
        if (!ctx || ctx.state !== 'running') return;
        this.stop();
        master = ctx.createGain();
        master.gain.value = 0.12;
        master.connect(ctx.destination);
        let t = ctx.currentTime + 0.1;
        // きらっとした合図
        [72, 76, 79, 84].forEach((m, i) => note(ctx, master, m + 12, t + i * 0.08, 0.6));
        t += 1.2;
        for (const [m, beats] of MELODY) {
          note(ctx, master, m + 12, t, beats * BEAT);
          t += beats * BEAT;
        }
      },
      stop() {
        if (!master) return;
        const m = master;
        master = null;
        const now = audioCtx.currentTime;
        m.gain.cancelScheduledValues(now);
        m.gain.setValueAtTime(m.gain.value, now);
        m.gain.linearRampToValueAtTime(0, now + 0.3);
        setTimeout(() => m.disconnect(), 400);
      },
    };
  })();

  // ---------- はじまり ----------

  fillGreeting();
  buildDecorations();
  buildCandles();
  updateLighting();
  setHint('');
  requestAnimationFrame(tick);
  startMic();
})();

async function __save(blob, name) {
  try { const d = window.claude && await window.claude.use("downloads"); if (d) { await d.save({ filename: name, data: blob }); return; } }
  catch (e) { if (e && (e.code === "declined" || e.code === "rate_limited")) return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
}
/* 릴스 모션 템플릿 공용 엔진
   - 각 모션 페이지는 Engine.start({...}) 로 편집 패널 구성, 길이, 그리기 함수를 넘깁니다.
   - 시간 단위는 '프레임(24fps 기준)'. 내보낼 때 60/30/24fps 로 샘플링합니다. */
(function () {
  const W = 1440, H = 2560, FPS = 24;
  const E = (window.Engine = { W, H, FPS });

  // ---------------- 수학 / 이징 ----------------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const prog = (f, a, b) => clamp((f - a) / (b - a));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeIn = t => t * t * t;
  const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const back = t => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  // 키프레임을 부드러운 곡선으로 연결 (중간에 멈칫하지 않음). ease 를 주면 구간별 이징
  function kf(f, keys, ease) {
    const n = keys.length;
    if (f <= keys[0][0]) return keys[0][1];
    if (f >= keys[n - 1][0]) return keys[n - 1][1];
    if (ease) for (let i = 0; i < n - 1; i++) { const [f0, v0] = keys[i], [f1, v1] = keys[i + 1]; if (f <= f1) return lerp(v0, v1, ease((f - f0) / (f1 - f0))); }
    const slope = i => {
      if (i === 0 || i === n - 1) return 0;
      const [fa, va] = keys[i - 1], [fb, vb] = keys[i + 1], vi = keys[i][1];
      if ((vi - va) * (vb - vi) <= 0) return 0;
      return 0.85 * (vb - va) / (fb - fa);
    };
    for (let i = 0; i < n - 1; i++) {
      const [f0, v0] = keys[i], [f1, v1] = keys[i + 1];
      if (f <= f1) { const h = f1 - f0, t = (f - f0) / h, t2 = t * t, t3 = t2 * t;
        return (2 * t3 - 3 * t2 + 1) * v0 + (t3 - 2 * t2 + t) * h * slope(i) + (-2 * t3 + 3 * t2) * v1 + (t3 - t2) * h * slope(i + 1); }
    }
  }
  const kf2 = (f, keys, ease) => [kf(f, keys.map(k => [k[0], k[1]]), ease), kf(f, keys.map(k => [k[0], k[2]]), ease)];
  Object.assign(E, { clamp, lerp, prog, easeOut, easeIn, easeInOut, back, kf, kf2 });

  // ---------------- 그리기 도구 ----------------
  let ctx;
  const SANS = '-apple-system, "Apple SD Gothic Neo", "Helvetica Neue", Helvetica, Arial, sans-serif';
  E.SANS = SANS;
  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  function shadowed(fn, blur = 40, oy = 16, color = "rgba(0,0,0,.55)") { ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = blur; ctx.shadowOffsetY = oy; fn(); ctx.restore(); }
  function cover(img, x, y, w, h, r = 10, shadow = true) {
    if (!img) { rr(x, y, w, h, r); ctx.fillStyle = "#2a2c2f"; ctx.fill(); return; }
    ctx.save();
    if (shadow) shadowed(() => { rr(x, y, w, h, r); ctx.fillStyle = "#222"; ctx.fill(); });
    rr(x, y, w, h, r); ctx.clip();
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, s = Math.max(w / iw, h / ih);
    ctx.drawImage(img, x + (w - iw * s) / 2, y + (h - ih * s) / 2, iw * s, ih * s);
    ctx.restore();
  }
  function wrap(text, x, y, maxW, lh, boldFont, font) { // **굵게** 지원, 한글은 글자 단위로도 줄바꿈
    const tokens = [];
    String(text).split(/(\*\*[^*]+\*\*)/).forEach(part => {
      const bold = /^\*\*.*\*\*$/.test(part), t = bold ? part.slice(2, -2) : part;
      t.split(/(\s+)/).forEach(w => w && tokens.push({ w, bold }));
    });
    let cx = x, cy = y;
    for (const tk of tokens) {
      ctx.font = tk.bold ? boldFont : font;
      if (/^\s+$/.test(tk.w)) { if (/\n/.test(tk.w)) { cx = x; cy += lh; } else if (cx > x) cx += ctx.measureText(" ").width; continue; }
      let ww = ctx.measureText(tk.w).width;
      if (cx + ww > x + maxW && cx > x) { cx = x; cy += lh; }
      if (ww > maxW) { for (const ch of tk.w) { const cw = ctx.measureText(ch).width; if (cx + cw > x + maxW) { cx = x; cy += lh; } ctx.fillText(ch, cx, cy); cx += cw; } continue; }
      ctx.fillText(tk.w, cx, cy); cx += ww;
    }
    return cy;
  }
  function cursor(x, y, name, color, scale = 1, alpha = 1, textColor = "#fff") {
    if (alpha <= 0) return;
    ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.scale(scale, scale);
    ctx.beginPath(); ctx.moveTo(5, 3); ctx.lineTo(35, 17); ctx.lineTo(20, 21); ctx.lineTo(15, 36); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    if (name) { ctx.font = `500 20px ${SANS}`; const tw = ctx.measureText(name).width; rr(26, 30, tw + 28, 32, 16); ctx.fill(); ctx.fillStyle = textColor; ctx.textBaseline = "middle"; ctx.fillText(name, 40, 47); }
    ctx.restore();
  }
  function dot(x, y, a = 1, r = 11) { if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = "#fff"; ctx.fill(); ctx.restore(); }
  function bez(p, t, opt = {}) { // 큐빅 베지어를 t 까지 (기본 점선)
    if (t <= 0) return;
    const pt = u => { const v = 1 - u; return [v*v*v*p[0] + 3*v*v*u*p[2] + 3*v*u*u*p[4] + u*u*u*p[6], v*v*v*p[1] + 3*v*v*u*p[3] + 3*v*u*u*p[5] + u*u*u*p[7]]; };
    ctx.save(); ctx.strokeStyle = opt.color || "#e8e8e8"; ctx.lineWidth = opt.width || 3; ctx.lineCap = "round";
    if (opt.dash !== false) { ctx.setLineDash(opt.dash || [9, 9]); ctx.lineDashOffset = opt.flow || 0; }
    ctx.beginPath(); const n = 60;
    for (let i = 0; i <= n * t; i++) { const [x, y] = pt(i / n); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.restore();
  }
  const emojiCache = {};
  function emoji(ch, x, y, size) {
    if (!ch) return;
    const key = ch + size;
    if (!emojiCache[key]) { const c = document.createElement("canvas"); c.width = c.height = Math.ceil(size * 1.4); const x2 = c.getContext("2d");
      x2.font = `${size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`; x2.textAlign = "center"; x2.textBaseline = "middle"; x2.fillText(ch, c.width / 2, c.height / 2 + size * 0.06); emojiCache[key] = c; }
    const c = emojiCache[key]; ctx.drawImage(c, x - c.width / 2, y - c.height / 2);
  }
  function label(text, x, y, color = "#6f7472", size = 17) { if (!text) return; ctx.save(); ctx.font = `${size}px ${SANS}`; ctx.fillStyle = color; ctx.textBaseline = "top"; ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 4, 12, 10); ctx.fillText(text, x + 21, y); ctx.restore(); }
  function pill(text, x, y, opt = {}) { // 작은 정보 배지들 (예: "Cinema Studio | 16:9 | 4K")
    const size = opt.size || 22; ctx.save(); ctx.font = `500 ${size}px ${SANS}`; let cx = x;
    for (const t of String(text).split("|").map(s => s.trim()).filter(Boolean)) {
      const w = ctx.measureText(t).width + size * 1.1; rr(cx, y, w, size * 1.7, size * .45); ctx.fillStyle = opt.bg || "rgba(20,20,22,.78)"; ctx.fill();
      ctx.fillStyle = opt.color || "#f2f2f2"; ctx.textBaseline = "middle"; ctx.fillText(t, cx + size * .55, y + size * .87); cx += w + size * .35;
    }
    ctx.restore();
  }
  const NOTE_W = 672, NOTE_H = 669;
  function note(x, y, scale, text, bg, footer, curl = 0, curlAt = "bottom", textColor = "#1e1e1e") {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    shadowed(() => { ctx.fillStyle = bg; ctx.fillRect(0, 0, NOTE_W, NOTE_H); }, 40, 18, "rgba(0,0,0,.45)");
    ctx.fillStyle = textColor; ctx.textBaseline = "top";
    wrap(text, 34, 34, NOTE_W - 68, 48, `700 38.5px ${SANS}`, `400 38.5px ${SANS}`);
    ctx.fillStyle = "#8b8b7c"; ctx.font = `21px ${SANS}`; ctx.textBaseline = "alphabetic"; ctx.fillText(footer || "", 22, NOTE_H - 18);
    if (curl > 0.02) { ctx.beginPath(); ctx.rect(0, 0, NOTE_W, NOTE_H); ctx.clip(); const cx = curlAt === "bottom" ? NOTE_W / 2 : NOTE_W, r = 120 * curl;
      const g = ctx.createRadialGradient(cx, NOTE_H - r * .4, 0, cx, NOTE_H, r); g.addColorStop(0, "#9a9a9a"); g.addColorStop(1, "#5a5a5a"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, NOTE_H, r, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  // 단어가 하나씩 떨어지며 나타나는 큰 제목 (폭 targetW 에 맞춰 가로로 늘이거나 줄임)
  function title(text, x, y, targetW, size, color, f, startF, step, font = "Anton, Impact, sans-serif") {
    ctx.save(); ctx.font = `${size}px ${font}`; ctx.textBaseline = "top";
    const full = ctx.measureText(text).width || 1; ctx.translate(x, y); ctx.scale(targetW / full, 1);
    let cx = 0; const parts = String(text).split(" "), sp = ctx.measureText(" ").width;
    parts.forEach((w, i) => { const ww = ctx.measureText(w).width, p = prog(f, startF + i * step, startF + i * step + 2.5);
      if (p > 0) { ctx.save(); ctx.translate(cx + ww / 2, size * .8); const k = lerp(1.18, 1, easeOut(p)); ctx.scale(k, k); ctx.globalAlpha *= clamp(p * 3); ctx.fillStyle = color; ctx.fillText(w, -ww / 2, -size * .8); ctx.restore(); }
      cx += ww + sp; });
    ctx.restore();
    return startF + parts.length * step;
  }
  function bubble(x, y, s, alpha, bg = "#2d6ef0") {
    if (!s || alpha <= 0) return;
    const [name, ...rest] = String(s).split(":"); const msg = rest.join(":").trim();
    ctx.save(); ctx.globalAlpha *= clamp(alpha * 2); ctx.translate(x, y); const k = lerp(.5, 1, back(alpha)); ctx.scale(k, k);
    ctx.font = `17px ${SANS}`; const w = Math.max(ctx.measureText(msg).width, 60) + 70;
    rr(0, 0, w, 66, 22); ctx.fillStyle = bg; ctx.fill(); ctx.beginPath(); ctx.arc(27, 33, 15, 0, 7); ctx.fillStyle = "#f3c5a8"; ctx.fill();
    ctx.fillStyle = "#fff"; ctx.textBaseline = "top"; ctx.font = `600 14px ${SANS}`; ctx.fillText(name.trim(), 52, 11); ctx.font = `17px ${SANS}`; ctx.fillText(msg, 52, 31);
    ctx.restore();
  }
  // 기호/로고: 이미지가 있으면 이미지(비율 유지, size 상자 안), 없으면 글자 기호
  function symbol(text, imgList, x, y, size, color, weight = 400) {
    const im = imgList && imgList[0] && imgList[0].img;
    if (im) { const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height, s = size / Math.max(iw, ih); ctx.drawImage(im, x - iw * s / 2, y - ih * s / 2, iw * s, ih * s); return; }
    if (!text) return;
    ctx.save(); ctx.fillStyle = color; ctx.font = `${weight} ${size}px ${SANS}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, x, y + size * .04); ctx.restore();
  }
  function dotGrid(color = "rgba(255,255,255,.035)", step = 44) { ctx.fillStyle = color; for (let y = step / 2; y < H; y += step) for (let x = step / 2; x < W; x += step) ctx.fillRect(x - 1.5, y - 1.5, 3, 3); }
  function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
  Object.assign(E, { rr, shadowed, cover, wrap, cursor, dot, bez, emoji, label, pill, note, NOTE_W, NOTE_H, title, bubble, dotGrid, hexA, symbol });
  Object.defineProperty(E, "ctx", { get: () => ctx });

  // ---------------- 레이어 분리 (캡컷 프로젝트용) ----------------
  // mode "full": 전부 그림 / "split": 요소(E.el)와 바뀌는 요소(E.layer)는 따로 기록하고, 감싸지 않은 것만 바탕으로 그림
  E.mode = "full"; E.captured = [];
  let realCtx = null, setPageCtx = () => {}, elCanvas = null, elCtx = null, small = null, smallCtx = null;
  const sprites = {};               // id -> { hash -> dataURL }  (새 모양일 때만 전체 해상도로 보냄)
  function transformOf(m, x, y, w, h) {
    const cx = x + w / 2, cy = y + h / 2;
    return { cx: m.a * cx + m.c * cy + m.e, cy: m.b * cx + m.d * cy + m.f, sx: Math.hypot(m.a, m.b), sy: Math.hypot(m.c, m.d), rot: Math.atan2(m.b, m.a) * 180 / Math.PI };
  }
  // 바뀌는 요소(사진, 글자) → 캡컷 사진/텍스트. info: { kind: "image"|"text", x, y, w, h, key?, text?, size?, color?, lh? }
  E.layer = function (id, info, draw) {
    if (E.mode !== "split") { draw(); return; }
    E.captured.push(Object.assign({ id, alpha: ctx.globalAlpha, order: E.captured.length }, info, transformOf(ctx.getTransform(), info.x, info.y, info.w, info.h)));
  };
  // 일반 요소 → 투명 PNG(모양이 그대로면) 또는 투명 영상(모양이 바뀌면) + 키프레임
  const elStack = [];
  E.el = function (id, draw, iso) {
    if (E.mode !== "split" && !iso) { draw(); return; }
    if (E.mode !== "split") {   // iso: 따로 그린 뒤 합침 (구멍 뚫기 같은 효과가 다른 요소를 지우지 않게)
      const outer = ctx, m = outer.getTransform();
      const c = elStack.pop() || Object.assign(document.createElement("canvas"), { width: W, height: H }), cc = c.getContext("2d");
      if (cc.reset) cc.reset(); else c.width = W;   // 이전 요소의 잘라내기(clip) 등 상태를 완전히 지움
      cc.setTransform(m);
      ctx = cc; setPageCtx(cc);
      try { draw(); } finally { ctx = outer; setPageCtx(outer); }
      outer.save(); outer.setTransform(1, 0, 0, 1, 0, 0); outer.drawImage(c, 0, 0); outer.restore();
      elStack.push(c); return;
    }
    const m = ctx.getTransform(), alpha = ctx.globalAlpha, outer = ctx;
    if (elCtx.reset) elCtx.reset(); else elCanvas.width = W;
    ctx = elCtx; setPageCtx(elCtx);
    try { draw(); } finally { ctx = outer; setPageCtx(outer); }
    // 낮은 해상도로 영역/모양 판별
    smallCtx.clearRect(0, 0, 360, 640); smallCtx.drawImage(elCanvas, 0, 0, 360, 640);
    const d = smallCtx.getImageData(0, 0, 360, 640).data;
    let x0 = 360, y0 = 640, x1 = -1, y1 = -1, h = 0;
    for (let y = 0; y < 640; y++) for (let x = 0; x < 360; x++) { const i = (y * 360 + x) * 4, a = d[i + 3];
      if (a > 3) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; h = (h * 31 + d[i] + d[i + 1] * 7 + d[i + 2] * 13 + a * 17 + i) % 2147483647; } }
    if (x1 < 0) return;   // 아무것도 안 그려짐
    const bx = Math.max(0, x0 * 4 - 8), by = Math.max(0, y0 * 4 - 8), bw = Math.min(W, x1 * 4 + 12) - bx, bh = Math.min(H, y1 * 4 + 12) - by;
    const key = String(h);
    const store = sprites[id] || (sprites[id] = {});
    let png = null;
    if (!store[key]) { store[key] = 1; png = elCanvas.toDataURL("image/png"); }
    E.captured.push({ id, kind: "el", order: E.captured.length, alpha, m: [m.a, m.b, m.c, m.d, m.e, m.f], box: [bx, by, bw, bh], hash: key, png });
  };
  E.over = fn => fn();   // (이전 버전 호환) 이제는 순서대로 각각 레이어가 됨
  E._swap = c => { ctx = c; };
  E._bindLayers = function (real, setter) {
    realCtx = real; setPageCtx = setter || (() => {});
    elCanvas = Object.assign(document.createElement("canvas"), { width: W, height: H }); elCtx = elCanvas.getContext("2d");
    small = Object.assign(document.createElement("canvas"), { width: 360, height: 640 }); smallCtx = small.getContext("2d", { willReadFrequently: true });
  };
  E.renderMode = function (def, f, mode) {
    E.mode = mode; E.captured = [];
    ctx = realCtx; setPageCtx(realCtx);
    realCtx.setTransform(1, 0, 0, 1, 0, 0); realCtx.globalAlpha = 1; realCtx.filter = "none"; realCtx.clearRect(0, 0, W, H);
    try { def.render(f, def.state); } finally { ctx = realCtx; setPageCtx(realCtx); E.mode = "full"; }
    return E.captured;
  };

  // ---------------- 자동 저장 (마지막 입력값 유지) ----------------
  // 글자·색·숫자 → localStorage, 사진 → IndexedDB. 페이지(파일)마다 따로 저장.
  const SAVE_KEY = "motionSave:" + decodeURIComponent(location.pathname);
  const isImgList = v => Array.isArray(v) && (v.length === 0 || (v[0] && "img" in v[0]));
  function plainState(o) { const out = Array.isArray(o) ? [] : {};
    for (const [k, v] of Object.entries(o)) { if (isImgList(v) || typeof v === "function") continue; out[k] = v && typeof v === "object" ? plainState(v) : v; } return out; }
  function mergeSaved(dst, src) {
    for (const [k, v] of Object.entries(src || {})) { if (!(k in dst)) continue; const d = dst[k];
      if (isImgList(d)) continue;
      if (d && typeof d === "object" && !Array.isArray(d)) { if (v && typeof v === "object") mergeSaved(d, v); }
      else if (Array.isArray(d) ? Array.isArray(v) : typeof v === typeof d || (typeof d === "number" && !isNaN(+v))) dst[k] = typeof d === "number" ? +v : v; } }
  let idbP = null;
  const idb = () => idbP || (idbP = new Promise((res, rej) => { const q = indexedDB.open("motionSave", 1); q.onupgradeneeded = () => q.result.createObjectStore("img"); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }));
  const idbDo = (mode, fn) => idb().then(db => new Promise((res, rej) => { const tx = db.transaction("img", mode), st = tx.objectStore("img"); const q = fn(st); tx.oncomplete = () => res(q && q.result); tx.onerror = () => rej(tx.error); }));
  const E_save = {
    state(S) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(plainState(S))); } catch (e) {} },
    loadState(S) { try { const j = localStorage.getItem(SAVE_KEY); if (j) { mergeSaved(S, JSON.parse(j)); return true; } } catch (e) {} return false; },
    async images(key, list) { try { const items = []; for (const o of list) items.push({ blob: o.blob || await (await fetch(o.url)).blob(), label: o.label || "" });
      await idbDo("readwrite", st => st.put(items, SAVE_KEY + "|" + key)); } catch (e) { console.warn("사진 저장 실패", e); } },
    async loadImages(key) { try { return await idbDo("readonly", st => st.get(SAVE_KEY + "|" + key)); } catch (e) { return undefined; } },
    async clear() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
      try { await idbDo("readwrite", st => st.delete(IDBKeyRange.bound(SAVE_KEY + "|", SAVE_KEY + "|\uffff"))); } catch (e) {} },
  };
  E.save = E_save;

  // ---------------- 편집기 UI ----------------
  const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  // 영상 파일도 이미지 칸에 넣을 수 있게: <video> 로 읽고, 화면 시간에 맞춰 프레임을 맞춤
  const loadMedia = (src, type) => /^video\//.test(type || "") ? new Promise((res, rej) => {
    const v = document.createElement("video"); v.muted = true; v.playsInline = true; v.loop = true; v.preload = "auto";
    v.onloadeddata = () => { v.naturalWidth = v.videoWidth; v.naturalHeight = v.videoHeight; v.isVideo = true; res(v); }; v.onerror = rej; v.src = src;
  }) : loadImg(src);
  function collectVideos(o, out = [], depth = 0) {
    if (!o || typeof o !== "object" || depth > 5) return out;
    if (o.isVideo) { out.push(o); return out; }
    if (o instanceof Node) return out;
    for (const k in o) collectVideos(o[k], out, depth + 1);
    return out;
  }
  function syncVideos(S, t, mode) {   // mode: "play" | "still" | "exact"
    const vs = [...new Set(collectVideos(S))];
    if (mode !== "exact") { vs.forEach(v => { const tt = t % (v.duration || 1);
      if (mode === "play") { if (v.paused) v.play().catch(() => {}); if (Math.abs(v.currentTime - tt) > .35) v.currentTime = tt; }
      else { if (!v.paused) v.pause(); if (Math.abs(v.currentTime - tt) > .02 && !v.seeking) v.currentTime = tt; } }); return null; }
    return Promise.all(vs.map(v => new Promise(r => { if (!v.paused) v.pause(); const tt = t % (v.duration || 1); if (Math.abs(v.currentTime - tt) < .001) return r();
      let ok = false; const done = () => { if (ok) return; ok = true; v.removeEventListener("seeked", done); r(); }; v.addEventListener("seeked", done); v.currentTime = tt; setTimeout(done, 2000); })));
  }
  const getK = (S, k) => k.split(".").reduce((o, p) => o[p], S);
  const setK = (S, k, v) => { const ps = k.split("."), last = ps.pop(); ps.reduce((o, p) => o[p], S)[last] = v; };

  const CSS = `
  :root{--bg:#f5f5f4;--panel:#fff;--line:#e4e4e2;--text:#1d1d1b;--muted:#77776f;--accent:#2b59ff}
  *{box-sizing:border-box}body{margin:0;font:14px/1.45 ${SANS};color:var(--text);background:var(--bg)}
  .app{display:grid;grid-template-columns:400px 1fr;height:100vh}
  aside{background:var(--panel);border-right:1px solid var(--line);overflow-y:auto;padding:16px 18px 80px}
  .crumb{font-size:12.5px;color:var(--muted);margin-bottom:6px}.crumb a{color:var(--accent);text-decoration:none}
  h1{font-size:18px;margin:0 0 4px}.sub{color:var(--muted);font-size:12.5px;margin:0 0 14px}
  details{border:1px solid var(--line);border-radius:10px;margin-bottom:10px;background:var(--panel)}
  summary{cursor:pointer;padding:11px 14px;font-weight:600;list-style:none;display:flex;justify-content:space-between;align-items:center}
  summary::-webkit-details-marker{display:none}summary span{color:var(--muted);font-weight:400;font-size:12px}
  .body{padding:2px 14px 14px;display:grid;gap:10px}
  label{display:grid;gap:4px;font-size:12.5px;color:var(--muted)}
  input[type=text],textarea,input[type=number],select{width:100%;font:inherit;color:var(--text);border:1px solid var(--line);border-radius:8px;padding:7px 9px;background:#fafaf9}
  textarea{min-height:64px;resize:vertical}.row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .slots{display:grid;grid-template-columns:repeat(auto-fill,minmax(76px,1fr));gap:8px}
  .slot{position:relative;aspect-ratio:1;border:1px dashed #c9c9c4;border-radius:8px;overflow:hidden;background:#f0f0ee center/cover no-repeat;cursor:pointer}
  .slot input{position:absolute;inset:0;opacity:0;cursor:pointer}
  .slot .x{position:absolute;right:3px;top:3px;width:20px;height:20px;border-radius:50%;border:0;background:rgba(0,0,0,.6);color:#fff;font-size:12px;line-height:20px;cursor:pointer;z-index:2}
  .slot.add{display:grid;place-items:center;color:var(--muted);font-size:22px}
  .slot small{position:absolute;left:0;right:0;bottom:0;background:rgba(0,0,0,.55);color:#fff;font-size:10.5px;padding:2px 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:text;z-index:2}
  .hint{font-size:12px;color:var(--muted);margin:0}
  .sub-h{margin:8px 0 -2px;padding-top:10px;border-top:1px dashed var(--line);font-size:12px;font-weight:600;color:var(--text)}
  input[type=color]{width:100%;height:34px;border:1px solid var(--line);border-radius:8px;padding:2px;background:#fff}
  .colorrow{display:grid;grid-template-columns:42px 1fr;gap:6px;align-items:center}.colorrow input[type=color]{width:42px}
  input.hex{font-family:ui-monospace,Menlo,monospace;text-transform:uppercase}input.hex.bad{border-color:#e5484d}
  main{display:grid;grid-template-rows:1fr auto;min-width:0}
  .stagewrap{display:grid;place-items:center;overflow:hidden;padding:18px}
  canvas{height:calc(100vh - 150px);aspect-ratio:9/16;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.18);background:#000}
  .bar{display:flex;align-items:center;gap:12px;padding:12px 18px;background:var(--panel);border-top:1px solid var(--line)}
  .bar input[type=range]{flex:1}
  button.btn{font:inherit;border:1px solid var(--line);background:#fff;border-radius:8px;padding:8px 14px;cursor:pointer;white-space:nowrap;color:var(--text)}
  button.primary{background:var(--accent);color:#fff;border-color:var(--accent);font-weight:600}button:disabled{opacity:.5;cursor:default}
  #time{font-variant-numeric:tabular-nums;color:var(--muted);min-width:120px}#status{font-size:12.5px;color:var(--muted)}
  @media (prefers-color-scheme:dark){:root{--bg:#161616;--panel:#1f1f1f;--line:#333;--text:#eee;--muted:#9a9a94}
    input[type=text],textarea,input[type=number],select,button.btn:not(.primary),input[type=color]{background:#262626;color:var(--text)}.slot{background-color:#2a2a2a;border-color:#444}}
  @media (max-width:800px){.app{grid-template-columns:1fr;height:auto}canvas{height:70vh}}`;

  E.start = async function (def) {
    const S = def.state;
    S.fps = S.fps || 60;
    document.title = def.title;
    const style = document.createElement("style"); style.textContent = CSS; document.head.appendChild(style);
    const fontLink = document.createElement("link"); fontLink.rel = "stylesheet"; fontLink.href = "https://fonts.googleapis.com/css2?family=Anton&display=block"; document.head.appendChild(fontLink);

    const sectionsHtml = def.sections.map(sec => `
      <details ${sec.closed ? "" : "open"}><summary>${sec.title}<span data-dur="${sec.durKey || ""}"></span></summary><div class="body">
      ${sec.hint ? `<p class="hint">${sec.hint}</p>` : ""}
      ${(sec.rows || []).map(row => `<div class="${row.length > 1 ? "row" : ""}">${row.map(field).join("")}</div>`).join("")}
      </div></details>`).join("");
    function field(fd) {
      if (fd.type === "sub") return `<p class="sub-h">${fd.label}</p>`;   // 섹션 안 작은 제목
      if (fd.type === "images") return `<div><p class="hint" style="margin-bottom:6px">${fd.label}</p><div class="slots" data-list="${fd.key}" data-max="${fd.max || 1}" ${fd.labels ? 'data-labels="1"' : ""}></div></div>`;
      if (fd.type === "textarea") return `<label>${fd.label}<textarea data-key="${fd.key}"></textarea></label>`;
      if (fd.type === "bool") return `<label>${fd.label}<select data-key="${fd.key}" data-bool="1"><option value="1">켜기</option><option value="">끄기</option></select></label>`;
      if (fd.type === "select") return `<label>${fd.label}<select data-key="${fd.key}">${fd.options.map(o => `<option value="${o[0]}">${o[1]}</option>`).join("")}</select></label>`;
      if (fd.type === "number") return `<label>${fd.label}<input type="number" step="any" min="${fd.min || 1}" max="${fd.max || 600}" data-key="${fd.key}"></label>`;
      if (fd.type === "color") return `<label>${fd.label}<span class="colorrow"><input type="color" data-key="${fd.key}"><input type="text" class="hex" data-hex="${fd.key}" maxlength="7" spellcheck="false" placeholder="#000000"></span></label>`;
      return `<label>${fd.label}<input type="text" data-key="${fd.key}"></label>`;
    }
    document.body.innerHTML = `
      <div class="app"><aside>
        <div class="crumb"><a href="index.html">← ${def.group || "목록"}</a></div>
        <h1>${def.title}</h1><p class="sub">${def.intro || ""}</p>
        ${sectionsHtml}
        <details open><summary>내보내기 설정</summary><div class="body">
          <p class="hint">입력한 글자·색·사진은 이 브라우저에 자동 저장돼서, 다시 열어도 마지막 내용 그대로 나와요. <span id="saveNote"></span></p>
          <button class="btn" id="resetSave" type="button">기본값으로 되돌리기</button>
          <label>프레임레이트 (높을수록 부드러움)<select data-key="fps"><option value="60">60fps (가장 부드러움)</option><option value="30">30fps</option><option value="24">24fps</option></select></label>
        </div></details>
      </aside><main>
        <div class="stagewrap"><canvas id="cv" width="${W}" height="${H}"></canvas></div>
        <div class="bar"><button class="btn" id="play">❚❚ 일시정지</button><input type="range" id="scrub" min="0" value="0"><span id="time"></span>
          <button class="btn primary" id="export">MP4 내보내기</button>${def.alpha ? '<button class="btn" id="exportAlpha" title="투명한 부분을 살린 WebM(VP9 알파)">투명 배경 내보내기</button>' : ""}<span id="status"></span></div>
      </main></div>`;
    const cv = document.getElementById("cv");
    if (def.alpha) cv.style.background = "repeating-conic-gradient(#d9d9d9 0 25%, #f4f4f4 0 50%) 0 0 / 28px 28px";
    ctx = cv.getContext("2d");
    E._bindLayers(ctx, def.setCtx);
    window.__def = def;

    // 기본 이미지
    for (const [key, files] of Object.entries(def.images || {})) {
      const list = [];
      for (const it of files) { const url = (window.DEFAULT_IMAGES || {})[it.file]; if (url) list.push({ img: await loadImg(url), url, label: it.label || "" }); }
      setK(S, key, list);
    }
    // 저장된 마지막 입력값 복원
    const hadSave = E_save.loadState(S);
    const imgKeys = new Set(Object.keys(def.images || {}));
    def.sections.forEach(sec => (sec.rows || []).flat().forEach(fd => { if (fd.type === "images") imgKeys.add(fd.key); }));
    for (const key of imgKeys) {
      const saved = await E_save.loadImages(key); if (!Array.isArray(saved)) continue;
      const list = [];
      for (const it of saved) { try { const url = URL.createObjectURL(it.blob); list.push({ img: await loadMedia(url, it.blob.type), url, blob: it.blob, label: it.label || "" }); } catch (e) {} }
      setK(S, key, list);
    }
    let saveT = 0; const saveLater = () => { clearTimeout(saveT); saveT = setTimeout(() => E_save.state(S), 250); };
    try { await document.fonts.load("200px Anton"); } catch (e) {}

    let frame = 0, playing = true, lastTs = 0, exporting = false;
    const total = () => Math.max(2, Math.round(def.length(S)));
    const scrub = document.getElementById("scrub"), timeEl = document.getElementById("time");
    function render(f) { ctx.setTransform(1, 0, 0, 1, 0, 0); if (def.alpha) ctx.clearRect(0, 0, W, H); ctx.globalAlpha = 1; ctx.filter = "none"; ctx.setLineDash([]); def.render(f, S); }
    function refresh() {
      scrub.max = total() - 1;
      document.querySelectorAll("[data-dur]").forEach(el => { const k = el.dataset.dur; if (k && def.durations && def.durations[k]) el.textContent = (def.durations[k](S) / FPS).toFixed(2) + "초"; });
    }
    function draw() { const T = total(); frame = Math.min(frame, T - 1); if (!exporting) syncVideos(S, frame / FPS, playing ? "play" : "still"); render(frame); scrub.value = Math.floor(frame); timeEl.textContent = `${(frame / FPS).toFixed(2)} / ${(T / FPS).toFixed(2)}초`; }
    function loop(ts) { const dt = lastTs ? Math.min(ts - lastTs, 100) : 0; lastTs = ts; if (playing && !exporting) { frame = (frame + dt / 1000 * FPS) % (total() - 1); draw(); } requestAnimationFrame(loop); }
    document.getElementById("play").onclick = e => { playing = !playing; e.target.textContent = playing ? "❚❚ 일시정지" : "▶ 재생"; };
    scrub.oninput = () => { frame = +scrub.value; playing = false; document.getElementById("play").textContent = "▶ 재생"; draw(); };

    document.querySelectorAll("[data-key]").forEach(el => {
      const v0 = getK(S, el.dataset.key); el.value = el.dataset.bool ? (v0 ? "1" : "") : v0;
      const upd = () => { setK(S, el.dataset.key, el.dataset.bool ? el.value === "1" : el.type === "number" ? Math.max(+el.min || 1, +el.value || 0) : el.value);
        // 같은 항목이 다른 섹션에도 있으면 함께 맞춤
        document.querySelectorAll('[data-key="' + el.dataset.key + '"]').forEach(o => { if (o !== el) { o.value = el.value; const hx = o.parentElement.querySelector("input.hex"); if (hx) hx.value = String(el.value).toUpperCase(); } });
        refresh(); draw(); saveLater(); };
      el.addEventListener("input", upd); el.addEventListener("change", upd);
    });
    // 색 값 직접 입력 (#RRGGBB, #RGB, # 없이도 됨)
    document.querySelectorAll("input.hex").forEach(tx => {
      const picker = tx.parentElement.querySelector('input[type=color]');
      const sync = () => { tx.value = picker.value.toUpperCase(); tx.classList.remove("bad"); };
      sync(); picker.addEventListener("input", () => { if (document.activeElement !== tx) sync(); });
      const apply = () => {
        let v = tx.value.trim().replace(/^#?/, "#");
        if (/^#[0-9a-f]{3}$/i.test(v)) v = "#" + [...v.slice(1)].map(c => c + c).join("");
        if (/^#[0-9a-f]{6}$/i.test(v)) { tx.classList.remove("bad"); picker.value = v.toLowerCase(); picker.dispatchEvent(new Event("input")); }
        else tx.classList.add("bad");
      };
      tx.addEventListener("input", () => { const v = tx.value.trim(); if (/^#?[0-9a-f]{6}$/i.test(v)) apply(); else tx.classList.toggle("bad", !/^#?[0-9a-f]{0,6}$/i.test(v)); });   // 6자리가 되면 바로 적용
      tx.addEventListener("keydown", e => { if (e.key === "Enter") { apply(); tx.blur(); } });
      tx.addEventListener("change", apply); tx.addEventListener("blur", () => setTimeout(sync, 0));
    });
    function renderSlots(box) {
      const key = box.dataset.list, max = +box.dataset.max, list = getK(S, key);
      if (box._ready) E_save.images(key, list); box._ready = true;
      box.innerHTML = "";
      list.forEach((o, i) => {
        const d = document.createElement("div"); d.className = "slot"; const acc = "image/*,video/*";
        if (o.img && o.img.isVideo) { d.style.position = "relative"; const pv = document.createElement("video"); pv.src = o.url; pv.muted = true; pv.loop = true; pv.autoplay = true; pv.playsInline = true;
          Object.assign(pv.style, { position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit", pointerEvents: "none" }); d.append(pv); }
        else d.style.backgroundImage = `url("${o.url}")`;
        const inp = document.createElement("input"); inp.type = "file"; inp.accept = acc;
        inp.onchange = async () => { const f = inp.files[0]; if (!f) return; const url = URL.createObjectURL(f); list[i] = { ...o, img: await loadMedia(url, f.type), url, blob: f }; renderSlots(box); refresh(); draw(); };
        const x = document.createElement("button"); x.className = "x"; x.textContent = "✕"; x.title = "삭제";
        x.onclick = e => { e.stopPropagation(); e.preventDefault(); list.splice(i, 1); renderSlots(box); refresh(); draw(); };
        d.append(inp, x);
        if (box.dataset.labels) { const s = document.createElement("small"); s.textContent = o.label || "라벨 없음"; s.title = "눌러서 라벨 바꾸기";
          s.onclick = e => { e.stopPropagation(); e.preventDefault(); const v = prompt("라벨", o.label || ""); if (v !== null) { o.label = v; renderSlots(box); draw(); } }; d.append(s); }
        box.append(d);
      });
      if (list.length < max) {
        const d = document.createElement("div"); d.className = "slot add"; d.textContent = "+";
        const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*,video/*"; inp.multiple = true;
        inp.onchange = async () => { for (const f of [...inp.files].slice(0, max - list.length)) { const url = URL.createObjectURL(f); list.push({ img: await loadMedia(url, f.type), url, blob: f, label: box.dataset.labels ? f.name.replace(/\.[^.]+$/, "") : "" }); } renderSlots(box); refresh(); draw(); };
        d.append(inp); box.append(d);
      }
    }
    document.querySelectorAll("[data-list]").forEach(renderSlots);
    if (hadSave) document.getElementById("saveNote").textContent = "(저장된 내용을 불러왔어요)";
    document.getElementById("resetSave").onclick = async () => { if (!confirm("저장된 입력값을 지우고 기본값으로 되돌릴까요?")) return; await E_save.clear(); location.reload(); };

    document.getElementById("export").onclick = async () => {
      const btn = document.getElementById("export"), st = document.getElementById("status");
      if (!("VideoEncoder" in window) || !window.Mp4Muxer) { st.textContent = "내보내기는 Chrome 에서만 돼요 (인터넷 연결 필요)."; return; }
      exporting = true; btn.disabled = true;
      try {
        const OF = +S.fps, N = Math.round((total() - 1) / FPS * OF) + 1;
        const muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: "avc", width: W, height: H, frameRate: OF }, fastStart: "in-memory" });
        let encErr = null;
        const enc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: e => { encErr = e; } });
        enc.configure({ codec: "avc1.640034", width: W, height: H, bitrate: OF > 30 ? 40_000_000 : 24_000_000, framerate: OF, avc: { format: "avc" } });
        for (let i = 0; i < N; i++) {
          if (encErr) throw encErr;
          await syncVideos(S, i / OF, "exact");
          render(i * FPS / OF);
          const vf = new VideoFrame(cv, { timestamp: Math.round(i * 1e6 / OF), duration: Math.round(1e6 / OF) });
          enc.encode(vf, { keyFrame: i % (OF * 2) === 0 }); vf.close();
          if (enc.encodeQueueSize > 8) await new Promise(r => setTimeout(r, 5));
          if (i % 6 === 0) { st.textContent = `내보내는 중… ${Math.round(i / N * 100)}%`; await new Promise(r => setTimeout(r)); }
        }
        await enc.flush(); muxer.finalize();
        const blob = new Blob([muxer.target.buffer], { type: "video/mp4" });
        await __save(blob, `${def.file || "motion"}_${Date.now()}.mp4`);
        window.__lastExport = { bytes: blob.size, frames: N, fps: OF };
        st.textContent = `완료 (${(blob.size / 1e6).toFixed(1)}MB, ${(N / OF).toFixed(2)}초, ${OF}fps)`;
      } catch (e) { st.textContent = "내보내기 실패: " + e.message; console.error(e); }
      exporting = false; btn.disabled = false; draw();
    };
    // 투명 배경 내보내기: 캔버스를 VP9(알파 채널 포함) WebM 으로 녹화. 실제 시간만큼 걸려요.
    if (def.alpha) document.getElementById("exportAlpha").onclick = async () => {
      const btn = document.getElementById("exportAlpha"), st = document.getElementById("status");
      const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8"].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
      if (!mime || !cv.captureStream) { st.textContent = "투명 내보내기는 Chrome 에서만 돼요."; return; }
      exporting = true; btn.disabled = true;
      try {
        const OF = +S.fps, N = Math.round((total() - 1) / FPS * OF) + 1, step = 1000 / OF;
        const stream = cv.captureStream(0), track = stream.getVideoTracks()[0], chunks = [];
        const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: OF > 30 ? 40_000_000 : 25_000_000 });
        rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
        render(0); rec.start(); const t0 = performance.now();
        for (let i = 0; i < N; i++) {
          await syncVideos(S, i / OF, "exact"); render(i * FPS / OF); track.requestFrame();
          if (i % 4 === 0) st.textContent = `투명 내보내는 중… ${Math.round(i / N * 100)}% (이 탭을 보이는 상태로 두세요)`;
          const wait = t0 + (i + 1) * step - performance.now(); await new Promise(r => setTimeout(r, Math.max(0, wait)));
        }
        await new Promise(r => { rec.onstop = r; rec.stop(); }); track.stop();
        const blob = new Blob(chunks, { type: "video/webm" });
        await __save(blob, `${def.file || "motion"}_투명_${Date.now()}.webm`);
        window.__lastExport = { bytes: blob.size, frames: N, fps: OF, alpha: true };
        st.textContent = `완료 (투명 WebM ${(blob.size / 1e6).toFixed(1)}MB, ${(N / OF).toFixed(2)}초, ${OF}fps)`;
      } catch (e) { st.textContent = "투명 내보내기 실패: " + e.message; console.error(e); }
      exporting = false; btn.disabled = false; draw();
    };

    refresh(); draw(); requestAnimationFrame(loop);
    window.__render = f => { frame = f; playing = false; draw(); };
    window.__total = total;
  };
})();

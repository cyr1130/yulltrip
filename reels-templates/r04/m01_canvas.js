const E = Engine, U = U04, I = U04.icons; let ctx;
const LAND = !!window.M01_LAND;   // true = 가로 16:9 (motion08)
const { W, H, FPS, clamp, lerp, prog, easeOut, easeIn, easeInOut, back } = E;

// 섹션 5개 (위→아래). 섹션마다 이미지 최대 4장. 이미지가 없으면 그 섹션(노드·연결선)은 통째로 안 보여요.
// 마지막 섹션(5)은 '결과' 섹션: 맨 마지막에 '생성 중' 연출과 함께 나와요.
const NSEC = 5, MAXN = 4;
const SEC0 = [
  { kind: "video", badge: "", names: "500일의 썸머_길이 다듬기" },
  { kind: "video", badge: "AI", names: "500일의 썸머_길이 다듬기_모션 캡처" },
  { kind: "video", badge: "AI", names: "500일의 썸머_길이 다듬기_모션 캡처_길이 다듬기" },
  { kind: "image", badge: "", names: "엘레베이터 배경01\n엘레베이터 배경02\n남자주인공\n여자주인공" },
  { kind: "video", badge: "초안", names: "동영상 1" },
];
const DEF_IMG = [["m01_n0.jpg"], ["m01_n5.jpg"], ["m01_n6.jpg"], ["m01_n1.jpg", "m01_n2.jpg", "m01_n3.jpg", "m01_n4.jpg"], ["m01_n7.jpg"]];
const S = {
  keyMode: "solid", bg: "#0f0f0f", keyBg: "#00ff00", showDots: true,
  focus: "all", zoomMode: "zoomin", hidePlay: true, dimOthers: false,
  img: { s1: [], s2: [], s3: [], s4: [], s5: [] },
  sec: SEC0.map(o => ({ ...o })),
  resultCount: "3", genText: "생성 중", showGen: true,
  linkStyle: "glow", flowLoop: true, flowSec: 2.2,
  colors: { glow: "#1e8fff", dot: "#2e2e2e", label: "#8e8e8e", line: "#6a6a6a", node: "#1d1d1d", badge: "#ffffff", play: "#000000", shimmer: "#3a3a3a" },
  d1: 30, d2: 22, d3: 40, d4: 60, zoomDur: 30,
};
const T = () => { const a = +S.d1, b = +S.d2, c = S.showGen ? +S.d3 : 8, d = +S.d4; return { s2: a, s3: a + b, s4: a + b + c, total: a + b + c + d }; };

// ---------- 배치 ----------
const u = 1.6, LEFT = 80, RIGHT = 1360, CW = RIGHT - LEFT, GAP = 20, VGAP = 98;
const SINGLE = { w: 780, h: 332 }, RESULT = { w: 700, h: 394 }, MULTI_H = 460;
function imgs(k) { const l = S.img["s" + (k + 1)]; return Array.isArray(l) ? l.filter(o => o && o.img).slice(0, MAXN) : []; }
function names(k) { return String(S.sec[k].names || "").split("\n").map(s => s.trim()); }
let LAY = null;
function layout() {
  if (LAND) return layoutH();
  const nodes = [], secs = []; let y = 240, singleIdx = 0;
  const vis = []; for (let k = 0; k < NSEC; k++) if (imgs(k).length) vis.push(k);
  const resultK = vis.length ? vis[vis.length - 1] : -1;
  vis.forEach(k => {
    const list = imgs(k), n = list.length, nm = names(k), isRes = k === resultK && vis.length > 1, sec = { k, nodes: [], isRes };
    if (n === 1) {
      const sz = isRes ? RESULT : SINGLE, x = isRes ? (LEFT + RIGHT) / 2 - sz.w / 2 : (singleIdx++ % 2 ? RIGHT - sz.w : LEFT);
      sec.nodes.push({ k, i: 0, x, y, w: sz.w, h: sz.h }); y += sz.h + VGAP;
    } else {
      const w = (CW - GAP * (n - 1)) / n, h = Math.min(MULTI_H, w * 1.5);
      for (let i = 0; i < n; i++) sec.nodes.push({ k, i, x: LEFT + i * (w + GAP), y, w, h });
      y += h + VGAP;
    }
    sec.nodes.forEach(o => { o.img = list[o.i].img; o.label = nm[o.i] ?? ""; o.kind = S.sec[k].kind; o.badge = S.sec[k].badge; o.isRes = isRes; o.id = nodes.length; nodes.push(o); });
    secs.push(sec);
  });
  return { nodes, secs, edges: makeEdges(secs) };
}
function makeEdges(secs) {
  // 연결선: 노드 1개짜리 섹션 → 다음의 '1개짜리 섹션 또는 결과'로 이어짐 / 여러 장짜리 섹션 → 결과로 모임
  const edges = [];
  secs.forEach((s, si) => {
    if (s.isRes) return;
    const rest = secs.slice(si + 1); if (!rest.length) return;
    const res = rest.find(o => o.isRes);
    const tgt = s.nodes.length === 1 ? rest.find(o => o.nodes.length === 1 || o.isRes) : (res || rest[0]);
    if (!tgt) return;
    const skipped = secs.slice(si + 1, secs.indexOf(tgt));
    s.nodes.forEach((a, ai) => {
      if (tgt.nodes.length === 1) edges.push({ a, b: tgt.nodes[0], skipped, fan: s.nodes.length > 1 });
      else if (s.nodes.length === 1) tgt.nodes.forEach(b => edges.push({ a, b, skipped, fan: false }));
      else edges.push({ a, b: tgt.nodes[Math.min(ai, tgt.nodes.length - 1)], skipped, fan: false });
    });
  });
  return edges;
}
// 가로 16:9: 섹션이 왼쪽 → 오른쪽 기둥으로 놓임. 여러 장이면 같은 크기로 위아래로 쌓임.
const SINGLE_H = { w: 600, h: 338 }, RESULT_H = { w: 660, h: 371 }, HGAP = 190, RGAP = 92;
function layoutH() {
  const nodes = [], secs = []; let x = 0;
  const vis = []; for (let k = 0; k < NSEC; k++) if (imgs(k).length) vis.push(k);
  const resultK = vis.length ? vis[vis.length - 1] : -1;
  vis.forEach(k => {
    const list = imgs(k), n = list.length, nm = names(k), isRes = k === resultK && vis.length > 1, sec = { k, nodes: [], isRes };
    if (n === 1) { const sz = isRes ? RESULT_H : SINGLE_H; sec.nodes.push({ k, i: 0, x, y: -sz.h / 2, w: sz.w, h: sz.h }); x += sz.w + HGAP; }
    else {
      const h = Math.min(380, (1740 - (n - 1) * RGAP) / n), w = h * .8, tot = n * h + (n - 1) * RGAP;
      for (let i = 0; i < n; i++) sec.nodes.push({ k, i, x, y: -tot / 2 + i * (h + RGAP), w, h });
      x += w + HGAP;
    }
    sec.nodes.forEach(o => { o.img = list[o.i].img; o.label = nm[o.i] ?? ""; o.kind = S.sec[k].kind; o.badge = S.sec[k].badge; o.isRes = isRes; o.id = nodes.length; nodes.push(o); });
    secs.push(sec);
  });
  return { nodes, secs, edges: makeEdges(secs) };
}
function edgePathH(e) {
  const { a: A, b: B } = e, a = [A.x + A.w, A.y + A.h / 2], b = [B.x, B.y + B.h / 2];
  if (e.skipped.length) {   // 여러 장 기둥을 지나갈 땐 줄 사이 틈으로 (이름표 아래쪽)
    const col = e.skipped.find(s => s.nodes.length > 1) || e.skipped[0], ns = col.nodes, want = (a[1] + b[1]) / 2;
    let gy = want, bd = 1e9;
    for (let i = 0; i < ns.length - 1; i++) { const g = ns[i].y + ns[i].h + 9 * u, d = Math.abs(g - want); if (d < bd) { bd = d; gy = g; } }
    if (ns.length < 2) gy = ns[0].y - 60 * u;
    const xl = ns[0].x - 60 * u, xr = ns[0].x + ns[0].w + 60 * u, c1 = (xl - a[0]) * .5, c2 = (b[0] - xr) * .5;
    return { a, b, segs: [[a, [a[0] + c1, a[1]], [xl - c1, gy], [xl, gy]], [[xl, gy], [xl + 1, gy], [xr - 1, gy], [xr, gy]], [[xr, gy], [xr + c2, gy], [b[0] - c2, b[1]], b]] };
  }
  const c = Math.max(70 * u, Math.abs(b[0] - a[0]) * .45);
  return { a, b, segs: [[a, [a[0] + c, a[1]], [b[0] - c, b[1]], b]] };
}

// ---------- 카메라 ----------
function bounds(list) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  list.forEach(o => { x0 = Math.min(x0, o.x); y0 = Math.min(y0, o.y - 44 * u); x1 = Math.max(x1, o.x + o.w); y1 = Math.max(y1, o.y + o.h); });
  return { x0, y0, x1, y1 };
}
function overviewCam() {
  if (!LAY.nodes.length) return { x: W / 2, y: H / 2, s: 1 };
  const b = bounds(LAY.nodes), m = LAND ? 110 : 60, s = Math.min((W - 2 * m) / (b.x1 - b.x0), (H - 2 * m) / (b.y1 - b.y0), 1.15);
  return { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, s };
}
function focusTarget() {   // "all" | "s3" (섹션 전체) | "s4_2" (섹션 4의 2번)
  const m = /^s(\d)(?:_(\d))?$/.exec(S.focus || ""); if (!m) return null;
  const k = +m[1] - 1, sec = LAY.secs.find(s => s.k === k); if (!sec) return null;
  if (m[2] === undefined) return sec.nodes;
  const nd = sec.nodes[+m[2] - 1]; return nd ? [nd] : null;
}
function focusCam(list) {
  const b = bounds(list), bw = b.x1 - b.x0 + 30 * u, bh = b.y1 - b.y0 + 20 * u;
  const s = LAND ? Math.min((W - 500) / bw, (H - 160) / bh) : Math.min((W - 90) / bw, (H - 500) / bh);
  return { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, s };
}
function camAt(f, t) {
  const ov = overviewCam(), tg = focusTarget();
  if (!tg) { const k = lerp(1, 1.035, easeInOut(prog(f, 0, t.total))); return { ...ov, s: ov.s * k }; }
  const fc = focusCam(tg);
  if (S.zoomMode === "close") { const k = lerp(1, 1.05, easeInOut(prog(f, 0, t.total))); return { ...fc, s: fc.s * k }; }
  const zs = t.s4 + 2, p = easeInOut(prog(f, zs, zs + +S.zoomDur));
  const k = lerp(1, 1.025, easeInOut(prog(f, zs + +S.zoomDur, t.total)));
  return { x: lerp(ov.x, fc.x, p), y: lerp(ov.y, fc.y, p), s: Math.exp(lerp(Math.log(ov.s), Math.log(fc.s), p)) * k };
}
let CAM = { x: 0, y: 0, s: 1 };
const focusAmt = (f, t) => !focusTarget() ? 0 : S.zoomMode === "close" ? 1 : easeInOut(prog(f, t.s4 + 2, t.s4 + 2 + +S.zoomDur));

// ---------- 그리기 ----------
function dots() {
  if (!S.showDots || U.green(S)) return;
  const step = 22 * u * CAM.s, r = Math.max(1, Math.min(3.2, 1.25 * u * CAM.s));
  if (step < 6) return;
  const ox = W / 2 - CAM.x * CAM.s, oy = H / 2 - CAM.y * CAM.s, sx = ((ox % step) + step) % step, sy = ((oy % step) + step) % step;
  ctx.fillStyle = S.colors.dot;
  for (let y = sy; y < H; y += step) for (let x = sx; x < W; x += step) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
}
function cubic(P, t) { const m = 1 - t; return [0, 1].map(k => m * m * m * P[0][k] + 3 * m * m * t * P[1][k] + 3 * m * t * t * P[2][k] + t * t * t * P[3][k]); }
function labelEnd(o) { ctx.save(); ctx.font = `400 ${19 * u}px ${E.SANS}`; const w = ctx.measureText(o.label).width; ctx.restore(); return o.x + 30 * u + w; }
// 건너뛰는 섹션(여러 장)이 있으면 그 사이 틈으로 지나갈 x
function gapX(skipped, want) {
  let best = want, bd = 1e9;
  for (const s of skipped) {
    if (s.nodes.length < 2) continue;
    for (let i = 0; i < s.nodes.length - 1; i++) { const g = (s.nodes[i].x + s.nodes[i].w + s.nodes[i + 1].x) / 2, d = Math.abs(g - want); if (d < bd) { bd = d; best = g; } }
    return best;
  }
  return want;
}
function edgePath(e) {
  if (LAND) return edgePathH(e);
  const { a: A, b: B } = e, m = 36 * u, ac = A.x + A.w / 2, bTop = B.y;
  // 옆으로 비켜 있으면 왼쪽 변으로 들어감 (섹션1 → 섹션2 처럼)
  if (!e.fan && !e.skipped.length && B.w === SINGLE.w && A.w === SINGLE.w && ac < B.x + m) {
    const a = [clamp(ac + 30 * u, A.x + m, A.x + A.w - m), A.y + A.h], b = [B.x, B.y + B.h / 2], c = Math.abs(b[1] - a[1]) * .62;
    return { a, b, segs: [[a, [a[0], a[1] + c], [b[0] - c * .7, b[1]], b]] };
  }
  if (e.fan) {   // 여러 장 → 결과로 모임
    const a = [ac, A.y + A.h], b = [B.x + B.w / 2, bTop], dy = b[1] - a[1];
    return { a, b, segs: [[a, [a[0], a[1] + dy * .22], [b[0], b[1] - dy * .95], b]] };
  }
  // 위아래로 겹치는 범위에서 곧게 (이름표는 피해서)
  const lo = Math.max(A.x, B.x) + m, hi = Math.min(A.x + A.w, B.x + B.w) - m;
  let x = B.isRes ? B.x + B.w / 2 : (lo + hi) / 2;
  if (!B.isRes) x = Math.max(x, labelEnd(B) + 20 * u);
  if (e.skipped.length) x = gapX(e.skipped, B.x + B.w / 2);
  const ax = clamp(x, A.x + m, A.x + A.w - m), bx = (e.skipped.length || B.isRes || B.w !== SINGLE.w) ? clamp(B.x + B.w / 2, B.x + m, B.x + B.w - m) : clamp(x, B.x + m, B.x + B.w - m);
  const a = [ax, A.y + A.h], b = [bx, bTop];
  if (e.skipped.length) {   // 틈으로 곧게 내려온 뒤 결과 위에서 휘어 들어감
    const mid = [ax, bTop - 70 * u];
    return { a, b, segs: [[a, [ax, (a[1] + mid[1]) / 2], [ax, (a[1] + mid[1]) / 2], mid], [mid, [ax, bTop - 30 * u], [bx, bTop - 40 * u], b]] };
  }
  const c = Math.max(22 * u, Math.abs(b[1] - a[1]) * .5);
  return { a, b, segs: [[a, [a[0], a[1] + c], [b[0], b[1] - c], b]] };
}
// 경로를 점 목록으로 (길이 비율로 자르기 위해)
function pathPts(segs) {
  const pts = []; segs.forEach((sg, si) => { for (let k = si ? 1 : 0; k <= 40; k++) pts.push(cubic(sg, k / 40)); });
  const len = [0]; for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = len[len.length - 1] || 1; return { pts, t: len.map(v => v / L) };
}
function strokePart(P, t0, t1) {   // 경로의 t0~t1 부분만
  t0 = clamp(t0); t1 = clamp(t1); if (t1 <= t0) return false;
  const { pts, t } = P; let started = false; ctx.beginPath();
  for (let i = 1; i < pts.length; i++) {
    if (t[i] < t0) continue; if (t[i - 1] > t1) break;
    const s0 = t[i] === t[i - 1] ? 0 : clamp((t0 - t[i - 1]) / (t[i] - t[i - 1])), s1 = t[i] === t[i - 1] ? 1 : clamp((t1 - t[i - 1]) / (t[i] - t[i - 1]));
    const p0 = [lerp(pts[i - 1][0], pts[i][0], s0), lerp(pts[i - 1][1], pts[i][1], s0)], p1 = [lerp(pts[i - 1][0], pts[i][0], s1), lerp(pts[i - 1][1], pts[i][1], s1)];
    if (!started) { ctx.moveTo(...p0); started = true; } ctx.lineTo(...p1);
  }
  return started;
}
function plusPort(x, y, a) {
  ctx.save(); ctx.globalAlpha *= a; ctx.beginPath(); ctx.arc(x, y, 11 * u, 0, 7); ctx.fillStyle = U.green(S) ? S.keyBg : S.bg; ctx.fill();
  ctx.strokeStyle = "#9aa0a8"; ctx.lineWidth = 1.4 * u; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 4.5 * u, y); ctx.lineTo(x + 4.5 * u, y); ctx.moveTo(x, y - 4.5 * u); ctx.lineTo(x, y + 4.5 * u); ctx.lineWidth = 1.2 * u; ctx.stroke(); ctx.restore();
}
// 빛줄기: 밝은 파란 덩어리가 선을 따라 흐름 (가운데는 살짝 노란 빛)
function pulse(P, head, len) {
  const N = 14, glow = S.colors.glow;
  ctx.save(); ctx.lineCap = "round"; ctx.shadowColor = glow; ctx.shadowBlur = 10 * u * CAM.s;
  for (let k = 0; k < N; k++) {
    const q0 = k / N, q1 = (k + 1) / N, t0 = head - len + q0 * len, t1 = head - len + q1 * len, w = Math.sin(Math.PI * (q0 + q1) / 2);
    if (!strokePart(P, t0, t1)) continue;
    ctx.strokeStyle = E.hexA(glow, .25 + .75 * w); ctx.lineWidth = (1.6 + 1.6 * w) * u; ctx.stroke();
    if (q0 > .3 && q1 < .75) { ctx.shadowBlur = 0; ctx.strokeStyle = `rgba(255,214,140,${.32 * w})`; ctx.lineWidth = 1.4 * u; ctx.stroke(); ctx.shadowBlur = 10 * u * CAM.s; }
  }
  ctx.restore();
}
function link(e, p, f, done) {
  if (p <= 0) return; const { a, b, segs } = edgePath(e);
  if (S.linkStyle !== "glow") {
    const N = 48 * segs.length; ctx.beginPath(); ctx.moveTo(...a);
    for (let k = 1; k <= N; k++) { const t = p * k / N * segs.length, si = Math.min(segs.length - 1, Math.floor(t)); ctx.lineTo(...cubic(segs[si], Math.min(1, t - si))); }
    ctx.strokeStyle = S.colors.line; ctx.lineWidth = 1.6 * u; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
    ctx.fillStyle = S.colors.line; ctx.beginPath(); ctx.arc(a[0], a[1], 3.2 * u, 0, 7); ctx.fill(); if (p > .97) { ctx.beginPath(); ctx.arc(b[0], b[1], 3.2 * u, 0, 7); ctx.fill(); }
    return;
  }
  const P = pathPts(segs), glow = S.colors.glow, L = .45;
  // 바탕 선 (연결되는 만큼)
  if (strokePart(P, 0, p)) { ctx.strokeStyle = E.hexA(glow, .8); ctx.lineWidth = 1.5 * u; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke(); }
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(a[0], a[1], 3 * u, 0, 7); ctx.fill();
  // 연결되는 동안: 끝에 빛 덩어리 / 다 연결된 뒤: 반복해서 흐름
  if (p < 1) pulse(P, p, Math.min(L, p));
  else if (S.flowLoop) { const per = Math.max(.5, +S.flowSec || 2.2) * FPS, ph = (((f - done) / per) % 1 + 1) % 1; pulse(P, ph * (1 + L), L); }
  else { const ph = prog(f, done, done + 10); if (ph < 1) pulse(P, 1 + L * ph, L); }
  const q = P.pts[P.pts.length - 3], dx = b[0] - q[0], dy = b[1] - q[1], dl = Math.hypot(dx, dy) || 1, pa = easeOut(prog(p, .85, 1));
  if (pa > 0) { const key = Math.round(b[0]) + "," + Math.round(b[1]); if (!PORTS.has(key)) PORTS.set(key, [b[0] - dx / dl * 13 * u, b[1] - dy / dl * 13 * u, pa]); }
}
const PORTS = new Map();
function labelRow(o, x, y) {
  ctx.save(); ctx.beginPath(); ctx.rect(x - 4, y - 30 * u, Math.max(o.w, 10) + 8 + (LAND && o.w < 400 ? HGAP * .8 : 0), 60 * u); ctx.clip();
  (o.kind === "image" ? I.image : I.video)(x + 10 * u, y, 20 * u, S.colors.label, 1.8);
  ctx.fillStyle = S.colors.label; ctx.font = `400 ${19 * u}px ${E.SANS}`; ctx.textBaseline = "middle"; ctx.fillText(o.label, x + 30 * u, y + 1); ctx.restore();
}
function badge(text, x, y) {
  if (!text) return; ctx.save(); ctx.font = `500 ${13 * u}px ${E.SANS}`; const w = ctx.measureText(text).width + 12 * u, h = 22 * u;
  E.rr(x, y, w, h, 5 * u); ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fill(); ctx.strokeStyle = E.hexA(S.colors.badge, .45); ctx.lineWidth = 1.2 * u; ctx.stroke();
  ctx.fillStyle = S.colors.badge; ctx.textBaseline = "middle"; ctx.fillText(text, x + 6 * u, y + h / 2 + .5); ctx.restore();
}
function countPill(text, x, y) {
  if (!text) return; ctx.save(); ctx.font = `600 ${15 * u}px ${E.SANS}`; const tw = ctx.measureText(text).width, w = tw + 36 * u, h = 26 * u;
  E.rr(x - w, y, w, h, 7 * u); ctx.fillStyle = "rgba(20,20,20,.72)"; ctx.fill();
  ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.fillText(text, x - w + 9 * u, y + h / 2 + .5); I.chevron(x - 12 * u, y + h / 2, 14 * u, "#fff", 2.2); ctx.restore();
}
function playBtn(cx, cy, a) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.beginPath(); ctx.arc(cx, cy, 17 * u, 0, 7); ctx.fillStyle = E.hexA(S.colors.play, .62); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx - 5 * u, cy - 7.5 * u); ctx.lineTo(cx + 8 * u, cy); ctx.lineTo(cx - 5 * u, cy + 7.5 * u); ctx.closePath(); ctx.fillStyle = "#fff"; ctx.fill(); ctx.restore();
}
function isFocused(o) { const tg = focusTarget(); return !!tg && tg.includes(o); }
function node(o, p, f, t) {
  if (p <= 0) return; const { x, y, w, h } = o, r = 8 * u;
  const sc = lerp(.9, 1, back(p)), cx = x + w / 2, cy = y + h / 2;
  ctx.save(); ctx.globalAlpha *= clamp(p * 1.6); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
  labelRow(o, x, y - 30 * u);
  let reveal = 1;
  if (o.isRes && S.showGen) reveal = easeInOut(prog(f - t.s3, +S.d3 * .72, +S.d3));
  if (reveal < 1) {
    E.rr(x, y, w, h, r); ctx.fillStyle = S.colors.node; ctx.fill();
    ctx.save(); E.rr(x, y, w, h, r); ctx.clip(); const sw = w * .6, sx = x - sw + ((f * 9 * u) % (w + sw * 2));
    const g = ctx.createLinearGradient(sx, 0, sx + sw, 0); g.addColorStop(0, E.hexA(S.colors.shimmer, 0)); g.addColorStop(.5, E.hexA(S.colors.shimmer, 1)); g.addColorStop(1, E.hexA(S.colors.shimmer, 0));
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.restore();
    const pct = Math.min(99, Math.round(easeOut(prog(f - t.s3, 0, +S.d3 * .72)) * 99));
    ctx.fillStyle = "#cfcfcf"; ctx.font = `500 ${17 * u}px ${E.SANS}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(`${S.genText} ${pct}%`, cx, cy); ctx.textAlign = "left";
  }
  if (reveal > 0) {
    ctx.save(); ctx.globalAlpha *= reveal; const bl = (1 - reveal) * 14 * u; if (bl > .5) ctx.filter = `blur(${bl}px)`;
    U.photo(o.img, x, y, w, h, r, S.colors.node, lerp(1.06, 1, reveal)); ctx.restore(); ctx.filter = "none";
    if (o.kind === "video") playBtn(cx, cy, reveal * (S.hidePlay && isFocused(o) ? 1 - focusAmt(f, t) : 1));
    badge(o.badge, x + 10 * u, y + 10 * u);
    if (o.isRes && o.i === 0) countPill(S.resultCount, x + w - 10 * u, y + 10 * u);
  }
  ctx.restore();
}

const SEC_TITLES = ["섹션 1", "섹션 2", "섹션 3", "섹션 4", "섹션 5 (결과)"];
const focusOptions = [["all", "전체 화면"]];
for (let k = 0; k < NSEC; k++) { focusOptions.push([`s${k + 1}`, `${SEC_TITLES[k]} 전체`]); for (let i = 1; i <= MAXN; i++) focusOptions.push([`s${k + 1}_${i}`, `${SEC_TITLES[k]} · ${i}번 이미지`]); }

E.start({
  title: LAND ? "모션 08 · 드리미나 캔버스 가로 (16:9)" : "모션 01 · 드리미나 캔버스 + 노드 확대", group: "릴스04 템플릿", file: LAND ? "motion08_16x9" : "motion01", state: S, alpha: true,
  intro: (LAND ? "가로 16:9 (2560×1440). 섹션 5개가 왼쪽에서 오른쪽으로 이어져요. 여러 장인 섹션은 같은 크기로 위아래로 쌓여요. " : "점 격자 캔버스에 섹션 5개가 위에서 아래로 쌓여요. ") + " 섹션마다 이미지를 1~4장 넣을 수 있고, 1장이면 가로로 길게, 여러 장이면 같은 크기로 나란히 놓여요. 이미지를 안 넣은 섹션은 노드·연결선까지 통째로 빠져요. 마지막 섹션은 '생성 중' 연출 뒤에 나오는 결과예요.",
  images: Object.fromEntries(DEF_IMG.map((l, k) => ["img.s" + (k + 1), l.map(file => ({ file }))])),
  sections: [
    { title: "확대 (카메라)", hint: "'전체 화면'이면 캔버스 전체가 나와요. 섹션이나 이미지를 고르면 그 영역을 크게 보여주는 영상이 돼요. 없는 섹션·이미지를 고르면 전체 화면으로 나와요.",
      rows: [[{ type: "select", key: "focus", label: "확대할 곳", options: focusOptions }],
        [{ type: "select", key: "zoomMode", label: "확대 방식", options: [["zoomin", "전체 → 확대로 줌인"], ["close", "처음부터 확대"]] }, { type: "number", key: "zoomDur", label: "줌인 길이 (프레임)", min: 6, max: 120 }],
        [{ type: "bool", key: "hidePlay", label: "확대되면 재생 버튼 숨기기" }, { type: "bool", key: "dimOthers", label: "나머지 노드 어둡게" }]] },
    { title: "공통 · 캔버스", rows: [...U.bgRows,
        [{ type: "bool", key: "showDots", label: "점 격자" }, { type: "select", key: "linkStyle", label: "연결선 모양", options: [["glow", "파란 빛이 흐르는 선"], ["plain", "회색 선 (예전)"]] }],
        [{ type: "bool", key: "flowLoop", label: "연결 뒤에도 빛이 계속 흐름" }, { type: "number", key: "flowSec", label: "빛 한 바퀴 (초)", min: .5, max: 8 }],
        [{ type: "sub", label: "색상" }],
        [{ type: "color", key: "colors.dot", label: "점 격자" }, { type: "color", key: "colors.label", label: "노드 이름" }],
        [{ type: "color", key: "colors.glow", label: "빛나는 선" }], [{ type: "color", key: "colors.line", label: "회색 선" }, { type: "color", key: "colors.node", label: "빈 노드" }]] },
    { title: "타이밍", rows: [
        [{ type: "number", key: "d1", label: "① 노드 등장 (프레임)", min: 6, max: 120 }, { type: "number", key: "d2", label: "② 연결선 (프레임)", min: 4, max: 120 }],
        [{ type: "number", key: "d3", label: "③ 결과 생성 (프레임)", min: 6, max: 160 }, { type: "number", key: "d4", label: "④ 머무름 (프레임)", min: 6, max: 240 }],
        [{ type: "bool", key: "showGen", label: "결과 섹션 '생성 중' 연출" }, { key: "genText", label: "생성 중 문구" }]] },
    ...SEC_TITLES.map((title, k) => ({ title, closed: k > 0, hint: k === 4 ? "결과 섹션이에요. 비우면 그 위의 마지막 섹션이 결과가 돼요." : "이미지를 1장 넣으면 가로로 길게, 2~4장이면 같은 크기로 나란히 놓여요. 비우면 이 섹션은 안 보여요.",
      rows: [[{ type: "images", key: "img.s" + (k + 1), label: "이미지 / 영상 캡처 (최대 4장)", max: MAXN }],
        [{ type: "textarea", key: `sec.${k}.names`, label: "노드 이름 (이미지 순서대로 줄마다 하나)" }],
        [{ type: "select", key: `sec.${k}.kind`, label: "종류", options: [["video", "영상 (재생 버튼)"], ["image", "이미지"]] }, { key: `sec.${k}.badge`, label: "왼쪽 위 배지 (비우면 없음)" }],
        ...(k === 4 ? [[{ key: "resultCount", label: "오른쪽 위 개수 (비우면 없음)" }]] : [])] })),
  ],
  length: () => T().total,
  render(f) {
    ctx = E.ctx; const t = T(); LAY = layout();
    U.bg(S); CAM = camAt(f, t);
    dots();
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(CAM.s, CAM.s); ctx.translate(-CAM.x, -CAM.y);
    const order = LAY.nodes.filter(o => !o.isRes), step = (+S.d1 - 10) / Math.max(1, order.length - 1);
    const np = o => o.isRes ? easeOut(prog(f - t.s3, 0, 9)) : easeOut(prog(f, order.indexOf(o) * step, order.indexOf(o) * step + 10));
    const dim = S.dimOthers && focusTarget() ? lerp(1, .22, focusAmt(f, t)) : 1;
    PORTS.clear(); ctx.globalAlpha = dim; LAY.edges.forEach((e, k) => link(e, easeInOut(prog(f - t.s2, k * 2, k * 2 + 14)), f, t.s2 + k * 2 + 14));
    LAY.nodes.forEach(o => { ctx.globalAlpha = isFocused(o) ? 1 : dim; node(o, np(o), f, t); });
    ctx.globalAlpha = dim; if (S.linkStyle === "glow") PORTS.forEach(([x, y, a]) => plusPort(x, y, a)); ctx.globalAlpha = 1;
    ctx.restore();
  },
}).then(() => {
  { const sel = document.querySelector('[data-key="focus"]'); if (sel && !sel.value) { sel.value = "all"; sel.dispatchEvent(new Event("change")); } }
  // 노드별 확대 영상 모두 저장 (이미지가 있는 노드만)
  const bar = document.querySelector(".bar"), b = document.createElement("button"); b.className = "btn"; b.textContent = "노드별 확대 영상 모두 저장";
  b.title = "이미지가 들어 있는 노드마다 확대 MP4 를 차례로 저장해요";
  bar.insertBefore(b, document.getElementById("status"));
  b.onclick = async () => {
    const sel = document.querySelector('[data-key="focus"]'), ex = document.getElementById("export"), st = document.getElementById("status"), prev = sel.value, file0 = window.__def.file;
    const list = layout().nodes; b.disabled = true;
    for (let n = 0; n < list.length; n++) {
      const o = list[n]; sel.value = `s${o.k + 1}_${o.i + 1}`; sel.dispatchEvent(new Event("change"));
      window.__def.file = (LAND ? "motion08" : "motion01") + `_섹션${o.k + 1}-${o.i + 1}_` + String(o.label).replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 30);
      ex.click(); await new Promise(r => setTimeout(r, 80));
      while (ex.disabled) await new Promise(r => setTimeout(r, 200));
      st.textContent = `노드 ${n + 1}/${list.length} 저장됨`;
    }
    window.__def.file = file0; sel.value = prev; sel.dispatchEvent(new Event("change")); b.disabled = false;
    st.textContent = `노드 ${list.length}개 확대 영상을 모두 저장했어요`;
  };
});

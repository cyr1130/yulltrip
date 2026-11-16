// 노드 연결선 모션: 파란 선이 그려지며 끝에 빛 덩어리가 따라가고, 연결 뒤에는 빛이 반복해서 흐름. 도착 쪽엔 + 연결 표시.
// P = [x0, y0, c1x, c1y, c2x, c2y, x1, y1] (3차 베지어)
window.FlowLink = (() => {
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const hexA = (hex, a) => { const h = hex.replace("#", ""), n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
  function sample(P) {
    const pts = [];
    for (let k = 0; k <= 60; k++) { const t = k / 60, m = 1 - t; pts.push([m * m * m * P[0] + 3 * m * m * t * P[2] + 3 * m * t * t * P[4] + t * t * t * P[6], m * m * m * P[1] + 3 * m * m * t * P[3] + 3 * m * t * t * P[5] + t * t * t * P[7]]); }
    const len = [0]; for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const L = len[len.length - 1] || 1; return { pts, t: len.map(v => v / L) };
  }
  function part(ctx, Q, t0, t1) {
    t0 = clamp(t0); t1 = clamp(t1); if (t1 <= t0) return false;
    const { pts, t } = Q; let started = false; ctx.beginPath();
    for (let i = 1; i < pts.length; i++) {
      if (t[i] < t0) continue; if (t[i - 1] > t1) break;
      const d = t[i] - t[i - 1] || 1, s0 = clamp((t0 - t[i - 1]) / d), s1 = clamp((t1 - t[i - 1]) / d);
      const p0 = [lerp(pts[i - 1][0], pts[i][0], s0), lerp(pts[i - 1][1], pts[i][1], s0)], p1 = [lerp(pts[i - 1][0], pts[i][0], s1), lerp(pts[i - 1][1], pts[i][1], s1)];
      if (!started) { ctx.moveTo(...p0); started = true; } ctx.lineTo(...p1);
    }
    return started;
  }
  function pulse(ctx, Q, head, len, o) {
    const N = 14, w0 = o.width;
    ctx.save(); ctx.lineCap = "round"; ctx.shadowColor = o.color; ctx.shadowBlur = w0 * 5 * (o.scale || 1);
    for (let k = 0; k < N; k++) {
      const q0 = k / N, q1 = (k + 1) / N, a = head - len + q0 * len, b = head - len + q1 * len, w = Math.sin(Math.PI * (q0 + q1) / 2);
      if (!part(ctx, Q, a, b)) continue;
      ctx.strokeStyle = hexA(o.color, .25 + .75 * w); ctx.lineWidth = w0 * (1 + w); ctx.stroke();
      if (q0 > .3 && q1 < .75) { ctx.shadowBlur = 0; ctx.strokeStyle = `rgba(255,214,140,${.32 * w})`; ctx.lineWidth = w0 * .9; ctx.stroke(); ctx.shadowBlur = w0 * 5 * (o.scale || 1); }
    }
    ctx.restore();
  }
  // + 연결 표시 (x, y 중심, r 반지름)
  function port(ctx, x, y, r, a, bg) {
    if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = bg; ctx.fill();
    ctx.strokeStyle = "#9aa0a8"; ctx.lineWidth = r * .13; ctx.stroke();
    const s = r * .42; ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.lineWidth = r * .11; ctx.lineCap = "round"; ctx.stroke(); ctx.restore();
  }
  // o: { color, width, f, done(연결 끝난 프레임), fps, loop, sec, scale }
  function draw(ctx, P, p, o) {
    if (p <= 0) return null; const Q = sample(P), L = .45;
    if (part(ctx, Q, 0, p)) { ctx.save(); ctx.strokeStyle = hexA(o.color, .85); ctx.lineWidth = o.width; ctx.lineCap = "round"; ctx.stroke(); ctx.restore(); }
    if (p < 1) pulse(ctx, Q, p, Math.min(L, p), o);
    else if (o.loop) { const per = Math.max(.5, +o.sec || 2.2) * (o.fps || 24), ph = (((o.f - o.done) / per) % 1 + 1) % 1; pulse(ctx, Q, ph * (1 + L), L, o); }
    else { const ph = clamp((o.f - o.done) / 10); if (ph < 1) pulse(ctx, Q, 1 + L * ph, L, o); }
    const q = Q.pts[Q.pts.length - 4], e = Q.pts[Q.pts.length - 1], dl = Math.hypot(e[0] - q[0], e[1] - q[1]) || 1;
    return { end: e, dir: [(e[0] - q[0]) / dl, (e[1] - q[1]) / dl], portA: clamp((p - .85) / .15) };
  }
  return { draw, port, hexA };
})();

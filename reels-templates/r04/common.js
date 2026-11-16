/* 릴스04 공용 그리기 도구 (드리미나 UI 아이콘, 배경, 타이핑) */
(function () {
  const E = window.Engine;
  const C = () => E.ctx;
  const U = (window.U04 = {});
  const { clamp, lerp } = E;

  // 배경: 단색 / 크로마키
  U.green = S => S.keyMode === "green";
  U.bg = S => { const ctx = C(); ctx.fillStyle = U.green(S) ? S.keyBg : S.bg; ctx.fillRect(0, 0, E.W, E.H); };
  U.shadow = (S, fn, blur = 50, oy = 18, color = "rgba(0,0,0,.45)") => { if (U.green(S)) fn(); else E.shadowed(fn, blur, oy, color); };
  U.bgRows = [
    [{ type: "select", key: "keyMode", label: "배경 방식", options: [["solid", "단색 배경"], ["green", "크로마키 (그림자 없음)"]] }],
    [{ type: "color", key: "bg", label: "단색 배경색" }, { type: "color", key: "keyBg", label: "크로마키 색" }],
  ];
  U.img = (S, k) => { const l = k.split(".").reduce((o, p) => o && o[p], S); return l && l[0] ? l[0].img : null; };
  U.photo = (img, x, y, w, h, r, color = "#2a2a2a", zoom = 1) => {
    const ctx = C(); ctx.save(); E.rr(x, y, w, h, r); ctx.clip();
    if (img) { const s = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom, iw = img.naturalWidth * s, ih = img.naturalHeight * s; ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); }
    else { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }
    ctx.restore();
  };

  // 사람처럼 타이핑: 글자마다 속도가 조금씩 다르고 띄어쓰기·문장부호 뒤에 살짝 멈춤
  U.typedCount = (text, p) => {
    const ch = Array.from(text); if (!ch.length) return 0;
    const w = ch.map((c, i) => (c === " " ? 1.6 : /[,.!?:]/.test(c) ? 2.2 : c === "\n" ? 3 : 1) * (0.75 + 0.5 * (((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1)));
    const tot = w.reduce((a, b) => a + b, 0); let acc = 0; const target = clamp(p) * tot;
    for (let i = 0; i < w.length; i++) { acc += w[i]; if (acc > target) return i; }
    return ch.length;
  };
  // 줄바꿈 (전체 문장 기준으로 미리 나눔 → 타이핑 중 줄이 흔들리지 않음). [{text, start}] 반환
  U.wrap = (text, font, maxW) => {
    const ctx = C(); ctx.font = font; const out = []; let idx = 0;
    String(text).split("\n").forEach((par, pi) => {
      const chars = Array.from(par); let line = "", start = idx, lastSp = -1;
      for (let i = 0; i < chars.length; i++) {
        const c = chars[i], t = line + c;
        if (ctx.measureText(t).width > maxW && line) {
          if (c !== " " && lastSp > 0) { const keep = Array.from(line).slice(0, lastSp + 1).join(""), rest = Array.from(line).slice(lastSp + 1).join("");
            out.push({ text: keep, start }); start += Array.from(keep).length; line = rest + c; }
          else { out.push({ text: line, start }); start += Array.from(line).length; line = c; }
          lastSp = -1; if (c === " ") lastSp = Array.from(line).length - 1;
        } else { line = t; if (c === " ") lastSp = Array.from(line).length - 1; }
      }
      out.push({ text: line, start }); idx = start + Array.from(line).length + 1;   // +1 = 줄바꿈 문자
    });
    return out;
  };
  // 줄 배열을 n 글자까지만 그리고 캐럿 위치를 돌려줌
  U.drawTyped = (lines, n, x, y, lh, scrollY = 0) => {
    const ctx = C(); let cx = x, cy = y;
    for (let i = 0; i < lines.length; i++) {
      const L = lines[i], take = clamp(n - L.start, 0, Array.from(L.text).length);
      if (n < L.start) break;
      const part = Array.from(L.text).slice(0, take).join(""), ly = y + i * lh - scrollY;
      ctx.fillText(part, x, ly); cx = x + ctx.measureText(part).width; cy = ly;
    }
    return { cx, cy };
  };
  U.caretLine = (lines, n) => { let li = 0; lines.forEach((L, i) => { if (n >= L.start) li = i; }); return li; };

  // ---------- 아이콘 (중심 x,y / 크기 s, 24 단위 그리드) ----------
  function ico(x, y, s, color, lw, fn) { const ctx = C(); ctx.save(); ctx.translate(x, y); ctx.scale(s / 24, s / 24); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw * 24 / s; ctx.lineCap = "round"; ctx.lineJoin = "round"; fn(ctx); ctx.restore(); }
  U.ico = ico;
  const R = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  U.icons = {
    video: (x, y, s, c, lw = 2) => ico(x, y, s, c, lw, ctx => { R(ctx, -10, -10, 20, 20, 4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-3, -5); ctx.lineTo(5, 0); ctx.lineTo(-3, 5); ctx.closePath(); ctx.fill(); }),
    image: (x, y, s, c, lw = 2) => ico(x, y, s, c, lw, ctx => { R(ctx, -10, -10, 20, 20, 4); ctx.stroke(); ctx.beginPath(); ctx.arc(-4, -4, 2.2, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(-10, 7); ctx.lineTo(-2, -1); ctx.lineTo(4, 5); ctx.lineTo(7, 2); ctx.lineTo(10, 5); ctx.stroke(); }),
    chevron: (x, y, s, c, lw = 2) => ico(x, y, s, c, lw, ctx => { ctx.beginPath(); ctx.moveTo(-6, -3); ctx.lineTo(0, 3); ctx.lineTo(6, -3); ctx.stroke(); }),
    chevronR: (x, y, s, c, lw = 2) => ico(x, y, s, c, lw, ctx => { ctx.beginPath(); ctx.moveTo(-3, -7); ctx.lineTo(4, 0); ctx.lineTo(-3, 7); ctx.stroke(); }),
    sparkle: (x, y, s, c) => ico(x, y, s, c, 1, ctx => { ctx.beginPath(); ctx.moveTo(0, -12); ctx.quadraticCurveTo(1.5, -1.5, 12, 0); ctx.quadraticCurveTo(1.5, 1.5, 0, 12); ctx.quadraticCurveTo(-1.5, 1.5, -12, 0); ctx.quadraticCurveTo(-1.5, -1.5, 0, -12); ctx.fill(); }),
    arrowUp: (x, y, s, c, lw = 2.6) => ico(x, y, s, c, lw, ctx => { ctx.beginPath(); ctx.moveTo(0, 9); ctx.lineTo(0, -9); ctx.moveTo(-7, -2); ctx.lineTo(0, -9); ctx.lineTo(7, -2); ctx.stroke(); }),
    plus: (x, y, s, c, lw = 2) => ico(x, y, s, c, lw, ctx => { ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.moveTo(0, -8); ctx.lineTo(0, 8); ctx.stroke(); }),
    expand: (x, y, s, c, lw = 2) => ico(x, y, s, c, lw, ctx => { ctx.beginPath(); ctx.moveTo(3, -9); ctx.lineTo(9, -9); ctx.lineTo(9, -3); ctx.moveTo(9, -9); ctx.lineTo(2, -2); ctx.moveTo(-3, 9); ctx.lineTo(-9, 9); ctx.lineTo(-9, 3); ctx.moveTo(-9, 9); ctx.lineTo(-2, 2); ctx.stroke(); }),
    cube: (x, y, s, c, lw = 2) => ico(x, y, s, c, lw, ctx => { ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(9, -5); ctx.lineTo(9, 5); ctx.lineTo(0, 10); ctx.lineTo(-9, 5); ctx.lineTo(-9, -5); ctx.closePath(); ctx.moveTo(-9, -5); ctx.lineTo(0, 0); ctx.lineTo(9, -5); ctx.moveTo(0, 0); ctx.lineTo(0, 10); ctx.stroke(); }),
    omni: (x, y, s, c, lw = 2) => ico(x, y, s, c, lw, ctx => { ctx.save(); ctx.rotate(-Math.PI / 4); R(ctx, -11, -4.5, 12, 9, 4.5); ctx.stroke(); R(ctx, -1, -4.5, 12, 9, 4.5); ctx.stroke(); ctx.restore(); ctx.beginPath(); ctx.moveTo(-9, -9); ctx.lineTo(9, 9); ctx.stroke(); }),
    phone: (x, y, s, c, lw = 2) => ico(x, y, s, c, lw, ctx => { R(ctx, -6, -10, 12, 20, 2.5); ctx.stroke(); }),
    clock: (x, y, s, c, lw = 2) => ico(x, y, s, c, lw, ctx => { ctx.beginPath(); ctx.arc(0, 0, 10, 0, 7); ctx.moveTo(0, -5); ctx.lineTo(0, 0); ctx.lineTo(4, 3); ctx.stroke(); }),
    at: (x, y, s, c, lw = 2) => ico(x, y, s, c, lw, ctx => { ctx.beginPath(); ctx.arc(0, 0, 4, 0, 7); ctx.moveTo(4, -4); ctx.lineTo(4, 2); ctx.quadraticCurveTo(4, 5, 7, 5); ctx.quadraticCurveTo(10, 5, 10, 0); ctx.arc(0, 0, 10, 0, -Math.PI * 1.75, true); ctx.stroke(); }),
    camera: (x, y, s, c) => ico(x, y, s, c, 1.6, ctx => { R(ctx, -11, -6, 20, 13, 3); ctx.fillStyle = "#8d8f94"; ctx.fill(); R(ctx, -11, -6, 20, 4, 2); ctx.fillStyle = "#c9cbd0"; ctx.fill();
      ctx.beginPath(); ctx.arc(1, 1.5, 5.6, 0, 7); ctx.fillStyle = "#2b2d31"; ctx.fill(); ctx.beginPath(); ctx.arc(1, 1.5, 3, 0, 7); ctx.fillStyle = "#4b6b8a"; ctx.fill(); ctx.beginPath(); ctx.arc(-.2, .3, 1, 0, 7); ctx.fillStyle = "#fff"; ctx.fill(); }),
    // 툴바
    wand: (x, y, s, c, lw = 2) => ico(x, y, s, c, lw, ctx => { ctx.beginPath(); ctx.moveTo(-9, 9); ctx.lineTo(4, -4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(7, -10); ctx.lineTo(7, -5); ctx.moveTo(4.5, -7.5); ctx.lineTo(9.5, -7.5); ctx.moveTo(-3, -9); ctx.lineTo(-3, -6); ctx.moveTo(-4.5, -7.5); ctx.lineTo(-1.5, -7.5); ctx.stroke(); }),
    pano: (x, y, s, c) => ico(x, y, s, c, 1.8, ctx => { R(ctx, -11, -7, 22, 14, 3); ctx.stroke(); ctx.font = `800 8.5px ${E.SANS}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("720", 0, .5); }),
    focus: (x, y, s, c, lw = 2) => ico(x, y, s, c, lw, ctx => { ctx.beginPath(); [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => { ctx.moveTo(a * 10, b * 4); ctx.lineTo(a * 10, b * 10); ctx.lineTo(a * 4, b * 10); }); ctx.stroke(); R(ctx, -4, -4, 8, 8, 1.5); ctx.stroke(); }),
    hd: (x, y, s, c) => ico(x, y, s, c, 1.8, ctx => { R(ctx, -11, -8, 22, 16, 3); ctx.stroke(); ctx.font = `800 9px ${E.SANS}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("HD", 0, .5); }),
    person: (x, y, s, c, lw = 2) => ico(x, y, s, c, lw, ctx => { ctx.beginPath(); ctx.arc(0, -4, 4.5, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-8, 10); ctx.quadraticCurveTo(-8, 2, 0, 2); ctx.quadraticCurveTo(8, 2, 8, 10); ctx.stroke(); ctx.setLineDash([2, 3]); R(ctx, -11, -11, 22, 22, 4); ctx.stroke(); ctx.setLineDash([]); }),
    presets: (x, y, s, c, lw = 2) => ico(x, y, s, c, lw, ctx => { R(ctx, -10, -10, 8, 8, 1.5); ctx.stroke(); R(ctx, 2, -10, 8, 8, 1.5); ctx.stroke(); R(ctx, -10, 2, 8, 8, 1.5); ctx.stroke(); ctx.beginPath(); ctx.moveTo(6, 2); ctx.lineTo(6, 10); ctx.moveTo(2, 6); ctx.lineTo(10, 6); ctx.stroke(); }),
    angle: (x, y, s, c, lw = 2) => ico(x, y, s, c, lw, ctx => { ctx.beginPath(); ctx.ellipse(0, 0, 11, 5, 0, 0.2, Math.PI * 1.85); ctx.stroke(); ctx.beginPath(); ctx.moveTo(8, -6); ctx.lineTo(11, -3.5); ctx.lineTo(7.5, -1); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -1, 4, 0, 7); ctx.stroke(); }),
    light: (x, y, s, c, lw = 2) => ico(x, y, s, c, lw, ctx => { ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(10, -8); ctx.moveTo(-6, -8); ctx.lineTo(-8, -3); ctx.moveTo(6, -8); ctx.lineTo(8, -3); ctx.stroke(); ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(-6, -1); ctx.lineTo(-9, 9); ctx.moveTo(0, -1); ctx.lineTo(0, 9); ctx.moveTo(6, -1); ctx.lineTo(9, 9); ctx.stroke(); ctx.setLineDash([]); }),
    bag: (x, y, s, c, lw = 2) => ico(x, y, s, c, lw, ctx => { R(ctx, -9, -5, 18, 15, 3); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-4, -5); ctx.lineTo(-4, -7); ctx.quadraticCurveTo(-4, -11, 0, -11); ctx.quadraticCurveTo(4, -11, 4, -7); ctx.lineTo(4, -5); ctx.stroke(); }),
    tools: (x, y, s, c, lw = 2) => ico(x, y, s, c, lw, ctx => { [1, -1].forEach(d => { ctx.save(); ctx.rotate(d * Math.PI / 4); R(ctx, -2.5, -11, 5, 22, 2.5); ctx.stroke(); ctx.restore(); }); }),
    agent: (x, y, s, c, lw = 2) => ico(x, y, s, c, lw, ctx => { ctx.beginPath(); ctx.moveTo(10, 0); ctx.arc(0, 0, 10, 0, Math.PI * 1.6); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-9, 4); ctx.lineTo(-10, 10); ctx.lineTo(-4, 9); ctx.stroke(); ctx.beginPath(); ctx.moveTo(8, -12); ctx.lineTo(8, -4); ctx.moveTo(4, -8); ctx.lineTo(12, -8); ctx.stroke(); }),
    full: (x, y, s, c, lw = 2) => ico(x, y, s, c, lw, ctx => { ctx.beginPath(); ctx.moveTo(4, -10); ctx.lineTo(10, -10); ctx.lineTo(10, -4); ctx.moveTo(10, -10); ctx.lineTo(3, -3); ctx.moveTo(-4, 10); ctx.lineTo(-10, 10); ctx.lineTo(-10, 4); ctx.moveTo(-10, 10); ctx.lineTo(-3, 3); ctx.stroke(); }),
    download: (x, y, s, c, lw = 2) => ico(x, y, s, c, lw, ctx => { ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 4); ctx.moveTo(-6, -2); ctx.lineTo(0, 4); ctx.lineTo(6, -2); ctx.moveTo(-10, 10); ctx.lineTo(10, 10); ctx.stroke(); }),
    playCircle: (x, y, s, c, lw = 2) => ico(x, y, s, c, lw, ctx => { ctx.beginPath(); ctx.arc(0, 0, 10, Math.PI * .25, Math.PI * 2.05); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-3, -5); ctx.lineTo(5, 0); ctx.lineTo(-3, 5); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.arc(9, 7, 2.2, 0, 7); ctx.fill(); }),
  };

  // 화살표 마우스 커서 (끝이 x,y)
  U.arrow = (x, y, sc, alpha = 1, press = 0, green = false) => {
    if (alpha <= 0) return; const ctx = C();
    ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); const k = sc * (1 - .12 * press); ctx.scale(k, k);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 34); ctx.lineTo(8, 26); ctx.lineTo(14, 39); ctx.lineTo(20, 36); ctx.lineTo(14, 24); ctx.lineTo(25, 24); ctx.closePath();
    if (!green) { ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3; }
    ctx.fillStyle = "#111"; ctx.fill(); ctx.shadowColor = "transparent"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.6; ctx.lineJoin = "round"; ctx.stroke();
    ctx.restore();
  };
  // 클릭 물결
  U.ripple = (x, y, p, color = "#ffffff", r = 60) => { if (p <= 0 || p >= 1) return; const ctx = C(); ctx.save(); ctx.globalAlpha *= (1 - p) * .55; ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r * E.easeOut(p), 0, 7); ctx.stroke(); ctx.restore(); };
  // 줄그은 숫자
  U.strike = (text, x, y, color) => { const ctx = C(); ctx.fillStyle = color; ctx.fillText(text, x, y); const w = ctx.measureText(text).width; ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 1, y); ctx.lineTo(x + w + 1, y); ctx.stroke(); return w; };
})();

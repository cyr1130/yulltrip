/* 릴스03 공용 그리기 도구 (아이콘, 배경, 숫자 표기) */
(function () {
  const E = window.Engine;
  const C = () => E.ctx;
  const U = (window.U03 = {});

  // 배경: 단색 / 크로마키
  U.bg = S => { const ctx = C(); ctx.fillStyle = S.keyMode === "green" ? S.keyBg : S.bg; ctx.fillRect(0, 0, E.W, E.H); };
  U.green = S => S.keyMode === "green";
  // 그림자 (크로마키일 땐 끔)
  U.shadow = (S, fn, blur = 50, oy = 18, color = "rgba(20,30,40,.18)") => { if (U.green(S)) fn(); else E.shadowed(fn, blur, oy, color); };
  U.bgRows = [
    [{ type: "select", key: "keyMode", label: "배경 방식", options: [["solid", "단색 배경"], ["green", "크로마키 (그림자 없음)"]] }],
    [{ type: "color", key: "bg", label: "단색 배경색" }, { type: "color", key: "keyBg", label: "크로마키 색" }],
  ];

  U.img = (S, k) => { const l = k.split(".").reduce((o, p) => o && o[p], S); return l && l[0] ? l[0].img : null; };
  // 원형 사진 (없으면 색 원)
  U.circle = (img, x, y, r, color) => {
    const ctx = C(); ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7);
    if (img) { ctx.clip(); const s = Math.max(2 * r / img.naturalWidth, 2 * r / img.naturalHeight); ctx.drawImage(img, x - img.naturalWidth * s / 2, y - img.naturalHeight * s / 2, img.naturalWidth * s, img.naturalHeight * s); }
    else { ctx.fillStyle = color; ctx.fill(); }
    ctx.restore();
  };
  // 둥근 사각형 안에 사진 꽉 채우기 (없으면 색)
  U.photo = (img, x, y, w, h, r, color = "#d9dde2", zoom = 1) => {
    const ctx = C(); ctx.save(); E.rr(x, y, w, h, r); ctx.clip();
    if (img) { const s = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom, iw = img.naturalWidth * s, ih = img.naturalHeight * s; ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); }
    else { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }
    ctx.restore();
  };
  // 숫자 → 6K / 1.2M
  U.fmt = n => { n = Math.round(n); if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M"; if (n >= 1e4) return Math.round(n / 1e3) + "K"; if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K"; return String(n); };

  // ---------- 아이콘 (중심 x,y / 크기 s) ----------
  U.heart = (x, y, s, fill, stroke, lw) => {
    const ctx = C(); ctx.save(); ctx.translate(x, y); ctx.scale(s / 24, s / 24); ctx.beginPath();
    ctx.moveTo(0, 9); ctx.bezierCurveTo(-14, 0, -13, -11, -6, -11); ctx.bezierCurveTo(-3, -11, -1, -9, 0, -7); ctx.bezierCurveTo(1, -9, 3, -11, 6, -11); ctx.bezierCurveTo(13, -11, 14, 0, 0, 9); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = (lw || 2) * 24 / s; ctx.lineJoin = "round"; ctx.stroke(); }
    ctx.restore();
  };
  U.comment = (x, y, s, color, lw = 2) => {
    const ctx = C(); ctx.save(); ctx.translate(x, y); ctx.scale(s / 24, s / 24); ctx.strokeStyle = color; ctx.lineWidth = lw * 24 / s; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.arc(0, -.5, 10, Math.PI * .72, Math.PI * .72 + Math.PI * 1.9); ctx.lineTo(-9.5, 10); ctx.closePath(); ctx.stroke(); ctx.restore();
  };
  U.send = (x, y, s, color, lw = 2) => {
    const ctx = C(); ctx.save(); ctx.translate(x, y); ctx.scale(s / 24, s / 24); ctx.strokeStyle = color; ctx.lineWidth = lw * 24 / s; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(-10, -9); ctx.lineTo(11, -9); ctx.lineTo(-1, 11); ctx.lineTo(-3, -1); ctx.closePath(); ctx.moveTo(-3, -1); ctx.lineTo(11, -9); ctx.stroke(); ctx.restore();
  };
  U.repost = (x, y, s, color, lw = 2) => {
    const ctx = C(); ctx.save(); ctx.translate(x, y); ctx.scale(s / 24, s / 24); ctx.strokeStyle = color; ctx.lineWidth = lw * 24 / s; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(-8, 3); ctx.lineTo(-8, -3); ctx.quadraticCurveTo(-8, -6, -5, -6); ctx.lineTo(8, -6); ctx.moveTo(5, -9); ctx.lineTo(8, -6); ctx.lineTo(5, -3);
    ctx.moveTo(8, -3); ctx.lineTo(8, 3); ctx.quadraticCurveTo(8, 6, 5, 6); ctx.lineTo(-8, 6); ctx.moveTo(-5, 3); ctx.lineTo(-8, 6); ctx.lineTo(-5, 9); ctx.stroke(); ctx.restore();
  };
  U.bookmark = (x, y, s, color, lw = 2) => {
    const ctx = C(); ctx.save(); ctx.translate(x, y); ctx.scale(s / 24, s / 24); ctx.strokeStyle = color; ctx.lineWidth = lw * 24 / s; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(-7, -10); ctx.lineTo(7, -10); ctx.lineTo(7, 10); ctx.lineTo(0, 4); ctx.lineTo(-7, 10); ctx.closePath(); ctx.stroke(); ctx.restore();
  };
  U.dots = (x, y, s, color) => { const ctx = C(); ctx.fillStyle = color; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(x + i * s * .32, y, s * .09, 0, 7); ctx.fill(); } };
  // 손가락 커서 (손끝이 x,y)
  U.hand = (x, y, scale, fill, line, alpha = 1, green = false) => {
    if (alpha <= 0) return; const ctx = C();
    ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.scale(scale, scale);
    const shapes = () => {
      E.rr(-5, 0, 10, 28, 5); ctx.fill(); ctx.stroke();
      E.rr(4, 11, 9.5, 17, 4.75); ctx.fill(); ctx.stroke();
      E.rr(12.5, 13, 9.5, 15, 4.75); ctx.fill(); ctx.stroke();
      E.rr(21, 16, 8.5, 13, 4.25); ctx.fill(); ctx.stroke();
      E.rr(-5, 20, 34.5, 20, 9); ctx.fill(); ctx.stroke();
      E.rr(-1, 30, 28, 16, 8); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.translate(-4, 31); ctx.rotate(-.75); E.rr(-15, -4.5, 17, 9, 4.5); ctx.fill(); ctx.stroke(); ctx.restore();
    };
    ctx.lineJoin = "round";
    if (!green) { ctx.shadowColor = "rgba(0,0,0,.3)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2; }
    ctx.fillStyle = line; ctx.strokeStyle = line; ctx.lineWidth = 4.4; shapes();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = fill; ctx.strokeStyle = fill; ctx.lineWidth = .01; shapes();
    ctx.strokeStyle = line; ctx.lineWidth = 1.3; ctx.lineCap = "round"; ctx.beginPath();
    [[4.5, 19, 25], [13, 21, 27], [21.5, 23, 28]].forEach(([lx, a, b]) => { ctx.moveTo(lx, a); ctx.lineTo(lx, b); }); ctx.stroke();
    ctx.restore();
  };
  // 짙은 라벨 알약 (가운데 x,y)
  U.labelPill = (text, x, y, size, bg, color, alpha = 1) => {
    if (!text || alpha <= 0) return; const ctx = C();
    ctx.save(); ctx.globalAlpha *= alpha; ctx.font = `900 ${size}px ${E.SANS}`; const w = ctx.measureText(text).width + size * 1.1, h = size * 1.45;
    E.rr(x - w / 2, y - h / 2, w, h, size * .3); ctx.fillStyle = bg; ctx.fill();
    ctx.fillStyle = color; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, x, y + size * .04); ctx.restore();
  };
  // 텍스트 줄바꿈 (폭 기준, 줄 배열 반환)
  U.lines = (text, font, maxW) => {
    const ctx = C(); ctx.font = font; const out = [];
    String(text).split("\n").forEach(par => { let cur = "";
      for (const tok of par.split(/(\s+)/)) { if (!tok) continue;
        if (ctx.measureText(cur + tok).width <= maxW || !cur.trim()) cur += tok; else { out.push(cur.replace(/\s+$/, "")); cur = /^\s+$/.test(tok) ? "" : tok; } }
      out.push(cur); });
    return out;
  };
})();

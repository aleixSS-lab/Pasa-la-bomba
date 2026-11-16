'use strict';
// Parte visual de la partida: dibuja el mapa en el canvas y lee el teclado.
// No decide nada: solo muestra lo que manda el servidor y le envía las teclas pulsadas.

const Game = (() => {
  // Cada jugador tiene un color y además una forma distinta (no depender solo del color).
  const COLORS = ['#ff6b6b', '#4dabf7', '#69db7c', '#f783ac', '#da77f2', '#ff922b', '#38d9a9', '#f1f3f5'];
  const SYMBOLS = ['●', '■', '▲', '◆', '★', '⬢', '✚', '⬟'];
  const FLOOR = '#1b2033';
  const WALL = '#6b7fc4';
  const WALL_EDGE = '#8fa0dd';
  const GOLD = '#ffd43b';
  const KEYS = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  };

  let canvas, ctx, map, coins, players, myId, sendInput, minimapWalls;
  let running = false;
  let lastTime = 0;
  const input = { up: false, down: false, left: false, right: false };

  function start(data, id, onInput) {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    map = data;
    myId = id;
    sendInput = onInput;
    coins = new Map(data.coins.map((c) => [c.id, c]));
    players = new Map(data.players.map((p) => [p.id, { ...p, drawX: p.x, drawY: p.y }]));
    minimapWalls = buildMinimap();
    Object.keys(input).forEach((k) => { input[k] = false; });
    if (!running) {
      running = true;
      window.addEventListener('keydown', onKey);
      window.addEventListener('keyup', onKey);
      window.addEventListener('blur', releaseKeys);
      lastTime = performance.now();
      requestAnimationFrame(frame);
    }
  }

  function stop() {
    running = false;
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup', onKey);
    window.removeEventListener('blur', releaseKeys);
  }

  // Nuevas posiciones y puntuaciones enviadas por el servidor.
  function onState(list) {
    const alive = new Set();
    for (const s of list) {
      alive.add(s.id);
      const p = players.get(s.id);
      if (p) Object.assign(p, { x: s.x, y: s.y, score: s.score });
    }
    for (const id of players.keys()) if (!alive.has(id)) players.delete(id);
  }

  function onCoin(id) {
    coins.delete(id);
  }

  // ---------- Teclado ----------

  function onKey(e) {
    const dir = KEYS[e.code];
    if (!dir || e.ctrlKey || e.altKey || e.metaKey) return;
    e.preventDefault();
    const pressed = e.type === 'keydown';
    if (input[dir] === pressed) return;
    input[dir] = pressed;
    sendInput({ ...input });
  }

  function releaseKeys() {
    Object.keys(input).forEach((k) => { input[k] = false; });
    sendInput({ ...input });
  }

  // ---------- Dibujo ----------

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;
    // Suavizado: la posición dibujada se acerca poco a poco a la última que envió el servidor.
    const k = Math.min(1, dt * 18);
    for (const p of players.values()) {
      p.drawX += (p.x - p.drawX) * k;
      p.drawY += (p.y - p.drawY) * k;
    }
    draw();
    requestAnimationFrame(frame);
  }

  function draw() {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const mapW = map.cols * map.tile;
    const mapH = map.rows * map.tile;
    const me = players.get(myId) || players.values().next().value;
    // La cámara sigue al jugador sin salirse del mapa.
    const camX = mapW <= w ? (mapW - w) / 2 : clamp((me ? me.drawX : mapW / 2) - w / 2, 0, mapW - w);
    const camY = mapH <= h ? (mapH - h) / 2 : clamp((me ? me.drawY : mapH / 2) - h / 2, 0, mapH - h);

    ctx.fillStyle = '#0d101a';
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(-Math.round(camX), -Math.round(camY));

    ctx.fillStyle = FLOOR;
    ctx.fillRect(0, 0, mapW, mapH);

    // Solo se dibujan los muros visibles.
    const T = map.tile;
    const x0 = Math.max(0, Math.floor(camX / T));
    const x1 = Math.min(map.cols - 1, Math.floor((camX + w) / T));
    const y0 = Math.max(0, Math.floor(camY / T));
    const y1 = Math.min(map.rows - 1, Math.floor((camY + h) / T));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (map.walls[y][x] !== '1') continue;
        ctx.fillStyle = WALL;
        ctx.fillRect(x * T, y * T, T, T);
        ctx.fillStyle = WALL_EDGE;
        ctx.fillRect(x * T, y * T, T, 5);
      }
    }

    for (const c of coins.values()) {
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(c.x, c.y, map.coinRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8a6d00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c.x, c.y, map.coinRadius - 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const p of players.values()) {
      shapePath(ctx, p.index, p.drawX, p.drawY, map.radius);
      ctx.fillStyle = COLORS[p.index % 8];
      ctx.fill();
      ctx.lineWidth = p.id === myId ? 3 : 1.5;
      ctx.strokeStyle = p.id === myId ? '#ffffff' : '#0d101a';
      ctx.stroke();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#0d101a';
      ctx.strokeText(p.name, p.drawX, p.drawY - map.radius - 10);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(p.name, p.drawX, p.drawY - map.radius - 10);
    }
    ctx.restore();

    drawMinimap(w, h);
  }

  // Forma de cada jugador según su índice.
  function shapePath(c, index, x, y, r) {
    const poly = (n, rot, rr) => {
      for (let i = 0; i < n; i++) {
        const a = rot + (i * 2 * Math.PI) / n;
        c[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      c.closePath();
    };
    c.beginPath();
    switch (index % 8) {
      case 0: c.arc(x, y, r, 0, Math.PI * 2); break;              // círculo
      case 1: poly(4, Math.PI / 4, r * 1.3); break;               // cuadrado
      case 2: poly(3, -Math.PI / 2, r * 1.35); break;             // triángulo
      case 3: poly(4, 0, r * 1.3); break;                         // rombo
      case 4:                                                     // estrella
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + (i * Math.PI) / 5;
          const rr = i % 2 ? r * 0.6 : r * 1.4;
          c[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        c.closePath();
        break;
      case 5: poly(6, 0, r * 1.15); break;                        // hexágono
      case 6: {                                                   // cruz
        const a = r * 0.45;
        const b = r * 1.2;
        [[-a, -b], [a, -b], [a, -a], [b, -a], [b, a], [a, a], [a, b], [-a, b], [-a, a], [-b, a], [-b, -a], [-a, -a]]
          .forEach(([px, py], i) => c[i ? 'lineTo' : 'moveTo'](x + px, y + py));
        c.closePath();
        break;
      }
      default: poly(5, -Math.PI / 2, r * 1.25);                   // pentágono
    }
  }

  // ---------- Minimapa ----------

  const MINI = 4; // píxeles por casilla

  function buildMinimap() {
    const off = document.createElement('canvas');
    off.width = map.cols * MINI;
    off.height = map.rows * MINI;
    const c = off.getContext('2d');
    c.fillStyle = 'rgba(13, 16, 26, 0.85)';
    c.fillRect(0, 0, off.width, off.height);
    c.fillStyle = WALL;
    map.walls.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) if (row[x] === '1') c.fillRect(x * MINI, y * MINI, MINI, MINI);
    });
    return off;
  }

  function drawMinimap(w, h) {
    const mw = minimapWalls.width;
    const mh = minimapWalls.height;
    if (w < mw * 2.5) return; // en pantallas muy estrechas no cabe
    const ox = w - mw - 12;
    const oy = h - mh - 12;
    const s = MINI / map.tile;
    ctx.drawImage(minimapWalls, ox, oy);
    ctx.strokeStyle = '#f1f3f5';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox - 0.5, oy - 0.5, mw + 1, mh + 1);
    ctx.fillStyle = GOLD;
    for (const c of coins.values()) ctx.fillRect(ox + c.x * s - 1, oy + c.y * s - 1, 2.5, 2.5);
    for (const p of players.values()) {
      const size = p.id === myId ? 7 : 5;
      ctx.fillStyle = COLORS[p.index % 8];
      ctx.fillRect(ox + p.drawX * s - size / 2, oy + p.drawY * s - size / 2, size, size);
      if (p.id === myId) {
        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(ox + p.drawX * s - size / 2, oy + p.drawY * s - size / 2, size, size);
      }
    }
  }

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  return { start, stop, onState, onCoin, COLORS, SYMBOLS };
})();

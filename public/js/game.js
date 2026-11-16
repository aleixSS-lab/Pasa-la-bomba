'use strict';
// Parte visual de la partida: dibuja el mapa en el canvas y lee el teclado.
// No decide nada: solo muestra lo que manda el servidor y le envía las teclas pulsadas.

const Game = (() => {
  // Cada jugador tiene un color y además una forma distinta (no depender solo del color).
  const COLORS = ['#ff6b6b', '#4dabf7', '#69db7c', '#f783ac', '#da77f2', '#ff922b', '#38d9a9', '#f1f3f5'];
  const SYMBOLS = ['●', '■', '▲', '◆', '★', '⬢', '✚', '⬟'];
  // Cada gadget tiene un color y un símbolo propios. Las letras t, g, b son las que envía el servidor.
  const GADGETS = {
    trap: { color: '#ff8787', glyph: '×', fx: 't' },
    gum: { color: '#faa2c1', glyph: '≈', fx: 'g' },
    boost: { color: '#8ce99a', glyph: '»', fx: 'b' },
  };
  const FLOOR = '#1b2033';
  const WALL = '#6b7fc4';
  const WALL_EDGE = '#8fa0dd';
  const DARK = '#0d101a';
  const DANGER = '#ff6b6b';
  const KEYS = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  };

  let canvas, ctx, map, gadgets, players, myId, sendInput, minimapWalls;
  let holderId = null;
  let running = false;
  let lastTime = 0;
  let blasts = [];                  // explosiones que se están dibujando
  const spectator = { x: 0, y: 0 }; // cámara libre cuando estás eliminado
  const input = { up: false, down: false, left: false, right: false };

  function start(data, id, onInput) {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    map = data;
    myId = id;
    sendInput = onInput;
    holderId = null;
    blasts = [];
    gadgets = new Map(data.gadgets.map((g) => [g.id, g]));
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

  // Nuevas posiciones y estado de la bomba enviados por el servidor.
  function onState(state) {
    holderId = state.bomb.holder;
    const present = new Set();
    for (const s of state.players) {
      present.add(s.id);
      const p = players.get(s.id);
      if (p) Object.assign(p, s);
    }
    for (const id of players.keys()) if (!present.has(id)) players.delete(id);
  }

  // Cosas que pasan en la partida: gadgets usados y explosiones.
  function onEvent(event) {
    if (event.type === 'gadget') {
      gadgets.delete(event.removed);
      gadgets.set(event.added.id, event.added);
    } else if (event.type === 'explosion') {
      blasts.push({ x: event.x, y: event.y, start: performance.now() });
      if (event.id === myId) Object.assign(spectator, { x: event.x, y: event.y });
    }
  }

  const isSpectator = () => {
    const me = players.get(myId);
    return !me || !me.alive;
  };

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
    if (isSpectator()) {
      spectator.x += ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * 500 * dt;
      spectator.y += ((input.down ? 1 : 0) - (input.up ? 1 : 0)) * 500 * dt;
      spectator.x = clamp(spectator.x, 0, map.cols * map.tile);
      spectator.y = clamp(spectator.y, 0, map.rows * map.tile);
    }
    draw(now);
    requestAnimationFrame(frame);
  }

  function draw(now) {
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
    const me = players.get(myId);
    const focus = isSpectator() ? spectator : { x: me.drawX, y: me.drawY };
    // La cámara sigue al jugador (o al espectador) sin salirse del mapa.
    const camX = mapW <= w ? (mapW - w) / 2 : clamp(focus.x - w / 2, 0, mapW - w);
    const camY = mapH <= h ? (mapH - h) / 2 : clamp(focus.y - h / 2, 0, mapH - h);

    ctx.fillStyle = DARK;
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

    // Gadgets: baldosa oscura con borde de color y un símbolo.
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 22px system-ui, sans-serif';
    for (const g of gadgets.values()) {
      const style = GADGETS[g.type];
      const r = map.gadgetRadius;
      ctx.fillStyle = DARK;
      ctx.strokeStyle = style.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.rect(g.x - r, g.y - r, r * 2, r * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = style.color;
      ctx.fillText(style.glyph, g.x, g.y + 1);
    }

    for (const p of players.values()) {
      if (!p.alive) continue;
      const hasBomb = p.id === holderId;
      if (hasBomb) {
        ctx.strokeStyle = DANGER;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.drawX, p.drawY, map.radius + 9, 0, Math.PI * 2);
        ctx.stroke();
      }
      shapePath(ctx, p.index, p.drawX, p.drawY, map.radius);
      ctx.fillStyle = COLORS[p.index % 8];
      ctx.fill();
      ctx.lineWidth = p.id === myId ? 3 : 1.5;
      ctx.strokeStyle = p.id === myId ? '#ffffff' : DARK;
      ctx.stroke();
      if (hasBomb) drawBomb(p.drawX + map.radius + 20, p.drawY + 4);

      // Apodo encima y efectos activos debajo.
      ctx.font = 'bold 14px system-ui, sans-serif';
      label(p.name, p.drawX, p.drawY - map.radius - 14, '#ffffff');
      const fx = Object.values(GADGETS).filter((g) => p.fx.includes(g.fx));
      ctx.font = 'bold 18px system-ui, sans-serif';
      fx.forEach((g, i) => label(g.glyph, p.drawX + (i - (fx.length - 1) / 2) * 16, p.drawY + map.radius + 14, g.color));
    }

    // Explosiones: un anillo que crece durante medio segundo.
    blasts = blasts.filter((b) => now - b.start < 600);
    for (const b of blasts) {
      const progress = (now - b.start) / 600;
      ctx.strokeStyle = '#ffd43b';
      ctx.lineWidth = 8 * (1 - progress) + 1;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 20 + progress * 90, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    drawMinimap(w, h);
  }

  function label(text, x, y, color) {
    ctx.lineWidth = 4;
    ctx.strokeStyle = DARK;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  function drawBomb(x, y) {
    ctx.strokeStyle = '#f1f3f5';
    ctx.lineWidth = 2;
    ctx.beginPath();        // mecha
    ctx.moveTo(x + 4, y - 6);
    ctx.lineTo(x + 9, y - 12);
    ctx.stroke();
    ctx.fillStyle = '#14161f';
    ctx.beginPath();        // cuerpo
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd43b';
    ctx.beginPath();        // chispa
    ctx.arc(x + 10, y - 13, 3.5, 0, Math.PI * 2);
    ctx.fill();
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
    for (const p of players.values()) {
      if (!p.alive) continue;
      const size = p.id === myId ? 7 : 5;
      const px = ox + p.drawX * s;
      const py = oy + p.drawY * s;
      ctx.fillStyle = COLORS[p.index % 8];
      ctx.fillRect(px - size / 2, py - size / 2, size, size);
      if (p.id === myId) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(px - size / 2, py - size / 2, size, size);
      }
      if (p.id === holderId) {  // la bomba se marca con un anillo
        ctx.strokeStyle = DANGER;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, 7, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  return { start, stop, onState, onEvent, isSpectator, COLORS, SYMBOLS };
})();

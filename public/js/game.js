'use strict';
// Parte visual de la partida: dibuja el mapa en el canvas y lee el teclado.
// No decide nada: solo muestra lo que manda el servidor y le envía las teclas pulsadas.

const Game = (() => {
  // Cada jugador tiene un color y además una forma distinta (no depender solo del color).
  const COLORS = ['#ff6b6b', '#4dabf7', '#69db7c', '#f783ac', '#da77f2', '#ff922b', '#38d9a9', '#f1f3f5'];
  const SYMBOLS = ['●', '■', '▲', '◆', '★', '⬢', '✚', '⬟'];
  // Efectos activos que envía el servidor para cada jugador: t = trampa, g = chicle, b = acelerador.
  const EFFECTS = { t: 'trap', g: 'gum', b: 'boost' };
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
    // Espacio = esprint: se envía una sola petición por pulsación (mantenerla no la repite).
    if (e.code === 'Space') {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      e.preventDefault();
      if (e.type === 'keydown' && !e.repeat && !isSpectator()) sendInput({ ...input, sprint: true });
      return;
    }
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

    // Gadgets: cada uno dibujado como lo que es, sobre una sombra para que destaque del suelo.
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const g of gadgets.values()) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(g.x + 2, g.y + 4, map.gadgetRadius * (g.type === 'trap' ? 1.6 : 1.15), map.gadgetRadius * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      drawIcon(ctx, g.type, g.x, g.y, map.gadgetRadius * (g.type === 'trap' ? 1.3 : 1.2));
    }

    for (const p of players.values()) {
      if (!p.alive) continue;
      const hasBomb = p.id === holderId;
      if (p.fx.includes('s')) {   // esprint: anillo discontinuo blanco (distinto del anillo rojo de la bomba)
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.lineDashOffset = -now / 40;
        ctx.strokeStyle = '#f1f3f5';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.drawX, p.drawY, map.radius + (hasBomb ? 14 : 8), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
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
      if (hasBomb) drawIcon(ctx, 'bomb', p.drawX + map.radius + 16, p.drawY + 2, 12);

      // Apodo encima y efectos activos debajo, con el mismo dibujo que el gadget.
      ctx.font = 'bold 14px system-ui, sans-serif';
      label(p.name, p.drawX, p.drawY - map.radius - 14, '#ffffff');
      const fx = [...p.fx].map((letter) => EFFECTS[letter]).filter(Boolean);
      fx.forEach((type, i) => drawIcon(ctx, type, p.drawX + (i - (fx.length - 1) / 2) * 20, p.drawY + map.radius + 13, 8));
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

  // ---------- Iconos: trampa de oso, chicle, acelerador y bomba ----------
  // Se dibujan con formas, no con emojis, para que se vean igual en todos los ordenadores.
  // (x, y) es el centro y s el radio aproximado del dibujo.

  function circle(c, x, y, r) {
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
  }

  // Trampa de oso abierta vista desde arriba: dos mandíbulas con dientes, placa en el centro
  // y los muelles a los lados, que es lo que la distingue a simple vista.
  function drawTrap(c, x, y, s) {
    c.lineJoin = 'round';
    c.lineCap = 'round';
    for (const side of [-1, 1]) {                 // muelles en zigzag
      c.beginPath();
      for (let i = 0; i <= 6; i++) {
        const px = x + side * (s * 0.62 + i * s * 0.1);
        const py = y + (i % 2 ? -1 : 1) * s * 0.2;
        c[i ? 'lineTo' : 'moveTo'](px, i === 0 || i === 6 ? y : py);
      }
      c.strokeStyle = DARK;
      c.lineWidth = s * 0.26;
      c.stroke();
      c.strokeStyle = '#adb5bd';
      c.lineWidth = s * 0.12;
      c.stroke();
    }
    circle(c, x, y, s * 0.24);                    // placa que dispara la trampa
    c.fillStyle = '#868e96';
    c.fill();
    c.strokeStyle = DARK;
    c.lineWidth = s * 0.08;
    c.stroke();
    // Mandíbulas: arriba y abajo, con un hueco a cada lado donde van los muelles.
    for (const [a0, a1] of [[Math.PI + 0.45, Math.PI * 2 - 0.45], [0.45, Math.PI - 0.45]]) {
      c.beginPath();
      c.arc(x, y, s * 0.62, a0, a1);
      c.strokeStyle = DARK;
      c.lineWidth = s * 0.3;
      c.stroke();
      c.strokeStyle = '#ced4da';
      c.lineWidth = s * 0.16;
      c.stroke();
      // Dientes hacia el centro.
      const teeth = 5;
      for (let i = 0; i < teeth; i++) {
        const a = a0 + ((i + 0.5) * (a1 - a0)) / teeth;
        const w = (a1 - a0) / teeth / 2;
        c.beginPath();
        c.moveTo(x + Math.cos(a - w) * s * 0.55, y + Math.sin(a - w) * s * 0.55);
        c.lineTo(x + Math.cos(a) * s * 0.3, y + Math.sin(a) * s * 0.3);
        c.lineTo(x + Math.cos(a + w) * s * 0.55, y + Math.sin(a + w) * s * 0.55);
        c.closePath();
        c.fillStyle = '#f1f3f5';
        c.fill();
        c.strokeStyle = DARK;
        c.lineWidth = s * 0.05;
        c.stroke();
      }
    }
    for (const side of [-1, 1]) {                 // bisagras
      circle(c, x + side * s * 0.62, y, s * 0.12);
      c.fillStyle = '#495057';
      c.fill();
      c.strokeStyle = DARK;
      c.lineWidth = s * 0.06;
      c.stroke();
    }
  }

  // Chicle masticado: mancha rosa con una pompa.
  function drawGum(c, x, y, s) {
    const blobs = [[-0.3, 0.15, 0.55], [0.28, 0.25, 0.5], [0, -0.15, 0.58], [-0.05, 0.42, 0.42]];
    c.fillStyle = '#a61e4d';                      // contorno: los mismos círculos un poco más grandes
    for (const [dx, dy, r] of blobs) { circle(c, x + dx * s, y + dy * s, r * s + s * 0.12); c.fill(); }
    c.fillStyle = '#f783ac';
    for (const [dx, dy, r] of blobs) { circle(c, x + dx * s, y + dy * s, r * s); c.fill(); }
    c.fillStyle = 'rgba(255, 255, 255, 0.55)';    // brillo
    c.beginPath();
    c.ellipse(x - s * 0.2, y - s * 0.32, s * 0.22, s * 0.12, -0.5, 0, Math.PI * 2);
    c.fill();
    circle(c, x + s * 0.55, y - s * 0.55, s * 0.32);  // pompa
    c.fillStyle = '#fcc2d7';
    c.fill();
    c.strokeStyle = '#a61e4d';
    c.lineWidth = s * 0.1;
    c.stroke();
  }

  // Acelerador: plataforma verde con un rayo.
  function drawBoost(c, x, y, s) {
    circle(c, x, y, s * 0.95);
    c.fillStyle = '#2b8a3e';
    c.fill();
    c.strokeStyle = DARK;
    c.lineWidth = s * 0.12;
    c.stroke();
    circle(c, x, y, s * 0.78);
    c.strokeStyle = '#8ce99a';
    c.lineWidth = s * 0.1;
    c.stroke();
    const k = s * 0.72;
    const bolt = [[0.18, -1], [-0.55, 0.12], [-0.05, 0.12], [-0.2, 1], [0.55, -0.16], [0.05, -0.16]];
    c.beginPath();
    bolt.forEach(([px, py], i) => c[i ? 'lineTo' : 'moveTo'](x + px * k, y + py * k));
    c.closePath();
    c.fillStyle = '#ffd43b';
    c.fill();
    c.strokeStyle = DARK;
    c.lineWidth = s * 0.08;
    c.lineJoin = 'round';
    c.stroke();
  }

  // Bomba clásica: esfera negra con borde claro, boquilla, mecha y chispa.
  function drawBombIcon(c, x, y, s) {
    const bx = x - s * 0.1;
    const by = y + s * 0.15;
    c.save();                                     // boquilla, inclinada hacia arriba a la derecha
    c.translate(bx + s * 0.5, by - s * 0.5);
    c.rotate(Math.PI / 4);
    c.fillStyle = '#868e96';
    c.strokeStyle = '#f1f3f5';
    c.lineWidth = s * 0.08;
    c.beginPath();
    c.rect(-s * 0.22, -s * 0.18, s * 0.44, s * 0.36);
    c.fill();
    c.stroke();
    c.restore();
    circle(c, bx, by, s * 0.75);                  // cuerpo
    c.fillStyle = '#212529';
    c.fill();
    c.strokeStyle = '#f1f3f5';
    c.lineWidth = s * 0.12;
    c.stroke();
    c.fillStyle = 'rgba(255, 255, 255, 0.35)';    // brillo
    c.beginPath();
    c.ellipse(bx - s * 0.28, by - s * 0.3, s * 0.2, s * 0.12, -0.7, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#e9d8a6';                    // mecha
    c.lineWidth = s * 0.12;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(bx + s * 0.68, by - s * 0.68);
    c.quadraticCurveTo(bx + s * 0.75, by - s * 1.1, bx + s * 1.0, by - s * 1.05);
    c.stroke();
    c.lineCap = 'butt';
    const sx = bx + s * 1.05;                     // chispa en forma de estrella
    const sy = by - s * 1.08;
    c.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8;
      const r = i % 2 ? s * 0.14 : s * 0.38;
      c[i ? 'lineTo' : 'moveTo'](sx + Math.cos(a) * r, sy + Math.sin(a) * r);
    }
    c.closePath();
    c.fillStyle = '#ff922b';
    c.fill();
    circle(c, sx, sy, s * 0.13);
    c.fillStyle = '#fff3bf';
    c.fill();
  }

  const ICONS = { trap: drawTrap, gum: drawGum, boost: drawBoost, bomb: drawBombIcon };

  function drawIcon(c, type, x, y, s) {
    c.save();
    ICONS[type](c, x, y, s);
    c.restore();
  }

  // El mismo dibujo como imagen, para usarlo en la leyenda y en las instrucciones.
  const iconCache = {};
  function iconURL(type) {
    if (!iconCache[type]) {
      const off = document.createElement('canvas');
      off.width = 64;
      off.height = 64;
      drawIcon(off.getContext('2d'), type, 32, type === 'bomb' ? 36 : 32, type === 'trap' ? 22 : 24);
      iconCache[type] = off.toDataURL();
    }
    return iconCache[type];
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

  return { start, stop, onState, onEvent, isSpectator, iconURL, COLORS, SYMBOLS };
})();

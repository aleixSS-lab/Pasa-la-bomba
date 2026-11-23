'use strict';
// Parte visual de la partida: dibuja el mapa en el canvas y lee el teclado.
// No decide nada: solo muestra lo que manda el servidor y le envía las teclas pulsadas.

const Game = (() => {
  // Cada jugador tiene un color y además una forma distinta (no depender solo del color).
  const COLORS = ['#ff6b6b', '#4dabf7', '#69db7c', '#f783ac', '#da77f2', '#ff922b', '#38d9a9', '#f1f3f5'];
  const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'cross', 'pentagon'];
  const SYMBOLS = ['●', '■', '▲', '◆', '★', '⬢', '✚', '⬟'];
  // Efectos activos que envía el servidor para cada jugador: t = trampa, g = chicle, b = acelerador.
  const EFFECTS = { t: 'trap', g: 'gum', b: 'boost' };
  const THEMES = {
    forest: { floor: '#82bd68', detail: '#a1cf75', shade: '#639d59', obstacle: '#286044' },
    desert: { floor: '#e7ca83', detail: '#f0d999', shade: '#c7a965', obstacle: '#8c573a' },
    ruins: { floor: '#8a9691', detail: '#a5aaa0', shade: '#737f7c', obstacle: '#484d5c' },
  };
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
    } else if (event.type === 'teleport') {
      const p = players.get(event.by);
      if (p) Object.assign(p, { x: event.to.x, y: event.to.y, drawX: event.to.x, drawY: event.to.y });
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

    const colors = THEMES[map.theme] || THEMES.forest;
    ctx.fillStyle = colors.floor;
    ctx.fillRect(0, 0, mapW, mapH);
    drawFloor(ctx, map.theme, camX, camY, w, h, mapW, mapH, map.tile);

    // Solo se dibujan los muros visibles.
    const T = map.tile;
    const x0 = Math.max(0, Math.floor(camX / T));
    const x1 = Math.min(map.cols - 1, Math.floor((camX + w) / T));
    const y0 = Math.max(0, Math.floor(camY / T));
    const y1 = Math.min(map.rows - 1, Math.floor((camY + h) / T));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (map.walls[y][x] !== '1') continue;
        drawObstacle(ctx, map.theme, x * T, y * T, T, x, y);
      }
    }

    drawLandmark(ctx, map.theme, map.landmark);
    drawPonds(ctx, map.ponds || [], map.theme);

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
      shapePath(ctx, p.shape, p.drawX, p.drawY, map.radius);
      ctx.fillStyle = p.color || COLORS[p.index % 8];
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = DARK;
      ctx.stroke();
      shapePath(ctx, p.shape, p.drawX, p.drawY, map.radius);
      ctx.lineWidth = p.id === myId ? 2.5 : 1.5;
      ctx.strokeStyle = '#f1f3f5';
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

  function noise(x, y, salt = 0) {
    const n = Math.sin(x * 127.1 + y * 311.7 + salt * 74.7) * 43758.5453;
    return n - Math.floor(n);
  }

  function drawFloor(c, theme, camX, camY, w, h, mapW, mapH, tile) {
    const x0 = Math.max(0, Math.floor(camX / tile));
    const x1 = Math.min(Math.ceil(mapW / tile), Math.floor((camX + w) / tile) + 1);
    const y0 = Math.max(0, Math.floor(camY / tile));
    const y1 = Math.min(Math.ceil(mapH / tile), Math.floor((camY + h) / tile) + 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const n = noise(x, y, 3);
      const px = x * tile + 5 + noise(x, y, 4) * (tile - 12);
      const py = y * tile + 5 + noise(x, y, 5) * (tile - 12);
      if (theme === 'forest') {
        // Briznas pequeñas e irregulares: el suelo parece hierba, no un tablero cuadriculado.
        c.fillStyle = n > 0.55 ? '#619f58' : '#aad279';
        c.fillRect(px, py, 2, 5);
        c.fillRect(px + 3, py + 2, 2, 3);
        if (n > 0.91) { c.fillStyle = '#f3d886'; c.fillRect(px + 7, py + 1, 3, 3); }
      } else if (theme === 'desert') {
        // Marcas de viento y piedrecillas dispersas sobre arena continua.
        c.fillStyle = n > 0.5 ? '#d4b875' : '#f3dda0';
        c.fillRect(px, py, 9 + n * 9, 2);
        c.fillRect(px + 3, py + 4, 5 + n * 5, 2);
        if (n > 0.82) { c.fillStyle = '#a77b52'; c.fillRect(px + 16, py + 8, 4, 3); }
      } else {
        // Grietas finas y manchas de piedra gastada, sin cuadrícula repetitiva.
        c.strokeStyle = n > 0.5 ? '#727f7c' : '#b2b3a7';
        c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(px, py); c.lineTo(px + 5, py + 2); c.lineTo(px + 8, py + 7); c.stroke();
        if (n > 0.72) { c.fillStyle = '#737b78'; c.fillRect(px + 12, py + 9, 4, 2); }
      }
    }
  }

  function drawObstacle(c, theme, x, y, size, gx, gy) {
    const n = noise(gx, gy, 8);
    c.save();
    if (theme === 'forest') {
      // Árbol visto desde arriba: sombra, tronco corto y copa redondeada a píxeles.
      c.fillStyle = 'rgba(31, 68, 48, 0.28)';
      c.beginPath(); c.ellipse(x + size / 2 + 3, y + size / 2 + 5, 16, 11, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#79543b'; c.fillRect(x + 16, y + 22, 9, 12);
      const pattern = ['0011100', '0111110', '1111111', '1111111', '1111111', '0111110', '0011100'];
      const greens = n > 0.66 ? ['#174b3b', '#236044', '#32734b', '#4b8953'] : ['#1d573f', '#286b46', '#3b804d', '#579653'];
      pattern.forEach((row, ry) => [...row].forEach((cell, rx) => {
        if (cell !== '1') return;
        const colorIndex = noise(gx * 7 + rx, gy * 7 + ry, 2) > 0.72 ? 3 : (noise(gx * 7 + rx, gy * 7 + ry, 1) > 0.48 ? 2 : 1);
        c.fillStyle = greens[colorIndex];
        c.fillRect(x + 2 + rx * 5, y + 2 + ry * 5, 5, 5);
      }));
      c.fillStyle = '#b1d76b';
      c.fillRect(x + (n > 0.5 ? 12 : 22), y + 9, 5, 4);
      c.fillRect(x + (n > 0.5 ? 22 : 10), y + 24, 4, 4);
    } else if (theme === 'desert' && n > 0.35) {
      // Cactus pixelado: silueta fácil de reconocer sobre la arena.
      c.fillStyle = 'rgba(85, 62, 38, 0.25)';
      c.beginPath(); c.ellipse(x + 22, y + 33, 13, 5, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#24674d'; c.fillRect(x + 16, y + 8, 9, 25);
      c.fillStyle = '#39835b'; c.fillRect(x + 18, y + 8, 5, 23);
      c.fillRect(x + 9, y + 15, 7, 5); c.fillRect(x + 9, y + 12, 5, 7);
      c.fillRect(x + 25, y + 20, 7, 5); c.fillRect(x + 27, y + 16, 5, 8);
      c.fillStyle = '#a9c975'; c.fillRect(x + 19, y + 10, 2, 14);
    } else if (theme === 'desert') {
      // Rocas redondeadas en vez de muros rectangulares.
      const rows = ['0011100', '0111110', '1111111', '1111111', '0111110'];
      const rockColors = n > 0.5 ? ['#875136', '#ad7046', '#c08a58'] : ['#9a5b3d', '#bd7a4d', '#d19a61'];
      c.fillStyle = 'rgba(99, 68, 42, 0.23)';
      c.beginPath(); c.ellipse(x + 21, y + 32, 17, 5, 0, 0, Math.PI * 2); c.fill();
      rows.forEach((row, ry) => [...row].forEach((cell, rx) => {
        if (cell !== '1') return;
        c.fillStyle = rockColors[(rx + ry + Math.floor(n * 3)) % rockColors.length];
        c.fillRect(x + 2 + rx * 5, y + 8 + ry * 5, 5, 5);
      }));
      c.fillStyle = '#e1b77d'; c.fillRect(x + 12, y + 12, 7, 3);
    } else {
      // Restos de columnas y sillares rotos, con grietas oscuras.
      c.fillStyle = 'rgba(42, 45, 54, 0.3)';
      c.beginPath(); c.ellipse(x + 23, y + 33, 17, 5, 0, 0, Math.PI * 2); c.fill();
      if (n > 0.65) {
        c.fillStyle = '#57596a'; c.fillRect(x + 9, y + 5, 22, 29);
        c.fillStyle = '#aaa7a0'; c.fillRect(x + 7, y + 5, 25, 7);
        c.fillStyle = '#77798a'; c.fillRect(x + 12, y + 14, 16, 16);
        c.fillStyle = '#4e5061'; c.fillRect(x + 9, y + 30, 22, 5);
        c.fillStyle = '#c2bba9'; c.fillRect(x + 12, y + 7, 5, 3);
        c.strokeStyle = '#383c49'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(x + 23, y + 12); c.lineTo(x + 19, y + 19); c.lineTo(x + 23, y + 23); c.stroke();
      } else {
        c.fillStyle = '#6a6c7b'; c.fillRect(x + 6, y + 14, 28, 15);
        c.fillStyle = '#99999b'; c.fillRect(x + 8, y + 11, 13, 8);
        c.fillStyle = '#4c505e'; c.fillRect(x + 22, y + 21, 11, 10);
        c.fillStyle = '#b0aa9b'; c.fillRect(x + 12, y + 13, 7, 3);
        c.strokeStyle = '#414550'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(x + 18, y + 15); c.lineTo(x + 22, y + 20); c.lineTo(x + 18, y + 27); c.stroke();
      }
    }
    c.restore();
  }

  function drawLandmark(c, theme, landmark) {
    if (!landmark) return;
    const { x, y } = landmark;
    c.save();
    if (theme === 'forest') {
      // Laguna rodeada de hierba, nenúfares y flores pequeñas.
      c.fillStyle = '#6c9c58'; c.beginPath(); c.ellipse(x, y + 5, 78, 56, -0.08, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#c6b77c'; c.beginPath(); c.ellipse(x, y, 72, 49, -0.08, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#4ba7a0'; c.beginPath(); c.ellipse(x, y - 2, 65, 42, -0.08, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#79c9b0';
      c.fillRect(x - 32, y - 20, 24, 3); c.fillRect(x + 12, y + 11, 28, 3); c.fillRect(x + 30, y - 25, 12, 3);
      for (const [dx, dy] of [[-35, 8], [24, -13], [4, 24]]) {
        c.fillStyle = '#397b50'; c.beginPath(); c.ellipse(x + dx, y + dy, 9, 5, -0.3, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#f783ac'; c.fillRect(x + dx - 2, y + dy - 5, 4, 4);
        c.fillStyle = '#ffd43b'; c.fillRect(x + dx - 1, y + dy - 4, 2, 2);
      }
    } else if (theme === 'desert') {
      // Oasis azul verdosa, con una orilla dorada y dos palmeras.
      c.fillStyle = 'rgba(93, 68, 39, 0.2)'; c.beginPath(); c.ellipse(x, y + 14, 82, 49, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#c39a59'; c.beginPath(); c.ellipse(x, y + 5, 78, 47, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#43a99d'; c.beginPath(); c.ellipse(x, y + 2, 67, 38, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#8ed6ba'; c.fillRect(x - 26, y - 7, 22, 3); c.fillRect(x + 8, y + 9, 28, 3);
      for (const side of [-1, 1]) {
        const px = x + side * 52; const py = y - 27;
        c.strokeStyle = '#79543b'; c.lineWidth = 5; c.lineCap = 'round';
        c.beginPath(); c.moveTo(px, py + 28); c.quadraticCurveTo(px + side * 3, py + 12, px - side * 2, py); c.stroke();
        c.strokeStyle = '#39835b'; c.lineWidth = 5;
        for (const angle of [-2.75, -2.15, -1.57, -0.95, -0.35]) {
          c.beginPath(); c.moveTo(px - side * 2, py);
          c.quadraticCurveTo(px + Math.cos(angle) * 10, py + Math.sin(angle) * 8, px + Math.cos(angle) * 22, py + Math.sin(angle) * 15);
          c.stroke();
        }
      }
    } else {
      // Fuente antigua con borde de piedra, agua y un pedestal central agrietado.
      c.fillStyle = 'rgba(48, 51, 61, 0.25)'; c.beginPath(); c.ellipse(x, y + 9, 79, 57, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#777a83'; c.beginPath(); c.ellipse(x, y, 76, 54, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#b1aa98'; c.beginPath(); c.ellipse(x, y - 4, 68, 47, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#438f91'; c.beginPath(); c.ellipse(x, y - 5, 57, 37, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#d0c5ad'; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y - 5, 60, 40, 0, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#696d7a'; c.fillRect(x - 11, y - 18, 22, 30);
      c.fillStyle = '#aaa797'; c.fillRect(x - 16, y - 22, 32, 7);
      c.fillStyle = '#d3c8b2'; c.fillRect(x - 7, y - 19, 5, 18);
      c.fillStyle = '#8bd0bd'; c.fillRect(x - 38, y + 2, 18, 3); c.fillRect(x + 21, y - 13, 22, 3);
    }
    c.restore();
  }

  function pondPath(c, pond, scale = 1) {
    const { x, y, shape } = pond;
    const rx = pond.rx * scale;
    const ry = pond.ry * scale;
    if (shape === 'bean') {
      c.beginPath();
      c.moveTo(x - rx * 0.95, y - ry * 0.05);
      c.bezierCurveTo(x - rx * 0.9, y - ry * 1.05, x - rx * 0.05, y - ry * 0.8, x + rx * 0.05, y - ry * 0.32);
      c.bezierCurveTo(x + rx * 0.2, y - ry * 0.95, x + rx * 1.05, y - ry * 0.48, x + rx * 0.9, y + ry * 0.22);
      c.bezierCurveTo(x + rx * 0.75, y + ry * 0.95, x - rx * 0.1, y + ry * 0.82, x - rx * 0.28, y + ry * 0.38);
      c.bezierCurveTo(x - rx * 0.58, y + ry * 0.8, x - rx * 1.05, y + ry * 0.58, x - rx * 0.95, y - ry * 0.05);
      c.closePath();
    } else if (shape === 'lobed') {
      c.beginPath();
      for (let i = 0; i < 20; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 20;
        const bump = 0.82 + 0.14 * Math.cos(a * 5 + 0.3);
        c[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rx * bump, y + Math.sin(a) * ry * bump);
      }
      c.closePath();
    } else if (shape === 'stepped') {
      const pts = [[-0.55, -1], [0.35, -1], [0.35, -0.72], [0.83, -0.72], [0.83, -0.2], [1, -0.2], [1, 0.45], [0.5, 0.45], [0.5, 0.9], [-0.25, 0.9], [-0.25, 0.65], [-0.85, 0.65], [-0.85, 0.1], [-1, 0.1], [-1, -0.55], [-0.55, -0.55]];
      c.beginPath();
      pts.forEach(([px, py], i) => c[i ? 'lineTo' : 'moveTo'](x + px * rx, y + py * ry));
      c.closePath();
    } else {
      c.beginPath();
      c.ellipse(x, y, rx, ry, shape === 'oval' ? -0.15 : 0, 0, Math.PI * 2);
    }
  }

  function drawPonds(c, ponds, theme) {
    const bank = theme === 'desert' ? '#bd9759' : (theme === 'ruins' ? '#737f7c' : '#639d59');
    const water = theme === 'desert' ? '#43a99d' : '#4ba7a0';
    for (const pond of ponds) {
      if (pond.landmark) continue;
      c.save();
      c.fillStyle = 'rgba(13, 16, 26, 0.2)';
      pondPath(c, { ...pond, y: pond.y + 7 }, 1.12);
      c.fill();
      c.fillStyle = bank;
      pondPath(c, pond, 1.13);
      c.fill();
      c.fillStyle = water;
      pondPath(c, pond, 0.98);
      c.fill();
      c.strokeStyle = 'rgba(195, 245, 224, 0.65)';
      c.lineWidth = 3;
      c.beginPath();
      c.ellipse(pond.x - pond.rx * 0.18, pond.y - pond.ry * 0.22, pond.rx * 0.34, Math.max(2, pond.ry * 0.06), -0.18, 0, Math.PI * 0.8);
      c.stroke();
      if (theme === 'forest' && pond.rx > 48) {
        c.fillStyle = '#397b50';
        c.beginPath(); c.ellipse(pond.x + pond.rx * 0.32, pond.y + pond.ry * 0.12, 9, 5, -0.3, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#f783ac'; c.fillRect(pond.x + pond.rx * 0.32 - 2, pond.y + pond.ry * 0.12 - 5, 4, 4);
      }
      c.restore();
    }
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
  function shapePath(c, shape, x, y, r) {
    const poly = (n, rot, rr) => {
      for (let i = 0; i < n; i++) {
        const a = rot + (i * 2 * Math.PI) / n;
        c[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      c.closePath();
    };
    c.beginPath();
    const index = SHAPES.indexOf(shape);
    switch (index < 0 ? 0 : index) {
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
    const colors = THEMES[map.theme] || THEMES.forest;
    c.fillStyle = 'rgba(13, 16, 26, 0.85)';
    c.fillRect(0, 0, off.width, off.height);
    c.fillStyle = colors.obstacle;
    map.walls.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) if (row[x] === '1') c.fillRect(x * MINI, y * MINI, MINI, MINI);
    });
    c.fillStyle = '#4ba7a0';
    for (const pond of map.ponds || []) {
      c.beginPath();
      c.ellipse(pond.x / map.tile * MINI, pond.y / map.tile * MINI,
        pond.rx / map.tile * MINI, pond.ry / map.tile * MINI, 0, 0, Math.PI * 2);
      c.fill();
    }
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
      ctx.fillStyle = p.color || COLORS[p.index % 8];
      ctx.fillRect(px - size / 2, py - size / 2, size, size);
      ctx.strokeStyle = '#f1f3f5';
      ctx.lineWidth = 1;
      ctx.strokeRect(px - size / 2, py - size / 2, size, size);
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

  return { start, stop, onState, onEvent, isSpectator, iconURL, COLORS, SHAPES, SYMBOLS };
})();

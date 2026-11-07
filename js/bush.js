(() => {
  // ── Leaf Bush Easter Egg ──
  // A pixel-art flowering shrub at the very bottom of the page. Hovering
  // makes it giggle and a pair of eyes peeks out; a bubble shows how many
  // times it has been clicked.
  const spot = document.getElementById('bush-spot');
  if (!spot) return;

  const bush = spot.querySelector('.bush');
  const canvas = spot.querySelector('.bush-canvas');
  const eyes = spot.querySelector('.bush-eyes');
  const counter = spot.querySelector('.bush-bubble-count');
  const countEl = spot.querySelector('.bush-count');
  const countLabel = spot.querySelector('.bush-count-label');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Bush footprint inside .bush (CSS px). The canvas overhangs it by PAD_X /
  // PAD_TOP so the springy sway never clips at the edges.
  const W = 170;
  const H = 150;
  const PAD_X = 14;
  const PAD_TOP = 14;
  const CW = W + PAD_X * 2;
  const CH = H + PAD_TOP;

  // Seeded random so the bush looks identical on every visit.
  let seed = 20261107;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // A round shrub: rings of broad leaves fanning outward from the middle,
  // laid outer ring first so inner leaves overlap them and the silhouette
  // stays a fringe of leaf tips.
  const leaves = [];
  const cx = W / 2;
  const cy = H * 0.5;
  const rx = W / 2 - 20;
  const ry = H / 2 - 20;
  const domeHeight = H - 6;
  for (let ring = 1; ring >= 0.15; ring -= 0.21) {
    const circumference = Math.PI * (rx + ry) * ring;
    const count = Math.max(3, Math.round(circumference / 19));
    const turn = rand() * Math.PI * 2;
    for (let i = 0; i < count; i += 1) {
      const a = turn + (i / count) * Math.PI * 2;
      const x = cx + Math.cos(a) * rx * ring + (rand() - 0.5) * 5;
      // Squash the top a little and let the bottom flare out.
      const y = cy + Math.sin(a) * ry * ring * (Math.sin(a) > 0 ? 1.08 : 0.95) + (rand() - 0.5) * 5;
      const outward = ring > 0.3 ? a : Math.PI / 2 + (rand() - 0.5) * 2;
      const lightFromTopLeft = 1 - ((y / H) * 0.7 + (x / W) * 0.3);
      leaves.push({
        x,
        y,
        // Leaf tips point along +y in leaf space, so turn +y toward `outward`.
        angle: outward - Math.PI / 2 + (rand() - 0.5) * 0.4,
        length: 33 + rand() * 7,
        width: 14 + rand() * 3,
        hue: 104 + rand() * 16,
        light: 30 + lightFromTopLeft * 26 + (1 - ring) * 6 + (rand() - 0.5) * 8
      });
    }
  }

  // Big five-petal flowers, ringed around the middle so the eyes have room.
  const flowers = [
    [0.31, 0.2, 'pink'], [0.64, 0.17, 'coral'], [0.83, 0.43, 'pink'],
    [0.18, 0.5, 'coral'], [0.71, 0.72, 'coral'], [0.32, 0.76, 'pink']
  ].map(([fx, fy, tone]) => ({ x: fx * W, y: fy * H, tone, radius: 15 + rand() * 2.5, spin: rand() * Math.PI }));

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = CW * dpr;
  canvas.height = CH * dpr;
  Object.assign(canvas.style, {
    left: `${(-PAD_X / W) * 100}%`,
    top: `${(-PAD_TOP / H) * 100}%`,
    width: `${(CW / W) * 100}%`,
    height: `${(CH / H) * 100}%`
  });
  const context = canvas.getContext('2d');

  // ── Paint the bush once, softly shaded, into an offscreen image ──
  const art = document.createElement('canvas');
  // Pixel-art resolution: the bush is painted ~70 pixels across, then shown
  // scaled up with smoothing off.
  const RES = 0.4;
  const ART_W = Math.round(CW * RES);
  const ART_H = Math.round(CH * RES);
  art.width = ART_W;
  art.height = ART_H;
  const paint = art.getContext('2d');

  function leafPath(length, width) {
    const top = -length / 2;
    paint.beginPath();
    paint.moveTo(0, top);
    paint.bezierCurveTo(width * 1.1, top + length * 0.2, width * 0.85, length * 0.28, 0, length / 2);
    paint.bezierCurveTo(-width * 0.85, length * 0.28, -width * 1.1, top + length * 0.2, 0, top);
  }

  function paintLeaf({ length, width, hue, light }) {
    const top = -length / 2;
    leafPath(length, width);
    const body = paint.createLinearGradient(0, top, 0, length / 2);
    body.addColorStop(0, `hsl(${hue + 6} 75% ${light - 16}%)`);
    body.addColorStop(0.5, `hsl(${hue - 8} 75% ${light + 12}%)`);
    body.addColorStop(1, `hsl(${hue - 12} 78% ${light + 6}%)`);
    paint.shadowColor = 'rgba(6, 34, 8, 0.85)';
    paint.shadowBlur = 7 * RES;
    paint.shadowOffsetY = 3 * RES;
    paint.fillStyle = body;
    paint.fill();
    paint.shadowColor = 'transparent';

    paint.save();
    leafPath(length, width);
    paint.clip();
    // Far half of the cupped leaf turns away from the light.
    paint.fillStyle = `hsla(${hue + 8}, 60%, 14%, 0.28)`;
    paint.fillRect(0, top, width * 1.2, length);
    // Soft sheen near the top of the leaf.
    const sheen = paint.createRadialGradient(-width * 0.3, top + length * 0.35, 0, -width * 0.3, top + length * 0.35, width * 1.1);
    sheen.addColorStop(0, 'rgba(240, 255, 190, 0.55)');
    sheen.addColorStop(1, 'rgba(255, 255, 225, 0)');
    paint.fillStyle = sheen;
    paint.fillRect(-width * 1.2, top, width * 2.4, length);
    paint.restore();

    paint.beginPath();
    paint.moveTo(0, top + 3);
    paint.quadraticCurveTo(0.6, 0, 0, length / 2 - 4);
    paint.strokeStyle = `hsla(${hue - 8}, 70%, 82%, 0.28)`;
    paint.lineWidth = 0.8;
    paint.stroke();
  }

  function paintFlower({ radius, tone }) {
    const edge = tone === 'pink' ? '#ff8fc4' : '#ff8a8f';
    const mid = tone === 'pink' ? '#ef4f98' : '#ee4b66';
    const deep = tone === 'pink' ? '#b81d63' : '#b81c3a';
    const petalPath = () => {
      paint.beginPath();
      for (let k = 0; k < 5; k += 1) {
        const a = -Math.PI / 2 + (k * Math.PI * 2) / 5;
        // Broad petal with a soft point, like a hibiscus.
        paint.moveTo(0, 0);
        paint.bezierCurveTo(
          Math.cos(a - 0.9) * radius * 0.85, Math.sin(a - 0.9) * radius * 0.85,
          Math.cos(a - 0.3) * radius * 1.08, Math.sin(a - 0.3) * radius * 1.08,
          Math.cos(a) * radius, Math.sin(a) * radius
        );
        paint.bezierCurveTo(
          Math.cos(a + 0.3) * radius * 1.08, Math.sin(a + 0.3) * radius * 1.08,
          Math.cos(a + 0.9) * radius * 0.85, Math.sin(a + 0.9) * radius * 0.85,
          0, 0
        );
      }
    };
    petalPath();
    const petals = paint.createRadialGradient(0, 0, 0, 0, 0, radius);
    petals.addColorStop(0, '#5a0a26');
    petals.addColorStop(0.2, deep);
    petals.addColorStop(0.55, mid);
    petals.addColorStop(1, edge);
    paint.shadowColor = 'rgba(15, 50, 10, 0.5)';
    paint.shadowBlur = 5 * RES;
    paint.shadowOffsetY = 2 * RES;
    paint.fillStyle = petals;
    paint.fill();
    paint.shadowColor = 'transparent';

    // Light catches the upper-left petals.
    paint.save();
    petalPath();
    paint.clip();
    const sheen = paint.createRadialGradient(-radius * 0.45, -radius * 0.5, 0, -radius * 0.45, -radius * 0.5, radius * 0.9);
    sheen.addColorStop(0, 'rgba(255, 235, 245, 0.45)');
    sheen.addColorStop(1, 'rgba(255, 235, 245, 0)');
    paint.fillStyle = sheen;
    paint.fillRect(-radius, -radius, radius * 2, radius * 2);
    paint.restore();

    // Petal creases.
    paint.strokeStyle = 'rgba(120, 10, 50, 0.35)';
    paint.lineWidth = 0.8;
    for (let k = 0; k < 5; k += 1) {
      const a = -Math.PI / 2 + Math.PI / 5 + (k * Math.PI * 2) / 5;
      paint.beginPath();
      paint.moveTo(Math.cos(a) * radius * 0.25, Math.sin(a) * radius * 0.25);
      paint.lineTo(Math.cos(a) * radius * 0.62, Math.sin(a) * radius * 0.62);
      paint.stroke();
    }

    // Dark throat with a few pale stamens.
    paint.beginPath();
    paint.arc(0, 0, radius * 0.2, 0, Math.PI * 2);
    paint.fillStyle = '#4a0820';
    paint.fill();
    for (let k = 0; k < 4; k += 1) {
      const a = k * 1.7;
      paint.beginPath();
      paint.arc(Math.cos(a) * radius * 0.1, Math.sin(a) * radius * 0.1, 0.9, 0, Math.PI * 2);
      paint.fillStyle = '#ffd3e6';
      paint.fill();
    }
  }

  (function paintBush() {
    paint.setTransform(RES, 0, 0, RES, PAD_X * RES, PAD_TOP * RES);

    // Dark leafy depth that shows through the gaps.
    paint.beginPath();
    paint.ellipse(cx, cy + 2, rx + 4, ry + 6, 0, 0, Math.PI * 2);
    const depth = paint.createLinearGradient(0, cy - ry, 0, cy + ry);
    depth.addColorStop(0, '#2f9a22');
    depth.addColorStop(1, '#125a12');
    paint.fillStyle = depth;
    paint.fill();

    leaves.forEach((leaf) => {
      paint.save();
      paint.translate(leaf.x, leaf.y);
      paint.rotate(leaf.angle);
      paintLeaf(leaf);
      paint.restore();
    });
    flowers.forEach((flower) => {
      paint.save();
      paint.translate(flower.x, flower.y);
      paint.rotate(flower.spin);
      paintFlower(flower);
      paint.restore();
    });

    // Light the whole mound as one rounded volume.
    paint.globalCompositeOperation = 'source-atop';
    const volume = paint.createRadialGradient(W * 0.36, H * 0.22, 0, W * 0.36, H * 0.22, W * 0.85);
    volume.addColorStop(0, 'rgba(240, 255, 170, 0.3)');
    volume.addColorStop(0.45, 'rgba(240, 255, 170, 0)');
    volume.addColorStop(1, 'rgba(6, 40, 8, 0.3)');
    paint.fillStyle = volume;
    paint.fillRect(-PAD_X, -PAD_TOP, CW, CH);
    const ground = paint.createLinearGradient(0, H - 26, 0, H);
    ground.addColorStop(0, 'rgba(8, 32, 10, 0)');
    ground.addColorStop(1, 'rgba(8, 32, 10, 0.4)');
    paint.fillStyle = ground;
    paint.fillRect(-PAD_X, H - 26, CW, 26);
    paint.globalCompositeOperation = 'source-over';

    // Pixel-art finish: hard alpha edges, slightly stepped colours, and a
    // one-pixel dark green outline around the silhouette.
    const image = paint.getImageData(0, 0, ART_W, ART_H);
    const px = image.data;
    const solid = new Uint8Array(ART_W * ART_H);
    for (let i = 0; i < solid.length; i += 1) {
      const o = i * 4;
      if (px[o + 3] > 110) {
        solid[i] = 1;
        const a = px[o + 3] / 255;
        for (let c = 0; c < 3; c += 1) px[o + c] = Math.min(255, Math.round((px[o + c] / a) / 12) * 12);
        px[o + 3] = 255;
      } else {
        px[o + 3] = 0;
      }
    }
    for (let y = 0; y < ART_H; y += 1) {
      for (let x = 0; x < ART_W; x += 1) {
        const i = y * ART_W + x;
        if (solid[i]) continue;
        const touches = (x > 0 && solid[i - 1]) || (x < ART_W - 1 && solid[i + 1]) || (y > 0 && solid[i - ART_W]) || (y < ART_H - 1 && solid[i + ART_W]);
        if (!touches) continue;
        const o = i * 4;
        px[o] = 18; px[o + 1] = 74; px[o + 2] = 22; px[o + 3] = 255;
      }
    }
    paint.putImageData(image, 0, 0);
  })();

  // ── Jelly wobble ──
  // A damped spring bends the bush sideways (the top sways most, the base
  // stays planted) and another squashes it down and back up.
  let bend = 0;
  let bendVelocity = 0;
  let squash = 0;
  let squashVelocity = 0;
  let clock = 0;
  const pulses = [];

  function draw() {
    const rustle = Math.min(1, Math.abs(bendVelocity) / 260);
    const breathe = motion.matches ? 0 : Math.sin(clock * 1.4) * 0.7;
    const sway = bend + breathe;
    const stretch = squash + (motion.matches ? 0 : Math.sin(clock * 1.9) * 0.006);
    const base = PAD_TOP + H;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = false;
    const cell = 1 / RES; // one art pixel, in CSS px
    const widen = 1 - stretch * 0.55;
    for (let row = 0; row < ART_H; row += 1) {
      const y = row * cell;
      const lift = Math.max(0, Math.min(1, (base - y) / domeHeight));
      const raw = sway * Math.pow(lift, 1.5) + Math.sin(row * 1.05 + clock * 38) * rustle * 1.6 * lift;
      // Snap sideways moves to whole art pixels so the wobble stays chunky.
      const shift = Math.round(raw / cell) * cell;
      const destY = base - (base - y) * (1 + stretch);
      const destX = CW / 2 - (CW / 2) * widen + shift;
      context.drawImage(art, 0, row, ART_W, 1, Math.round(destX * dpr), Math.round(destY * dpr), Math.round(CW * widen * dpr), Math.ceil(cell * (1 + stretch) * dpr) + 1);
    }

    // Eyes ride along with the leaves around them.
    const scale = bush.clientWidth / W;
    const eyeLift = 0.55;
    const cellPx = cell * scale;
    const eyeX = Math.round((sway * Math.pow(eyeLift, 1.5) * scale) / cellPx) * cellPx;
    const eyeY = Math.round((-H * eyeLift * stretch * scale) / cellPx) * cellPx;
    eyes.style.translate = `${eyeX}px ${eyeY}px`;
    drawEyes();
  }

  // ── Pixel-art eyes ──
  // Plotted pixel by pixel (each pixel is either inside a shape or not) at
  // the same pixel size as the bush, so edges stay crisp like hand-made
  // pixel art.
  const EYE_W = 34;
  const EYE_H = 28;
  eyes.width = EYE_W;
  eyes.height = EYE_H;
  const eyeContext = eyes.getContext('2d');
  const eyePixels = eyeContext.createImageData(EYE_W, EYE_H);
  const WHITE = [255, 255, 255];
  const INK = [17, 17, 17];
  const RED = [232, 35, 28];
  const look = { x: 0, y: 1 };
  let blinkUntil = 0;
  let surprisedUntil = 0;

  function plot(x, y, color) {
    if (x < 0 || y < 0 || x >= EYE_W || y >= EYE_H) return;
    const o = (y * EYE_W + x) * 4;
    eyePixels.data[o] = color[0];
    eyePixels.data[o + 1] = color[1];
    eyePixels.data[o + 2] = color[2];
    eyePixels.data[o + 3] = 255;
  }

  function fillEllipse(cx, cy, rx, ry, color) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny <= 1) plot(x, y, color);
      }
    }
  }

  function drawEye(cx, cy, closed) {
    if (closed) {
      fillEllipse(cx, cy + 2, 8, 2.6, WHITE);
      fillEllipse(cx, cy + 2, 7, 1.5, INK);
      return;
    }
    fillEllipse(cx, cy, 8, 10, WHITE);
    fillEllipse(cx, cy, 7, 9, INK);
    fillEllipse(cx, cy + 0.5, 4.6, 6.6, WHITE);
    const px = cx + Math.max(-2, Math.min(2, Math.round(look.x)));
    const py = cy + 1 + Math.max(-3, Math.min(2, Math.round(look.y)));
    fillEllipse(px, py, 2.7, 3.7, RED);
    fillEllipse(px, py, 1.6, 2.6, INK);
    plot(Math.floor(px), Math.floor(py) - 2, WHITE);
  }

  function drawBrow(from, to, lift, tilt) {
    for (let x = from; x <= to; x += 1) {
      const t = (x - from) / (to - from);
      const y = Math.round(4 + lift - Math.sin(Math.PI * t) * 2 + (t - 0.5) * tilt);
      plot(x, y, INK);
      plot(x, y + 1, INK);
    }
  }

  function drawEyes() {
    const now = performance.now();
    const closed = now < blinkUntil;
    const surprised = now < surprisedUntil;
    const lift = surprised ? -2 : closed ? 1 : 0;
    eyePixels.data.fill(0);
    drawEye(10, 17, closed);
    drawEye(24, 17, closed);
    drawBrow(3, 16, lift, surprised ? -2 : 2);
    drawBrow(18, 31, lift, surprised ? 2 : -2);
    eyeContext.putImageData(eyePixels, 0, 0);
  }

  function step(dt) {
    while (pulses.length && pulses[0].at <= clock) {
      const pulse = pulses.shift();
      bendVelocity += pulse.bend;
      squashVelocity += pulse.squash;
    }
    const bendAccel = -520 * bend - 7.5 * bendVelocity;
    bendVelocity += bendAccel * dt;
    bend += bendVelocity * dt;
    const squashAccel = -650 * squash - 11 * squashVelocity;
    squashVelocity += squashAccel * dt;
    squash += squashVelocity * dt;
  }

  // A giggle is a quick left-right-left shake that settles on its own.
  function giggle(strength = 1) {
    if (motion.matches) return;
    const dir = Math.random() < 0.5 ? -1 : 1;
    pulses.push(
      { at: clock, bend: 150 * dir * strength, squash: -0.9 * strength },
      { at: clock + 0.11, bend: -230 * dir * strength, squash: 0 },
      { at: clock + 0.22, bend: 180 * dir * strength, squash: 0.5 * strength }
    );
  }

  let visible = false;
  let hovering = false;
  let nextGiggle = 0;
  let rafId = 0;
  let lastTime = 0;

  function loop(now) {
    const elapsed = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0;
    lastTime = now;
    // Integrate in small steps so the stiff springs stay stable.
    for (let t = 0; t < elapsed; t += 1 / 240) {
      step(Math.min(1 / 240, elapsed - t));
      clock += Math.min(1 / 240, elapsed - t);
    }
    if (hovering && clock >= nextGiggle) {
      giggle(1);
      nextGiggle = clock + 1.2 + Math.random() * 0.7;
    }
    draw();
    if (visible && !motion.matches) {
      rafId = requestAnimationFrame(loop);
    } else {
      rafId = 0;
      lastTime = 0;
    }
  }

  function start() {
    if (!rafId && !motion.matches) rafId = requestAnimationFrame(loop);
  }

  function kick(amount) {
    if (motion.matches) return;
    giggle(amount);
    start();
  }

  // Only animate while the bush is on screen.
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start();
  }).observe(spot);

  draw();

  // ── Counter ──
  const STORAGE_KEY = 'bush-clicks';
  let count = 0;
  try {
    count = parseInt(localStorage.getItem(STORAGE_KEY), 10) || 0;
  } catch (error) { /* storage unavailable */ }

  function renderCount() {
    countEl.textContent = count.toLocaleString();
    countLabel.textContent = count === 1 ? 'click in my lifetime!' : 'clicks in my lifetime!';
  }
  renderCount();

  // ── Peek / hide ──
  let hideTimer = 0;
  function peek() {
    clearTimeout(hideTimer);
    hovering = true;
    spot.classList.add('is-peeking');
    nextGiggle = clock;
    start();
  }
  function hide(delay = 700) {
    hovering = false;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      spot.classList.remove('is-peeking');
      look.x = 0;
      look.y = 1;
      drawEyes();
    }, delay);
  }

  bush.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'touch') peek();
  });
  bush.addEventListener('pointerleave', (event) => {
    if (event.pointerType !== 'touch') hide();
  });
  let lastPointer = 'mouse';
  bush.addEventListener('pointerdown', (event) => { lastPointer = event.pointerType; });
  bush.addEventListener('focus', peek);
  bush.addEventListener('blur', () => hide(300));

  // ── Eyes follow the pointer together and blink ──
  window.addEventListener('pointermove', (event) => {
    if (!spot.classList.contains('is-peeking')) return;
    const rect = eyes.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(dx, dy) || 1;
    const reach = Math.min(1, distance / 140);
    look.x = (dx / distance) * 1.8 * reach;
    look.y = (dy / distance) * 2.4 * reach;
    if (!rafId) drawEyes();
  }, { passive: true });

  (function scheduleBlink() {
    setTimeout(() => {
      if (spot.classList.contains('is-peeking')) {
        blinkUntil = performance.now() + 140;
        drawEyes();
        setTimeout(drawEyes, 150);
      }
      scheduleBlink();
    }, 1800 + Math.random() * 2600);
  })();

  // ── Clicking ──
  const milestones = new Set([1, 10, 25, 50, 100, 250, 500, 1000]);

  function burst() {
    if (motion.matches) return;
    for (let i = 0; i < 7; i += 1) {
      const bit = document.createElement('span');
      bit.className = 'bush-bit';
      const petal = Math.random() < 0.35;
      bit.classList.toggle('is-petal', petal);
      bit.style.background = petal ? (Math.random() < 0.5 ? '#ef4f98' : '#ee4b66') : `hsl(${104 + Math.random() * 16} 70% ${36 + Math.random() * 22}%)`;
      spot.appendChild(bit);
      const dx = (Math.random() - 0.5) * 140;
      const dy = -40 - Math.random() * 60;
      const spin = Math.round((Math.random() - 0.5) * 4) * 90;
      bit.animate([
        { transform: 'translate(-50%, 0) rotate(0deg) scale(0.6)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), ${dy}px) rotate(${spin}deg) scale(1.1)`, opacity: 1, offset: 0.55 },
        { transform: `translate(calc(-50% + ${dx * 1.3}px), ${dy + 70}px) rotate(${spin * 1.6}deg) scale(0.9)`, opacity: 0 }
      ], { duration: 950 + Math.random() * 300, easing: 'cubic-bezier(.2,.7,.4,1)' }).onfinish = () => bit.remove();
    }
  }

  // ── Sound: a springy pop and a leafy rustle, synthesised on the fly ──
  let audio = null;
  let noise = null;
  function sound(milestone) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const now = audio.currentTime;
      const out = audio.createGain();
      out.gain.value = 0.5;
      out.connect(audio.destination);

      // Pop: a quick upward pitch bend, pitched a little differently each time.
      const pitch = 420 * (0.85 + Math.random() * 0.4);
      const pop = audio.createOscillator();
      const popGain = audio.createGain();
      pop.type = 'triangle';
      pop.frequency.setValueAtTime(pitch, now);
      pop.frequency.exponentialRampToValueAtTime(pitch * 2.1, now + 0.07);
      pop.frequency.exponentialRampToValueAtTime(pitch * 1.4, now + 0.16);
      popGain.gain.setValueAtTime(0.0001, now);
      popGain.gain.exponentialRampToValueAtTime(0.32, now + 0.012);
      popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      pop.connect(popGain).connect(out);
      pop.start(now);
      pop.stop(now + 0.22);

      // Rustle: band-passed noise.
      if (!noise) {
        noise = audio.createBuffer(1, audio.sampleRate * 0.4, audio.sampleRate);
        const data = noise.getChannelData(0);
        for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
      }
      const rustle = audio.createBufferSource();
      rustle.buffer = noise;
      const band = audio.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 2600 + Math.random() * 1400;
      band.Q.value = 0.9;
      const rustleGain = audio.createGain();
      rustleGain.gain.setValueAtTime(0.0001, now);
      rustleGain.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
      rustleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      rustle.connect(band).connect(rustleGain).connect(out);
      rustle.start(now);
      rustle.stop(now + 0.32);

      // Milestones get a little rising chime.
      if (milestone) {
        [784, 988, 1319].forEach((freq, i) => {
          const at = now + 0.12 + i * 0.09;
          const tone = audio.createOscillator();
          const toneGain = audio.createGain();
          tone.type = 'sine';
          tone.frequency.value = freq;
          toneGain.gain.setValueAtTime(0.0001, at);
          toneGain.gain.exponentialRampToValueAtTime(0.2, at + 0.01);
          toneGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.35);
          tone.connect(toneGain).connect(out);
          tone.start(at);
          tone.stop(at + 0.4);
        });
      }
    } catch (error) { /* audio unavailable */ }
  }

  bush.addEventListener('click', () => {
    count += 1;
    try {
      localStorage.setItem(STORAGE_KEY, String(count));
    } catch (error) { /* storage unavailable */ }
    renderCount();
    sound(milestones.has(count));
    surprisedUntil = performance.now() + 420;
    peek();
    kick(1.5);
    burst();
    drawEyes();
    setTimeout(drawEyes, 430);

    counter.classList.add('is-lit');
    clearTimeout(counter.litTimer);
    counter.litTimer = setTimeout(() => counter.classList.remove('is-lit'), 700);
    if (!motion.matches) {
      counter.animate([{ transform: 'scale(1.15)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(.34,1.8,.5,1)' });
    }

    // Touch screens have no hover, so tuck the eyes away after a moment.
    if (lastPointer === 'touch') hide(2600);
  });
})();

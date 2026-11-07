(() => {
  // ── Leaf Bush Easter Egg ──
  // A flowering hedge at the very bottom of the page. Hovering makes it
  // giggle, a pair of eyes peeks out, and a bubble asks to be clicked.
  const spot = document.getElementById('bush-spot');
  if (!spot) return;

  const bush = spot.querySelector('.bush');
  const canvas = spot.querySelector('.bush-canvas');
  const eyes = spot.querySelector('.bush-eyes');
  const pupils = [...spot.querySelectorAll('.bush-pupil')];
  const hintText = spot.querySelector('.bush-bubble-hint .bush-bubble-text');
  const counter = spot.querySelector('.bush-bubble-count');
  const countEl = spot.querySelector('.bush-count');
  const countLabel = spot.querySelector('.bush-count-label');
  const backdrop = document.getElementById('bush-backdrop');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Bush footprint inside .bush (CSS px). The canvas overhangs it by PAD_X /
  // PAD_TOP so the springy sway never clips at the edges.
  const W = 180;
  const H = 124;
  const PAD_X = 12;
  const PAD_TOP = 14;
  const CW = W + PAD_X * 2;
  const CH = H + PAD_TOP;

  // Seeded random so the bush looks identical on every visit.
  let seed = 20261107;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // Rows of broad leaves pointing down like shingles, laid from the bottom of
  // the dome up so each row's tips rest over the row beneath it.
  const leaves = [];
  const cx = W / 2;
  const domeHeight = H - 10;
  for (let row = 0, y = H - 12; y > 13; row += 1, y -= 9.5) {
    const rise = (H - y) / domeHeight;
    const halfSpan = (W / 2 - 18) * Math.sqrt(Math.max(0, 1 - rise * rise));
    const step = 15;
    const offset = row % 2 ? step / 2 : 0;
    for (let x = cx - halfSpan + offset; x <= cx + halfSpan + 0.1; x += step) {
      const px = x + (rand() - 0.5) * 4;
      const py = y + (rand() - 0.5) * 3;
      const side = (px - cx) / (W / 2);
      const height = 1 - py / H;
      leaves.push({
        x: px,
        y: py,
        angle: -side * 0.7 + (rand() - 0.5) * 0.3,
        length: 25 + rand() * 6 + (1 - height) * 3,
        width: 10.5 + rand() * 2.5,
        hue: 96 + rand() * 16,
        light: 36 + height * 22 + (rand() - 0.5) * 7
      });
    }
  }

  const flowers = [
    [0.25, 0.6, 'hot'], [0.15, 0.82, 'hot'], [0.36, 0.86, 'hot'],
    [0.75, 0.58, 'pale'], [0.86, 0.8, 'pale'], [0.64, 0.87, 'pale']
  ].map(([fx, fy, tone]) => ({ x: fx * W, y: fy * H, tone, radius: 9.5 + rand() * 2, spin: rand() * Math.PI }));

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = CW * dpr;
  canvas.height = CH * dpr;
  const context = canvas.getContext('2d');

  // ── Paint the bush once, softly shaded, into an offscreen image ──
  const art = document.createElement('canvas');
  art.width = CW * dpr;
  art.height = CH * dpr;
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
    body.addColorStop(0, `hsl(${hue + 6} 48% ${light - 9}%)`);
    body.addColorStop(0.45, `hsl(${hue} 56% ${light + 5}%)`);
    body.addColorStop(1, `hsl(${hue - 4} 52% ${light - 1}%)`);
    paint.shadowColor = 'rgba(10, 38, 12, 0.5)';
    paint.shadowBlur = 5 * dpr;
    paint.shadowOffsetY = 2 * dpr;
    paint.fillStyle = body;
    paint.fill();
    paint.shadowColor = 'transparent';

    paint.save();
    leafPath(length, width);
    paint.clip();
    // Far half of the cupped leaf turns away from the light.
    paint.fillStyle = `hsla(${hue + 8}, 50%, 18%, 0.16)`;
    paint.fillRect(0, top, width * 1.2, length);
    // Soft sheen near the top of the leaf.
    const sheen = paint.createRadialGradient(-width * 0.3, top + length * 0.35, 0, -width * 0.3, top + length * 0.35, width * 1.1);
    sheen.addColorStop(0, 'rgba(255, 255, 225, 0.32)');
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
    const inner = tone === 'hot' ? '#b82a72' : '#cf6f9f';
    const mid = tone === 'hot' ? '#ee5aa4' : '#f2b2d2';
    const tip = tone === 'hot' ? '#ffa6d1' : '#fff3f8';
    paint.beginPath();
    for (let k = 0; k < 5; k += 1) {
      const a = -Math.PI / 2 + (k * Math.PI * 2) / 5;
      paint.moveTo(0, 0);
      paint.quadraticCurveTo(Math.cos(a - 0.55) * radius * 0.7, Math.sin(a - 0.55) * radius * 0.7, Math.cos(a) * radius, Math.sin(a) * radius);
      paint.quadraticCurveTo(Math.cos(a + 0.55) * radius * 0.7, Math.sin(a + 0.55) * radius * 0.7, 0, 0);
    }
    const petals = paint.createRadialGradient(0, 0, 0, 0, 0, radius);
    petals.addColorStop(0, inner);
    petals.addColorStop(0.32, mid);
    petals.addColorStop(1, tip);
    paint.shadowColor = 'rgba(20, 45, 15, 0.45)';
    paint.shadowBlur = 4 * dpr;
    paint.shadowOffsetY = 1.5 * dpr;
    paint.fillStyle = petals;
    paint.fill();
    paint.shadowColor = 'transparent';

    paint.globalAlpha = 0.55;
    paint.strokeStyle = inner;
    paint.lineWidth = 0.7;
    for (let k = 0; k < 5; k += 1) {
      const a = -Math.PI / 2 + (k * Math.PI * 2) / 5;
      paint.beginPath();
      paint.moveTo(0, 0);
      paint.lineTo(Math.cos(a) * radius * 0.5, Math.sin(a) * radius * 0.5);
      paint.stroke();
    }
    paint.globalAlpha = 1;
    for (let k = 0; k < 5; k += 1) {
      const a = -Math.PI / 2 + Math.PI / 5 + (k * Math.PI * 2) / 5;
      paint.beginPath();
      paint.arc(Math.cos(a) * 2.6, Math.sin(a) * 2.6, 0.95, 0, Math.PI * 2);
      paint.fillStyle = '#ffe680';
      paint.fill();
    }
  }

  (function paintBush() {
    paint.setTransform(dpr, 0, 0, dpr, PAD_X * dpr, PAD_TOP * dpr);

    // Dark leafy depth that shows through the gaps.
    paint.beginPath();
    paint.ellipse(cx, H, W / 2 - 12, H - 14, 0, Math.PI, Math.PI * 2);
    const depth = paint.createLinearGradient(0, 14, 0, H);
    depth.addColorStop(0, '#3f8a34');
    depth.addColorStop(1, '#1d4a1d');
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
    volume.addColorStop(0, 'rgba(255, 252, 210, 0.26)');
    volume.addColorStop(0.45, 'rgba(255, 252, 210, 0)');
    volume.addColorStop(1, 'rgba(8, 36, 12, 0.32)');
    paint.fillStyle = volume;
    paint.fillRect(-PAD_X, -PAD_TOP, CW, CH);
    const ground = paint.createLinearGradient(0, H - 22, 0, H);
    ground.addColorStop(0, 'rgba(8, 32, 10, 0)');
    ground.addColorStop(1, 'rgba(8, 32, 10, 0.4)');
    paint.fillStyle = ground;
    paint.fillRect(-PAD_X, H - 22, CW, 22);
    paint.globalCompositeOperation = 'source-over';
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
    for (let y = 0; y < CH; y += 1) {
      const lift = Math.max(0, Math.min(1, (base - y) / domeHeight));
      const shift = sway * Math.pow(lift, 1.5) + Math.sin(y * 0.42 + clock * 38) * rustle * 1.1 * lift;
      const widen = 1 - stretch * 0.55;
      const destY = base - (base - y) * (1 + stretch);
      const destX = CW / 2 - (CW / 2) * widen + shift;
      context.drawImage(art, 0, y * dpr, CW * dpr, dpr, destX * dpr, destY * dpr, CW * widen * dpr, Math.ceil((1 + stretch) * dpr) + 0.5);
    }

    // Eyes ride along with the leaves around them.
    const scale = bush.clientWidth / W;
    const eyeLift = 0.5;
    eyes.style.translate = `${(sway * Math.pow(eyeLift, 1.5)) * scale}px ${(-H * eyeLift * stretch) * scale}px`;
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
    countLabel.textContent = count === 1 ? 'click' : 'clicks';
    spot.classList.toggle('has-count', count > 0);
  }
  renderCount();

  // ── Gingham backdrop that spreads out from the bush ──
  function openBackdrop() {
    if (!backdrop) return;
    const rect = bush.getBoundingClientRect();
    backdrop.style.setProperty('--bx', `${rect.left + rect.width / 2}px`);
    backdrop.style.setProperty('--by', `${rect.top + rect.height * 0.6}px`);
    backdrop.classList.add('is-open');
  }

  // ── Peek / hide ──
  let hideTimer = 0;
  function peek() {
    clearTimeout(hideTimer);
    hovering = true;
    spot.classList.add('is-peeking');
    openBackdrop();
    nextGiggle = clock;
    start();
  }
  function hide(delay = 700) {
    hovering = false;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      spot.classList.remove('is-peeking');
      backdrop?.classList.remove('is-open');
      pupils.forEach((pupil) => pupil.setAttribute('transform', restingGaze));
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
  const restingGaze = 'translate(0 2.5)';
  window.addEventListener('pointermove', (event) => {
    if (!spot.classList.contains('is-peeking')) return;
    const rect = eyes.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(dx, dy) || 1;
    const reach = Math.min(1, distance / 140);
    const gaze = `translate(${((dx / distance) * 3.4 * reach).toFixed(2)} ${((dy / distance) * 4.6 * reach).toFixed(2)})`;
    pupils.forEach((pupil) => pupil.setAttribute('transform', gaze));
  }, { passive: true });

  (function scheduleBlink() {
    setTimeout(() => {
      if (spot.classList.contains('is-peeking')) {
        eyes.classList.add('is-blinking');
        setTimeout(() => eyes.classList.remove('is-blinking'), 140);
      }
      scheduleBlink();
    }, 1800 + Math.random() * 2600);
  })();

  // ── Clicking ──
  const milestones = {
    1: 'Hehe! Again!',
    10: 'That tickles!',
    25: "Okay okay, I'm awake!",
    50: 'Best friends now 🍂',
    100: 'Legendary leaf poker!',
    250: 'Please, I have a family',
    500: 'You absolute legend'
  };
  const giggles = ['Hehe!', 'Teehee!', 'Eep!', 'Again!', 'Hoho!', 'Wheee!'];
  let textTimer = 0;

  function burst() {
    if (motion.matches) return;
    for (let i = 0; i < 7; i += 1) {
      const bit = document.createElement('span');
      bit.className = 'bush-bit';
      const petal = Math.random() < 0.35;
      bit.classList.toggle('is-petal', petal);
      bit.style.background = petal ? (Math.random() < 0.5 ? '#ef5fa7' : '#f3b6d4') : `hsl(${98 + Math.random() * 14} 52% ${40 + Math.random() * 22}%)`;
      spot.appendChild(bit);
      const dx = (Math.random() - 0.5) * 140;
      const dy = -40 - Math.random() * 60;
      const spin = (Math.random() - 0.5) * 540;
      bit.animate([
        { transform: 'translate(-50%, 0) rotate(0deg) scale(0.6)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), ${dy}px) rotate(${spin}deg) scale(1.1)`, opacity: 1, offset: 0.55 },
        { transform: `translate(calc(-50% + ${dx * 1.3}px), ${dy + 70}px) rotate(${spin * 1.6}deg) scale(0.9)`, opacity: 0 }
      ], { duration: 950 + Math.random() * 300, easing: 'cubic-bezier(.2,.7,.4,1)' }).onfinish = () => bit.remove();
    }
  }

  bush.addEventListener('click', () => {
    count += 1;
    try {
      localStorage.setItem(STORAGE_KEY, String(count));
    } catch (error) { /* storage unavailable */ }
    renderCount();
    peek();
    kick(1.5);
    burst();

    hintText.textContent = milestones[count] || giggles[Math.floor(Math.random() * giggles.length)];
    clearTimeout(textTimer);
    textTimer = setTimeout(() => { hintText.textContent = 'Click the bush!'; }, 1400);

    counter.classList.add('is-lit');
    clearTimeout(counter.litTimer);
    counter.litTimer = setTimeout(() => counter.classList.remove('is-lit'), 700);
    if (!motion.matches) {
      counter.animate([{ transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(.34,1.8,.5,1)' });
    }

    // Touch screens have no hover, so tuck the eyes away after a moment.
    if (lastPointer === 'touch') hide(2600);
  });
})();

(() => {
  // ── Leaf Bush Easter Egg ──
  // An ASCII pile of leaves at the very bottom of the page. Hovering makes it
  // giggle, a pair of eyes peeks out, and a bubble asks to be clicked.
  const spot = document.getElementById('bush-spot');
  if (!spot) return;

  const bush = spot.querySelector('.bush');
  const body = spot.querySelector('.bush-body');
  const canvas = spot.querySelector('.bush-canvas');
  const eyes = spot.querySelector('.bush-eyes');
  const pupils = [...spot.querySelectorAll('.bush-pupil')];
  const hintText = spot.querySelector('.bush-bubble-hint .bush-bubble-text');
  const counter = spot.querySelector('.bush-bubble-count');
  const countEl = spot.querySelector('.bush-count');
  const countLabel = spot.querySelector('.bush-count-label');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Same seasonal palette and glyph ramp as the falling leaves.
  const palette = ['#1ca342', '#78bb24', '#ed3024', '#ff7915', '#f6b808', '#f2d324'];
  const weights = [0.8, 1, 2, 2.2, 2, 1.5];
  const characters = '.,:;=+ox%#@';
  const W = 168;
  const H = 104;
  const CELL = 5;

  // Seeded random so the pile looks identical on every visit.
  let seed = 20261107;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const pickColor = () => {
    let roll = rand() * weights.reduce((sum, w) => sum + w, 0);
    for (let i = 0; i < palette.length; i += 1) {
      roll -= weights[i];
      if (roll <= 0) return palette[i];
    }
    return palette[palette.length - 1];
  };
  const shade = (hex, amount) => {
    const n = parseInt(hex.slice(1), 16);
    const channel = (shift) => Math.max(0, Math.min(255, Math.round(((n >> shift) & 255) * amount)));
    return `rgb(${channel(16)},${channel(8)},${channel(0)})`;
  };

  // Scatter leaves inside a half-ellipse mound, back to front.
  const leaves = [];
  while (leaves.length < 110) {
    const x = rand() * W;
    const y = H * 0.1 + Math.sqrt(rand()) * H * 0.9;
    const nx = (x - W / 2) / (W * 0.47);
    const ny = (y - H) / (H * 0.86);
    if (nx * nx + ny * ny > 1) continue;
    leaves.push({
      x,
      y,
      angle: rand() * Math.PI * 2,
      length: 22 + rand() * 14,
      width: 11 + rand() * 6,
      color: pickColor(),
      light: 0.85 + rand() * 0.3,
      phase: rand() * Math.PI * 2,
      loose: 0.5 + rand() * 0.8
    });
  }
  leaves.sort((a, b) => a.y - b.y);

  const context = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.font = 'bold 7px monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  function draw(time, amp) {
    context.clearRect(0, 0, W, H);
    for (let cy = CELL / 2; cy < H; cy += CELL) {
      for (let cx = CELL / 2; cx < W; cx += CELL) {
        for (let i = leaves.length - 1; i >= 0; i -= 1) {
          const leaf = leaves[i];
          const wobble = Math.sin(time * 24 + leaf.phase) * amp * leaf.loose;
          const angle = leaf.angle + wobble * 0.05;
          const dx = cx - (leaf.x + wobble);
          const dy = cy - (leaf.y + Math.cos(time * 19 + leaf.phase) * amp * 0.4);
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const u = dx * cos + dy * sin;
          const v = -dx * sin + dy * cos;
          const t = u / leaf.length + 0.5;
          if (t <= 0 || t >= 1) continue;
          const halfWidth = (leaf.width / 2) * Math.sin(Math.PI * Math.pow(t, 0.8));
          if (Math.abs(v) >= halfWidth) continue;

          let tone = 0.55 + 0.45 * (1 - Math.pow(Math.abs(v) / halfWidth, 2));
          if (Math.abs(v) < 0.9) tone *= 0.7; // midrib
          tone *= (0.78 + 0.35 * (1 - cy / H)) * leaf.light;
          tone = Math.max(0, Math.min(1, tone));
          const glyph = characters[Math.min(characters.length - 1, Math.floor(tone * (characters.length - 1)))];

          context.globalAlpha = 0.14;
          context.fillStyle = '#302918';
          context.fillText(glyph, cx + 1.5, cy + 2);
          context.globalAlpha = 0.95;
          context.fillStyle = shade(leaf.color, 0.25 + tone * 0.85);
          context.fillText(glyph, cx, cy);
          break;
        }
      }
    }
    context.globalAlpha = 1;
  }

  // ── Giggle animation ──
  let energy = 0;
  let hovering = false;
  let nextGiggle = 0;
  let rafId = 0;
  let lastTime = 0;
  let clock = 0;

  function loop(now) {
    const elapsed = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0;
    lastTime = now;
    clock += elapsed;

    if (hovering && clock >= nextGiggle) {
      energy = Math.max(energy, 1);
      nextGiggle = clock + 1.3 + Math.random() * 0.6;
    }
    energy *= Math.exp(-3.6 * elapsed);

    const wiggle = Math.sin(clock * 34) * energy;
    body.style.transform = `rotate(${wiggle * 2.6}deg) scale(${1 + Math.abs(wiggle) * 0.035}, ${1 - Math.abs(wiggle) * 0.05})`;
    draw(clock, energy * 2.4);

    if (hovering || energy > 0.01) {
      rafId = requestAnimationFrame(loop);
    } else {
      body.style.transform = '';
      draw(clock, 0);
      rafId = 0;
      lastTime = 0;
    }
  }

  function kick(amount) {
    if (motion.matches) return;
    energy = Math.max(energy, amount);
    if (!rafId) rafId = requestAnimationFrame(loop);
  }

  draw(0, 0);

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

  // ── Peek / hide ──
  let hideTimer = 0;
  function peek() {
    clearTimeout(hideTimer);
    hovering = true;
    spot.classList.add('is-peeking');
    if (!motion.matches) {
      nextGiggle = clock;
      if (!rafId) rafId = requestAnimationFrame(loop);
    }
  }
  function hide(delay = 700) {
    hovering = false;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => spot.classList.remove('is-peeking'), delay);
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

  // ── Eyes follow the pointer and blink ──
  window.addEventListener('pointermove', (event) => {
    if (!spot.classList.contains('is-peeking')) return;
    pupils.forEach((pupil) => {
      const rect = pupil.parentNode.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const distance = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, distance / 120);
      pupil.setAttribute('transform', `translate(${(dx / distance) * 3.2 * reach} ${(dy / distance) * 4.2 * reach})`);
    });
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
      bit.textContent = '@#%xo+'[Math.floor(Math.random() * 6)];
      bit.style.color = palette[Math.floor(Math.random() * palette.length)];
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

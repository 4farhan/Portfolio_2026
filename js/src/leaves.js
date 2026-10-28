import { AmbientLight, Color, DirectionalLight, OrthographicCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { EffectComposer, EffectPass, RenderPass } from 'postprocessing';
import { ASCII } from '../vendor/ascii.js';
import { createLeafGeometry, createLeafModel } from './leaf-model.js';
import { LeafInteraction } from './leaf-interaction.js';

const canvas = document.getElementById('leaves-canvas');
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const palette = ['#36702d', '#568133', '#a52928', '#bd4824', '#b9820c', '#c99d18'];
const scene = new Scene();
const camera = new OrthographicCamera(-1, 1, 1, -1, 1, 2000);
camera.position.z = 800;
scene.background = new Color('#000000');
scene.add(new AmbientLight('#ffffff', 0.55));
const sunlight = new DirectionalLight('#fff8e9', 3.4);
sunlight.position.set(-200, 400, 600);
scene.add(sunlight);
const backlight = new DirectionalLight('#dce7ff', 0.65);
backlight.position.set(200, -100, -400);
scene.add(backlight);

const geometry = createLeafGeometry();
const templates = palette.map((color) => createLeafModel(geometry, color));
const leaves = [];
let interaction;
let width = 0;
let height = 0;
let renderer;
let composer;
let ascii;
let fallbackContext;
let frame = 0;
let previousTime = 0;

function setupRenderer() {
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(1);
    composer = new EffectComposer(renderer, { multisampling: 0 });
    composer.addPass(new RenderPass(scene, camera));
    ascii = new ASCII({ cellSize: 8, opacity: 0.98, characters: ' .:-=+*x%#@' });
    composer.addPass(new EffectPass(camera, ascii));
    canvas.dataset.renderer = 'webgl-ascii';
  } catch (error) {
    // A software projection of the same curved model keeps leaves visible on
    // browsers or devices where WebGL is unavailable.
    composer?.dispose();
    renderer?.dispose();
    composer = null;
    renderer = null;
    const replacement = canvas.cloneNode();
    canvas.replaceWith(replacement);
    fallbackContext = replacement.getContext('2d');
    replacement.dataset.renderer = 'software-ascii';
    console.info('Using the software ASCII leaf renderer.');
  }
}

function resetLeaf(leaf, initial = false) {
  leaf.position.set(
    initial ? (Math.random() - 0.5) * (width + 180) : (Math.random() - 0.25) * (width + 180),
    initial ? (Math.random() - 0.5) * (height + 100) : height / 2 + 120,
    (Math.random() - 0.5) * 280
  );
  leaf.rotation.set(Math.random() * 1.6 - 0.8, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
  const size = (width < 640 ? 31 : 39) + Math.random() * 15;
  leaf.scale.setScalar(size);
  leaf.userData = {
    baseSize: size,
    generation: 0,
    state: 'falling',
    age: initial ? 2 : 0,
    burstX: 0,
    burstY: 0,
    speed: 20 + Math.random() * 20,
    drift: -7 - Math.random() * 10,
    phase: Math.random() * Math.PI * 2,
    tumbleX: (Math.random() - 0.5) * 0.65,
    tumbleY: 0.2 + Math.random() * 0.65,
    tumbleZ: (Math.random() - 0.5) * 0.4
  };
}

function resize() {
  interaction?.cancel();
  width = window.innerWidth;
  height = window.innerHeight;
  camera.left = -width / 2;
  camera.right = width / 2;
  camera.top = height / 2;
  camera.bottom = -height / 2;
  camera.updateProjectionMatrix();
  if (composer) {
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    ascii.uniforms.get('uCellSize').value = width < 640 ? 6 : 8;
  } else {
    fallbackContext.canvas.width = width;
    fallbackContext.canvas.height = height;
  }
  const count = width < 640 ? 10 : 17;
  while (leaves.length > count) scene.remove(leaves.pop());
  while (leaves.length < count) {
    const leaf = templates[leaves.length % templates.length].clone(true);
    leaves.push(leaf);
    scene.add(leaf);
  }
  leaves.forEach((leaf, index) => {
    leaf.visible = index < count;
    resetLeaf(leaf, true);
  });
}

const point = new Vector3();
function renderSoftware() {
  const context = fallbackContext;
  const cell = 5;
  const cells = new Map();
  const characters = '.,:;+*x%#@';
  context.clearRect(0, 0, width, height);
  scene.updateMatrixWorld(true);
  const positions = geometry.getAttribute('position');
  leaves.forEach((leaf) => {
    if (!leaf.visible) return;
    const color = leaf.children[0].material.color;
    for (let index = 0; index < positions.count / 2; index += 1) {
      point.fromBufferAttribute(positions, index).applyMatrix4(leaf.matrixWorld);
      const x = Math.round((point.x + width / 2) / cell);
      const y = Math.round((height / 2 - point.y) / cell);
      if (x < 0 || y < 0 || x * cell > width || y * cell > height) continue;
      const key = `${x},${y}`;
      if (!cells.has(key) || cells.get(key).z < point.z) {
        cells.set(key, { x, y, z: point.z, color, character: characters[Math.min(9, Math.floor(Math.abs(Math.cos(leaf.rotation.y)) * 8 + index % 2))] });
      }
    }
  });
  context.font = '7px monospace';
  context.textAlign = 'center';
  cells.forEach((glyph) => {
    context.globalAlpha = 0.14;
    context.fillStyle = '#302918';
    context.fillText(glyph.character, glyph.x * cell + 4, glyph.y * cell + 6);
    context.globalAlpha = 0.82;
    context.fillStyle = `#${glyph.color.getHexString()}`;
    context.fillText(glyph.character, glyph.x * cell, glyph.y * cell);
  });
}

function render(time = 0) {
  const elapsed = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
  previousTime = time;
  interaction.update(elapsed);
  leaves.slice().forEach((leaf) => {
    if (!leaf.visible || motion.matches) return;
    const movement = leaf.userData;
    if (movement.state === 'shaking') return;
    movement.age += elapsed;
    movement.burstX *= Math.exp(-2.8 * elapsed);
    movement.burstY *= Math.exp(-2.8 * elapsed);
    movement.phase += elapsed * 1.4;
    leaf.position.x += (movement.drift + Math.sin(movement.phase) * 17 + movement.burstX) * elapsed;
    leaf.position.y += (movement.burstY - movement.speed) * elapsed;
    leaf.rotation.x += movement.tumbleX * elapsed;
    leaf.rotation.y += movement.tumbleY * elapsed;
    leaf.rotation.z += movement.tumbleZ * elapsed;
    if (movement.generation > 0) {
      const pop = Math.min(movement.age / 0.3, 1);
      leaf.scale.setScalar(movement.baseSize * (1 + Math.sin(pop * Math.PI) * 0.12 - 0.25 * (1 - pop)));
    }
    if (leaf.position.y < -height / 2 - 130 || leaf.position.x < -width / 2 - 140) {
      if (movement.generation > 0 && leaves.length > (width < 640 ? 10 : 17)) {
        scene.remove(leaf);
        leaves.splice(leaves.indexOf(leaf), 1);
      } else resetLeaf(leaf);
    }
  });
  if (composer) composer.render(elapsed);
  else renderSoftware();
  if (!motion.matches && !document.hidden) frame = requestAnimationFrame(render);
}

function restart() {
  cancelAnimationFrame(frame);
  previousTime = 0;
  if (!document.hidden) render();
}

setupRenderer();
resize();
interaction = new LeafInteraction({ leaves, scene, camera, motion });
restart();
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { resize(); restart(); }, 140);
});
motion.addEventListener('change', restart);
document.addEventListener('visibilitychange', restart);
canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  cancelAnimationFrame(frame);
});
canvas.addEventListener('webglcontextrestored', restart);

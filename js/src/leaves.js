import { AmbientLight, Color, DirectionalLight, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { EffectComposer, EffectPass, RenderPass } from 'postprocessing';
import { ASCII } from '../vendor/ascii.js';
import { createLeafGeometry, createLeafModel } from './leaf-model.js';
import { LeafInteraction } from './leaf-interaction.js';

const canvas = document.getElementById('leaves-canvas');
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const palette = ['#1ca342', '#78bb24', '#ed3024', '#ff7915', '#f6b808', '#f2d324'];
const scene = new Scene();
const camera = new PerspectiveCamera(38, 1, 10, 5000);
scene.background = new Color('#000000');
scene.add(new AmbientLight('#ffffff', 0.25));
const sunlight = new DirectionalLight('#fff8e9', 3.8);
sunlight.position.set(-450, 260, 400);
scene.add(sunlight);
const backlight = new DirectionalLight('#e3efff', 1.15);
backlight.position.set(260, -80, -400);
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    composer = new EffectComposer(renderer, { multisampling: 0 });
    composer.addPass(new RenderPass(scene, camera));
    ascii = new ASCII({ cellSize: 6, opacity: 1, characters: ' .,:;=+ox%#@' });
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
    (Math.random() - 0.5) * Math.min(camera.position.z * 0.5, 440)
  );
  leaf.rotation.set(Math.random() * 1.6 - 0.8, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
  const size = (width < 640 ? 34 : 48) + Math.random() * (width < 640 ? 12 : 16);
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
  camera.aspect = width / height;
  // At z=0, one world unit is one CSS pixel. Nearer leaves appear larger.
  camera.position.z = height / (2 * Math.tan(camera.fov * Math.PI / 360));
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  if (composer) {
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    ascii.uniforms.get('uCellSize').value = (width < 640 ? 5 : 6) * renderer.getPixelRatio();
  } else {
    fallbackContext.canvas.width = width;
    fallbackContext.canvas.height = height;
  }
  const count = width < 640 ? 8 : 13;
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
const normal = new Vector3();
const softwareLight = sunlight.position.clone().normalize();
const softwareBacklight = backlight.position.clone().normalize();
const shadedColor = new Color();
function renderSoftware() {
  const context = fallbackContext;
  const cell = 5;
  const cells = new Map();
  const characters = '.,:;=+ox%#@';
  context.clearRect(0, 0, width, height);
  scene.updateMatrixWorld(true);
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  leaves.forEach((leaf) => {
    if (!leaf.visible) return;
    const color = leaf.children[0].material.color;
    for (let index = 0; index < positions.count; index += 1) {
      point.fromBufferAttribute(positions, index).applyMatrix4(leaf.matrixWorld);
      const depth = point.z;
      point.project(camera);
      const x = Math.round((point.x + 1) * width / (2 * cell));
      const y = Math.round((1 - point.y) * height / (2 * cell));
      if (x < 0 || y < 0 || x * cell > width || y * cell > height) continue;
      const key = `${x},${y}`;
      if (!cells.has(key) || cells.get(key).z < depth) {
        normal.fromBufferAttribute(normals, index).transformDirection(leaf.matrixWorld);
        const lighting = Math.min(1, 0.16 + Math.max(0, normal.dot(softwareLight)) * 0.95 + Math.max(0, normal.dot(softwareBacklight)) * 0.35);
        const face = index < positions.count / 2 ? 1 : 0.66;
        const tone = lighting * face;
        cells.set(key, { x, y, z: depth, color: shadedColor.copy(color).multiplyScalar(0.2 + tone * 0.85).getHexString(), character: characters[Math.min(characters.length - 1, Math.floor(tone * (characters.length - 1)))] });
      }
    }
  });
  context.font = 'bold 7px monospace';
  context.textAlign = 'center';
  cells.forEach((glyph) => {
    context.globalAlpha = 0.14;
    context.fillStyle = '#302918';
    context.fillText(glyph.character, glyph.x * cell + 4, glyph.y * cell + 6);
    context.globalAlpha = 0.95;
    context.fillStyle = `#${glyph.color}`;
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
      if (movement.generation > 0 && leaves.length > (width < 640 ? 8 : 13)) {
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

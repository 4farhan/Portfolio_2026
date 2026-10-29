import { Raycaster, Vector2, Vector3 } from 'three';

const SHAKE_DURATION = 0.78;
const CHILD_SCALE = 0.64;
const MAX_LEAVES = 40;

export class LeafInteraction {
  constructor({ leaves, scene, camera, motion }) {
    this.leaves = leaves;
    this.scene = scene;
    this.camera = camera;
    this.motion = motion;
    this.pointer = new Vector2();
    this.pointerPresent = false;
    this.pointerBlocked = false;
    this.raycaster = new Raycaster();
    this.projected = new Vector3();
    this.active = null;
    this.releaseZone = null;

    window.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      this.pointer.set(event.clientX, event.clientY);
      this.pointerPresent = true;
      this.pointerBlocked = Boolean(event.target.closest('a, button, input, textarea, select, dialog'));
      if (this.releaseZone && this.pointer.distanceTo(this.releaseZone.point) > this.releaseZone.radius) this.releaseZone = null;
    }, { passive: true });
    window.addEventListener('pointerout', (event) => {
      if (!event.relatedTarget) this.cancel();
    });
    window.addEventListener('blur', () => this.cancel());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.cancel();
    });
  }

  screenPosition(position) {
    this.projected.copy(position).project(this.camera);
    return new Vector2((this.projected.x + 1) * innerWidth / 2, (1 - this.projected.y) * innerHeight / 2);
  }

  screenRadius(leaf) {
    const perspective = this.camera.isPerspectiveCamera
      ? this.camera.position.z / Math.max(1, this.camera.position.z - leaf.position.z)
      : 1;
    return leaf.userData.baseSize * 1.6 * perspective;
  }

  cancel() {
    this.release();
    this.pointerPresent = false;
    this.releaseZone = null;
  }

  release() {
    if (!this.active) return;
    const { leaf, position, rotation } = this.active;
    leaf.position.copy(position);
    leaf.rotation.copy(rotation);
    leaf.scale.setScalar(leaf.userData.baseSize);
    leaf.userData.state = 'falling';
    this.active = null;
  }

  canSplit(leaf) {
    const movement = leaf.userData;
    return leaf.visible && movement.generation < 2 && movement.baseSize * CHILD_SCALE >= 16 && movement.age > 1 && this.leaves.length < MAX_LEAVES;
  }

  findLeaf() {
    const candidates = this.leaves.filter((leaf) => {
      if (!this.canSplit(leaf)) return false;
      return this.screenPosition(leaf.position).distanceTo(this.pointer) < this.screenRadius(leaf);
    });
    if (!candidates.length) return null;
    this.scene.updateMatrixWorld(true);
    this.camera.updateMatrixWorld(true);
    this.raycaster.setFromCamera(new Vector2(this.pointer.x / innerWidth * 2 - 1, 1 - this.pointer.y / innerHeight * 2), this.camera);
    const hit = this.raycaster.intersectObjects(candidates.map((leaf) => leaf.children[0]), false)[0];
    return hit?.object.parent || null;
  }

  split() {
    const { leaf, position, rotation } = this.active;
    const parent = leaf.userData;
    const size = parent.baseSize * CHILD_SCALE;
    this.releaseZone = { point: this.screenPosition(position), radius: this.screenRadius(leaf) };

    for (const direction of [-1, 1]) {
      // Cloning shares the parent's exact materials, including its seasonal hue.
      const child = leaf.clone(true);
      child.position.copy(position);
      child.position.x += direction * size * 0.2;
      child.rotation.copy(rotation);
      child.rotation.z += direction * 0.25;
      child.scale.setScalar(size * 0.75);
      child.userData = {
        ...parent,
        parentId: leaf.id,
        generation: parent.generation + 1,
        baseSize: size,
        state: 'falling',
        age: 0,
        phase: parent.phase + direction,
        burstX: direction * 110,
        burstY: 48,
        tumbleY: direction * (0.65 + Math.random() * 0.3),
        tumbleZ: direction * 0.85
      };
      this.leaves.push(child);
      this.scene.add(child);
    }
    this.scene.remove(leaf);
    this.leaves.splice(this.leaves.indexOf(leaf), 1);
    this.active = null;
  }

  update(elapsed) {
    if (!this.pointerPresent || this.pointerBlocked || this.motion.matches || document.querySelector('dialog[open]')) {
      this.release();
      return;
    }
    if (this.active) {
      const active = this.active;
      const radius = this.screenRadius(active.leaf);
      if (this.screenPosition(active.position).distanceTo(this.pointer) > radius) {
        this.release();
        return;
      }
      active.time += elapsed;
      const progress = Math.min(active.time / SHAKE_DURATION, 1);
      const intensity = 1.2 + progress * 2.5;
      active.leaf.position.copy(active.position);
      active.leaf.position.x += Math.sin(active.time * 95) * intensity;
      active.leaf.position.y += Math.cos(active.time * 77) * intensity * 0.4;
      active.leaf.rotation.copy(active.rotation);
      active.leaf.rotation.z += Math.sin(active.time * 80) * (0.025 + progress * 0.05);
      const squash = Math.max(0, (progress - 0.72) / 0.28) * 0.13;
      const size = active.leaf.userData.baseSize;
      active.leaf.scale.set(size * (1 + squash), size * (1 - squash), size);
      if (progress === 1) this.split();
      return;
    }
    if (this.releaseZone) return;
    const leaf = this.findLeaf();
    if (!leaf) return;
    leaf.userData.state = 'shaking';
    this.active = { leaf, time: 0, position: leaf.position.clone(), rotation: leaf.rotation.clone() };
  }
}

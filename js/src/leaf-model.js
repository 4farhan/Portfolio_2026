import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial, TubeGeometry, Vector3 } from 'three';

// A reusable leaf mesh: two curved surfaces, a raised midrib, side veins and stem.
// Coordinates are model space; the background scales and rotates each instance.
export function leafSurface(t, side) {
  const profile = Math.pow(Math.sin(Math.PI * t), 0.78);
  const serration = 1 + 0.045 * Math.sin(t * Math.PI * 18);
  return new Vector3(
    side * profile * serration * 0.73,
    -1 + t * 2.25,
    // A raised central fold, dropped edges, curled tip and uneven edge ripples
    // give the ASCII pass a range of surface normals instead of a flat blade.
    0.38 * profile * (1 - Math.pow(Math.abs(side), 0.65))
      - 0.27 * side * side * profile
      + 0.5 * Math.pow(t, 3)
      + 0.055 * Math.sin(t * Math.PI * 6 + side) * Math.abs(side) * profile
  );
}

export function createLeafGeometry() {
  const rows = 32;
  const columns = 18;
  const positions = [];
  const colors = [];
  const indices = [];
  const layerSize = (rows + 1) * (columns + 1);

  for (let layer = 0; layer < 2; layer += 1) {
    for (let row = 0; row <= rows; row += 1) {
      for (let column = 0; column <= columns; column += 1) {
        const point = leafSurface(row / rows, column / columns * 2 - 1);
        positions.push(point.x, point.y, point.z + (layer === 0 ? 0.012 : -0.012));
        // The reverse is slightly darker; both faces keep the seasonal hue.
        const tone = layer === 0 ? 1 : 0.66;
        colors.push(tone, tone, tone);
      }
    }
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const a = layer * layerSize + row * (columns + 1) + column;
        const b = a + 1;
        const c = a + columns + 1;
        const d = c + 1;
        if (layer === 0) indices.push(a, b, c, b, d, c);
        else indices.push(a, c, b, b, c, d);
      }
    }
  }

  // Join both edges of the blade so it remains a solid object when tumbling.
  for (let row = 0; row < rows; row += 1) {
    for (const column of [0, columns]) {
      const a = row * (columns + 1) + column;
      const b = a + columns + 1;
      if (column === 0) indices.push(a, a + layerSize, b, b, a + layerSize, b + layerSize);
      else indices.push(a, b, a + layerSize, b, b + layerSize, a + layerSize);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createLeafModel(geometry, color) {
  const group = new Group();
  const bladeMaterial = new MeshStandardMaterial({ color, vertexColors: true, roughness: 0.48, metalness: 0 });
  const veinMaterial = new MeshStandardMaterial({ color, roughness: 0.9 });
  veinMaterial.color.multiplyScalar(0.62);
  group.add(new Mesh(geometry, bladeMaterial));

  const vein = (points, radius) => {
    const curve = new CatmullRomCurve3(points);
    group.add(new Mesh(new TubeGeometry(curve, 20, radius, 4, false), veinMaterial));
  };

  vein([
    new Vector3(-0.08, -1.44, 0.01),
    new Vector3(0, -1, 0.02),
    ...[0.15, 0.35, 0.55, 0.75, 0.98].map((t) => leafSurface(t, 0).add(new Vector3(0, 0, 0.027)))
  ], 0.024);

  for (const t of [0.22, 0.4, 0.58, 0.74]) {
    for (const side of [-1, 1]) {
      vein([
        leafSurface(t, 0).add(new Vector3(0, 0, 0.025)),
        leafSurface(t + 0.065, side * 0.45).add(new Vector3(0, 0, 0.02)),
        leafSurface(Math.min(t + 0.15, 0.97), side * 0.9).add(new Vector3(0, 0, 0.018))
      ], 0.011);
    }
  }
  return group;
}

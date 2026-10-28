/*!
 * ASCII effect adapted from https://github.com/isladjan/ascii
 * Upstream commit: bc53507c6d4ccadf23721d1c415d019ad1294c03
 * Copyright (c) 2024 isladjan. MIT License; see THIRD_PARTY_LICENSES.md.
 * Adaptations: retain the rendered scene's colors and composite glyphs on white.
 */
import { CanvasTexture, Color, LinearFilter, RepeatWrapping, Texture, Uniform } from 'three';
import { BlendFunction, Effect } from 'postprocessing';

const fragment = `
  uniform sampler2D uCharacters;
  uniform float uCharactersCount;
  uniform float uCellSize;
  uniform vec3 uBackground;
  uniform float uOpacity;

  const vec2 SIZE = vec2(16.0);

  vec4 sampleGlyph(vec2 sourceUV, vec2 glyphUV) {
    vec2 cell = resolution / uCellSize;
    vec2 grid = 1.0 / cell;
    vec2 pixelizedUV = grid * (0.5 + floor(sourceUV / grid));
    vec4 pixelized = texture2D(inputBuffer, pixelizedUV);
    float brightness = dot(pixelized.rgb, vec3(0.299, 0.587, 0.114));
    float density = pow(clamp(brightness, 0.0, 1.0), 0.4);
    float characterIndex = floor((uCharactersCount - 1.0) * density);
    vec2 characterPosition = vec2(mod(characterIndex, SIZE.x), floor(characterIndex / SIZE.y));
    vec2 localUV = fract(glyphUV * cell);
    vec2 charUV = vec2(
      (characterPosition.x + localUV.x) / SIZE.x,
      1.0 - (characterPosition.y + 1.0 - localUV.y) / SIZE.y
    );
    vec4 asciiCharacter = texture2D(uCharacters, charUV);
    float coverage = asciiCharacter.a * step(0.015, brightness);
    return vec4(pixelized.rgb, coverage);
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 grid = vec2(uCellSize) / resolution;
    vec4 leaf = sampleGlyph(uv, uv);
    float shadow = sampleGlyph(uv + grid * vec2(-1.0, 1.0), uv).a * 0.16;
    shadow += sampleGlyph(uv + grid * vec2(-2.0, 2.0), uv).a * 0.055;
    vec3 background = mix(uBackground, vec3(0.12, 0.105, 0.09), shadow);
    float peak = max(max(leaf.r, leaf.g), leaf.b);
    float shading = smoothstep(0.025, 0.7, peak);
    vec3 tint = leaf.rgb / max(peak, 0.001) * mix(0.025, 0.32, shading);
    outputColor = vec4(mix(background, tint, leaf.a * uOpacity), 1.0);
  }
`;

export class ASCII extends Effect {
  constructor({ font = 'monospace', characters = ' .:-=+*x%#@', fontSize = 60, cellSize = 8, opacity = 0.85, background = '#ffffff' } = {}) {
    const uniforms = new Map([
      ['uCharacters', new Uniform(new Texture())],
      ['uCellSize', new Uniform(cellSize)],
      ['uCharactersCount', new Uniform(characters.length)],
      ['uBackground', new Uniform(new Color(background))],
      ['uOpacity', new Uniform(opacity)]
    ]);
    super('ASCII', fragment, { uniforms, blendFunction: BlendFunction.NORMAL });
    this.uniforms.get('uCharacters').value.dispose();
    this.uniforms.get('uCharacters').value = this.createCharactersTexture(characters, font, fontSize);
  }

  createCharactersTexture(characters, font, fontSize) {
    const canvas = document.createElement('canvas');
    const size = 1024;
    const perRow = 16;
    const cell = size / perRow;
    canvas.width = canvas.height = size;
    const texture = new CanvasTexture(canvas, undefined, RepeatWrapping, RepeatWrapping, LinearFilter, LinearFilter);
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, size, size);
    context.font = `700 ${fontSize}px ${font}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#fff';
    for (let index = 0; index < characters.length; index += 1) {
      const x = index % perRow;
      const y = Math.floor(index / perRow);
      context.fillText(characters[index], x * cell + cell / 2, y * cell + cell / 2);
    }
    texture.needsUpdate = true;
    return texture;
  }
}

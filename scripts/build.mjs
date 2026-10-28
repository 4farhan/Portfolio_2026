import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';

const result = await build({
  entryPoints: ['js/src/leaves.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  legalComments: 'linked',
  outfile: 'js/leaves.js',
  write: false
});

for (const output of result.outputFiles) {
  // Three.js embeds GLSL strings; normalize only trailing spaces in the bundle.
  await writeFile(output.path, output.text.replace(/[\t ]+$/gm, ''));
}
console.log('Built the local 3D ASCII leaf bundle and license notices.');

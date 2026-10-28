import { build } from 'esbuild';
import { cp, mkdir, writeFile } from 'node:fs/promises';

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

// Vercel serves only this generated static output, not the source repository.
await mkdir('public/js', { recursive: true });
for (const file of ['index.html', 'icon.png', 'resume.pdf', 'THIRD_PARTY_LICENSES.md', 'js/leaves.js', 'js/leaves.js.LEGAL.txt', 'js/effects.js']) {
  await cp(file, `public/${file}`);
}
for (const directory of ['css', 'images']) {
  await cp(directory, `public/${directory}`, { recursive: true });
}
console.log('Built the 3D ASCII leaves and packaged the static site into public/.');

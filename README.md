# Farhan's portfolio

Static portfolio for farhans.me. The original white theme, layout, project hover
images, and signature are retained.

## Local preview

```sh
npm ci
npm run build
npm run dev
```

Open http://127.0.0.1:4173. The checked-in `js/leaves.js` bundle lets the existing
static host serve the site without a runtime dependency on a CDN or Node.js.
Rebuild after editing the leaf source. The build also packages the page, styles,
scripts, images, and resume into `public/`, which Vercel serves using the
configuration in `vercel.json`. This generated folder is ignored by Git.

## Effects

- `js/src/leaf-model.js` builds a curved 3D blade, stem, midrib, and side veins.
- `js/src/leaves.js` lights, rotates, and drifts seasonal copies of that model.
- `js/src/leaf-interaction.js` detects pointer hovers without intercepting page
  clicks. A leaf freezes, shakes for about 0.8 seconds, then splits into two
  smaller leaves sharing its exact color materials. They bounce apart and
  resume falling. Moving away early lets the original leaf continue falling.
  Minimum size and population limits keep repeated splits bounded.
- `js/vendor/ascii.js` adapts isladjan's ASCII shader to preserve leaf colors on
  white, retain lighting contrast, and draw offset ASCII shadows. Attribution
  and the upstream MIT license are in `THIRD_PARTY_LICENSES.md`.
Project entries retain their original hover images and external links, without
opening a detail panel.

Leaves and their hover interaction become still when reduced motion is enabled.
Hidden tabs pause the leaf animation. A software renderer projects the same
model if WebGL cannot be created.

# Częstochowa switch

Contemporary Częstochowa in a pixel-art day/night switch: Jasna Góra, the tree-lined Aleja NMP, the Ratusz on Plac Biegańskiego, café terraces, and a red-and-white Pesa Twist tram.

[Live demo](https://preacherxp.github.io/czestochowa-switch/) · [60 fps MP4](czestochowa-day-night-60fps.mp4)

The scene is a compressed city panorama. The tram crossing evokes Aleja Wolności/Kościuszki; it does not suggest trams run along the pedestrian avenue toward the monastery.

No build step or runtime dependencies. Drag through the hours, tap or press Space to toggle, and use the arrow keys to step through time.

## Run and check

```sh
python3 -m http.server 8000
node test-scene.cjs
```

Open http://localhost:8000. The engine test checks day, dusk, night, dawn, lighting, the cat interaction and reduced motion.

## Embed

```html
<script src="city-switch.js"></script>
<script src="czestochowa.js"></script>
<czestochowa-switch style="display: block; width: min(680px, 100%);"></czestochowa-switch>
```

The component exposes `checked`, `position`, and `jump(night)`. Its `change` event supplies `detail.night`; `scrub` supplies `position`, `hour`, and `dark`.

GitHub Pages serves `/` from `main`; push to that branch to update the demo.

## Landmark references

- [Częstochowa city: Aleja NMP and Plac Biegańskiego](https://www.czestochowa.pl/2026-rokiem-miasta-czestochowy).
- [City: modernization of Aleja NMP](https://fe.czestochowa.pl/page/2716,wzmocnienie-znaczenia-centrum-pielgrzymkowego-poprzez-modernizacje-alei-najswietszej-marii-panny-w-czestochowie.html).
- [MPK: the Pesa Twist and its red-and-white livery](https://www.mpk.czest.pl/aktualnosci/2012/03/pierwszy-twist-w-czestochowie).

## Attribution

The shared engine is derived from `tokyo-switch.js`; the original idea is “住人のいるスイッチ” by @Lattice_Node ([original project](https://ludion.ai/p/toggle-daylight), MIT), as credited in the engine source.

The MP4 is a seven-second recording of the complete browser-rendered switch at 800 × 500 and 60 fps, including the moving glass lens.

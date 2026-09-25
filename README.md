ZincJS
======

ZincJS is a JavaScript library for displaying anatomical and physiological models in the web browser. It is the web counterpart of [OpenCMISS-Zinc](https://github.com/OpenCMISS/zinc): scenes built with PyZinc, Scaffold Maker or the Mapping Tools can be exported and shown interactively on a web page, keeping their region hierarchy, named anatomical groups, graphics settings and time-varying data.

It is built on [three.js](https://threejs.org/) and renders with WebGPU, falling back to WebGL 2 where WebGPU is unavailable.

Why ZincJS?
-----------

General-purpose 3D libraries can draw meshes, but they know nothing about Zinc models. ZincJS adds the pieces needed for biomedical scaffolds:

* **Direct pipeline from Zinc** – load scenes exported from PyZinc / the Argon scene exporter through a single metadata file, with no custom loader code.
* **Region hierarchy and named groups** – objects are organised in a Zinc-like region tree and identified by anatomical group names, which makes it straightforward to link a 3D structure to search, highlighting and ontology terms.
* **Time-varying models** – morph-target animation of geometry and field colours (for example a beating heart or gut motility), with scene-wide playback control.
* **Primitives for scaffolds and fields** – surfaces, lines, tube lines, point sets, glyph sets for vector/tensor fields, labels, markers with clustering and level-of-detail switching.
* **Imaging alongside models** – volume rendering and texture slices from NIfTI images in the same scene as the scaffold.
* **Application features** – multiple scenes per renderer, picking, smooth camera transitions, auto-tumble, stereo, minimap, video synchronisation and glTF import/export.

Applications built with ZincJS:

* [SPARC Portal](https://sparc.science/maps?type=wholebody)
* [ScaffoldVuer](https://mapcore-demo.org/current/scaffoldvuer)
* [Scaffold Maker](https://mapcore-demo.org/2019/colon/scaffold.html)
* [Fitzlet](https://sites.bioeng.auckland.ac.nz/mwu035/fitzlet/)

Installation
------------

Install from npm:

```Shell
$ npm install zincjs
```

Pre-releases are published under the `beta` tag (`npm install zincjs@beta`).

Quick start
-----------

```javascript
import Zinc from 'zincjs';

const container = document.getElementById('zinc-container');
const renderer = new Zinc.Renderer(container);
await renderer.initialiseVisualisation();

const scene = renderer.getCurrentScene();
scene.loadMetadataURL('models/metadata.json', undefined, () => {
  scene.viewAll();
});

renderer.animate();
```

`initialiseVisualisation` is asynchronous and must finish before any scene is used. Other formats can be loaded with `scene.loadGLTF`, `scene.loadOBJ` and `scene.loadSTL`, and NIfTI images with `Zinc.createPrimitivesFromNIFTI`.

Useful links:

* [Examples](https://github.com/alan-wu/ZincJS-Examples/)
* [Tutorials](https://github.com/alan-wu/ZincJS-Tutorials/)
* [API documentation](https://abi-software.github.io/ZincJS/)

Exporting models to ZincJS
--------------------------

* **Mapping Tools users** – use the [Argon scene exporter](https://abi-mapping-tools.readthedocs.io/en/v1.2.1/mapclientplugins.argonsceneexporterstep/docs/index.html) step.
* **PyZinc users** – see [PyZinc2ZincJS](https://github.com/alan-wu/PyZinc2ZincJS/).

Both produce a metadata JSON file plus the files it references. Keep them in the same folder and pass the metadata file's URL to `scene.loadMetadataURL`.

<details>
<summary>Legacy: exporting from CMGUI</summary>

1. Read in your files in CMGUI and set up the graphics and viewing window.
2. Export with `gfx export threejs` (run `gfx export threejs ?` for options) and note the `filename_prefix` you choose.
3. Adjust the view, then run `gfx list win 1` and copy the eye point, interest point, up vector, near plane and far plane into a view file:

   ```json
   {"farPlane": 601.12, "nearPlane": 14.81, "upVector": [0.0, 1.0, 0.0],
    "targetPosition": [9.70, 6.39, -5.00], "eyePosition": [9.70, 6.39, 291.20]}
   ```

4. The first exported file (`[filename_prefix]_1.json`) is the metadata file. Add an entry for the view file to it:

   ```json
   { "Type": "View", "URL": "new_models_view.json" }
   ```

</details>

Controls
--------

| Action    | Mouse               | Touch                  |
|-----------|---------------------|------------------------|
| Rotate    | Left button drag    | One-finger drag        |
| Zoom      | Middle button drag / scroll wheel | Two-finger pinch |
| Pan       | Right button drag   | Three-finger drag      |

Building from source
--------------------

Requires Node.js 24.

```Shell
$ npm install
$ npm run build-bundle   # outputs build/zinc.js and its source map
$ npm run test-standard  # run the test suite
$ npm run jsdoc          # regenerate the API documentation in docs/
```

License
-------

[MIT](LICENSE)

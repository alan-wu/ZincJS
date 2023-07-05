ZincJS (Web-based-Zinc-Visualisation)
=====================================

Some of the following documentations are currerntly out-of-date .

Webapp developed using ZincJS:
------------------------------

[SPARC Portal](https://sparc.science/maps?type=wholebody)

[Fitzlet](https://sites.bioeng.auckland.ac.nz/mwu035/fitzlet/)

[Scaffold Maker](https://mapcore-demo.org/2019/colon/scaffold.html)

[ScaffoldVuer] (https://mapcore-demo.org/current/scaffoldvuer)

Installation:
-------------

You need NPM to build the ZincJS library. Once NPM has been installed, follow the instructions below:

```Shell
$ npm install
$ npm run build-bundle
```

If everything works accordingly, a 'build' folder along with two files zinc.js and zinc.min.js in it should be created. The zinc.js and zinc.min.js can now be consumed in your preferred envirnoment.

Useful links:
-------------

[Examples](https://github.com/alan-wu/ZincJS-Examples/)

[Tutorials](https://github.com/alan-wu/ZincJS-Tutorials/)

[API Documentation](https://abi-software.github.io/ZincJS/)

How to export models to ZincJS:
-------------------------------

Here is a short instruction on how to get simple models from CMGUI/Zinc showing on web brwoser quickly.

For Mapping Tool users:
-----------------------

[Argon scene exporter](https://abi-mapping-tools.readthedocs.io/en/v1.2.1/mapclientplugins.argonsceneexporterstep/docs/index.html)

For PyZinc users:
-----------------

[PyZinc2ZincJS](https://github.com/alan-wu/PyZinc2ZincJS/)

For Cmgui users:
----------------

1. Download the latest cmgui from http://physiomeproject.org/software/opencmiss/cmgui/download/developer

2. Read in your files, set up the graphics and viewing windows.

3. Export the json files using the following command gfx expore threejs, there are few different options regarding the export, make sure you read the instruction using "gfx export threejs ?" command. Please note down the filename_prefix you have chosen here. The number of files output may vary depending on the type of graphics.

4. A file containing information of the viewport is also required. After adjusting the viewport on Cmgui to the desired setting then note down the values of eye point, interest point, upvector, near plane and far plane from the output of the "gfx list win 1" command. For example with the following output:

	farPlane: 601.1211762872496 
	nearPlane: 14.809855917663832
	upVector: [0.0, 1.0, 0.0]
	interest point: [9.704483032226562, 6.385875701904297, -5.001008987426758] 
	eye point: [9.704483032226562, 6.385875701904297, 291.1961093658496]}

The viewport file will look like this: 

	{"farPlane": 601.1211762872496, "nearPlane": 14.809855917663832, "upVector": [0.0, 1.0, 0.0], "targetPosition": [9.704483032226562, 6.385875701904297, -5.001008987426758],  "eyePosition": [9.704483032226562, 6.385875701904297, 291.1961093658496]}

5. The first exported file -[filename]_1.json is the metadata file and contains
informations of other required files including primitives type, url and etc. It also contains information of the viewport file (as mentioned above) but as the parameters are not known to the exporters. Users have to add it to the metadata file themselves and it looks something like:

   {
      "Type" : "View",
      "URL" : "new_models_view.json"
   }

	
Make sure all the json files are located in the same folder and now we should have all files required and we are ready to view them.

*please not that only surfaces are supported at this moment.

For PyZinc users:
----------------

Take a look at the following page: https://github.com/alan-wu/PyZinc2ZincJS

Using the sample page:
----------------------

I have included a simple html page - multiscenes_example.html which will display simple models.
You can also view the following page to see mroe WebGL based Zinc in action: http://sites.bioeng.auckland.ac.nz/webgl_zinc_collections/

Use of ThreeJS:
----------------

This library wraps the ThreeJS library and provides a more Zinc-like experience to users.
I have modified the ThreeJS backend slightly to fit my usage here, you can find the github repository of my ThreeJS fork here: https://github.com/alan-wu/three.js
 
Basic controls:
---------------

* Left click/single finger touch move: Rotate
* Middle click/three finger touch move: Translate
* Right click/two finger pinch: Zoom


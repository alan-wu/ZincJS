ZincJS (Web-based-Zinc-Visualisation)
=====================================

Webapp developed using ZincJS:
------------------------------

[Braveheart Interactive hert](http://sites.bioeng.auckland.ac.nz/medtech/heart/)

[Medtech Lungs](http://sites.bioeng.auckland.ac.nz/silo6/lung/)

How to use:
-----------

Example html and javascript to visualise Zinc to ThreeJS export.

Here is a short instructions on how to get simple models from CMGUI/Zinc showing on web brwoser quickly.

For Cmgui users:
----------------

1. Download the latest cmgui from http://physiomeproject.org/software/opencmiss/cmgui/download/developer

2. Read in your files, set up the graphics and viewing windows.

3. Export the json files using the following command gfx expore threejs, there are few different options regarding the export, make sure you read the instruction using "gfx exporet threejs ?" command. Please note down the filename_prefix you have chosen here. The number of files output is determined by the number of surfaces group you have created.

4. Note down the values of eye point, interest point, upvector, near plane and far plane from the output of the "gfx list win 1" command.

5. Copy the model/newheart_view.json file available here in the repository and rename it to [filename_prefix]_view.json ; Open the file and edit the values inside.

Example: if I have 3 different group of surfaces output under the prefix "new_models" with the following graphics windows
settings:

	farPlane: 601.1211762872496
	nearPlane: 14.809855917663832
	upVector: [0.0, 1.0, 0.0]
	interest point: [9.704483032226562, 6.385875701904297, -5.001008987426758] 
	eye point: [9.704483032226562, 6.385875701904297, 291.1961093658496]}

I will create and edit the new_models_view.json file and its content will be 

	{"farPlane": 601.1211762872496, "nearPlane": 14.809855917663832, "upVector": [0.0, 1.0, 0.0], "numberOfResources": 3, "targetPosition": [9.704483032226562, 6.385875701904297, -5.001008987426758], "timeEnabled": [1, 1, 1], "morphColour" : [0, 0, 0], "eyePosition": [9.704483032226562, 6.385875701904297, 291.1961093658496]}
	
Note that:

	[timeEnabled] values in this case indicates that time varying vertices have been output for all 3 group of surfaces.
	[morphColour] values in this case indicates that time varying spectrum colours have not been output for all 3 group of surfaces.
	[numberOfResources] indicates the number of files output from cmgui.
	
Make sure all the json files are located in the same folder and now we should have all files required and we are ready to view them.

*please not that only surfaces are supported at this moment.

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

Examples:
---------

https://github.com/alan-wu/ZincJS-Examples

Tutorials:
----------

https://github.com/alan-wu/ZincJS-Tutorials

API Documentation:
-------------------

http://alan-wu.github.io/ZincJS/

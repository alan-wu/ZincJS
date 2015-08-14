Web-based-Zinc-Visualisation
============================

Example html and javascript to visualise Zinc to ThreeJS export.

First user is required to output the json files from CMGUI/zinc.

For Cmgui users:
----------------

1. Download the latest cmgui from http://physiomeproject.org/software/opencmiss/cmgui/download/developer

2. Read in your files, set up the graphics and viewing windows.

3. Export the json files using the following command gfx exporet threejs, there are few different options regarding the export, make sure you read the instruction using "gfx exporet threejs ?" command. Please note down the filename_prefix you have chosen here. The number of files output is determined by the number of surfaces group you have created.

4. Note down the values of eye point, interest point, upvector, near plane and far plane from the output of the "gfx list win 1" command.

5. Copy the my_model/newheart_view.json file available here in the repository and rename it to [filename_prefix]_view.json ; Open the file and edit the values inside.

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

I have included a simple html page - zinc_webgl_sample.html which will display simple models.

Append the following "?inputprefix=my_models/newfoot" or "?inputprefix=my_models/newheart" after zinc_webgl_sample.html on the browser to view the foot and heart model respectively.

Alternatively, if you have your own set of models, specify the relative path and prefix of your files in the following format zinc_webgl_sample.html?inputprefix=[relativePath/prefix] .

Basic controls:
---------------

* Left click/single finger touch move: Rotate
* Middle click/three finger touch move: Translater
* Right click/two finger pinch: Zoom


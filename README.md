Web-based-Zinc-Visualisation
============================

Example html and javascript to visualise Zinc to ThreeJS export.

This is an example on displaying threejs json file export from libZinc including basic controls similar to the one used by Zinc.

* Left click/single finger touch move: Rotate
* Middle click/three finger touch move: Translater
* Right click/two finger pinch: Zoom

Somewhere in the script you will find the following settings, alter them as required.

    var duration = 10000;
    var nearPlane = 0.0353321;
    var farPlane = 12.6265;
    var eyePosition = [0.5, -3.03321, 0.5];
    var targetPosition = [[0.5, 0.5, 0.5];
    var upVector = [ 0, 0, 1];
    var timeEnabled = false;
    var jsonFileName = 'my_models/colour_cube_3.json'

Duration affects the length of the animation, nearPlane, farPlane, eyePosition, targetPosition(interest point) and upVector can be copy straight from the numbers from cmgui command windows after entering gfx list win 1, timeEnabled indicate eitehr there are time variations in this model, and jsonFileName is the name of the file export.

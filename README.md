Web-based-Zinc-Visualisation
============================

Example html and javascript to visualise Zinc to ThreeJS export.

This is an example on  displaying threejs json file export from libZinc including basic controls similar to the one used by Zinc.

Left click/single finger touch move: Rotate
Middle click/three finger touch move: Translater
Right click/two finger pinch: Zoom

Somewhere in the script you will find the following settings, alter them as required.
var duration = 10000;
var nearPlane = 2.8173;
var farPlane = 1006.81;
var eyePosition = [-167.205, -152.21, -72.2929];
var targetPosition = [7.48795, 11.4056, 61.8574];
var upVector = [ 0.32263, 0.369883, -0.871261];
var jsonFileName = 'my_models/martyn_model_1.json'

Duration affects the length of the animation, nearPlane, farPlane, eyePosition, targetPosition(interest point) and upVector can be copy straight from the numbers from cmgui command windows after entering gfx list win 1, and jsonFileName is the name of the file export.

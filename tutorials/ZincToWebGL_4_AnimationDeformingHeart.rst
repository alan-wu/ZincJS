From OpenCMISS-PyZinc to WebGL
==============================

.. contents::

Introduction
------------

This tutorial demonstrates how time varying meshes, glyphs and colours
can be exported.

A number of tutorials has been included in this document – To proceed
with the tutorials, you must have PyZinc installed in your system.

Requirements
------------

-  Browser with WebGL support. For more information, please visit:
   http://webglreport.com/ & http://caniuse.com/#feat=webgl .

-  Python 2.7 or Python 3.3

-  Latest version of PyZinc, you can download from the following page:
   http://opencmiss.org/downloads.html#/package/pyzinc/devreleases or
   http://opencmiss.org/documentation/tutorials/getting_started/getting-started.html

-  PyZinc for your version of Python

-  Repository of Web based Visualisation for Opencmiss-Zinc: 
   https://github.com/alan-wu/Web-based-Zinc-Visualisation
   
-  Familiar with the Python script used in Tutorial 1, 2 and 3

Tutorial 4a – Animation Deforming Heart:
----------------------------------------

In this tutorial, the python script reads in a deforming heart model,
compute the principal strains, display them using glyphs and
the geometry of the heart over time, and output them into a format
readable by the  WebGL library.  

This example can be found in the tutorials/examples/animation_deforming_heart
folder in the Web based Visualisation for Opencmiss-Zinc repository. 

To run the example, enter “python animation_deforming_heart.py” in the terminal.

In the script, the fields are read in the readMesh function between build-in
zinc time 0 to 1 (51 time steps in total).

Principal strains for each three direction are calculated in the defineField
function, these strains are displayed using glyphs.

In the createSpectrum function, a spectrum is created and defined for showing 
different colour at different level of strain. The spectrum illustrates positive 
strain in blue and negative strain in red, the colour intensifies as magnitude 
increases. 

The geometries of the heart are drawn with surfaces showing the inner wall and
cylinders showing the boundary of each elements in the createSurfaceGraphics and
createCylindeLineGraphics function respectively.

In the createGlyphGraphics function, three sets of glyphs are created and 
each show a different direction of the principal strains, these glyphs are also 
coloured using the spectrum created earlier showing the magnitude of the strain.

Streamlines are also displayed to show the direction of the deformed fibre axes in
the createStreamlines function.

The exportWebGLJson function is adjusted to allow time dependent geometries and 
colours to be exported. Setting the number of time step, initial time and finish 
time affect the number of frames to be exported between the inital time and finish 
time to be exported. Setting OutputTimeDependentVertices and OutputTimeDependentColours 
to 1 informs the streaminformation to output time varying geometries and colours.

At the end, ten files are exported - one metadata file, one for the surfaces, one for the
cylinders, one for the streamlines and two each for the glyphs showing principal strain on three
different directions.

Tutorial 4b – Deforming heart on WebGL:
---------------------------------------

Once again this is very similar to the html page used in the 
previous three examples. 



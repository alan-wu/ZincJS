From OpenCMISS-PyZinc to WebGL
==============================

.. contents::

Introduction
------------

This tutorial demonstrates how glyphs can be exported and displays.

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
   
-  Familiar with the Python script used in Tutorial 1 and 2

Tutorial 3a – Glyphs:
------------------------------------

In this tutorial, the python script reads in the following:

-  A triangle element containing 3 fields

-  2-D "coordinates" using a linear simplex basis

-  scalar "pressure" using a linear simplex basis

-  2-D "velocity" using a quadratic simplex basis

This example can be found in the tutorials/examples/glyphs folder in the
Web based Visualisation for Opencmiss-Zinc repository. 

To run the example, enter “python glyph_export.py” in the terminal.

In the script, the 2D elements and fields are read in the readMesh 
function, surfaces and glyphs graphics are created in createSurfaceGraphics
and createGlyphGraphics respectively. For more details on how glyph graphics
is created, please take a look in the createGlyphGraphics function.

The exportWebGLJson is very similar to the previous two examples.

At the end, five files are exported - one metadata file, one for the
geometries of the triangle, one describing the transformation of the glyphs and
one for the geometries of the glyphs.

Tutorial 3b – Showing Glyphs on WebGL:
--------------------------------------------

Once again this is very similar to the html page used in the 
previous two examples. 



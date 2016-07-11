From OpenCMISS-PyZinc to WebGL
==============================

.. contents::

Introduction
------------

This document aims to help you to understand how graphics can be exported
from PyZinc into web browser compatible WebGL.

A number of tutorials have been included in this series of tutorials – 
to proceed with the tutorials, you must have PyZinc installed in your system.

Requirements
------------

-  Browser with WebGL support. For more information, please visit:
   http://webglreport.com/ & http://caniuse.com/#feat=webgl .

-  Python 2.7 or Python 3.3.

-  Latest version of PyZinc, you can download from the following page:
   http://opencmiss.org/downloads.html#/package/pyzinc/devreleases or
   http://opencmiss.org/documentation/tutorials/getting_started/getting-started.html

-  PyZinc for your version of Python

-  Repository of Web based Visualisation for Opencmiss-Zinc: 
   https://github.com/alan-wu/Web-based-Zinc-Visualisation

Tutorial 1a – Basic Mesh
-----------------------

In this tutorial, the python script loads a cube model, creates
surface graphics and exports the surface into a format that is readable
by Zinc-WebGL and the ThreeJS library.

This example can be found in the tutorials/examples folder in the
Web based Visualisation for Opencmiss-Zinc repository. 

To run the example, enter “python basic\_mesh.py” in the terminal.

We will focus on the exportWebGLJson function here.

.. code:: python

   def exportWebGLJson(self):
      '''
      Export graphics into JSON format, one json export represents one
      surface graphics.
      '''
      scene = self._default_region.getScene()
      sceneSR = scene.createStreaminformationScene()
      sceneSR.setIOFormat(sceneSR.IO_FORMAT_THREEJS)
      ''' Get the total number of graphics in a scene/region that can be
      exported'''
      number = sceneSR.getNumberOfResourcesRequired()
      resources = []
      '''Write out each graphics into a json file which can be rendered with
      our WebGL script'''
      for i in range(number):
         resources.append(sceneSR.createStreamresourceMemory())
      scene.write(sceneSR)
      '''Write out each resource into their own file'''
      for i in range(number):
         f = None
         if i == 0:
            f = open('html/' + self._prefix + '_' + 'metadata.json', 'w+')
         else:
            f = open('html/' + self._prefix + '_' + str(i) + '.json', 'w+')
         buffer = resources[i].getBuffer()[1]
         if i == 0:
            for j in range(number-1):
               replaceName = '' + self._prefix + '_' + str(j+2) + '.json'
               old_name = 'memory_resource'+ '_' + str(j+2)
               buffer = buffer.replace(old_name, replaceName)
         f.write(buffer)
         f.close()
      ''' the following function exports the camera settings'''
      self.exportViewJson()

The function above exports all currently supported graphics from the
self.\_default\_region.

We will walk through the code above and also take this opportunity to
explain how each PyZinc object works.

**Scene** is the graphical representations of a region which contains
a collection of user defined graphics (points, lines, surfaces, etc) and
currently only surfaces graphics is exported. The scene object is
accessed through self.\_default\_region.getScene() in this example.

**Streaminformation** is an object used for handling file/memory IOs
for the other PyZinc objects. Here we have created
**StreaminformationScene** (scene.createStreaminformationScene()), a
derived Streaminformation class with methods specific to the scene, such
as setIOFormat, which specifies the format to be export. In this example
sceneSR.setIOFormat(sceneSR.IO\_FORMAT\_THREEJS) is called and it tells
the streaminformation to export the graphics in WebGL json format.
sceneSR.getNumberOfResourcesRequired() is also called which returns the
number of graphics to be exported.

**Streamresource** controls an individual item to be exported or
imported. One resource is required for each surface graphics and an
additional metadata resource describing each resource to be exported.
sceneSR.createStreamresourceMemory() is used to create a memory resource
where the graphics to be exported can be stored. The memory buffer
accessed later through the resources[i].getBuffer() method.

Once everything is ready, scene.write(sceneSR) is called which fills
each streamresource with valid json buffer. These buffers will then be
written into local files using python’s standard io module. At the end
of the exportWebGLJson function, exportViewJson is called which exports
the camera settings of the zinc sceneviewer.

If everything works as intended, three files will be created in the html
folder – BasicMesh\_metadata.json, BasicMesh\_1.json and BasicMesh\_view.json.
With these three files, we can now visualise the cube on your favourite
browser. Yay!!!

Tutorial 1b – First html example
-------------------------------

Here we have a very simple html page called basic\_mesh.html. You should
see a cube when opening this page on browsers with WebGL support. This
cube should have the same colour and shape as the one that was exported
in the previous tutorial. (Note: You may encounter a problem seeing the
cube with cross-origin request error. If so please take a look on the
internet and find the solution for your choice of browser.
Alternatively, try a different browser.)

We will take a look inside the HTML <body> tag in the basic\_mesh.htm
file:

.. code:: html

   <body style="height:100%">
      <p id='myText'>Basic Mesh WebGL Demo</p>
      <button name="View All" value="OK" type="button"
      onclick="viewAll()">View All</button>
      <script src="js/three.min.js"></script>
      <script src="js/zinc_threejs_control.js"></script>
      <script src="js/zinc_3js_renderer.js"></script>
      <script>
         container = document.createElement( 'div' );
         document.body.appendChild( container );
         container.style.height = "100%"
         var zincRenderer = new Zinc.Renderer(container, window);
         zincRenderer.initialiseVisualisation();
         var scene = zincRenderer.createScene("BasicMesh");
         scene.loadViewURL("BasicMesh_view.json");
         scene.loadMetadataURL("BasicMesh_metadata.json");
         zincRenderer.setCurrentScene(scene);
         zincRenderer.animate();
         
         function viewAll()
         {
            zincRenderer.viewAll()
         }
      </script>
   </body>

The first two lines define the body block and display the text *Basic
Mesh WebGL Demo* at top of the page.

Line 3 defines a button that, when pressed calls the zincRenderer
viewAll method. This provides similar functionality to the PyZinc
sceneviewer viewAll method.

Line 4-6 specifies Javscript to be loaded and used in our script. Here
we load in three.min.js, zinc\_threejs\_control.js and
zinc\_3js\_renderer.js. These correspond to the three.js, zinc control
and zinc to threejs wbegl interfaces respectively.

**three.js:**

Three.js is used to create animated 3D computer graphics in a browser.
For more information on the threejs library please take a look at the
following link: http://threejs.org/

**Zinc control and zinc renderer:**

The ZincRenderer is an interface to the three.js library and aims to
create a more familiar experience to Zinc and PyZinc users. While
three.js is a very powerful WebGL library, many of the function calls
are too low level for some users. With ZincRenderer library, the amount
of code required is significantly reduced while maintaining the ability
to use more advanced WebGL functions. Zinc\_threejs\_control.js was
written alongside ZincRenderer and it provides an easy way to interact
with 3D models. The control is very much like the one you find on PyZinc
with the addition of support for touch device.

The latest version of the library is available at the following GitHub
repository: https://github.com/alan-wu/Web-based-Zinc-Visualisation .

In lines 8 – 10, a container is defined in the page. The container will
be used by the Zinc renderer to draw the 3D graphics.

In lines 12 and 13, a Zinc Renderer is created in the container and then
intialised. ZincRenderer is the main object of the Zinc WebGL library
and users can access and create a scene from it as shown on line 15.
zincRenderer.createScene("BasicMesh") is used to create a new scene
called “BasicMesh”.

The scene. loadViewURL ("BasicMesh"); on line 16 reads in the
BasicMesh\_view.json file we created earlier and set up the renderer
with correct camera setting.

The scene.loadMetadataURL("BasicMesh\_metadata.json"); on line 17 reads in the
metadata file and read in any other resource associated with it.

Now we set the BasicMesh scene to be the current scene on zincRenderer
in line 18 thus allowing it to be shown when the zincRenderer starts
animating. Lastly, the script calls the zincRenderer animate method
which will start the rendering routine and enable rendering of any 3D
graphics.

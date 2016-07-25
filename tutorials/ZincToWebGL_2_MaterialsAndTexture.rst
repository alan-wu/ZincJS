From OpenCMISS-PyZinc to WebGL
==============================

.. contents::

Introduction
------------

This tutorial follows up from the first tutorial and show how texture
is displayed using our WebGL library.

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
   
-  Familiar with the Python script used in Tutorial 1

Tutorial 2a – Materials And Texture:
------------------------------------

In this tutorial, the python script creates five 2D elements in five
different regions and exports these surfaces with different materials.

This example can be found in the tutorials/examples folder in the
Web based Visualisation for Opencmiss-Zinc repository. 

To run the example, enter “python materials\_and\_texture.py” in the terminal.

In the script, the 2D elements are created in the create2DFiniteElement 
function materials are created in the createMaterial and
createMaterialUsingImageField functions.

This example is similar to the basic\_mesh example but we will take a brief 
look into the exportWebGLJson function here.

.. code:: python

    def exportWebGLJson(self):
        '''
        Export graphics into JSON format, one json export represents one
        surface graphics.
        
        '''
        material_names = ['red', 'green', 'blue', 'myyellow', 'texture']
        for i in range (1, 6):
            region = self._context.getDefaultRegion().findChildByName("region_" + str(i))
            scene = region.getScene()
            sceneSR = scene.createStreaminformationScene()
            sceneSR.setIOFormat(sceneSR.IO_FORMAT_THREEJS)
            ''' Get the total number of graphics in a scene/region that can be exported'''
            number = sceneSR.getNumberOfResourcesRequired()
            resources = []
            '''Write out each graphics into a json file which can be rendered with our WebGL script'''
            for j in range(number):
                resources.append(sceneSR.createStreamresourceMemory())
            scene.write(sceneSR)
            '''Write out each resource into their own file'''
            for k in range(number):
                f = None
                if k == 0:
                    f = open('html/' +  material_names[i-1] + '_' + 'metadata.json', 'w+')
                else:
                    f = open('html/' +  material_names[i-1] + '_' + str(k) + '.json', 'w+')
                buffer = resources[k].getBuffer()[1]
                if k == 0:
                    for j in range(number-1):
                        replaceName = '' + material_names[i-1] + '_' + str(k+1) + '.json'
                        old_name = 'memory_resource'+ '_' + str(k+2)
                        buffer = buffer.replace(old_name, replaceName)
                f.write(buffer)
                f.close()
        self.exportViewJson()

The function above exports the surfaces graphics from five different regions,
all with different materials including one with a texture. 

At the end, 11 files are exported - one metadata file and one graphics file
for each region in the html folder.

If you take a look into the newly exported texture_1.json file in the html
folder, you may notice the material is define slightly differently with the 
additional "mapDiffuse" : "picture.png" entry which tells the WebGL library 
an image is associated with this export, please note that it is very important
to know that the location of the image specified here is relative to your 
html page. For your convenience, picture.png is included in the html folder
already.

Tutorial 2b – Surfaces with texture example:
--------------------------------------------

Once again this is very similar to the html page used in the 
basic\_mesh tutorial. However it reads in five metadata files into
a scene instead, the WebGL library should take care everything else
including reading in the required image. 





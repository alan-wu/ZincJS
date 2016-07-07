#!/usr/bin/python
"""
PyZinc examples

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""

import sys
try:
    from PySide import QtGui
except ImportError:
    from PyQt4 import QtGui
from basic_mesh_ui import Ui_BasicMeshDlg
from sceneviewerwidget import SceneviewerWidget

from opencmiss.zinc.context import Context
from opencmiss.zinc.graphics import Graphics
from opencmiss.zinc.material import Material
import json

class BasicMeshDlg(QtGui.QWidget):
    '''
    This example demonstrates how to read and export a simple mesh
    '''
    
    def __init__(self, parent=None):
        QtGui.QWidget.__init__(self, parent)
        
        # Using composition to include the visual element of the GUI.
        self.ui = Ui_BasicMeshDlg()
        self.ui.setupUi(self)
        
        '''Initialise a sceneviewer for viewing'''
        self._context = Context('basic_mesh')
        self.ui.sceneviewerwidget.setContext(self._context)
        self.setWindowIcon(QtGui.QIcon(":/cmiss_icon.ico"))
        self.resize(620, 440)

        self._default_region = self._context.getDefaultRegion()
        '''This set the prefix for the files to be exported'''
        self._prefix = 'BasicMesh'
        '''Read the file with the following function'''
        self.readMesh()
        '''Create material which is used to colour the to be exported surfaces'''
        self.createMaterial()
        '''Create surface graphics which will be viewed and exported'''
        self.createSurfaceGraphics()
        '''Export graphics into JSON format'''
        self.ui.sceneviewerwidget.graphicsInitialized.connect(self.exportWebGLJson)
        
    def readMesh(self):
        '''
        Create a stream information then call createStreamresourceFile 
        with the files you want to read into PyZinc
        ''' 
        sir = self._default_region.createStreaminformationRegion()
        sir.createStreamresourceFile("models/cube.exnode")
        sir.createStreamresourceFile('models/cube.exelem')
        self._default_region.read(sir)
        
    def exportViewJson(self):
        '''Export sceneviewer parameters to JSON format'''
        sceneviewer = self.ui.sceneviewerwidget._sceneviewer
        farPlane = sceneviewer.getFarClippingPlane()
        nearPlane = sceneviewer.getNearClippingPlane()
        returnValue = sceneviewer.getLookatParameters()
        eyePosition = returnValue[1]
        targetPosition = returnValue[2]
        upVector = returnValue[3]
        viewData = {}
        viewData['farPlane'] = farPlane
        viewData['nearPlane'] = nearPlane
        viewData['eyePosition'] = eyePosition
        viewData['targetPosition'] = targetPosition
        viewData['upVector'] = upVector
        f = open('html/' + self._prefix + '_view' + '.json', 'w+')
        json.dump(viewData, f)
        f.close()
        
    def exportWebGLJson(self):
        '''
        Export graphics into JSON format, one json export represents one
        surface graphics.
        '''
        scene = self._default_region.getScene()
        sceneSR = scene.createStreaminformationScene()
        sceneSR.setIOFormat(sceneSR.IO_FORMAT_THREEJS)
        ''' Get the total number of graphics in a scene/region that can be exported'''
        number = sceneSR.getNumberOfResourcesRequired()
        resources = []
        '''Write out each graphics into a json file which can be rendered with our WebGL script'''
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
                    replaceName = '' + self._prefix + '_' + str(j+1) + '.json'
                    old_name = 'memory_resource'+ '_' + str(j+2)
                    buffer = buffer.replace(old_name, replaceName)
            f.write(buffer)
            f.close()
        ''' the following function exports the camera settings'''
        self.exportViewJson()
        
    # createMaterial start
    def createMaterial(self):
        '''
        Define a yellow material from first principles.  We can create proprietary material
        if the standard material do not meet our needs.  A proprietary material can be defined  
        with any of the following attributes:
          - ATTRIBUTE_ALPHA
          - ATTRIBUTE_AMBIENT
          - ATTRIBUTE_DIFFUSE
          - ATTRIBUTE_EMISSION
          - ATTRIBUTE_SHININESS
          - ATTRIBUTE_SPECULAR
          
        By giving our material a unique name from other materials we can use the material module
        to get a handle to it at a later time.  Further if we set the managed flag the material
        module will manage the lifetime of the material for us.
        '''
        material_module = self._context.getMaterialmodule()
        material = material_module.createMaterial()
        material.setName('myyellow')
        material.setManaged(True)
        material.setAttributeReal3(Material.ATTRIBUTE_AMBIENT, [0.9, 0.9, 0.0])
        material.setAttributeReal3(Material.ATTRIBUTE_DIFFUSE, [0.9, 0.9, 0.0])
        # createMaterial end

    # createSurfaceGraphics start
    def createSurfaceGraphics(self):
        '''
        Create the surface graphics using the finite element field 'coordinates'.
        Here we colour the surfaces with the material 'myyellow'
        '''
        scene = self._default_region.getScene()
        field_module = self._default_region.getFieldmodule()
        material_module = self._context.getMaterialmodule()
        material = material_module.findMaterialByName('myyellow')
        
        # We use the beginChange and endChange to wrap any immediate changes this will
        # streamline the rendering of the scene.
        scene.beginChange()
        surface = scene.createGraphicsSurfaces()
        finite_element_field = field_module.findFieldByName('coordinates')
        surface.setCoordinateField(finite_element_field)
        surface.setMaterial(material)
         # Let the scene render the scene.
        scene.endChange()
        # createSurfaceGraphics end

# main start
def main():
    '''
    The entry point for the application, handle application arguments and initialise the 
    GUI.
    '''
    
    app = QtGui.QApplication(sys.argv)

    w = BasicMeshDlg()
    w.show()

    sys.exit(app.exec_())
# main end

if __name__ == '__main__':
    main()

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
from glyph_export_ui import Ui_GlyphExportDlg
from sceneviewerwidget import SceneviewerWidget

from opencmiss.zinc.context import Context
from opencmiss.zinc.element import Element
from opencmiss.zinc.field import Field
from opencmiss.zinc.glyph import Glyph
from opencmiss.zinc.graphics import Graphics
from opencmiss.zinc.material import Material

import json

class GlyphExportDlg(QtGui.QWidget):
    '''
    This example demonstrates how to read and export a simple mesh
    '''
    
    def __init__(self, parent=None):
        QtGui.QWidget.__init__(self, parent)
        
        # Using composition to include the visual element of the GUI.
        self.ui = Ui_GlyphExportDlg()
        self.ui.setupUi(self)
        
        '''Initialise a sceneviewer for viewing'''
        self._context = Context('glyph_export')
        self.ui.sceneviewerwidget.setContext(self._context)
        self.setWindowIcon(QtGui.QIcon(":/cmiss_icon.ico"))
        self.resize(620, 440)
        self._context.getGlyphmodule().defineStandardGlyphs()

        self._default_region = self._context.getDefaultRegion()
        '''This set the prefix for the files to be exported'''
        self._prefix = 'GlyphExport'
        '''Read the file with the following function'''
        self.readMesh()
        '''Create material which is used to colour the to be exported surfaces'''
        self.createMaterial()
        '''Create surface graphics which will be viewed and exported'''
        self.createSurfaceGraphics()
        '''Create glyph graphics which will be viewed and exported'''
        self.createGlyphGraphics()
        '''Export glyph into JSON format'''
        self.ui.sceneviewerwidget.graphicsInitialized.connect(self.exportWebGLJson)

        
    def readMesh(self):
        '''
        Create a stream information then call createStreamresourceFile 
        with the files you want to read into PyZinc
        ''' 
        sir = self._default_region.createStreaminformationRegion()
        sir.createStreamresourceFile("models/triangle_coordinates_pressure.exnode")
        sir.createStreamresourceFile("models/triangle_coordinates_pressure.exelem")
        sir.createStreamresourceFile("models/triangle_velocity.exnode")
        sir.createStreamresourceFile("models/triangle_velocity.exelem")
        self._default_region.read(sir)
        
    def exportViewJson(self, numberOfResources):
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
            filename = 'html/' + self._prefix + '_' + str(i+1) + '.json'
            f = open(filename, 'w+')
            buffer = resources[i].getBuffer()[1]
            if i == 0:
                for j in range(number-1):
                    replaceName = '' + self._prefix + '_' + str(j+2) + '.json'
                    old_name = 'memory_resource'+ '_' + str(j+2)
                    buffer = buffer.replace(old_name, replaceName)
            f.write(buffer)
            f.close()
        ''' the following function exports the camera settings'''
        self.exportViewJson(number)
        
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

    # createGlyphGraphics start
    def createGlyphGraphics(self):
        '''
        Create the glyph graphics using the finite element field 'coordinates'.
        Here we colour the surfaces with the material 'myyellow'
        '''
        scene = self._default_region.getScene()
        tm = self._context.getTessellationmodule()
        tessellation = tm.createTessellation()
        ''' we set the number of glyphs to be displayed here'''
        tessellation.setMinimumDivisions([8,8,8])
        field_module = self._default_region.getFieldmodule()
        scene.beginChange()
        ''' create point graphics (node/data/element points)'''
        graphics = scene.createGraphicsPoints()
        ''' the following tells it to display points as element point '''
        graphics.setFieldDomainType(Field.DOMAIN_TYPE_MESH_HIGHEST_DIMENSION)
        ''' the following tells it to distribute points evenly across the mesh based on the settings of tessellations '''
        graphics.getGraphicssamplingattributes().setElementPointSamplingMode(Element.POINT_SAMPLING_MODE_CELL_CORNERS)
        graphics.setTessellation(tessellation)
        pointAttr = graphics.getGraphicspointattributes()
        ''' we want to display the veclocity as arrow here '''
        arrowGlyph = self._context.getGlyphmodule().findGlyphByGlyphShapeType(Glyph.SHAPE_TYPE_ARROW_SOLID)
        pointAttr.setGlyph(arrowGlyph)
        ''' set the size of the arrows '''
        pointAttr.setBaseSize([0, 0.02, 0.02])
        ''' Scale factors will scale the size of the glyphs based on the values provided
        from the OrientationScale field '''
        pointAttr.setScaleFactors([0.1, 0.0, 0.0])
        ''' orient and set the size of the glyph based on the field velocity ''' 
        orientation_field = field_module.findFieldByName('velocity')
        pointAttr.setOrientationScaleField(orientation_field)
        finite_element_field = field_module.findFieldByName('coordinates')
        graphics.setCoordinateField(finite_element_field)

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

    w = GlyphExportDlg()
    w.show()

    sys.exit(app.exec_())
# main end

if __name__ == '__main__':
    main()

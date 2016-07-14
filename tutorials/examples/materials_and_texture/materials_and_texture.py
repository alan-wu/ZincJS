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
from materials_and_texture_ui import Ui_MaterialsAndTextureDlg
from sceneviewerwidget import SceneviewerWidget

from opencmiss.zinc.context import Context
from opencmiss.zinc.graphics import Graphics
from opencmiss.zinc.element import Element, Elementbasis
from opencmiss.zinc.material import Material
import json


class MaterialsAndTextureDlg(QtGui.QWidget):
    '''
    Create a subclass of QWidget for our application.  We could also have derived this 
    application from QMainApplication to give us a menu bar among other things, but a
    QWidget is sufficient for our purposes.
    '''
    
    def __init__(self, parent=None):
        '''
        Initiaise the MaterialsAndTextureDlg first calling the QWidget __init__ function.
        '''
        QtGui.QWidget.__init__(self, parent)
        
        # Using composition to include the visual element of the GUI.
        self.ui = Ui_MaterialsAndTextureDlg()
        self.ui.setupUi(self)
        
        self._context = Context('selection')
        self.ui.sceneviewerwidget.setContext(self._context)
        
        self.setWindowIcon(QtGui.QIcon(":/cmiss_icon.ico"))
        self.resize(620, 440)
        self._prefix = "MaterialsAndTexture"
        
        self._regions = []
        
        default_region = self._context.getDefaultRegion()
        for i in range(1, 6):
            region_name = 'region_' + str(i)
            region = default_region.createChild(region_name)
            self._regions.append(region)

        self.createMaterial()
        self.createMaterialUsingImageField()
        self.createFiniteElements()
        self.createSurfaceGraphics()

        ''' the following function exports the camera settings'''
        self.ui.sceneviewerwidget.graphicsInitialized.connect(self.exportWebGLJson)
        
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
        f = open('html/' + 'materials' + '_view' + '.json', 'w+')
        json.dump(viewData, f)
        f.close()
        
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
        
    # createMaterial start
    def createMaterial(self):
        '''
        Define a yellow material from first principles.  We can create proprietary materials
        if the standard materials do not meet our needs.  A proprietary material can be defined  
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
        material_module.defineStandardMaterials()
        # createMaterial end

    # createSurfaceGraphics start
    def createSurfaceGraphics(self):
        '''
        Create the surface graphics using the finite element field 'coordinates'.
        For each region we set a different material to the surface created.  The 'texture'
        material uses the finite elements xi field as a texture coordinate field.
        '''
        material_module = self._context.getMaterialmodule()
        material_names = ['red', 'green', 'blue', 'myyellow', 'texture']
        for i, region in enumerate(self._regions):
            scene = region.getScene()
            field_module = region.getFieldmodule()
            material = material_module.findMaterialByName(material_names[i])
        
            # We use the beginChange and endChange to wrap any immediate changes this will
            # streamline the rendering of the scene.
            scene.beginChange()
            
            surface = scene.createGraphicsSurfaces()
            finite_element_field = field_module.findFieldByName('coordinates')
            surface.setCoordinateField(finite_element_field)
            surface.setMaterial(material)
            if material_names[i] == 'texture':
                xi_field = field_module.findFieldByName('xi')
                surface.setTextureCoordinateField(xi_field)
            
            # Let the scene render the scene.
            scene.endChange()
            # createSurfaceGraphics end
        
    def create2DFiniteElement(self, field_module, finite_element_field, node_coordinates):
        '''
        Create a 2D finite element from the field_module, finite_element_field and node_coordinates.
        '''
        # Find a special node set named 'cmiss_nodes'
        nodeset = field_module.findNodesetByName('nodes')
        node_template = nodeset.createNodetemplate()
        
        # Set the finite element coordinate field for the nodes to use
        node_template.defineField(finite_element_field)
        
        
        field_cache = field_module.createFieldcache()
        
        node_identifiers = []
        # Create four nodes to define a square finite element over
        for node_coordinate in node_coordinates:
            # Node indexes start from 1
            node = nodeset.createNode(-1, node_template)
            node_identifiers.append(node.getIdentifier())
            # Set the node coordinates, first set the field cache to use the current node
            field_cache.setNode(node)
            # Pass in floats as an array
            finite_element_field.assignReal(field_cache, node_coordinate)

        # We want to create a 2D element so we grab the predefined 2D mesh.  Currently there
        # is only one mesh for each dimension 1D, 2D, and 3D the user is not able to name
        # their own mesh.  This is due to change in an upcoming release of PyZinc.
        mesh = field_module.findMeshByDimension(2)
        element_template = mesh.createElementtemplate()
        element_template.setElementShapeType(Element.SHAPE_TYPE_SQUARE)
        element_node_count = 4
        element_template.setNumberOfNodes(element_node_count)
        # Specify the dimension and the interpolation function for the element basis function. 
        linear_basis = field_module.createElementbasis(2, Elementbasis.FUNCTION_TYPE_LINEAR_LAGRANGE)
        # The indexes of the nodes in the node template we want to use
        node_indexes = [1, 2, 3, 4]
        # Define a nodally interpolated element field or field component in the
        # element_template. Only Lagrange, simplex and constant basis function types
        # may be used with this function, i.e. where only a simple node value is
        # mapped. Shape must be set before calling this function.  The -1 for the component number
        # defines all components with identical basis and nodal mappings.
        element_template.defineFieldSimpleNodal(finite_element_field, -1, linear_basis, node_indexes)
                    
        for i, node_identifier in enumerate(node_identifiers):
            node = nodeset.findNodeByIdentifier(node_identifier)
            element_template.setNode(i+1, node)

        mesh.defineElement(-1, element_template)
    
    # createFiniteElements start
    def createFiniteElements(self):
        '''
        Create the finite elements for the graphic surfaces to be created over.  This helper
        method creates a number of regions with a 2D finite element in locations defined by the 
        node_coordinate_set and creating a 'coordinate' field named 'coordinates.
        '''
        node_coordinate_set = [[[0, 0], [1, 0], [0, 1], [1, 1]],
                               [[1.2, 0], [2.2, 0], [1.2, 1], [2.2, 1]],
                               [[0, 1.2], [1, 1.2], [0, 2.2], [1, 2.2]],
                               [[1.2, 1.2], [2.2, 1.2], [1.2, 2.2], [2.2, 2.2]],
                               [[2.4, 0], [4.4, 0], [2.4, 2.2], [4.4, 2.2]]]
        
        for i, region in enumerate(self._regions):
            field_module = region.getFieldmodule()
            field_module.beginChange()
            field_name = 'coordinates'
            # Create a finite element field with 2 components to represent 2 dimensions
            finite_element_field = field_module.createFieldFiniteElement(2)
            # Set the name of the field, we give it label to help us understand it's purpose
            finite_element_field.setName(field_name)
            # Set the is managed flag to true so the field module will manage the field for us
            finite_element_field.setManaged(True)
        
            self.create2DFiniteElement(field_module, finite_element_field, node_coordinate_set[i])
            field_module.endChange()
        # createFiniteElements end



# main start
def main():
    '''
    The entry point for the application, handle application arguments and initialise the 
    GUI.
    '''
    
    app = QtGui.QApplication(sys.argv)

    w = MaterialsAndTextureDlg()
    w.show()

    sys.exit(app.exec_())
# main end

if __name__ == '__main__':
    main()

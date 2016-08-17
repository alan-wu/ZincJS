#!/usr/bin/python
"""
PyZinc examples

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""

import sys
try:
    from PySide import QtCore, QtGui
except ImportError:
    from PyQt4 import QtCore, QtGui
from animation_deforming_heart_ui import Ui_AnimationDeformingHeartDlg
from sceneviewerwidget import SceneviewerWidget

from opencmiss.zinc.context import Context
from opencmiss.zinc.element import Element
from opencmiss.zinc.field import Field
from opencmiss.zinc.fieldmodule import Fieldmodule
from opencmiss.zinc.glyph import Glyph
from opencmiss.zinc.graphics import Graphics
from opencmiss.zinc.material import Material
import json

class AnimationDeformingHeartDlg(QtGui.QWidget):
    '''
    This example demonstrates how to export animated objects from Zinc to
    WebGL
    '''
    
    def __init__(self, parent=None):
        QtGui.QWidget.__init__(self, parent)
        
        # Using composition to include the visual element of the GUI.
        self.ui = Ui_AnimationDeformingHeartDlg()
        self.ui.setupUi(self)
        
        '''Initialise a sceneviewer for viewing'''
        self._context = Context('animation_deforming_heart')
        self._timeKeeper = self._context.getTimekeepermodule().getDefaultTimekeeper()
        self._context.getGlyphmodule().defineStandardGlyphs()
        
        self.ui.sceneviewerwidget.setContext(self._context)
        self.setWindowIcon(QtGui.QIcon(":/cmiss_icon.ico"))
        self.resize(620, 440)
        
        self.ui.playButton.clicked.connect(self.play)
        self.ui.timeSlider.valueChanged.connect(self.timeChanged)
        self.resize(620, 440)
        
        self._timer = QtCore.QTimer(self)
        self._timer.timeout.connect(self.timeIncrement)

        self._default_region = self._context.getDefaultRegion()
        '''This set the prefix for the files to be exported'''
        self._prefix = 'DeformingHeart'
        '''Read the file with the following function'''
        self.readMesh()
        '''Define the field'''
        self.defineField()
        '''Create material which is used to colour the to be exported surfaces'''
        self.createMaterial()
        '''Create spectrum which is used to colour the to be exported surfaces'''
        self.createSpectrum()
        '''Create glyph graphics which will be viewed and exported'''
        self.createGlyphGraphics()
        '''Create surface graphics which will be viewed and exported'''
        self.createSurfaceGraphics()
        '''Create cylinders graphics showing the outlines of each elements'''
        self.createCylindeLineGraphics()
        '''Create streamline graphics showing the deforming axes fibre'''
        self.createStreamlines()
        '''Export graphics into JSON format'''
        self.ui.sceneviewerwidget.graphicsInitialized.connect(self.exportWebGLJson)
        
    def timeChanged(self, value):
        self._timeKeeper.setTime(value/100.0)
        self.ui.sceneviewerwidget.updateGL()
        
    def play(self):
        text = self.ui.playButton.text()
        if text == '&Play':
            self._timer.start(10)
            self.ui.playButton.setText('&Stop')
        else:
            self._timer.stop()
            self.ui.playButton.setText('&Play')
            
    def timeIncrement(self):
        time_increment = 1
        current_value = self.ui.timeSlider.value()
        current_value += time_increment
        if current_value >= self.ui.timeSlider.maximum():
            current_value = self.ui.timeSlider.minimum()
            
        self.ui.timeSlider.setValue(current_value)
        
    def readMesh(self):
        '''
        Create a stream information then call createStreamresourceFile 
        with the files you want to read into PyZinc
        ''' 
        self._default_region.readFile('models/reference_heart.exnode')
        self._default_region.readFile('models/reference_heart.exelem')
        f = open('models/testing_heart.exelem.gz', 'rb')
        mystring = f.read()
        sir = self._default_region.createStreaminformationRegion()

        for i in range(51):
            filename = 'models/heart{:0>4}.exnode'.format(i)
            fr = sir.createStreamresourceFile(filename)
            sir.setResourceAttributeReal(fr, sir.ATTRIBUTE_TIME, i/50.0)
        handle = sir.createStreamresourceMemoryBuffer(mystring)
        sir.setResourceDataCompressionType(handle, sir.DATA_COMPRESSION_TYPE_GZIP)
        self._default_region.read(sir)
        
    def exportViewJson(self):
        '''Export sceneviewer parameters to JSON format'''
        sceneviewer = self.ui.sceneviewerwidget._sceneviewer
        sceneviewer.viewAll()
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
        
    def defineField(self):
        '''Create a series of fields which give us the strain of the deforming heart at the end'''
        field_module = self._default_region.getFieldmodule()
        
        reference_coordinates_field = field_module.findFieldByName("reference_coordinates")
        coordinates_field = field_module.findFieldByName("coordinates")
        
        rectRefField = field_module.createFieldCoordinateTransformation(reference_coordinates_field)
        rectRefField.setCoordinateSystemType(Field.COORDINATE_SYSTEM_TYPE_RECTANGULAR_CARTESIAN)

        rectCoord = field_module.createFieldCoordinateTransformation(coordinates_field)
        rectCoord.setCoordinateSystemType(Field.COORDINATE_SYSTEM_TYPE_RECTANGULAR_CARTESIAN)
        
        F = field_module.createFieldGradient(rectCoord, rectRefField)
        F_Transpose = field_module.createFieldTranspose(3, F)
        identity3 = field_module.createFieldConstant([1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0])
        
        C = field_module.createFieldMatrixMultiply(3, F_Transpose, F)
        E2 = C - identity3
        zenoPointFive = field_module.createFieldConstant(0.5)
        E = zenoPointFive * E2
        
        principal_strains = field_module.createFieldEigenvalues(E)
        principal_strain_vectors  = field_module.createFieldEigenvectors(principal_strains)
        deformed_principal_strain_vectors = field_module.createFieldMatrixMultiply(3, principal_strain_vectors, F_Transpose)
        
        deformed_principal_strain_vectors1 = field_module.createFieldComponent(deformed_principal_strain_vectors, [1, 2, 3])
        deformed_principal_strain_vectors2 = field_module.createFieldComponent(deformed_principal_strain_vectors, [4, 5, 6])
        deformed_principal_strain_vectors3 = field_module.createFieldComponent(deformed_principal_strain_vectors, [7, 8, 9])
        
        norm_def_principal_strain_vector1 = field_module.createFieldNormalise(deformed_principal_strain_vectors1)
        norm_def_principal_strain_vector2 = field_module.createFieldNormalise(deformed_principal_strain_vectors2)
        norm_def_principal_strain_vector3 = field_module.createFieldNormalise(deformed_principal_strain_vectors3)
        
        principal_strain1 = field_module.createFieldComponent(principal_strains, [1])
        principal_strain2 = field_module.createFieldComponent(principal_strains, [2])
        principal_strain3 = field_module.createFieldComponent(principal_strains, [3])
        
        reference_fibres = field_module.findFieldByName("reference_fibres")
        fibre_axes = field_module.createFieldFibreAxes(reference_fibres, rectRefField)
        deformed_fibre_axes = field_module.createFieldMatrixMultiply(3, fibre_axes, F_Transpose)
        
        deformed_fibre = field_module.createFieldComponent(deformed_fibre_axes, [1, 2, 3])
        deformed_sheet = field_module.createFieldComponent(deformed_fibre_axes, [4, 5, 6])
        norm_def_fibre = field_module.createFieldNormalise(deformed_fibre)
        def_fibre_cross = field_module.createFieldCrossProduct(norm_def_fibre, deformed_sheet)
        norm_def_fibre_cross = field_module.createFieldNormalise(def_fibre_cross)
        norm_def_fibre_cross_normal = field_module.createFieldCrossProduct(norm_def_fibre, norm_def_fibre_cross)
        orthonormal_deformed_fibre_axes = field_module.createFieldConcatenate([norm_def_fibre, norm_def_fibre_cross_normal, norm_def_fibre_cross])
        
        self.norm_def_principal_strain_vector1 = norm_def_principal_strain_vector1
        self.norm_def_principal_strain_vector2 = norm_def_principal_strain_vector2
        self.norm_def_principal_strain_vector3 = norm_def_principal_strain_vector3
        self.principal_strain1 = principal_strain1 
        self.principal_strain2 = principal_strain2 
        self.principal_strain3 = principal_strain3
        self.deformed_fibre_axes = deformed_fibre_axes
        self.norm_def_principal_strain_vector1.setManaged(True)
        self.norm_def_principal_strain_vector2.setManaged(True)
        self.norm_def_principal_strain_vector3.setManaged(True)
        self.principal_strain1.setManaged(True)
        self.principal_strain2.setManaged(True)
        self.principal_strain3.setManaged(True)
        self.deformed_fibre_axes.setManaged(True)
        
    def exportWebGLJson(self):
        '''
        Export graphics into JSON format, one json export represents one
        surface graphics.
        '''
        scene = self._default_region.getScene()
        sceneSR = scene.createStreaminformationScene()
        sceneSR.setIOFormat(sceneSR.IO_FORMAT_THREEJS)
        sceneSR.setIODataType(sceneSR.IO_DATA_TYPE_COLOUR)
        '''
        output 51 frames of the deforming heart between time 0 to 1,
        this matches the number of frame we have read in previously
        '''
        sceneSR.setNumberOfTimeSteps(51)
        sceneSR.setInitialTime(0.0)
        sceneSR.setFinishTime(1.0)
        ''' we want the geometries and colours change overtime '''
        sceneSR.setOutputTimeDependentVertices(1)
        sceneSR.setOutputTimeDependentColours(1)
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
              
    def createSpectrum(self):
        spectrum_module = self._context.getSpectrummodule()
        ''' create a spectrum with two components'''
        self.strainSpectrum = spectrum_module.createSpectrum()
        ''' the first spectrum component shows negative strain with red.
        The spectrum transitions from white to red as the magnitude increases.'''
        component1 = self.strainSpectrum.createSpectrumcomponent()
        component1.setColourReverse(True)
        component1.setRangeMaximum(0.0)
        component1.setRangeMinimum(-0.3202)
        component1.setExtendBelow(True)
        component1.setExtendAbove(False)
        component1.setScaleType(component1.SCALE_TYPE_LOG)
        component1.setExaggeration(-10.0)
        component1.setColourMaximum(1.0)
        component1.setColourMinimum(0.0)
        component1.setColourMappingType(component1.COLOUR_MAPPING_TYPE_WHITE_TO_RED)
        ''' the first spectrum component shows positive strain with blue.
        The spectrum transitions from white to blue as the magnitude increases.'''
        component2 = self.strainSpectrum.createSpectrumcomponent()
        component2.setColourReverse(False)
        component2.setRangeMaximum(0.5322)
        component2.setRangeMinimum(0.0)
        component2.setExtendBelow(False)
        component2.setExtendAbove(True)
        component2.setScaleType(component2.SCALE_TYPE_LOG)
        component2.setExaggeration(10.0)
        component2.setColourMaximum(1.0)
        component2.setColourMinimum(0.0)
        component2.setColourMappingType(component1.COLOUR_MAPPING_TYPE_WHITE_TO_BLUE)
        
    # createMaterial start
    def createMaterial(self):
        '''
        Define a bluey and copper material from first principles.  We can create proprietary material
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
        material_module.defineStandardMaterials()
        material = material_module.createMaterial()
        material.setName('copper')
        material.setManaged(True)
        material.setAttributeReal3(Material.ATTRIBUTE_AMBIENT, [1, 0.2, 0])
        material.setAttributeReal3(Material.ATTRIBUTE_DIFFUSE, [0.6, 0.3, 0])
        material.setAttributeReal3(Material.ATTRIBUTE_SPECULAR, [0.7, 0.7, 0.5])
        material.setAttributeReal(Material.ATTRIBUTE_SHININESS, 0.3)
        # createMaterial end
        
    def createCylindeLineGraphics(self):
        '''
        Create cylinders which outline the shapes of the heart
        The circle divisions are reduced which consequently 
        reduces the size of export considerably. 
        '''
        scene = self._default_region.getScene()
        field_module = self._default_region.getFieldmodule()
        material_module = self._context.getMaterialmodule()
        material = material_module.findMaterialByName('copper')
        
        tm = self._context.getTessellationmodule()
        tessellation = tm.createTessellation()
        tessellation.setCircleDivisions(1)
        tessellation.setRefinementFactors([4])
        
        scene.beginChange()
        lines = scene.createGraphicsLines()
        finite_element_field = field_module.findFieldByName('coordinates')
        lines.setCoordinateField(finite_element_field)
        lines.setTessellation(tessellation)
        
        lineAttr = lines.getGraphicslineattributes()
        lineAttr.setShapeType(lineAttr.SHAPE_TYPE_CIRCLE_EXTRUSION)
        lineAttr.setBaseSize([1.0, 1.0])
        lines.setMaterial(material)
         # Let the scene render the scene.
        scene.endChange()

    # createSurfaceGraphics start
    def createSurfaceGraphics(self):
        '''
        Create the surface graphics using the finite element field 'coordinates'.
        We only want to display surfaces where xi3 = 0.
        Here we colour the surfaces with the material 'copper'
        '''
        scene = self._default_region.getScene()
        field_module = self._default_region.getFieldmodule()
        material_module = self._context.getMaterialmodule()
        material = material_module.findMaterialByName('copper')
        
        # We use the beginChange and endChange to wrap any immediate changes this will
        # streamline the rendering of the scene.
        scene.beginChange()
        surface = scene.createGraphicsSurfaces()
        finite_element_field = field_module.findFieldByName('coordinates')
        surface.setCoordinateField(finite_element_field)
        surface.setMaterial(material)
        surface.setExterior(True)
        surface.setElementFaceType(Element.FACE_TYPE_XI3_0)
        
         # Let the scene render the scene.
        scene.endChange()
        # createSurfaceGraphics end
        
    def createGlyphGraphics(self):
        '''
        Create the glyph graphics displaying strains.
        Three sets of glyph are created, one for each direction.
        They are all coloured using the spectrum created earlier.
        '''
        scene = self._default_region.getScene()
        tm = self._context.getTessellationmodule()
        tessellation = tm.createTessellation()
        tessellation.setMinimumDivisions([1,1,1])
        field_module = self._default_region.getFieldmodule()
        finite_element_field = field_module.findFieldByName('coordinates')
        
        # We use the beginChange and endChange to wrap any immediate changes this will
        # streamline the rendering of the scene.
        scene.beginChange()
        graphics = scene.createGraphicsPoints()
        coneGlyph = self._context.getGlyphmodule().findGlyphByGlyphShapeType(Glyph.SHAPE_TYPE_CONE)
        graphics.setFieldDomainType(Field.DOMAIN_TYPE_MESH_HIGHEST_DIMENSION)
        graphics.getGraphicssamplingattributes().setElementPointSamplingMode(Element.POINT_SAMPLING_MODE_CELL_CENTRES)
        graphics.setTessellation(tessellation)
        graphics.setSpectrum(self.strainSpectrum)
        graphics.setCoordinateField(finite_element_field)
        pointAttr = graphics.getGraphicspointattributes()
        pointAttr.setGlyphRepeatMode(Glyph.REPEAT_MODE_MIRROR)
        pointAttr.setGlyph(coneGlyph)
        pointAttr.setBaseSize([0, 1, 1])
        pointAttr.setScaleFactors([20.0, 0.0, 0.0])
        pointAttr.setOrientationScaleField(self.norm_def_principal_strain_vector1)
        pointAttr.setSignedScaleField(self.principal_strain1)
        graphics.setDataField(self.principal_strain1)
        
        graphics2 = scene.createGraphicsPoints()
        graphics2.setFieldDomainType(Field.DOMAIN_TYPE_MESH_HIGHEST_DIMENSION)
        graphics2.getGraphicssamplingattributes().setElementPointSamplingMode(Element.POINT_SAMPLING_MODE_CELL_CENTRES)
        graphics2.setTessellation(tessellation)
        graphics2.setSpectrum(self.strainSpectrum)
        graphics2.setCoordinateField(finite_element_field)
        pointAttr2 = graphics2.getGraphicspointattributes()
        pointAttr2.setGlyphRepeatMode(Glyph.REPEAT_MODE_MIRROR)
        pointAttr2.setGlyph(coneGlyph)
        pointAttr2.setBaseSize([0, 1, 1])
        pointAttr2.setScaleFactors([20.0, 0.0, 0.0])
        pointAttr2.setOrientationScaleField(self.norm_def_principal_strain_vector2)
        pointAttr2.setSignedScaleField(self.principal_strain2)
        graphics2.setDataField(self.principal_strain2)
        
        graphics = scene.createGraphicsPoints()
        coneGlyph = self._context.getGlyphmodule().findGlyphByGlyphShapeType(Glyph.SHAPE_TYPE_CONE)
        graphics.setFieldDomainType(Field.DOMAIN_TYPE_MESH_HIGHEST_DIMENSION)
        graphics.getGraphicssamplingattributes().setElementPointSamplingMode(Element.POINT_SAMPLING_MODE_CELL_CENTRES)
        graphics.setTessellation(tessellation)
        graphics.setSpectrum(self.strainSpectrum)
        graphics.setCoordinateField(finite_element_field)
        pointAttr = graphics.getGraphicspointattributes()
        pointAttr.setGlyphRepeatMode(Glyph.REPEAT_MODE_MIRROR)
        pointAttr.setGlyph(coneGlyph)
        pointAttr.setBaseSize([0, 1, 1])
        pointAttr.setScaleFactors([20, 0.0, 0.0])
        pointAttr.setOrientationScaleField(self.norm_def_principal_strain_vector3)
        pointAttr.setSignedScaleField(self.principal_strain3)
        graphics.setDataField(self.principal_strain3)
        
        # Let the scene render the scene.
        scene.endChange()
        # createSurfaceGraphics end
        
    def createStreamlines(self):
        '''
        create streamlines as ribbon which show the direction of the 
        deformed fibre direction. These ribbons start from the middle
        of the element where the xi coordinate is [0.5, 0.5, 0.5]
        '''
        scene = self._default_region.getScene()
        field_module = self._default_region.getFieldmodule()
        finite_element_field = field_module.findFieldByName('coordinates')
        material_module = self._context.getMaterialmodule()
        material = material_module.findMaterialByName('silver')
        
        scene.beginChange()
        streamlines = scene.createGraphicsStreamlines()
        streamlines.setStreamVectorField(self.deformed_fibre_axes)
        streamlines.setTrackLength(10.0)
        streamlines.setTrackDirection(streamlines.TRACK_DIRECTION_FORWARD)
        streamlines.setRenderLineWidth(1.0)
        streamlines.setMaterial(material)
        #streamlines.setColourDataType(streamlines.COLOUR_DATA_TYPE_INVALID)
        streamlines.setCoordinateField(finite_element_field)
        samplingAttr = streamlines.getGraphicssamplingattributes()
        samplingAttr.setLocation([0.5, 0.5, 0.5])
        lineAttr = streamlines.getGraphicslineattributes()
        lineAttr.setShapeType(lineAttr.SHAPE_TYPE_RIBBON)
        lineAttr.setBaseSize([1.0, 1.0])
        scene.endChange()

# main start
def main():
    '''
    The entry point for the application, handle application arguments and initialise the 
    GUI.
    '''
    
    app = QtGui.QApplication(sys.argv)

    w = AnimationDeformingHeartDlg()
    w.show()

    sys.exit(app.exec_())
# main end

if __name__ == '__main__':
    main()

'''
   Copyright 2015 University of Auckland

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
'''
from PySide import QtCore, QtOpenGL

from opencmiss.zinc.scene import Scene
from opencmiss.zinc.sceneviewer import Sceneviewer, Sceneviewerevent
from opencmiss.zinc.sceneviewerinput import Sceneviewerinput
from opencmiss.zinc.scenecoordinatesystem import \
        SCENECOORDINATESYSTEM_WINDOW_PIXEL_TOP_LEFT, \
        SCENECOORDINATESYSTEM_WORLD
from opencmiss.zinc.status import OK

from opencmiss.neon.ui.zincwidgets.common import ProjectionMode, \
    button_map, modifier_map


# mapping from qt to zinc start
# Create a button map of Qt mouse buttons to Zinc input buttons
class SceneviewerWidget(QtOpenGL.QGLWidget):

    graphicsInitialized = QtCore.Signal()

    # init start
    def __init__(self, parent=None, shared=None):
        '''
        Call the super class init functions, set the  Zinc context and the scene viewer handle to None.
        Initialise other attributes that deal with selection and the rotation of the plane.
        '''
        QtOpenGL.QGLWidget.__init__(self, parent, shared)
        # Create a Zinc context from which all other objects can be derived either directly or indirectly.
        self._graphicsInitialized = False
        self._context = None
        self._sceneviewer = None
        # init end

    def setContext(self, context):
        '''
        Sets the context for this Zinc Scenviewer widget. Prompts creation of a new Zinc
        Sceneviewer, once graphics are initialised.
        '''
        self._context = context
        if self._graphicsInitialized:
            self._createSceneviewer()

    def getContext(self):
        return self._context

    def _createSceneviewer(self):
        # Get the scene viewer module.
        self._sceneviewernotifier = None

        # From the scene viewer module we can create a scene viewer, we set up the
        # scene viewer to have the same OpenGL properties as the QGLWidget.
        sceneviewermodule = self._context.getSceneviewermodule()
        self._sceneviewer = sceneviewermodule.createSceneviewer(Sceneviewer.BUFFERING_MODE_DOUBLE, Sceneviewer.STEREO_MODE_DEFAULT)
        self._sceneviewer.setProjectionMode(Sceneviewer.PROJECTION_MODE_PERSPECTIVE)
        self._sceneviewer.setViewportSize(self.width(), self.height())

        # Get the default scene filter, which filters by visibility flags
        scenefiltermodule = self._context.getScenefiltermodule()
        scenefilter = scenefiltermodule.getDefaultScenefilter()
        self._sceneviewer.setScenefilter(scenefilter)

        region = self._context.getDefaultRegion()
        scene = region.getScene()
        self._sceneviewer.setScene(scene)

        self._sceneviewernotifier = self._sceneviewer.createSceneviewernotifier()
        self._sceneviewernotifier.setCallback(self._zincSceneviewerEvent)

        self._sceneviewer.viewAll()

    def getSceneviewer(self):
        '''
        Get the scene viewer for this ZincWidget.
        '''
        return self._sceneviewer

    # initializeGL start
    def initializeGL(self):
        '''
        The OpenGL context is ready for use. If Zinc Context has been set, create Zinc Sceneviewer, otherwise
        inform client who is required to set Context at a later time.
        '''
        self._graphicsInitialized = True
        if self._context:
            self._createSceneviewer()
        self.graphicsInitialized.emit()

    def sizeHint(self):
        return QtCore.QSize(200, 400)

    def minimumSizeHint(self):
        return QtCore.QSize(20, 30)

    def setProjectionMode(self, mode):
        if mode == ProjectionMode.PARALLEL:
            self._sceneviewer.setProjectionMode(Sceneviewer.PROJECTION_MODE_PARALLEL)
        elif mode == ProjectionMode.PERSPECTIVE:
            self._sceneviewer.setProjectionMode(Sceneviewer.PROJECTION_MODE_PERSPECTIVE)

    def getProjectionMode(self):
        if self._sceneviewer.getProjectionMode() == Sceneviewer.PROJECTION_MODE_PARALLEL:
            return ProjectionMode.PARALLEL
        elif self._sceneviewer.getProjectionMode() == Sceneviewer.PROJECTION_MODE_PERSPECTIVE:
            return ProjectionMode.PERSPECTIVE

    def getViewParameters(self):
        result, eye, lookat, up = self._sceneviewer.getLookatParameters()
        if result == OK:
            angle = self._sceneviewer.getViewAngle()
            return (eye, lookat, up, angle)

        return None

    def setViewParameters(self, eye, lookat, up, angle):
        self._sceneviewer.beginChange()
        self._sceneviewer.setLookatParametersNonSkew(eye, lookat, up)
        self._sceneviewer.setViewAngle(angle)
        self._sceneviewer.endChange()

    def setScenefilter(self, scenefilter):
        self._sceneviewer.setScenefilter(scenefilter)

    def getScenefilter(self):
        result, scenefilter = self._sceneviewer.getScenefilter()
        if result == OK:
            return scenefilter

        return None

    def project(self, x, y, z):
        '''
        Project the given point in global coordinates into window pixel coordinates
        with the origin at the window's top left pixel.
        Note the z pixel coordinate is a depth which is mapped so that -1 is
        on the far clipping plane, and +1 is on the near clipping plane.
        '''
        in_coords = [x, y, z]
        result, out_coords = self._sceneviewer.transformCoordinates(SCENECOORDINATESYSTEM_WORLD, SCENECOORDINATESYSTEM_WINDOW_PIXEL_TOP_LEFT, Scene(), in_coords)
        if result == OK:
            return out_coords  # [out_coords[0] / out_coords[3], out_coords[1] / out_coords[3], out_coords[2] / out_coords[3]]

        return None

    def unproject(self, x, y, z):
        '''
        Unproject the given point in window pixel coordinates where the origin is
        at the window's top left pixel into global coordinates.
        Note the z pixel coordinate is a depth which is mapped so that -1 is
        on the far clipping plane, and +1 is on the near clipping plane.
        '''
        in_coords = [x, y, z]
        result, out_coords = self._sceneviewer.transformCoordinates(SCENECOORDINATESYSTEM_WINDOW_PIXEL_TOP_LEFT, SCENECOORDINATESYSTEM_WORLD, Scene(), in_coords)
        if result == OK:
            return out_coords  # [out_coords[0] / out_coords[3], out_coords[1] / out_coords[3], out_coords[2] / out_coords[3]]

        return None

    def getViewportSize(self):
        result, width, height = self._sceneviewer.getViewportSize()
        if result == OK:
            return (width, height)

        return None

    def setTumbleRate(self, rate):
        self._sceneviewer.setTumbleRate(rate)

    def viewAll(self):
        '''
        Helper method to set the current scene viewer to view everything
        visible in the current scene.
        '''
        self._sceneviewer.viewAll()

    # paintGL start
    def paintGL(self):
        '''
        Render the scene for this scene viewer.  The QGLWidget has already set up the
        correct OpenGL buffer for us so all we need do is render into it.  The scene viewer
        will clear the background so any OpenGL drawing of your own needs to go after this
        API call.
        '''
        self._sceneviewer.renderScene()
        # paintGL end

    def _zincSceneviewerEvent(self, event):
        '''
        Process a scene viewer event.  The updateGL() method is called for a
        repaint required event all other events are ignored.
        '''
        if event.getChangeFlags() & Sceneviewerevent.CHANGE_FLAG_REPAINT_REQUIRED:
            QtCore.QTimer.singleShot(0, self.updateGL)

#  Not applicable at the current point in time.
#     def _zincSelectionEvent(self, event):
#         print(event.getChangeFlags())
#         print('go the selection change')

    # resizeGL start
    def resizeGL(self, width, height):
        '''
        Respond to widget resize events.
        '''
        if self._sceneviewer:
            self._sceneviewer.setViewportSize(width, height)
        # resizeGL end

    def mousePressEvent(self, event):
        '''
        Inform the scene viewer of a mouse press event.
        '''
        scene_input = self._sceneviewer.createSceneviewerinput()
        scene_input.setPosition(event.x(), event.y())
        scene_input.setEventType(Sceneviewerinput.EVENT_TYPE_BUTTON_PRESS)
        scene_input.setButtonType(button_map[event.button()])
        scene_input.setModifierFlags(modifier_map(event.modifiers()))

        self._sceneviewer.processSceneviewerinput(scene_input)

        self._handle_mouse_events = True

    def mouseReleaseEvent(self, event):
        '''
        Inform the scene viewer of a mouse release event.
        '''
        if self._handle_mouse_events:
            scene_input = self._sceneviewer.createSceneviewerinput()
            scene_input.setPosition(event.x(), event.y())
            scene_input.setEventType(Sceneviewerinput.EVENT_TYPE_BUTTON_RELEASE)
            scene_input.setButtonType(button_map[event.button()])

            self._sceneviewer.processSceneviewerinput(scene_input)
        else:
            event.ignore()

    def mouseMoveEvent(self, event):
        '''
        Inform the scene viewer of a mouse move event and update the OpenGL scene to reflect this
        change to the viewport.
        '''
        if self._handle_mouse_events:
            scene_input = self._sceneviewer.createSceneviewerinput()
            scene_input.setPosition(event.x(), event.y())
            scene_input.setEventType(Sceneviewerinput.EVENT_TYPE_MOTION_NOTIFY)
            if event.type() == QtCore.QEvent.Leave:
                scene_input.setPosition(-1, -1)
            self._sceneviewer.processSceneviewerinput(scene_input)
        else:
            event.ignore()

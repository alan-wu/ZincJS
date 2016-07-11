# -*- coding: utf-8 -*-

# Form implementation generated from reading ui file 'materials.ui'
#
# Created: Fri Sep 27 16:23:37 2013
#      by: PyQt4 UI code generator 4.10.3
#
# WARNING! All changes made in this file will be lost!

try:
    from PySide import QtCore, QtGui
except ImportError:
    from PyQt4 import QtCore, QtGui

try:
    _fromUtf8 = QtCore.QString.fromUtf8
except AttributeError:
    def _fromUtf8(s):
        return s

try:
    _encoding = QtGui.QApplication.UnicodeUTF8
    def _translate(context, text, disambig):
        return QtGui.QApplication.translate(context, text, disambig, _encoding)
except AttributeError:
    def _translate(context, text, disambig):
        return QtGui.QApplication.translate(context, text, disambig)

class Ui_MaterialsAndTextureDlg(object):
    def setupUi(self, MaterialsAndTextureDlg):
        MaterialsAndTextureDlg.setObjectName(_fromUtf8("MaterialsAndTextureDlg"))
        MaterialsAndTextureDlg.resize(400, 300)
        icon = QtGui.QIcon()
        icon.addPixmap(QtGui.QPixmap(_fromUtf8(":/cmiss_icon.ico")), QtGui.QIcon.Normal, QtGui.QIcon.Off)
        MaterialsAndTextureDlg.setWindowIcon(icon)
        self.gridLayout = QtGui.QGridLayout(MaterialsAndTextureDlg)
        self.gridLayout.setObjectName(_fromUtf8("gridLayout"))
        self.pushButton = QtGui.QPushButton(MaterialsAndTextureDlg)
        self.pushButton.setObjectName(_fromUtf8("pushButton"))
        self.gridLayout.addWidget(self.pushButton, 1, 1, 1, 1)
        spacerItem = QtGui.QSpacerItem(40, 20, QtGui.QSizePolicy.Expanding, QtGui.QSizePolicy.Minimum)
        self.gridLayout.addItem(spacerItem, 1, 0, 1, 1)
        self.sceneviewerwidget = SceneviewerWidget(MaterialsAndTextureDlg)
        self.sceneviewerwidget.setObjectName(_fromUtf8("_zincWidget"))
        self.gridLayout.addWidget(self.sceneviewerwidget, 0, 0, 1, 2)

        self.retranslateUi(MaterialsAndTextureDlg)
        QtCore.QObject.connect(self.pushButton, QtCore.SIGNAL(_fromUtf8("clicked()")), MaterialsAndTextureDlg.close)
        QtCore.QMetaObject.connectSlotsByName(MaterialsAndTextureDlg)

    def retranslateUi(self, MaterialsAndTextureDlg):
        MaterialsAndTextureDlg.setWindowTitle(_translate("MaterialsAndTextureDlg", "Materials", None))
        self.pushButton.setText(_translate("MaterialsAndTextureDlg", "&Quit", None))

from sceneviewerwidget import SceneviewerWidget
import icons_rc

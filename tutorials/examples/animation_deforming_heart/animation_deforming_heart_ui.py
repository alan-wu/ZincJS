# -*- coding: utf-8 -*-

# Form implementation generated from reading ui file 'deforming_heart.ui'
#
# Created: Mon Sep 30 11:52:34 2013
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

class Ui_AnimationDeformingHeartDlg(object):
    def setupUi(self, AnimationDeformingHeartDlg):
        AnimationDeformingHeartDlg.setObjectName(_fromUtf8("AnimationDeformingHeartDlg"))
        AnimationDeformingHeartDlg.resize(396, 300)
        icon = QtGui.QIcon()
        icon.addPixmap(QtGui.QPixmap(_fromUtf8(":/cmiss_icon.ico")), QtGui.QIcon.Normal, QtGui.QIcon.Off)
        AnimationDeformingHeartDlg.setWindowIcon(icon)
        self.verticalLayout = QtGui.QVBoxLayout(AnimationDeformingHeartDlg)
        self.verticalLayout.setObjectName(_fromUtf8("verticalLayout"))
        self.sceneviewerwidget = SceneviewerWidget(AnimationDeformingHeartDlg)
        sizePolicy = QtGui.QSizePolicy(QtGui.QSizePolicy.Preferred, QtGui.QSizePolicy.Preferred)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(1)
        sizePolicy.setHeightForWidth(self.sceneviewerwidget.sizePolicy().hasHeightForWidth())
        self.sceneviewerwidget.setSizePolicy(sizePolicy)
        self.sceneviewerwidget.setObjectName(_fromUtf8("sceneviewerwidget"))
        self.verticalLayout.addWidget(self.sceneviewerwidget)
        self.horizontalLayout_2 = QtGui.QHBoxLayout()
        self.horizontalLayout_2.setObjectName(_fromUtf8("horizontalLayout_2"))
        self.playButton = QtGui.QPushButton(AnimationDeformingHeartDlg)
        self.playButton.setObjectName(_fromUtf8("playButton"))
        self.horizontalLayout_2.addWidget(self.playButton)
        self.timeSlider = QtGui.QSlider(AnimationDeformingHeartDlg)
        self.timeSlider.setMaximum(100)
        self.timeSlider.setOrientation(QtCore.Qt.Horizontal)
        self.timeSlider.setObjectName(_fromUtf8("timeSlider"))
        self.horizontalLayout_2.addWidget(self.timeSlider)
        self.verticalLayout.addLayout(self.horizontalLayout_2)
        self.horizontalLayout = QtGui.QHBoxLayout()
        self.horizontalLayout.setObjectName(_fromUtf8("horizontalLayout"))
        spacerItem = QtGui.QSpacerItem(40, 20, QtGui.QSizePolicy.Expanding, QtGui.QSizePolicy.Minimum)
        self.horizontalLayout.addItem(spacerItem)
        self.pushButton = QtGui.QPushButton(AnimationDeformingHeartDlg)
        self.pushButton.setObjectName(_fromUtf8("pushButton"))
        self.horizontalLayout.addWidget(self.pushButton)
        self.verticalLayout.addLayout(self.horizontalLayout)

        self.retranslateUi(AnimationDeformingHeartDlg)
        QtCore.QObject.connect(self.pushButton, QtCore.SIGNAL(_fromUtf8("clicked()")), AnimationDeformingHeartDlg.close)
        QtCore.QMetaObject.connectSlotsByName(AnimationDeformingHeartDlg)

    def retranslateUi(self, AnimationDeformingHeartDlg):
        AnimationDeformingHeartDlg.setWindowTitle(_translate("AnimationDeformingHeartDlg", "Deforming Heart", None))
        self.playButton.setText(_translate("AnimationDeformingHeartDlg", "&Play", None))
        self.pushButton.setText(_translate("AnimationDeformingHeartDlg", "&Quit", None))

from sceneviewerwidget import SceneviewerWidget
import icons_rc

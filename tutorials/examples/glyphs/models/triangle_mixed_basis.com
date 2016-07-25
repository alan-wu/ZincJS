# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1/GPL 2.0/LGPL 2.1
#
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
#
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Original Code is CMISS triangle mixed basis example.
#
# The Initial Developer of the Original Code is
# Auckland Uniservices Ltd, Auckland, New Zealand.
# Portions created by the Initial Developer are Copyright (C) 2010
# the Initial Developer. All Rights Reserved.
#
# Alternatively, the contents of this file may be used under the terms of
# either the GNU General Public License Version 2 or later (the "GPL"), or
# the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
# in which case the provisions of the GPL or the LGPL are applicable instead
# of those above. If you wish to allow use of your version of this file only
# under the terms of either the GPL or the LGPL, and not to allow others to
# use your version of this file under the terms of the MPL, indicate your
# decision by deleting the provisions above and replace them with the notice
# and other provisions required by the GPL or the LGPL. If you do not delete
# the provisions above, a recipient may use your version of this file under
# the terms of any one of the MPL, the GPL or the LGPL.
#
# ***** END LICENSE BLOCK *****

{

# Test a mix of finite element basis functions over a triangle
#
# Read a single triangle element containing 3 fields:
# * 2-D "coordinates" using a linear simplex basis
# * scalar "pressure" using a linear simplex basis
# * 2-D "velocity" using a quadratic simplex basis
# To complicate the problem, the linear bases use a scale factor set -
# even though all scale factors are 1, while the velocity uses no
# scale factors, so the default unit scale factor is used.
# It is recommended not to use scale factors for simplex and Lagrangian bases.
gfx read nodes example triangle_coordinates_pressure.exnode;
gfx read elements example triangle_coordinates_pressure.exelem;
gfx read nodes example triangle_velocity.exnode;
gfx read elements example triangle_velocity.exelem;
gfx define faces egroup triangle;
gfx modify g_element triangle general clear circle_discretization 6 default_coordinate coordinates element_discretization "10*10*10" native_discretization none;
gfx modify g_element triangle lines select_on material default selected_material default_selected;
gfx modify g_element triangle element_points glyph arrow_solid general size "0*0.02*0.02" centre 0,0,0 font default orientation velocity scale_factors "0.1*0*0" use_elements cell_corners discretization "8*8*8" native_discretization NONE select_on material default selected_material default_selected;
gfx modify g_element triangle surfaces select_on material default data pressure spectrum default selected_material default_selected render_shaded;
gfx modify spectrum default autorange;

if ($TESTING) {
	# Test writing and reading the whole group
	gfx write elements write_triangle.exelem group triangle;
	gfx read elements write_triangle.exelem;
	# Test writing and reading individual fields in the group
	gfx write elements write_triangle_coordinates.exelem group triangle field coordinates;
	gfx write elements write_triangle_pressure_velocity.exelem group triangle fields pressure & velocity;
	gfx read elements write_triangle_coordinates.exelem;
	gfx read elements write_triangle_pressure_velocity.exelem;
	gfx destroy elements all;
	gfx read elements write_triangle_pressure_velocity.exelem;
	gfx read elements write_triangle_coordinates.exelem;
	# Export the graphics
	gfx export vrml file triangle_mixed_basis.wrl;
} else {
	gfx create window 1;
	gfx modify window 1 view perspective eye_point 0.981395 -1.46621 2.02069 interest_point 0.390842 0.457097 -0.0467995 up_vector -0.236346 0.676846 0.697151 view_angle 37.5028 near_clipping_plane 0.0288485 far_clipping_plane 10.3095 relative_viewport ndc_placement -1 1 2 2 viewport_coordinates 0 0 1 1;
}

}


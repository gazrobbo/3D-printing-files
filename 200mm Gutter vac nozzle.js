////////////////////////////////////////
// EXTENDED CREVICE NOZZLE - v25
// Added: lip around the nozzle end that follows the angled cut,
//        ribs now run up and merge into the lip
////////////////////////////////////////

/* [Lower Connector] */
lowerOuterDiameter = 49;
lowerLength = 30;
lowerWallThickness = 3;

/* [Upper Connector] */
upperOuterDiameter = 51;
upperLength = 30;
upperWallThickness = 4;

/* [Connector Draft] */
connectorDraft = 0.8;

/* [Transition Settings] */
transitionLength = 35;

/* [Nozzle Settings] */
nozzleWallThickness = 3.0;
narrowLength = 40;      // increased from 30 so a 45 degree cut + lip fits in the straight section
topWidth = 200;
topDepth = 25;
edgeRadius = 4.5;
rectRotation = 45;

/* [Ribs] */
enableRibs = true;
ribThickness = 3;
ribHeight = 3;
ribCount = 3;
ribExtensionIntoTransition = 12;
ribTipClearance = 8;    // only used when the lip is disabled
ribEdgeRadius = 1.0;

/* [Angled Top] */
enableAngledTop = true;
topAngle = 45;

/* [Lip] */
enableLip = true;
lipWidth = 4;           // how far the lip sticks out past the nozzle wall (keep >= ribHeight)
lipThickness = 3;       // thickness of the lip, measured square to the cut face

nozzleColor = "#666666";
$fn = 96;

// Calculated
lowerInnerDiameter = lowerOuterDiameter - 2 * lowerWallThickness;
upperInnerDiameter = upperOuterDiameter - 2 * upperWallThickness;
connectorInnerDiameter = min(lowerInnerDiameter, upperInnerDiameter);
totalConnectorLength = lowerLength + upperLength;
lowerDraftOffset = lowerLength * tan(connectorDraft);
upperDraftOffset = upperLength * tan(connectorDraft);

rectStartZ = totalConnectorLength + transitionLength;
totalHeight = rectStartZ + narrowLength;
lipOn = enableLip && enableAngledTop && topAngle > 0;
outerHalfDepth = topDepth/2 + (lipOn ? lipWidth : ribHeight);   // high-edge pivot of the cut

// Angle sanity check: the cut drops (full outer depth) * tan(angle) across the nozzle.
fullDepth = topDepth + 2 * (lipOn ? lipWidth : 0);
maxAngle = atan(narrowLength / fullDepth);
if (enableAngledTop && topAngle > maxAngle)
    echo(str("WARNING: topAngle ", topAngle, " exceeds max ", maxAngle,
             " for this narrowLength/depth - cut will reach the transition. Increase narrowLength or reduce the angle."));
if (lipOn && lipWidth < ribHeight)
    echo("WARNING: lipWidth is smaller than ribHeight - ribs will stick out past the lip.");

module rounded_rect_prism(width, depth, height, radius) {
    if (radius <= 0) {
        translate([-width/2, -depth/2, 0]) cube([width, depth, height]);
    } else {
        effective_radius = min(radius, min(width/2, depth/2));
        hull() {
            translate([ width/2 - effective_radius,  depth/2 - effective_radius, 0]) cylinder(r=effective_radius, h=height);
            translate([-width/2 + effective_radius,  depth/2 - effective_radius, 0]) cylinder(r=effective_radius, h=height);
            translate([ width/2 - effective_radius, -depth/2 + effective_radius, 0]) cylinder(r=effective_radius, h=height);
            translate([-width/2 + effective_radius, -depth/2 + effective_radius, 0]) cylinder(r=effective_radius, h=height);
        }
    }
}

// Moves children into the frame of the cut plane: origin on the plane at the
// high edge, local XY lying in the cut face, local +Z pointing out of the nozzle.
module cut_plane_frame() {
    translate([0, 0, totalHeight])
    rotate([0, 0, rectRotation])
    translate([0, outerHalfDepth, 0])
    rotate([topAngle, 0, 0])
        children();
}

module external_ribs() {
    if (enableRibs && ribCount > 0) {
        rib_start_z = rectStartZ - ribExtensionIntoTransition;
        // With the lip, ribs run past the cut face and get trimmed by it, so they
        // merge into the lip on both the long (high) and short (low) sides.
        rib_length  = lipOn
            ? narrowLength + ribExtensionIntoTransition + 2
            : narrowLength + ribExtensionIntoTransition - ribTipClearance;

        sink = ribEdgeRadius + 0.3;   // how deeply ribs sink into the wall

        for (i = [0 : ribCount-1]) {
            x_pos = (i + 0.5) * (topWidth / ribCount) - topWidth/2;

            translate([0, 0, rib_start_z])
            rotate([0, 0, rectRotation]) {
                translate([x_pos, topDepth/2 + ribHeight/2 - sink, 0])
                    rounded_rect_prism(ribThickness, ribHeight, rib_length, ribEdgeRadius);

                translate([x_pos, -topDepth/2 - ribHeight/2 + sink, 0])
                    rounded_rect_prism(ribThickness, ribHeight, rib_length, ribEdgeRadius);
            }
        }
    }
}

// Lip: a wider rounded rectangle, sliced to a band lying just under the cut face
module end_lip() {
    if (lipOn) {
        intersection() {
            translate([0, 0, rectStartZ - 25])
                rotate([0, 0, rectRotation])
                rounded_rect_prism(topWidth + 2*lipWidth,
                                   topDepth + 2*lipWidth,
                                   narrowLength + 25 + 10,
                                   edgeRadius + lipWidth);
            cut_plane_frame()
                translate([-800, -800, -lipThickness])
                    cube([1600, 1600, lipThickness + 1]);
        }
    }
}

module angled_cut() {
    cut_plane_frame()
        translate([-800, -800, 0])
            cube([1600, 1600, 800]);
}

module crevice_nozzle() {
    color(nozzleColor)
    difference() {
        union() {
            // Lower connector
            cylinder(r1 = lowerOuterDiameter/2 - lowerDraftOffset,
                     r2 = lowerOuterDiameter/2, h = lowerLength);

            // Upper connector
            translate([0, 0, lowerLength])
                cylinder(r1 = upperOuterDiameter/2 - upperDraftOffset,
                         r2 = upperOuterDiameter/2, h = upperLength);

            // Transition
            hull() {
                translate([0, 0, totalConnectorLength - 0.01])
                    cylinder(r = upperOuterDiameter/2, h = 0.01);
                translate([0, 0, rectStartZ])
                    rotate([0, 0, rectRotation])
                    translate([0, 0, -0.01])
                    rounded_rect_prism(topWidth, topDepth, 0.01, edgeRadius);
            }

            // Main rectangular section
            translate([0, 0, rectStartZ])
                rotate([0, 0, rectRotation])
                rounded_rect_prism(topWidth, topDepth, narrowLength, edgeRadius);

            // Ribs (run into the lip)
            external_ribs();

            // Lip following the angled cut
            end_lip();
        }

        // Inner air channel
        union() {
            cylinder(r = connectorInnerDiameter/2, h = totalConnectorLength + 0.2);

            hull() {
                translate([0, 0, totalConnectorLength - 0.01])
                    cylinder(r = connectorInnerDiameter/2, h = 0.01);
                translate([0, 0, rectStartZ])
                    rotate([0, 0, rectRotation])
                    translate([0, 0, -0.01])
                    rounded_rect_prism(
                        topWidth - 2*nozzleWallThickness,
                        topDepth - 2*nozzleWallThickness,
                        0.01,
                        max(0, edgeRadius - nozzleWallThickness)
                    );
            }

            // Inner channel runs well past the top so the lip's interior is always clear
            translate([0, 0, rectStartZ])
                rotate([0, 0, rectRotation])
                rounded_rect_prism(
                    topWidth - 2*nozzleWallThickness,
                    topDepth - 2*nozzleWallThickness,
                    narrowLength + 20,
                    max(0, edgeRadius - nozzleWallThickness)
                );
        }

        // Angled cut (skipped at 0 deg to avoid a coplanar face with the top)
        if (enableAngledTop && topAngle > 0)
            angled_cut();
    }
}

crevice_nozzle();

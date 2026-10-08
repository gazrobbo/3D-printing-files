////////////////////////////////////////
// EXTENDED CREVICE NOZZLE - v23
// Ribs sunk in for smooth blend where they meet the body
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
narrowLength = 30;
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
ribTipClearance = 8;
ribEdgeRadius = 1.0;             // rounding on the ribs

/* [Angled Top] */
enableAngledTop = true;
topAngle = 30;

nozzleColor = "#666666";
$fn = 96;

// Calculated
lowerInnerDiameter = lowerOuterDiameter - 2 * lowerWallThickness;
upperInnerDiameter = upperOuterDiameter - 2 * upperWallThickness;
connectorInnerDiameter = min(lowerInnerDiameter, upperInnerDiameter);
totalConnectorLength = lowerLength + upperLength;
lowerDraftOffset = lowerLength * tan(connectorDraft);
upperDraftOffset = upperLength * tan(connectorDraft);

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

module external_ribs() {
    if (enableRibs && ribCount > 0) {
        rib_start_z = totalConnectorLength + transitionLength - ribExtensionIntoTransition;
        rib_length  = narrowLength + ribExtensionIntoTransition - ribTipClearance;

        // How deeply the ribs sink into the nozzle wall (≈ rib radius)
        sink = ribEdgeRadius + 0.3;

        for (i = [0 : ribCount-1]) {
            x_pos = (i + 0.5) * (topWidth / ribCount) - topWidth/2;

            translate([0, 0, rib_start_z])
            rotate([0, 0, rectRotation]) {
                // +Y side – sunk in for smooth blend
                translate([x_pos, topDepth/2 + ribHeight/2 - sink, 0])
                    rounded_rect_prism(ribThickness, ribHeight, rib_length, ribEdgeRadius);

                // -Y side – sunk in for smooth blend
                translate([x_pos, -topDepth/2 - ribHeight/2 + sink, 0])
                    rounded_rect_prism(ribThickness, ribHeight, rib_length, ribEdgeRadius);
            }
        }
    }
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
                translate([0, 0, totalConnectorLength + transitionLength])
                    rotate([0, 0, rectRotation])
                    translate([0, 0, -0.01])
                    rounded_rect_prism(topWidth, topDepth, 0.01, edgeRadius);
            }

            // Main rectangular section
            translate([0, 0, totalConnectorLength + transitionLength])
                rotate([0, 0, rectRotation])
                rounded_rect_prism(topWidth, topDepth, narrowLength, edgeRadius);

            // Ribs (rounded + sunk in)
            external_ribs();
        }

        // Inner air channel
        union() {
            cylinder(r = connectorInnerDiameter/2, h = totalConnectorLength + 0.2);

            hull() {
                translate([0, 0, totalConnectorLength - 0.01])
                    cylinder(r = connectorInnerDiameter/2, h = 0.01);
                translate([0, 0, totalConnectorLength + transitionLength])
                    rotate([0, 0, rectRotation])
                    translate([0, 0, -0.01])
                    rounded_rect_prism(
                        topWidth - 2*nozzleWallThickness,
                        topDepth - 2*nozzleWallThickness,
                        0.01,
                        max(0, edgeRadius - nozzleWallThickness)
                    );
            }

            translate([0, 0, totalConnectorLength + transitionLength])
                rotate([0, 0, rectRotation])
                rounded_rect_prism(
                    topWidth - 2*nozzleWallThickness,
                    topDepth - 2*nozzleWallThickness,
                    narrowLength + 0.2,
                    max(0, edgeRadius - nozzleWallThickness)
                );
        }

        // Angled cut
        if (enableAngledTop) {
            totalHeight = totalConnectorLength + transitionLength + narrowLength;
            translate([0, 0, totalHeight])
            rotate([0, 0, 45])
            rotate([topAngle, 0, 0])
                translate([-800, -800, -6])
                    cube([1600, 1600, 800]);
        }
    }
}

crevice_nozzle();
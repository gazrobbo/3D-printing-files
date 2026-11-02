/* [Clamp Collar] */
inner_diameter = 51;        // [10:0.5:120]
wall_thickness = 4;         // [2:0.5:12]
collar_height  = 22;        // [8:0.5:60]

/* [Clamping Flanges - M5] */
flange_length    = 15;      // [8:0.5:30]  ring thickness is added on top of this
flange_width     = 17;      // [10:0.5:30] raised automatically if too thin for the nut pocket
clamp_screw_d    = 5.5;     // [2.5:0.1:8]  M5 clearance hole
nut_trap         = true;    // [true,false]
nut_side         = -1;      // [-1:Bottom (-Y GoPro side), 1:Top (+Y text side)]  face the nut pocket is on
nut_size         = 8.4;     // [5:0.1:14]  pocket flat-to-flat (M5 nut is 8 mm)
nut_depth        = 4.8;     // [1.5:0.1:8] thickness of a plain M5 nut - measure yours
nut_backing      = 2.0;     // [1:0.5:4]   minimum material between slit and nut pocket
corner_radius    = 2.5;     // [1:0.5:5]

/* [Split] */
split_gap = 2.0;            // [0.5:0.5:4]

/* [Edge softening] */
ring_edge_radius    = 1.0;  // [0:0.5:2]  rounds ring, pad and fillet edges
flange_edge_radius  = 1.0;  // [0:0.5:2]  keep equal to ring_edge_radius for a seamless blend
fillet_radius       = 3.0;  // [0:0.5:8]  blends flanges into the ring (auto-limited to clear the bolt head)
gopro_fillet_radius = 3.0;  // [0:0.5:8]  blends GoPro pad into the ring (0 = off)

/* [Embossed Text] */
text_enable  = true;        // [true,false]
text_size    = 8;           // [4:0.5:14]  height of the digits in mm
text_height  = 0.8;         // [0.4:0.1:2] how far the text stands proud of the ring
text_pitch   = 7;           // [4:0.1:14]  digit-to-digit spacing, increase if letters touch
text_font    = "Roboto:style=Bold";

/* [GoPro Mount] */
gopro_enable     = true;    // [true,false]
gopro_base_h     = 3.5;
gopro_leg_h      = 15;
gopro_base_w     = 22;
gopro_nut_size   = 8.2;     // flat-to-flat of the hex nut
gopro_nut_depth  = 3.5;     // how deep the nut sits

/* [Quality] */
$fn = 96;

outer_d = inner_diameter + 2 * wall_thickness;
outer_r = outer_d / 2;
nut_af  = nut_size * 2 / sqrt(3);
gopro_nut_af = gopro_nut_size * 2 / sqrt(3);

// Screw / nut hole position (distance from the ring centre)
hole_x = outer_r + flange_length/2 - 1;

// Real flange length: flange_length plus the ring thickness,
// centred on the screw hole
flange_len = flange_length + wall_thickness;

// Real flange width: never thinner than the nut pocket needs
// (half slit + backing material + pocket depth)
flange_w = max(flange_width, 2 * (split_gap/2 + nut_backing + nut_depth + 0.2));

// Text shown on the ring, e.g. "51mm"
label = str(inner_diameter, "mm");

// Relative width of each character (1 = a digit), used for even spacing
function cw(c) = c == "m" ? 1.5 : c == "." ? 0.45 : 1;
// Distance (in digit pitches) from the first character's centre to character i's centre
function cum(i) = i <= 0 ? 0 : cum(i - 1) + (cw(label[i - 1]) + cw(label[i])) / 2;

// GoPro pad: 5 mm thick, centred 0.5 mm inside the ring surface,
// so its outer face sits 2 mm beyond the ring
pad_end = outer_r + 2;

// Flange fillets must end before the flat side face runs out AND before
// the bolt head / washer / nut pocket (10 mm minimum clearance diameter)
flange_flat_end = min(hole_x + flange_len/2 - corner_radius,
                      hole_x - max(nut_af, 10)/2 - 0.5);

// ==================================================
difference() {
    union() {
        // Main ring, all four circular edges rounded
        rounded_ring(outer_d, inner_diameter, collar_height, ring_edge_radius);

        // Left flange (centred on the screw hole)
        translate([-hole_x, 0, collar_height/2])
            rounded_flange();

        // Right flange (centred on the screw hole)
        translate([ hole_x, 0, collar_height/2])
            rounded_flange();

        // Fillets where the flanges meet the ring
        if (fillet_radius > 0)
            for (mx = [0, 1]) mirror([mx, 0, 0])
                fillet_pair(flange_w/2, fillet_radius, flange_flat_end, ring_edge_radius);

        // Embossed diameter text on the +Y side
        if (text_enable) ring_text();

        // ===== 3-tab GoPro =====
        if (gopro_enable) {
            // Pad sunk into the ring, with rounded edges
            rounded_pad();

            // Fillets where the pad meets the ring (pad points towards -Y)
            if (gopro_fillet_radius > 0)
                rotate([0, 0, -90])
                    fillet_pair(gopro_base_w/2, gopro_fillet_radius, pad_end, ring_edge_radius);

            // Mount
            translate([0, -outer_r - 0.5, collar_height/2])
                rotate([90, 90, 0])
                    gopro_female();
        }
    }

    // Inner hole, with flared ends so the bore edges stay rounded
    flared_cyl(inner_diameter/2, collar_height, ring_edge_radius);

    // Full diametral slit
    translate([0, 0, collar_height/2])
        cube([outer_d + flange_len*2 + 20, split_gap, collar_height + 2], center = true);

    // Screw holes + nut traps
    for (x = [-1, 1]) {
        translate([x * hole_x, 0, collar_height/2]) {
            rotate([90, 0, 0])
                cylinder(d = clamp_screw_d, h = flange_w + 4, center = true);
            if (nut_trap) {
                translate([0, nut_side * (flange_w/2 - nut_depth/2), 0])
                    rotate([90, 0, 0])
                        cylinder(d = nut_af, h = nut_depth + 0.4, $fn = 6, center = true);
            }
        }
    }
}

// ==================================================
// Embossed text wrapped around the outside of the ring, centred on +Y,
// reading left to right when viewed from outside.
// Each character is placed separately so the text follows the curve,
// and spacing follows each character's width so any font looks even.
module ring_text() {
    n     = len(label);
    total = cum(n - 1);
    for (i = [0 : n - 1])
        rotate([0, 0, (cum(i) - total / 2) * text_pitch / outer_r * 180 / PI])
            translate([0, outer_r - 1, collar_height/2 - text_size/2])
                rotate([90, 0, 180])
                    linear_extrude(height = 1 + text_height)
                        text(label[i], size = text_size, font = text_font,
                             halign = "center", valign = "baseline");
}

// ==================================================
// Ring made by spinning a rounded rectangle profile
module rounded_ring(od, id, h, e) {
    rotate_extrude()
        if (e > 0)
            offset(r = e) offset(delta = -e)
                translate([id/2, 0]) square([(od - id)/2, h]);
        else
            translate([id/2, 0]) square([(od - id)/2, h]);
}

// Vertical post with rounded top and bottom edges, centred on z = 0
module rounded_post(r, h, e) {
    translate([0, 0, -h/2])
        rotate_extrude()
            hull() {
                square([r - e, h]);
                translate([r - e, e])     circle(e);
                translate([r - e, h - e]) circle(e);
            }
}

// Flange with rounded vertical corners AND rounded top/bottom edges
module rounded_flange() {
    e = min(flange_edge_radius, corner_radius / 2);
    hull() {
        for (x = [-1, 1])
            for (y = [-1, 1])
                translate([x*(flange_len/2 - corner_radius),
                           y*(flange_w/2 - corner_radius), 0])
                    if (e > 0)
                        rounded_post(corner_radius, collar_height, e);
                    else
                        cylinder(r = corner_radius, h = collar_height, center = true);
    }
}

// GoPro pad with its top and bottom side edges rounded
module rounded_pad() {
    e = ring_edge_radius;
    translate([0, -outer_r + 0.5, collar_height/2])
        rotate([90, 0, 0])
            linear_extrude(height = 5, center = true)
                if (e > 0)
                    offset(r = e) offset(delta = -e)
                        square([gopro_base_w, collar_height], center = true);
                else
                    square([gopro_base_w, collar_height], center = true);
}

// ==================================================
// Quarter-circle flare used to round the ends of cutters
function flare(e, z) = e - sqrt(max(0, e*e - pow(e - z, 2)));

// Vertical cylinder of radius R whose ends flare out by e
// along a quarter circle (spans z = -1 .. h+1)
module flared_cyl(R, h, e, n = 12) {
    if (e > 0)
        rotate_extrude()
            polygon(concat(
                [[0, -1], [R + e, -1]],
                [for (i = [0:n]) let(z = e*i/n)         [R + flare(e, z),     z]],
                [for (i = [0:n]) let(z = h - e + e*i/n) [R + flare(e, h - z), z]],
                [[R + e, h + 1], [0, h + 1]]
            ));
    else
        translate([0, 0, -1]) cylinder(r = R, h = h + 2);
}

// ==================================================
// Concave fillets for a feature sticking out of the ring along +X.
//   hw  = half width of the feature
//   R   = requested fillet radius
//   len = distance from the ring centre to where the fillet must end
//   e   = edge radius of the ring (fillet top/bottom edges follow it)
// Makes both corners (at +Y and -Y). Rotate or mirror it to place it elsewhere.
module fillet_pair(hw, R, len, e) {
    // Largest radius whose fillet still ends before 'len'
    Rmax = (len*len + hw*hw - outer_r*outer_r) / (2 * (outer_r - hw));
    Re   = min(R, Rmax);
    cx   = sqrt(pow(outer_r + Re, 2) - pow(hw + Re, 2));   // fillet circle centre x
    cy   = hw + Re;                                         // fillet circle centre y
    if (Re > 0)
        for (my = [0, 1]) mirror([0, my, 0])
            difference() {
                linear_extrude(height = collar_height)
                    polygon([[0, 0], [cx, hw], [cx, cy]]);
                translate([cx, cy, 0])
                    flared_cyl(Re, collar_height, e);
            }
}

// ==================================================
// 3-tab GoPro female with hollow hex nut pocket
module gopro_female() {
    leg   = 3.0;
    gap   = 3.4;
    hole  = 5.5;
    tip   = 15;
    depth = 3*leg + 2*gap;

    difference() {
        union() {
            // Base
            translate([-gopro_base_w/2, -depth/2, 0])
                cube([gopro_base_w, depth, gopro_base_h]);

            // Three tabs
            for (i = [0:2]) {
                y = -depth/2 + leg/2 + i*(leg + gap);
                translate([0, y, gopro_base_h])
                    rotate([90, 0, 0])
                        linear_extrude(height = leg, center = true)
                            difference() {
                                hull() {
                                    square([gopro_base_w, 0.1], center = true);
                                    translate([0, gopro_leg_h - tip/2])
                                        circle(d = tip, $fn = 48);
                                }
                                translate([0, gopro_leg_h - tip/2])
                                    circle(d = hole, $fn = 32);
                            }
            }

            // Round boss that surrounds the nut pocket (solid, added)
            translate([0, depth/2 - leg/2, gopro_base_h + gopro_leg_h - tip/2])
                rotate([90, 0, 0])
                    translate([0, 0, -gopro_nut_depth/2])
                        cylinder(d = tip, h = gopro_nut_depth, center = true, $fn = 64);
        }

        // ===== Everything below is SUBTRACTED =====
        translate([0, depth/2 - leg/2, gopro_base_h + gopro_leg_h - tip/2])
            rotate([90, 0, 0]) {
                // Hollow hex cavity for the nut
                translate([0, 0, -gopro_nut_depth - 0.1])
                    cylinder(d = gopro_nut_af, h = gopro_nut_depth + 0.2, $fn = 6);

                // Screw clearance through the boss and outer tab
                translate([0, 0, -10])
                    cylinder(d = hole + 0.6, h = 10.5, $fn = 32);
            }
    }
}
"""Render the projector for the Meeting Room mini-game, in four states, plus the two plugs.

    blender -b --python art/blender/projector_ui.py

Writes public/ui/projector_{none,vga,pwr,both}.png, public/ui/plug_{vga,pwr}.png and
src/ui/projectorLayout.ts (where each port sits in the picture, as fractions of its size), so
the click and drop targets in src/ui/projector.ts land exactly on the ports.
"""

import math
import os
import sys

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit  # noqa: E402
from kit import ball, box, cyl, mat  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "public", "ui")
LAYOUT = os.path.join(ROOT, "src", "ui", "projectorLayout.ts")
W, H = 720, 450

# The side panel faces +X. Port centres on that face (y along the side, z up).
SIDE_X = 0.47
PORTS = {
    "vga": (-0.09, 0.165),
    "hdmi": (0.07, 0.17),
    "pwr": (0.2, 0.16),
}


def projector():
    shell = mat("#e4e4e0", rough=0.45)
    dark = mat("#2a2d33", rough=0.6)
    parts = []
    parts.append(box("Body", (0.92, 0.72, 0.27), loc=(0, 0, 0.035), material=shell, bevel=0.05))
    parts.append(box("TopPanel", (0.5, 0.4, 0.012), loc=(0.14, 0.05, 0.305), material=mat("#d4d4cf", rough=0.5), bevel=0.01))
    for i, (x, y) in enumerate(((0.36, 0.26), (-0.36, 0.26), (0.36, -0.26), (-0.36, -0.26))):
        parts.append(cyl(f"Foot{i}", 0.035, 0.04, loc=(x, y, 0), material=dark, verts=10))
    # Lens on the front left, with a ring and a hint of glass.
    parts.append(cyl("LensRing", 0.125, 0.07, loc=(-0.22, -0.36, 0.17), material=dark, verts=28, rot=(math.pi / 2, 0, 0)))
    parts.append(cyl("LensBarrel", 0.1, 0.05, loc=(-0.22, -0.42, 0.17), material=mat("#3b3f46", rough=0.3, metal=0.4), verts=28, rot=(math.pi / 2, 0, 0)))
    parts.append(cyl("Glass", 0.082, 0.012, loc=(-0.22, -0.465, 0.17), material=mat("#7fb6e3", rough=0.05, emit=0.6), verts=28, rot=(math.pi / 2, 0, 0)))
    parts.append(cyl("Shine", 0.025, 0.004, loc=(-0.25, -0.478, 0.2), material=mat("#ffffff", emit=1.5), verts=12, rot=(math.pi / 2, 0, 0)))
    # Front grille on the right.
    for i in range(8):
        parts.append(box(f"Vent{i}", (0.3, 0.012, 0.012), loc=(0.2, -0.362, 0.08 + i * 0.024), material=dark))
    # Focus and zoom rings on top, and the power button with its light.
    parts.append(box("Focus", (0.04, 0.12, 0.03), loc=(-0.3, -0.18, 0.29), material=dark, bevel=0.008))
    parts.append(box("Zoom", (0.04, 0.12, 0.03), loc=(-0.22, -0.18, 0.29), material=dark, bevel=0.008))
    parts.append(cyl("PowerBtn", 0.025, 0.015, loc=(0.3, -0.2, 0.3), material=dark, verts=14))
    parts.append(ball("PowerLed", 0.012, loc=(0.36, -0.2, 0.31), material=mat("#e5a04b", emit=3.0), subdiv=1))
    # Side panel with the ports.
    parts.append(box("IoPlate", (0.012, 0.5, 0.17), loc=(SIDE_X - 0.004, 0.05, 0.085), material=mat("#cfcfca", rough=0.5)))
    vy, vz = PORTS["vga"]
    parts.append(box("VgaShell", (0.02, 0.15, 0.055), loc=(SIDE_X + 0.006, vy, vz - 0.0275), material=mat("#a7adb5", metal=0.6, rough=0.3), taper=1.0))
    parts.append(box("VgaPort", (0.022, 0.125, 0.04), loc=(SIDE_X + 0.008, vy, vz - 0.02), material=mat("#3e7cc9", rough=0.4), taper=0.85))
    for r, n in enumerate((5, 5, 5)):
        for i in range(n):
            parts.append(cyl(f"VgaPin{r}{i}", 0.004, 0.006, loc=(SIDE_X + 0.03, vy - 0.04 + i * 0.02 + r * 0.004, vz + 0.012 - r * 0.012), material=mat("#1b1b1b"), verts=6, rot=(0, math.pi / 2, 0)))
    for i, dy in enumerate((-0.095, 0.095)):
        parts.append(cyl(f"VgaScrew{i}", 0.011, 0.02, loc=(SIDE_X + 0.006, vy + dy, vz), material=mat("#c9c9c9", metal=0.8, rough=0.3), verts=6, rot=(0, math.pi / 2, 0)))
    hy, hz = PORTS["hdmi"]
    parts.append(box("Hdmi", (0.02, 0.07, 0.025), loc=(SIDE_X + 0.006, hy, hz - 0.0125), material=dark, taper=0.9))
    py, pz = PORTS["pwr"]
    parts.append(box("PwrSocket", (0.024, 0.085, 0.07), loc=(SIDE_X + 0.006, py, pz - 0.035), material=dark, bevel=0.006))
    for i, dy in enumerate((-0.022, 0.0, 0.022)):
        parts.append(box(f"PwrPin{i}", (0.01, 0.008, 0.02), loc=(SIDE_X + 0.03, py + dy, pz - 0.01 + (0.012 if i == 1 else 0)), material=mat("#c9c9c9", metal=0.8, rough=0.3)))
    return parts


def cable(name, pts, radius, material):
    cd = bpy.data.curves.new(name, "CURVE")
    cd.dimensions = "3D"
    cd.bevel_depth = radius
    cd.bevel_resolution = 4
    sp = cd.splines.new("BEZIER")
    sp.bezier_points.add(len(pts) - 1)
    for bp, p in zip(sp.bezier_points, pts):
        bp.co = Vector(p)
        bp.handle_left_type = "AUTO"
        bp.handle_right_type = "AUTO"
    ob = bpy.data.objects.new(name, cd)
    ob.data.materials.append(material)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def vga_plug(x, y, z, with_cable=True):
    blue = mat("#3e7cc9", rough=0.4)
    parts = [
        box("VgaHead", (0.07, 0.17, 0.065), loc=(x + 0.035, y, z - 0.0325), material=blue, bevel=0.008),
        box("VgaMetal", (0.02, 0.13, 0.042), loc=(x + 0.005, y, z - 0.021), material=mat("#a7adb5", metal=0.7, rough=0.3)),
    ]
    for i, dy in enumerate((-0.07, 0.07)):
        parts.append(cyl(f"Thumb{i}", 0.018, 0.035, loc=(x + 0.07, y + dy, z), material=mat("#2f6db3", rough=0.4), verts=12, rot=(0, math.pi / 2, 0)))
    parts.append(cyl("VgaBoot", 0.026, 0.07, loc=(x + 0.07, y, z), material=mat("#1f2226", rough=0.6), verts=14, rot=(0, math.pi / 2, 0)))
    if with_cable:
        cable("VgaCable", [(x + 0.13, y, z), (x + 0.3, y - 0.02, z - 0.02), (x + 0.42, y - 0.08, z - 0.3), (x + 0.45, y - 0.1, z - 0.9)], 0.017, mat("#1f2226", rough=0.6))
    return parts


def pwr_plug(x, y, z, with_cable=True):
    dark = mat("#1f2226", rough=0.6)
    parts = [
        box("PwrHead", (0.075, 0.095, 0.075), loc=(x + 0.0375, y, z - 0.0375), material=dark, bevel=0.01),
        box("PwrGrip", (0.05, 0.1, 0.06), loc=(x + 0.09, y, z - 0.03), material=mat("#2a2d33", rough=0.7), taper=0.8),
    ]
    if with_cable:
        cable("PwrCable", [(x + 0.11, y, z), (x + 0.28, y + 0.03, z - 0.03), (x + 0.38, y + 0.08, z - 0.32), (x + 0.4, y + 0.1, z - 0.9)], 0.014, dark)
    return parts


def setup_scene(target_lo, target_hi, w, h, direction, margin=1.12):
    scene = bpy.context.scene
    cam_data = bpy.data.cameras.new("Cam")
    cam_data.type = "ORTHO"
    cam = bpy.data.objects.new("Cam", cam_data)
    scene.collection.objects.link(cam)
    center = (target_lo + target_hi) / 2
    cam.location = center + direction * 20
    cam.rotation_euler = (-direction).to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    bpy.context.view_layer.update()
    inv = cam.matrix_world.inverted()
    corners = [Vector((x, y, z)) for x in (target_lo.x, target_hi.x) for y in (target_lo.y, target_hi.y) for z in (target_lo.z, target_hi.z)]
    cs = [inv @ c for c in corners]
    cw = max(c.x for c in cs) - min(c.x for c in cs)
    ch = max(c.y for c in cs) - min(c.y for c in cs)
    aspect = w / h
    cam_data.ortho_scale = max(cw, ch * aspect) * margin
    cx = (max(c.x for c in cs) + min(c.x for c in cs)) / 2
    cy = (max(c.y for c in cs) + min(c.y for c in cs)) / 2
    cam.location = cam.matrix_world @ Vector((cx, cy, 0))
    bpy.context.view_layer.update()

    sun_data = bpy.data.lights.new("Sun", "SUN")
    sun_data.energy = 3.2
    sun = bpy.data.objects.new("Sun", sun_data)
    sun.rotation_euler = (math.radians(40), math.radians(10), math.radians(60))
    scene.collection.objects.link(sun)
    world = bpy.data.worlds.new("World")
    scene.world = world
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs["Color"].default_value = kit.hex_rgb("#d4dbe5")
    bg.inputs["Strength"].default_value = 1.0
    engines = [i.identifier for i in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
    for e in [x for x in engines if "EEVEE" in x]:
        try:
            scene.render.engine = e
            break
        except TypeError:
            continue
    scene.render.resolution_x = w
    scene.render.resolution_y = h
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    vt = [i.identifier for i in bpy.types.ColorManagedViewSettings.bl_rna.properties["view_transform"].enum_items]
    if "Standard" in vt:
        scene.view_settings.view_transform = "Standard"
    return scene, cam


def render(scene, path):
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("RENDERED", path)


# Front right, a little above: the lens and the side panel both in view.
VIEW = Vector((1.0, -0.55, 0.62)).normalized()
LO = Vector((-0.5, -0.5, 0.0))
HI = Vector((0.62, 0.38, 0.32))


def projector_state(name, vga, pwr):
    kit.reset()
    projector()
    vy, vz = PORTS["vga"]
    py, pz = PORTS["pwr"]
    if vga:
        vga_plug(SIDE_X + 0.012, vy, vz)
    if pwr:
        pwr_plug(SIDE_X + 0.012, py, pz)
    scene, cam = setup_scene(LO, HI, W, H, VIEW)
    render(scene, os.path.join(OUT, f"projector_{name}.png"))
    return scene, cam


def port_box(scene, cam, y, z, hw, hh):
    """Where a port face sits in the picture: centre and size as fractions, top-left origin."""
    pts = [world_to_camera_view(scene, cam, Vector((SIDE_X + 0.02, y + dy, z + dz))) for dy in (-hw, hw) for dz in (-hh, hh)]
    xs = [p.x for p in pts]
    ys = [1 - p.y for p in pts]
    return {"x": (min(xs) + max(xs)) / 2, "y": (min(ys) + max(ys)) / 2, "w": max(xs) - min(xs), "h": max(ys) - min(ys)}


def plug_icon(name, builder):
    kit.reset()
    builder(0, 0, 0.1, with_cable=False)
    cable("Stub", [(0.1, 0, 0.1), (0.22, 0, 0.08), (0.3, 0, 0.0)], 0.016, mat("#1f2226", rough=0.6))
    scene, cam = setup_scene(Vector((-0.02, -0.1, -0.02)), Vector((0.3, 0.1, 0.16)), 160, 160, Vector((-0.35, -1.0, 0.55)).normalized(), 1.15)
    render(scene, os.path.join(OUT, f"plug_{name}.png"))


def main():
    os.makedirs(OUT, exist_ok=True)
    scene, cam = projector_state("none", False, False)
    vy, vz = PORTS["vga"]
    py, pz = PORTS["pwr"]
    layout = {
        "vga": port_box(scene, cam, vy, vz, 0.1, 0.045),
        "pwr": port_box(scene, cam, py, pz, 0.06, 0.05),
        "hdmi": port_box(scene, cam, PORTS["hdmi"][0], PORTS["hdmi"][1], 0.045, 0.02),
    }
    projector_state("vga", True, False)
    projector_state("pwr", False, True)
    projector_state("both", True, True)
    plug_icon("vga", vga_plug)
    plug_icon("pwr", pwr_plug)
    with open(LAYOUT, "w") as f:
        f.write("// Written by art/blender/projector_ui.py: where each port sits in public/ui/projector_*.png,\n")
        f.write("// as fractions of the picture (centre x/y, width/height, top-left origin). Do not edit by hand.\n\n")
        f.write(f"export const PROJECTOR_SIZE = {{ w: {W}, h: {H} }};\n\n")
        f.write("export const PROJECTOR_PORTS = {\n")
        for k, v in layout.items():
            f.write(f"  {k}: {{ x: {v['x']:.4f}, y: {v['y']:.4f}, w: {v['w']:.4f}, h: {v['h']:.4f} }},\n")
        f.write("};\n")
    print("LAYOUT", layout)


if __name__ == "__main__":
    main()

"""Review sheet for one tower: all 49 combinations of upgrades (rule 4-2-0), put together with
tower_<tower>(tiers), at true scale, with the game's camera, next to an Intern.

    blender -b --python art/blender/contactsheet.py -- <out_dir> <tower> [--tile 40] [--sides]

--tile N renders the same sheet so that one tile is N pixels wide: what you see while playing.
--sides renders the core and the six heroes turned a quarter at a time: no side may be bare.
"""

import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_models as bm  # noqa: E402
import kit  # noqa: E402
from kit import box, mat  # noqa: E402

COMBOS = (["000", "100", "200", "300", "400", "010", "020", "030", "040", "001", "002", "003", "004",
           "110", "120", "210", "220", "101", "102", "201", "202", "011", "012", "021", "022"]
          + ["310", "320", "410", "420", "301", "302", "401", "402", "130", "230", "140", "240",
             "031", "032", "041", "042", "103", "203", "104", "204", "013", "023", "014", "024"])


def label(text, pos, cam_rot):
    cu = bpy.data.curves.new(f"L{text}", "FONT")
    cu.body = text
    cu.size = 0.26
    cu.align_x = "CENTER"
    ob = bpy.data.objects.new(f"L{text}", cu)
    ob.location = pos
    ob.rotation_euler = cam_rot
    ob.data.materials.append(mat("#1d2230", rough=1.0))
    bpy.context.scene.collection.objects.link(ob)


SIDES = ["000", "300", "400", "030", "040", "003", "004"]


def render(out_dir, tower, tile_px, sides=False):
    kit.reset()
    build = getattr(bm, f"tower_{tower}")
    combos = [c for c in SIDES for _ in range(4)] if sides else COMBOS
    right = Vector((1, -1, 0)).normalized()
    back = Vector((1, 1, 0)).normalized()
    elev = math.radians(35.264)
    direction = Vector((-math.cos(elev) / math.sqrt(2), -math.cos(elev) / math.sqrt(2), math.sin(elev)))
    cam_rot = (-direction).to_track_quat("-Z", "Y").to_euler()
    cols, dx, dy = (4, 1.55, 3.0) if sides else (7, 1.55, 3.7)
    pts = []
    for i, combo in enumerate(combos):
        r, c = divmod(i, cols)
        pos = right * (c * dx) - back * (r * dy)
        box(f"T{i}", (1.0, 1.0, 0.04), loc=(pos.x, pos.y, -0.04), material=mat("carpet" if (r + c) % 2 else "carpet_dark"))
        root = build([int(ch) for ch in combo])
        root.location = (pos.x, pos.y, 0)
        if sides:
            root.rotation_euler[2] = (i % 4) * math.pi / 2
        if not tile_px:
            label(combo + (f" {(i % 4) * 90}" if sides else ""), pos - back * 0.85 + Vector((0, 0, -0.02)), cam_rot)
        pts.append(pos)
    # The Intern, at the size the review uses (1.25), left of the first row.
    pos = right * (-1.3 * dx)
    box("TI", (1.0, 1.0, 0.04), loc=(pos.x, pos.y, -0.04), material=mat("carpet_dark"))
    intern = bm.BUILDERS["intern"]()
    intern.scale = (1.25, 1.25, 1.25)
    intern.location = (pos.x, pos.y, 0)
    pts.append(pos)

    bpy.context.view_layer.update()
    scene = bpy.context.scene
    cam_data = bpy.data.cameras.new("Cam")
    cam_data.type = "ORTHO"
    cam = bpy.data.objects.new("Cam", cam_data)
    scene.collection.objects.link(cam)
    center = sum(pts, Vector((0, 0, 0))) / len(pts)
    cam.location = center + direction * 40
    cam.rotation_euler = cam_rot
    scene.camera = cam
    bpy.context.view_layer.update()
    inv = cam.matrix_world.inverted()
    cs = [inv @ Vector((p.x + ox, p.y + oy, z)) for p in pts for ox in (-0.7, 0.7) for oy in (-0.7, 0.7) for z in (-0.5, 1.9)]
    w = max(c.x for c in cs) - min(c.x for c in cs)
    h = max(c.y for c in cs) - min(c.y for c in cs)
    # One tile seen from the game camera is sqrt(2) units wide on screen.
    px_per_unit = tile_px / math.sqrt(2) if tile_px else 2600 / w
    scene.render.resolution_x = int(w * px_per_unit)
    scene.render.resolution_y = int(h * px_per_unit)
    # Blender applies the orthographic scale to the longer side of the image.
    cam_data.ortho_scale = max(w, h)
    cx = (max(c.x for c in cs) + min(c.x for c in cs)) / 2
    cy = (max(c.y for c in cs) + min(c.y for c in cs)) / 2
    cam.location = cam.matrix_world @ Vector((cx, cy, 0))

    sun_data = bpy.data.lights.new("Sun", "SUN")
    sun_data.energy = 3.0
    sun = bpy.data.objects.new("Sun", sun_data)
    sun.rotation_euler = (math.radians(45), math.radians(15), math.radians(-40))
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
    scene.render.image_settings.file_format = "PNG"
    vt = [i.identifier for i in bpy.types.ColorManagedViewSettings.bl_rna.properties["view_transform"].enum_items]
    if "Standard" in vt:
        scene.view_settings.view_transform = "Standard"
    name = (f"sides_{tower}" if sides else f"sheet49_{tower}") + (f"_tile{tile_px}" if tile_px else "") + ".png"
    scene.render.filepath = os.path.join(out_dir, name)
    bpy.ops.render.render(write_still=True)
    print("SHEET", scene.render.filepath, scene.render.resolution_x, scene.render.resolution_y)


def main():
    argv = sys.argv[sys.argv.index("--") + 1:]
    out_dir, tower = argv[0], argv[1]
    tile = int(argv[argv.index("--tile") + 1]) if "--tile" in argv else 0
    os.makedirs(out_dir, exist_ok=True)
    render(out_dir, tower, tile, "--sides" in argv)


if __name__ == "__main__":
    main()

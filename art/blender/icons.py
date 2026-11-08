"""Render a 3/4 icon of every tower level and colleague into public/icons/<name>.png.

    blender -b --python art/blender/icons.py -- [--only intern,coffee_1] [--size 160]

Same models, same light as the game, transparent background. Framed on the bounding box so
every icon fills its square the same way.
"""

import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_models as bm  # noqa: E402
import kit  # noqa: E402

PEOPLE = ["intern", "newhire", "requester", "chaser", "headofcomms", "chatterbox", "oldguard", "boardmember", "repairguy", "presenter", "impersonator", "cleaner", "linemanager"]
ICONS = PEOPLE + ["coffee_1", "coffee_2", "coffee_3", "autoreply_1", "autoreply_2", "autoreply_3",
                  "headphones_1", "headphones_2", "headphones_3", "artillery_1", "artillery_2", "artillery_3",
                  "shredder_1", "shredder_2", "shredder_3", "quickreply_1", "quickreply_2", "quickreply_3",
                  "thumbtacks_1", "thumbtacks_2", "thumbtacks_3", "selfservice_1", "selfservice_2", "selfservice_3",
                  "shredder_p0_3", "shredder_p0_4", "shredder_p1_3", "shredder_p1_4", "shredder_p2_3", "shredder_p2_4",
                  "keyboardsmash_1", "keyboardsmash_2", "keyboardsmash_3", "chair_1", "chair_2", "chair_3"]


def render_icon(key, out_dir, size):
    kit.reset()
    root = bm.BUILDERS[key]()
    # Colleagues look a bit towards the camera.
    root.rotation_euler[2] = math.radians(-25) if key in PEOPLE else 0
    bpy.context.view_layer.update()
    pts = []
    for o in bpy.data.objects:
        if o.type == "MESH":
            pts += [o.matrix_world @ v.co for v in o.data.vertices]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    center = (lo + hi) / 2

    scene = bpy.context.scene
    cam_data = bpy.data.cameras.new("Cam")
    cam_data.type = "ORTHO"
    cam = bpy.data.objects.new("Cam", cam_data)
    scene.collection.objects.link(cam)
    elev = math.radians(30)
    azim = math.radians(-35)
    direction = Vector((math.cos(elev) * math.sin(-azim), -math.cos(elev) * math.cos(azim), math.sin(elev)))
    cam.location = center + direction * 20
    cam.rotation_euler = (-direction).to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    bpy.context.view_layer.update()
    # Fit: project the corners onto the camera plane.
    inv = cam.matrix_world.inverted()
    corners = [Vector((x, y, z)) for x in (lo.x, hi.x) for y in (lo.y, hi.y) for z in (lo.z, hi.z)]
    cs = [inv @ c for c in corners]
    w = max(c.x for c in cs) - min(c.x for c in cs)
    h = max(c.y for c in cs) - min(c.y for c in cs)
    cam_data.ortho_scale = max(w, h) * 1.12
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
    scene.render.resolution_x = size
    scene.render.resolution_y = size
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    vt = [i.identifier for i in bpy.types.ColorManagedViewSettings.bl_rna.properties["view_transform"].enum_items]
    if "Standard" in vt:
        scene.view_settings.view_transform = "Standard"
    path = os.path.join(out_dir, f"{key}.png")
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("ICON", key, path)


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    only = None
    size = 160
    for i, a in enumerate(argv):
        if a == "--only":
            only = set(argv[i + 1].split(","))
        if a == "--size":
            size = int(argv[i + 1])
    out_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "public", "icons"))
    os.makedirs(out_dir, exist_ok=True)
    for key in ICONS:
        if only and key not in only:
            continue
        render_icon(key, out_dir, size)


if __name__ == "__main__":
    main()

"""Render a small office diorama with the game camera, to judge the art direction.

    blender -b --python art/blender/preview.py -- --out art/previews/diorama.png [--engine cycles]
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


def place(builder, loc, rot_z=0.0):
    root = builder()
    root.location = Vector((loc[0], loc[1], loc[2] if len(loc) > 2 else 0.0))
    root.rotation_euler[2] = rot_z
    return root


def floor(w, d):
    for x in range(w):
        for y in range(d):
            key = "carpet" if (x + y) % 2 == 0 else "carpet_dark"
            box(f"F{x}_{y}", (1.0, 1.0, 0.1), loc=(x + 0.5, y + 0.5, -0.1), material=mat(key))
    # The slab edge, so the floor reads as a diorama piece.
    box("Slab", (w + 0.2, d + 0.2, 0.35), loc=(w / 2, d / 2, -0.45), material=mat("wall_trim"))


def walkway(cells):
    for (x, y) in cells:
        box(f"W{x}_{y}", (1.0, 1.0, 0.02), loc=(x + 0.5, y + 0.5, 0.0), material=mat("walkway"))


def walls(w, d):
    hgt = 1.6
    box("WallBack", (w, 0.14, hgt), loc=(w / 2, d + 0.07, 0), material=mat("wall"))
    box("WallLeft", (0.14, d, hgt), loc=(-0.07, d / 2, 0), material=mat("wall"))
    box("TrimBack", (w, 0.16, 0.08), loc=(w / 2, d + 0.07, 0), material=mat("wall_trim"))
    for i in range(1, w, 2):
        box(f"Win{i}", (1.2, 0.16, 0.7), loc=(i + 0.5, d + 0.07, 0.6), material=mat("window", rough=0.1, emit=0.25))


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    out = "art/previews/diorama.png"
    engine = "eevee"
    for i, a in enumerate(argv):
        if a == "--out":
            out = argv[i + 1]
        if a == "--engine":
            engine = argv[i + 1]
    out = os.path.abspath(out)
    os.makedirs(os.path.dirname(out), exist_ok=True)

    kit.reset()
    closeup = "--closeup" in argv
    lineup_arg = argv[argv.index("--lineup") + 1].split(",") if "--lineup" in argv else None
    W, D = 9, 7
    if lineup_arg:
        # Any models side by side: two rows of up to six.
        W, D = 7, 3
        floor(W, D)
        for i, key in enumerate(lineup_arg):
            place(bm.BUILDERS[key], (0.7 + (i % 6) * 1.15, 0.4 + (i // 6) * 1.4), rot_z=math.radians(-20))
        _camera_and_render(W, D, out, engine, 6.6)
        return
    if closeup:
        W, D = 6, 2
        floor(W, D)
        lineup = [bm.b_intern, bm.b_newhire, bm.b_requester, bm.b_chaser, bm.b_headofcomms]
        for i, b in enumerate(lineup):
            place(b, (0.6 + i * 1.15, 1.0), rot_z=math.radians(-20))
        place(bm.b_coffee_1, (0.5, 0.0))
        place(bm.b_coffee_2, (1.6, 0.0))
        place(bm.b_coffee_3, (2.7, 0.0))
        place(bm.b_autoreply_1, (3.8, 0.0))
        place(bm.b_autoreply_2, (4.9, 0.0))
        place(bm.b_autoreply_3, (6.0, 0.0))
    else:
        floor(W, D)
        build_room(W, D)
    _camera_and_render(W, D, out, engine, 5.2 if closeup else 11.5)


def build_room(W, D):
    path = [(0, 4), (1, 4), (2, 4), (3, 4), (4, 4), (4, 3), (4, 2), (5, 2), (6, 2), (7, 2), (8, 2)]
    walkway(path)
    walls(W, D)
    # Door in the left wall, at the start of the walkway.
    place(bm.b_door, (-0.07, 4.5, 0), rot_z=-math.pi / 2)
    place(bm.b_coffee_2, (2.5, 2.5))
    place(bm.b_autoreply_1, (3.5, 5.5))
    place(bm.b_autoreply_3, (5.5, 3.5))
    place(bm.b_coffee_1, (6.5, 1.5))
    place(bm.b_plant, (0.5, 6.4))
    place(bm.b_cooler, (8.5, 6.5))
    place(bm.b_desk_pair, (6.8, 5.2))
    place(bm.b_printer, (1.5, 0.6))
    place(bm.b_player_desk, (8.6, 2.5), rot_z=math.pi / 2)
    # Colleagues walking the route. Facing: +X means rot_z = pi/2 (front is -Y).
    place(bm.b_intern, (1.2, 4.5), rot_z=math.pi / 2)
    place(bm.b_newhire, (2.4, 4.5), rot_z=math.pi / 2)
    place(bm.b_requester, (4.5, 3.4), rot_z=0.0)
    place(bm.b_chaser, (6.2, 2.5), rot_z=math.pi / 2)
    place(bm.b_headofcomms, (0.3, 4.5), rot_z=math.pi / 2)


def _camera_and_render(W, D, out, engine, ortho):
    scene = bpy.context.scene
    # Camera: orthographic, isometric angles (45 degrees around, 35 degrees down).
    cam_data = bpy.data.cameras.new("Cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = ortho
    cam = bpy.data.objects.new("Cam", cam_data)
    scene.collection.objects.link(cam)
    center = Vector((W / 2, D / 2, 0.3))
    elev = math.radians(35.264)
    azim = math.radians(-45)
    direction = Vector((math.cos(elev) * math.sin(-azim), -math.cos(elev) * math.cos(azim), math.sin(elev)))
    cam.location = center + direction * 30
    cam.rotation_euler = (-direction).to_track_quat("-Z", "Y").to_euler()
    cam_data.clip_end = 100
    scene.camera = cam

    sun_data = bpy.data.lights.new("Sun", "SUN")
    sun_data.energy = 3.2
    sun_data.angle = math.radians(8)
    sun = bpy.data.objects.new("Sun", sun_data)
    sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(-30))
    scene.collection.objects.link(sun)

    world = bpy.data.worlds.new("World")
    scene.world = world
    try:
        world.use_nodes = True
    except Exception:
        pass
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs["Color"].default_value = kit.hex_rgb("#c9d1dc")
    bg.inputs["Strength"].default_value = 0.9

    engines = [i.identifier for i in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
    want = [e for e in engines if "EEVEE" in e] if engine == "eevee" else ["CYCLES"]
    for e in want:
        try:
            scene.render.engine = e
            break
        except TypeError:
            continue
    if scene.render.engine == "CYCLES":
        scene.cycles.samples = 48
        scene.cycles.use_denoising = True
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "Standard" if "Standard" in [
        i.identifier for i in bpy.types.ColorManagedViewSettings.bl_rna.properties["view_transform"].enum_items
    ] else scene.view_settings.view_transform
    scene.render.filepath = out
    bpy.ops.render.render(write_still=True)
    print("RENDERED", scene.render.engine, out)


if __name__ == "__main__":
    main()

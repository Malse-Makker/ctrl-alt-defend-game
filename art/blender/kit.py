"""Shared helpers for building the low-poly office models.

Everything is built with bmesh so the scripts run headless (blender -b). Blender is Z-up; the
glTF exporter turns that into Y-up for Three.js. Convention for every model:

- origin on the floor, centred on its tile (1 tile = 1 Blender unit)
- the front faces Blender -Y, which ends up as +Z in Three.js
- parts that the game animates are separate child objects with a fixed name
  (LegL, LegR, ArmL, ArmR for people), their origin on the joint they swing around
"""

import math

import bmesh
import bpy
from mathutils import Matrix, Vector

# Palette. One calm office base, one loud colour per colleague. Keep this in sync with
# art/STYLE_GUIDE.md and src/render/palette.ts.
PALETTE = {
    "carpet": "#8f96a0",
    "carpet_dark": "#858c96",
    "walkway": "#d8c9ab",
    "walkway_edge": "#b9a888",
    "wall": "#e6e1d8",
    "wall_trim": "#b4ac9f",
    "window": "#9fc4dd",
    "wood": "#c39a6b",
    "wood_dark": "#9a7550",
    "metal": "#4a4f57",
    "metal_light": "#a7adb5",
    "plastic_white": "#eeeeea",
    "plastic_black": "#2a2d33",
    "screen": "#7fb6e3",
    "screen_glow": "#bfe2ff",
    "paper": "#f6f3ea",
    "cardboard": "#b98c58",
    "plant": "#5d8b4b",
    "plant_dark": "#47703a",
    "pot": "#c96a3d",
    "coffee": "#5a3a22",
    "red": "#c8423b",
    "blue": "#3e7cc9",
    "yellow": "#f2c641",
    "teal": "#3fa7a0",
    "orange": "#e67e3a",
    "pink": "#e2557a",
    "navy": "#2f3d5c",
    "charcoal": "#3b3f46",
    "denim": "#4f6a8f",
    "khaki": "#a99572",
    "skin_1": "#efc9a4",
    "skin_2": "#d29e74",
    "skin_3": "#9a6845",
    "skin_4": "#6e4630",
    "hair_dark": "#2f2620",
    "hair_brown": "#6b4a2f",
    "hair_blond": "#d8b56a",
    "hair_grey": "#a9a6a0",
    "hair_red": "#a4522e",
}

_mats = {}


def hex_rgb(h):
    h = h.lstrip("#")
    srgb = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    # Blender wants linear values in the node socket.
    return tuple(((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92 for c in srgb) + (1.0,)


def mat(key, rough=0.85, metal=0.0, emit=0.0):
    """Material from the palette (or a raw hex). Cached by name."""
    hexv = PALETTE.get(key, key)
    name = f"{key}_r{rough}_m{metal}_e{emit}"
    if name in _mats:
        return _mats[name]
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:
        pass
    bsdf = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    col = hex_rgb(hexv)
    bsdf.inputs["Base Color"].default_value = col
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if emit > 0:
        for sock_name in ("Emission Color", "Emission"):
            if sock_name in bsdf.inputs:
                bsdf.inputs[sock_name].default_value = col
                break
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = emit
    m.diffuse_color = col
    _mats[name] = m
    return m


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _mats.clear()


def _obj_from_bm(name, bm, material):
    me = bpy.data.meshes.new(name)
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = False
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    if material is not None:
        me.materials.append(material)
    return ob


def _bevel(bm, amount):
    if amount <= 0:
        return
    bmesh.ops.bevel(bm, geom=list(bm.edges) + list(bm.verts), offset=amount, segments=1,
                    affect="EDGES", profile=0.5, clamp_overlap=True)


def box(name, size, loc=(0, 0, 0), material=None, bevel=0.0, rot_z=0.0, taper=1.0):
    """Box of size (x, y, z). loc is the centre of the BOTTOM face."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.z += 0.5
        if taper != 1.0 and v.co.z > 0.5:
            v.co.x *= taper
            v.co.y *= taper
        v.co.x *= size[0]
        v.co.y *= size[1]
        v.co.z *= size[2]
    _bevel(bm, bevel)
    m = Matrix.Translation(Vector(loc)) @ Matrix.Rotation(rot_z, 4, "Z")
    bm.transform(m)
    return _obj_from_bm(name, bm, material)


def cyl(name, radius, depth, loc=(0, 0, 0), material=None, verts=10, radius_top=None,
        rot=(0, 0, 0), bevel=0.0):
    """Cylinder standing on loc (bottom centre) unless rotated."""
    bm = bmesh.new()
    r2 = radius if radius_top is None else radius_top
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=verts,
                          radius1=radius, radius2=r2, depth=depth)
    for v in bm.verts:
        v.co.z += depth / 2
    _bevel(bm, bevel)
    m = (Matrix.Translation(Vector(loc)) @ Matrix.Rotation(rot[2], 4, "Z")
         @ Matrix.Rotation(rot[1], 4, "Y") @ Matrix.Rotation(rot[0], 4, "X"))
    bm.transform(m)
    return _obj_from_bm(name, bm, material)


def ball(name, radius, loc=(0, 0, 0), material=None, subdiv=1, scale=(1, 1, 1)):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=radius)
    for v in bm.verts:
        v.co.x *= scale[0]
        v.co.y *= scale[1]
        v.co.z *= scale[2]
    bm.transform(Matrix.Translation(Vector(loc)))
    return _obj_from_bm(name, bm, material)


def empty(name, loc=(0, 0, 0)):
    ob = bpy.data.objects.new(name, None)
    ob.location = loc
    bpy.context.scene.collection.objects.link(ob)
    return ob


def join(name, objs):
    """Join meshes into one object (keeps materials). Returns the joined object.

    Parts tagged ob["desk"] (the cabinet a tower stands on) are joined separately into
    "<name>_Desk", a child of the result, so the game can hide it when the tower stands on a
    kitchen counter."""
    objs = [o for o in objs if o is not None]
    desk = [o for o in objs if o.get("desk")]
    rest = [o for o in objs if not o.get("desk")]
    if desk and rest:
        ob = join(name, rest)
        d = join(name + "_Desk", desk)
        del d["desk"]
        parent(d, ob)
        return ob
    if len(objs) == 1:
        objs[0].name = name
        return objs[0]
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    ob.data.name = name
    return ob


def parent(child, par, keep_world=True):
    # matrix_world is only recomputed on a view layer update; without this a freshly moved
    # origin (set_origin) is read as the old one and the part ends up under the floor.
    bpy.context.view_layer.update()
    mw = child.matrix_world.copy()
    child.parent = par
    if keep_world:
        child.matrix_parent_inverse = par.matrix_world.inverted()
        child.matrix_world = mw
    return child


def set_origin(ob, point):
    """Move the object's origin to a world point without moving the geometry."""
    point = Vector(point)
    offset = point - ob.location
    ob.data.transform(Matrix.Translation(-offset))
    ob.location = point


def tilt(objs, rx=0.0, ry=0.0, rz=0.0, pivot=None):
    """Rotate freshly built parts around a pivot by changing their mesh data.

    box()/cyl() bake their location into the mesh, so setting rotation_euler would spin a part
    around the world origin and fling it away. Default pivot: centre of the first part.
    """
    if not isinstance(objs, (list, tuple)):
        objs = [objs]
    if pivot is None:
        vs = objs[0].data.vertices
        lo = [min(v.co[i] for v in vs) for i in range(3)]
        hi = [max(v.co[i] for v in vs) for i in range(3)]
        pivot = [(lo[i] + hi[i]) / 2 for i in range(3)]
    p = Vector(pivot)
    m = (Matrix.Translation(p) @ Matrix.Rotation(rz, 4, "Z") @ Matrix.Rotation(ry, 4, "Y")
         @ Matrix.Rotation(rx, 4, "X") @ Matrix.Translation(-p))
    for o in objs:
        o.data.transform(m)
    return objs


def export_glb(root, path):
    bpy.ops.object.select_all(action="DESELECT")
    stack = [root]
    while stack:
        o = stack.pop()
        o.select_set(True)
        stack.extend(o.children)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
        export_extras=False,
    )


def label_quad(name, w, h, loc, material, rot=(math.pi / 2, 0, 0)):
    """Flat panel (for screens, signs). Faces -Y by default."""
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
    for v in bm.verts:
        v.co.x *= w
        v.co.y *= h
    m = (Matrix.Translation(Vector(loc)) @ Matrix.Rotation(rot[2], 4, "Z")
         @ Matrix.Rotation(rot[1], 4, "Y") @ Matrix.Rotation(rot[0], 4, "X"))
    bm.transform(m)
    return _obj_from_bm(name, bm, material)

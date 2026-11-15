"""Build every game model and export it as .glb into public/models/.

Run (headless):
    blender -b --python art/blender/build_models.py -- [--only intern,coffee_1] [--out public/models]

Each builder returns the root object. See kit.py for the conventions (origin on the floor,
front faces -Y, animated parts as named children).
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit  # noqa: E402
from mathutils import Matrix  # noqa: E402
from kit import ball, box, cyl, empty, join, label_quad, mat, parent, set_origin  # noqa: E402

TAU = math.pi * 2


# ---------------------------------------------------------------- people

def person(name, shirt, pants, skin, hair, style="short", h=1.0, shoes="plastic_black",
           arms_forward=0.0, slim=1.0):
    """A colleague. Returns (root, body). arms_forward tilts both arms to hold something."""
    s = h
    root = empty(name)
    hip = 0.34 * s
    torso_h = 0.36 * s
    sh_z = hip + torso_h - 0.03 * s
    for side, x in (("L", 0.075 * slim), ("R", -0.075 * slim)):
        leg = box(f"Leg{side}", (0.11 * s * slim, 0.13 * s, hip), loc=(x * s, 0, 0),
                  material=mat(pants), bevel=0.012 * s)
        shoe = box(f"Shoe{side}", (0.12 * s * slim, 0.18 * s, 0.06 * s), loc=(x * s, -0.025 * s, 0),
                   material=mat(shoes), bevel=0.01 * s)
        leg = join(f"Leg{side}", [leg, shoe])
        set_origin(leg, (x * s, 0, hip))
        parent(leg, root)

    torso = box("Torso", (0.34 * s * slim, 0.2 * s, torso_h), loc=(0, 0, hip),
                material=mat(shirt), bevel=0.025 * s, taper=0.9)
    neck = cyl("Neck", 0.045 * s, 0.06 * s, loc=(0, 0, hip + torso_h - 0.01 * s), material=mat(skin), verts=8)
    head_z = hip + torso_h + 0.15 * s
    head = ball("Head", 0.125 * s, loc=(0, 0, head_z), material=mat(skin), subdiv=2, scale=(1, 0.95, 1.05))
    eye_mat = mat("plastic_black", rough=0.4)
    eyes = [box(f"Eye{i}", (0.024 * s, 0.01 * s, 0.032 * s), loc=(x * s, -0.118 * s, head_z - 0.005 * s),
                material=eye_mat) for i, x in enumerate((-0.045, 0.045))]
    parts = [torso, neck, head] + eyes
    hm = mat(hair)
    if style == "short":
        parts.append(ball("Hair", 0.133 * s, loc=(0, 0.012 * s, head_z + 0.035 * s), material=hm,
                          subdiv=2, scale=(1.0, 0.98, 0.72)))
    elif style == "long":
        parts.append(ball("Hair", 0.135 * s, loc=(0, 0.015 * s, head_z + 0.03 * s), material=hm,
                          subdiv=2, scale=(1.02, 1.0, 0.75)))
        parts.append(box("HairBack", (0.25 * s, 0.07 * s, 0.24 * s), loc=(0, 0.085 * s, head_z - 0.2 * s),
                         material=hm, bevel=0.02 * s))
    elif style == "bun":
        parts.append(ball("Hair", 0.133 * s, loc=(0, 0.012 * s, head_z + 0.035 * s), material=hm,
                          subdiv=2, scale=(1.0, 0.98, 0.72)))
        parts.append(ball("Bun", 0.06 * s, loc=(0, 0.06 * s, head_z + 0.14 * s), material=hm, subdiv=1))
    elif style == "side":
        parts.append(ball("Hair", 0.134 * s, loc=(0.01 * s, 0.01 * s, head_z + 0.04 * s), material=hm,
                          subdiv=2, scale=(1.0, 0.98, 0.7)))
        parts.append(box("Quiff", (0.16 * s, 0.1 * s, 0.05 * s), loc=(0.03 * s, -0.06 * s, head_z + 0.1 * s),
                         material=hm, bevel=0.015 * s, rot_z=0.2))
    elif style == "bob":
        # Chin-length all round, a straight fringe.
        parts.append(ball("Hair", 0.137 * s, loc=(0, 0.01 * s, head_z + 0.03 * s), material=hm,
                          subdiv=2, scale=(1.03, 1.0, 0.75)))
        for side in (-1, 1):
            parts.append(box(f"HairSide{side}", (0.05 * s, 0.2 * s, 0.17 * s), loc=(side * 0.115 * s, 0.02 * s, head_z - 0.12 * s),
                             material=hm, bevel=0.02 * s))
        parts.append(box("HairBack", (0.24 * s, 0.06 * s, 0.17 * s), loc=(0, 0.1 * s, head_z - 0.12 * s), material=hm,
                         bevel=0.02 * s))
        parts.append(box("Fringe", (0.2 * s, 0.05 * s, 0.05 * s), loc=(0, -0.1 * s, head_z + 0.06 * s), material=hm,
                         bevel=0.015 * s))
    elif style == "bald":
        parts.append(ball("Hair", 0.131 * s, loc=(0, 0.03 * s, head_z - 0.01 * s), material=hm,
                          subdiv=2, scale=(1.0, 0.9, 0.55)))
    body = join("Body", parts)
    parent(body, root)

    for side, x in (("L", 0.21 * slim), ("R", -0.21 * slim)):
        arm = box(f"Arm{side}", (0.08 * s, 0.1 * s, 0.29 * s), loc=(x * s, 0, sh_z - 0.29 * s),
                  material=mat(shirt), bevel=0.012 * s)
        hand = ball(f"Hand{side}", 0.045 * s, loc=(x * s, 0, sh_z - 0.31 * s), material=mat(skin), subdiv=1)
        arm = join(f"Arm{side}", [arm, hand])
        set_origin(arm, (x * s, 0, sh_z))
        arm.rotation_euler[0] = arms_forward
        parent(arm, root)
    return root, body, head_z


def _arm(root, side):
    return next(c for c in root.children if c.name.split(".")[0] == f"Arm{side}")


def _hand_world(arm, s, along=0.31):
    """World position of the hand of an arm (after its rotation), for props held in one hand."""
    from mathutils import Vector
    import bpy
    bpy.context.view_layer.update()
    return arm.matrix_world @ Vector((0, 0, -along * s))


def _hold(root, side, s, props, name=None):
    """Join props (built in world space at the hand) into the arm so they swing with it."""
    arm = _arm(root, side)
    return join(name or f"Arm{side}", [arm] + props)


def b_intern():
    s = 0.92
    root, body, hz = person("intern", "yellow", "khaki", "skin_1", "hair_brown", style="side", h=s)
    # Lanyard and badge: the giveaway that this is someone's first summer job.
    strap = box("Strap", (0.16 * s, 0.01 * s, 0.17 * s), loc=(0, -0.104 * s, 0.53 * s), material=mat("red"), taper=0.5)
    badge = box("Badge", (0.07 * s, 0.012 * s, 0.09 * s), loc=(0, -0.11 * s, 0.45 * s), material=mat("plastic_white"))
    acc = join("Props", [strap, badge])
    parent(acc, root)
    # A coffee for someone else, in the right hand.
    hp = _hand_world(_arm(root, "R"), s, along=0.3)
    cup = cyl("Cup", 0.04 * s, 0.11 * s, loc=(hp.x, hp.y - 0.05 * s, hp.z - 0.06 * s), material=mat("plastic_white"),
              verts=10, radius_top=0.048 * s)
    lid = cyl("Lid", 0.05 * s, 0.02 * s, loc=(hp.x, hp.y - 0.05 * s, hp.z + 0.05 * s), material=mat("cardboard"), verts=10)
    _hold(root, "R", s, [cup, lid])
    return root


def b_newhire():
    s = 1.0
    root, body, hz = person("newhire", "teal", "charcoal", "skin_3", "hair_dark", style="short", h=s,
                            arms_forward=-1.0)
    sticker = box("Sticker", (0.11, 0.012, 0.07), loc=(0.06, -0.105, 0.55), material=mat("plastic_white"))
    sticker_top = box("StickerTop", (0.11, 0.013, 0.02), loc=(0.06, -0.106, 0.6), material=mat("red"))
    # The floor plan he keeps turning upside down, held in both hands.
    hp = _hand_world(_arm(root, "R"), s)
    plan = box("Plan", (0.38, 0.015, 0.26), loc=(0, hp.y - 0.03, hp.z - 0.1), material=mat("paper"))
    lines = box("PlanLines", (0.24, 0.017, 0.012), loc=(0, hp.y - 0.035, hp.z + 0.02), material=mat("blue"))
    route = box("PlanRoute", (0.012, 0.017, 0.14), loc=(0.07, hp.y - 0.036, hp.z - 0.07), material=mat("red"))
    kit.tilt([plan, lines, route], rx=-0.45)
    acc = join("Props", [sticker, sticker_top, plan, lines, route])
    parent(acc, root)
    return root


def b_requester():
    s = 1.0
    root, body, hz = person("requester", "orange", "denim", "skin_2", "hair_red", style="bun", h=s,
                            arms_forward=-0.9)
    hp = _hand_world(_arm(root, "R"), s)
    clip = box("Clipboard", (0.22, 0.02, 0.3), loc=(0, hp.y - 0.03, hp.z - 0.12), material=mat("wood_dark"), bevel=0.008)
    paper = box("Paper", (0.18, 0.022, 0.24), loc=(0, hp.y - 0.04, hp.z - 0.1), material=mat("paper"))
    clamp = box("Clamp", (0.08, 0.03, 0.03), loc=(0, hp.y - 0.045, hp.z + 0.16), material=mat("metal_light"), bevel=0.005)
    # "v2_FINAL_final": two red edits on the page.
    marks = [box(f"Mark{i}", (0.12 - i * 0.03, 0.024, 0.015), loc=(0, hp.y - 0.042, hp.z + 0.06 - i * 0.07),
                 material=mat("red")) for i in range(2)]
    kit.tilt([clip, paper, clamp] + marks, rx=-0.35)
    acc = join("Props", [clip, paper, clamp] + marks)
    parent(acc, root)
    return root


def b_chaser():
    s = 0.82
    root, body, hz = person("chaser", "pink", "charcoal", "skin_4", "hair_dark", style="short", h=s, slim=0.9,
                            shoes="plastic_white")
    # The red unread dot floating over his head.
    dot = ball("Unread", 0.06 * s, loc=(0.0, 0.0, hz + 0.27 * s), material=mat("red", emit=0.8), subdiv=1)
    acc = join("Props", [dot])
    parent(acc, root)
    # Right arm raised, phone held up to your face.
    arm = _arm(root, "R")
    arm.rotation_euler[0] = -2.2
    hp = _hand_world(arm, s)
    phone = box("Phone", (0.075 * s, 0.016 * s, 0.14 * s), loc=(hp.x, hp.y - 0.02 * s, hp.z - 0.02 * s),
                material=mat("plastic_black"), bevel=0.004)
    screen = box("PhoneScreen", (0.062 * s, 0.004 * s, 0.115 * s), loc=(hp.x, hp.y - 0.03 * s, hp.z - 0.008 * s),
                 material=mat("screen", emit=1.5))
    _hold(root, "R", s, [phone, screen])
    return root


def b_headofcomms():
    s = 1.45
    root, body, hz = person("headofcomms", "navy", "navy", "skin_1", "hair_grey", style="side", h=s)
    shirt = box("ShirtV", (0.1 * s, 0.012 * s, 0.14 * s), loc=(0, -0.102 * s, 0.56 * s), material=mat("plastic_white"),
                taper=0.4)
    tie = box("Tie", (0.045 * s, 0.014 * s, 0.17 * s), loc=(0, -0.106 * s, 0.45 * s), material=mat("red"), taper=0.6)
    acc = join("Props", [shirt, tie])
    parent(acc, root)
    # The megaphone: everything he says goes to everyone.
    arm = _arm(root, "R")
    arm.rotation_euler[0] = -1.4
    hp = _hand_world(arm, s)
    tilt = math.pi / 2 - 0.2
    horn = cyl("Horn", 0.035 * s, 0.24 * s, loc=(hp.x, hp.y, hp.z), material=mat("plastic_white"),
               verts=12, radius_top=0.11 * s, rot=(tilt, 0, 0))
    tip_y = hp.y - math.sin(tilt) * 0.24 * s
    tip_z = hp.z + math.cos(tilt) * 0.24 * s
    ring = cyl("HornRing", 0.115 * s, 0.03 * s, loc=(hp.x, tip_y, tip_z), material=mat("red"),
               verts=12, rot=(tilt, 0, 0))
    handle = box("Handle", (0.04 * s, 0.05 * s, 0.1 * s), loc=(hp.x, hp.y - 0.04 * s, hp.z - 0.1 * s), material=mat("metal"))
    _hold(root, "R", s, [horn, ring, handle])
    return root


# ---------------------------------------------------------------- towers

def _laptop(x, y, z, rot=0.0, screen_key="screen"):
    base = box("LapBase", (0.3, 0.21, 0.02), loc=(x, y, z), material=mat("metal_light", rough=0.4), bevel=0.006,
               rot_z=rot)
    lid = box("LapLid", (0.3, 0.015, 0.2), loc=(x, y + 0.1, z + 0.015), material=mat("metal_light", rough=0.4),
              bevel=0.006, rot_z=rot)
    scr = box("LapScreen", (0.26, 0.004, 0.16), loc=(x, y + 0.092, z + 0.035), material=mat(screen_key, emit=1.2),
              rot_z=rot)
    kit.tilt([lid, scr], rx=-0.25, pivot=(x, y + 0.1, z + 0.015))
    keys = box("Keys", (0.24, 0.1, 0.004), loc=(x, y - 0.03, z + 0.02), material=mat("plastic_black"), rot_z=rot)
    return [base, lid, scr, keys]


def _envelope(x, y, z, scale=1.0, tilt=-0.25):
    env = box("Env", (0.11 * scale, 0.006, 0.07 * scale), loc=(x, y, z), material=mat("plastic_white", emit=0.4))
    flap = box("Flap", (0.08 * scale, 0.008, 0.012 * scale), loc=(x, y - 0.002, z + 0.04 * scale),
               material=mat("blue", emit=0.6), taper=0.2)
    kit.tilt([env, flap], rx=tilt)
    return [env, flap]


def _monitor(x, y, z, w=0.42, hgt=0.27, rot=0.0, screen_key="screen", emit=1.2):
    stand = box("Stand", (0.12, 0.1, 0.012), loc=(x, y, z), material=mat("plastic_black"), rot_z=rot)
    neck = box("MonNeck", (0.04, 0.03, 0.14), loc=(x, y + 0.02, z), material=mat("plastic_black"), rot_z=rot)
    frame = box("Frame", (w, 0.035, hgt), loc=(x, y + 0.02, z + 0.1), material=mat("plastic_black"), bevel=0.008,
                rot_z=rot)
    scr = box("Screen", (w - 0.04, 0.004, hgt - 0.04), loc=(x, y + 0.002, z + 0.12), material=mat(screen_key, emit=emit),
              rot_z=rot)
    return [stand, neck, frame, scr]


# ---------------------------------------------------------------- decor

def b_desk_pair():
    """Two facing desks with monitors and chairs. Pure decor; blocks building."""
    root = empty("desk_pair")
    parts = []
    for side in (-1, 1):
        y = side * 0.38
        parts.append(box(f"Top{side}", (1.6, 0.66, 0.04), loc=(0, y, 0.7), material=mat("wood"), bevel=0.01))
        for x in (-0.74, 0.74):
            parts.append(box(f"Leg{side}{x}", (0.05, 0.6, 0.7), loc=(x, y, 0), material=mat("metal")))
        for x in (-0.4, 0.4):
            mon = _monitor(x, y + side * 0.18, 0.74, w=0.4, hgt=0.25, rot=0.0 if side < 0 else math.pi,
                           screen_key="screen", emit=0.8)
            parts += mon
        parts.append(box(f"Chair{side}", (0.4, 0.4, 0.06), loc=(0.4, y - side * 0.55, 0.42),
                         material=mat("charcoal"), bevel=0.02))
        parts.append(box(f"Back{side}", (0.4, 0.06, 0.4), loc=(0.4, y - side * 0.75, 0.48),
                         material=mat("charcoal"), bevel=0.02))
        parts.append(cyl(f"Post{side}", 0.03, 0.42, loc=(0.4, y - side * 0.55, 0), material=mat("metal"), verts=6))
    screen_divider = box("Divider", (1.6, 0.04, 0.3), loc=(0, 0, 0.74), material=mat("teal", rough=0.95))
    ob = join("desk_pair_mesh", parts + [screen_divider])
    parent(ob, root)
    return root


def b_plant():
    root = empty("plant")
    pot = cyl("Pot", 0.18, 0.34, loc=(0, 0, 0), material=mat("pot"), verts=10, radius_top=0.22)
    soil = cyl("Soil", 0.2, 0.02, loc=(0, 0, 0.32), material=mat("coffee"), verts=10)
    leaves = [
        ball("Leaf0", 0.26, loc=(0, 0, 0.75), material=mat("plant"), subdiv=1, scale=(1, 1, 1.3)),
        ball("Leaf1", 0.2, loc=(0.12, 0.05, 1.05), material=mat("plant_dark"), subdiv=1),
        ball("Leaf2", 0.18, loc=(-0.12, -0.06, 0.98), material=mat("plant"), subdiv=1),
    ]
    stem = cyl("Stem", 0.03, 0.4, loc=(0, 0, 0.32), material=mat("wood_dark"), verts=6)
    ob = join("plant_mesh", [pot, soil, stem] + leaves)
    parent(ob, root)
    return root


def b_cooler():
    root = empty("cooler")
    body = box("Body", (0.34, 0.34, 0.9), loc=(0, 0, 0), material=mat("plastic_white"), bevel=0.02)
    tap_b = box("TapB", (0.04, 0.04, 0.05), loc=(-0.07, -0.18, 0.7), material=mat("blue"))
    tap_r = box("TapR", (0.04, 0.04, 0.05), loc=(0.07, -0.18, 0.7), material=mat("red"))
    bottle = cyl("Bottle", 0.15, 0.4, loc=(0, 0, 0.9), material=mat("window", rough=0.1), verts=12, radius_top=0.1)
    ob = join("cooler_mesh", [body, tap_b, tap_r, bottle])
    parent(ob, root)
    return root


def b_printer():
    root = empty("printer")
    body = box("Body", (0.8, 0.62, 0.86), loc=(0, 0, 0), material=mat("plastic_white"), bevel=0.02)
    top = box("Top", (0.8, 0.62, 0.08), loc=(0, 0, 0.86), material=mat("metal_light"), bevel=0.02)
    panel = box("Panel", (0.26, 0.12, 0.05), loc=(0.2, -0.24, 0.94), material=mat("plastic_black"))
    screen = box("PanelScreen", (0.14, 0.02, 0.03), loc=(0.2, -0.3, 0.96), material=mat("screen", emit=1.0))
    tray = box("Tray", (0.5, 0.2, 0.02), loc=(-0.1, -0.35, 0.6), material=mat("metal"))
    paper = box("Paper", (0.38, 0.18, 0.03), loc=(-0.1, -0.35, 0.62), material=mat("paper"))
    err = box("Err", (0.04, 0.02, 0.04), loc=(0.33, -0.31, 0.95), material=mat("orange", emit=2.0))
    ob = join("printer_mesh", [body, top, panel, screen, tray, paper, err])
    parent(ob, root)
    return root


def b_player_desk():
    """Your desk. What every colleague in the building is walking towards."""
    root = empty("player_desk")
    parts = [box("Top", (1.3, 0.75, 0.05), loc=(0, 0, 0.7), material=mat("wood"), bevel=0.012)]
    for x in (-0.6, 0.6):
        parts.append(box(f"Leg{x}", (0.05, 0.7, 0.7), loc=(x, 0, 0), material=mat("metal")))
    parts += _monitor(0, 0.15, 0.75, w=0.5, hgt=0.3, screen_key="screen_glow", emit=1.4)
    parts.append(box("Keyboard", (0.36, 0.11, 0.02), loc=(0, -0.13, 0.75), material=mat("plastic_white")))
    parts.append(cyl("Mug", 0.045, 0.09, loc=(0.42, -0.1, 0.75), material=mat("red"), verts=10))
    parts.append(box("Plate", (0.22, 0.04, 0.07), loc=(-0.42, -0.3, 0.75), material=mat("metal_light", metal=0.6, rough=0.3)))
    parts.append(box("PostIt", (0.07, 0.07, 0.004), loc=(-0.12, -0.16, 0.755), material=mat("yellow")))
    chair_seat = box("Seat", (0.46, 0.44, 0.07), loc=(0, -0.62, 0.44), material=mat("charcoal"), bevel=0.02)
    chair_back = box("ChairBack", (0.46, 0.07, 0.5), loc=(0, -0.86, 0.5), material=mat("charcoal"), bevel=0.02)
    post = cyl("Post", 0.03, 0.44, loc=(0, -0.62, 0), material=mat("metal"), verts=6)
    star = box("Star", (0.5, 0.06, 0.03), loc=(0, -0.62, 0.0), material=mat("metal"))
    star2 = box("Star2", (0.06, 0.5, 0.03), loc=(0, -0.62, 0.0), material=mat("metal"))
    headphones = cyl("Headphones", 0.09, 0.03, loc=(-0.3, 0.05, 0.75), material=mat("plastic_black"), verts=10)
    ob = join("player_desk_mesh", parts + [chair_seat, chair_back, post, star, star2, headphones])
    parent(ob, root)
    return root


def b_door():
    """Door frame with the door swung open: where the colleagues come in."""
    root = empty("door")
    frame_m = mat("wall_trim")
    parts = [
        box("JambL", (0.08, 0.16, 1.5), loc=(-0.46, 0, 0), material=frame_m),
        box("JambR", (0.08, 0.16, 1.5), loc=(0.46, 0, 0), material=frame_m),
        box("Lintel", (1.0, 0.16, 0.1), loc=(0, 0, 1.5), material=frame_m),
        box("Sign", (0.5, 0.02, 0.14), loc=(0, -0.09, 1.62), material=mat("plastic_white", emit=0.2)),
        box("SignBar", (0.36, 0.022, 0.05), loc=(0, -0.1, 1.66), material=mat("teal")),
    ]
    frame = join("door_frame", parts)
    parent(frame, root)
    leaf = box("Leaf", (0.84, 0.05, 1.46), loc=(0, 0, 0), material=mat("wood"), bevel=0.01)
    knob = ball("Knob", 0.03, loc=(-0.34, -0.05, 0.75), material=mat("metal_light", metal=0.8, rough=0.3), subdiv=1)
    leaf = join("door_leaf", [leaf, knob])
    set_origin(leaf, (0.42, 0, 0))
    leaf.rotation_euler[2] = -1.9
    parent(leaf, root)
    return root


# ---------------------------------------------------------------- level 2 towers

def _headset(x, y, z, scale, band_mat, cup_mat, pad_mat):
    s = scale
    parts = []
    for side in (-1, 1):
        parts.append(cyl(f"Cup{side}", 0.07 * s, 0.05 * s, loc=(x + side * 0.12 * s, y, z), material=cup_mat, verts=14, rot=(0, math.pi / 2, 0)))
        parts.append(cyl(f"Pad{side}", 0.06 * s, 0.02 * s, loc=(x + side * 0.095 * s, y, z), material=pad_mat, verts=14, rot=(0, math.pi / 2, 0)))
        parts.append(box(f"Arm{side}", (0.02 * s, 0.03 * s, 0.12 * s), loc=(x + side * 0.13 * s, y, z + 0.05 * s), material=band_mat))
    parts.append(box("Band", (0.28 * s, 0.035 * s, 0.025 * s), loc=(x, y, z + 0.17 * s), material=band_mat, bevel=0.008))
    return parts


def _stapler(x, y, z, s, body, top):
    base = box("SBase", (0.12 * s, 0.4 * s, 0.03 * s), loc=(x, y, z), material=mat("plastic_black"), bevel=0.01)
    arm = box("SArm", (0.1 * s, 0.38 * s, 0.07 * s), loc=(x, y + 0.01 * s, z + 0.035 * s), material=body, bevel=0.015)
    cap = box("STop", (0.11 * s, 0.3 * s, 0.03 * s), loc=(x, y - 0.03 * s, z + 0.1 * s), material=top, bevel=0.01)
    hinge = cyl("SHinge", 0.025 * s, 0.13 * s, loc=(x - 0.065 * s, y + 0.17 * s, z + 0.06 * s), material=mat("metal"), verts=10, rot=(0, math.pi / 2, 0))
    return [base, arm, cap, hinge]


# ---------------------------------------------------------------- level 2 colleagues

def b_chatterbox():
    s = 1.0
    root, body, hz = person("chatterbox", "pink", "charcoal", "skin_2", "hair_blond", style="long", h=s)
    cardigan = box("Cardigan", (0.36, 0.21, 0.3), loc=(0, 0, 0.36), material=mat("#8e6fbf"), bevel=0.02, taper=0.92)
    acc = [cardigan]
    # The speech bubble that never stops.
    bubble = ball("Bubble", 0.14, loc=(0.18, 0, hz + 0.32), material=mat("plastic_white", emit=0.3), subdiv=2, scale=(1.3, 0.5, 1.0))
    tail = box("BubbleTail", (0.06, 0.04, 0.08), loc=(0.1, 0, hz + 0.18), material=mat("plastic_white", emit=0.3), taper=0.2)
    dots = [ball(f"Dot{i}", 0.022, loc=(0.1 + i * 0.07, -0.07, hz + 0.32), material=mat("charcoal"), subdiv=1) for i in range(3)]
    acc += [bubble, tail] + dots
    props = join("Props", acc)
    parent(props, root)
    arm = _arm(root, "L")
    arm.rotation_euler[0] = -1.9
    hp = _hand_world(_arm(root, "R"), s)
    mug = cyl("Mug", 0.045, 0.1, loc=(hp.x, hp.y - 0.05, hp.z - 0.05), material=mat("teal"), verts=10)
    _hold(root, "R", s, [mug])
    return root


def b_oldguard():
    s = 0.98
    root, body, hz = person("oldguard", "khaki", "charcoal", "skin_1", "hair_grey", style="bald", h=s, arms_forward=-1.1)
    vest = box("Vest", (0.35, 0.21, 0.22), loc=(0, 0, 0.47 * s), material=mat("wood_dark"), bevel=0.02)
    glasses = box("Glasses", (0.16, 0.02, 0.03), loc=(0, -0.125 * s, hz), material=mat("metal"))
    hp = _hand_world(_arm(root, "R"), s)
    archive = box("Archive", (0.42, 0.3, 0.28), loc=(0, hp.y - 0.08, hp.z - 0.2), material=mat("cardboard"), bevel=0.01)
    label = box("Label", (0.18, 0.01, 0.08), loc=(0, hp.y - 0.235, hp.z - 0.1), material=mat("paper"))
    stamp = box("Stamp", (0.1, 0.012, 0.03), loc=(0, hp.y - 0.237, hp.z - 0.08), material=mat("red"))
    lid = box("Lid", (0.44, 0.32, 0.04), loc=(0, hp.y - 0.08, hp.z + 0.06), material=mat("cardboard"), bevel=0.008)
    acc = join("Props", [vest, glasses, archive, label, stamp, lid])
    parent(acc, root)
    return root


def b_boardmember():
    """Never actually in the building: a telepresence robot with his face on the screen."""
    root = empty("boardmember")
    base = cyl("Base", 0.2, 0.08, loc=(0, 0, 0.03), material=mat("plastic_black"), verts=16)
    wheels = [cyl(f"Wheel{i}", 0.04, 0.04, loc=(x, y, 0.0), material=mat("charcoal"), verts=8) for i, (x, y) in enumerate(((0.12, 0.08), (-0.12, 0.08), (0, -0.14)))]
    pole = cyl("Pole", 0.025, 0.85, loc=(0, 0, 0.1), material=mat("metal_light", metal=0.7, rough=0.3), verts=10)
    frame = box("Frame", (0.36, 0.04, 0.26), loc=(0, 0, 0.9), material=mat("plastic_black"), bevel=0.02)
    screen = box("Screen", (0.32, 0.01, 0.22), loc=(0, -0.022, 0.92), material=mat("navy", emit=1.0))
    face = ball("Face", 0.06, loc=(0, -0.03, 1.03), material=mat("skin_1", emit=0.6), subdiv=1, scale=(1, 0.2, 1.1))
    tie = box("Tie", (0.03, 0.01, 0.07), loc=(0, -0.03, 0.94), material=mat("red", emit=0.6), taper=0.5)
    suit = box("Suit", (0.18, 0.008, 0.06), loc=(0, -0.029, 0.93), material=mat("charcoal", emit=0.3))
    cam = ball("Cam", 0.015, loc=(0, -0.025, 1.05), material=mat("plastic_white", emit=2.0), subdiv=1)
    ob = join("Body", [base, pole, frame, screen, suit, face, tie, cam] + wheels)
    parent(ob, root)
    return root


def b_repairguy():
    s = 1.45
    root, body, hz = person("repairguy", "orange", "denim", "skin_3", "hair_brown", style="short", h=s)
    bib = box("Bib", (0.24 * s, 0.012 * s, 0.2 * s), loc=(0, -0.104 * s, 0.42 * s), material=mat("denim"))
    straps = [box(f"Strap{i}", (0.03 * s, 0.012 * s, 0.14 * s), loc=(x * s, -0.104 * s, 0.56 * s), material=mat("denim")) for i, x in enumerate((-0.09, 0.09))]
    cap = cyl("Cap", 0.12 * s, 0.06 * s, loc=(0, 0.01 * s, hz + 0.07 * s), material=mat("orange"), verts=12)
    visor = box("Visor", (0.18 * s, 0.1 * s, 0.015 * s), loc=(0, -0.11 * s, hz + 0.07 * s), material=mat("orange"))
    acc = join("Props", [bib, cap, visor] + straps)
    parent(acc, root)
    hp = _hand_world(_arm(root, "R"), s)
    toolbox = box("Toolbox", (0.16 * s, 0.34 * s, 0.16 * s), loc=(hp.x, hp.y, hp.z - 0.2 * s), material=mat("red", rough=0.4), bevel=0.01)
    handle = box("TBHandle", (0.03 * s, 0.2 * s, 0.04 * s), loc=(hp.x, hp.y, hp.z - 0.04 * s), material=mat("plastic_black"))
    _hold(root, "R", s, [toolbox, handle])
    hl = _hand_world(_arm(root, "L"), s)
    wrench = box("Wrench", (0.03 * s, 0.03 * s, 0.22 * s), loc=(hl.x, hl.y - 0.03 * s, hl.z - 0.12 * s), material=mat("metal_light", metal=0.8, rough=0.3))
    jaw = box("Jaw", (0.07 * s, 0.03 * s, 0.05 * s), loc=(hl.x, hl.y - 0.03 * s, hl.z - 0.15 * s), material=mat("metal_light", metal=0.8, rough=0.3))
    _hold(root, "L", s, [wrench, jaw])
    return root


# ---------------------------------------------------------------- level 2 decor

def b_coffee_bar():
    root = empty("coffee_bar")
    counter = box("Counter", (2.8, 0.7, 0.9), loc=(0, 0, 0), material=mat("wood_dark"), bevel=0.02)
    top = box("CTop", (2.9, 0.78, 0.05), loc=(0, 0, 0.9), material=mat("plastic_white"), bevel=0.01)
    parts = [counter, top]
    parts += _stapler(0, 0, 0, 0.001, mat("red"), mat("red"))[:0]
    machine = box("Machine", (0.5, 0.36, 0.38), loc=(-0.7, 0.05, 0.95), material=mat("metal_light", metal=0.7, rough=0.3), bevel=0.02)
    cups = [cyl(f"CCup{i}", 0.04, 0.08, loc=(0.1 + 0.12 * i, -0.12, 0.95), material=mat("plastic_white"), verts=10) for i in range(5)]
    jar = cyl("Jar", 0.08, 0.2, loc=(0.9, 0.05, 0.95), material=mat("window", rough=0.1), verts=10)
    beans = cyl("BeansJar", 0.07, 0.12, loc=(0.9, 0.05, 0.96), material=mat("coffee"), verts=10)
    sign = box("Sign", (0.6, 0.04, 0.3), loc=(0, 0.3, 1.1), material=mat("plastic_black"), bevel=0.01)
    chalk = box("Chalk", (0.4, 0.045, 0.04), loc=(0, 0.28, 1.25), material=mat("plastic_white"))
    ob = join("coffee_bar_mesh", parts + [machine, jar, beans, sign, chalk] + cups)
    parent(ob, root)
    return root


def b_vending():
    root = empty("vending")
    body = box("Body", (0.8, 0.7, 1.7), loc=(0, 0, 0), material=mat("red", rough=0.4), bevel=0.03)
    glass = box("Glass", (0.5, 0.02, 1.1), loc=(-0.08, -0.35, 0.45), material=mat("window", rough=0.1, emit=0.3))
    rows = [box(f"Row{i}", (0.46, 0.03, 0.02), loc=(-0.08, -0.34, 0.6 + 0.25 * i), material=mat("metal_light")) for i in range(4)]
    snacks = [box(f"Snack{i}{j}", (0.08, 0.04, 0.1), loc=(-0.26 + 0.12 * j, -0.33, 0.62 + 0.25 * i), material=mat(["yellow", "teal", "orange", "pink"][(i + j) % 4])) for i in range(4) for j in range(4)]
    keypad = box("Keypad", (0.14, 0.03, 0.3), loc=(0.27, -0.35, 0.9), material=mat("plastic_black"))
    slot = box("Slot", (0.5, 0.03, 0.12), loc=(-0.08, -0.35, 0.18), material=mat("plastic_black"))
    ob = join("vending_mesh", [body, glass, keypad, slot] + rows + snacks)
    parent(ob, root)
    return root


# ---------------------------------------------------------------- level 3

def _phone(x, y, z, s=1.0, screen="screen"):
    stand = box("PStand", (0.1 * s, 0.08 * s, 0.03 * s), loc=(x, y + 0.02 * s, z), material=mat("plastic_black"))
    body = box("PBody", (0.1 * s, 0.02 * s, 0.19 * s), loc=(x, y, z + 0.03 * s), material=mat("plastic_black"), bevel=0.008)
    scr = box("PScreen", (0.085 * s, 0.004 * s, 0.16 * s), loc=(x, y - 0.012 * s, z + 0.045 * s), material=mat(screen, emit=1.3))
    kit.tilt([stand, body, scr], rx=0.25, pivot=(x, y, z))
    return [stand, body, scr]


def _bubble(x, y, z, w, color="plastic_white", emit=0.5):
    b = box("Bubble", (w, 0.03, 0.09), loc=(x, y, z), material=mat(color, emit=emit), bevel=0.025)
    tail = box("BTail", (0.03, 0.03, 0.04), loc=(x - w * 0.3, y, z - 0.03), material=mat(color, emit=emit), taper=0.2)
    return [b, tail]


def b_presenter():
    s = 1.45
    root, body, hz = person("presenter", "blue", "charcoal", "skin_2", "hair_dark", style="side", h=s)
    lanyard = box("Lanyard", (0.14 * s, 0.01 * s, 0.15 * s), loc=(0, -0.104 * s, 0.54 * s), material=mat("teal"), taper=0.5)
    acc = join("Props", [lanyard])
    parent(acc, root)
    arm = _arm(root, "R")
    arm.rotation_euler[0] = -1.7
    hp = _hand_world(arm, s)
    clicker = box("Clicker", (0.04 * s, 0.09 * s, 0.03 * s), loc=(hp.x, hp.y - 0.03 * s, hp.z - 0.01 * s), material=mat("plastic_black"))
    laser = cyl("Laser", 0.006 * s, 0.5 * s, loc=(hp.x, hp.y - 0.07 * s, hp.z), material=mat("red", emit=3.0), verts=6, rot=(math.pi / 2 - 0.1, 0, 0))
    _hold(root, "R", s, [clicker, laser])
    hl = _hand_world(_arm(root, "L"), s)
    laptop = box("Laptop", (0.05 * s, 0.32 * s, 0.24 * s), loc=(hl.x + 0.03 * s, hl.y, hl.z - 0.04 * s), material=mat("metal_light", metal=0.6, rough=0.4), bevel=0.006)
    _hold(root, "L", s, [laptop])
    return root


def b_projector_screen():
    """The screen on its stand. The slide (ScreenSlide) and a NO SIGNAL panel (ScreenNoSignal) are
    parts of their own: the game shows NO SIGNAL when the projector acts up."""
    root = empty("projector_screen")
    legs = [cyl(f"Leg{i}", 0.02, 1.5, loc=(x, 0.1, 0), material=mat("metal"), verts=6) for i, x in enumerate((-1.2, 1.2))]
    bar = box("Bar", (2.6, 0.08, 0.08), loc=(0, 0.1, 1.5), material=mat("metal"))
    cloth = box("Cloth", (2.4, 0.02, 1.0), loc=(0, 0.06, 0.45), material=mat("plastic_white", emit=0.2))
    ob = join("projector_screen_mesh", legs + [bar, cloth])
    parent(ob, root)
    slide = box("Slide", (1.9, 0.024, 0.7), loc=(0, 0.04, 0.6), material=mat("blue", emit=0.6))
    title = box("STitle", (1.2, 0.026, 0.1), loc=(-0.2, 0.035, 1.12), material=mat("plastic_white", emit=0.8))
    bars = [box(f"Chart{i}", (0.18, 0.026, 0.12 + 0.12 * i), loc=(-0.6 + i * 0.3, 0.035, 0.68), material=mat(["yellow", "orange", "teal", "pink"][i], emit=0.8)) for i in range(4)]
    parent(join("ScreenSlide", [slide, title] + bars), root)
    panel = box("NoSig", (2.2, 0.024, 0.9), loc=(0, 0.04, 0.5), material=mat("#1d3fb0", emit=0.9))
    words = _text("NoSigText", "NO SIGNAL", 0.2, (0, 0.025, 0.86), mat("plastic_white", emit=1.4))
    parent(join("ScreenNoSignal", [panel, words]), root)
    return root


def _text(name, body, size, loc, material):
    """Flat text, as a mesh, readable from -Y."""
    import bpy
    bpy.ops.object.text_add(location=loc)
    t = bpy.context.active_object
    t.data.body = body
    t.data.size = size
    t.data.align_x = "CENTER"
    t.data.align_y = "CENTER"
    t.data.extrude = 0.004
    t.rotation_euler = (math.pi / 2, 0, 0)
    bpy.ops.object.convert(target="MESH")
    t = bpy.context.active_object
    t.name = name
    t.data.materials.clear()
    t.data.materials.append(material)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return t


def b_meeting_table():
    root = empty("meeting_table")
    top = box("Top", (2.7, 1.5, 0.06), loc=(0, 0, 0.72), material=mat("wood_dark"), bevel=0.02)
    base = box("Base", (2.2, 0.4, 0.72), loc=(0, 0, 0), material=mat("metal"))
    parts = [top, base]
    for i in range(3):
        for side in (-1, 1):
            x = -0.9 + i * 0.9
            parts.append(box(f"Chair{i}{side}", (0.42, 0.42, 0.06), loc=(x, side * 1.0, 0.44), material=mat("charcoal"), bevel=0.02))
            parts.append(box(f"Back{i}{side}", (0.42, 0.06, 0.42), loc=(x, side * 1.2, 0.48), material=mat("charcoal"), bevel=0.02))
            parts.append(cyl(f"Post{i}{side}", 0.03, 0.44, loc=(x, side * 1.0, 0), material=mat("metal"), verts=6))
            parts += _laptop(x, side * 0.45, 0.78, rot=0.0 if side > 0 else math.pi)[:2]
    parts.append(cyl("Phone", 0.12, 0.04, loc=(0, 0, 0.78), material=mat("plastic_black"), verts=3))
    ob = join("meeting_table_mesh", parts)
    parent(ob, root)
    return root


# ---------------------------------------------------------------- level 4

TACK_COLS = ("red", "blue", "yellow", "teal", "pink")


def _tacks(x, y, z, n, spread, seed=1, s=1.0):
    """A little scatter of thumbtacks: coloured heads with a short pin under each."""
    out = []
    for i in range(n):
        a = (seed * 2.399 + i * 2.1) % TAU
        r = spread * (0.25 + ((seed * 7 + i * 13) % 10) / 13)
        px, py = x + math.cos(a) * r, y + math.sin(a) * r
        out.append(cyl(f"TackHead{seed}_{i}", 0.022 * s, 0.014 * s, loc=(px, py, z + 0.008 * s), material=mat(TACK_COLS[(seed + i) % 5], rough=0.4), verts=8))
        out.append(cyl(f"TackPin{seed}_{i}", 0.004 * s, 0.012 * s, loc=(px, py, z), material=mat("metal_light", metal=0.8, rough=0.3), verts=4))
    return out


def _corkboard(x, y, z, w, hgt, pins=8, seed=3):
    frame = box("CorkFrame", (w + 0.04, 0.03, hgt + 0.04), loc=(x, y, z), material=mat("wood_dark"), bevel=0.006)
    cork = box("Cork", (w, 0.032, hgt), loc=(x, y - 0.002, z + 0.02), material=mat("cardboard", rough=0.95))
    out = [frame, cork]
    for i in range(pins):
        px = x - w / 2 + 0.05 + ((seed * 5 + i * 7) % 10) / 10 * (w - 0.1)
        pz = z + 0.06 + ((seed * 3 + i * 11) % 10) / 10 * (hgt - 0.1)
        if i % 3 == 0:
            out.append(box(f"Note{i}", (0.08, 0.004, 0.08), loc=(px, y - 0.02, pz - 0.05), material=mat(["paper", "yellow", "pink"][i % 3])))
        out.append(ball(f"Pin{i}", 0.014, loc=(px, y - 0.024, pz), material=mat(TACK_COLS[i % 5], rough=0.4), subdiv=1))
    return out


def _kiosk(w=0.36, hgt=0.95, screen="screen", body="plastic_white", accent="teal"):
    base = box("KBase", (w + 0.14, w * 0.9, 0.06), loc=(0, 0.04, 0), material=mat("plastic_black"), bevel=0.01)
    post = box("KPost", (w, w * 0.6, hgt), loc=(0, 0.06, 0.06), material=mat(body, rough=0.4), bevel=0.03)
    band = box("KBand", (w + 0.005, w * 0.6 + 0.005, 0.06), loc=(0, 0.06, 0.06 + hgt * 0.62), material=mat(accent, rough=0.4))
    head = box("KHead", (w + 0.06, 0.08, w * 0.85), loc=(0, -0.02, 0.06 + hgt - 0.02), material=mat("plastic_black"), bevel=0.012)
    scr = box("KScreen", (w - 0.02, 0.006, w * 0.7), loc=(0, -0.062, 0.06 + hgt + 0.02), material=mat(screen, emit=1.3))
    kit.tilt([head, scr], rx=0.35, pivot=(0, 0.0, 0.06 + hgt))
    slot = box("KSlot", (0.16, 0.02, 0.02), loc=(0, -0.13, 0.06 + hgt * 0.5), material=mat("plastic_black"))
    return [base, post, band, head, scr, slot]


def b_impersonator():
    s = 1.0
    root, body, hz = person("impersonator", "charcoal", "charcoal", "skin_1", "hair_dark", style="side", h=s)
    shirt = box("ShirtV", (0.1, 0.012, 0.16), loc=(0, -0.104, 0.52), material=mat("plastic_white"), taper=0.4)
    tie = box("Tie", (0.035, 0.014, 0.15), loc=(0, -0.108, 0.5), material=mat("red"), taper=0.6)
    shades = box("Shades", (0.2, 0.025, 0.045), loc=(0, -0.122, hz - 0.015), material=mat("plastic_black", rough=0.2))
    tache = box("Moustache", (0.11, 0.02, 0.025), loc=(0, -0.124, hz - 0.075), material=mat("hair_dark"), bevel=0.008)
    badge = box("Badge", (0.06, 0.012, 0.04), loc=(0.08, -0.106, 0.6), material=mat("yellow", rough=0.3, metal=0.5))
    acc = join("Props", [shirt, tie, shades, tache, badge])
    parent(acc, root)
    arm = _arm(root, "R")
    arm.rotation_euler[0] = -0.9
    hp = _hand_world(arm, s)
    cards = [box(f"GiftCard{i}", (0.012, 0.09, 0.06), loc=(hp.x - 0.01 + i * 0.012, hp.y - 0.02, hp.z - 0.02 + i * 0.008), material=mat(["yellow", "pink", "teal"][i], emit=0.3)) for i in range(3)]
    _hold(root, "R", s, cards)
    return root


def b_cleaner():
    s = 1.45
    root, body, hz = person("cleaner", "blue", "blue", "skin_3", "hair_grey", style="short", h=s, arms_forward=-0.9)
    bib = box("Bib", (0.24 * s, 0.012 * s, 0.2 * s), loc=(0, -0.104 * s, 0.42 * s), material=mat("navy"))
    pocket = box("Pocket", (0.1 * s, 0.014 * s, 0.07 * s), loc=(0, -0.106 * s, 0.5 * s), material=mat("navy"))
    rag = box("Rag", (0.06 * s, 0.03 * s, 0.1 * s), loc=(0.1 * s, 0.1 * s, 0.25 * s), material=mat("yellow"))
    cap = cyl("Cap", 0.12 * s, 0.05 * s, loc=(0, 0.01 * s, hz + 0.075 * s), material=mat("navy"), verts=12)
    visor = box("Visor", (0.18 * s, 0.1 * s, 0.015 * s), loc=(0, -0.11 * s, hz + 0.075 * s), material=mat("navy"))
    # The cart he pushes: bucket, mop and a wet floor sign, out in front of him.
    cy = -0.5 * s
    frame = box("Cart", (0.42 * s, 0.34 * s, 0.05 * s), loc=(0, cy, 0.1 * s), material=mat("yellow", rough=0.5), bevel=0.01)
    wheels = [cyl(f"CWheel{i}", 0.04 * s, 0.03 * s, loc=(x * s, cy + y * s, 0.0), material=mat("plastic_black"), verts=8) for i, (x, y) in enumerate(((0.17, 0.13), (-0.17, 0.13), (0.17, -0.13), (-0.17, -0.13)))]
    bucket = cyl("Bucket", 0.12 * s, 0.2 * s, loc=(-0.06 * s, cy, 0.15 * s), material=mat("yellow", rough=0.5), verts=12, radius_top=0.14 * s)
    water = cyl("Water", 0.12 * s, 0.01 * s, loc=(-0.06 * s, cy, 0.32 * s), material=mat("window", rough=0.1), verts=12)
    mop = cyl("MopStick", 0.012 * s, 0.9 * s, loc=(-0.06 * s, cy, 0.25 * s), material=mat("metal_light", metal=0.6, rough=0.3), verts=6)
    head = cyl("MopHead", 0.07 * s, 0.1 * s, loc=(-0.06 * s, cy, 0.24 * s), material=mat("paper", rough=1.0), verts=10)
    handle = box("CHandle", (0.4 * s, 0.03 * s, 0.03 * s), loc=(0, cy + 0.2 * s, 0.5 * s), material=mat("metal"))
    hposts = [box(f"CPost{i}", (0.03 * s, 0.03 * s, 0.4 * s), loc=(x * s, cy + 0.17 * s, 0.12 * s), material=mat("metal")) for i, x in enumerate((-0.19, 0.19))]
    sign = box("CartSign", (0.16 * s, 0.02 * s, 0.22 * s), loc=(0.12 * s, cy - 0.06 * s, 0.15 * s), material=mat("yellow", rough=0.4), taper=0.7)
    acc = join("Props", [bib, pocket, rag, cap, visor, frame, bucket, water, mop, head, handle, sign] + wheels + hposts)
    parent(acc, root)
    return root


def b_food_counter():
    root = empty("food_counter")
    counter = box("Counter", (3.8, 0.75, 0.88), loc=(0, 0, 0), material=mat("metal_light", metal=0.5, rough=0.4), bevel=0.02)
    top = box("CTop", (3.9, 0.8, 0.04), loc=(0, 0, 0.88), material=mat("metal", metal=0.6, rough=0.3))
    rail = box("TrayRail", (3.9, 0.16, 0.03), loc=(0, -0.45, 0.78), material=mat("metal", metal=0.6, rough=0.3))
    guard = box("Guard", (3.6, 0.02, 0.36), loc=(0, -0.15, 1.12), material=mat("window", rough=0.05))
    kit.tilt([guard], rx=0.35, pivot=(0, -0.15, 1.12))
    gposts = [box(f"GPost{i}", (0.03, 0.03, 0.3), loc=(x, -0.05, 0.92), material=mat("metal")) for i, x in enumerate((-1.75, 0, 1.75))]
    parts = [counter, top, rail, guard] + gposts
    for i, (x, col) in enumerate(((-1.3, "orange"), (-0.45, "yellow"), (0.4, "red"), (1.25, "plant"))):
        parts.append(box(f"Pan{i}", (0.7, 0.45, 0.06), loc=(x, 0.05, 0.9), material=mat("metal_light", metal=0.7, rough=0.3)))
        parts.append(box(f"Food{i}", (0.62, 0.38, 0.03), loc=(x, 0.05, 0.94), material=mat(col, rough=0.9)))
    pot = cyl("SoupPot", 0.18, 0.28, loc=(1.6, 0.2, 0.92), material=mat("metal", metal=0.6, rough=0.3), verts=14)
    trays = [box(f"Tray{i}", (0.45, 0.32, 0.02), loc=(-1.7, -0.42, 0.81 + 0.022 * i), material=mat(["teal", "orange", "teal", "orange"][i])) for i in range(4)]
    menu = box("Menu", (1.2, 0.05, 0.5), loc=(0, 0.32, 1.45), material=mat("plastic_black"), bevel=0.01)
    lines = [box(f"MenuLine{i}", (0.8 - 0.15 * (i % 2), 0.055, 0.04), loc=(0, 0.3, 1.55 + 0.1 * i), material=mat("plastic_white", emit=0.6)) for i in range(3)]
    parts += [pot, menu] + trays + lines
    ob = join("food_counter_mesh", parts)
    parent(ob, root)
    return root


def b_canteen_table():
    root = empty("canteen_table")
    top = box("Top", (1.5, 0.8, 0.05), loc=(0, 0, 0.72), material=mat("plastic_white", rough=0.4), bevel=0.02)
    legs = [cyl(f"TLeg{i}", 0.03, 0.72, loc=(x, y, 0), material=mat("metal"), verts=6) for i, (x, y) in enumerate(((0.65, 0.3), (-0.65, 0.3), (0.65, -0.3), (-0.65, -0.3)))]
    parts = [top] + legs
    for side in (-1, 1):
        parts.append(box(f"Bench{side}", (1.5, 0.3, 0.05), loc=(0, side * 0.62, 0.42), material=mat("teal", rough=0.5), bevel=0.01))
        parts += [cyl(f"BLeg{side}{i}", 0.025, 0.42, loc=(x, side * 0.62, 0), material=mat("metal"), verts=6) for i, x in enumerate((-0.6, 0.6))]
    for i, (x, y, col) in enumerate(((-0.4, 0.18, "orange"), (0.35, -0.2, "teal"), (0.4, 0.2, "orange"))):
        parts.append(box(f"Tray{i}", (0.42, 0.3, 0.02), loc=(x, y, 0.77), material=mat(col)))
        parts.append(cyl(f"Plate{i}", 0.09, 0.015, loc=(x - 0.06, y, 0.79), material=mat("plastic_white"), verts=12))
        parts.append(ball(f"Food{i}", 0.05, loc=(x - 0.06, y, 0.8), material=mat(["yellow", "red", "plant"][i]), subdiv=1, scale=(1, 1, 0.5)))
        parts.append(cyl(f"Cup{i}", 0.03, 0.08, loc=(x + 0.12, y + 0.04, 0.79), material=mat("window", rough=0.1), verts=8))
    ob = join("canteen_table_mesh", parts)
    parent(ob, root)
    return root


def b_wet_floor():
    root = empty("wet_floor")
    puddle = cyl("Puddle", 0.42, 0.006, loc=(0, 0, 0.002), material=mat("window", rough=0.05), verts=20)
    puddle.data.transform(Matrix.Diagonal((1.0, 0.75, 1.0, 1.0)))
    kit.tilt([puddle], rz=0.3, pivot=(0, 0, 0))
    a = box("SignA", (0.3, 0.02, 0.5), loc=(0, -0.04, 0.0), material=mat("yellow", rough=0.4), taper=0.55)
    b = box("SignB", (0.3, 0.02, 0.5), loc=(0, 0.04, 0.0), material=mat("yellow", rough=0.4), taper=0.55)
    kit.tilt([a], rx=-0.22, pivot=(0, 0, 0.5))
    kit.tilt([b], rx=0.22, pivot=(0, 0, 0.5))
    icon_ = box("SignIcon", (0.1, 0.01, 0.14), loc=(0, -0.09, 0.18), material=mat("plastic_black"), taper=0.6)
    kit.tilt([icon_], rx=-0.22, pivot=(0, 0, 0.5))
    stripe = box("SignStripe", (0.24, 0.01, 0.03), loc=(0, -0.075, 0.36), material=mat("plastic_black"))
    kit.tilt([stripe], rx=-0.22, pivot=(0, 0, 0.5))
    ob = join("wet_floor_mesh", [puddle, a, b, icon_, stripe])
    parent(ob, root)
    return root


# ---------------------------------------------------------------- shredder: one look per path

def _shredder_base(head_col, body_col="plastic_black", w=0.44, d=0.32, h=0.42):
    body = box("Bin", (w - 0.02, d - 0.02, h), loc=(0, 0, 0), material=mat(body_col), bevel=0.02)
    head = box("Head", (w, d, 0.12), loc=(0, 0, h), material=mat(head_col, rough=0.5), bevel=0.02)
    slot = box("Slot", (w * 0.68, 0.02, 0.01), loc=(0, 0, h + 0.125), material=mat("plastic_black"))
    return [body, head, slot], h + 0.12


def _crumple(name, x, y, z, r=0.05):
    return ball(name, r, loc=(x, y, z), material=mat("paper", rough=1.0), subdiv=1, scale=(1.1, 0.9, 0.85))


def _padlock(x, y, z, s=1.0):
    shackle = cyl("Shackle", 0.03 * s, 0.05 * s, loc=(x, y, z + 0.06 * s), material=mat("metal_light", metal=0.8, rough=0.25), verts=8, radius_top=0.03 * s)
    body = box("Lock", (0.08 * s, 0.03 * s, 0.07 * s), loc=(x, y, z), material=mat("yellow", metal=0.6, rough=0.3), bevel=0.006)
    return [shackle, body]


# ---------------------------------------------------------------- level 2: the office kitchen

def b_fridge():
    root = empty("fridge")
    body = box("Body", (0.8, 0.7, 1.75), loc=(0, 0.02, 0), material=mat("#eceae4", rough=0.35), bevel=0.04)
    split = box("Split", (0.81, 0.71, 0.012), loc=(0, 0.02, 1.15), material=mat("metal_light", metal=0.5, rough=0.3))
    handles = [box(f"Handle{i}", (0.03, 0.04, h), loc=(-0.3, -0.35, z), material=mat("metal_light", metal=0.8, rough=0.25), bevel=0.008) for i, (z, h) in enumerate(((0.55, 0.45), (1.25, 0.3)))]
    notes = [box(f"Note{i}", (0.12, 0.006, 0.12), loc=(x, -0.335, z), material=mat(c), rot_z=r) for i, (x, z, c, r) in enumerate(((0.1, 1.35, "yellow", 0.1), (0.2, 0.9, "pink", -0.1), (0.05, 0.7, "plastic_white", 0.05)))]
    magnets = [ball(f"Magnet{i}", 0.015, loc=(x, -0.34, z + 0.1), material=mat(c), subdiv=1) for i, (x, z, c) in enumerate(((0.1, 1.35, "red"), (0.2, 0.9, "blue"), (0.05, 0.7, "teal")))]
    ob = join("fridge_mesh", [body, split] + handles + notes + magnets)
    parent(ob, root)
    return root


def b_kitchen_counter():
    """Four tiles of counter: cupboards, a sink with a tap, a microwave and a kettle."""
    root = empty("kitchen_counter")
    cab = box("Cabinet", (3.8, 0.62, 0.86), loc=(0, 0.05, 0), material=mat("#7e9aa8", rough=0.6), bevel=0.02)
    top = box("Top", (3.9, 0.7, 0.05), loc=(0, 0.04, 0.86), material=mat("#d8d2c4", rough=0.4), bevel=0.01)
    parts = [cab, top]
    for i in range(6):
        x = -1.6 + i * 0.64
        parts.append(box(f"Door{i}", (0.58, 0.01, 0.7), loc=(x, -0.265, 0.08), material=mat("#8eaab8", rough=0.6)))
        parts.append(box(f"Knob{i}", (0.1, 0.02, 0.02), loc=(x, -0.275, 0.68), material=mat("metal_light", metal=0.8, rough=0.3)))
    sink = box("Sink", (0.62, 0.42, 0.04), loc=(-0.6, 0.05, 0.875), material=mat("metal_light", metal=0.8, rough=0.2))
    basin = box("Basin", (0.52, 0.32, 0.02), loc=(-0.6, 0.05, 0.9), material=mat("metal", metal=0.7, rough=0.3))
    tap = cyl("Tap", 0.02, 0.28, loc=(-0.6, 0.27, 0.9), material=mat("metal_light", metal=0.9, rough=0.2), verts=8)
    spout = box("Spout", (0.03, 0.18, 0.03), loc=(-0.6, 0.19, 1.15), material=mat("metal_light", metal=0.9, rough=0.2))
    soap = cyl("Soap", 0.03, 0.12, loc=(-0.2, 0.25, 0.9), material=mat("teal", rough=0.3), verts=8)
    mw = box("Microwave", (0.62, 0.42, 0.36), loc=(0.85, 0.1, 0.9), material=mat("#2f3238", rough=0.45), bevel=0.02)
    mwdoor = box("MwDoor", (0.42, 0.01, 0.26), loc=(0.78, -0.115, 0.95), material=mat("window", rough=0.1, emit=0.15))
    mwpanel = box("MwPanel", (0.12, 0.01, 0.26), loc=(1.07, -0.115, 0.95), material=mat("plastic_black"))
    mwled = box("MwLed", (0.08, 0.012, 0.03), loc=(1.07, -0.12, 1.15), material=mat("plant", emit=2.0))
    kettle = cyl("Kettle", 0.09, 0.2, loc=(1.6, 0.05, 0.9), material=mat("plastic_white", rough=0.3), verts=12, radius_top=0.07)
    lid = cyl("KettleLid", 0.05, 0.03, loc=(1.6, 0.05, 1.1), material=mat("plastic_black"), verts=10)
    mugs = [cyl(f"Mug{i}", 0.04, 0.09, loc=(0.0 + i * 0.12, -0.12, 0.9), material=mat(c), verts=10) for i, c in enumerate(("red", "yellow", "blue"))]
    board = box("Board", (0.4, 0.26, 0.02), loc=(-1.45, 0.0, 0.9), material=mat("wood", rough=0.7))
    ob = join("kitchen_counter_mesh", parts + [sink, basin, tap, spout, soap, mw, mwdoor, mwpanel, mwled, kettle, lid, board] + mugs)
    parent(ob, root)
    return root


def b_high_table():
    """A standing table with three stools: two by two tiles."""
    root = empty("high_table")
    top = cyl("Top", 0.5, 0.05, loc=(0, 0, 1.0), material=mat("wood", rough=0.5), verts=28)
    leg = cyl("Leg", 0.05, 1.0, loc=(0, 0, 0), material=mat("metal", metal=0.6, rough=0.35), verts=10)
    foot = cyl("Foot", 0.28, 0.03, loc=(0, 0, 0), material=mat("metal", metal=0.6, rough=0.35), verts=20)
    parts = [top, leg, foot]
    for i in range(3):
        a = i * TAU / 3 + 0.4
        x, y = math.cos(a) * 0.72, math.sin(a) * 0.72
        parts.append(cyl(f"Seat{i}", 0.17, 0.05, loc=(x, y, 0.72), material=mat("orange", rough=0.6), verts=16))
        parts.append(cyl(f"Pole{i}", 0.025, 0.72, loc=(x, y, 0), material=mat("metal", metal=0.6, rough=0.35), verts=8))
        parts.append(cyl(f"Ring{i}", 0.13, 0.015, loc=(x, y, 0.3), material=mat("metal", metal=0.6, rough=0.35), verts=14))
    cups = [cyl(f"Cup{i}", 0.04, 0.1, loc=(x, y, 1.05), material=mat("plastic_white"), verts=10) for i, (x, y) in enumerate(((0.15, 0.1), (-0.2, -0.05)))]
    sleeves = [cyl(f"Sleeve{i}", 0.042, 0.04, loc=(x, y, 1.08), material=mat("cardboard"), verts=10) for i, (x, y) in enumerate(((0.15, 0.1), (-0.2, -0.05)))]
    ob = join("high_table_mesh", parts + cups + sleeves)
    parent(ob, root)
    return root


def b_kitchen_table():
    """A small round table with two chairs and somebody's lunch."""
    root = empty("kitchen_table")
    top = cyl("Top", 0.42, 0.04, loc=(0, 0, 0.72), material=mat("plastic_white", rough=0.4), verts=24)
    leg = cyl("Leg", 0.04, 0.72, loc=(0, 0, 0), material=mat("metal", metal=0.6, rough=0.35), verts=8)
    foot = cyl("Foot", 0.22, 0.02, loc=(0, 0, 0), material=mat("metal", metal=0.6, rough=0.35), verts=16)
    parts = [top, leg, foot]
    for i, a in enumerate((0.3, 0.3 + math.pi)):
        x, y = math.cos(a) * 0.6, math.sin(a) * 0.6
        parts.append(box(f"Seat{i}", (0.4, 0.4, 0.05), loc=(x, y, 0.44), material=mat("teal", rough=0.6), bevel=0.02))
        bx, by = math.cos(a) * 0.8, math.sin(a) * 0.8
        back = box(f"Back{i}", (0.4, 0.05, 0.4), loc=(bx, by, 0.48), material=mat("teal", rough=0.6), bevel=0.02)
        kit.tilt([back], rz=a + math.pi / 2, pivot=(bx, by, 0.48))
        parts.append(back)
        parts += [cyl(f"Post{i}{j}", 0.02, 0.44, loc=(x + dx, y + dy, 0), material=mat("metal"), verts=6) for j, (dx, dy) in enumerate(((0.15, 0.15), (-0.15, 0.15), (0.15, -0.15), (-0.15, -0.15)))]
    box_ = box("LunchBox", (0.22, 0.15, 0.08), loc=(0.1, 0.05, 0.76), material=mat("pink", rough=0.5), bevel=0.01)
    apple = ball("Apple", 0.05, loc=(-0.15, -0.1, 0.81), material=mat("red", rough=0.4), subdiv=2)
    ob = join("kitchen_table_mesh", parts + [box_, apple])
    parent(ob, root)
    return root


def b_recycle_bins():
    """Three bins for sorting, and a sign nobody reads."""
    root = empty("recycle_bins")
    parts = []
    for i, (x, col) in enumerate(((-0.3, "blue"), (0.0, "yellow"), (0.3, "plant"))):
        parts.append(box(f"Bin{i}", (0.27, 0.36, 0.55), loc=(x, 0.05, 0), material=mat(col, rough=0.5), bevel=0.02))
        parts.append(box(f"Lid{i}", (0.29, 0.38, 0.04), loc=(x, 0.05, 0.55), material=mat(col, rough=0.5), bevel=0.01))
        parts.append(box(f"Slot{i}", (0.16, 0.04, 0.01), loc=(x, -0.02, 0.59), material=mat("plastic_black")))
        parts.append(box(f"Label{i}", (0.16, 0.01, 0.1), loc=(x, -0.135, 0.36), material=mat("plastic_white")))
    sign = box("Sign", (0.6, 0.02, 0.25), loc=(0, 0.22, 0.75), material=mat("plastic_white", rough=0.5), bevel=0.01)
    post = box("SignPost", (0.04, 0.03, 0.75), loc=(0, 0.24, 0), material=mat("metal"))
    ob = join("recycle_bins_mesh", parts + [sign, post])
    parent(ob, root)
    return root


# ---------------------------------------------------------------- level 5: the boardroom

def _keyboard(x, y, z, w=0.42, d=0.15, rgb=False, name="Kb"):
    base = box(f"{name}Base", (w, d, 0.025), loc=(x, y, z), material=mat("plastic_black"), bevel=0.006)
    keys = []
    cols = max(6, int(w / 0.045))
    for r in range(3):
        for c in range(cols):
            col = ["red", "orange", "yellow", "plant", "teal", "blue", "pink"][(c + r) % 7] if rgb else "charcoal"
            keys.append(box(f"{name}K{r}{c}", (w / cols * 0.8, d / 3 * 0.75, 0.012), loc=(x - w / 2 + (c + 0.5) * w / cols, y - d / 2 + (r + 0.5) * d / 3, z + 0.025), material=mat(col, rough=0.5, emit=0.6 if rgb else 0.0)))
    return [base] + keys


def _flying_keys(h, seed=0):
    out = []
    for i, (x, y, z) in enumerate(((-0.2, -0.2, 0.22), (0.18, -0.25, 0.3), (0.02, -0.32, 0.38), (-0.08, -0.15, 0.45))):
        k = box(f"Fly{seed}{i}", (0.035, 0.035, 0.02), loc=(x, y, h + z), material=mat(["charcoal", "red", "yellow", "teal"][(i + seed) % 4] if seed else "charcoal"))
        kit.tilt([k], rx=0.5 * i, rz=0.7 * i)
        out.append(k)
    return out


def _chair(seat_col, back_col, arms=False, racing=False, s=1.0):
    parts = []
    for i in range(5):
        a = i * TAU / 5
        parts.append(box(f"Leg{i}", (0.05 * s, 0.26 * s, 0.03 * s), loc=(math.sin(a) * 0.12 * s, -math.cos(a) * 0.12 * s, 0.04 * s), material=mat("plastic_black"), rot_z=a))
        parts.append(ball(f"Castor{i}", 0.03 * s, loc=(math.sin(a) * 0.25 * s, -math.cos(a) * 0.25 * s, 0.03 * s), material=mat("charcoal"), subdiv=1))
    parts.append(cyl("Gas", 0.03 * s, 0.3 * s, loc=(0, 0, 0.06 * s), material=mat("metal_light", metal=0.7, rough=0.3), verts=10))
    parts.append(box("Seat", (0.42 * s, 0.42 * s, 0.08 * s), loc=(0, 0, 0.36 * s), material=mat(seat_col, rough=0.6), bevel=0.03 * s))
    back_h = 0.62 if racing else 0.42
    back = box("Back", (0.4 * s, 0.07 * s, back_h * s), loc=(0, 0.2 * s, 0.44 * s), material=mat(back_col, rough=0.6), bevel=0.03 * s, taper=0.9)
    kit.tilt([back], rx=-0.12, pivot=(0, 0.2 * s, 0.44 * s))
    parts.append(back)
    if racing:
        for side in (-1, 1):
            wing = box(f"Wing{side}", (0.06 * s, 0.1 * s, 0.3 * s), loc=(side * 0.2 * s, 0.17 * s, 0.75 * s), material=mat("red", rough=0.5), bevel=0.02 * s)
            parts.append(wing)
        parts.append(box("Stripe", (0.08 * s, 0.075 * s, back_h * s * 0.9), loc=(0, 0.2 * s, 0.46 * s), material=mat("red", rough=0.5)))
    if arms or racing:
        for side in (-1, 1):
            parts.append(box(f"ArmPost{side}", (0.03 * s, 0.03 * s, 0.18 * s), loc=(side * 0.22 * s, 0.02 * s, 0.42 * s), material=mat("plastic_black")))
            parts.append(box(f"ArmPad{side}", (0.06 * s, 0.26 * s, 0.03 * s), loc=(side * 0.22 * s, 0.02 * s, 0.6 * s), material=mat("plastic_black"), bevel=0.01 * s))
    return parts


def b_keyboard_barrier():
    """The keyboard lying across the walkway. Long side along x; turned in the game."""
    root = empty("keyboard_barrier")
    parts = _keyboard(0, 0, 0, w=0.95, d=0.32, rgb=False, name="Bar")
    parts.append(box("Cable", (0.02, 0.3, 0.015), loc=(0.2, 0.3, 0.0), material=mat("plastic_black"), rot_z=0.3))
    ob = join("keyboard_barrier_mesh", parts)
    parent(ob, root)
    return root


def b_linemanager():
    s = 1.5
    root, body, hz = person("linemanager", "navy", "charcoal", "skin_1", "hair_brown", style="side", h=s)
    shirt = box("ShirtV", (0.1 * s, 0.012 * s, 0.16 * s), loc=(0, -0.104 * s, 0.52 * s), material=mat("plastic_white"), taper=0.4)
    tie = box("Tie", (0.035 * s, 0.014 * s, 0.15 * s), loc=(0, -0.108 * s, 0.5 * s), material=mat("#8e6fbf"), taper=0.6)
    glasses = box("Glasses", (0.17 * s, 0.02 * s, 0.03 * s), loc=(0, -0.125 * s, hz), material=mat("plastic_black"))
    badge = box("Badge", (0.06 * s, 0.012 * s, 0.08 * s), loc=(0.09 * s, -0.106 * s, 0.56 * s), material=mat("plastic_white"))
    acc = join("Props", [shirt, tie, glasses, badge])
    parent(acc, root)
    arm = _arm(root, "R")
    arm.rotation_euler[0] = -0.9
    hp = _hand_world(arm, s)
    board = box("Clipboard", (0.02 * s, 0.22 * s, 0.28 * s), loc=(hp.x, hp.y - 0.02 * s, hp.z - 0.18 * s), material=mat("wood", rough=0.6))
    paper = box("Paper", (0.022 * s, 0.18 * s, 0.22 * s), loc=(hp.x - 0.002 * s, hp.y - 0.02 * s, hp.z - 0.16 * s), material=mat("paper"))
    clip = box("Clip", (0.025 * s, 0.08 * s, 0.03 * s), loc=(hp.x, hp.y - 0.02 * s, hp.z + 0.08 * s), material=mat("metal_light", metal=0.8))
    _hold(root, "R", s, [board, paper, clip])
    hl = _hand_world(_arm(root, "L"), s)
    mug = cyl("Mug", 0.045 * s, 0.1 * s, loc=(hl.x, hl.y - 0.05 * s, hl.z - 0.06 * s), material=mat("plastic_white"), verts=10)
    _hold(root, "L", s, [mug])
    return root


def b_finalreview():
    """Your Line Manager, 360: a charcoal suit, a tablet, and a ring of feedback all round him."""
    s = 1.55
    root, body, hz = person("finalreview", "charcoal", "charcoal", "skin_1", "hair_grey", style="side", h=s)
    shirt = box("ShirtV", (0.1 * s, 0.012 * s, 0.16 * s), loc=(0, -0.104 * s, 0.52 * s), material=mat("plastic_white"), taper=0.4)
    tie = box("Tie", (0.035 * s, 0.014 * s, 0.15 * s), loc=(0, -0.108 * s, 0.5 * s), material=mat("red"), taper=0.6)
    glasses = box("Glasses", (0.17 * s, 0.02 * s, 0.03 * s), loc=(0, -0.125 * s, hz), material=mat("yellow", metal=0.6))
    ring = [box(f"Feedback{i}", (0.16 * s, 0.03 * s, 0.025 * s), loc=(0.42 * s * math.cos(a), 0.42 * s * math.sin(a), 0.5 * s), material=mat("teal", emit=1.2), rot_z=a + math.pi / 2) for i, a in enumerate([k * TAU / 16 for k in range(16)])]
    stars = [box(f"Star{i}", (0.05 * s, 0.05 * s, 0.05 * s), loc=(0.42 * s * math.cos(a), 0.42 * s * math.sin(a), 0.53 * s), material=mat("yellow", emit=1.4), rot_z=a) for i, a in enumerate([k * TAU / 5 for k in range(5)])]
    acc = join("Props", [shirt, tie, glasses] + ring + stars)
    parent(acc, root)
    arm = _arm(root, "R")
    arm.rotation_euler[0] = -0.9
    hp = _hand_world(arm, s)
    tab = box("Tablet", (0.02 * s, 0.22 * s, 0.3 * s), loc=(hp.x, hp.y - 0.02 * s, hp.z - 0.18 * s), material=mat("plastic_black"), bevel=0.01)
    scr = box("TabletScreen", (0.022 * s, 0.18 * s, 0.24 * s), loc=(hp.x - 0.002 * s, hp.y - 0.02 * s, hp.z - 0.16 * s), material=mat("teal", emit=1.0))
    _hold(root, "R", s, [tab, scr])
    return root


def b_boardroom_table():
    """Nine by three tiles: a long dark table with leather chairs, glasses and notepads."""
    root = empty("boardroom_table")
    top = box("Top", (8.4, 2.2, 0.08), loc=(0, 0, 0.74), material=mat("#4a3628", rough=0.35), bevel=0.04)
    inlay = box("Inlay", (7.6, 1.5, 0.005), loc=(0, 0, 0.82), material=mat("#5d4533", rough=0.3))
    legs = [box(f"Pedestal{i}", (0.7, 0.9, 0.74), loc=(x, 0, 0), material=mat("#3a2a1f", rough=0.5)) for i, x in enumerate((-3.0, 0.0, 3.0))]
    parts = [top, inlay] + legs
    for i in range(5):
        x = -3.2 + i * 1.6
        for side in (-1, 1):
            cy = side * 1.35
            parts.append(box(f"Seat{i}{side}", (0.5, 0.5, 0.1), loc=(x, cy, 0.42), material=mat("#2a2420", rough=0.45), bevel=0.04))
            parts.append(box(f"Back{i}{side}", (0.5, 0.12, 0.6), loc=(x, cy + side * 0.25, 0.5), material=mat("#2a2420", rough=0.45), bevel=0.04))
            parts.append(cyl(f"Gas{i}{side}", 0.035, 0.42, loc=(x, cy, 0), material=mat("metal_light", metal=0.7), verts=8))
            parts.append(cyl(f"Glass{i}{side}", 0.035, 0.11, loc=(x + 0.3, side * 0.75, 0.82), material=mat("window", rough=0.05), verts=8))
            parts.append(box(f"Pad{i}{side}", (0.3, 0.4, 0.015), loc=(x - 0.1, side * 0.7, 0.82), material=mat("paper"), rot_z=0.1 * side))
    parts.append(box("Jug", (0.15, 0.15, 0.25), loc=(0, 0, 0.82), material=mat("window", rough=0.05)))
    parts.append(cyl("Phone", 0.16, 0.05, loc=(1.6, 0, 0.82), material=mat("plastic_black"), verts=3))
    ob = join("boardroom_table_mesh", parts)
    parent(ob, root)
    return root


def b_sideboard():
    root = empty("sideboard")
    body = box("Body", (1.8, 0.5, 0.8), loc=(0, 0.1, 0), material=mat("#4a3628", rough=0.4), bevel=0.02)
    doors = [box(f"Door{i}", (0.42, 0.01, 0.6), loc=(-0.66 + i * 0.44, -0.155, 0.1), material=mat("#5d4533", rough=0.4)) for i in range(4)]
    bottles = [cyl(f"Bottle{i}", 0.04, 0.26, loc=(-0.6 + i * 0.12, 0.1, 0.8), material=mat("window", rough=0.05), verts=10) for i in range(4)]
    caps = [cyl(f"Cap{i}", 0.02, 0.03, loc=(-0.6 + i * 0.12, 0.1, 1.06), material=mat("blue"), verts=8) for i in range(4)]
    thermos = cyl("Thermos", 0.08, 0.32, loc=(0.4, 0.1, 0.8), material=mat("metal", metal=0.7, rough=0.3), verts=12)
    cups = [cyl(f"Cup{i}", 0.04, 0.07, loc=(0.6 + i * 0.1, 0.0, 0.8), material=mat("plastic_white"), verts=10) for i in range(3)]
    ob = join("sideboard_mesh", [body] + doors + bottles + caps + [thermos] + cups)
    parent(ob, root)
    return root


# ---------------------------------------------------------------- level 6: working from home

def _envelope_fan(x, y, z, n, spread, seed=0):
    out = []
    for i in range(n):
        a = -spread / 2 + spread * i / max(1, n - 1)
        r = 0.18 + (i % 3) * 0.05
        ex, ez = x + math.sin(a) * r, z + 0.12 + math.cos(a) * r * 0.8
        env = box(f"Env{seed}_{i}", (0.12, 0.012, 0.08), loc=(ex, y, ez), material=mat(["paper", "pink", "paper"][i % 3], emit=0.2))
        kit.tilt([env], ry=a, pivot=(ex, y, ez + 0.04))
        flap = box(f"Flap{seed}_{i}", (0.12, 0.014, 0.025), loc=(ex, y - 0.001, ez + 0.055), material=mat("pink"), taper=0.3)
        kit.tilt([flap], ry=a, pivot=(ex, y, ez + 0.04))
        out += [env, flap]
    return out


def b_coldcaller():
    s = 1.0
    # He does not read email, he calls: a khaki suit, a big headset and a box of index cards with
    # everyone's number. Nothing like The New Hire's teal shirt.
    root, body, hz = person("coldcaller", "khaki", "navy", "skin_2", "hair_blond", style="side", h=s)
    lapels = [box(f"Lapel{i}", (0.06, 0.012, 0.18), loc=(x, -0.104, 0.5), material=mat("#8a7a52"), taper=0.5) for i, x in enumerate((-0.05, 0.05))]
    shirt = box("ShirtV", (0.06, 0.011, 0.14), loc=(0, -0.103, 0.53), material=mat("plastic_white"), taper=0.4)
    band = box("Band", (0.29, 0.035, 0.035), loc=(0, 0.01, hz + 0.13), material=mat("red"))
    cups = [ball(f"Cup{i}", 0.05, loc=(x, 0, hz), material=mat("red"), subdiv=1) for i, x in enumerate((-0.135, 0.135))]
    mic = box("Mic", (0.02, 0.14, 0.02), loc=(-0.12, -0.09, hz - 0.07), material=mat("plastic_black"))
    tip = ball("MicTip", 0.022, loc=(-0.1, -0.16, hz - 0.07), material=mat("red"), subdiv=1)
    acc = join("Props", lapels + [shirt, band, mic, tip] + cups)
    parent(acc, root)
    hp = _hand_world(_arm(root, "R"), s)
    rolo = box("CardBox", (0.16, 0.12, 0.1), loc=(hp.x, hp.y - 0.03, hp.z - 0.06), material=mat("charcoal"), bevel=0.01)
    cards = [box(f"Card{i}", (0.13, 0.008, 0.07), loc=(hp.x, hp.y - 0.07 + i * 0.02, hp.z + 0.02), material=mat("plastic_white" if i % 2 else "yellow")) for i in range(4)]
    _hold(root, "R", s, [rolo] + cards)
    return root


def b_baby():
    s = 1.0
    root = empty("baby")
    yellow = mat("yellow", rough=0.7)
    skin = mat("skin_1")
    body = box("Body", (0.34, 0.26, 0.3), loc=(0, 0, 0.16), material=yellow, bevel=0.08)
    head = ball("Head", 0.17, loc=(0, -0.02, 0.6), material=skin, subdiv=2, scale=(1, 0.95, 1.0))
    tuft = ball("Tuft", 0.04, loc=(0, 0, 0.79), material=mat("hair_blond"), subdiv=1, scale=(1, 1, 1.6))
    eyes = [box(f"Eye{i}", (0.03, 0.01, 0.035), loc=(x, -0.17, 0.62), material=mat("plastic_black")) for i, x in enumerate((-0.06, 0.06))]
    paci = cyl("Pacifier", 0.045, 0.02, loc=(0, -0.2, 0.53), material=mat("pink", rough=0.4), verts=14, rot=(math.pi / 2, 0, 0))
    ring = cyl("PaciRing", 0.03, 0.012, loc=(0, -0.22, 0.53), material=mat("teal"), verts=12, rot=(math.pi / 2, 0, 0))
    bib = box("Bib", (0.18, 0.01, 0.12), loc=(0, -0.13, 0.33), material=mat("plastic_white"), bevel=0.02)
    parts = [body, head, tuft, paci, ring, bib] + eyes
    ob = join("Body", parts)
    parent(ob, root)
    for side, x in (("L", 0.09), ("R", -0.09)):
        leg = box(f"Leg{side}", (0.11, 0.13, 0.16), loc=(x, 0, 0), material=yellow, bevel=0.03)
        parent(leg, root)
        set_origin(leg, (x, 0, 0.16))
    for side, x in (("L", 0.2), ("R", -0.2)):
        arm = box(f"Arm{side}", (0.08, 0.08, 0.2), loc=(x, 0, 0.2), material=yellow, bevel=0.03)
        hand = ball(f"Hand{side}", 0.045, loc=(x, 0, 0.2), material=skin, subdiv=1)
        parts2 = [arm, hand]
        if side == "R":
            parts2.append(cyl("Rattle", 0.012, 0.1, loc=(x, -0.02, 0.1), material=mat("plastic_white"), verts=6))
            parts2.append(ball("RattleTop", 0.04, loc=(x, -0.02, 0.08), material=mat("red"), subdiv=1))
        a = join(f"Arm{side}", parts2)
        set_origin(a, (x, 0, 0.4))
        parent(a, root)
    return root


def b_sofa():
    root = empty("sofa")
    base = box("Base", (1.8, 0.8, 0.4), loc=(0, 0.05, 0.06), material=mat("#5d7a99", rough=0.8), bevel=0.04)
    back = box("Back", (1.8, 0.22, 0.45), loc=(0, 0.35, 0.36), material=mat("#5d7a99", rough=0.8), bevel=0.05)
    arms = [box(f"Arm{i}", (0.2, 0.8, 0.3), loc=(x, 0.05, 0.36), material=mat("#56718e", rough=0.8), bevel=0.05) for i, x in enumerate((-0.85, 0.85))]
    cushions = [box(f"Cushion{i}", (0.72, 0.6, 0.12), loc=(x, -0.02, 0.46), material=mat("#6c8bab", rough=0.85), bevel=0.04) for i, x in enumerate((-0.37, 0.37))]
    pillow = box("Pillow", (0.3, 0.12, 0.28), loc=(-0.55, 0.18, 0.55), material=mat("yellow", rough=0.8), bevel=0.05)
    feet = [cyl(f"Foot{i}", 0.03, 0.06, loc=(x, y, 0), material=mat("wood_dark"), verts=8) for i, (x, y) in enumerate(((0.8, 0.35), (-0.8, 0.35), (0.8, -0.3), (-0.8, -0.3)))]
    ob = join("sofa_mesh", [base, back, pillow] + arms + cushions + feet)
    parent(ob, root)
    return root


def b_tv_stand():
    root = empty("tv_stand")
    cab = box("Cabinet", (1.7, 0.45, 0.42), loc=(0, 0.1, 0), material=mat("wood", rough=0.6), bevel=0.02)
    doors = [box(f"Door{i}", (0.8, 0.01, 0.32), loc=(x, -0.125, 0.05), material=mat("wood_dark", rough=0.6)) for i, x in enumerate((-0.42, 0.42))]
    stand = box("TvStand", (0.3, 0.2, 0.04), loc=(0, 0.12, 0.42), material=mat("plastic_black"))
    neck = box("TvNeck", (0.06, 0.04, 0.15), loc=(0, 0.14, 0.44), material=mat("plastic_black"))
    tv = box("Tv", (1.3, 0.05, 0.75), loc=(0, 0.14, 0.58), material=mat("plastic_black"), bevel=0.01)
    screen = box("Screen", (1.22, 0.006, 0.67), loc=(0, 0.112, 0.62), material=mat("blue", emit=0.8))
    call = [box(f"Tile{i}{j}", (0.28, 0.008, 0.14), loc=(-0.45 + i * 0.3, 0.108, 0.68 + j * 0.18), material=mat(["skin_1", "skin_2", "teal", "orange"][(i + j) % 4], emit=0.6)) for i in range(4) for j in range(3)]
    ob = join("tv_stand_mesh", [cab, stand, neck, tv, screen] + doors + call)
    parent(ob, root)
    return root


def b_bed():
    root = empty("bed")
    frame = box("Frame", (1.7, 1.9, 0.3), loc=(0, 0, 0.05), material=mat("wood", rough=0.6), bevel=0.03)
    head = box("Headboard", (1.7, 0.1, 0.7), loc=(0, 0.95, 0.05), material=mat("wood_dark", rough=0.6), bevel=0.03)
    mattress = box("Mattress", (1.6, 1.8, 0.16), loc=(0, -0.02, 0.35), material=mat("plastic_white", rough=0.9), bevel=0.04)
    duvet = box("Duvet", (1.62, 1.2, 0.08), loc=(0, -0.3, 0.48), material=mat("#8e6fbf", rough=0.9), bevel=0.04)
    pillows = [box(f"Pillow{i}", (0.6, 0.35, 0.12), loc=(x, 0.65, 0.5), material=mat("plastic_white", rough=0.9), bevel=0.05) for i, x in enumerate((-0.38, 0.38))]
    laptop = _laptop(0.3, -0.3, 0.56)[:2]
    ob = join("bed_mesh", [frame, head, mattress, duvet] + pillows + laptop)
    parent(ob, root)
    return root


def b_bookshelf():
    root = empty("bookshelf")
    body = box("Body", (0.8, 0.35, 1.6), loc=(0, 0.1, 0), material=mat("wood", rough=0.6), bevel=0.01)
    back = box("Back", (0.76, 0.02, 1.56), loc=(0, 0.26, 0.02), material=mat("wood_dark"))
    parts = [body, back]
    for r in range(4):
        z = 0.08 + r * 0.38
        parts.append(box(f"Shelf{r}", (0.74, 0.32, 0.03), loc=(0, 0.08, z), material=mat("wood_dark")))
        x = -0.32
        i = 0
        while x < 0.3:
            w = 0.05 + ((r * 7 + i * 3) % 4) * 0.015
            hgt = 0.22 + ((r + i) % 3) * 0.04
            parts.append(box(f"Book{r}_{i}", (w, 0.24, hgt), loc=(x + w / 2, 0.05, z + 0.03), material=mat(["red", "blue", "yellow", "teal", "pink", "orange", "navy"][(r * 3 + i) % 7], rough=0.7)))
            x += w + 0.01
            i += 1
    ob = join("bookshelf_mesh", parts)
    parent(ob, root)
    return root


def b_cat():
    """A cat asleep on a cushion, right where you wanted to put something."""
    root = empty("cat")
    cushion = cyl("Cushion", 0.32, 0.08, loc=(0, 0, 0), material=mat("#c96a3d", rough=0.9), verts=20)
    fur = mat("#3b3f46", rough=0.9)
    body = ball("CatBody", 0.18, loc=(0, 0.02, 0.16), material=fur, subdiv=2, scale=(1.2, 0.9, 0.6))
    head = ball("CatHead", 0.1, loc=(0.16, -0.08, 0.2), material=fur, subdiv=2)
    ears = [box(f"Ear{i}", (0.05, 0.03, 0.06), loc=(0.16 + dx, -0.08, 0.27), material=fur, taper=0.1) for i, dx in enumerate((-0.05, 0.05))]
    tail = cyl("Tail", 0.03, 0.3, loc=(-0.2, -0.05, 0.1), material=fur, verts=8, rot=(0, math.pi / 2, 0.6))
    eyes = [box(f"CatEye{i}", (0.03, 0.01, 0.006), loc=(0.16 + dx, -0.175, 0.21), material=mat("plastic_white")) for i, dx in enumerate((-0.03, 0.03))]
    ob = join("cat_mesh", [cushion, body, head, tail] + ears + eyes)
    parent(ob, root)
    return root


# ---------------------------------------------------------------- level 7: the car park

def _tray(x, y, z, col="charcoal", folders=2, seed=0):
    tray = box(f"Tray{seed}", (0.3, 0.22, 0.06), loc=(x, y, z), material=mat(col), bevel=0.005)
    out = [tray]
    for i in range(folders):
        out.append(box(f"Folder{seed}_{i}", (0.26, 0.2, 0.012), loc=(x, y, z + 0.015 + i * 0.014), material=mat(["yellow", "blue", "red", "teal"][(i + seed) % 4])))
    return out


def b_phonecaller():
    s = 1.0
    root, body, hz = person("phonecaller", "orange", "denim", "skin_3", "hair_brown", style="side", h=s,
                            arms_forward=-1.2)
    tie = box("Tie", (0.035, 0.014, 0.15), loc=(0, -0.108, 0.5), material=mat("navy"), taper=0.6)
    acc = join("Props", [tie])
    parent(acc, root)
    # On speaker: a three-legged conference phone held out in front, the call going out in waves.
    hl = _hand_world(_arm(root, "L"), s)
    hr = _hand_world(_arm(root, "R"), s)
    cx, cy, cz = (hl.x + hr.x) / 2, min(hl.y, hr.y) - 0.02, max(hl.z, hr.z) + 0.02
    legs = [box(f"Lobe{i}", (0.07, 0.13, 0.025), loc=(cx + 0.06 * math.sin(a), cy - 0.06 * math.cos(a), cz), material=mat("charcoal"), bevel=0.01, rot_z=a) for i, a in enumerate((0, 2.1, 4.2))]
    hub = cyl("Hub", 0.05, 0.035, loc=(cx, cy, cz), material=mat("plastic_black"), verts=12)
    light = cyl("HubLight", 0.02, 0.008, loc=(cx, cy, cz + 0.035), material=mat("plant", emit=2.0), verts=10)
    waves = [box(f"Wave{i}", (0.12 + 0.07 * i, 0.012, 0.012), loc=(cx, cy - 0.12 - 0.05 * i, cz + 0.12 + 0.04 * i), material=mat("orange", emit=1.0)) for i in range(3)]
    _hold(root, "L", s, legs + [hub, light] + waves)
    return root


def b_smoker():
    s = 1.5
    root, body, hz = person("smoker", "#6c7480", "charcoal", "skin_1", "hair_grey", style="side", h=s)
    coat = box("Coat", (0.36 * s, 0.22 * s, 0.4 * s), loc=(0, 0, 0.22 * s), material=mat("#6c7480", rough=0.8), bevel=0.02, taper=0.95)
    scarf = box("Scarf", (0.22 * s, 0.2 * s, 0.05 * s), loc=(0, 0, 0.68 * s), material=mat("red", rough=0.8), bevel=0.01)
    acc = join("Props", [coat, scarf])
    parent(acc, root)
    arm = _arm(root, "R")
    arm.rotation_euler[0] = -1.9
    hp = _hand_world(arm, s)
    cig = cyl("Cigarette", 0.008 * s, 0.07 * s, loc=(hp.x, hp.y - 0.03 * s, hp.z), material=mat("plastic_white"), verts=6, rot=(math.pi / 2, 0, 0))
    tip = ball("Ember", 0.01 * s, loc=(hp.x, hp.y - 0.1 * s, hp.z), material=mat("orange", emit=3.0), subdiv=1)
    # The smoke rises from the cigarette, well clear of his head.
    puffs = [ball(f"Puff{i}", 0.05 * s * (1 + i * 0.5), loc=(hp.x - 0.04 * s * i, hp.y - 0.12 * s - 0.04 * s * i, hp.z + 0.1 * s + i * 0.14 * s), material=mat("#d9dde3", rough=1.0), subdiv=2) for i in range(3)]
    _hold(root, "R", s, [cig, tip] + puffs)
    return root


def _car(name, body_col, w=1.8, d=0.85, cab_h=0.32, van=False):
    root = empty(name)
    hgt = 0.62 if van else 0.35
    body = box("Body", (w, d, hgt), loc=(0, 0, 0.12), material=mat(body_col, rough=0.35, metal=0.2), bevel=0.06)
    parts = [body]
    if van:
        cab = box("Cab", (0.45, d * 0.96, 0.28), loc=(-w / 2 + 0.25, 0, 0.12 + hgt), material=mat(body_col, rough=0.35, metal=0.2), bevel=0.05)
        windshield = box("Windshield", (0.02, d * 0.8, 0.22), loc=(-w / 2 + 0.03, 0, 0.12 + hgt + 0.02), material=mat("window", rough=0.1))
        parts += [cab, windshield]
        parts.append(box("Stripe", (w * 0.7, 0.01, 0.08), loc=(0.15, -d / 2 - 0.002, 0.45), material=mat("yellow")))
    else:
        cab = box("Cab", (w * 0.55, d * 0.9, cab_h), loc=(0.05, 0, 0.12 + hgt), material=mat(body_col, rough=0.35, metal=0.2), bevel=0.06, taper=0.85)
        glass = box("Glass", (w * 0.56, d * 0.92, cab_h * 0.6), loc=(0.05, 0, 0.12 + hgt + 0.06), material=mat("window", rough=0.1), taper=0.85)
        parts += [cab, glass]
    for i, (x, y) in enumerate(((w / 2 - 0.3, d / 2), (-w / 2 + 0.3, d / 2), (w / 2 - 0.3, -d / 2), (-w / 2 + 0.3, -d / 2))):
        parts.append(cyl(f"Wheel{i}", 0.14, 0.12, loc=(x, y - 0.06 if y > 0 else y - 0.06, 0.14), material=mat("plastic_black"), verts=14, rot=(math.pi / 2, 0, 0)))
    for i, y in enumerate((-d * 0.3, d * 0.3)):
        parts.append(box(f"Light{i}", (0.02, 0.14, 0.06), loc=(-w / 2 - 0.005, y, 0.3), material=mat("yellow", emit=1.2)))
        parts.append(box(f"Rear{i}", (0.02, 0.14, 0.06), loc=(w / 2 + 0.005, y, 0.3), material=mat("red", emit=1.0)))
    ob = join(f"{name}_mesh", parts)
    parent(ob, root)
    return root


def b_car():
    return _car("car", "#3e7cc9")


def b_van():
    return _car("van", "#eeeeea", w=1.9, d=0.9, van=True)


def b_ticket_machine():
    root = empty("ticket_machine")
    post = box("Post", (0.4, 0.3, 1.2), loc=(0, 0, 0), material=mat("yellow", rough=0.5), bevel=0.03)
    screen = box("Screen", (0.26, 0.02, 0.16), loc=(0, -0.16, 0.9), material=mat("screen", emit=1.2))
    slot = box("Slot", (0.14, 0.03, 0.03), loc=(0, -0.16, 0.7), material=mat("plastic_black"))
    btn = box("Button", (0.08, 0.03, 0.08), loc=(0, -0.16, 0.55), material=mat("red", emit=0.8))
    roof = box("Roof", (0.5, 0.4, 0.05), loc=(0, 0, 1.2), material=mat("charcoal"))
    ob = join("ticket_machine_mesh", [post, screen, slot, btn, roof])
    parent(ob, root)
    return root


def b_lamp_post():
    root = empty("lamp_post")
    base = cyl("Base", 0.12, 0.1, loc=(0, 0, 0), material=mat("charcoal"), verts=12)
    pole = cyl("Pole", 0.04, 2.2, loc=(0, 0, 0.1), material=mat("metal", metal=0.6, rough=0.4), verts=10)
    arm = box("Arm", (0.06, 0.4, 0.05), loc=(0, -0.18, 2.25), material=mat("metal", metal=0.6))
    head = box("Head", (0.22, 0.3, 0.08), loc=(0, -0.38, 2.2), material=mat("charcoal"), bevel=0.02)
    lamp = box("Lamp", (0.18, 0.24, 0.02), loc=(0, -0.38, 2.18), material=mat("yellow", emit=3.0))
    ob = join("lamp_post_mesh", [base, pole, arm, head, lamp])
    parent(ob, root)
    return root


# ---------------------------------------------------------------- Reception (level 1)

def _metal():
    return mat("metal", metal=0.6, rough=0.35)


def _glass(emit=0.12):
    return mat("window", rough=0.08, emit=emit)


def b_glass_front():
    """One tile of the glass front, along the outside edge of the tile (+Y is outside)."""
    root = empty("glass_front")
    y = 0.44
    pane = box("Pane", (1.0, 0.03, 1.5), loc=(0, y, 0.05), material=_glass())
    sill = box("Sill", (1.0, 0.1, 0.05), loc=(0, y, 0), material=_metal())
    head = box("Head", (1.0, 0.1, 0.07), loc=(0, y, 1.55), material=_metal())
    mullion = box("Mullion", (0.05, 0.1, 1.5), loc=(0.475, y, 0.05), material=_metal())
    transom = box("Transom", (1.0, 0.06, 0.03), loc=(0, y, 1.15), material=_metal())
    # Dots at eye height, so nobody walks into it.
    dots = [box(f"Dot{i}", (0.05, 0.005, 0.05), loc=(-0.35 + i * 0.175, y - 0.02, 0.95), material=mat("plastic_white", emit=0.2)) for i in range(5)]
    ob = join("glass_front_mesh", [pane, sill, head, mullion, transom] + dots)
    parent(ob, root)
    return root


def b_glass_doors():
    """The entrance: sliding glass doors, open, because somebody is always coming in."""
    root = empty("glass_doors")
    y = 0.44
    head = box("Head", (1.0, 0.14, 0.12), loc=(0, y, 1.5), material=_metal())
    posts = [box(f"Post{i}", (0.05, 0.12, 1.5), loc=(x, y, 0), material=_metal()) for i, x in enumerate((-0.475, 0.475))]
    leaves = [box(f"Leaf{i}", (0.24, 0.03, 1.44), loc=(x, y - 0.07, 0.03), material=_glass(0.18)) for i, x in enumerate((-0.33, 0.33))]
    sensor = box("Sensor", (0.18, 0.06, 0.05), loc=(0, y - 0.1, 1.42), material=mat("plastic_black"))
    led = box("SensorLed", (0.04, 0.01, 0.02), loc=(0.05, y - 0.135, 1.435), material=mat("plant", emit=2.5))
    sign = box("Sign", (0.4, 0.02, 0.1), loc=(0, y - 0.08, 1.52), material=mat("plant", emit=0.8))
    ob = join("glass_doors_mesh", [head, sensor, led, sign] + posts + leaves)
    parent(ob, root)
    return root


def b_waiting_bench():
    """Three seats in a row, for visitors who were told someone will be right down."""
    root = empty("waiting_bench")
    fabric = mat("#5f7ea8", rough=0.85)
    parts = [box("Beam", (2.7, 0.08, 0.06), loc=(0, 0.05, 0.28), material=_metal())]
    parts += [box(f"Leg{i}", (0.06, 0.5, 0.28), loc=(x, 0.05, 0), material=_metal()) for i, x in enumerate((-1.25, 1.25))]
    for i, x in enumerate((-0.9, 0.0, 0.9)):
        parts.append(box(f"Seat{i}", (0.82, 0.5, 0.08), loc=(x, 0.0, 0.34), material=fabric, bevel=0.03))
        parts.append(box(f"Back{i}", (0.82, 0.08, 0.42), loc=(x, 0.27, 0.4), material=fabric, bevel=0.03))
    parts += [box(f"Arm{i}", (0.05, 0.42, 0.16), loc=(x, 0.02, 0.42), material=_metal()) for i, x in enumerate((-1.33, -0.45, 0.45, 1.33))]
    parts.append(box("Magazine", (0.22, 0.28, 0.012), loc=(0.85, -0.04, 0.42), material=mat("pink"), rot_z=0.3))
    parts.append(box("Coat", (0.5, 0.36, 0.06), loc=(-0.9, 0.02, 0.42), material=mat("khaki"), bevel=0.02, rot_z=-0.2))
    ob = join("waiting_bench_mesh", parts)
    parent(ob, root)
    return root


def b_brochure_rack():
    """Brochures about the company values. Nobody has ever taken one."""
    root = empty("brochure_rack")
    parts = [box("Back", (1.6, 0.05, 1.25), loc=(0, 0.25, 0), material=mat("wood_dark", rough=0.6))]
    parts += [box(f"Foot{i}", (0.06, 0.5, 0.04), loc=(x, 0.05, 0), material=_metal()) for i, x in enumerate((-0.7, 0.7))]
    cols = ("blue", "yellow", "teal", "red", "plastic_white", "orange")
    for r in range(3):
        z = 0.3 + r * 0.32
        parts.append(box(f"Ledge{r}", (1.5, 0.14, 0.03), loc=(0, 0.16, z), material=_metal()))
        for i in range(5):
            b = box(f"Broch{r}{i}", (0.24, 0.02, 0.3), loc=(-0.6 + i * 0.3, 0.17, z + 0.02), material=mat(cols[(r * 2 + i) % len(cols)]))
            kit.tilt([b], rx=-0.25)
            parts.append(b)
    ob = join("brochure_rack_mesh", parts)
    parent(ob, root)
    return root


def b_mail_slots():
    """Pigeonholes for the post: one per person, most of them still full."""
    root = empty("mail_slots")
    parts = [box("Body", (2.8, 0.5, 1.5), loc=(0, 0.2, 0), material=mat("wood", rough=0.6), bevel=0.02)]
    for c in range(8):
        for r in range(5):
            x, z = -1.225 + c * 0.35, 0.18 + r * 0.26
            parts.append(box(f"Hole{c}{r}", (0.3, 0.02, 0.2), loc=(x, -0.05, z), material=mat("#5b4a3a")))
            if (c * 5 + r) % 3 != 1:
                parts.append(box(f"Post{c}{r}", (0.22, 0.02, 0.05 + ((c + r) % 3) * 0.03), loc=(x, -0.06, z + 0.01), material=mat("paper")))
    ob = join("mail_slots_mesh", parts)
    parent(ob, root)
    return root


def b_coat_stand():
    """A round coat stand by the door, with whatever people left on it."""
    root = empty("coat_stand")
    wood = mat("wood_dark", rough=0.5)
    base = cyl("Base", 0.24, 0.04, loc=(0, 0, 0), material=mat("charcoal"), verts=20)
    pole = cyl("Pole", 0.035, 1.55, loc=(0, 0, 0.04), material=wood, verts=10)
    knob = ball("Knob", 0.05, loc=(0, 0, 1.6), material=wood, subdiv=1)
    parts = [base, pole, knob]
    for i in range(6):
        a = i * TAU / 6
        hook = box(f"Hook{i}", (0.16, 0.025, 0.025), loc=(math.cos(a) * 0.08, math.sin(a) * 0.08, 1.45), material=wood, rot_z=a)
        parts.append(hook)
    # Coats hang on three of the hooks, around the pole.
    for i, (a, col) in enumerate(((0.3, "navy"), (2.4, "khaki"), (4.3, "red"))):
        x, y = math.cos(a) * 0.17, math.sin(a) * 0.17
        coat = box(f"Coat{i}", (0.26, 0.12, 0.75), loc=(x, y, 0.62), material=mat(col), bevel=0.03, taper=0.8)
        kit.tilt([coat], rz=a + math.pi / 2, pivot=(x, y, 0.62))
        parts.append(coat)
    hat = cyl("Hat", 0.13, 0.03, loc=(0.0, 0.0, 1.64), material=mat("charcoal"), verts=16)
    crown = cyl("HatCrown", 0.08, 0.1, loc=(0.0, 0.0, 1.66), material=mat("charcoal"), verts=14)
    scarf = box("Scarf", (0.05, 0.05, 0.5), loc=(-0.12, 0.08, 0.95), material=mat("yellow"))
    umbrella = cyl("Umbrella", 0.035, 0.8, loc=(0.2, -0.18, 0.0), material=mat("blue"), verts=8)
    kit.tilt([umbrella], rx=0.25, pivot=(0.2, -0.18, 0.0))
    ob = join("coat_stand_mesh", parts + [hat, crown, scarf, umbrella])
    parent(ob, root)
    return root


def b_glass_partition():
    """One tile of the glass wall between the hall and the offices: low enough to look over."""
    root = empty("glass_partition")
    pane = box("Pane", (1.0, 0.03, 0.95), loc=(0, 0, 0.06), material=mat("window", rough=0.05, alpha=0.35))
    foot = box("Foot", (1.0, 0.08, 0.06), loc=(0, 0, 0), material=_metal())
    rail = box("Rail", (1.0, 0.06, 0.05), loc=(0, 0, 1.01), material=_metal())
    post = box("Post", (0.05, 0.08, 1.06), loc=(0.475, 0, 0), material=_metal())
    ob = join("glass_partition_mesh", [pane, foot, rail, post])
    parent(ob, root)
    return root


def _armchair(name, x, y, rz, col):
    """A low lounge chair at (x, y), turned rz around its middle (0 = facing -Y)."""
    parts = [
        box(f"{name}Seat", (0.62, 0.6, 0.26), loc=(x, y, 0.08), material=mat(col, rough=0.85), bevel=0.05),
        box(f"{name}Back", (0.62, 0.14, 0.32), loc=(x, y + 0.26, 0.3), material=mat(col, rough=0.85), bevel=0.05),
        box(f"{name}ArmL", (0.12, 0.56, 0.16), loc=(x - 0.3, y + 0.02, 0.3), material=mat(col, rough=0.85), bevel=0.04),
        box(f"{name}ArmR", (0.12, 0.56, 0.16), loc=(x + 0.3, y + 0.02, 0.3), material=mat(col, rough=0.85), bevel=0.04),
        box(f"{name}Base", (0.5, 0.5, 0.08), loc=(x, y, 0), material=mat("charcoal")),
    ]
    kit.tilt(parts, rz=rz, pivot=(x, y, 0))
    return parts


def _coffee_table(r=0.36):
    top = cyl("TableTop", r, 0.03, loc=(0, 0, 0.36), material=_glass(0.05), verts=24)
    rim = cyl("TableRim", r + 0.02, 0.02, loc=(0, 0, 0.35), material=_metal(), verts=24)
    leg = cyl("TableLeg", 0.05, 0.36, loc=(0, 0, 0), material=_metal(), verts=10)
    mag = box("TableMag", (0.2, 0.26, 0.012), loc=(0.05, -0.05, 0.39), material=mat("yellow"), rot_z=0.4)
    cup = cyl("TableCup", 0.035, 0.07, loc=(-0.15, 0.1, 0.39), material=mat("plastic_white"), verts=10)
    return [top, rim, leg, mag, cup]


def b_lounge_wide():
    """Two armchairs and two poufs round a low glass table: where visitors wait."""
    root = empty("lounge_wide")
    parts = _coffee_table(0.42)
    parts += _armchair("ChairL", -1.0, 0.0, math.pi / 2, "#d9a441")
    parts += _armchair("ChairR", 1.0, 0.0, -math.pi / 2, "#d9a441")
    parts += [cyl(f"Pouf{i}", 0.22, 0.3, loc=(0, y, 0), material=mat("teal", rough=0.9), verts=16, bevel=0.03) for i, y in enumerate((-0.7, 0.7))]
    ob = join("lounge_wide_mesh", parts)
    parent(ob, root)
    return root


def b_lounge_square():
    root = empty("lounge_square")
    parts = _coffee_table(0.32)
    parts += _armchair("ChairL", -0.62, 0.15, math.pi / 2, "#d9a441")
    parts += [cyl(f"Pouf{i}", 0.2, 0.3, loc=(x, y, 0), material=mat("teal", rough=0.9), verts=16, bevel=0.03) for i, (x, y) in enumerate(((0.6, 0.0), (0.0, -0.62), (0.05, 0.62)))]
    ob = join("lounge_square_mesh", parts)
    parent(ob, root)
    return root


def b_pillar():
    """A square column, light stone, with a dark foot."""
    root = empty("pillar")
    foot = box("Foot", (0.62, 0.62, 0.12), loc=(0, 0, 0), material=mat("charcoal", rough=0.5))
    shaft = box("Shaft", (0.54, 0.54, 1.46), loc=(0, 0, 0.12), material=mat("#ece8e0", rough=0.35), bevel=0.01)
    band = box("Band", (0.58, 0.58, 0.06), loc=(0, 0, 1.52), material=mat("#cfc9bd", rough=0.4))
    ob = join("pillar_mesh", [foot, shaft, band])
    parent(ob, root)
    return root


def b_logo_wall():
    """The company logo on a free-standing wall: two tiles wide."""
    root = empty("logo_wall")
    red = mat("#a83a32", rough=0.6)
    panel = box("Panel", (1.9, 0.2, 1.45), loc=(0, 0, 0.1), material=red, bevel=0.02)
    plinth = box("Plinth", (2.0, 0.3, 0.1), loc=(0, 0, 0), material=mat("plastic_black"))
    frame = box("Frame", (1.94, 0.22, 0.05), loc=(0, 0, 1.55), material=mat("plastic_black"))
    # The logo on both sides: three keys in a row, the middle one lit.
    keys, names = [], []
    for side in (-1, 1):
        keys += [box(f"Key{side}{i}", (0.34, 0.06, 0.34), loc=(-0.45 + i * 0.45, side * 0.12, 0.95), material=mat("plastic_white", emit=0.6 if i == 1 else 0.15), bevel=0.04) for i in range(3)]
        names.append(box(f"Name{side}", (1.2, 0.04, 0.08), loc=(0, side * 0.11, 0.62), material=mat("plastic_white", emit=0.3)))
    ob = join("logo_wall_mesh", [panel, plinth, frame] + names + keys)
    parent(ob, root)
    return root


def b_speed_gate():
    """One side of a speed gate: a cabinet with a card reader, and a glass flap across the walkway.
    The flap is its own part (GateFlap) so the game can swing it open."""
    root = empty("speed_gate")
    cab = box("Cabinet", (0.2, 0.84, 0.95), loc=(0.4, 0, 0), material=mat("metal_light", metal=0.5, rough=0.3), bevel=0.02)
    top = box("Top", (0.22, 0.86, 0.03), loc=(0.4, 0, 0.95), material=mat("plastic_black"))
    reader = box("Reader", (0.16, 0.16, 0.02), loc=(0.4, -0.28, 0.98), material=mat("plastic_black"))
    light = box("Light", (0.1, 0.1, 0.012), loc=(0.4, -0.28, 1.0), material=mat("plant", emit=2.0))
    stripe = box("Stripe", (0.205, 0.5, 0.04), loc=(0.4, 0.12, 0.8), material=mat("red", emit=0.6))
    ob = join("speed_gate_mesh", [cab, top, reader, light, stripe])
    parent(ob, root)
    flap = box("GateFlap", (0.46, 0.03, 0.55), loc=(0.73, 0, 0.32), material=mat("window", rough=0.05, emit=0.2, alpha=0.55), bevel=0.01)
    set_origin(flap, (0.5, 0, 0.32))
    parent(flap, root)
    return root


def b_lifts():
    """Two lifts, both on another floor."""
    root = empty("lifts")
    wall = box("Wall", (4.0, 1.4, 1.45), loc=(0, 0.3, 0), material=mat("#d9d4ca", rough=0.5), bevel=0.02)
    cap = box("Cap", (4.04, 1.44, 0.06), loc=(0, 0.3, 1.45), material=mat("charcoal", rough=0.6))
    plinth = box("Plinth", (4.02, 1.42, 0.1), loc=(0, 0.3, 0), material=mat("charcoal", rough=0.6))
    parts = [wall, cap, plinth]
    # The back of the lift core, towards the room: stone panels, a long painting, a clock.
    parts += [box(f"Seam{i}", (0.02, 0.01, 1.3), loc=(-1.5 + i * 1.0, 1.005, 0.12), material=mat("#bdb6aa")) for i in range(4)]
    parts.append(box("Painting", (2.2, 0.03, 0.62), loc=(-0.4, 1.01, 0.55), material=mat("plastic_black")))
    parts += [box(f"Paint{i}", (w, 0.035, hh), loc=(x, 1.012, z), material=mat(c)) for i, (x, z, w, hh, c) in enumerate(((-1.1, 0.62, 0.7, 0.45, "teal"), (-0.35, 0.6, 0.6, 0.3, "orange"), (0.3, 0.7, 0.5, 0.35, "yellow")))]
    parts.append(cyl("Clock", 0.16, 0.03, loc=(1.3, 1.02, 0.95), material=mat("plastic_white"), verts=20, rot=(math.pi / 2, 0, 0)))
    parts += [box(f"Hand{i}", (0.015, 0.01, l), loc=(1.3, 1.04, 0.95), material=mat("plastic_black")) for i, l in enumerate((0.12, 0.08))]
    parts.append(box("LiftSign", (0.9, 0.03, 0.14), loc=(0, -0.42, 1.36), material=mat("plastic_white", emit=0.4)))
    steel = mat("metal_light", metal=0.8, rough=0.25)
    for i, x in enumerate((-1.0, 1.0)):
        parts.append(box(f"Frame{i}", (1.2, 0.04, 1.2), loc=(x, -0.41, 0), material=mat("metal", metal=0.7, rough=0.3)))
        parts += [box(f"Door{i}{j}", (0.52, 0.03, 1.12), loc=(x + dx, -0.43, 0.02), material=steel) for j, dx in enumerate((-0.27, 0.27))]
        parts.append(box(f"Display{i}", (0.36, 0.03, 0.12), loc=(x, -0.42, 1.24), material=mat("plastic_black")))
        parts.append(box(f"Floor{i}", (0.14, 0.035, 0.07), loc=(x, -0.425, 1.265), material=mat("orange", emit=2.0)))
    parts.append(box("Buttons", (0.12, 0.03, 0.26), loc=(0, -0.42, 0.5), material=_metal()))
    parts += [cyl(f"Btn{i}", 0.025, 0.02, loc=(0, -0.44, 0.56 + i * 0.1), material=mat("plastic_white", emit=0.8 if i else 0.1), verts=10, rot=(math.pi / 2, 0, 0)) for i in range(2)]
    ob = join("lifts_mesh", parts)
    parent(ob, root)
    return root


def b_reception_desk():
    """The reception counter: four tiles long, high at the front where you sign in, a bell nobody
    may ring twice. The receptionist works behind it (+Y)."""
    root = empty("reception_desk")
    wood = mat("wood", rough=0.55)
    front = box("Front", (3.9, 0.18, 1.05), loc=(0, -0.25, 0), material=wood, bevel=0.02)
    ledge = box("Ledge", (3.9, 0.3, 0.04), loc=(0, -0.24, 1.05), material=mat("#ece8e0", rough=0.3))
    strip = box("Strip", (3.7, 0.01, 0.05), loc=(0, -0.345, 0.85), material=mat("screen_glow", emit=1.5))
    work = box("Work", (3.9, 0.55, 0.04), loc=(0, 0.15, 0.7), material=mat("wood_dark", rough=0.5))
    body = box("Body", (3.9, 0.5, 0.7), loc=(0, 0.15, 0), material=mat("wood_dark", rough=0.6))
    parts = [front, ledge, strip, work, body]
    parts += _monitor(-1.0, 0.22, 0.74, w=0.46, hgt=0.28)
    parts += _monitor(0.9, 0.22, 0.74, w=0.46, hgt=0.28)
    parts.append(cyl("BellBase", 0.07, 0.02, loc=(0.3, -0.25, 1.09), material=_metal(), verts=14))
    parts.append(ball("Bell", 0.06, loc=(0.3, -0.25, 1.11), material=mat("yellow", metal=0.8, rough=0.25), subdiv=2, scale=(1, 1, 0.7)))
    parts.append(box("Book", (0.32, 0.22, 0.03), loc=(-0.4, -0.24, 1.09), material=mat("navy"), bevel=0.01))
    parts.append(cyl("Vase", 0.06, 0.2, loc=(1.6, -0.25, 1.09), material=_glass(0.05), verts=12))
    parts += [ball(f"Flower{i}", 0.05, loc=(1.6 + dx, -0.25 + dy, 1.32), material=mat(c), subdiv=1) for i, (dx, dy, c) in enumerate(((0.0, 0.0, "pink"), (0.05, 0.03, "yellow"), (-0.04, 0.02, "red")))]
    parts.append(box("Phone", (0.2, 0.16, 0.06), loc=(-1.6, 0.1, 0.74), material=mat("plastic_black"), bevel=0.02))
    # The receptionist's chair behind the counter.
    parts.append(box("ChairSeat", (0.44, 0.42, 0.06), loc=(0.0, 0.75, 0.44), material=mat("charcoal"), bevel=0.02))
    parts.append(box("ChairBack", (0.44, 0.06, 0.48), loc=(0.0, 0.97, 0.48), material=mat("charcoal"), bevel=0.02))
    parts.append(cyl("ChairPost", 0.03, 0.44, loc=(0.0, 0.75, 0), material=mat("metal"), verts=6))
    ob = join("reception_desk_mesh", parts)
    parent(ob, root)
    return root


def b_security_post():
    """Security: a high desk and a wall of camera screens behind it. Two tiles wide."""
    root = empty("security_post")
    dark = mat("charcoal", rough=0.6)
    desk = box("Desk", (1.8, 0.5, 1.0), loc=(0, -0.2, 0), material=dark, bevel=0.02)
    stripe = box("Stripe", (1.8, 0.01, 0.08), loc=(0, -0.455, 0.8), material=mat("yellow", emit=0.4))
    top = box("Top", (1.84, 0.54, 0.03), loc=(0, -0.2, 1.0), material=_metal())
    wall = box("Screens", (1.8, 0.2, 1.5), loc=(0, 0.35, 0), material=dark, bevel=0.02)
    parts = [desk, stripe, top, wall]
    for c in range(3):
        for r in range(2):
            parts.append(box(f"Cam{c}{r}", (0.5, 0.02, 0.26), loc=(-0.58 + c * 0.58, 0.24, 1.0 + r * 0.3), material=mat("#9fb3a8", emit=0.5)))
    parts.append(box("Badge", (0.3, 0.2, 0.02), loc=(0.5, -0.25, 1.03), material=mat("plastic_white")))
    parts.append(cyl("Lamp", 0.05, 0.08, loc=(-0.7, -0.3, 1.03), material=mat("red", emit=1.5), verts=10))
    ob = join("security_post_mesh", parts)
    parent(ob, root)
    return root


def b_sculpture():
    """Art for the hall: a big golden ring on a black plinth. Nobody knows what it means."""
    root = empty("sculpture")
    plinth = box("Plinth", (1.3, 1.3, 0.45), loc=(0, 0, 0), material=mat("plastic_black", rough=0.4), bevel=0.02)
    gold = mat("#d4a63a", metal=0.85, rough=0.28)
    seg = []
    n = 20
    for i in range(n):
        a = i * TAU / n
        b = box(f"Ring{i}", (0.18, 0.14, 0.19), loc=(math.cos(a) * 0.5, 0, 1.0 + math.sin(a) * 0.5 - 0.095), material=gold)
        kit.tilt([b], ry=-a, pivot=(math.cos(a) * 0.5, 0, 1.0 + math.sin(a) * 0.5))
        seg.append(b)
    post = box("Post", (0.1, 0.1, 0.1), loc=(0, 0, 0.45), material=gold)
    plaque = box("Plaque", (0.3, 0.02, 0.08), loc=(0, -0.66, 0.25), material=gold)
    ob = join("sculpture_mesh", [plinth, post, plaque] + seg)
    parent(ob, root)
    return root


def b_planter_big():
    """A planter of two by two tiles, with a small tree that is doing better than everyone."""
    root = empty("planter_big")
    bx = box("Box", (1.7, 1.7, 0.45), loc=(0, 0, 0), material=mat("charcoal", rough=0.7), bevel=0.03)
    soil = box("Soil", (1.6, 1.6, 0.02), loc=(0, 0, 0.44), material=mat("coffee"))
    trunk = cyl("Trunk", 0.06, 0.8, loc=(0.2, 0.2, 0.45), material=mat("wood_dark"), verts=8)
    crown = [ball(f"Crown{i}", r, loc=(0.2 + dx, 0.2 + dy, z), material=mat(c), subdiv=1) for i, (dx, dy, z, r, c) in enumerate(((0, 0, 1.4, 0.42, "plant"), (0.25, -0.1, 1.25, 0.3, "plant_dark"), (-0.2, 0.15, 1.3, 0.3, "plant")))]
    bushes = [ball(f"Bush{i}", 0.26, loc=(x, y, 0.62), material=mat("plant_dark" if i % 2 else "plant"), subdiv=1, scale=(1, 1, 0.8)) for i, (x, y) in enumerate(((-0.45, -0.45), (0.45, -0.5), (-0.5, 0.4)))]
    ob = join("planter_big_mesh", [bx, soil, trunk] + crown + bushes)
    parent(ob, root)
    return root


# ---------------------------------------------------------------- Coffee Corner (level 2)
# Counters, tables and the bar are worktops: towers stand on top of them (at the height the level
# gives as `surface`: counters 0.9, the bar and standing tables 1.0, the dining table 0.74).

def _counter(name):
    """One tile of kitchen counter, its back against the wall (+Y). Top at 0.9."""
    cab = box(f"{name}Cab", (1.0, 0.78, 0.76), loc=(0, 0.1, 0.08), material=mat("#7e9aa8", rough=0.6))
    kick = box(f"{name}Kick", (1.0, 0.7, 0.08), loc=(0, 0.14, 0), material=mat("charcoal"))
    top = box(f"{name}Top", (1.0, 0.9, 0.06), loc=(0, 0.05, 0.84), material=mat("#d8d2c4", rough=0.4))
    door = box(f"{name}Door", (0.92, 0.01, 0.66), loc=(0, -0.295, 0.12), material=mat("#8eaab8", rough=0.6))
    knob = box(f"{name}Knob", (0.12, 0.02, 0.02), loc=(0.3, -0.305, 0.7), material=mat("metal_light", metal=0.8, rough=0.3))
    return [cab, kick, top, door, knob]


def b_counter():
    root = empty("counter")
    ob = join("counter_mesh", _counter("C"))
    parent(ob, root)
    return root


def b_counter_sink():
    root = empty("counter_sink")
    steel = mat("metal_light", metal=0.8, rough=0.2)
    sink = box("Sink", (0.6, 0.4, 0.02), loc=(0, 0.2, 0.9), material=steel)
    basin = box("Basin", (0.5, 0.3, 0.012), loc=(0, 0.2, 0.92), material=mat("metal", metal=0.7, rough=0.3))
    tap = cyl("Tap", 0.02, 0.26, loc=(0, 0.44, 0.9), material=steel, verts=8)
    spout = box("Spout", (0.03, 0.16, 0.03), loc=(0, 0.37, 1.13), material=steel)
    soap = cyl("Soap", 0.03, 0.12, loc=(0.36, 0.4, 0.9), material=mat("teal", rough=0.3), verts=8)
    ob = join("counter_sink_mesh", _counter("C") + [sink, basin, tap, spout, soap])
    parent(ob, root)
    return root


def b_counter_coffee():
    """A counter with an espresso machine against the wall: the reason this room exists."""
    root = empty("counter_coffee")
    chrome = mat("metal_light", rough=0.25, metal=0.8)
    body = box("Machine", (0.5, 0.22, 0.4), loc=(0, 0.36, 0.9), material=chrome, bevel=0.02)
    lid = box("MachineTop", (0.5, 0.22, 0.03), loc=(0, 0.36, 1.3), material=mat("plastic_black"))
    group = cyl("Group", 0.04, 0.06, loc=(0, 0.22, 1.08), material=mat("plastic_black"), verts=10)
    cups = [cyl(f"Cup{i}", 0.03, 0.05, loc=(-0.12 + i * 0.12, 0.38, 1.33), material=mat("plastic_white"), verts=10) for i in range(3)]
    light = box("Ready", (0.04, 0.01, 0.03), loc=(0.18, 0.245, 1.2), material=mat("red", emit=2.0))
    ob = join("counter_coffee_mesh", _counter("C") + [body, lid, group, light] + cups)
    parent(ob, root)
    return root


def b_counter_microwave():
    root = empty("counter_microwave")
    mw = box("Microwave", (0.56, 0.3, 0.32), loc=(0, 0.32, 0.9), material=mat("#2f3238", rough=0.45), bevel=0.02)
    door = box("MwDoor", (0.36, 0.01, 0.22), loc=(-0.06, 0.165, 0.95), material=mat("window", rough=0.1, emit=0.15))
    led = box("MwLed", (0.08, 0.012, 0.03), loc=(0.2, 0.163, 1.12), material=mat("plant", emit=2.0))
    ob = join("counter_microwave_mesh", _counter("C") + [mw, door, led])
    parent(ob, root)
    return root


def b_counter_hob():
    root = empty("counter_hob")
    glass = box("Hob", (0.7, 0.6, 0.01), loc=(0, 0.08, 0.9), material=mat("plastic_black", rough=0.15))
    rings = [cyl(f"Ring{i}", 0.12, 0.004, loc=(x, 0.08, 0.91), material=mat("red", emit=0.4 if i == 0 else 0.0), verts=20) for i, x in enumerate((-0.17, 0.17))]
    knobs = [cyl(f"Knob{i}", 0.025, 0.03, loc=(-0.1 + i * 0.2, -0.3, 0.76), material=mat("plastic_black"), verts=10, rot=(math.pi / 2, 0, 0)) for i in range(2)]
    ob = join("counter_hob_mesh", _counter("C") + [glass] + rings + knobs)
    parent(ob, root)
    return root


def b_tall_cabinet():
    """The tall cupboard in the corner, two tiles wide: brooms, tea, a spare kettle."""
    root = empty("tall_cabinet")
    body = box("Body", (1.9, 0.6, 1.6), loc=(0, 0.18, 0), material=mat("#7e9aa8", rough=0.6), bevel=0.02)
    doors = [box(f"Door{i}", (0.9, 0.01, 1.45), loc=(x, -0.125, 0.08), material=mat("#8eaab8", rough=0.6)) for i, x in enumerate((-0.47, 0.47))]
    handles = [box(f"Handle{i}", (0.02, 0.02, 0.3), loc=(x, -0.14, 0.75), material=mat("metal_light", metal=0.8, rough=0.3)) for i, x in enumerate((-0.06, 0.06))]
    tins = [cyl(f"Tin{i}", 0.08, 0.16, loc=(-0.6 + i * 0.22, 0.18, 1.6), material=mat(c), verts=10) for i, c in enumerate(("red", "yellow", "teal"))]
    ob = join("tall_cabinet_mesh", [body] + doors + handles + tins)
    parent(ob, root)
    return root


def b_dining_table():
    """The long kitchen table, three by two tiles. Top at 0.74."""
    root = empty("dining_table")
    top = box("Top", (2.9, 1.8, 0.05), loc=(0, 0, 0.69), material=mat("wood", rough=0.5), bevel=0.015)
    legs = [box(f"Leg{i}", (0.07, 0.07, 0.69), loc=(x, y, 0), material=mat("wood_dark")) for i, (x, y) in enumerate(((-1.35, -0.8), (1.35, -0.8), (-1.35, 0.8), (1.35, 0.8)))]
    runner = box("Runner", (2.6, 0.3, 0.004), loc=(0, 0, 0.74), material=mat("#c96a5a", rough=0.9))
    ob = join("dining_table_mesh", [top, runner] + legs)
    parent(ob, root)
    return root


def b_kitchen_chair():
    """One kitchen chair, facing -Y (towards the table)."""
    root = empty("kitchen_chair")
    col = mat("teal", rough=0.6)
    seat = box("Seat", (0.42, 0.42, 0.05), loc=(0, 0.05, 0.42), material=col, bevel=0.02)
    back = box("Back", (0.42, 0.05, 0.42), loc=(0, 0.25, 0.47), material=col, bevel=0.02)
    legs = [cyl(f"Leg{i}", 0.018, 0.42, loc=(x, y, 0), material=mat("metal"), verts=6) for i, (x, y) in enumerate(((0.17, -0.12), (-0.17, -0.12), (0.17, 0.22), (-0.17, 0.22)))]
    ob = join("kitchen_chair_mesh", [seat, back] + legs)
    parent(ob, root)
    return root


def b_bar_table():
    """A round standing table. Top at 1.0."""
    root = empty("bar_table")
    top = cyl("Top", 0.42, 0.03, loc=(0, 0, 0.97), material=mat("wood", rough=0.5), verts=24)
    leg = cyl("Leg", 0.045, 0.97, loc=(0, 0, 0), material=_metal(), verts=10)
    foot = cyl("Foot", 0.26, 0.03, loc=(0, 0, 0), material=_metal(), verts=20)
    ob = join("bar_table_mesh", [top, leg, foot])
    parent(ob, root)
    return root


def b_bar_stool():
    root = empty("bar_stool")
    seat = cyl("Seat", 0.17, 0.05, loc=(0, 0, 0.68), material=mat("orange", rough=0.6), verts=16)
    pole = cyl("Pole", 0.025, 0.68, loc=(0, 0, 0), material=_metal(), verts=8)
    ring = cyl("Ring", 0.13, 0.015, loc=(0, 0, 0.28), material=_metal(), verts=14)
    foot = cyl("Foot", 0.18, 0.02, loc=(0, 0, 0), material=_metal(), verts=16)
    ob = join("bar_stool_mesh", [seat, pole, ring, foot])
    parent(ob, root)
    return root


def b_window_bar():
    """One tile of the bar by the window: top at 1.0, a footrest at the front (-Y)."""
    root = empty("window_bar")
    top = box("Top", (1.0, 0.8, 0.04), loc=(0, 0.08, 0.96), material=mat("wood", rough=0.5))
    panel = box("Panel", (1.0, 0.06, 0.96), loc=(0, 0.42, 0), material=mat("wood_dark", rough=0.6))
    rest = box("Rest", (1.0, 0.04, 0.04), loc=(0, -0.2, 0.25), material=_metal())
    bracket = box("Bracket", (0.04, 0.6, 0.04), loc=(0, 0.1, 0.25), material=_metal())
    ob = join("window_bar_mesh", [top, panel, rest, bracket])
    parent(ob, root)
    return root


# ---------------------------------------------------------------- level 3: the presentation room

def b_beamer():
    """The projector on its stand in the middle aisle, lens to -Y. The status light (BeamerLamp)
    and the light beam (BeamerBeam) are parts of their own: the game blinks and flickers them."""
    root = empty("beamer")
    foot = cyl("Foot", 0.26, 0.03, loc=(0, 0, 0), material=_metal(), verts=18)
    pole = cyl("Pole", 0.035, 0.86, loc=(0, 0, 0), material=_metal(), verts=8)
    plate = box("Plate", (0.4, 0.36, 0.03), loc=(0, 0, 0.86), material=mat("plastic_black"))
    body = box("Body", (0.36, 0.3, 0.13), loc=(0, 0, 0.89), material=mat("plastic_white", rough=0.4), bevel=0.02)
    lens = cyl("Lens", 0.055, 0.05, loc=(0.08, -0.15, 0.955), material=mat("plastic_black", rough=0.2), verts=14)
    kit.tilt([lens], rx=math.pi / 2, pivot=(0.08, -0.15, 0.955))
    glass = cyl("LensGlass", 0.04, 0.01, loc=(0.08, -0.2, 0.955), material=mat("screen_glow", emit=2.0), verts=12)
    kit.tilt([glass], rx=math.pi / 2, pivot=(0.08, -0.2, 0.955))
    vent = box("Vent", (0.12, 0.01, 0.07), loc=(-0.1, -0.155, 0.92), material=mat("charcoal"))
    cable = box("Cable", (0.02, 0.5, 0.02), loc=(0, 0.3, 0.0), material=mat("plastic_black"))
    ob = join("beamer_mesh", [foot, pole, plate, body, lens, glass, vent, cable])
    parent(ob, root)
    lamp = box("BeamerLamp", (0.04, 0.04, 0.012), loc=(-0.1, 0.05, 1.02), material=mat("plant", emit=2.5))
    parent(lamp, root)
    # The beam: from the lens to the screen, about three tiles away, widening on the way.
    beam = cyl("BeamerBeam", 0.05, 2.9, loc=(0.08, -0.2, 0.955), material=mat("screen_glow", emit=1.5, alpha=0.16), verts=4, radius_top=0.5)
    kit.tilt([beam], rx=math.pi / 2, pivot=(0.08, -0.2, 0.955))
    parent(beam, root)
    return root


def b_speaker():
    """A tall floor speaker, front to -Y."""
    root = empty("speaker")
    cab = box("Cab", (0.42, 0.4, 1.35), loc=(0, 0, 0), material=mat("plastic_black", rough=0.5), bevel=0.02)
    cones = [cyl(f"Cone{i}", r, 0.03, loc=(0, -0.2, z), material=mat("charcoal", rough=0.4), verts=16) for i, (r, z) in enumerate(((0.15, 0.35), (0.12, 0.75), (0.06, 1.12)))]
    for c, z in zip(cones, (0.35, 0.75, 1.12)):
        kit.tilt([c], rx=math.pi / 2, pivot=(0, -0.2, z))
    led = box("Led", (0.03, 0.01, 0.03), loc=(0.15, -0.205, 1.25), material=mat("blue", emit=2.0))
    ob = join("speaker_mesh", [cab, led] + cones)
    parent(ob, root)
    return root


def b_whiteboard():
    """A whiteboard on wheels, three tiles wide, with last quarter's ambitions still on it."""
    root = empty("whiteboard")
    legs = [box(f"Leg{i}", (0.04, 0.5, 0.04), loc=(x, 0, 0.04), material=_metal()) for i, x in enumerate((-1.25, 1.25))]
    posts = [box(f"Post{i}", (0.04, 0.04, 1.65), loc=(x, 0, 0.04), material=_metal()) for i, x in enumerate((-1.25, 1.25))]
    frame = box("Frame", (2.6, 0.05, 1.05), loc=(0, 0, 0.6), material=mat("metal_light", metal=0.5, rough=0.3))
    board = box("Board", (2.5, 0.055, 0.95), loc=(0, 0, 0.65), material=mat("plastic_white", rough=0.2, emit=0.15))
    tray = box("Tray", (1.0, 0.1, 0.03), loc=(0, -0.06, 0.6), material=_metal())
    marks = []
    for i, (x, z, w, c) in enumerate(((-0.8, 1.35, 0.7, "blue"), (-0.7, 1.2, 0.5, "blue"), (-0.75, 1.05, 0.6, "red"), (0.4, 1.3, 0.9, "teal"), (0.6, 0.95, 0.5, "red"))):
        marks.append(box(f"Mark{i}", (w, 0.06, 0.025), loc=(x, 0, z), material=mat(c, emit=0.4)))
    arrow = box("Arrow", (0.04, 0.06, 0.4), loc=(-0.1, 0, 0.9), material=mat("teal", emit=0.4))
    kit.tilt([arrow], ry=-0.9, pivot=(-0.1, 0, 0.9))
    pens = [cyl(f"Pen{i}", 0.012, 0.12, loc=(-0.2 + i * 0.1, -0.06, 0.63), material=mat(c), verts=6) for i, c in enumerate(("red", "blue", "plastic_black"))]
    for pn, x in zip(pens, (-0.2, -0.1, 0.0)):
        kit.tilt([pn], ry=math.pi / 2, pivot=(x, -0.06, 0.63))
    ob = join("whiteboard_mesh", legs + posts + [frame, board, tray, arrow] + marks + pens)
    parent(ob, root)
    return root


def b_conference_table():
    """One tile of a long table with a laptop whose screen faces -Y, where the chair goes. Top at 0.74."""
    root = empty("conference_table")
    top = box("Top", (1.0, 0.72, 0.04), loc=(0, 0.1, 0.7), material=mat("plastic_white", rough=0.4))
    edge = box("Edge", (1.0, 0.04, 0.05), loc=(0, -0.26, 0.69), material=mat("metal_light", metal=0.5, rough=0.3))
    legs = [box(f"Leg{i}", (0.04, 0.6, 0.04), loc=(x, 0.1, 0.0), material=_metal()) for i, x in enumerate((-0.46, 0.46))]
    posts = [box(f"Post{i}", (0.04, 0.04, 0.7), loc=(x, 0.1, 0.0), material=_metal()) for i, x in enumerate((-0.46, 0.46))]
    parts = [top, edge] + legs + posts + _laptop(0.05, 0.05, 0.74, rot=0.0)
    cup = cyl("Cup", 0.035, 0.08, loc=(-0.3, 0.2, 0.74), material=mat("plastic_white"), verts=10)
    ob = join("conference_table_mesh", parts + [cup])
    parent(ob, root)
    return root


def b_conference_chair():
    """A black office chair, facing -Y."""
    root = empty("conference_chair")
    ob = join("conference_chair_mesh", _chair("charcoal", "plastic_black", arms=True, s=0.95))
    parent(ob, root)
    return root


def b_chair_stack():
    """Spare chairs, stacked: there are never enough."""
    root = empty("chair_stack")
    parts = []
    for i in range(6):
        z = i * 0.11
        parts.append(box(f"Seat{i}", (0.42, 0.42, 0.04), loc=(0, 0.02 * i, 0.4 + z), material=mat("blue", rough=0.6), bevel=0.01))
        parts.append(box(f"Back{i}", (0.42, 0.04, 0.38), loc=(0, 0.21 + 0.02 * i, 0.44 + z), material=mat("blue", rough=0.6), bevel=0.01))
    legs = [box(f"Leg{i}", (0.025, 0.025, 0.42), loc=(x, y, 0), material=_metal()) for i, (x, y) in enumerate(((0.18, -0.16), (-0.18, -0.16), (0.18, 0.2), (-0.18, 0.2)))]
    ob = join("chair_stack_mesh", parts + legs)
    parent(ob, root)
    return root


# ---------------------------------------------------------------- level 4: the canteen (new design)

def b_canteen_long():
    """One tile of a long canteen table, a bench on both sides and a tray on it."""
    root = empty("canteen_long")
    top = box("Top", (1.0, 0.5, 0.05), loc=(0, 0, 0.72), material=mat("plastic_white", rough=0.4))
    legs = [box(f"Leg{i}", (0.05, 0.4, 0.72), loc=(x, 0, 0), material=mat("metal")) for i, x in enumerate((-0.46, 0.46))]
    parts = [top] + legs
    for side in (-1, 1):
        parts.append(box(f"Bench{side}", (1.0, 0.18, 0.05), loc=(0, side * 0.38, 0.42), material=mat("teal", rough=0.5)))
        parts.append(box(f"BLeg{side}", (0.05, 0.14, 0.42), loc=(0, side * 0.38, 0), material=mat("metal")))
    tray = box("Tray", (0.42, 0.3, 0.02), loc=(-0.15, 0.04, 0.77), material=mat("orange"))
    plate = cyl("Plate", 0.09, 0.015, loc=(-0.2, 0.04, 0.79), material=mat("plastic_white"), verts=12)
    food = ball("Food", 0.05, loc=(-0.2, 0.04, 0.8), material=mat("yellow"), subdiv=1, scale=(1, 1, 0.5))
    cup = cyl("Cup", 0.03, 0.08, loc=(0.25, -0.1, 0.77), material=mat("window", rough=0.1), verts=8)
    ob = join("canteen_long_mesh", parts + [tray, plate, food, cup])
    parent(ob, root)
    return root


def b_salad_bar():
    """One tile of the salad bar: bowls under a glass hood. Tall enough to block sight. Front -Y."""
    root = empty("salad_bar")
    body = box("Body", (0.95, 0.8, 0.88), loc=(0, 0, 0), material=mat("#7e9aa8", rough=0.6), bevel=0.02)
    top = box("Top", (1.0, 0.85, 0.04), loc=(0, 0, 0.88), material=mat("metal", metal=0.6, rough=0.3))
    bowls = []
    for i, (x, y, col) in enumerate(((-0.25, -0.15, "plant"), (0.2, -0.15, "red"), (-0.2, 0.2, "yellow"), (0.22, 0.2, "plant_dark"))):
        bowls.append(cyl(f"Bowl{i}", 0.17, 0.08, loc=(x, y, 0.92), material=mat("metal_light", metal=0.7, rough=0.3), verts=14))
        bowls.append(ball(f"Salad{i}", 0.15, loc=(x, y, 0.99), material=mat(col), subdiv=1, scale=(1, 1, 0.4)))
    posts = [box(f"Post{i}", (0.03, 0.03, 0.62), loc=(x, y, 0.92), material=mat("metal")) for i, (x, y) in enumerate(((-0.45, -0.38), (0.45, -0.38), (-0.45, 0.38), (0.45, 0.38)))]
    hood = box("Hood", (0.95, 0.8, 0.03), loc=(0, 0, 1.54), material=mat("window", rough=0.05, alpha=0.5))
    lamp = box("Lamp", (0.7, 0.1, 0.05), loc=(0, 0, 1.5), material=mat("yellow", emit=1.2))
    ob = join("salad_bar_mesh", [body, top, hood, lamp] + bowls + posts)
    parent(ob, root)
    return root


def b_serving_counter():
    """One tile of the serving counter along the bottom: pans, a glass guard, heat lamps. Front -Y,
    where the queue is."""
    root = empty("serving_counter")
    counter = box("Counter", (1.0, 0.75, 0.88), loc=(0, 0.1, 0), material=mat("metal_light", metal=0.5, rough=0.4))
    top = box("CTop", (1.0, 0.8, 0.04), loc=(0, 0.1, 0.88), material=mat("metal", metal=0.6, rough=0.3))
    rail = box("TrayRail", (1.0, 0.16, 0.03), loc=(0, -0.35, 0.78), material=mat("metal", metal=0.6, rough=0.3))
    pan = box("Pan", (0.8, 0.4, 0.06), loc=(0, 0.15, 0.9), material=mat("metal_light", metal=0.7, rough=0.3))
    food = box("Food", (0.72, 0.34, 0.03), loc=(0, 0.15, 0.94), material=mat("orange", rough=0.9))
    guard = box("Guard", (1.0, 0.02, 0.36), loc=(0, -0.05, 1.12), material=mat("window", rough=0.05, alpha=0.5))
    kit.tilt([guard], rx=0.35, pivot=(0, -0.05, 1.12))
    # Heat lamps on a thin rail: no back wall, you look over it from the front of the floor.
    posts = [box(f"HPost{i}", (0.03, 0.03, 0.42), loc=(x, 0.38, 0.92), material=mat("metal")) for i, x in enumerate((-0.46, 0.46))]
    hood = box("HeatHood", (1.0, 0.24, 0.05), loc=(0, 0.28, 1.34), material=mat("metal", metal=0.6, rough=0.3))
    glow = box("HeatGlow", (0.8, 0.16, 0.02), loc=(0, 0.28, 1.32), material=mat("red", emit=1.6))
    ob = join("serving_counter_mesh", [counter, top, rail, pan, food, guard, hood, glow] + posts)
    parent(ob, root)
    return root


# ---------------------------------------------------------------- level 5: the boardroom (new design)

def b_floor_lamp():
    """A tall standing lamp with a drum shade. Tall enough to block sight."""
    root = empty("floor_lamp")
    foot = cyl("Foot", 0.2, 0.04, loc=(0, 0, 0), material=mat("#2f2a26", metal=0.4, rough=0.4), verts=18)
    pole = cyl("Pole", 0.025, 1.45, loc=(0, 0, 0.04), material=mat("#b08d57", metal=0.8, rough=0.3), verts=8)
    shade = cyl("Shade", 0.26, 0.34, loc=(0, 0, 1.38), material=mat("#efe4c8", emit=0.6), verts=20, radius_top=0.2)
    bulb = ball("Bulb", 0.07, loc=(0, 0, 1.45), material=mat("yellow", emit=2.0), subdiv=1)
    ob = join("floor_lamp_mesh", [foot, pole, shade, bulb])
    parent(ob, root)
    return root


def b_trophy_cabinet():
    """One tile of the trophy cabinet: glass doors, cups for things nobody remembers. Front -Y."""
    root = empty("trophy_cabinet")
    body = box("Body", (0.95, 0.45, 1.7), loc=(0, 0.15, 0), material=mat("#4a3628", rough=0.4), bevel=0.02)
    inner = box("Inner", (0.85, 0.02, 1.5), loc=(0, -0.08, 0.1), material=mat("#2f241b"))
    shelves = [box(f"Shelf{i}", (0.85, 0.3, 0.02), loc=(0, 0.05, 0.45 + 0.42 * i), material=mat("#5d4533")) for i in range(3)]
    cups = []
    for i, (x, z, col) in enumerate(((-0.2, 0.47, "yellow"), (0.22, 0.47, "metal_light"), (0.0, 0.89, "yellow"), (-0.25, 1.31, "#b87333"), (0.2, 1.31, "yellow"))):
        cups.append(cyl(f"CupBase{i}", 0.05, 0.04, loc=(x, 0.0, z), material=mat("plastic_black"), verts=8))
        cups.append(cyl(f"Cup{i}", 0.05, 0.14, loc=(x, 0.0, z + 0.04), material=mat(col, metal=0.8, rough=0.25), verts=10, radius_top=0.08))
    glass = box("Glass", (0.88, 0.02, 1.52), loc=(0, -0.09, 0.09), material=mat("window", rough=0.05, alpha=0.35))
    ob = join("trophy_cabinet_mesh", [body, inner, glass] + shelves + cups)
    parent(ob, root)
    return root


# ---------------------------------------------------------------- level 6: the house (new design)

def b_nightstand():
    root = empty("nightstand")
    body = box("Body", (0.5, 0.45, 0.5), loc=(0, 0.1, 0), material=mat("wood", rough=0.6), bevel=0.02)
    drawer = box("Drawer", (0.42, 0.01, 0.16), loc=(0, -0.13, 0.28), material=mat("wood_dark", rough=0.6))
    knob = ball("Knob", 0.02, loc=(0, -0.145, 0.36), material=mat("metal_light"), subdiv=1)
    base = cyl("LampBase", 0.07, 0.04, loc=(0.08, 0.15, 0.5), material=mat("charcoal"), verts=12)
    shade = cyl("LampShade", 0.1, 0.14, loc=(0.08, 0.15, 0.62), material=mat("#efe4c8", emit=0.5), verts=14, radius_top=0.07)
    stem = cyl("LampStem", 0.012, 0.12, loc=(0.08, 0.15, 0.52), material=mat("metal"), verts=6)
    phone = box("Phone", (0.07, 0.14, 0.01), loc=(-0.12, 0.05, 0.5), material=mat("plastic_black"))
    ob = join("nightstand_mesh", [body, drawer, knob, base, shade, stem, phone])
    parent(ob, root)
    return root


def b_wardrobe():
    """One tile of a wardrobe, tall, doors to -Y."""
    root = empty("wardrobe")
    body = box("Body", (0.96, 0.58, 1.9), loc=(0, 0.15, 0), material=mat("#d9cfbf", rough=0.6), bevel=0.02)
    doors = [box(f"Door{i}", (0.45, 0.01, 1.75), loc=(x, -0.145, 0.08), material=mat("#e6dccb", rough=0.6)) for i, x in enumerate((-0.235, 0.235))]
    handles = [box(f"Handle{i}", (0.02, 0.02, 0.25), loc=(x, -0.16, 0.95), material=mat("metal_light", metal=0.8, rough=0.3)) for i, x in enumerate((-0.04, 0.04))]
    box_top = box("TopBox", (0.5, 0.4, 0.2), loc=(0.1, 0.15, 1.9), material=mat("cardboard"))
    ob = join("wardrobe_mesh", [body, box_top] + doors + handles)
    parent(ob, root)
    return root


def b_laundry_basket():
    root = empty("laundry_basket")
    basket = cyl("Basket", 0.26, 0.42, loc=(0, 0, 0), material=mat("#cdb88f", rough=0.9), verts=14, radius_top=0.3)
    clothes = [ball(f"Cloth{i}", 0.13, loc=(x, y, 0.42), material=mat(c), subdiv=1, scale=(1.2, 1, 0.5)) for i, (x, y, c) in enumerate(((-0.08, 0.05, "blue"), (0.1, -0.05, "red"), (0.0, 0.1, "plastic_white")))]
    sock = box("Sock", (0.08, 0.25, 0.04), loc=(0.32, -0.1, 0.0), material=mat("yellow"), rot_z=0.6)
    ob = join("laundry_basket_mesh", [basket, sock] + clothes)
    parent(ob, root)
    return root


def b_armchair():
    root = empty("armchair")
    ob = join("armchair_mesh", _armchair("Arm", 0, 0, 0, "#8f5e4a"))
    parent(ob, root)
    return root


def b_coffee_table():
    root = empty("coffee_table")
    ob = join("coffee_table_mesh", _coffee_table(0.4))
    parent(ob, root)
    return root


def b_file_boxes():
    """Archive boxes, stacked: the paperwork you took home and never opened."""
    root = empty("file_boxes")
    parts = []
    for i, (x, y, z, r) in enumerate(((-0.18, 0.0, 0.0, 0.0), (0.2, 0.05, 0.0, 0.1), (-0.15, 0.02, 0.3, -0.12), (0.18, 0.0, 0.3, 0.05))):
        parts.append(box(f"Box{i}", (0.38, 0.5, 0.3), loc=(x, y, z), material=mat("cardboard", rough=0.9), bevel=0.01, rot_z=r))
        parts.append(box(f"Label{i}", (0.16, 0.01, 0.08), loc=(x, y - 0.255, z + 0.12), material=mat("paper"), rot_z=r))
    ob = join("file_boxes_mesh", parts)
    parent(ob, root)
    return root


# ---------------------------------------------------------------- level 7: the car park at scale

def b_car_long_blue():
    """A car in a 2x3 bay: lengthwise along X here, the level turns it."""
    return _car("car_long_blue", "#3e7cc9", w=2.6, d=1.5, cab_h=0.45)


def b_car_long_red():
    return _car("car_long_red", "#c8423b", w=2.5, d=1.45, cab_h=0.45)


def b_car_long_white():
    return _car("car_long_white", "#e8e6e0", w=2.6, d=1.5, cab_h=0.45)


def b_van_long():
    """A delivery van in a 2x3 bay. Tall: it blocks sight."""
    return _car("van_long", "#eeeeea", w=2.8, d=1.6, van=True)


def b_stairwell():
    """The stairwell in the corner, 2x3: concrete, a fire door, a green running man."""
    root = empty("stairwell")
    body = box("Body", (1.9, 2.9, 1.9), loc=(0, 0, 0), material=mat("#a9a59d", rough=0.9), bevel=0.02)
    cap = box("Cap", (1.95, 2.95, 0.06), loc=(0, 0, 1.9), material=mat("charcoal"))
    door = box("Door", (0.02, 0.8, 1.3), loc=(0.955, 0.6, 0.0), material=mat("#c8423b", rough=0.5))
    bar = box("Bar", (0.04, 0.6, 0.04), loc=(0.975, 0.6, 0.6), material=mat("metal_light", metal=0.8, rough=0.3))
    sign = box("Exit", (0.02, 0.45, 0.2), loc=(0.96, 0.6, 1.45), material=mat("plant", emit=2.0))
    man = box("ExitMan", (0.025, 0.12, 0.14), loc=(0.965, 0.55, 1.48), material=mat("plastic_white", emit=1.5))
    stripes = [box(f"Stripe{i}", (0.02, 0.3, 0.06), loc=(0.96, -0.9 + 0.4 * i, 0.15), material=mat("yellow")) for i in range(3)]
    ob = join("stairwell_mesh", [body, cap, door, bar, sign, man] + stripes)
    parent(ob, root)
    return root


def b_garage_lift():
    """Two lift doors along a 3 tile stretch of wall, front to -Y."""
    root = empty("garage_lift")
    wall = box("Wall", (2.9, 0.8, 1.9), loc=(0, 0.1, 0), material=mat("#bdb8ae", rough=0.8), bevel=0.02)
    parts = [wall]
    for i, x in enumerate((-0.7, 0.7)):
        parts.append(box(f"Frame{i}", (1.0, 0.04, 1.45), loc=(x, -0.31, 0.0), material=mat("metal", metal=0.6, rough=0.3)))
        for j, dx in enumerate((-0.22, 0.22)):
            parts.append(box(f"Door{i}{j}", (0.42, 0.03, 1.35), loc=(x + dx, -0.33, 0.02), material=mat("metal_light", metal=0.8, rough=0.25)))
        parts.append(box(f"Button{i}", (0.06, 0.03, 0.1), loc=(x + 0.6, -0.31, 0.75), material=mat("yellow", emit=1.2)))
        parts.append(box(f"Display{i}", (0.3, 0.03, 0.1), loc=(x, -0.31, 1.55), material=mat("red", emit=1.4)))
    ob = join("garage_lift_mesh", parts)
    parent(ob, root)
    return root


# ---------------------------------------------------------------- Pomodoro Timer (level 8)

def _tomato(x, y, z, r, name="Tomato"):
    body = ball(f"{name}Body", r, loc=(x, y, z + r * 0.85), material=mat("#d8452f", rough=0.45), subdiv=2, scale=(1, 1, 0.85))
    dial = cyl(f"{name}Dial", r * 0.55, 0.01, loc=(x, y - r * 0.92, z + r * 0.85), material=mat("plastic_white"), verts=16)
    kit.tilt([dial], rx=math.pi / 2, pivot=(x, y - r * 0.92, z + r * 0.85))
    hand = box(f"{name}Hand", (r * 0.06, 0.012, r * 0.45), loc=(x, y - r * 0.95, z + r * 0.85), material=mat("plastic_black"))
    stem = cyl(f"{name}Stem", r * 0.12, r * 0.25, loc=(x, y, z + r * 1.6), material=mat("plant_dark"), verts=8)
    leaves = [box(f"{name}Leaf{i}", (r * 0.5, r * 0.14, 0.01), loc=(x, y, z + r * 1.62), material=mat("plant"), rot_z=a) for i, a in enumerate((0.0, 1.05, 2.1))]
    return [body, dial, hand, stem] + leaves


def b_tomato_shell():
    """The tomato in flight."""
    root = empty("tomato_shell")
    ob = join("tomato_shell_mesh", _tomato(0, 0, -0.12, 0.14))
    parent(ob, root)
    return root


# ---------------------------------------------------------------- level 8: hot desks

def b_flex_desk():
    """An empty flex desk: a monitor, a dock, a chair pushed in. A tower you place takes its spot."""
    root = empty("flex_desk")
    top = box("Top", (0.92, 0.62, 0.04), loc=(0, 0.06, 0.7), material=mat("plastic_white", rough=0.4))
    legs = [box(f"Leg{i}", (0.04, 0.55, 0.7), loc=(x, 0.06, 0), material=_metal()) for i, x in enumerate((-0.42, 0.42))]
    parts = [top] + legs + _monitor(0, 0.25, 0.74, w=0.4, hgt=0.25)
    dock = box("Dock", (0.2, 0.1, 0.03), loc=(0.25, 0.0, 0.74), material=mat("plastic_black"))
    card = box("Card", (0.14, 0.02, 0.08), loc=(-0.25, -0.05, 0.74), material=mat("plant", emit=0.5))
    parts += [dock, card] + _chair("charcoal", "charcoal", s=0.85)[0:0]
    seat = box("Seat", (0.38, 0.38, 0.06), loc=(0, -0.42, 0.42), material=mat("charcoal"), bevel=0.02)
    back = box("Back", (0.38, 0.05, 0.36), loc=(0, -0.6, 0.46), material=mat("charcoal"), bevel=0.02)
    post = cyl("Post", 0.025, 0.42, loc=(0, -0.42, 0), material=_metal(), verts=8)
    ob = join("flex_desk_mesh", parts + [seat, back, post])
    parent(ob, root)
    return root


def b_lockers():
    """One tile of lockers, tall, doors to -Y."""
    root = empty("lockers")
    body = box("Body", (0.96, 0.5, 1.85), loc=(0, 0.2, 0), material=mat("#5f7f96", rough=0.5), bevel=0.01)
    parts = [body]
    for i, x in enumerate((-0.24, 0.24)):
        for j, z in enumerate((0.05, 0.95)):
            parts.append(box(f"Door{i}{j}", (0.44, 0.01, 0.85), loc=(x, -0.055, z), material=mat("#6f91aa", rough=0.5)))
            parts.append(box(f"Vent{i}{j}", (0.2, 0.012, 0.06), loc=(x, -0.06, z + 0.7), material=mat("charcoal")))
            parts.append(box(f"Lock{i}{j}", (0.04, 0.015, 0.06), loc=(x + 0.15, -0.065, z + 0.4), material=mat("metal_light", metal=0.8)))
    ob = join("lockers_mesh", parts)
    parent(ob, root)
    return root


def b_phone_booth():
    """A quiet booth, two tiles wide: glass front, someone's coat on the hook. Front -Y."""
    root = empty("phone_booth")
    shell = box("Shell", (1.9, 0.9, 1.95), loc=(0, 0.05, 0), material=mat("#3b3f46", rough=0.7), bevel=0.03)
    glass = box("Glass", (1.6, 0.02, 1.6), loc=(0, -0.41, 0.15), material=mat("window", rough=0.05, alpha=0.45))
    light = box("Light", (1.2, 0.3, 0.03), loc=(0, 0.05, 1.9), material=mat("plastic_white", emit=1.2))
    seat = box("Seat", (0.8, 0.4, 0.42), loc=(0, 0.2, 0.0), material=mat("teal", rough=0.8))
    shelf = box("Shelf", (0.6, 0.25, 0.03), loc=(0, 0.3, 0.75), material=mat("wood"))
    ob = join("phone_booth_mesh", [shell, glass, light, seat, shelf])
    parent(ob, root)
    return root


def b_desk_phone():
    """An old desk phone, ringing. Drawn on top of whatever stands on the desk."""
    root = empty("desk_phone")
    base = box("Base", (0.3, 0.24, 0.08), loc=(0, 0, 0), material=mat("plastic_black"), bevel=0.02, taper=0.8)
    pad = box("Keys", (0.14, 0.12, 0.01), loc=(0.04, -0.03, 0.08), material=mat("metal_light"))
    hand = box("Handset", (0.34, 0.08, 0.06), loc=(0, 0.07, 0.1), material=mat("red"), bevel=0.02)
    cord = cyl("Cord", 0.01, 0.12, loc=(-0.17, 0.05, 0.0), material=mat("red"), verts=6)
    light = box("RingLight", (0.04, 0.04, 0.02), loc=(-0.1, -0.08, 0.08), material=mat("red", emit=3.0))
    ob = join("desk_phone_mesh", [base, pad, hand, cord, light])
    parent(ob, root)
    return root


def b_reserved_sign():
    """A folded card on the desk: RESERVED."""
    root = empty("reserved_sign")
    card = box("Card", (0.36, 0.02, 0.16), loc=(0, 0, 0), material=mat("red", emit=0.4))
    kit.tilt([card], rx=0.35, pivot=(0, 0, 0))
    back = box("CardBack", (0.36, 0.02, 0.16), loc=(0, 0.06, 0), material=mat("red", emit=0.4))
    kit.tilt([back], rx=-0.35, pivot=(0, 0.06, 0))
    words = _text("ReservedText", "RESERVED", 0.05, (0, -0.03, 0.08), mat("plastic_white", emit=1.0))
    kit.tilt([words], rx=0.35, pivot=(0, -0.03, 0.0))
    ob = join("reserved_sign_mesh", [card, back, words])
    parent(ob, root)
    return root


# ---------------------------------------------------------------- level 9: Town Hall

def _poster_board(w, hgt, z, col, text_col="plastic_white", emit=0.3, name="Board"):
    frame = box(f"{name}Frame", (w + 0.06, 0.04, hgt + 0.06), loc=(0, 0.1, z - 0.03), material=mat("plastic_black"))
    art = box(f"{name}Art", (w, 0.045, hgt), loc=(0, 0.095, z), material=mat(col, emit=emit))
    sun = ball(f"{name}Sun", w * 0.16, loc=(0, 0.07, z + hgt * 0.62), material=mat("yellow", emit=emit + 0.4), subdiv=1, scale=(1, 0.2, 1))
    hill = box(f"{name}Hill", (w * 0.9, 0.05, hgt * 0.22), loc=(0, 0.08, z + hgt * 0.12), material=mat("plant", emit=emit), taper=0.5)
    line = box(f"{name}Line", (w * 0.7, 0.05, 0.035), loc=(0, 0.075, z + hgt * 0.04), material=mat(text_col, emit=emit + 0.3))
    return [frame, art, sun, hill, line]


def b_tribune_step():
    """A raised step of the tribune: towers on it stand a little higher and see further."""
    root = empty("tribune_step")
    step = box("Step", (1.0, 1.0, 0.18), loc=(0, 0, 0), material=mat("#8a6a4c", rough=0.7))
    nose = box("Nose", (1.0, 0.06, 0.02), loc=(0, -0.47, 0.18), material=mat("yellow"))
    ob = join("tribune_step_mesh", [step, nose])
    parent(ob, root)
    return root


def b_auditorium_seats():
    """One tile of a row of folding seats on a riser, facing -Y."""
    root = empty("auditorium_seats")
    riser = box("Riser", (1.0, 1.0, 0.18), loc=(0, 0, 0), material=mat("#8a6a4c", rough=0.7))
    parts = [riser]
    for i, x in enumerate((-0.24, 0.24)):
        parts.append(box(f"Seat{i}", (0.4, 0.38, 0.06), loc=(x, -0.05, 0.6), material=mat("#8f3b33", rough=0.6), bevel=0.02))
        parts.append(box(f"Back{i}", (0.4, 0.06, 0.44), loc=(x, 0.17, 0.62), material=mat("#8f3b33", rough=0.6), bevel=0.02))
        parts.append(box(f"Arm{i}", (0.04, 0.4, 0.3), loc=(x + 0.22, 0.0, 0.42), material=mat("metal")))
    parts.append(box("Leg", (0.9, 0.06, 0.42), loc=(0, 0.17, 0.18), material=mat("metal")))
    ob = join("auditorium_seats_mesh", parts)
    parent(ob, root)
    return root


def b_control_desk():
    """The sound and light desk at the back, two tiles wide, faders and all. Front to -Y."""
    root = empty("control_desk")
    body = box("Body", (1.9, 0.7, 0.8), loc=(0, 0.05, 0), material=mat("charcoal"), bevel=0.02)
    top = box("Top", (1.9, 0.6, 0.05), loc=(0, 0.05, 0.8), material=mat("plastic_black"))
    kit.tilt([top], rx=-0.25, pivot=(0, 0.05, 0.8))
    parts = [body, top]
    for i in range(12):
        parts.append(box(f"Fader{i}", (0.04, 0.12, 0.03), loc=(-0.8 + i * 0.145, 0.0, 0.84 + (i % 3) * 0.01), material=mat(["red", "yellow", "plant"][i % 3], emit=1.2)))
    parts += _monitor(-0.4, 0.3, 0.86, w=0.5, hgt=0.3) + _monitor(0.4, 0.3, 0.86, w=0.5, hgt=0.3)
    ob = join("control_desk_mesh", parts)
    parent(ob, root)
    return root


def b_tv_camera():
    """A camera on a tripod, pointed at the stage (-Y)."""
    root = empty("tv_camera")
    parts = []
    for i, a in enumerate((0.0, 2.1, 4.2)):
        leg = box(f"Leg{i}", (0.03, 0.03, 1.3), loc=(math.sin(a) * 0.22, math.cos(a) * 0.22, 0), material=mat("metal"))
        kit.tilt([leg], rx=math.cos(a) * 0.17, ry=-math.sin(a) * 0.17, pivot=(math.sin(a) * 0.22, math.cos(a) * 0.22, 0))
        parts.append(leg)
    body = box("Body", (0.24, 0.5, 0.28), loc=(0, 0, 1.25), material=mat("plastic_black"), bevel=0.03)
    lens = cyl("Lens", 0.09, 0.2, loc=(0, -0.25, 1.39), material=mat("charcoal"), verts=14)
    kit.tilt([lens], rx=math.pi / 2, pivot=(0, -0.25, 1.39))
    tally = box("Tally", (0.05, 0.03, 0.04), loc=(0, -0.2, 1.55), material=mat("red", emit=3.0))
    ob = join("tv_camera_mesh", parts + [body, lens, tally])
    parent(ob, root)
    return root


def b_stage_screen():
    """The screen at the front of the stage, ten tiles wide but kept low so you can still see
    the stage over it. Front to -Y."""
    root = empty("stage_screen")
    frame = box("Frame", (9.4, 0.16, 1.1), loc=(0, 0, 0.1), material=mat("plastic_black"))
    legs = [box(f"Leg{i}", (0.08, 0.3, 0.1), loc=(x, 0, 0), material=mat("metal")) for i, x in enumerate((-4.4, 4.4))]
    glow = box("Glow", (9.1, 0.05, 0.85), loc=(0, -0.08, 0.22), material=mat("#2f3d5c", emit=0.9))
    parts = [frame, glow] + legs
    for i, (w, z, c) in enumerate(((6.0, 0.85, "plastic_white"), (4.0, 0.6, "yellow"), (7.0, 0.35, "teal"))):
        parts.append(box(f"Line{i}", (w, 0.06, 0.1), loc=(0, -0.1, z), material=mat(c, emit=1.4)))
    ob = join("stage_screen_mesh", parts)
    parent(ob, root)
    return root

# ---------------------------------------------------------------- level 10: Boardroom II

def b_glass_blinds():
    """One tile of the glass room's wall, along X. The blinds (BlindSlats) are a part of their own,
    hung from the top: the game lets them down while the board meets."""
    root = empty("glass_blinds")
    post = box("Post", (0.05, 0.08, 1.5), loc=(-0.475, 0, 0), material=_metal())
    rail = box("Rail", (1.0, 0.08, 0.05), loc=(0, 0, 1.5), material=_metal())
    sill = box("Sill", (1.0, 0.08, 0.04), loc=(0, 0, 0), material=_metal())
    glass = box("Glass", (0.95, 0.03, 1.46), loc=(0, 0, 0.04), material=_glass(0.15))
    ob = join("glass_blinds_mesh", [post, rail, sill, glass])
    parent(ob, root)
    slats = [box(f"Slat{i}", (0.94, 0.05, 0.05), loc=(0, -0.05, 1.42 - i * 0.07), material=mat("#d9d4ca", rough=0.6)) for i in range(20)]
    bl = join("BlindSlats", slats)
    set_origin(bl, (0, -0.05, 1.47))
    parent(bl, root)
    return root


# ---------------------------------------------------------------- level 11: the Merger

def b_consultant():
    """The Consultant: a sharp suit, a lanyard from another company, and a flip chart he
    brought himself."""
    s = 1.5
    root, body, hz = person("consultant", "#3b3f46", "#3b3f46", "skin_2", "hair_dark", style="side", h=s)
    shirt = box("ShirtV", (0.1 * s, 0.012 * s, 0.16 * s), loc=(0, -0.104 * s, 0.52 * s), material=mat("#cfe3f2"), taper=0.4)
    lanyard = box("Lanyard", (0.02 * s, 0.012 * s, 0.2 * s), loc=(0.04 * s, -0.107 * s, 0.5 * s), material=mat("orange"))
    card = box("Card", (0.06 * s, 0.012 * s, 0.08 * s), loc=(0.04 * s, -0.108 * s, 0.38 * s), material=mat("orange", emit=0.4))
    glasses = box("Glasses", (0.17 * s, 0.02 * s, 0.03 * s), loc=(0, -0.125 * s, hz), material=mat("#b08d57", metal=0.8))
    acc = join("Props", [shirt, lanyard, card, glasses])
    parent(acc, root)
    hp = _hand_world(_arm(root, "R"), s)
    pad = box("Flip", (0.02 * s, 0.32 * s, 0.24 * s), loc=(hp.x, hp.y - 0.04 * s, hp.z - 0.2 * s), material=mat("paper"))
    graph = box("Graph", (0.022 * s, 0.24 * s, 0.03 * s), loc=(hp.x - 0.002 * s, hp.y - 0.04 * s, hp.z - 0.1 * s), material=mat("plant", emit=0.4))
    kit.tilt([graph], rx=0.5, pivot=(hp.x, hp.y - 0.04 * s, hp.z - 0.1 * s))
    _hold(root, "R", s, [pad, graph])
    hl = _hand_world(_arm(root, "L"), s)
    phone = box("Phone", (0.02 * s, 0.05 * s, 0.09 * s), loc=(hl.x, hl.y - 0.03 * s, hl.z - 0.05 * s), material=mat("plastic_black"))
    _hold(root, "L", s, [phone])
    return root


def b_pingpong_table():
    """A ping-pong table, three tiles by two. Nobody has won a game since the merger."""
    root = empty("pingpong_table")
    top = box("Top", (2.7, 1.5, 0.05), loc=(0, 0, 0.72), material=mat("#2f6b4f", rough=0.5))
    lines = [box("Mid", (0.02, 1.5, 0.055), loc=(0, 0, 0.72), material=mat("plastic_white")), box("Edge", (2.7, 0.03, 0.055), loc=(0, 0, 0.72), material=mat("plastic_white"))]
    net = box("Net", (0.02, 1.6, 0.15), loc=(0, 0, 0.77), material=mat("plastic_white", alpha=0.7))
    legs = [box(f"Leg{i}", (0.05, 0.05, 0.72), loc=(x, y, 0), material=mat("metal")) for i, (x, y) in enumerate(((-1.2, -0.6), (1.2, -0.6), (-1.2, 0.6), (1.2, 0.6)))]
    ball_ob = ball("Ball", 0.03, loc=(0.6, 0.3, 0.8), material=mat("orange"), subdiv=1)
    bats = [box(f"Bat{i}", (0.15, 0.12, 0.015), loc=(x, y, 0.775), material=mat("red"), rot_z=r) for i, (x, y, r) in enumerate(((-1.0, 0.4, 0.5), (1.0, -0.3, -0.3)))]
    ob = join("pingpong_table_mesh", [top, net, ball_ob] + lines + legs + bats)
    parent(ob, root)
    return root


def b_beanbag():
    root = empty("beanbag")
    bag = ball("Bag", 0.38, loc=(0, 0, 0.0), material=mat("orange", rough=0.95), subdiv=2, scale=(1, 1, 0.6))
    dent = ball("Dent", 0.2, loc=(0, -0.05, 0.3), material=mat("#c96a3d", rough=0.95), subdiv=1, scale=(1, 1, 0.35))
    ob = join("beanbag_mesh", [bag, dent])
    parent(ob, root)
    return root


def b_neon_sign():
    """The startup's neon sign on a frame, two tiles long, front to -Y."""
    root = empty("neon_sign")
    frame = box("Frame", (1.9, 0.12, 1.7), loc=(0, 0.1, 0), material=mat("#3b3f46"))
    words = _text("NeonText", "MOVE FAST", 0.24, (0, 0.02, 1.15), mat("pink", emit=3.0))
    words2 = _text("NeonText2", "BREAK THINGS", 0.18, (0, 0.02, 0.8), mat("teal", emit=3.0))
    ob = join("neon_sign_mesh", [frame, words, words2])
    parent(ob, root)
    return root


def b_moving_boxes():
    """A stack of moving boxes, still taped shut. Clear them for Coffee."""
    root = empty("moving_boxes")
    parts = []
    for i, (x, y, z, w, d, hgt, r) in enumerate(((-0.18, -0.12, 0, 0.5, 0.45, 0.4, 0.05), (0.2, 0.15, 0, 0.45, 0.45, 0.35, -0.1), (-0.05, 0.0, 0.4, 0.45, 0.4, 0.35, 0.15))):
        parts.append(box(f"Box{i}", (w, d, hgt), loc=(x, y, z), material=mat("cardboard", rough=0.9), bevel=0.01, rot_z=r))
        parts.append(box(f"Tape{i}", (w * 0.12, d + 0.01, 0.01), loc=(x, y, z + hgt), material=mat("#d9c9a3"), rot_z=r))
        parts.append(box(f"Label{i}", (0.14, 0.01, 0.08), loc=(x, y - d / 2 - 0.005, z + hgt * 0.6), material=mat("paper"), rot_z=r))
    ob = join("moving_boxes_mesh", parts)
    parent(ob, root)
    return root


# ---------------------------------------------------------------- level 12: HR Room

def b_hrmanager():
    """The HR Manager: a cardigan, a lanyard, and a folder with your name on it."""
    s = 1.45
    root, body, hz = person("hrmanager", "#8e6fbf", "charcoal", "skin_1", "hair_red", style="bob", h=s)
    lanyard = box("Lanyard", (0.02 * s, 0.012 * s, 0.2 * s), loc=(0, -0.107 * s, 0.5 * s), material=mat("teal"))
    card = box("Card", (0.06 * s, 0.012 * s, 0.08 * s), loc=(0, -0.108 * s, 0.38 * s), material=mat("plastic_white"))
    glasses = box("Glasses", (0.17 * s, 0.02 * s, 0.03 * s), loc=(0, -0.125 * s, hz), material=mat("red"))
    acc = join("Props", [lanyard, card, glasses])
    parent(acc, root)
    hp = _hand_world(_arm(root, "R"), s)
    folder = box("Folder", (0.03 * s, 0.24 * s, 0.3 * s), loc=(hp.x, hp.y - 0.02 * s, hp.z - 0.2 * s), material=mat("red", rough=0.6))
    tab = box("Tab", (0.032 * s, 0.06 * s, 0.03 * s), loc=(hp.x, hp.y - 0.1 * s, hp.z - 0.04 * s), material=mat("yellow"))
    _hold(root, "R", s, [folder, tab])
    hl = _hand_world(_arm(root, "L"), s)
    pen = cyl("Pen", 0.01 * s, 0.12 * s, loc=(hl.x, hl.y - 0.03 * s, hl.z - 0.08 * s), material=mat("blue"), verts=6)
    _hold(root, "L", s, [pen])
    return root


def b_filing_cabinet():
    """A tall filing cabinet, four drawers, front to -Y."""
    root = empty("filing_cabinet")
    body = box("Body", (0.8, 0.6, 1.5), loc=(0, 0.1, 0), material=mat("#8a9199", metal=0.4, rough=0.5), bevel=0.01)
    parts = [body]
    for i in range(4):
        z = 0.08 + i * 0.36
        parts.append(box(f"Drawer{i}", (0.72, 0.01, 0.3), loc=(0, -0.205, z), material=mat("#9aa1a9", metal=0.4, rough=0.5)))
        parts.append(box(f"Handle{i}", (0.2, 0.02, 0.03), loc=(0, -0.215, z + 0.2), material=mat("metal_light", metal=0.8, rough=0.3)))
        parts.append(box(f"Label{i}", (0.14, 0.012, 0.06), loc=(0, -0.212, z + 0.08), material=mat("paper")))
    ob = join("filing_cabinet_mesh", parts)
    parent(ob, root)
    return root


def b_safe():
    root = empty("safe")
    body = box("Body", (0.8, 0.7, 1.1), loc=(0, 0.05, 0), material=mat("#3b3f46", metal=0.6, rough=0.4), bevel=0.02)
    door = box("Door", (0.66, 0.02, 0.9), loc=(0, -0.31, 0.1), material=mat("#4a4f57", metal=0.6, rough=0.35))
    dial = cyl("Dial", 0.08, 0.04, loc=(0.1, -0.33, 0.6), material=mat("metal_light", metal=0.8), verts=16)
    kit.tilt([dial], rx=math.pi / 2, pivot=(0.1, -0.33, 0.6))
    handle = box("Handle", (0.04, 0.04, 0.2), loc=(-0.15, -0.34, 0.45), material=mat("metal_light", metal=0.8))
    ob = join("safe_mesh", [body, door, dial, handle])
    parent(ob, root)
    return root


def b_complaint_box():
    root = empty("complaint_box")
    post = box("Post", (0.08, 0.08, 0.85), loc=(0, 0, 0), material=mat("metal"))
    boxo = box("Box", (0.4, 0.3, 0.32), loc=(0, 0, 0.85), material=mat("red", rough=0.5), bevel=0.02)
    slot = box("Slot", (0.24, 0.01, 0.03), loc=(0, -0.155, 1.1), material=mat("plastic_black"))
    label = box("Label", (0.26, 0.012, 0.08), loc=(0, -0.156, 0.94), material=mat("plastic_white", emit=0.3))
    ob = join("complaint_box_mesh", [post, boxo, slot, label])
    parent(ob, root)
    return root


def b_one_way_mirror():
    """One tile of the one-way mirror, along X: dark, shiny glass in a frame."""
    root = empty("one_way_mirror")
    frame = box("Frame", (1.0, 0.12, 1.5), loc=(0, 0, 0), material=mat("#3b3f46"))
    glass = box("Glass", (0.92, 0.13, 1.3), loc=(0, 0, 0.1), material=mat("#5d6b7a", rough=0.05, metal=0.8, alpha=0.75))
    ob = join("one_way_mirror_mesh", [frame, glass])
    parent(ob, root)
    return root


# ---------------------------------------------------------------- level 13: Server Room

def b_server_rack():
    """One server rack, tall, front to -Y. The status lights (RackLights) are a part of their own
    so the game can make them blink."""
    root = empty("server_rack")
    body = box("Body", (0.9, 0.8, 2.0), loc=(0, 0.05, 0), material=mat("#22252b", metal=0.4, rough=0.5))
    parts = [body]
    for i in range(8):
        parts.append(box(f"Unit{i}", (0.8, 0.02, 0.18), loc=(0, -0.36, 0.15 + i * 0.22), material=mat("#33373f", metal=0.5, rough=0.4)))
        parts.append(box(f"Vent{i}", (0.4, 0.025, 0.06), loc=(-0.15, -0.37, 0.2 + i * 0.22), material=mat("charcoal")))
    ob = join("server_rack_mesh", parts)
    parent(ob, root)
    lights = []
    for i in range(8):
        for j in range(3):
            lights.append(box(f"Led{i}{j}", (0.035, 0.02, 0.035), loc=(0.2 + j * 0.07, -0.375, 0.24 + i * 0.22), material=mat(["plant", "plant", "yellow", "blue"][(i + j) % 4], emit=3.0)))
    parent(join("RackLights", lights), root)
    return root


def b_server_cart():
    """A cart with the new server on it, waiting in front of its empty rack."""
    root = empty("server_cart")
    deck = box("Deck", (0.8, 0.6, 0.04), loc=(0, 0, 0.3), material=_metal())
    shelf = box("Shelf", (0.8, 0.6, 0.03), loc=(0, 0, 0.08), material=_metal())
    posts = [box(f"Post{i}", (0.03, 0.03, 0.75), loc=(x, y, 0.05), material=_metal()) for i, (x, y) in enumerate(((-0.38, -0.28), (0.38, -0.28), (-0.38, 0.28), (0.38, 0.28)))]
    wheels = [cyl(f"Wheel{i}", 0.04, 0.03, loc=(x, y, 0.0), material=mat("plastic_black"), verts=10) for i, (x, y) in enumerate(((-0.35, -0.25), (0.35, -0.25), (-0.35, 0.25), (0.35, 0.25)))]
    server = box("Server", (0.7, 0.5, 0.18), loc=(0, 0, 0.34), material=mat("#33373f", metal=0.5), bevel=0.01)
    led = box("ServerLed", (0.04, 0.02, 0.03), loc=(0.25, -0.26, 0.45), material=mat("red", emit=2.0))
    box2 = box("Box", (0.5, 0.4, 0.3), loc=(0, 0, 0.11), material=mat("cardboard"))
    ob = join("server_cart_mesh", [deck, shelf, server, led, box2] + posts + wheels)
    parent(ob, root)
    return root


def b_cable_reel():
    root = empty("cable_reel")
    parts = []
    for i, y in enumerate((-0.2, 0.2)):
        disc = cyl(f"Disc{i}", 0.35, 0.04, loc=(0, y, 0.35), material=mat("wood"), verts=18)
        kit.tilt([disc], rx=math.pi / 2, pivot=(0, y, 0.35))
        parts.append(disc)
    core = cyl("Core", 0.25, 0.4, loc=(0, -0.2, 0.35), material=mat("orange", rough=0.6), verts=18)
    kit.tilt([core], rx=-math.pi / 2, pivot=(0, -0.2, 0.35))
    ob = join("cable_reel_mesh", parts + [core])
    parent(ob, root)
    return root


def b_floor_cables():
    """Cables across the floor: you can build over them, they are just in the way of your feet."""
    root = empty("floor_cables")
    parts = []
    for i, (y, c, w) in enumerate(((-0.25, "blue", 0.9), (0.0, "yellow", 1.0), (0.22, "red", 0.85))):
        parts.append(box(f"Cable{i}", (w, 0.03, 0.02), loc=(0, y, 0.0), material=mat(c, rough=0.6), rot_z=0.15 * (i - 1)))
    ob = join("floor_cables_mesh", parts)
    parent(ob, root)
    return root


def b_noc_wall():
    """The monitor wall in the network operations centre, three tiles wide. Front to -Y."""
    root = empty("noc_wall")
    frame = box("Frame", (2.9, 0.3, 1.9), loc=(0, 0.2, 0), material=mat("#22252b"))
    parts = [frame]
    for r in range(2):
        for c in range(3):
            x = -0.95 + c * 0.95
            z = 0.4 + r * 0.72
            parts.append(box(f"Screen{r}{c}", (0.9, 0.04, 0.66), loc=(x, 0.03, z), material=mat(["#2f3d5c", "#1f4d3a", "#3d2f5c"][(r + c) % 3], emit=0.9)))
            parts.append(box(f"Graph{r}{c}", (0.6, 0.045, 0.05), loc=(x, 0.02, z + 0.3), material=mat(["plant", "yellow", "teal"][(r + c) % 3], emit=1.6)))
    ob = join("noc_wall_mesh", parts)
    parent(ob, root)
    return root


# ---------------------------------------------------------------- level 14: Release Night

def b_projectmanager():
    """The Project Manager: rolled-up sleeves, a headset, a laptop with the burndown chart."""
    s = 1.45
    root, body, hz = person("projectmanager", "#3e7cc9", "denim", "skin_3", "hair_blond", style="short", h=s)
    headset = box("Headset", (0.2 * s, 0.04 * s, 0.03 * s), loc=(0, 0, hz + 0.1 * s), material=mat("plastic_black"))
    mic = box("Mic", (0.02 * s, 0.1 * s, 0.02 * s), loc=(0.09 * s, -0.08 * s, hz - 0.05 * s), material=mat("plastic_black"))
    acc = join("Props", [headset, mic])
    parent(acc, root)
    hp = _hand_world(_arm(root, "R"), s)
    lap = box("Laptop", (0.02 * s, 0.3 * s, 0.22 * s), loc=(hp.x, hp.y - 0.03 * s, hp.z - 0.18 * s), material=mat("metal_light", metal=0.6))
    chart = box("Chart", (0.022 * s, 0.24 * s, 0.03 * s), loc=(hp.x - 0.002 * s, hp.y - 0.03 * s, hp.z - 0.1 * s), material=mat("red", emit=0.8))
    kit.tilt([chart], rx=-0.4, pivot=(hp.x, hp.y - 0.03 * s, hp.z - 0.1 * s))
    _hold(root, "R", s, [lap, chart])
    hl = _hand_world(_arm(root, "L"), s)
    can = cyl("Can", 0.035 * s, 0.11 * s, loc=(hl.x, hl.y - 0.04 * s, hl.z - 0.08 * s), material=mat("plant", emit=0.4), verts=10)
    _hold(root, "L", s, [can])
    return root


def b_lamp_desk():
    """A desk at night: a desk lamp is the only light, and someone left their laptop open."""
    root = empty("lamp_desk")
    top = box("Top", (0.95, 0.65, 0.04), loc=(0, 0.05, 0.7), material=mat("wood", rough=0.5))
    legs = [box(f"Leg{i}", (0.04, 0.6, 0.7), loc=(x, 0.05, 0), material=_metal()) for i, x in enumerate((-0.43, 0.43))]
    parts = [top] + legs + _laptop(-0.1, 0.0, 0.74)
    base = cyl("LampBase", 0.07, 0.03, loc=(0.3, 0.18, 0.74), material=mat("plastic_black"), verts=12)
    arm = box("LampArm", (0.025, 0.025, 0.35), loc=(0.3, 0.18, 0.77), material=mat("plastic_black"))
    kit.tilt([arm], ry=-0.4, pivot=(0.3, 0.18, 0.77))
    shade = cyl("LampShade", 0.09, 0.1, loc=(0.18, 0.18, 1.0), material=mat("yellow", emit=1.0), verts=12, radius_top=0.04)
    bulb = ball("Bulb", 0.05, loc=(0.18, 0.18, 0.98), material=mat("yellow", emit=4.0), subdiv=1)
    mug = cyl("Mug", 0.035, 0.08, loc=(-0.35, 0.15, 0.74), material=mat("red"), verts=10)
    ob = join("lamp_desk_mesh", parts + [base, arm, shade, bulb, mug])
    parent(ob, root)
    return root


def b_pizza_boxes():
    """Empty pizza boxes, stacked a bit crooked."""
    root = empty("pizza_boxes")
    parts = []
    for i in range(4):
        parts.append(box(f"Box{i}", (0.5, 0.5, 0.06), loc=(0.02 * i, -0.015 * i, i * 0.065), material=mat("#d9c9a3", rough=0.9), rot_z=0.12 * (i % 2 - 0.5)))
        parts.append(box(f"Logo{i}", (0.18, 0.18, 0.005), loc=(0.02 * i, -0.015 * i, i * 0.065 + 0.06), material=mat("red"), rot_z=0.12 * (i % 2 - 0.5)))
    ob = join("pizza_boxes_mesh", parts)
    parent(ob, root)
    return root


def b_pizza():
    """A fresh pizza, box open, glowing a little: take it."""
    root = empty("pizza")
    base = box("Box", (0.55, 0.55, 0.05), loc=(0, 0, 0), material=mat("#d9c9a3", rough=0.9))
    lid = box("Lid", (0.55, 0.03, 0.5), loc=(0, 0.28, 0.05), material=mat("#d9c9a3", rough=0.9))
    kit.tilt([lid], rx=-0.4, pivot=(0, 0.28, 0.05))
    pie = cyl("Pie", 0.24, 0.03, loc=(0, 0, 0.05), material=mat("yellow", emit=0.6), verts=20)
    tops = [cyl(f"Top{i}", 0.04, 0.01, loc=(0.12 * math.cos(i * 1.3), 0.12 * math.sin(i * 1.3), 0.08), material=mat("red"), verts=10) for i in range(6)]
    ob = join("pizza_mesh", [base, lid, pie] + tops)
    parent(ob, root)
    return root



# ---------------------------------------------------------------- Auto-Reply looks per path
# Path colours from towers.ts: TEMPLATES #e5a04b, RULES #7fb6e3, READ RECEIPTS #b48ce0.
AR_T, AR_R, AR_P = "#e5a04b", "#7fb6e3", "#b48ce0"


# ---------------------------------------------------------------- Office Artillery looks per path
# Path colours from towers.ts: HEAVY DUTY #e5534b, RAPID FIRE #e5a04b, PRECISION #b48ce0.
AT_H, AT_R, AT_P = "#e5534b", "#e5a04b", "#b48ce0"


# ---------------------------------------------------------------- Headphones looks per path
# Path colours from towers.ts: NOISE CANCELLING #6fcf7f, VOLUME #7fb6e3, FOCUS MUSIC #b48ce0.
HP_N, HP_V, HP_F = "#6fcf7f", "#7fb6e3", "#b48ce0"


def _speaker(name, x, y, z, w, d, hgt, body, cone):
    cab = box(f"{name}Cab", (w, d, hgt), loc=(x, y, z), material=body, bevel=0.01)
    woof = cyl(f"{name}Woof", w * 0.36, 0.02, loc=(x, y - d / 2, z + hgt * 0.35), material=cone, verts=14, rot=(math.pi / 2, 0, 0))
    tweet = cyl(f"{name}Tweet", w * 0.16, 0.02, loc=(x, y - d / 2, z + hgt * 0.75), material=cone, verts=10, rot=(math.pi / 2, 0, 0))
    return [cab, woof, tweet]


# ---------------------------------------------------------------- Coffee Machine looks per path
# Path colours from towers.ts: BREWING #d9a05b, EXPENSE CLAIM #7fb6e3, VENDING #6fcf7f.
CF_B, CF_E, CF_V = "#d9a05b", "#7fb6e3", "#6fcf7f"


def _espresso(x, y, z, s, body):
    base = box("EBase", (0.34 * s, 0.26 * s, 0.05 * s), loc=(x, y, z), material=mat("metal"), bevel=0.01)
    bod = box("EBody", (0.34 * s, 0.16 * s, 0.3 * s), loc=(x, y + 0.05 * s, z + 0.05 * s), material=body, bevel=0.015)
    head = box("EHead", (0.08 * s, 0.08 * s, 0.05 * s), loc=(x, y - 0.06 * s, z + 0.2 * s), material=mat("metal_light", metal=0.8))
    handle = box("EHandle", (0.03 * s, 0.14 * s, 0.025 * s), loc=(x, y - 0.14 * s, z + 0.2 * s), material=mat("plastic_black"))
    cup = cyl("ECup", 0.03 * s, 0.05 * s, loc=(x, y - 0.06 * s, z + 0.05 * s), material=mat("plastic_white"), verts=10)
    gauge = cyl("EGauge", 0.03 * s, 0.01, loc=(x + 0.1 * s, y - 0.03 * s, z + 0.27 * s), material=mat("plastic_white"), verts=10, rot=(math.pi / 2, 0, 0))
    return [base, bod, head, handle, cup, gauge]


# ---------------------------------------------------------------- Quick Reply looks per path
QR_K, QR_S, QR_E = "#8fa0b4", "#7fb6e3", "#f2c641"


# ---------------------------------------------------------------- Thumbtacks looks per path
TT_S, TT_U, TT_H = "#d24b4b", "#d9a05b", "#f2c641"


# ---------------------------------------------------------------- Self-Service looks per path
SS_K, SS_C, SS_P = "#3fa7a0", "#7fb6e3", "#8fa0b4"


# ---------------------------------------------------------------- Keyboard Smash looks per path
KS_S, KS_C, KS_H = "#e5534b", "#7fb6e3", "#f2c641"


# ---------------------------------------------------------------- Office Chair looks per path
CH_R, CH_O, CH_S = "#e5534b", "#7fb6e3", "#6fcf7f"


# ---------------------------------------------------------------- Reply All looks per path
RA_U, RA_T, RA_E = "#e5534b", "#7fb6e3", "#e2557a"


# ---------------------------------------------------------------- Delegation looks per path
DL_E, DL_D, DL_P = "#f2c641", "#7fb6e3", "#8fa0b4"


def _pawn(name, x, y, z, col):
    return [cyl(f"{name}Base", 0.03, 0.02, loc=(x, y, z), material=mat(col), verts=10), cyl(f"{name}Body", 0.02, 0.06, loc=(x, y, z + 0.02), material=mat(col), verts=10, radius_top=0.012), ball(f"{name}Head", 0.022, loc=(x, y, z + 0.09), material=mat(col), subdiv=1)]


# ---------------------------------------------------------------- Pomodoro Timer looks per path
PM_F, PM_D, PM_B = "#3fa7a0", "#e2553f", "#f2c641"


# ---------------------------------------------------------------- Motivational Poster looks per path
PO_H, PO_F, PO_L = "#3fa7a0", "#e2553f", "#7fb6e3"


def _easel(h, hgt=0.7, mat_key="wood_dark"):
    return [box(f"Easel{i}", (0.03, 0.03, hgt), loc=(x, 0.12, h), material=mat(mat_key)) for i, x in enumerate((-0.24, 0.24))]


# ---------------------------------------------------------------- tower parts (TORENMODELLEN.md)
# Every tower is 13 parts that the game puts together: a core, a module per path for tier 1 and 2
# (it sits in that path's slot), and a hero per path for tier 3 and 4 that replaces the core.
# tower_parts() is the rule; the game uses the same one. Slots are empties called Slot0..Slot2
# under the model: where they stand (and how big they are) is where a module goes.

def _cylx(name, r, depth, c, material, verts=12, r2=None):
    """Cylinder lying along X, centred on c."""
    return cyl(name, r, depth, loc=(c[0] - depth / 2, c[1], c[2]), material=material, verts=verts,
               radius_top=r2, rot=(0, math.pi / 2, 0))


def _cyly(name, r, depth, c, material, verts=12, r2=None):
    """Cylinder lying along Y, centred on c: r at the front (-Y) end, r2 at the back."""
    return cyl(name, r, depth, loc=(c[0], c[1] - depth / 2, c[2]), material=material, verts=verts,
               radius_top=r2, rot=(-math.pi / 2, 0, 0))


def _ring(name, r, n, w, c, material, axis="z"):
    """A ring of n blocks round c: lying flat (axis z) or standing, facing the front (axis y)."""
    seg = 2 * math.pi * r / n * 1.12
    parts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        if axis == "z":
            parts.append(box(f"{name}{i}", (w, seg, w), loc=(c[0] + r * math.cos(a), c[1] + r * math.sin(a), c[2] - w / 2),
                             material=material, rot_z=a))
        else:
            px, pz = c[0] + r * math.cos(a), c[2] + r * math.sin(a)
            b = box(f"{name}{i}", (seg, w, w), loc=(px, c[1], pz - w / 2), material=material)
            kit.tilt(b, ry=-(a + math.pi / 2), pivot=(px, c[1], pz))
            parts.append(b)
    return parts


def _note(name, c, material, s=1.0):
    """A floating music note: a head, a stem and a flag."""
    x, y, z = c
    return [ball(f"{name}Head", 0.055 * s, loc=(x, y, z), material=material, scale=(1.2, 0.8, 0.85)),
            box(f"{name}Stem", (0.022 * s, 0.022 * s, 0.17 * s), loc=(x + 0.05 * s, y, z), material=material),
            box(f"{name}Flag", (0.08 * s, 0.022 * s, 0.035 * s), loc=(x + 0.08 * s, y, z + 0.14 * s), material=material)]


def _slots(root, specs):
    """Slot0..Slot2 as empties under the model. specs: ((x, y, z), scale) per path."""
    for i, (loc, sc) in enumerate(specs):
        e = empty(f"Slot{i}", loc)
        e.scale = (sc, sc, sc)
        parent(e, root)


def tower_parts(tower, tiers):
    """Put one combination of upgrades together: the hero of a path at tier 3 or 4, or the core,
    with the module of every other path at tier 1 or 2 in that path's slot."""
    lead = max(range(3), key=lambda p: tiers[p])
    hero = tiers[lead] >= 3
    root = BUILDERS[f"{tower}_p{lead}_{tiers[lead]}" if hero else f"{tower}_core"]()
    for p in range(3):
        if hero and p == lead:
            continue
        if 1 <= tiers[p] <= 2:
            slot = next(c for c in root.children if c.name.split(".")[0] == f"Slot{p}")
            module = BUILDERS[f"{tower}_m{p}_{tiers[p]}"]()
            module.parent = slot
    return root


# --- Headphones (7.3). A giant pair on a stand; the arch is the silhouette.

HP_ACCENT = "#6fcf7f"
HP_PATH = ("#6fcf7f", "#7fb6e3", "#b48ce0")
HP_CUP_Z = 0.67


def _hp_phones(c, s=1.0, pre="Hp", pads=None):
    """The headphones, centred between the cups at cup height, cups facing left and right.
    pads: a colour for big cushions round the cups (the heroes of NOISE CANCELLING)."""
    cx, cy, cz = c
    shell = mat("plastic_white", rough=0.5)
    steel = mat("metal_light", metal=0.6, rough=0.35)
    parts = []
    for side, sx in (("L", -1), ("R", 1)):
        parts.append(_cylx(f"{pre}Cup{side}", 0.13 * s, 0.07 * s, (cx + sx * 0.30 * s, cy, cz), shell, verts=14))
        parts.append(_cylx(f"{pre}Pad{side}", 0.10 * s, 0.03 * s, (cx + sx * 0.25 * s, cy, cz), mat("charcoal"), verts=12))
        parts.append(box(f"{pre}Yoke{side}", (0.03 * s, 0.05 * s, 0.13 * s), loc=(cx + sx * 0.30 * s, cy, cz + 0.09 * s), material=steel))
        if pads:
            parts.append(_cylx(f"{pre}Cushion{side}", 0.18 * s, 0.12 * s, (cx + sx * 0.30 * s, cy, cz), mat(pads, rough=0.9), verts=14))
    r = 0.30 * s
    for i, th in enumerate((150, 120, 90, 60, 30)):
        t = math.radians(th)
        px, pz = cx + r * math.cos(t), cz + 0.08 * s + r * math.sin(t)
        b = box(f"{pre}Band{i}", (0.17 * s, 0.07 * s, 0.045 * s), loc=(px, cy, pz - 0.0225 * s), material=shell)
        kit.tilt(b, ry=math.radians(90 - th), pivot=(px, cy, pz))
        parts.append(b)
    parts.append(box(f"{pre}BandPad", (0.20 * s, 0.075 * s, 0.03 * s), loc=(cx, cy, cz + 0.08 * s + r - 0.05 * s), material=mat("charcoal")))
    return parts


def _hp_stand(top, base_r=0.21, base_col=HP_ACCENT, xy=(0, 0), z0=0.0):
    """A weighted round foot and a pole up to top, with a hook for the band."""
    x, y = xy
    steel = mat("metal_light", metal=0.6, rough=0.35)
    parts = [cyl("StandPole", 0.028, top - z0, loc=(x, y, z0), material=steel, verts=8),
             box("StandHook", (0.12, 0.05, 0.035), loc=(x, y, top - 0.035), material=steel)]
    if base_r:
        parts += [cyl("StandFoot", base_r, 0.07, loc=(x, y, z0), material=mat(base_col), verts=14, bevel=0.01),
                  cyl("StandCap", base_r * 0.45, 0.035, loc=(x, y, z0 + 0.07), material=mat("charcoal"), verts=12)]
    return parts


def b_headphones_core():
    root = empty("headphones_core")
    parts = _hp_stand(HP_CUP_Z + 0.08 + 0.30 - 0.05) + _hp_phones((0, 0, HP_CUP_Z))
    ob = join("headphones_core_mesh", parts)
    parent(ob, root)
    _slots(root, [((0, 0, HP_CUP_Z), 1.0), ((0.33, -0.02, 0), 1.0), ((-0.33, -0.02, 0), 1.0)])
    return root


# Modules. Pad 1 sits on the cups (one part per ear), pads 2 and 3 at the foot, right and left.

def b_headphones_m0_1():
    root = empty("headphones_m0_1")
    g = mat(HP_PATH[0], rough=0.9)
    parts = [_cylx(f"Cushion{i}", 0.18, 0.12, (sx * 0.30, 0, 0), g, verts=14) for i, sx in enumerate((-1, 1))]
    parent(join("headphones_m0_1_mesh", parts), root)
    return root


def b_headphones_m0_2():
    root = empty("headphones_m0_2")
    g = mat(HP_PATH[0], rough=0.9)
    glow = mat(HP_PATH[0], emit=1.4)
    parts = []
    for i, sx in enumerate((-1, 1)):
        parts += [_cylx(f"Cushion{i}", 0.20, 0.14, (sx * 0.30, 0, 0), g, verts=14),
                  _cylx(f"Glow{i}", 0.15, 0.02, (sx * 0.375, 0, 0), glow, verts=14),
                  _cylx(f"Hub{i}", 0.09, 0.03, (sx * 0.38, 0, 0), mat("charcoal"), verts=12)]
    # A glowing cover over the whole band: active noise cancelling, switched on.
    r = 0.335
    for i, th in enumerate((150, 120, 90, 60, 30)):
        t = math.radians(th)
        px, pz = r * math.cos(t), 0.08 + r * math.sin(t)
        b = box(f"Cover{i}", (0.19, 0.10, 0.04), loc=(px, 0, pz - 0.02), material=glow)
        kit.tilt(b, ry=math.radians(90 - th), pivot=(px, 0, pz))
        parts.append(b)
    arm = box("MicArm", (0.035, 0.30, 0.035), loc=(-0.30, -0.16, -0.10), material=mat("charcoal"))
    kit.tilt(arm, rx=0.45, pivot=(-0.30, -0.02, -0.08))
    parts += [arm, ball("Mic", 0.065, loc=(-0.30, -0.30, -0.20), material=glow)]
    parent(join("headphones_m0_2_mesh", parts), root)
    return root


def _hp_knob(z0, pre="Knob"):
    blue = mat(HP_PATH[1], rough=0.5)
    knob = cyl(f"{pre}", 0.12, 0.07, loc=(0, 0, z0), material=blue, verts=14, bevel=0.01)
    mark = box(f"{pre}Mark", (0.03, 0.10, 0.02), loc=(0, -0.05, z0 + 0.07), material=mat("plastic_white"))
    kit.tilt([knob, mark], rx=0.35, pivot=(0, 0, z0))
    return [knob, mark]


def b_headphones_m1_1():
    root = empty("headphones_m1_1")
    parts = [box("Wedge", (0.24, 0.24, 0.10), material=mat("charcoal"), bevel=0.015, taper=0.85),
             box("Led", (0.16, 0.012, 0.025), loc=(0, -0.105, 0.04), material=mat(HP_PATH[1], emit=1.2))]
    parts += _hp_knob(0.10)
    parent(join("headphones_m1_1_mesh", parts), root)
    return root


def b_headphones_m1_2():
    root = empty("headphones_m1_2")
    blue = mat(HP_PATH[1], rough=0.5)
    parts = [box("Sub", (0.24, 0.24, 0.30), material=mat("charcoal"), bevel=0.015),
             box("SubBand", (0.25, 0.25, 0.04), loc=(0, 0, 0.26), material=blue),
             _cyly("Cone", 0.10, 0.04, (0, -0.125, 0.14), blue, verts=14, r2=0.05),
             ball("ConeCap", 0.035, loc=(0, -0.15, 0.14), material=mat("charcoal"))]
    parts += _hp_knob(0.30)
    parent(join("headphones_m1_2_mesh", parts), root)
    return root


def b_headphones_m2_1():
    root = empty("headphones_m2_1")
    purple = mat(HP_PATH[2], rough=0.6)
    ant = box("Antenna", (0.016, 0.016, 0.30), loc=(0.08, 0.03, 0.18), material=mat("metal_light", metal=0.6, rough=0.35))
    kit.tilt(ant, ry=-0.45, pivot=(0.08, 0.03, 0.18))
    parts = [box("Radio", (0.24, 0.15, 0.18), material=purple, bevel=0.02),
             box("Handle", (0.16, 0.03, 0.05), loc=(0, 0, 0.18), material=mat("charcoal")),
             _cyly("SpkL", 0.05, 0.02, (-0.06, -0.08, 0.09), mat("charcoal"), verts=12),
             _cyly("SpkR", 0.05, 0.02, (0.06, -0.08, 0.09), mat("charcoal"), verts=12), ant]
    parent(join("headphones_m2_1_mesh", parts), root)
    return root


def b_headphones_m2_2():
    root = empty("headphones_m2_2")
    purple = mat(HP_PATH[2], rough=0.6)
    glow = mat(HP_PATH[2], emit=1.3)
    arm = box("ToneArm", (0.02, 0.15, 0.02), loc=(0.085, 0.02, 0.11), material=mat("metal_light", metal=0.6, rough=0.35))
    kit.tilt(arm, rz=0.35, pivot=(0.085, 0.08, 0.11))
    parts = [box("Deck", (0.24, 0.26, 0.10), material=purple, bevel=0.015),
             cyl("Record", 0.10, 0.012, loc=(-0.02, -0.01, 0.10), material=mat("plastic_black"), verts=14),
             cyl("Label", 0.035, 0.016, loc=(-0.02, -0.01, 0.10), material=glow, verts=10), arm]
    parts += _note("NoteA", (-0.07, 0, 0.30), glow) + _note("NoteB", (0.02, 0, 0.42), glow, 0.85)
    parent(join("headphones_m2_2_mesh", parts), root)
    return root


# Heroes. Each keeps the headphones (Slot0 sits on them, scaled with them) and the two other slots.

def _hp_speaker(name, c, w, d, h, body, front, cone):
    """A speaker box standing on c, its cone facing the front."""
    x, y, z = c
    return [box(f"{name}Box", (w, d, h), loc=(x, y, z), material=mat(body), bevel=0.015),
            box(f"{name}Baffle", (w * 0.88, 0.012, h * 0.9), loc=(x, y - d / 2 - 0.004, z + h * 0.05), material=mat(front)),
            _cyly(f"{name}Woofer", w * 0.36, 0.03, (x, y - d / 2 - 0.02, z + h * 0.34), mat(cone, rough=0.5), verts=14, r2=w * 0.2),
            _cyly(f"{name}Tweeter", w * 0.16, 0.03, (x, y - d / 2 - 0.02, z + h * 0.76), mat(cone, rough=0.5), verts=10),
            # The back is not bare: a bass port ringed in the front colour.
            _cyly(f"{name}PortRim", w * 0.30, 0.02, (x, y + d / 2 + 0.008, z + h * 0.70), mat(front), verts=12),
            _cyly(f"{name}Port", w * 0.18, 0.02, (x, y + d / 2 + 0.014, z + h * 0.70), mat("plastic_black"), verts=12)]


def b_headphones_p0_3():
    """Studio Monitors: big headphones on a pole between two monitors, on a green plate."""
    root = empty("headphones_p0_3")
    green = HP_PATH[0]
    cz, s = 0.98, 1.05
    parts = [box("Plate", (0.78, 0.48, 0.06), material=mat(green), bevel=0.012)]
    for i, sx in enumerate((-1, 1)):
        parts += _hp_speaker(f"Mon{i}", (sx * 0.28, 0.12, 0.06), 0.20, 0.21, 0.60, "charcoal", green, "#bff3c8")
    parts += _hp_stand(cz + (0.08 + 0.30 - 0.05) * s, base_r=0, z0=0.06)
    parts += _hp_phones((0, 0, cz), s, pads=green)
    parent(join("headphones_p0_3_mesh", parts), root)
    _slots(root, [((0, 0, cz), s), ((0.26, -0.12, 0.06), 1.0), ((-0.26, -0.12, 0.06), 1.0)])
    return root


def b_headphones_p0_4():
    """Soundproof Booth: a half cabin of foam with the big headphones inside, a light on top."""
    root = empty("headphones_p0_4")
    green = HP_PATH[0]
    wall = mat("charcoal", rough=0.9)
    foam = mat(green, rough=0.95)
    cz, s = 0.80, 1.05
    parts = [box("Floor", (0.86, 0.50, 0.04), material=mat("charcoal")),
             box("Back", (0.86, 0.06, 1.30), loc=(0, 0.22, 0), material=wall, bevel=0.01),
             # Shallow sides, so you see the headphones inside from either corner.
             box("SideL", (0.06, 0.28, 1.30), loc=(-0.40, 0.11, 0), material=wall, bevel=0.01),
             box("SideR", (0.06, 0.28, 1.30), loc=(0.40, 0.11, 0), material=wall, bevel=0.01),
             box("TrimL", (0.07, 0.03, 1.30), loc=(-0.40, -0.035, 0), material=mat(green, emit=0.9)),
             box("TrimR", (0.07, 0.03, 1.30), loc=(0.40, -0.035, 0), material=mat(green, emit=0.9)),
             box("Roof", (0.86, 0.50, 0.05), loc=(0, 0, 1.30), material=wall)]
    k = 0
    for row in range(5):
        z = 0.12 + row * 0.24
        for col in range(4):
            x = -0.27 + col * 0.18
            w = box(f"Foam{k}", (0.16, 0.17, 0.07), loc=(x, 0.19, z), material=foam, taper=0.25)
            kit.tilt(w, rx=math.pi / 2, pivot=(x, 0.19, z))
            parts.append(w)
            k += 1
        for side, sx in ((-1, -1), (1, 1)):
            if 0.5 < z < 1.05:
                continue
            for col in range(1):
                y = 0.10
                w = box(f"Foam{k}", (0.17, 0.17, 0.05), loc=(sx * 0.37, y, z), material=foam, taper=0.25)
                kit.tilt(w, ry=-sx * math.pi / 2, pivot=(sx * 0.37, y, z))
                parts.append(w)
                k += 1
    # Outside, the booth is padded too: green panels on the back and a stripe on each side.
    for r_ in range(3):
        for c_ in range(3):
            parts.append(box(f"Panel{r_}{c_}", (0.22, 0.03, 0.30), loc=(-0.25 + c_ * 0.25, 0.262, 0.14 + r_ * 0.38), material=foam, bevel=0.01))
    for sx in (-1, 1):
        parts.append(box(f"Stripe{sx}", (0.02, 0.24, 0.10), loc=(sx * 0.432, 0.11, 0.95), material=mat(green, emit=0.9)))
    parts += [box("LightPostL", (0.04, 0.04, 0.06), loc=(-0.25, 0.05, 1.35), material=mat("charcoal")),
              box("LightPostR", (0.04, 0.04, 0.06), loc=(0.25, 0.05, 1.35), material=mat("charcoal")),
              box("Light", (0.66, 0.10, 0.06), loc=(0, 0.05, 1.41), material=mat(green, emit=1.5), bevel=0.01)]
    parts += _hp_stand(cz + (0.08 + 0.30 - 0.05) * s, base_r=0.20, base_col=green, xy=(0, 0.02), z0=0.04)
    parts += _hp_phones((0, 0.02, cz), s, pads=green)
    parent(join("headphones_p0_4_mesh", parts), root)
    _slots(root, [((0, 0.02, cz), s), ((0.24, -0.37, 0), 1.0), ((-0.24, -0.37, 0), 1.0)])
    return root


def b_headphones_p1_3():
    """Drop the Bass: a huge subwoofer, waves in front of the cone, the headphones on top."""
    root = empty("headphones_p1_3")
    blue = HP_PATH[1]
    glow = mat(blue, emit=1.2)
    cz = 1.0
    parts = [box("Plinth", (0.64, 0.58, 0.08), material=mat("charcoal"), bevel=0.01),
             box("Sub", (0.60, 0.54, 0.62), loc=(0, 0, 0.08), material=mat(blue), bevel=0.02),
             box("Baffle", (0.52, 0.012, 0.54), loc=(0, -0.272, 0.12), material=mat("charcoal")),
             _cyly("Cone", 0.22, 0.08, (0, -0.30, 0.39), mat("#dff0ff", rough=0.5), verts=14, r2=0.10),
             ball("Cap", 0.07, loc=(0, -0.33, 0.39), material=mat("charcoal"))]
    parts += [box("Amp", (0.46, 0.02, 0.44), loc=(0, 0.278, 0.16), material=mat("charcoal")),
              _cyly("PortA", 0.07, 0.03, (-0.11, 0.29, 0.30), mat("plastic_black"), verts=12),
              _cyly("PortB", 0.07, 0.03, (0.11, 0.29, 0.30), mat("plastic_black"), verts=12),
              box("AmpLed", (0.30, 0.02, 0.04), loc=(0, 0.29, 0.48), material=glow)]
    parts += _ring("WaveA", 0.27, 14, 0.025, (0, -0.40, 0.39), glow, axis="y")
    parts += _ring("WaveB", 0.33, 16, 0.02, (0, -0.48, 0.39), glow, axis="y")
    parts += _hp_stand(cz + 0.33, base_r=0, xy=(0, 0.14), z0=0.70)
    parts += _hp_phones((0, 0.14, cz))
    parent(join("headphones_p1_3_mesh", parts), root)
    _slots(root, [((0, 0.14, cz), 1.0), ((0.15, -0.14, 0.70), 1.0), ((-0.15, -0.14, 0.70), 1.0)])
    return root


def b_headphones_p1_4():
    """Open-Plan Speakers: two speaker columns on tripods with rings of light, a sub between them."""
    root = empty("headphones_p1_4")
    blue = HP_PATH[1]
    glow = mat(blue, emit=1.4)
    steel = mat("metal_light", metal=0.6, rough=0.35)
    cz, s = 0.60, 0.75
    parts = [box("Sub", (0.40, 0.38, 0.36), material=mat(blue), bevel=0.02),
             box("SubFront", (0.34, 0.012, 0.30), loc=(0, -0.195, 0.03), material=mat("charcoal")),
             _cyly("SubCone", 0.12, 0.05, (0, -0.21, 0.18), mat("#dff0ff", rough=0.5), verts=14, r2=0.06)]
    for i, sx in enumerate((-1, 1)):
        x = sx * 0.33
        for j, (dx, dy) in enumerate(((sx * 0.06, 0.0), (sx * 0.03, -0.09), (sx * 0.03, 0.09))):
            leg = box(f"Leg{i}{j}", (0.025, 0.025, 0.50), loc=(x + dx, dy, 0), material=steel)
            kit.tilt(leg, rx=dy * 2.0, ry=-dx * 2.4, pivot=(x + dx, dy, 0))
            parts.append(leg)
        parts += [cyl(f"Pole{i}", 0.025, 0.40, loc=(x, 0, 0.42), material=steel, verts=8)]
        parts += _hp_speaker(f"Col{i}", (x, 0, 0.80), 0.18, 0.20, 0.62, blue, "charcoal", "#dff0ff")
        parts += [cyl(f"RingPost{i}", 0.015, 0.08, loc=(x, 0, 1.42), material=steel, verts=6)]
        parts += _ring(f"Ring{i}", 0.075, 12, 0.025, (x, 0, 1.52), glow, axis="z")
    parts += _hp_stand(cz + (0.08 + 0.30 - 0.05) * s, base_r=0, xy=(0, 0.08), z0=0.36)
    parts += _hp_phones((0, 0.08, cz), s)
    parent(join("headphones_p1_4_mesh", parts), root)
    _slots(root, [((0, 0.08, cz), s), ((0.12, -0.10, 0.36), 1.0), ((0, -0.10, 0.36), 1.0)])
    return root


def _hp_desk(purple):
    """A mixing desk on four legs, faders on top, equalizer bars along the back."""
    parts = []
    for i, (x, y) in enumerate(((-0.31, -0.17), (0.31, -0.17), (-0.31, 0.17), (0.31, 0.17))):
        parts.append(box(f"DeskLeg{i}", (0.045, 0.045, 0.56), loc=(x, y, 0), material=mat("charcoal")))
    parts += [box("Desk", (0.72, 0.42, 0.08), loc=(0, 0, 0.56), material=mat(purple), bevel=0.015),
              box("DeskRail", (0.66, 0.08, 0.06), loc=(0, 0.15, 0.64), material=mat("charcoal"))]
    for i in range(6):
        x = -0.30 + i * 0.12
        parts.append(box(f"Fader{i}", (0.04, 0.10, 0.03), loc=(x, -0.13, 0.64), material=mat("plastic_white")))
    glow = mat(purple, emit=1.3)
    for i, h in enumerate((0.22, 0.38, 0.30, 0.50, 0.34, 0.44, 0.24)):
        parts.append(box(f"Eq{i}", (0.065, 0.05, h), loc=(-0.27 + i * 0.09, 0.15, 0.70), material=glow))
    return parts


def b_headphones_p2_3():
    """Deep Focus: a purple mixing desk with equalizer bars, the headphones on it, notes above."""
    root = empty("headphones_p2_3")
    purple = HP_PATH[2]
    glow = mat(purple, emit=1.3)
    cz, s = 0.86, 0.8
    parts = _hp_desk(purple)
    parts += _hp_stand(cz + (0.08 + 0.30 - 0.05) * s, base_r=0, xy=(0, -0.06), z0=0.64)
    parts += _hp_phones((0, -0.06, cz), s)
    parts += _note("NoteA", (0.22, -0.08, 1.10), glow) + _note("NoteB", (-0.30, -0.04, 1.04), glow, 0.9) + _note("NoteC", (0.06, 0.05, 1.18), glow, 0.8)
    parent(join("headphones_p2_3_mesh", parts), root)
    _slots(root, [((0, -0.06, cz), s), ((0.24, -0.34, 0), 1.0), ((-0.24, -0.34, 0), 1.0)])
    return root


def b_headphones_p2_4():
    """Flow State: the desk under an arch of purple light, a lava lamp, notes in a ring."""
    root = empty("headphones_p2_4")
    purple = HP_PATH[2]
    glow = mat(purple, emit=1.5)
    cz, s = 0.86, 0.8
    parts = _hp_desk(purple)
    n = 11
    for i in range(n):
        t0, t1 = math.pi * i / n, math.pi * (i + 1) / n
        x0, z0 = 0.37 * math.cos(t0), 0.64 + 0.86 * math.sin(t0)
        x1, z1 = 0.37 * math.cos(t1), 0.64 + 0.86 * math.sin(t1)
        mx, mz = (x0 + x1) / 2, (z0 + z1) / 2
        ln = math.hypot(x1 - x0, z1 - z0) * 1.08
        b = box(f"Arch{i}", (ln, 0.05, 0.05), loc=(mx, 0.21, mz - 0.025), material=glow)
        kit.tilt(b, ry=-math.atan2(z1 - z0, x1 - x0), pivot=(mx, 0.21, mz))
        parts.append(b)
    parts += [cyl("LavaBase", 0.06, 0.05, loc=(0.27, -0.10, 0.64), material=mat("charcoal"), verts=10, radius_top=0.04),
              cyl("LavaGlass", 0.05, 0.22, loc=(0.27, -0.10, 0.69), material=mat(purple, rough=0.15, alpha=0.6), verts=10, radius_top=0.03),
              ball("LavaBlob", 0.03, loc=(0.27, -0.10, 0.78), material=mat("#ff9ad5", emit=1.5)),
              cyl("LavaCap", 0.035, 0.04, loc=(0.27, -0.10, 0.91), material=mat("charcoal"), verts=10)]
    parts += _hp_stand(cz + (0.08 + 0.30 - 0.05) * s, base_r=0, xy=(0, -0.06), z0=0.64)
    parts += _hp_phones((0, -0.06, cz), s)
    for i in range(6):
        a = 2 * math.pi * i / 6 + 0.3
        parts += _note(f"Ring{i}", (0.26 * math.cos(a), -0.04 + 0.16 * math.sin(a), 1.20 + 0.06 * math.sin(a * 2)), glow, 0.8)
    parent(join("headphones_p2_4_mesh", parts), root)
    _slots(root, [((0, -0.06, cz), s), ((0.24, -0.34, 0), 1.0), ((-0.24, -0.34, 0), 1.0)])
    return root


def tower_headphones(tiers):
    return tower_parts("headphones", tiers)


TOWER_PART_BUILDERS = {"headphones_core": b_headphones_core}
for _p in range(3):
    for _t in (1, 2):
        TOWER_PART_BUILDERS[f"headphones_m{_p}_{_t}"] = globals()[f"b_headphones_m{_p}_{_t}"]
    for _t in (3, 4):
        TOWER_PART_BUILDERS[f"headphones_p{_p}_{_t}"] = globals()[f"b_headphones_p{_p}_{_t}"]

# --- coffee (tower parts)

# --- Coffee Machine (7.1). A free-standing red bean-to-cup machine on its own drip tray; the bean
# hopper on the roof is the silhouette. Slot0 (BREWING) on the roof beside the hopper, Slot1
# (EXPENSE CLAIM) on the right flank, Slot2 (VENDING) on the left flank.
# Flank modules are built with their origin at the bottom of the face they hang on: path 2 grows
# towards +X, path 3 towards -X, so the same module can also stand on a counter top.

CF_ACCENT = "#c8423b"
CF_PATH = ("#d9a05b", "#7fb6e3", "#6fcf7f")


def _cf_mats():
    return {
        "red": mat(CF_ACCENT, rough=0.45),
        "char": mat("charcoal"),
        "black": mat("plastic_black", rough=0.6),
        "steel": mat("metal_light", metal=0.6, rough=0.35),
        "white": mat("plastic_white", rough=0.5),
        "glass": mat("window", rough=0.15, alpha=0.5),
        "bean": mat("coffee"),
        "lamp": mat(CF_PATH[2], emit=1.4),
    }


def _coffee_machine(c=(0, 0, 0), s=1.0, pre="Cf"):
    """The machine itself, standing on c: drip tray, red body with a black niche, a big mug, the
    bean hopper on the roof (left, back). 0.58 x 0.52 x 1.02 at s=1."""
    cx, cy, cz = c
    m = _cf_mats()

    def B(n, size, loc, mt, bevel=0.0, rot_z=0.0, taper=1.0):
        return box(pre + n, tuple(v * s for v in size), loc=(cx + loc[0] * s, cy + loc[1] * s, cz + loc[2] * s),
                   material=mt, bevel=bevel * s, rot_z=rot_z, taper=taper)

    def C(n, r, d, loc, mt, verts=12, r2=None):
        return cyl(pre + n, r * s, d * s, loc=(cx + loc[0] * s, cy + loc[1] * s, cz + loc[2] * s), material=mt,
                   verts=verts, radius_top=None if r2 is None else r2 * s)

    parts = [
        # The drip tray it stands on, with a steel lip at the front.
        B("Tray", (0.58, 0.52, 0.10), (0, 0, 0), m["char"], bevel=0.015),
        B("TrayLip", (0.40, 0.02, 0.04), (0, -0.265, 0.035), m["steel"]),
        # Red body round a niche: back block, two pillars, a header and an apron.
        B("Back", (0.54, 0.30, 0.62), (0, 0.09, 0.10), m["red"], bevel=0.02),
        B("PillarL", (0.10, 0.20, 0.62), (-0.22, -0.14, 0.10), m["red"], bevel=0.02),
        B("PillarR", (0.10, 0.20, 0.62), (0.22, -0.14, 0.10), m["red"], bevel=0.02),
        B("Header", (0.36, 0.20, 0.24), (0, -0.14, 0.48), m["red"], bevel=0.015),
        B("Apron", (0.36, 0.20, 0.04), (0, -0.14, 0.10), m["red"]),
        B("NicheBack", (0.34, 0.02, 0.34), (0, -0.05, 0.14), m["black"]),
        B("NicheTop", (0.34, 0.18, 0.012), (0, -0.14, 0.468), m["black"]),
        B("NicheL", (0.012, 0.18, 0.34), (-0.164, -0.14, 0.14), m["black"]),
        B("NicheR", (0.012, 0.18, 0.34), (0.164, -0.14, 0.14), m["black"]),
        B("Grate", (0.32, 0.17, 0.02), (0, -0.145, 0.14), m["steel"]),
        # The mug, big enough to read from across the floor.
        C("Mug", 0.09, 0.14, (0, -0.15, 0.16), m["white"], verts=12),
        C("MugCoffee", 0.078, 0.015, (0, -0.15, 0.29), m["bean"], verts=12),
        B("MugHandle", (0.04, 0.035, 0.09), (0.105, -0.15, 0.185), m["white"]),
        C("Spout", 0.032, 0.08, (0, -0.15, 0.39), m["steel"], verts=8),
        C("Group", 0.06, 0.03, (0, -0.15, 0.438), m["steel"], verts=10),
        # Display and the green ready light above the niche.
        B("Display", (0.16, 0.012, 0.08), (-0.06, -0.246, 0.56), m["black"]),
        B("Lamp", (0.05, 0.02, 0.05), (0.10, -0.248, 0.575), m["lamp"]),
        B("Roof", (0.50, 0.44, 0.02), (0, 0, 0.72), m["steel"]),
        # Bean hopper: a glass jar of beans with a black lid.
        C("Collar", 0.11, 0.02, (-0.125, 0.07, 0.74), m["black"], verts=12),
        C("Hopper", 0.14, 0.22, (-0.125, 0.07, 0.76), m["glass"], verts=12),
        C("Beans", 0.125, 0.15, (-0.125, 0.07, 0.765), m["bean"], verts=12, r2=0.11),
        C("Lid", 0.15, 0.04, (-0.125, 0.07, 0.98), m["black"], verts=12),
        C("LidKnob", 0.045, 0.03, (-0.125, 0.07, 1.02), m["black"], verts=8),
        # The back: a water tank with a cap and a service panel, so no side is bare.
        B("Tank", (0.26, 0.06, 0.40), (0.10, 0.27, 0.20), m["glass"], bevel=0.01),
        B("TankCap", (0.12, 0.07, 0.03), (0.10, 0.27, 0.60), m["black"]),
        B("Service", (0.16, 0.012, 0.36), (-0.15, 0.246, 0.24), m["char"]),
        B("Port", (0.08, 0.02, 0.05), (-0.15, 0.252, 0.30), m["black"]),
    ]
    # Vent slats high on both flanks, above where the modules hang.
    for side, sx in (("L", -1), ("R", 1)):
        for k, z in enumerate((0.58, 0.625, 0.67)):
            parts.append(B(f"Vent{side}{k}", (0.012, 0.26, 0.025), (sx * 0.274, 0.03, z), m["black"]))
    return parts


def _coffee_slot0(c=(0, 0, 0), s=1.0):
    """Where the BREWING module goes on a machine standing on c: the roof, right of the hopper."""
    return ((c[0] + 0.145 * s, c[1] - 0.04 * s, c[2] + 0.74 * s), s)


def b_coffee_core():
    root = empty("coffee_core")
    parent(join("coffee_core_mesh", _coffee_machine()), root)
    _slots(root, [_coffee_slot0(), ((0.27, -0.12, 0.30), 1.0), ((-0.27, -0.02, 0.26), 1.0)])
    return root


# Modules.

def _coffee_pot(c, r, h, lid_col, pre="Pot", verts=12):
    """A glass jug of coffee standing on c, a coloured lid and a handle towards the front."""
    x, y, z = c
    return [cyl(f"{pre}Glass", r, h, loc=(x, y, z), material=mat("window", rough=0.15, alpha=0.5), verts=verts, radius_top=r * 0.82),
            cyl(f"{pre}Coffee", r * 0.9, h * 0.6, loc=(x, y, z + 0.005), material=mat("coffee"), verts=verts, radius_top=r * 0.82),
            cyl(f"{pre}Lid", r * 0.86, 0.04, loc=(x, y, z + h), material=lid_col, verts=verts),
            cyl(f"{pre}Knob", 0.03, 0.03, loc=(x, y, z + h + 0.04), material=lid_col, verts=8),
            box(f"{pre}Handle", (0.03, 0.05, h * 0.6), loc=(x, y - r - 0.02, z + h * 0.25), material=mat("plastic_black", rough=0.6))]


def b_coffee_m0_1():
    """Bigger Pot: a big glass jug on a warming plate."""
    root = empty("coffee_m0_1")
    amber = mat(CF_PATH[0], rough=0.5)
    parts = [cyl("Warmer", 0.125, 0.03, material=amber, verts=12),
             box("WarmerFoot", (0.08, 0.04, 0.03), loc=(0.07, -0.09, 0.0), material=amber)]
    parts += _coffee_pot((0, 0.01, 0.03), 0.11, 0.24, amber)
    parent(join("coffee_m0_1_mesh", parts), root)
    return root


def b_coffee_m0_2():
    """Espresso Machine: a chrome block with an amber front, two piston levers and steam."""
    root = empty("coffee_m0_2")
    amber = mat(CF_PATH[0], rough=0.5)
    steel = mat("metal_light", metal=0.6, rough=0.35)
    black = mat("plastic_black", rough=0.6)
    steam = mat("plastic_white", rough=0.5)
    parts = [box("Block", (0.24, 0.30, 0.22), material=steel, bevel=0.02),
             box("Front", (0.22, 0.012, 0.16), loc=(0, -0.153, 0.04), material=amber),
             box("Crown", (0.25, 0.31, 0.03), loc=(0, 0, 0.20), material=amber, bevel=0.008)]
    for i, x in enumerate((-0.06, 0.06)):
        lever = box(f"Lever{i}", (0.03, 0.03, 0.18), loc=(x, -0.13, 0.12), material=black)
        knob = cyl(f"LeverKnob{i}", 0.035, 0.07, loc=(x, -0.13, 0.29), material=amber, verts=8)
        kit.tilt([lever, knob], rx=0.45, pivot=(x, -0.13, 0.12))
        parts += [lever, knob, cyl(f"Head{i}", 0.04, 0.05, loc=(x, -0.17, 0.05), material=steel, verts=10)]
    parts += [ball("SteamA", 0.055, loc=(0.02, 0.06, 0.29), material=steam),
              ball("SteamB", 0.045, loc=(-0.03, 0.08, 0.38), material=steam)]
    parent(join("coffee_m0_2_mesh", parts), root)
    return root


def _coffee_cashbox(w, d, h, pre="Cash"):
    """A light blue cash box with its back on the flank (x 0..w), a slot in the lid."""
    blue = mat(CF_PATH[1], rough=0.5)
    return [box(f"{pre}Box", (w, d, h), loc=(w / 2, 0, 0), material=blue, bevel=0.015),
            box(f"{pre}Lid", (w + 0.01, d + 0.01, 0.03), loc=(w / 2, 0, h - 0.06), material=mat("charcoal")),
            box(f"{pre}Slot", (0.10, 0.03, 0.01), loc=(w / 2, 0, h), material=mat("plastic_black", rough=0.6)),
            box(f"{pre}Lock", (0.05, 0.012, 0.06), loc=(w / 2, -d / 2 - 0.004, h * 0.3), material=mat("metal_light", metal=0.6, rough=0.35)),
            box(f"{pre}Side", (0.012, d * 0.6, h * 0.4), loc=(w + 0.004, 0, h * 0.25), material=mat("metal_light", metal=0.6, rough=0.35))]


def b_coffee_m1_1():
    """Petty Cash: a cash box on the flank, a gold coin half in the slot."""
    root = empty("coffee_m1_1")
    parts = _coffee_cashbox(0.17, 0.30, 0.18)
    parts.append(_cyly("Coin", 0.055, 0.016, (0.085, 0, 0.20), mat("yellow", metal=0.6, rough=0.35), verts=12))
    parent(join("coffee_m1_1_mesh", parts), root)
    return root


def b_coffee_m1_2():
    """Expense Report: a bigger box, a spike full of receipts, one long receipt down to the floor."""
    root = empty("coffee_m1_2")
    paper = mat("plastic_white", rough=0.5)
    w, d, h = 0.17, 0.34, 0.30
    parts = _coffee_cashbox(w, d, h)
    parts += [_cyly("Coin", 0.06, 0.016, (0.085, 0.09, h + 0.025), mat("yellow", metal=0.6, rough=0.35), verts=12),
              cyl("SpikeFoot", 0.05, 0.02, loc=(0.085, -0.07, h), material=mat("charcoal"), verts=10),
              cyl("Spike", 0.01, 0.20, loc=(0.085, -0.07, h + 0.02), material=mat("metal_light", metal=0.6, rough=0.35), verts=6)]
    for i in range(6):
        parts.append(box(f"Receipt{i}", (0.10, 0.13, 0.012), loc=(0.085, -0.07, h + 0.03 + i * 0.024), material=paper,
                         rot_z=(-0.5, 0.3, -0.1, 0.6, -0.3, 0.15)[i]))
    # The long one: out of the slot, over the edge, down the outside.
    parts += [box("LongTop", (0.09, 0.06, 0.008), loc=(0.13, 0.0, h + 0.002), material=paper),
              box("LongDrop", (0.008, 0.06, h + 0.23), loc=(w + 0.008, 0.0, -0.23), material=paper)]
    parent(join("coffee_m1_2_mesh", parts), root)
    return root


def _coffee_jar(r, h, pre="Jar"):
    """A glass tip jar of green coins on a green shelf hung on the flank (x -0.19..0)."""
    green = mat(CF_PATH[2], rough=0.6)
    x = -0.10
    return [box(f"{pre}Board", (0.02, 0.24, 0.12), loc=(-0.01, 0, 0), material=green),
            box(f"{pre}Shelf", (0.19, 0.24, 0.03), loc=(-0.095, 0, 0), material=green, bevel=0.006),
            cyl(f"{pre}Glass", r, h, loc=(x, -0.02, 0.03), material=mat("window", rough=0.15, alpha=0.5), verts=12, radius_top=r * 0.9),
            cyl(f"{pre}Coins", r * 0.88, h * 0.45, loc=(x, -0.02, 0.035), material=mat(CF_PATH[2], rough=0.6), verts=12),
            cyl(f"{pre}Band", r * 1.04, 0.05, loc=(x, -0.02, 0.03 + h * 0.55), material=green, verts=12),
            cyl(f"{pre}Rim", r * 0.95, 0.025, loc=(x, -0.02, 0.03 + h), material=mat("plastic_white", rough=0.5), verts=12)]


def b_coffee_m2_1():
    """Tip Jar: a glass jar of green coins on a shelf."""
    root = empty("coffee_m2_1")
    parent(join("coffee_m2_1_mesh", _coffee_jar(0.085, 0.20)), root)
    return root


def b_coffee_m2_2():
    """Loyalty Card: a bigger jar and a green pole flying a round stamp card."""
    root = empty("coffee_m2_2")
    green = mat(CF_PATH[2], rough=0.6)
    white = mat("plastic_white", rough=0.5)
    parts = _coffee_jar(0.088, 0.23)
    px, py, top = -0.10, 0.08, 0.53
    parts += [cyl("Pole", 0.02, top - 0.03, loc=(px, py, 0.03), material=green, verts=8),
              _cyly("Card", 0.10, 0.03, (px, py, top + 0.08), green, verts=14),
              _cyly("CardFace", 0.085, 0.034, (px, py, top + 0.08), white, verts=14)]
    # Stamps on both faces: four cups out of ten. The rest of the card is still to earn.
    for i in range(6):
        a = 2 * math.pi * i / 6 + math.pi / 2
        col = green if i < 4 else mat("charcoal")
        parts.append(_cyly(f"Stamp{i}", 0.018, 0.04, (px + 0.055 * math.cos(a), py, top + 0.08 + 0.055 * math.sin(a)), col, verts=8))
    parent(join("coffee_m2_2_mesh", parts), root)
    return root


# Heroes. Each keeps the machine (Slot0 on its roof, scaled with it) except the BREWING heroes,
# which are a bigger machine.

def _coffee_bar(pre="Bar"):
    """BREWING hero base: an amber counter with a chrome espresso machine, a grinder, a jug."""
    amber = mat(CF_PATH[0], rough=0.5)
    steel = mat("metal_light", metal=0.6, rough=0.35)
    black = mat("plastic_black", rough=0.6)
    char = mat("charcoal")
    white = mat("plastic_white", rough=0.5)
    parts = [box(f"{pre}Kick", (0.74, 0.46, 0.05), material=char),
             box(f"{pre}Counter", (0.78, 0.50, 0.37), loc=(0, 0, 0.05), material=amber, bevel=0.015),
             box(f"{pre}Rail", (0.78, 0.02, 0.03), loc=(0, -0.255, 0.33), material=steel),
             box(f"{pre}Top", (0.78, 0.50, 0.03), loc=(0, 0, 0.42), material=steel, bevel=0.008)]
    # The barista side: two cupboard doors with handles.
    for i, x in enumerate((-0.19, 0.19)):
        parts += [box(f"{pre}Door{i}", (0.34, 0.012, 0.26), loc=(x, 0.253, 0.09), material=char),
                  box(f"{pre}Knob{i}", (0.03, 0.02, 0.08), loc=(x - 0.12 * (1 if x > 0 else -1), 0.262, 0.20), material=steel)]
    # The machine: chrome, amber front, three groups with piston levers, cups warming on top.
    parts += [box(f"{pre}Mach", (0.38, 0.22, 0.32), loc=(0, 0.09, 0.45), material=steel, bevel=0.02),
              box(f"{pre}MachFront", (0.36, 0.012, 0.14), loc=(0, -0.024, 0.61), material=amber),
              box(f"{pre}MachBack", (0.30, 0.012, 0.18), loc=(0, 0.203, 0.52), material=amber),
              box(f"{pre}Drip", (0.38, 0.12, 0.015), loc=(0, -0.08, 0.45), material=black)]
    for i, x in enumerate((-0.12, 0.0, 0.12)):
        lever = box(f"{pre}Lever{i}", (0.03, 0.03, 0.20), loc=(x, -0.04, 0.70), material=black)
        knob = cyl(f"{pre}LeverKnob{i}", 0.035, 0.07, loc=(x, -0.04, 0.88), material=amber, verts=8)
        kit.tilt([lever, knob], rx=0.35, pivot=(x, -0.04, 0.70))
        parts += [lever, knob,
                  cyl(f"{pre}Head{i}", 0.045, 0.06, loc=(x, -0.06, 0.53), material=steel, verts=10),
                  box(f"{pre}Handle{i}", (0.03, 0.06, 0.025), loc=(x, -0.11, 0.545), material=black),
                  cyl(f"{pre}Cup{i}", 0.045, 0.06, loc=(x, 0.13, 0.77), material=white, verts=10, radius_top=0.05)]
    # Grinder, back left: charcoal body, a glass cone of beans.
    parts += [box(f"{pre}Grinder", (0.14, 0.14, 0.24), loc=(-0.29, 0.12, 0.45), material=char, bevel=0.012),
              box(f"{pre}GrinderBand", (0.145, 0.145, 0.04), loc=(-0.29, 0.12, 0.62), material=amber),
              cyl(f"{pre}Cone", 0.05, 0.16, loc=(-0.29, 0.12, 0.69), material=mat("window", rough=0.15, alpha=0.5), verts=10, radius_top=0.095),
              cyl(f"{pre}ConeBeans", 0.045, 0.10, loc=(-0.29, 0.12, 0.695), material=mat("coffee"), verts=10, radius_top=0.075),
              cyl(f"{pre}ConeLid", 0.10, 0.03, loc=(-0.29, 0.12, 0.85), material=black, verts=10)]
    # A full jug at the front.
    parts += _coffee_pot((0.06, -0.165, 0.45), 0.055, 0.14, black, pre=f"{pre}Jug")
    return parts


def _coffee_steam(pts, pre="Steam"):
    steam = mat("plastic_white", rough=0.5)
    return [ball(f"{pre}{i}", r, loc=p, material=steam) for i, (p, r) in enumerate(pts)]


def b_coffee_p0_3():
    """Barista Station: an amber espresso bar with three groups, a grinder, cups and steam."""
    root = empty("coffee_p0_3")
    parts = _coffee_bar()
    parts += _coffee_steam((((0.04, -0.02, 0.98), 0.055), ((0.08, 0.0, 1.07), 0.05), ((0.05, -0.01, 1.15), 0.045)))
    parent(join("coffee_p0_3_mesh", parts), root)
    _slots(root, [((0, 0.09, 0.77), 1.0), ((0.22, 0.02, 0.45), 1.0), ((-0.20, -0.12, 0.45), 1.0)])
    return root


def b_coffee_p0_4():
    """Coffee Subscription: the bar under a tall amber board of full jugs, delivery boxes stacked."""
    root = empty("coffee_p0_4")
    amber = mat(CF_PATH[0], rough=0.5)
    glow = mat(CF_PATH[0], emit=1.5)
    steel = mat("metal_light", metal=0.6, rough=0.35)
    parts = _coffee_bar()
    parts += _coffee_steam((((-0.06, -0.02, 0.98), 0.05), ((-0.03, 0.0, 1.07), 0.045)))
    parts += [cyl("PostL", 0.02, 0.85, loc=(-0.30, 0.235, 0.45), material=steel, verts=8),
              cyl("PostR", 0.02, 0.85, loc=(0.30, 0.235, 0.45), material=steel, verts=8),
              box("Board", (0.66, 0.04, 0.50), loc=(0, 0.235, 0.80), material=amber, bevel=0.012),
              box("BoardGlow", (0.62, 0.03, 0.03), loc=(0, 0.215, 0.765), material=glow),
              box("BoardBack", (0.50, 0.012, 0.36), loc=(0, 0.258, 0.87), material=mat("charcoal")),
              # Crown: a narrow sign with a glowing cup on it.
              box("Crown", (0.30, 0.05, 0.32), loc=(0, 0.235, 1.28), material=amber, bevel=0.015),
              box("CrownCup", (0.12, 0.07, 0.12), loc=(-0.015, 0.235, 1.37), material=glow, taper=1.2),
              box("CrownHandle", (0.04, 0.07, 0.07), loc=(0.065, 0.235, 1.395), material=glow),
              box("CrownSteam", (0.03, 0.07, 0.06), loc=(-0.015, 0.235, 1.51), material=glow),
              box("Rail", (0.52, 0.03, 0.03), loc=(-0.06, 0.20, 1.13), material=steel)]
    for i, x in enumerate((-0.27, -0.13, 0.01, 0.15)):
        parts += _coffee_pot((x, 0.155, 0.96), 0.05, 0.13, amber, pre=f"Hang{i}", verts=8)
        parts.append(box(f"Hook{i}", (0.015, 0.05, 0.05), loc=(x, 0.18, 1.10), material=steel))
    for i, (z, r) in enumerate(((0.45, 0.06), (0.56, -0.05), (0.67, 0.03))):
        parts += [box(f"Parcel{i}", (0.16, 0.22, 0.11), loc=(0.30, 0.03, z), material=mat("cardboard"), rot_z=r),
                  box(f"Tape{i}", (0.165, 0.04, 0.112), loc=(0.30, 0.03, z), material=amber, rot_z=r)]
    parent(join("coffee_p0_4_mesh", parts), root)
    _slots(root, [((0, 0.09, 0.77), 1.0), ((0.22, 0.03, 0.78), 1.0), ((-0.20, -0.12, 0.45), 1.0)])
    return root


def _coffee_dial(c, r, pre="Dial"):
    """A safe dial on the front face at c: a ring, a hub and four spokes."""
    x, y, z = c
    steel = mat("metal_light", metal=0.6, rough=0.35)
    parts = [_cyly(f"{pre}Ring", r, 0.03, (x, y - 0.015, z), mat("charcoal"), verts=14),
             _cyly(f"{pre}Hub", r * 0.45, 0.06, (x, y - 0.03, z), steel, verts=10)]
    for i in range(4):
        sp = box(f"{pre}Spoke{i}", (0.025, 0.025, r * 1.6), loc=(x, y - 0.045, z), material=steel)
        kit.tilt(sp, ry=math.pi / 4 + i * math.pi / 2, pivot=(x, y - 0.045, z))
        parts.append(sp)
    return parts


def b_coffee_p1_3():
    """Corporate Card: the machine on a light blue safe, a card reader with a glowing slot."""
    root = empty("coffee_p1_3")
    blue = mat(CF_PATH[1], rough=0.45, metal=0.3)
    char = mat("charcoal")
    s, mc = 0.8, (-0.08, 0.02, 0.50)
    parts = [box(f"Foot{i}", (0.08, 0.08, 0.04), loc=(x, y, 0), material=char)
             for i, (x, y) in enumerate(((-0.27, -0.23), (0.27, -0.23), (-0.27, 0.23), (0.27, 0.23)))]
    parts += [box("Safe", (0.66, 0.58, 0.46), loc=(0, 0, 0.04), material=blue, bevel=0.02),
              box("Seam", (0.54, 0.012, 0.36), loc=(0, -0.292, 0.08), material=char),
              box("Door", (0.52, 0.02, 0.34), loc=(0, -0.30, 0.09), material=blue, bevel=0.008),
              box("Band", (0.67, 0.59, 0.035), loc=(0, 0, 0.455), material=char),
              box("HingeA", (0.04, 0.04, 0.08), loc=(-0.28, -0.305, 0.13), material=char),
              box("HingeB", (0.04, 0.04, 0.08), loc=(-0.28, -0.305, 0.33), material=char),
              box("BackPlate", (0.46, 0.012, 0.30), loc=(0, 0.292, 0.10), material=char)]
    parts += _coffee_dial((0.04, -0.31, 0.26), 0.10)
    for i, (x, z) in enumerate(((-0.18, 0.15), (0.18, 0.15), (-0.18, 0.36), (0.18, 0.36))):
        parts.append(_cyly(f"Rivet{i}", 0.025, 0.02, (x, 0.302, z), mat("metal_light", metal=0.6, rough=0.35), verts=8))
    parts += _coffee_machine(mc, s)
    # Card reader, right on the safe: a dark pillar, a glowing blue slot, a card in it.
    parts += [box("Reader", (0.12, 0.13, 0.22), loc=(0.25, -0.10, 0.50), material=char, bevel=0.012),
              box("ReaderScreen", (0.09, 0.012, 0.06), loc=(0.25, -0.168, 0.62), material=mat(CF_PATH[1], emit=1.4)),
              box("ReaderSlot", (0.10, 0.04, 0.02), loc=(0.25, -0.08, 0.72), material=mat(CF_PATH[1], emit=1.4)),
              box("Card", (0.09, 0.015, 0.10), loc=(0.25, -0.08, 0.70), material=mat(CF_PATH[1], rough=0.45, metal=0.3)),
              box("CardChip", (0.03, 0.02, 0.025), loc=(0.23, -0.08, 0.76), material=mat("yellow", metal=0.6, rough=0.35))]
    parent(join("coffee_p1_3_mesh", parts), root)
    _slots(root, [_coffee_slot0(mc, s), ((0.33, -0.10, 0.12), 1.0), ((-0.33, -0.04, 0.12), 1.0)])
    return root


def b_coffee_p1_4():
    """Offshore Account: a big safe with its door open on glowing gold, a palm and a parasol on top."""
    root = empty("coffee_p1_4")
    blue = mat(CF_PATH[1], rough=0.45, metal=0.3)
    char = mat("charcoal")
    steel = mat("metal_light", metal=0.6, rough=0.35)
    gold = mat("yellow", metal=0.6, rough=0.35, emit=1.1)
    white = mat("plastic_white", rough=0.5)
    s, mc = 0.72, (-0.14, 0.08, 0.66)
    y0, y1 = -0.27, 0.35          # front and back of the safe
    ox0, ox1, oz0, oz1 = -0.20, 0.10, 0.14, 0.54   # the door opening
    parts = [box("Plinth", (0.70, 0.58, 0.04), loc=(0, 0.04, 0), material=char),
             box("SafeBack", (0.74, y1 + 0.07, 0.62), loc=(0, (y1 - 0.07) / 2, 0.04), material=blue, bevel=0.02),
             box("FrameL", (ox0 + 0.37, 0.20, 0.62), loc=((ox0 - 0.37) / 2, -0.17, 0.04), material=blue, bevel=0.015),
             box("FrameR", (0.37 - ox1, 0.20, 0.62), loc=((ox1 + 0.37) / 2, -0.17, 0.04), material=blue, bevel=0.015),
             box("FrameB", (ox1 - ox0, 0.20, oz0 - 0.04), loc=((ox0 + ox1) / 2, -0.17, 0.04), material=blue),
             box("FrameT", (ox1 - ox0, 0.20, 0.66 - oz1), loc=((ox0 + ox1) / 2, -0.17, oz1), material=blue),
             box("Inside", (ox1 - ox0, 0.02, oz1 - oz0), loc=((ox0 + ox1) / 2, -0.075, oz0), material=char),
             box("Shelf", (ox1 - ox0, 0.20, 0.02), loc=((ox0 + ox1) / 2, -0.17, 0.33), material=char),
             box("Band", (0.75, y1 - y0 + 0.01, 0.035), loc=(0, (y0 + y1) / 2, 0.60), material=char),
             box("BackPlate", (0.50, 0.012, 0.36), loc=(0, y1 + 0.002, 0.12), material=char)]
    for i, (x, z) in enumerate(((-0.20, 0.16), (0.20, 0.16), (-0.20, 0.44), (0.20, 0.44))):
        parts.append(_cyly(f"Rivet{i}", 0.025, 0.02, (x, y1 + 0.012, z), steel, verts=8))
    # Gold bars, stacked on the floor of the safe and on the shelf.
    k = 0
    for z, row in ((oz0, (-0.12, -0.05, 0.02)), (oz0 + 0.05, (-0.085, -0.015)), (0.35, (-0.11, -0.04, 0.03))):
        for x in row:
            parts.append(box(f"Gold{k}", (0.065, 0.12, 0.05), loc=(x, -0.16, z), material=gold, taper=0.8))
            k += 1
    # The door swung open on its hinge at the right of the opening, dial outward.
    hinge = (ox1, y0, 0)
    door = [box("Door", (ox1 - ox0, 0.05, oz1 - oz0), loc=((ox0 + ox1) / 2, y0 - 0.025, oz0), material=blue, bevel=0.01),
            box("DoorBolts", ((ox1 - ox0) * 0.7, 0.02, 0.05), loc=((ox0 + ox1) / 2, y0 + 0.01, oz0 + 0.17), material=steel)]
    door += _coffee_dial(((ox0 + ox1) / 2, y0 - 0.05, oz0 + 0.20), 0.08, pre="DoorDial")
    kit.tilt(door, rz=math.radians(150), pivot=hinge)
    parts += door
    parts += [box("HingeA", (0.04, 0.04, 0.08), loc=(ox1 + 0.02, y0 - 0.02, oz0 + 0.04), material=char),
              box("HingeB", (0.04, 0.04, 0.08), loc=(ox1 + 0.02, y0 - 0.02, oz1 - 0.12), material=char)]
    # Coins at the foot.
    for i, (x, y, n) in enumerate(((-0.30, -0.33, 3), (-0.20, -0.35, 2), (-0.27, -0.37, 1))):
        parts.append(cyl(f"Coins{i}", 0.045, 0.03 * n, loc=(x, y, 0), material=gold, verts=10))
    parts += _coffee_machine(mc, s)
    # A palm in a pot, back right, and a beach parasol, front right.
    px, py, ptop = 0.20, 0.22, 1.10
    parts += [cyl("PalmPot", 0.08, 0.12, loc=(px, py, 0.66), material=char, verts=10, radius_top=0.095),
              cyl("PalmSoil", 0.085, 0.02, loc=(px, py, 0.775), material=mat("coffee"), verts=10)]
    for i in range(4):
        z = 0.79 + i * 0.08
        parts.append(cyl(f"Trunk{i}", 0.032 - i * 0.003, 0.085, loc=(px + i * 0.008, py, z), material=mat("coffee"), verts=6))
    for i in range(6):
        a = 2 * math.pi * i / 6 + 0.3
        lf = box(f"Leaf{i}", (0.16, 0.06, 0.015), loc=(px + 0.024 + 0.08 * math.cos(a), py + 0.08 * math.sin(a), ptop), material=mat("plant"), rot_z=a)
        kit.tilt(lf, rx=-0.35 * math.sin(a), ry=0.35 * math.cos(a), pivot=(px + 0.024, py, ptop))
        parts.append(lf)
    ux, uy = 0.195, -0.15
    parts += [cyl("ParasolPole", 0.015, 0.96, loc=(ux, uy, 0.66), material=white, verts=6),
              cyl("ParasolA", 0.19, 0.06, loc=(ux, uy, 1.46), material=blue, verts=8, radius_top=0.13),
              cyl("ParasolB", 0.13, 0.05, loc=(ux, uy, 1.52), material=white, verts=8, radius_top=0.065),
              cyl("ParasolC", 0.065, 0.05, loc=(ux, uy, 1.57), material=blue, verts=8, radius_top=0.01),
              ball("ParasolTip", 0.02, loc=(ux, uy, 1.63), material=white)]
    parent(join("coffee_p1_4_mesh", parts), root)
    _slots(root, [_coffee_slot0(mc, s), ((0.365, -0.08, 0.24), 1.0), ((-0.365, -0.02, 0.24), 1.0)])
    return root


def b_coffee_p2_3():
    """Coffee Cart: the old cart at the new size, white and green on four wheels, a striped awning,
    the machine and a stack of cups on top."""
    root = empty("coffee_p2_3")
    green = mat(CF_PATH[2], rough=0.6)
    white = mat("plastic_white", rough=0.5)
    steel = mat("metal_light", metal=0.6, rough=0.35)
    black = mat("plastic_black", rough=0.6)
    s, mc = 0.5, (-0.12, 0.05, 0.55)
    parts = [box("Cart", (0.70, 0.50, 0.40), loc=(0, 0, 0.12), material=white, bevel=0.02),
             box("CartStripe", (0.71, 0.51, 0.08), loc=(0, 0, 0.38), material=green),
             box("CartSkirt", (0.71, 0.51, 0.06), loc=(0, 0, 0.14), material=green),
             box("CartTop", (0.74, 0.52, 0.03), loc=(0, 0, 0.52), material=green, bevel=0.008),
             box("Hatch", (0.30, 0.012, 0.14), loc=(0.12, 0.254, 0.22), material=steel)]
    for i, (x, y) in enumerate(((-0.33, -0.16), (-0.33, 0.16), (0.33, -0.16), (0.33, 0.16))):
        sx = -1 if x < 0 else 1
        parts += [_cylx(f"Wheel{i}", 0.09, 0.04, (x + sx * 0.04, y, 0.09), black, verts=12),
                  _cylx(f"Hub{i}", 0.035, 0.05, (x + sx * 0.04, y, 0.09), steel, verts=8)]
    # The awning: green and white strips on two poles, sloping down to the front, a valance.
    parts += [cyl(f"Pole{i}", 0.018, 0.78, loc=(x, 0.21, 0.55), material=steel, verts=8) for i, x in enumerate((-0.32, 0.32))]
    awn = []
    for i in range(8):
        x = -0.35 + i * 0.10
        col = green if i % 2 == 0 else white
        awn.append(box(f"Awning{i}", (0.10, 0.56, 0.03), loc=(x, -0.03, 1.31), material=col))
        awn.append(box(f"Flap{i}", (0.10, 0.015, 0.07), loc=(x, -0.31, 1.25), material=col))
    kit.tilt(awn, rx=0.22, pivot=(0, 0.21, 1.34))
    parts += awn
    parts += _coffee_machine(mc, s)
    parts += [cyl(f"Cup{i}", 0.045, 0.06, loc=(0.20, -0.10, 0.55 + i * 0.04), material=white, verts=10, radius_top=0.05) for i in range(4)]
    parts += [cyl("TipGlass", 0.06, 0.13, loc=(0.22, 0.11, 0.55), material=mat("window", rough=0.15, alpha=0.5), verts=10),
              cyl("TipCoins", 0.052, 0.06, loc=(0.22, 0.11, 0.555), material=mat(CF_PATH[2], rough=0.6), verts=10)]
    parent(join("coffee_p2_3_mesh", parts), root)
    _slots(root, [_coffee_slot0(mc, s), ((0.35, -0.10, 0.26), 1.0), ((-0.35, -0.02, 0.26), 1.0)])
    return root


def _coffee_logo(c, r, pre="Logo", glow=True):
    """The stand's own logo, both faces: a white disc in a green ring, a brown cup on it."""
    x, y, z = c
    white = mat("plastic_white", emit=1.0) if glow else mat("plastic_white", rough=0.5)
    brown = mat("coffee")
    parts = [_cyly(f"{pre}Ring", r, 0.05, (x, y, z), mat(CF_PATH[2], rough=0.6), verts=14),
             _cyly(f"{pre}Disc", r * 0.82, 0.056, (x, y, z), white, verts=14),
             box(f"{pre}Cup", (r * 0.62, 0.064, r * 0.6), loc=(x - r * 0.08, y, z - r * 0.38), material=brown, taper=1.25),
             box(f"{pre}Handle", (r * 0.22, 0.064, r * 0.28), loc=(x + r * 0.33, y, z - r * 0.18), material=brown)]
    return parts


def b_coffee_p2_4():
    """Franchise: a green stand with a back wall, a tall glowing sign, a line of flags."""
    root = empty("coffee_p2_4")
    green = mat(CF_PATH[2], rough=0.6)
    white = mat("plastic_white", rough=0.5)
    steel = mat("metal_light", metal=0.6, rough=0.35)
    s, mc = 0.55, (-0.02, -0.02, 0.60)
    parts = [box("Kick", (0.80, 0.52, 0.04), material=mat("charcoal")),
             box("Counter", (0.82, 0.54, 0.52), loc=(0, 0, 0.04), material=green, bevel=0.015),
             box("Stripe", (0.83, 0.55, 0.05), loc=(0, 0, 0.18), material=white),
             box("Top", (0.86, 0.58, 0.04), loc=(0, 0, 0.56), material=white, bevel=0.008),
             box("Wall", (0.86, 0.05, 0.60), loc=(0, 0.265, 0.60), material=white, bevel=0.01),
             box("WallStripe", (0.87, 0.06, 0.06), loc=(0, 0.265, 1.08), material=green),
             box("WallBack", (0.60, 0.012, 0.30), loc=(0, 0.292, 0.70), material=green),
             box("Menu", (0.26, 0.012, 0.22), loc=(-0.26, 0.236, 0.78), material=green)]
    for i in range(3):
        parts.append(box(f"MenuLine{i}", (0.18, 0.014, 0.025), loc=(-0.26, 0.232, 0.83 + i * 0.05), material=white))
    parts += _coffee_logo((0.0, -0.285, 0.35), 0.13, pre="Front", glow=False)
    # The sign on its pole above the wall: the crown, glowing.
    parts += [cyl("SignPole", 0.025, 0.30, loc=(0, 0.265, 1.20), material=steel, verts=8)]
    parts += _coffee_logo((0, 0.265, 1.52), 0.17, pre="Sign")
    # A line of flags from the sign down to both corners of the wall.
    for side, sx in (("L", -1), ("R", 1)):
        x0, z0, x1, z1 = 0.0, 1.47, sx * 0.42, 1.18
        ln = math.hypot(x1 - x0, z1 - z0)
        mx, mz = (x0 + x1) / 2, (z0 + z1) / 2
        line = box(f"Line{side}", (ln, 0.012, 0.012), loc=(mx, 0.225, mz - 0.006), material=mat("charcoal"))
        kit.tilt(line, ry=-math.atan2(z1 - z0, x1 - x0), pivot=(mx, 0.225, mz))
        parts.append(line)
        for k in range(4):
            t = (k + 0.7) / 4.6
            fx, fz = x0 + (x1 - x0) * t, z0 + (z1 - z0) * t
            flag = box(f"Flag{side}{k}", (0.08, 0.014, 0.10), loc=(fx, 0.225, fz - 0.10), material=green if k % 2 == 0 else white, taper=0.15)
            kit.tilt(flag, ry=math.pi, pivot=(fx, 0.225, fz - 0.05))
            parts.append(flag)
    parts += _coffee_machine(mc, s)
    parts += [cyl(f"Cup{i}", 0.04, 0.05, loc=(0.32, 0.18, 0.60 + i * 0.035), material=white, verts=10, radius_top=0.045) for i in range(4)]
    parent(join("coffee_p2_4_mesh", parts), root)
    _slots(root, [_coffee_slot0(mc, s), ((0.24, -0.04, 0.60), 1.0), ((-0.24, -0.04, 0.60), 1.0)])
    return root


def tower_coffee(tiers):
    return tower_parts("coffee", tiers)


TOWER_PART_BUILDERS["coffee_core"] = b_coffee_core
for _p in range(3):
    for _t in (1, 2):
        TOWER_PART_BUILDERS[f"coffee_m{_p}_{_t}"] = globals()[f"b_coffee_m{_p}_{_t}"]
    for _t in (3, 4):
        TOWER_PART_BUILDERS[f"coffee_p{_p}_{_t}"] = globals()[f"b_coffee_p{_p}_{_t}"]


# --- autoreply (tower parts)

# --- Auto-Reply (7.2). A laptop that answers by itself, on its own column; the screen on one leg
# (a lolly) is the silhouette, and a real envelope waits on a spring.

AR_ACCENT = "blue"
AR_PATH = ("#e5a04b", "#7fb6e3", "#b48ce0")
AR_TRAY_Z = 0.50
AR_TILT = 0.15   # the tray lifts at the back, like a laptop stand
AR_LID = -0.30   # the lid leans back from the base, so it ends up leaning back a little


def _ar_xf(c, rx=0.0, rz=0.0):
    """The same turn kit.tilt makes round c, for points (slots, tops)."""
    m = (Matrix.Translation(kit.Vector(c)) @ Matrix.Rotation(rz, 4, "Z") @ Matrix.Rotation(rx, 4, "X")
         @ Matrix.Translation(-kit.Vector(c)))
    return lambda p: tuple(m @ kit.Vector(p))


def _ar_place(parts, c, rx=0.0, rz=0.0):
    if rx or rz:
        kit.tilt(parts, rx=rx, rz=rz, pivot=c)
    return _ar_xf(c, rx, rz)


def _ar_strut(name, a, b, t, material):
    """A square bar from point a to point b."""
    dx, dy, dz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
    ln = math.sqrt(dx * dx + dy * dy + dz * dz)
    s = box(name, (t, t, ln), loc=a, material=material)
    kit.tilt(s, rx=-math.asin(dy / ln), ry=math.atan2(dx, dz), pivot=a)
    return s


def _ar_tick(pre, x, y, z, s, material, mirror=False):
    """A tick on a plate facing -Y (or +Y with mirror, so it reads right from behind).
    (x, z) is the bottom corner; the tick is 0.08 s wide and 0.07 s high."""
    k = -1 if mirror else 1
    t = 0.02 * s
    short = box(f"{pre}S", (0.046 * s, 0.01, t), loc=(x - k * 0.015 * s, y, z + 0.015 * s - t / 2), material=material)
    kit.tilt(short, ry=k * math.pi / 4, pivot=(x - k * 0.015 * s, y, z + 0.015 * s))
    long = box(f"{pre}L", (0.093 * s, 0.01, t), loc=(x + k * 0.025 * s, y, z + 0.035 * s - t / 2), material=material)
    kit.tilt(long, ry=-k * math.atan2(0.07, 0.05), pivot=(x + k * 0.025 * s, y, z + 0.035 * s))
    return [short, long]


def _ar_env(pre, c, w, h, flap=AR_ACCENT, rx=0.0, ry=0.0, rz=0.0, pivot=None):
    """An envelope standing up round its centre c: white, with a flap on both faces."""
    x, y, z = c
    t, fh = 0.025, h * 0.55
    parts = [box(f"{pre}Body", (w, t, h), loc=(x, y, z - h / 2), material=mat("plastic_white"), bevel=0.004)]
    for side, fy in (("F", y - t / 2 - 0.005), ("B", y + t / 2 + 0.005)):
        f = box(f"{pre}Flap{side}", (w * 0.94, 0.01, fh), loc=(x, fy, z + h / 2 - fh), material=mat(flap), taper=0.05)
        kit.tilt(f, ry=math.pi, pivot=(x, fy, z + h / 2 - fh / 2))
        parts.append(f)
    if rx or ry or rz:
        kit.tilt(parts, rx=rx, ry=ry, rz=rz, pivot=pivot or c)
    return parts


def _ar_icon(pre, kind, c, w, sh, col):
    """What the screen shows, on a face whose front is at c[1], centred at height c[2]."""
    x, y, z = c
    parts = []
    if kind in ("env", "fwd"):
        ew, eh = w * 0.44, sh * 0.34
        ex = x - (w * 0.14 if kind == "fwd" else 0)
        fh = eh * 0.55
        parts.append(box(f"{pre}IconEnv", (ew, 0.006, eh), loc=(ex, y - 0.003, z - eh / 2), material=mat("plastic_white", emit=0.6)))
        f = box(f"{pre}IconFlap", (ew * 0.94, 0.006, fh), loc=(ex, y - 0.008, z + eh / 2 - fh), material=mat(col), taper=0.05)
        kit.tilt(f, ry=math.pi, pivot=(ex, y - 0.008, z + eh / 2 - fh / 2))
        parts.append(f)
        if kind == "fwd":
            ax = x + w * 0.16
            parts.append(box(f"{pre}ArrowShaft", (w * 0.14, 0.006, sh * 0.08), loc=(ax, y - 0.003, z - sh * 0.04), material=mat("plastic_white", emit=0.6)))
            hd = box(f"{pre}ArrowHead", (sh * 0.24, 0.006, w * 0.13), loc=(ax + w * 0.07, y - 0.003, z - w * 0.065),
                     material=mat("plastic_white", emit=0.6), taper=0.05)
            kit.tilt(hd, ry=math.pi / 2, pivot=(ax + w * 0.07, y - 0.003, z))
            parts.append(hd)
    elif kind == "tick":
        s = w * 0.5 / 0.08
        parts += _ar_tick(f"{pre}Tick", x - 0.01 * s, y - 0.006, z - 0.035 * s, s, mat(col, emit=1.4))
    elif kind == "ticks":
        s = w * 0.3 / 0.08
        for i, dx in enumerate((-0.2, 0.2)):
            parts += _ar_tick(f"{pre}Tick{i}", x + dx * w - 0.01 * s, y - 0.006, z - 0.035 * s, s, mat(col, emit=0.6))
    return parts


def _ar_laptop(pre, c, w=0.54, d=0.36, sh=0.40, tray=AR_ACCENT, back=AR_ACCENT, face=None, icon="env",
               icon_col=AR_ACCENT, closed=False):
    """A laptop on a tray, untilted, its tray standing on c. Returns the parts and the top
    centre of the lid (where a mast can stand). The caller turns it with _ar_place."""
    x, y, z = c
    face = face or mat(AR_ACCENT, emit=0.9)
    steel = mat("metal_light", metal=0.6, rough=0.35)
    parts = []
    zb = z
    if tray:
        parts.append(box(f"{pre}Tray", (w + 0.04, d + 0.06, 0.035), loc=(x, y, z), material=mat(tray), bevel=0.01))
        zb = z + 0.035
    parts.append(box(f"{pre}Base", (w, d, 0.04), loc=(x, y, zb), material=steel, bevel=0.008))
    zt = zb + 0.04
    if closed:
        parts += [box(f"{pre}Lid", (w, d, 0.03), loc=(x, y, zt), material=mat(back), bevel=0.008),
                  box(f"{pre}LidPanel", (w * 0.46, d * 0.42, 0.008), loc=(x, y, zt + 0.03), material=mat("plastic_white"))]
        return parts, (x, y, zt + 0.038)
    parts.append(box(f"{pre}Keys", (w * 0.84, d * 0.46, 0.012), loc=(x, y + d * 0.06, zt), material=mat("charcoal")))
    yb = y + d / 2 - 0.02
    lid = [box(f"{pre}Lid", (w + 0.01, 0.035, sh), loc=(x, yb, zt), material=mat(back), bevel=0.008),
           box(f"{pre}Face", (w - 0.05, 0.012, sh - 0.06), loc=(x, yb - 0.02, zt + 0.03), material=face),
           # The back is not bare: a white panel on the lid.
           box(f"{pre}BackPanel", (w * 0.46, 0.008, sh * 0.36), loc=(x, yb + 0.019, zt + sh * 0.34), material=mat("plastic_white"))]
    lid += _ar_icon(pre, icon, (x, yb - 0.026, zt + sh * 0.52), w, sh, icon_col)
    kit.tilt(lid, rx=AR_LID, pivot=(x, yb, zt))
    parts += lid
    return parts, (x, yb - sh * math.sin(AR_LID), zt + sh * math.cos(AR_LID))


def _ar_stand(top, foot=AR_ACCENT, r=0.25, xy=(0, 0)):
    """The round foot and the column up to the tray."""
    x, y = xy
    return [cyl("ArFoot", r, 0.06, loc=(x, y, 0), material=mat("charcoal"), verts=14, bevel=0.01),
            cyl("ArFootTop", r * 0.68, 0.025, loc=(x, y, 0.06), material=mat(foot), verts=14),
            cyl("ArPole", 0.05, top - 0.135, loc=(x, y, 0.085), material=mat("metal_light", metal=0.6, rough=0.35), verts=10),
            box("ArHinge", (0.16, 0.12, 0.05), loc=(x, y, top - 0.05), material=mat("charcoal"), bevel=0.008)]


def _ar_spring_env(pre, c, flap=AR_ACCENT):
    """The envelope that goes out next, on a spring: the shot leaves from here."""
    x, y, z = c
    steel = mat("metal_light", metal=0.6, rough=0.35)
    parts = [cyl(f"{pre}Rod", 0.012, 0.15, loc=(x, y, z), material=steel, verts=6)]
    for i in range(4):
        parts.append(cyl(f"{pre}Coil{i}", 0.042, 0.018, loc=(x + (0.012 if i % 2 else -0.012), y, z + 0.015 + i * 0.033),
                         material=steel, verts=10))
    parts.append(box(f"{pre}Clip", (0.10, 0.05, 0.03), loc=(x, y, z + 0.15), material=mat("charcoal")))
    parts += _ar_env(pre, (x, y, z + 0.26), 0.24, 0.16, flap, rx=-0.1)
    return parts


def b_autoreply_core():
    root = empty("autoreply_core")
    c = (0, 0, AR_TRAY_Z)
    parts = _ar_stand(AR_TRAY_Z)
    lap, top = _ar_laptop("Lap", c)
    lap += _ar_spring_env("Shot", (-0.15, -0.12, AR_TRAY_Z + 0.075))
    xf = _ar_place(lap, c, rx=AR_TILT)
    parent(join("autoreply_core_mesh", parts + lap), root)
    e = AR_TRAY_Z + 0.0175
    _slots(root, [(xf((-0.29, 0, e)), 1.0), (xf((0.29, 0, e)), 1.0), (xf(top), 1.0)])
    return root


# Modules. Paths 1 and 2 clamp a shelf to the side of the tray (left and right), path 3 stands on
# top of the screen.

def _ar_shelf(sx, col, w=0.14, d=0.26):
    """A clamp against the side the slot sits on and a shelf going outward (sx -1 left, 1 right)."""
    return [box("Clamp", (0.02, 0.14, 0.10), loc=(sx * 0.01, 0, -0.06), material=mat("charcoal")),
            box("Shelf", (w, d, 0.025), loc=(sx * (0.02 + w / 2), 0, -0.025), material=mat(col), bevel=0.006)]


def b_autoreply_m0_1():
    """Canned Response: an orange letter tray with a stack of template cards."""
    root = empty("autoreply_m0_1")
    o, sx = AR_PATH[0], -1
    cx = sx * 0.09
    parts = _ar_shelf(sx, o)
    parts += [box("WallBack", (0.14, 0.02, 0.12), loc=(cx, 0.12, 0), material=mat(o)),
              box("WallFront", (0.14, 0.02, 0.06), loc=(cx, -0.12, 0), material=mat(o)),
              box("WallOut", (0.02, 0.26, 0.10), loc=(sx * 0.15, 0, 0), material=mat(o)),
              box("WallIn", (0.02, 0.26, 0.10), loc=(sx * 0.03, 0, 0), material=mat(o))]
    for i, yy in enumerate((-0.06, 0.0, 0.06)):
        card = box(f"Card{i}", (0.10, 0.012, 0.16), loc=(cx, yy, 0), material=mat("plastic_white" if i % 2 == 0 else o))
        kit.tilt(card, rx=-0.3, pivot=(cx, yy, 0))
        parts.append(card)
    parent(join("autoreply_m0_1_mesh", parts), root)
    return root


def b_autoreply_m0_2():
    """Mail Merge: a two-level orange rack, two envelopes sticking out of the top in a V."""
    root = empty("autoreply_m0_2")
    o, sx = AR_PATH[0], -1
    cx = sx * 0.09
    parts = _ar_shelf(sx, o)
    parts += [box("SideOut", (0.02, 0.26, 0.30), loc=(sx * 0.15, 0, 0), material=mat(o), bevel=0.004),
              box("SideIn", (0.02, 0.26, 0.30), loc=(sx * 0.03, 0, 0), material=mat(o), bevel=0.004),
              box("Back", (0.14, 0.02, 0.30), loc=(cx, 0.12, 0), material=mat(o)),
              box("Mid", (0.12, 0.24, 0.02), loc=(cx, 0, 0.14), material=mat(o)),
              box("Stack", (0.10, 0.20, 0.08), loc=(cx, -0.01, 0), material=mat("plastic_white"))]
    parts += _ar_env("EnvA", (cx, -0.035, 0.27), 0.11, 0.22, o, rx=0.42, pivot=(cx, -0.035, 0.16))
    parts += _ar_env("EnvB", (cx, 0.035, 0.27), 0.11, 0.22, o, rx=-0.42, pivot=(cx, 0.035, 0.16))
    parent(join("autoreply_m0_2_mesh", parts), root)
    return root


def b_autoreply_m1_1():
    """Keyboard Shortcuts: a small light-blue keyboard on a swing arm, with two huge keys."""
    root = empty("autoreply_m1_1")
    b, sx = AR_PATH[1], 1
    cx = sx * 0.09
    parts = [box("Clamp", (0.02, 0.14, 0.10), loc=(sx * 0.01, 0, -0.06), material=mat("charcoal")),
             box("Arm", (0.12, 0.05, 0.03), loc=(sx * 0.08, 0, -0.04), material=mat("charcoal")),
             cyl("Swivel", 0.03, 0.13, loc=(cx, 0, -0.02), material=mat("metal_light", metal=0.6, rough=0.35), verts=10)]
    kb = [box("Board", (0.14, 0.26, 0.04), loc=(cx, 0, 0.11), material=mat(b), bevel=0.008),
          box("KeyA", (0.11, 0.10, 0.06), loc=(cx, -0.065, 0.15), material=mat("plastic_white"), bevel=0.012),
          box("KeyB", (0.11, 0.10, 0.06), loc=(cx, 0.045, 0.15), material=mat("plastic_white"), bevel=0.012),
          box("Row", (0.11, 0.03, 0.015), loc=(cx, 0.112, 0.15), material=mat("charcoal"))]
    kit.tilt(kb, rx=0.25, pivot=(cx, 0, 0.11))
    parent(join("autoreply_m1_1_mesh", parts + kb), root)
    return root


def b_autoreply_m1_2():
    """Inbox Rules: a light-blue sorting bin with three tabs and a funnel above it."""
    root = empty("autoreply_m1_2")
    b, sx = AR_PATH[1], 1
    cx = sx * 0.09
    steel = mat("metal_light", metal=0.6, rough=0.35)
    parts = _ar_shelf(sx, b)
    parts += [box("Bin", (0.14, 0.26, 0.24), loc=(cx, 0, 0), material=mat(b), bevel=0.01),
              box("Label", (0.09, 0.006, 0.06), loc=(cx, -0.132, 0.12), material=mat("plastic_white")),
              box("LabelBack", (0.09, 0.006, 0.06), loc=(cx, 0.132, 0.12), material=mat("plastic_white"))]
    for i, (yy, dx) in enumerate(((-0.07, -0.03), (0.0, 0.0), (0.07, 0.03))):
        parts += [box(f"Divider{i}", (0.12, 0.012, 0.06), loc=(cx, yy, 0.21), material=mat("plastic_white")),
                  box(f"Tab{i}", (0.05, 0.012, 0.04), loc=(cx + dx, yy, 0.27), material=mat("plastic_white"))]
    parts += [box("Post", (0.02, 0.02, 0.16), loc=(cx, 0.115, 0.24), material=steel),
              box("PostArm", (0.02, 0.10, 0.02), loc=(cx, 0.07, 0.37), material=steel),
              cyl("Funnel", 0.025, 0.11, loc=(cx, 0.02, 0.33), material=mat(b), verts=12, radius_top=0.07),
              cyl("FunnelRim", 0.07, 0.015, loc=(cx, 0.02, 0.44), material=steel, verts=12)]
    parent(join("autoreply_m1_2_mesh", parts), root)
    return root


def _ar_mast_foot():
    return box("MastFoot", (0.10, 0.08, 0.03), material=mat("charcoal"), bevel=0.006)


def b_autoreply_m2_1():
    """Read Receipt: a purple mast with a plate showing two ticks."""
    root = empty("autoreply_m2_1")
    p = AR_PATH[2]
    white = mat("plastic_white")
    parts = [_ar_mast_foot(),
             box("Mast", (0.03, 0.03, 0.20), loc=(0, 0, 0.03), material=mat(p)),
             box("Plate", (0.21, 0.03, 0.13), loc=(0, 0, 0.20), material=mat(p), bevel=0.01)]
    for side, yy, mir in (("F", -0.02, False), ("B", 0.02, True)):
        k = -1 if mir else 1
        for i, x0 in enumerate((-0.035, 0.045)):
            parts += _ar_tick(f"Tick{side}{i}", k * x0, yy, 0.232, 0.9, white, mirror=mir)
    parent(join("autoreply_m2_1_mesh", parts), root)
    return root


def b_autoreply_m2_2():
    """Tracking Pixel: a taller mast with a glowing purple eye that looks ahead, the tick plate
    lower down as a flag."""
    root = empty("autoreply_m2_2")
    p = AR_PATH[2]
    white = mat("plastic_white")
    parts = [_ar_mast_foot(),
             box("Mast", (0.03, 0.03, 0.30), loc=(0, 0, 0.03), material=mat(p)),
             box("Flag", (0.13, 0.025, 0.085), loc=(0.08, 0, 0.16), material=mat(p), bevel=0.008),
             ball("Eye", 0.10, loc=(0, 0, 0.40), material=mat(p, emit=1.3), subdiv=2),
             _cyly("Iris", 0.062, 0.02, (0, -0.092, 0.40), white, verts=12),
             _cyly("Pupil", 0.034, 0.02, (0, -0.104, 0.40), mat("plastic_black"), verts=10),
             box("Brow", (0.20, 0.08, 0.025), loc=(0, -0.02, 0.495), material=mat("charcoal"), bevel=0.008)]
    for side, yy, mir in (("F", -0.0175, False), ("B", 0.0175, True)):
        parts += _ar_tick(f"Tick{side}", 0.07 + (0.02 if mir else -0.01), yy, 0.175, 0.75, white, mirror=mir)
    parent(join("autoreply_m2_2_mesh", parts), root)
    return root


# Heroes. Each keeps the column and something laptop-like, so the family shows; slots for the two
# other paths stay on the sides of a tray (or a plate) and on top or in front.

def _ar_canopy(pre, c, R, H, cols, n=8, rx=0.0):
    """A parasol canopy of n panels, alternating colours, its rim centred on c."""
    x, y, z = c
    rc = R * math.cos(math.pi / n)
    w = 2 * R * math.sin(math.pi / n) * 1.04
    ln = math.hypot(rc, H)
    parts = []
    for i in range(n):
        p = box(f"{pre}Panel{i}", (w, 0.012, ln), loc=(x, y - rc, z), material=mat(cols[i % len(cols)]), taper=0.04)
        kit.tilt(p, rx=-math.atan2(rc, H), pivot=(x, y - rc, z))
        kit.tilt(p, rz=2 * math.pi * i / n, pivot=(x, y, z))
        parts.append(p)
    if rx:
        kit.tilt(parts, rx=rx, pivot=c)
    return parts


def b_autoreply_p0_3():
    """Out of Office: the laptop shut, a beach parasol over it, a door hanger on the column and
    three replies bouncing on in an arc."""
    root = empty("autoreply_p0_3")
    o = AR_PATH[0]
    steel = mat("metal_light", metal=0.6, rough=0.35)
    c = (0, 0, AR_TRAY_Z)
    parts = _ar_stand(AR_TRAY_Z, foot=o)
    lap, top = _ar_laptop("Lap", c, tray=o, back=o, closed=True)
    xf = _ar_place(lap, c, rx=AR_TILT)
    parts += lap
    # The parasol is clamped to the column and leans forward over the laptop.
    by, bz, lean = 0.33, 0.26, 0.24
    axis = lambda zz: (0, by - (zz - bz) * math.tan(lean), zz)  # noqa: E731
    pole = cyl("ParasolPole", 0.02, (1.40 - bz) / math.cos(lean), loc=(0, by, bz), material=steel, verts=8)
    kit.tilt(pole, rx=lean, pivot=(0, by, bz))
    cc = axis(1.27)
    parts += [cyl("Collar", 0.065, 0.06, loc=(0, 0, bz - 0.03), material=mat("charcoal"), verts=10),
              box("ParasolArm", (0.04, by, 0.04), loc=(0, by / 2, bz - 0.02), material=mat("charcoal")), pole]
    parts += _ar_canopy("Canopy", cc, 0.36, 0.14, (o, "plastic_white"), rx=lean)
    parts.append(ball("Finial", 0.03, loc=(0, cc[1] - 0.15 * math.sin(lean), cc[2] + 0.15 * math.cos(lean)), material=mat(o)))
    # Do not disturb: a door hanger with a moon.
    parts += [cyl("HangerRing", 0.07, 0.02, loc=(0, 0, 0.36), material=mat(o), verts=10),
              box("Hanger", (0.15, 0.02, 0.21), loc=(0, -0.075, 0.15), material=mat(o), bevel=0.006),
              _cyly("Moon", 0.045, 0.01, (-0.012, -0.089, 0.27), mat("plastic_white"), verts=12),
              _cyly("MoonBite", 0.04, 0.01, (0.012, -0.093, 0.285), mat(o), verts=12),
              box("HangerBack", (0.09, 0.008, 0.03), loc=(0, -0.061, 0.22), material=mat("plastic_white"))]
    for i, (x, y, z, r) in enumerate(((-0.20, -0.15, 0.82, -0.45), (0.0, -0.19, 0.96, 0.0), (0.20, -0.15, 0.82, 0.45))):
        parts += _ar_env(f"Hop{i}", (x, y, z), 0.16, 0.11, o, ry=r)
    parent(join("autoreply_p0_3_mesh", parts), root)
    e = AR_TRAY_Z + 0.0175
    _slots(root, [(xf((-0.29, 0, e)), 1.0), (xf((0.29, 0, e)), 1.0), (xf((0.15, 0.06, top[2])), 1.0)])
    return root


def _ar_panel(pre, x0, x1, y, zb, h, back, face, rz=0.0, hinge=None):
    """A flat screen from x0 to x1, its back in the path colour with a white panel."""
    w, cx = x1 - x0, (x0 + x1) / 2
    parts = [box(f"{pre}Back", (w, 0.04, h), loc=(cx, y, zb), material=mat(back), bevel=0.008),
             box(f"{pre}Face", (w - 0.03, 0.012, h - 0.04), loc=(cx, y - 0.024, zb + 0.02), material=face),
             box(f"{pre}BackPanel", (w * 0.5, 0.008, h * 0.3), loc=(cx, y + 0.022, zb + h * 0.4), material=mat("plastic_white"))]
    if rz:
        kit.tilt(parts, rz=rz, pivot=hinge)
    return parts


def b_autoreply_p0_4():
    """Inbox Zero: a wide curved screen with a giant tick, an empty wire tray, and a glowing
    orange halo above."""
    root = empty("autoreply_p0_4")
    o = AR_PATH[0]
    steel = mat("metal_light", metal=0.6, rough=0.35)
    z = AR_TRAY_Z
    zt = z + 0.035
    parts = _ar_stand(z, foot=o)
    parts.append(box("Tray", (0.76, 0.42, 0.035), loc=(0, 0, z), material=mat(o), bevel=0.01))
    # The empty wire tray: nothing left in it.
    bx, by = 0.0, -0.10
    for i, yy in enumerate((-0.08, 0.08)):
        parts.append(box(f"WireLong{i}", (0.38, 0.025, 0.025), loc=(bx, by + yy, zt + 0.07), material=steel))
    for i, xx in enumerate((-0.18, 0.18)):
        parts.append(box(f"WireEnd{i}", (0.025, 0.16, 0.025), loc=(bx + xx, by, zt + 0.07), material=steel))
        for j, yy in enumerate((-0.08, 0.08)):
            parts.append(box(f"WirePost{i}{j}", (0.022, 0.022, 0.07), loc=(bx + xx, by + yy, zt), material=steel))
    for i, xx in enumerate((-0.12, -0.04, 0.04, 0.12)):
        parts.append(box(f"WireFloor{i}", (0.02, 0.16, 0.015), loc=(bx + xx, by, zt), material=steel))
    # The curved screen: a centre panel and two wings bent towards you.
    face = mat("screen_glow", emit=1.2)
    sy, zb, h = 0.12, zt + 0.06, 0.44
    parts.append(box("Neck", (0.10, 0.06, 0.07), loc=(0, sy, zt), material=mat("charcoal")))
    parts += _ar_panel("Mid", -0.15, 0.15, sy, zb, h, o, face)
    parts += _ar_panel("WingL", -0.39, -0.15, sy, zb, h, o, face, rz=0.45, hinge=(-0.15, sy, zb))
    parts += _ar_panel("WingR", 0.15, 0.39, sy, zb, h, o, face, rz=-0.45, hinge=(0.15, sy, zb))
    parts += _ar_tick("Zero", -0.03, sy - 0.036, zb + 0.09, 3.2, mat(o, emit=1.4))
    # The halo, on a post behind the screen.
    top = zb + h
    parts += [box("HaloBlock", (0.06, 0.12, 0.05), loc=(0, sy + 0.08, top - 0.12), material=mat("charcoal")),
              cyl("HaloPost", 0.016, 1.53 - (top - 0.12), loc=(0, 0.26, top - 0.12), material=steel, verts=8),
              box("HaloSpoke", (0.03, 0.12, 0.03), loc=(0, 0.32, 1.52), material=steel)]
    parts += _ring("Halo", 0.28, 16, 0.045, (0, sy - 0.02, 1.55), mat(o, emit=1.5))
    parent(join("autoreply_p0_4_mesh", parts), root)
    e = z + 0.0175
    _slots(root, [((-0.38, 0, e), 1.0), ((0.38, 0, e), 1.0), ((0, sy, top), 1.0)])
    return root


def b_autoreply_p1_3():
    """Auto-Forward: two laptops back to back in a V, each forwarding, a light-blue Y pipe that
    splits to both sides."""
    root = empty("autoreply_p1_3")
    b = AR_PATH[1]
    z = AR_TRAY_Z
    parts = _ar_stand(z, foot=b)
    parts.append(box("Tray", (0.80, 0.44, 0.035), loc=(0, 0, z), material=mat(b), bevel=0.01))
    for side, sx in (("L", -1), ("R", 1)):
        c = (sx * 0.24, -0.02, z + 0.035)
        lap, _ = _ar_laptop(f"Lap{side}", c, w=0.26, d=0.20, sh=0.26, tray=None, back=b, face=mat(b, emit=1.0),
                            icon="fwd", icon_col=AR_ACCENT)
        _ar_place(lap, c, rz=sx * 0.45)
        parts += lap
    pipe = mat(b, rough=0.5)
    jz, py = 1.04, 0.17
    parts += [cyl("PipeFoot", 0.06, 0.04, loc=(0, py, z + 0.035), material=mat("charcoal"), verts=12),
              cyl("Pipe", 0.04, jz - z, loc=(0, py, z + 0.035), material=pipe, verts=12),
              ball("Joint", 0.06, loc=(0, py, jz), material=pipe)]
    for side, sx in (("L", -1), ("R", 1)):
        a = sx * 0.75
        br = cyl(f"Branch{side}", 0.035, 0.30, loc=(0, py, jz), material=pipe, verts=12)
        mouth = cyl(f"Mouth{side}", 0.05, 0.05, loc=(0, py, jz + 0.27), material=mat(b, emit=1.2), verts=12)
        kit.tilt([br, mouth], ry=a, pivot=(0, py, jz))
        parts += [br, mouth]
        ex, ez = 0.40 * math.sin(a), jz + 0.40 * math.cos(a)
        parts += _ar_env(f"Out{side}", (ex, py, ez), 0.14, 0.10, AR_ACCENT, ry=-a * 0.6)
    parent(join("autoreply_p1_3_mesh", parts), root)
    e = z + 0.0175
    _slots(root, [((-0.40, 0, e), 1.0), ((0.40, 0, e), 1.0), ((0, -0.17, z + 0.035), 1.0)])
    return root


def b_autoreply_p1_4():
    """Filter Everything: four small screens fanned out on a stand with four legs, a big metal
    funnel on top with a glowing rim, envelopes dropping in."""
    root = empty("autoreply_p1_4")
    b = AR_PATH[1]
    steel = mat("metal_light", metal=0.6, rough=0.35)
    pz = 0.26
    parts = [box("Plate", (0.60, 0.50, 0.05), loc=(0, 0, pz), material=mat(b), bevel=0.01)]
    for i, (sx, sy) in enumerate(((-1, -1), (1, -1), (-1, 1), (1, 1))):
        foot = (sx * 0.30, sy * 0.23, 0.02)
        parts += [_ar_strut(f"Leg{i}", foot, (sx * 0.21, sy * 0.16, pz), 0.045, mat(b)),
                  cyl(f"LegFoot{i}", 0.045, 0.025, loc=(foot[0], foot[1], 0), material=mat("charcoal"), verts=10)]
    py = 0.08
    parts += [cyl("Pole", 0.045, 1.06 - pz - 0.05, loc=(0, py, pz + 0.05), material=steel, verts=10),
              box("Hub", (0.11, 0.09, 0.08), loc=(0, py - 0.06, 0.56), material=mat("charcoal"), bevel=0.008)]
    face = mat("screen", emit=1.1)
    for i, a in enumerate((-0.75, -0.25, 0.25, 0.75)):
        y = -0.03 - i * 0.012 if i < 2 else -0.03 - (3 - i) * 0.012
        scr = [box(f"Scr{i}", (0.19, 0.035, 0.29), loc=(0, y, 0.62), material=mat(b), bevel=0.006),
               box(f"ScrFace{i}", (0.16, 0.01, 0.25), loc=(0, y - 0.021, 0.64), material=face),
               box(f"ScrEnv{i}", (0.10, 0.006, 0.065), loc=(0, y - 0.028, 0.77), material=mat("plastic_white", emit=0.6)),
               box(f"ScrBack{i}", (0.10, 0.006, 0.10), loc=(0, y + 0.019, 0.72), material=mat("plastic_white"))]
        kit.tilt(scr, ry=a, pivot=(0, y, 0.60))
        parts += scr
    fz = 1.14
    parts += [cyl("Spout", 0.045, 0.10, loc=(0, py, fz - 0.10), material=steel, verts=10),
              cyl("Funnel", 0.05, 0.36, loc=(0, py, fz), material=steel, verts=14, radius_top=0.30),
              cyl("FunnelHole", 0.27, 0.006, loc=(0, py, fz + 0.36), material=mat("charcoal"), verts=14)]
    parts += _ring("Rim", 0.30, 16, 0.04, (0, py, fz + 0.38), mat(b, emit=1.4))
    for i, (x, y, zz, rx, ry) in enumerate(((-0.10, 0.04, 1.56, 0.3, 0.5), (0.09, 0.12, 1.60, -0.2, -0.7), (0.0, 0.0, 1.66, 0.5, 0.2))):
        parts += _ar_env(f"Drop{i}", (x, y, zz), 0.14, 0.10, AR_ACCENT, rx=rx, ry=ry)
    parent(join("autoreply_p1_4_mesh", parts), root)
    e = pz + 0.025
    _slots(root, [((-0.30, 0, e), 1.0), ((0.30, 0, e), 1.0), ((0, -0.20, pz + 0.05), 1.0)])
    return root


def b_autoreply_p2_3():
    """CC Your Manager: the laptop in purple, and over it, on a tall swing arm, a second screen
    that reads along. A red flag on top."""
    root = empty("autoreply_p2_3")
    p = AR_PATH[2]
    face = mat(p, emit=1.0)
    c = (0, 0, AR_TRAY_Z)
    parts = _ar_stand(AR_TRAY_Z, foot=p)
    lap, top = _ar_laptop("Lap", c, tray=p, back=p, face=face, icon="env", icon_col="charcoal")
    lap += _ar_spring_env("Shot", (-0.15, -0.12, AR_TRAY_Z + 0.075), flap=p)
    xf = _ar_place(lap, c, rx=AR_TILT)
    parts += lap
    ay = 0.29
    parts += [cyl("Collar", 0.065, 0.06, loc=(0, 0, 0.27), material=mat("charcoal"), verts=10),
              box("ArmLow", (0.045, ay, 0.045), loc=(0, ay / 2, 0.28), material=mat(p)),
              box("ArmPost", (0.045, 0.045, 1.02), loc=(0, ay, 0.28), material=mat(p)),
              ball("Elbow", 0.045, loc=(0, ay, 1.30), material=mat("charcoal")),
              _ar_strut("ArmTop", (0, ay, 1.30), (0, 0.06, 1.25), 0.04, mat(p))]
    mc = (0, 0.02, 1.22)
    mon = [box("MgrBack", (0.40, 0.04, 0.26), loc=(0, mc[1], mc[2] - 0.13), material=mat(p), bevel=0.01),
           box("MgrFace", (0.36, 0.012, 0.22), loc=(0, mc[1] - 0.024, mc[2] - 0.11), material=face),
           box("MgrBackPanel", (0.20, 0.008, 0.10), loc=(0, mc[1] + 0.022, mc[2] - 0.05), material=mat("plastic_white")),
           box("FlagPole", (0.016, 0.016, 0.10), loc=(0.16, mc[1], mc[2] + 0.13), material=mat("charcoal")),
           box("Flag", (0.11, 0.012, 0.075), loc=(0.11, mc[1], mc[2] + 0.15), material=mat("red"))]
    mon += _ar_icon("Mgr", "ticks", (0, mc[1] - 0.030, mc[2]), 0.36, 0.22, "plastic_white")
    kit.tilt(mon, rx=0.30, pivot=mc)
    parts += mon
    parent(join("autoreply_p2_3_mesh", parts), root)
    e = AR_TRAY_Z + 0.0175
    _slots(root, [(xf((-0.29, 0, e)), 1.0), (xf((0.29, 0, e)), 1.0), (xf(top), 1.0)])
    return root


def b_autoreply_p2_4():
    """Legal Hold: a tower of black binders taped up in glowing purple beside the laptop, a ring
    of barrier tape round the foot, a wax seal on top."""
    root = empty("autoreply_p2_4")
    p = AR_PATH[2]
    glow = mat(p, emit=1.4)
    lx = -0.14
    c = (lx, 0, AR_TRAY_Z)
    parts = _ar_stand(AR_TRAY_Z, foot=p, r=0.20, xy=(lx, 0))
    lap, top = _ar_laptop("Lap", c, w=0.36, d=0.32, sh=0.34, tray=p, back=p, face=mat(p, emit=1.0), icon="env",
                          icon_col="charcoal")
    xf = _ar_place(lap, c, rx=AR_TILT)
    parts += lap
    bx, rh = 0.20, 0.42
    for r in range(3):
        for i in range(3):
            x = bx - 0.085 + i * 0.085
            parts += [box(f"Binder{r}{i}", (0.08, 0.26, rh - 0.01), loc=(x, 0, r * rh), material=mat("plastic_black"), bevel=0.006),
                      box(f"Spine{r}{i}", (0.05, 0.006, 0.20), loc=(x, -0.133, r * rh + 0.12), material=mat(p))]
        parts.append(box(f"Pages{r}", (0.24, 0.006, rh - 0.08), loc=(bx, 0.132, r * rh + 0.04), material=mat("paper")))
    for i, (zz, a) in enumerate(((0.36, 0.25), (0.86, -0.25))):
        band = box(f"Tape{i}", (0.275, 0.275, 0.06), loc=(bx, 0, zz - 0.03), material=glow)
        kit.tilt(band, ry=a, pivot=(bx, 0, zz))
        parts.append(band)
    st = 3 * rh
    parts += [box("SealRibbonA", (0.04, 0.012, 0.13), loc=(bx - 0.04, 0.01, st), material=mat(p)),
              box("SealRibbonB", (0.04, 0.012, 0.13), loc=(bx + 0.04, 0.01, st), material=mat(p)),
              _cyly("Seal", 0.11, 0.04, (bx, 0, st + 0.11), mat("red"), verts=12),
              _cyly("SealStamp", 0.065, 0.02, (bx, -0.025, st + 0.11), mat("red"), verts=10)]
    # Barrier tape round the whole thing, on four posts.
    parts += _ring("Hoop", 0.40, 20, 0.04, (0, 0, 0.14), glow)
    for i in range(4):
        a = math.pi / 4 + i * math.pi / 2
        x, y = 0.40 * math.cos(a), 0.40 * math.sin(a)
        parts += [cyl(f"Stanchion{i}", 0.018, 0.14, loc=(x, y, 0.02), material=mat("charcoal"), verts=8),
                  cyl(f"StanchionFoot{i}", 0.045, 0.02, loc=(x, y, 0), material=mat("charcoal"), verts=10)]
    parent(join("autoreply_p2_4_mesh", parts), root)
    e = AR_TRAY_Z + 0.0175
    # Path 2 clamps to the front of the binders, turned to face out, so the tower does not hide it.
    _slots(root, [(xf((lx - 0.20, 0, e)), 1.0), ((bx, -0.136, e), 1.0), (xf(top), 1.0)])
    next(ch for ch in root.children if ch.name.split(".")[0] == "Slot1").rotation_euler = (0, 0, -math.pi / 2)
    return root


def tower_autoreply(tiers):
    return tower_parts("autoreply", tiers)


TOWER_PART_BUILDERS["autoreply_core"] = b_autoreply_core
for _p in range(3):
    for _t in (1, 2):
        TOWER_PART_BUILDERS[f"autoreply_m{_p}_{_t}"] = globals()[f"b_autoreply_m{_p}_{_t}"]
    for _t in (3, 4):
        TOWER_PART_BUILDERS[f"autoreply_p{_p}_{_t}"] = globals()[f"b_autoreply_p{_p}_{_t}"]


# --- artillery (tower parts)

# --- Office Artillery (7.4). A bunker of copy paper boxes with a ruler catapult on a turntable.

ART_ACCENT = "#e5534b"
ART_PATH = ("#e5534b", "#e5a04b", "#b48ce0")


def _art_steel():
    return mat("metal_light", metal=0.6, rough=0.35)


def _art_bar(name, p0, p1, w, t, material):
    """A straight bar from p0 to p1 (hoses, legs, rubber bands)."""
    dx, dy, dz = p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]
    horiz = math.hypot(dx, dy)
    ln = math.sqrt(dx * dx + dy * dy + dz * dz)
    b = box(name, (w, ln, t), loc=(p0[0], p0[1] + ln / 2, p0[2] - t / 2), material=material)
    kit.tilt(b, rx=math.atan2(dz, horiz), rz=math.atan2(-dx, dy), pivot=p0)
    return b


def _art_paperbox(pre, size, loc, band=None, band_h=0.10, lid=None, label="front", tape=None, body="cardboard"):
    """A box of copy paper standing on loc: a coloured band round the bottom, paper labels, an
    optional lid, or tape over the top (the delivery boxes of the supply drop). body: another
    colour for the box itself (the ammo crates of RAPID FIRE)."""
    w, d, h = size
    x, y, z = loc
    paper = mat("paper")
    parts = [box(f"{pre}Box", (w, d, h), loc=loc, material=mat(body), bevel=0.012)]
    if band:
        parts.append(box(f"{pre}Band", (w + 0.014, d + 0.014, band_h), loc=(x, y, z + 0.04), material=mat(band)))
    lz = z + h - h * 0.32 - 0.035
    if label == "front":
        for sy in (-1, 1):
            parts.append(box(f"{pre}Label{sy}", (w * 0.46, 0.012, h * 0.32), loc=(x, y + sy * (d / 2 + 0.003), lz), material=paper))
    elif label == "side":
        for sx in (-1, 1):
            parts.append(box(f"{pre}Label{sx}", (0.012, d * 0.46, h * 0.32), loc=(x + sx * (w / 2 + 0.003), y, lz), material=paper))
    if lid:
        parts.append(box(f"{pre}Lid", (w + 0.024, d + 0.024, 0.065), loc=(x, y, z + h - 0.05), material=mat(lid), bevel=0.01))
    if tape:
        tw = 0.11
        parts += [box(f"{pre}TapeY", (tw, d + 0.014, h + 0.007), loc=(x, y, z), material=mat(tape)),
                  box(f"{pre}TapeX", (w + 0.014, tw, h + 0.007), loc=(x, y, z), material=mat(tape))]
    return parts


def _art_stapler(pre, c, s, body, pitch=0.0, yaw=0.0, pivot=None, cap=None):
    """A desk stapler standing on c (bottom centre), nose to the front. pitch lifts the nose."""
    x, y, z = c
    steel = _art_steel()
    parts = [box(f"{pre}Base", (0.12 * s, 0.36 * s, 0.035 * s), loc=(x, y, z), material=mat("plastic_black"), bevel=0.008),
             box(f"{pre}Arm", (0.10 * s, 0.34 * s, 0.075 * s), loc=(x, y + 0.01 * s, z + 0.035 * s), material=mat(body), bevel=0.015),
             box(f"{pre}Cap", (0.105 * s, 0.25 * s, 0.035 * s), loc=(x, y - 0.035 * s, z + 0.108 * s), material=cap or steel, bevel=0.008),
             box(f"{pre}Nose", (0.09 * s, 0.05 * s, 0.05 * s), loc=(x, y - 0.165 * s, z + 0.06 * s), material=steel, bevel=0.006),
             _cylx(f"{pre}Hinge", 0.032 * s, 0.13 * s, (x, y + 0.15 * s, z + 0.075 * s), steel, verts=10)]
    if pitch or yaw:
        kit.tilt(parts, rx=-pitch, rz=yaw, pivot=pivot or (x, y + 0.15 * s, z))
    return parts


def _art_catapult(c, s=1.0):
    """Two wooden rulers taped into a Y, a fat red band and a leather pouch with a paperclip."""
    x, y, z = c
    wood, dark = mat("wood"), mat("wood_dark")
    red = mat(ART_ACCENT)
    L = 0.45 * s
    parts = [box("CatBlock", (0.20 * s, 0.11 * s, 0.07 * s), loc=(x, y, z), material=dark, bevel=0.01)]
    tips = []
    for i, side in enumerate((-1, 1)):
        a = side * 0.32
        r = [box(f"Ruler{i}", (0.075 * s, 0.026 * s, L), loc=(x, y, z + 0.03 * s), material=wood, bevel=0.006),
             box(f"Ticks{i}", (0.022 * s, 0.032 * s, L * 0.86), loc=(x - side * 0.022 * s, y, z + 0.08 * s), material=dark)]
        kit.tilt(r, ry=a, pivot=(x, y, z + 0.05 * s))
        parts += r
        tips.append((x + (L - 0.04 * s) * math.sin(a), y, z + 0.05 * s + (L - 0.04 * s) * math.cos(a)))
    parts.append(box("CatTape", (0.17 * s, 0.075 * s, 0.07 * s), loc=(x, y, z + 0.08 * s), material=red, bevel=0.008))
    pouch = (x, y + 0.17 * s, tips[0][2] - 0.13 * s)
    for i, t in enumerate(tips):
        parts.append(box(f"BandWrap{i}", (0.09 * s, 0.05 * s, 0.05 * s), loc=(t[0], t[1], t[2] - 0.025 * s), material=red))
        parts.append(_art_bar(f"Band{i}", t, (pouch[0] + (i - 0.5) * 0.08 * s, pouch[1], pouch[2]), 0.045 * s, 0.045 * s, red))
    parts += [box("Pouch", (0.12 * s, 0.07 * s, 0.09 * s), loc=(pouch[0], pouch[1], pouch[2] - 0.045 * s), material=mat("coffee"), bevel=0.01),
              box("Clip", (0.035 * s, 0.10 * s, 0.03 * s), loc=(pouch[0], pouch[1] - 0.01 * s, pouch[2] + 0.035 * s), material=_art_steel())]
    return parts


def b_artillery_core():
    root = empty("artillery_core")
    parts = _art_paperbox("Low", (0.66, 0.56, 0.30), (0, 0, 0), band=ART_ACCENT)
    # The top box turned a quarter: its labels are on the sides.
    parts += _art_paperbox("Up", (0.42, 0.48, 0.20), (0, 0, 0.30), label="side", lid=ART_ACCENT)
    parts += [cyl("Turntable", 0.20, 0.05, loc=(0, 0, 0.55), material=_art_steel(), verts=14, bevel=0.01),
              cyl("TurnHub", 0.08, 0.02, loc=(0, -0.06, 0.60), material=mat("charcoal"), verts=10)]
    parts += _art_catapult((0, 0.09, 0.60))
    ob = join("artillery_core_mesh", parts)
    parent(ob, root)
    _slots(root, [((0, -0.07, 0.60), 1.0), ((0.325, -0.06, 0), 1.0), ((-0.25, 0.20, 0.30), 1.0)])
    return root


# Modules. HEAVY DUTY is the weapon at the front of the turntable, RAPID FIRE the ammunition at
# the right flank (built outwards from its origin, +X), PRECISION a pole at the left back.

def b_artillery_m0_1():
    root = empty("artillery_m0_1")
    parts = _art_stapler("St", (0, -0.10, 0), 1.0, ART_PATH[0])
    parent(join("artillery_m0_1_mesh", parts), root)
    return root


def b_artillery_m0_2():
    root = empty("artillery_m0_2")
    steel = _art_steel()
    s = 1.38
    parts = _art_stapler("St", (0, -0.15, 0), s, ART_PATH[0], cap=steel)
    # A full metal hood and a lever standing up: heavy duty.
    parts += [box("Hood", (0.15, 0.30, 0.05), loc=(0, -0.17, 0.165), material=steel, bevel=0.012),
              _art_bar("LeverL", (-0.085, 0.04, 0.12), (-0.085, -0.10, 0.29), 0.03, 0.03, mat("charcoal")),
              _art_bar("LeverR", (0.085, 0.04, 0.12), (0.085, -0.10, 0.29), 0.03, 0.03, mat("charcoal")),
              _cylx("Grip", 0.035, 0.22, (0, -0.10, 0.29), mat(ART_PATH[0]), verts=10)]
    parent(join("artillery_m0_2_mesh", parts), root)
    return root


def _art_spring(pre, c, r, n, ring_h=0.03, gap=0.022):
    """An orange coil spring standing on c: rings round a dark core."""
    x, y, z = c
    o = mat(ART_PATH[1])
    parts = [cyl(f"{pre}Core", r * 0.6, n * (ring_h + gap), loc=(x, y, z), material=mat("charcoal"), verts=10)]
    for i in range(n):
        parts.append(cyl(f"{pre}Ring{i}", r, ring_h, loc=(x, y, z + gap / 2 + i * (ring_h + gap)), material=o, verts=12))
    parts.append(cyl(f"{pre}Plate", r * 1.05, 0.02, loc=(x, y, z + n * (ring_h + gap)), material=_art_steel(), verts=12))
    return parts


def b_artillery_m1_1():
    root = empty("artillery_m1_1")
    o = mat(ART_PATH[1])
    paper = mat("paper")
    parts = [box("StapleBox", (0.15, 0.24, 0.14), loc=(0.08, 0, 0), material=o, bevel=0.012),
             box("LabelS", (0.155, 0.11, 0.06), loc=(0.08, -0.03, 0.04), material=paper),
             box("LabelF", (0.09, 0.245, 0.06), loc=(0.08, 0, 0.04), material=paper),
             box("Strip", (0.05, 0.18, 0.03), loc=(0.08, 0.0, 0.14), material=_art_steel())]
    parts += _art_spring("Spring", (0.08, 0.0, 0.14), 0.068, 4, ring_h=0.045, gap=0.03)
    parent(join("artillery_m1_1_mesh", parts), root)
    return root


def b_artillery_m1_2():
    root = empty("artillery_m1_2")
    o = mat(ART_PATH[1])
    steel = _art_steel()
    char = mat("charcoal")
    parts = [box("Rack", (0.15, 0.40, 0.34), loc=(0.08, 0, 0), material=o, bevel=0.015),
             box("RackFoot", (0.16, 0.42, 0.04), loc=(0.08, 0, 0), material=char),
             box("RackPanel", (0.012, 0.30, 0.18), loc=(0.155, 0, 0.08), material=char),
             box("RackPanelF", (0.11, 0.012, 0.18), loc=(0.08, -0.203, 0.08), material=char)]
    # The feed chute climbs to the back, two rows of staple strips on it, a spring pushing them.
    chute = [box("Chute", (0.16, 0.44, 0.03), loc=(0.08, 0, 0.40), material=o, bevel=0.008),
             box("RailL", (0.02, 0.44, 0.06), loc=(0.005, 0, 0.40), material=char),
             box("RailR", (0.02, 0.44, 0.06), loc=(0.155, 0, 0.40), material=char)]
    for row, x in enumerate((0.045, 0.115)):
        for k in range(3):
            chute.append(box(f"Strip{row}{k}", (0.055, 0.11, 0.045), loc=(x, -0.14 + k * 0.125, 0.43), material=steel))
    chute += [box("Pusher", (0.15, 0.04, 0.10), loc=(0.08, 0.20, 0.43), material=char)]
    kit.tilt(chute, rx=0.36, pivot=(0.08, 0, 0.40))
    parts += chute
    parts += [box("PostF", (0.05, 0.05, 0.06), loc=(0.08, -0.15, 0.34), material=char),
              box("PostB", (0.05, 0.05, 0.14), loc=(0.08, 0.15, 0.34), material=char)]
    parent(join("artillery_m1_2_mesh", parts), root)
    return root


def _art_glasses(pre, c, r=0.075, frame=None, lens=None):
    """Giant reading glasses facing the front, the bridge on c, arms going back."""
    x, y, z = c
    frame = frame or mat(ART_PATH[2])
    lens = lens or mat("window", rough=0.15, alpha=0.5)
    parts = []
    for i, sx in enumerate((-1, 1)):
        lx = x + sx * (r + 0.012)
        parts += _ring(f"{pre}Rim{i}", r, 10, 0.034, (lx, y, z), frame, axis="y")
        parts.append(_cyly(f"{pre}Lens{i}", r * 0.92, 0.01, (lx, y, z), lens, verts=10))
        parts.append(box(f"{pre}Arm{i}", (0.02, 0.17, 0.022), loc=(x + sx * (2 * r + 0.015), y + 0.085, z - 0.011), material=frame))
    parts.append(box(f"{pre}Bridge", (0.06, 0.026, 0.025), loc=(x, y, z + 0.01), material=frame))
    return parts


def b_artillery_m2_1():
    root = empty("artillery_m2_1")
    p = mat(ART_PATH[2])
    parts = [cyl("Foot", 0.065, 0.03, loc=(0, 0, 0), material=mat("charcoal"), verts=10),
             cyl("Pole", 0.026, 0.79, loc=(0, 0, 0.03), material=p, verts=8)]
    parts += _art_glasses("Gl", (0, -0.02, 0.80))
    parent(join("artillery_m2_1_mesh", parts), root)
    return root


def b_artillery_m2_2():
    root = empty("artillery_m2_2")
    p = mat(ART_PATH[2])
    glow = mat(ART_PATH[2], emit=1.2)
    parts = [cyl("Foot", 0.065, 0.03, loc=(0, 0, 0), material=mat("charcoal"), verts=10),
             cyl("Pole", 0.026, 0.79, loc=(0, 0, 0.03), material=p, verts=8),
             box("Saddle", (0.20, 0.08, 0.04), loc=(0, -0.02, 0.80), material=mat("charcoal"))]
    # Binoculars: two purple tubes, glowing lenses at the front.
    for i, sx in enumerate((-1, 1)):
        parts += [_cyly(f"Tube{i}", 0.055, 0.30, (sx * 0.065, -0.04, 0.895), p, verts=10),
                  _cyly(f"Lens{i}", 0.06, 0.02, (sx * 0.065, -0.195, 0.895), glow, verts=10),
                  _cyly(f"Eye{i}", 0.04, 0.05, (sx * 0.065, 0.13, 0.895), mat("charcoal"), verts=8)]
    # A small target on the pole: you see where to hit.
    parts += [_cyly("Target", 0.095, 0.02, (0, -0.035, 0.46), mat("paper"), verts=12),
              _cyly("TargetRing", 0.065, 0.02, (0, -0.042, 0.46), p, verts=12),
              _cyly("TargetEye", 0.03, 0.02, (0, -0.049, 0.46), mat("paper"), verts=8)]
    parent(join("artillery_m2_2_mesh", parts), root)
    return root


# Heroes. Every one keeps the paper boxes; slots move to wherever there is room on them.

def b_artillery_p0_3():
    """Industrial Tacker: three boxes stepped up, a big red tacker in a turning bracket on top, a
    hose to an air can lying on the front step."""
    root = empty("artillery_p0_3")
    red = ART_PATH[0]
    redm = mat(red)
    steel = _art_steel()
    char = mat("charcoal")
    parts = _art_paperbox("B1", (0.72, 0.58, 0.28), (0, 0, 0), band=red, band_h=0.12)
    parts += _art_paperbox("B2", (0.52, 0.42, 0.24), (0, 0.06, 0.28), band=red, band_h=0.10, label="side")
    parts += _art_paperbox("B3", (0.38, 0.34, 0.18), (0, 0.08, 0.52), lid=red, label="none")
    # The air can on the front step.
    parts += [_cylx("Can", 0.065, 0.32, (-0.02, -0.215, 0.345), redm, verts=12),
              _cylx("CanCap", 0.045, 0.05, (0.16, -0.215, 0.345), steel, verts=10),
              cyl("CanValve", 0.025, 0.05, loc=(0.0, -0.215, 0.40), material=char, verts=8)]
    # Bracket and tacker.
    z0 = 0.75
    parts += [cyl("Turn", 0.16, 0.04, loc=(0, 0.08, z0 - 0.04), material=steel, verts=14),
              box("YokeL", (0.035, 0.12, 0.22), loc=(-0.115, 0.06, z0), material=char, bevel=0.008),
              box("YokeR", (0.035, 0.12, 0.22), loc=(0.115, 0.06, z0), material=char, bevel=0.008)]
    axle = (0, 0.06, z0 + 0.16)
    gun = [box("Body", (0.18, 0.60, 0.18), loc=(0, -0.02, z0 + 0.08), material=redm, bevel=0.025),
           box("Mag", (0.12, 0.50, 0.05), loc=(0, -0.05, z0 + 0.04), material=char, bevel=0.008),
           box("Nose", (0.13, 0.10, 0.15), loc=(0, -0.36, z0 + 0.06), material=steel, bevel=0.01),
           box("PostF", (0.05, 0.05, 0.10), loc=(0, -0.16, z0 + 0.25), material=char),
           box("PostB", (0.05, 0.05, 0.10), loc=(0, 0.16, z0 + 0.25), material=char),
           box("Handle", (0.10, 0.42, 0.07), loc=(0, 0.0, z0 + 0.34), material=redm, bevel=0.015),
           box("HandleGrip", (0.105, 0.16, 0.075), loc=(0, 0.12, z0 + 0.338), material=mat("plastic_black"), bevel=0.01),
           _cylx("Axle", 0.04, 0.27, axle, steel, verts=10)]
    kit.tilt(gun, rx=0.12, pivot=axle)
    parts += gun
    parts += [_art_bar("Hose0", (0.17, -0.215, 0.36), (0.30, -0.12, 0.52), 0.04, 0.04, char),
              _art_bar("Hose1", (0.30, -0.12, 0.52), (0.215, 0.02, 0.80), 0.04, 0.04, char),
              _art_bar("Hose2", (0.215, 0.02, 0.80), (0.10, 0.26, 0.92), 0.04, 0.04, char)]
    parent(join("artillery_p0_3_mesh", parts), root)
    _slots(root, [(axle, 1.0), ((0.36, -0.06, 0), 1.0), ((-0.31, 0.18, 0.28), 1.0)])
    return root


def b_artillery_p0_4():
    """Nail Gun: a giant nail gun on a tripod with a yellow drum, a red compressor tank behind it
    on a striped steel plate, a warning light on top."""
    root = empty("artillery_p0_4")
    red = ART_PATH[0]
    redm = mat(red)
    steel = _art_steel()
    char = mat("charcoal")
    yel = mat("yellow")
    parts = [box("Plate", (0.78, 0.60, 0.10), material=redm, bevel=0.015)]
    # Yellow and black hazard stripes round the plate.
    for side, sy in enumerate((-1, 1)):
        for k in range(7):
            parts.append(box(f"Haz{side}{k}", (0.10, 0.012, 0.06), loc=(-0.33 + k * 0.11, sy * 0.303, 0.02), material=yel if k % 2 == 0 else char))
    for side, sx in enumerate((-1, 1)):
        for k in range(5):
            parts.append(box(f"HazS{side}{k}", (0.012, 0.11, 0.06), loc=(sx * 0.393, -0.24 + k * 0.12, 0.02), material=yel if k % 2 == 0 else char))
    # The compressor tank across the back.
    parts += [box("CradleL", (0.06, 0.22, 0.10), loc=(-0.20, 0.15, 0.10), material=char),
              box("CradleR", (0.06, 0.22, 0.10), loc=(0.20, 0.15, 0.10), material=char),
              _cylx("Tank", 0.14, 0.60, (0, 0.15, 0.30), redm, verts=14),
              _cylx("TankBandA", 0.145, 0.05, (-0.16, 0.15, 0.30), yel, verts=14),
              _cylx("TankBandB", 0.145, 0.05, (0.16, 0.15, 0.30), char, verts=14),
              _cylx("TankEndL", 0.10, 0.04, (-0.315, 0.15, 0.30), steel, verts=12),
              _cylx("TankEndR", 0.10, 0.04, (0.315, 0.15, 0.30), steel, verts=12),
              cyl("GaugeStem", 0.025, 0.06, loc=(0.0, 0.15, 0.43), material=steel, verts=8),
              _cyly("Gauge", 0.075, 0.04, (0.0, 0.13, 0.53), mat("paper"), verts=12),
              _cyly("GaugeRim", 0.085, 0.03, (0.0, 0.155, 0.53), char, verts=12),
              box("Needle", (0.012, 0.012, 0.06), loc=(0.01, 0.108, 0.53), material=redm)]
    # The tripod.
    hub = (0, -0.10, 0.74)
    for i, (fx, fy) in enumerate(((-0.28, -0.04), (0.28, -0.04), (0, -0.27))):
        parts.append(_art_bar(f"Leg{i}", (fx, fy, 0.10), hub, 0.035, 0.035, steel))
        parts.append(box(f"LegFoot{i}", (0.07, 0.07, 0.02), loc=(fx, fy, 0.10), material=char))
    parts.append(cyl("Hub", 0.08, 0.08, loc=(hub[0], hub[1], hub[2] - 0.04), material=char, verts=10))
    # The nail gun, nose slightly up.
    z0 = hub[2] + 0.04
    pivot = (0, -0.10, z0)
    gun = [box("Body", (0.20, 0.58, 0.22), loc=(0, -0.07, z0), material=redm, bevel=0.03),
           box("Top", (0.21, 0.50, 0.06), loc=(0, -0.06, z0 + 0.22), material=char, bevel=0.01),
           _cyly("Barrel", 0.06, 0.08, (0, -0.40, z0 + 0.10), steel, verts=12),
           _cyly("Muzzle", 0.045, 0.03, (0, -0.455, z0 + 0.10), mat(red, emit=1.4), verts=10),
           box("Grip", (0.09, 0.10, 0.20), loc=(0, 0.17, z0 - 0.12), material=mat("plastic_black"), bevel=0.01),
           _cylx("Drum", 0.16, 0.10, (0.16, -0.14, z0 + 0.06), yel, verts=14),
           _cylx("DrumHub", 0.08, 0.11, (0.165, -0.14, z0 + 0.06), char, verts=10)]
    for k in range(4):
        gun.append(box(f"Stripe{k}", (0.215, 0.06, 0.065), loc=(0, -0.24 + k * 0.12, z0 + 0.218), material=yel if k % 2 == 0 else char))
    gun += [cyl("Mast", 0.022, 0.30, loc=(0, 0.06, z0 + 0.28), material=steel, verts=8),
            cyl("BeaconBase", 0.06, 0.03, loc=(0, 0.06, z0 + 0.56), material=char, verts=10),
            cyl("Beacon", 0.055, 0.10, loc=(0, 0.06, z0 + 0.59), material=mat(red, emit=1.5), verts=10),
            cyl("BeaconCap", 0.04, 0.03, loc=(0, 0.06, z0 + 0.69), material=char, verts=10)]
    kit.tilt(gun, rx=0.08, pivot=pivot)
    parts += gun
    parts += [_art_bar("Hose0", (-0.06, 0.15, 0.44), (-0.12, 0.10, 0.60), 0.04, 0.04, char),
              _art_bar("Hose1", (-0.12, 0.10, 0.60), (-0.05, 0.16, z0 + 0.04), 0.04, 0.04, char)]
    parent(join("artillery_p0_4_mesh", parts), root)
    _slots(root, [(pivot, 1.0), ((0.39, -0.12, 0), 1.0), ((-0.34, -0.18, 0.10), 1.0)])
    return root


def b_artillery_p1_3():
    """Staple Spray: three orange staplers fanned out on one turning foot, an ammo belt feeding
    the middle one."""
    root = empty("artillery_p1_3")
    orange = ART_PATH[1]
    om = mat(orange)
    steel = _art_steel()
    char = mat("charcoal")
    parts = _art_paperbox("B1", (0.68, 0.56, 0.30), (0, 0, 0), band=orange, band_h=0.12, body="charcoal")
    parts += [cyl("Foot", 0.21, 0.36, loc=(0, 0.02, 0.30), material=om, verts=14, bevel=0.01),
              cyl("FootRing", 0.215, 0.05, loc=(0, 0.02, 0.38), material=char, verts=14),
              cyl("Turn", 0.25, 0.04, loc=(0, 0.02, 0.66), material=steel, verts=14, bevel=0.008)]
    pv = (0, 0.30, 0.74)
    fan = [box("FanPlate", (0.62, 0.36, 0.04), loc=(0, 0.0, 0.70), material=om, bevel=0.01)]
    for i, a in enumerate((0.5, 0.0, -0.5)):
        fan += _art_stapler(f"S{i}", (0, pv[1] - 0.36, pv[2]), 1.2, orange, yaw=a, pivot=pv)
    kit.tilt(fan, rx=-0.12, pivot=pv)
    parts += fan
    parts += [box("FanProp", (0.20, 0.10, 0.05), loc=(0, -0.10, 0.70), material=char),
              box("Hub", (0.26, 0.20, 0.26), loc=(0, 0.20, 0.70), material=char, bevel=0.015),
              box("Can", (0.22, 0.18, 0.15), loc=(0, 0.20, 0.96), material=om, bevel=0.012),
              box("CanLid", (0.23, 0.19, 0.03), loc=(0, 0.20, 1.11), material=char)]
    # The belt: out of the can, over the top, into the middle stapler.
    belt = [(0, 0.13, 1.12), (0, 0.04, 1.20), (0, -0.06, 1.13), (0, -0.10, 0.97)]
    for k in range(len(belt) - 1):
        a_, b_ = belt[k], belt[k + 1]
        d = [b_[j] - a_[j] for j in range(3)]
        n = math.sqrt(sum(v * v for v in d))
        e = [v / n * 0.015 for v in d]
        parts.append(_art_bar(f"Belt{k}", [a_[j] - e[j] for j in range(3)], [b_[j] + e[j] for j in range(3)], 0.10, 0.035, om if k % 2 == 0 else steel))
    parent(join("artillery_p1_3_mesh", parts), root)
    _slots(root, [((-0.29, -0.04, 0.30), 0.8), ((0.34, -0.06, 0), 1.0), ((-0.30, 0.20, 0.30), 1.0)])
    return root


def b_artillery_p1_4():
    """Auto Stapler: a gatling of six steel barrels on an orange electric body, a cable, an orange
    light on top, a belt of staples from an open box."""
    root = empty("artillery_p1_4")
    orange = ART_PATH[1]
    om = mat(orange)
    steel = _art_steel()
    char = mat("charcoal")
    parts = _art_paperbox("B1", (0.74, 0.60, 0.26), (0, 0, 0), band=orange, band_h=0.11, body="charcoal")
    gx = -0.05
    parts += [box("Body", (0.34, 0.46, 0.32), loc=(gx, 0.04, 0.26), material=om, bevel=0.03),
              box("VentL", (0.012, 0.28, 0.16), loc=(gx - 0.172, 0.04, 0.33), material=char),
              box("VentB", (0.24, 0.012, 0.16), loc=(gx, 0.272, 0.33), material=char),
              box("YokeL", (0.04, 0.16, 0.16), loc=(gx - 0.15, 0.0, 0.58), material=char),
              box("YokeR", (0.04, 0.16, 0.16), loc=(gx + 0.15, 0.0, 0.58), material=char)]
    ax = (gx, 0.0, 0.80)
    gun = [_cyly("Motor", 0.15, 0.26, (gx, 0.11, ax[2]), om, verts=14),
           _cyly("MotorCap", 0.10, 0.04, (gx, 0.26, ax[2]), char, verts=12),
           _cyly("ClampA", 0.13, 0.04, (gx, -0.06, ax[2]), char, verts=12),
           _cyly("ClampB", 0.13, 0.04, (gx, -0.32, ax[2]), char, verts=12),
           _cyly("Spindle", 0.04, 0.42, (gx, -0.18, ax[2]), char, verts=8)]
    for k in range(6):
        a = 2 * math.pi * k / 6
        gun.append(_cyly(f"Barrel{k}", 0.034, 0.44, (gx + 0.085 * math.cos(a), -0.19, ax[2] + 0.085 * math.sin(a)), steel, verts=8))
    gun += [cyl("Mast", 0.022, 0.38, loc=(gx, 0.14, ax[2] + 0.14), material=steel, verts=8),
            cyl("BeaconBase", 0.065, 0.03, loc=(gx, 0.14, ax[2] + 0.52), material=char, verts=10),
            cyl("Beacon", 0.06, 0.11, loc=(gx, 0.14, ax[2] + 0.55), material=mat(orange, emit=1.5), verts=10),
            cyl("BeaconCap", 0.045, 0.03, loc=(gx, 0.14, ax[2] + 0.66), material=char, verts=10)]
    kit.tilt(gun, rx=0.10, pivot=ax)
    parts += gun
    # The open box of staples at the front right, the belt climbing to the gun.
    bx, by, bz = 0.245, -0.17, 0.26
    parts += [box("OpenFloor", (0.21, 0.20, 0.02), loc=(bx, by, bz), material=mat("cardboard")),
              box("OpenF", (0.21, 0.015, 0.14), loc=(bx, by - 0.093, bz), material=mat("cardboard")),
              box("OpenB", (0.21, 0.015, 0.14), loc=(bx, by + 0.093, bz), material=mat("cardboard")),
              box("OpenL", (0.015, 0.20, 0.14), loc=(bx - 0.098, by, bz), material=mat("cardboard")),
              box("OpenR", (0.015, 0.20, 0.14), loc=(bx + 0.098, by, bz), material=mat("cardboard")),
              box("Flap", (0.21, 0.10, 0.012), loc=(bx, by - 0.15, bz + 0.13), material=mat("cardboard")),
              box("Staples", (0.18, 0.17, 0.09), loc=(bx, by, bz + 0.02), material=steel)]
    belt = [(bx, by, bz + 0.12), (bx - 0.02, by + 0.06, 0.52), (0.12, -0.06, 0.68), (0.06, -0.04, 0.80)]
    for k in range(len(belt) - 1):
        parts.append(_art_bar(f"Belt{k}", belt[k], belt[k + 1], 0.07, 0.035, om if k % 2 else steel))
    # The cable from the back of the body to a plug on the floor box.
    parts += [_art_bar("Cable0", (gx + 0.10, 0.27, 0.40), (0.20, 0.31, 0.30), 0.03, 0.03, mat("plastic_black")),
              _art_bar("Cable1", (0.20, 0.31, 0.30), (0.30, 0.31, 0.05), 0.03, 0.03, mat("plastic_black")),
              box("Plug", (0.06, 0.04, 0.06), loc=(0.30, 0.31, 0.0), material=om)]
    parent(join("artillery_p1_4_mesh", parts), root)
    _slots(root, [((-0.30, -0.06, 0.26), 0.8), ((0.37, -0.06, 0), 1.0), ((-0.31, 0.20, 0.26), 1.0)])
    return root


def _art_register(c, purple):
    """A purple cash register on c, keys sloping to the front, a receipt roll at the back."""
    x, y, z = c
    pm = mat(purple)
    keys = [box("RegKeys", (0.24, 0.16, 0.06), loc=(x, y - 0.07, z + 0.12), material=mat("charcoal"), bevel=0.01)]
    for i in range(3):
        for j in range(2):
            keys.append(box(f"Key{i}{j}", (0.05, 0.05, 0.02), loc=(x - 0.07 + i * 0.07, y - 0.10 + j * 0.065, z + 0.18), material=mat("paper")))
    kit.tilt(keys, rx=0.25, pivot=(x, y, z + 0.12))
    parts = [box("RegBody", (0.28, 0.32, 0.13), loc=(x, y, z), material=pm, bevel=0.015),
             box("RegDrawer", (0.29, 0.02, 0.06), loc=(x, y - 0.16, z + 0.03), material=mat("charcoal")),
             box("RegBack", (0.26, 0.12, 0.17), loc=(x, y + 0.10, z + 0.12), material=pm, bevel=0.012),
             box("RegScreen", (0.20, 0.10, 0.10), loc=(x, y + 0.10, z + 0.29), material=pm, bevel=0.01),
             box("RegDisplay", (0.16, 0.012, 0.06), loc=(x, y + 0.046, z + 0.31), material=mat(purple, emit=1.2)),
             box("RegDisplayB", (0.16, 0.012, 0.06), loc=(x, y + 0.154, z + 0.31), material=mat(purple, emit=1.2)),
             _cylx("Roll", 0.05, 0.14, (x, y + 0.03, z + 0.25), mat("paper"), verts=10)] + keys
    return parts


def b_artillery_p2_3():
    """Expense the Staples: a stapler with a long scope on a post, a purple cash register beside it,
    its receipt hanging down over the boxes."""
    root = empty("artillery_p2_3")
    purple = ART_PATH[2]
    pm = mat(purple)
    steel = _art_steel()
    char = mat("charcoal")
    parts = _art_paperbox("B1", (0.70, 0.58, 0.30), (0, 0, 0), band=purple, band_h=0.12)
    ux = -0.15
    parts += _art_paperbox("B2", (0.38, 0.46, 0.24), (ux, 0.04, 0.30), lid=purple, label="side")
    parts += [cyl("Post", 0.05, 0.30, loc=(ux, 0.14, 0.59), material=pm, verts=10),
              cyl("Turn", 0.12, 0.03, loc=(ux, 0.14, 0.89), material=steel, verts=12)]
    pv = (ux, 0.14, 0.92)
    gun = _art_stapler("St", (ux, 0.08, 0.92), 1.25, purple, cap=steel)
    gun += [box("RiserF", (0.03, 0.03, 0.08), loc=(ux, -0.05, 1.10), material=char),
            box("RiserB", (0.03, 0.03, 0.08), loc=(ux, 0.16, 1.10), material=char),
            _cyly("Scope", 0.045, 0.50, (ux, 0.02, 1.20), pm, verts=10),
            _cyly("ScopeFront", 0.065, 0.10, (ux, -0.25, 1.20), pm, verts=10, r2=0.045),
            _cyly("ScopeLens", 0.058, 0.01, (ux, -0.30, 1.20), mat(purple, emit=1.2), verts=10),
            _cyly("ScopeEye", 0.05, 0.05, (ux, 0.29, 1.20), char, verts=10),
            _cylx("ScopeKnob", 0.025, 0.12, (ux, 0.04, 1.20), char, verts=8)]
    kit.tilt(gun, rx=-0.06, pivot=pv)
    parts += gun
    rx_, ry_ = 0.20, -0.08
    parts += _art_register((rx_, ry_, 0.30), purple)
    # The receipt: out of the front, over the edge, down the box. Very long. Expensed.
    paper = mat("paper")
    parts += [box("Receipt0", (0.09, 0.14, 0.008), loc=(rx_, ry_ - 0.22, 0.30), material=paper),
              box("Receipt1", (0.09, 0.008, 0.26), loc=(rx_, -0.297, 0.04), material=paper),
              box("ReceiptCurl", (0.09, 0.05, 0.03), loc=(rx_, -0.30, 0.03), material=paper)]
    parent(join("artillery_p2_3_mesh", parts), root)
    _slots(root, [((ux, -0.06, 0.59), 0.8), ((0.35, -0.06, 0), 1.0), ((0.25, 0.20, 0.30), 1.0)])
    return root


def b_artillery_p2_4():
    """Supply Drop: a long gun with a scope on delivery boxes, and behind it a parcel under a
    purple and white parachute on a stick, a light on top."""
    root = empty("artillery_p2_4")
    purple = ART_PATH[2]
    pm = mat(purple)
    white = mat("plastic_white")
    steel = _art_steel()
    char = mat("charcoal")
    parts = _art_paperbox("B1", (0.72, 0.58, 0.30), (0, 0, 0), label="none", tape=purple)
    parts += _art_paperbox("B2", (0.44, 0.44, 0.26), (0, 0.02, 0.30), label="none", tape=purple)
    parts += [cyl("Turn", 0.18, 0.04, loc=(0, -0.02, 0.56), material=steel, verts=14)]
    pv = (0, 0.0, 0.62)
    gun = [box("Housing", (0.18, 0.30, 0.16), loc=(0, 0.0, 0.60), material=pm, bevel=0.02),
           _cyly("Barrel", 0.042, 0.28, (0, -0.29, 0.69), steel, verts=10),
           _cyly("Brake", 0.06, 0.07, (0, -0.44, 0.69), char, verts=10),
           box("RiserF", (0.03, 0.03, 0.06), loc=(0, -0.07, 0.76), material=char),
           box("RiserB", (0.03, 0.03, 0.06), loc=(0, 0.07, 0.76), material=char),
           _cyly("Scope", 0.04, 0.34, (0, 0.0, 0.85), pm, verts=10),
           _cyly("ScopeLens", 0.05, 0.02, (0, -0.18, 0.85), mat(purple, emit=1.3), verts=10)]
    kit.tilt(gun, rx=0.10, pivot=pv)
    parts += gun
    # The stick, the parcel and the parachute.
    sx, sy = 0.15, 0.09
    parts += [cyl("Stick", 0.022, 1.12, loc=(sx, sy, 0.56), material=steel, verts=8)]
    parts += _art_paperbox("Parcel", (0.17, 0.17, 0.15), (sx, sy, 1.16), label="none", tape=purple)
    parts += [cyl("ChuteRim", 0.22, 0.07, loc=(sx, sy, 1.44), material=pm, verts=12, radius_top=0.185),
              cyl("ChuteMid", 0.185, 0.08, loc=(sx, sy, 1.51), material=white, verts=12, radius_top=0.12),
              cyl("ChuteTop", 0.12, 0.06, loc=(sx, sy, 1.59), material=pm, verts=12, radius_top=0.04),
              ball("Light", 0.06, loc=(sx, sy, 1.66), material=mat(purple, emit=1.5))]
    for i, (dx, dy) in enumerate(((-0.20, 0), (0.20, 0), (0, -0.20), (0, 0.20))):
        parts.append(_art_bar(f"Line{i}", (sx + dx, sy + dy, 1.44), (sx + dx * 0.3, sy + dy * 0.3, 1.31), 0.014, 0.014, white))
    parent(join("artillery_p2_4_mesh", parts), root)
    _slots(root, [((-0.30, -0.04, 0.30), 0.8), ((0.36, -0.06, 0), 1.0), (pv, 1.0)])
    return root


def tower_artillery(tiers):
    return tower_parts("artillery", tiers)


TOWER_PART_BUILDERS["artillery_core"] = b_artillery_core
for _p in range(3):
    for _t in (1, 2):
        TOWER_PART_BUILDERS[f"artillery_m{_p}_{_t}"] = globals()[f"b_artillery_m{_p}_{_t}"]
    for _t in (3, 4):
        TOWER_PART_BUILDERS[f"artillery_p{_p}_{_t}"] = globals()[f"b_artillery_p{_p}_{_t}"]


# --- shredder (tower parts)

# --- The Shredder (7.5). A free-standing black bin with a teal cutting head; the block with a slot
# is the silhouette. Slot0 (CROSS-CUT) on top of the head, over the feed slot. Slot1 (PAPER JAM)
# on the floor at the front face: its module reaches up to the feed slot, SH_FEED_Z high and
# SH_FEED_Y behind the slot, so every body that carries it keeps its feed slot there (a hero
# scales the slot to match its own feed height). Slot2 (CONFIDENTIAL) on the floor at the right
# flank, growing towards +X.

SH_ACCENT = "teal"
SH_PATH = ("teal", "#e5a04b", "#7fb6e3")
SH_FEED_Z = 0.76
SH_FEED_Y = 0.23


def _sh_mats():
    """The shredder's materials, one call per look so a combination stays within 12."""
    return {
        "black": mat("plastic_black"),
        "char": mat("charcoal"),
        "teal": mat(SH_ACCENT, rough=0.5),
        "red": mat("red", rough=0.45),
        "steel": mat("metal_light", metal=0.8, rough=0.25),
        "paper": mat("paper"),
        "glass": mat("window", rough=0.1),
        "orange": mat(SH_PATH[1], rough=0.4),
        "lamp": mat(SH_PATH[1], emit=1.6),
        "blue": mat(SH_PATH[2], rough=0.6),
        "yellow": mat("yellow"),
        "card": mat("cardboard"),
        "white": mat("plastic_white", rough=0.5),
    }


def _sh_window(pre, w, h, y, z0, fill=(0.6, 0.8, 0.7, 0.9, 0.65, 0.85, 0.75, 0.6, 0.8)):
    """A window in a front face at y with shredded strips standing in it, cut to different
    heights: the bin is filling up."""
    m = _sh_mats()
    parts = [box(f"{pre}Window", (w, 0.012, h), loc=(0, y, z0), material=m["glass"])]
    n = len(fill)
    for i, f in enumerate(fill):
        x = -w / 2 + w * (i + 0.5) / n
        parts.append(box(f"{pre}Strip{i}", (w / n * 0.55, 0.014, h * f * 0.9), loc=(x, y - 0.002, z0 + 0.012), material=m["paper"]))
    return parts


def _sh_bang(pre, c, s, mt, axis="y"):
    """A "!" of two blocks on a face: facing -Y (axis y) or +X (axis x)."""
    x, y, z = c
    if axis == "y":
        return [box(f"{pre}Bar", (0.035 * s, 0.012, 0.09 * s), loc=(x, y, z + 0.05 * s), material=mt),
                box(f"{pre}Dot", (0.035 * s, 0.012, 0.03 * s), loc=(x, y, z), material=mt)]
    return [box(f"{pre}Bar", (0.012, 0.035 * s, 0.09 * s), loc=(x, y, z + 0.05 * s), material=mt),
            box(f"{pre}Dot", (0.012, 0.035 * s, 0.03 * s), loc=(x, y, z), material=mt)]


def _sh_crumple(name, x, y, z, r=0.06):
    return ball(name, r, loc=(x, y, max(z, r * 0.86)), material=_sh_mats()["paper"], subdiv=1, scale=(1.1, 0.95, 0.85))


def _sh_lock(pre, x, y, z, s=1.0):
    """A padlock hanging on a face that looks at -Y."""
    m = _sh_mats()
    return [box(f"{pre}Shackle", (0.06 * s, 0.018 * s, 0.06 * s), loc=(x, y + 0.004, z + 0.065 * s), material=m["steel"]),
            box(f"{pre}Body", (0.09 * s, 0.035 * s, 0.08 * s), loc=(x, y, z), material=m["yellow"], bevel=0.006 * s)]


def b_shredder_core():
    """The office shredder, a size up from shredder_2: a black bin with a window full of strips,
    a teal cutting head with a sheet half in the slot, a green ready light."""
    root = empty("shredder_core")
    m = _sh_mats()
    parts = [box("Foot", (0.54, 0.46, 0.05), material=m["teal"], bevel=0.01),
             box("Bin", (0.52, 0.44, 0.58), loc=(0, 0, 0.02), material=m["black"], bevel=0.02),
             box("Seam", (0.535, 0.455, 0.025), loc=(0, 0, 0.575), material=m["char"]),
             box("Head", (0.54, 0.46, 0.18), loc=(0, 0, 0.58), material=m["teal"], bevel=0.02),
             box("Slot", (0.38, 0.03, 0.012), loc=(0, 0, 0.756), material=m["black"]),
             box("Sheet", (0.26, 0.006, 0.26), loc=(0, 0, 0.68), material=m["paper"]),
             box("Led", (0.045, 0.045, 0.015), loc=(-0.20, -0.17, 0.758), material=mat("plant", emit=2.0)),
             box("Switch", (0.08, 0.02, 0.05), loc=(-0.17, -0.232, 0.64), material=m["black"])]
    parts += _sh_window("Front", 0.36, 0.30, -0.222, 0.12)
    # Teal side panels with a grip, so the flanks are not bare black.
    for side, sx in (("L", -1), ("R", 1)):
        parts += [box(f"Panel{side}", (0.012, 0.32, 0.34), loc=(sx * 0.262, 0, 0.12), material=m["teal"]),
                  box(f"Grip{side}", (0.014, 0.18, 0.04), loc=(sx * 0.263, 0, 0.50), material=m["char"])]
    # The back: a vent, a teal stripe and the power cable down to a plug on the floor.
    for k in range(4):
        parts.append(box(f"Vent{k}", (0.30, 0.012, 0.025), loc=(-0.04, 0.222, 0.20 + k * 0.06), material=m["char"]))
    parts += [box("BackStripe", (0.535, 0.012, 0.05), loc=(0, 0.222, 0.47), material=m["teal"]),
              box("Cable", (0.025, 0.025, 0.14), loc=(0.17, 0.235, 0.0), material=m["black"]),
              box("CableRun", (0.025, 0.08, 0.025), loc=(0.17, 0.275, 0.0), material=m["black"]),
              box("Plug", (0.06, 0.05, 0.045), loc=(0.17, 0.32, 0.0), material=m["char"])]
    parent(join("shredder_core_mesh", parts), root)
    _slots(root, [((0, 0, SH_FEED_Z), 1.0), ((0, -SH_FEED_Y, 0), 1.0), ((0.275, -0.06, 0), 1.0)])
    return root


# Modules. Slot0 sits on the head top, centred on the feed slot. The sheet in the slot (and a
# jammed one) runs in the plane y = 0 +- 0.02, so a cover keeps a gap there.

def b_shredder_m0_1():
    """Paper Shredder: a teal hood over the slot, five steel teeth along it."""
    root = empty("shredder_m0_1")
    m = _sh_mats()
    parts = [box("Rim", (0.50, 0.30, 0.02), material=m["char"]),
             box("HoodF", (0.46, 0.11, 0.07), loc=(0, -0.085, 0.02), material=m["teal"], bevel=0.012, taper=0.9),
             box("HoodB", (0.46, 0.11, 0.07), loc=(0, 0.085, 0.02), material=m["teal"], bevel=0.012, taper=0.9),
             box("EndL", (0.035, 0.30, 0.14), loc=(-0.2425, 0, 0), material=m["char"], bevel=0.006),
             box("EndR", (0.035, 0.30, 0.14), loc=(0.2425, 0, 0), material=m["char"], bevel=0.006)]
    for i in range(5):
        parts.append(box(f"Tooth{i}", (0.06, 0.035, 0.11), loc=(-0.16 + i * 0.08, -0.042, 0.03), material=m["steel"], taper=0.3))
    parent(join("shredder_m0_1_mesh", parts), root)
    return root


def b_shredder_m0_2():
    """Micro-Cut: the head grows 0.12 higher, open on top, a double roller with nine cutting
    discs, a crank wheel on the end and a tray of fine shreds."""
    root = empty("shredder_m0_2")
    m = _sh_mats()
    parts = [box("WallF", (0.50, 0.05, 0.13), loc=(0, -0.125, 0), material=m["teal"], bevel=0.01),
             box("WallB", (0.50, 0.05, 0.13), loc=(0, 0.125, 0), material=m["teal"], bevel=0.01),
             box("WallL", (0.05, 0.30, 0.13), loc=(-0.225, 0, 0), material=m["teal"], bevel=0.01),
             box("WallR", (0.05, 0.30, 0.13), loc=(0.225, 0, 0), material=m["teal"], bevel=0.01),
             box("Lip", (0.40, 0.012, 0.03), loc=(0, -0.153, 0.08), material=m["char"]),
             _cylx("RollerF", 0.04, 0.40, (0, -0.05, 0.085), m["steel"], verts=10),
             _cylx("RollerB", 0.04, 0.40, (0, 0.05, 0.085), m["steel"], verts=10),
             _cylx("Crank", 0.07, 0.04, (-0.27, 0, 0.07), m["char"], verts=12),
             box("CrankHandle", (0.03, 0.03, 0.10), loc=(-0.29, 0.0, 0.12), material=m["teal"])]
    for i in range(9):
        y = -0.05 if i % 2 == 0 else 0.05
        parts.append(_cylx(f"Disc{i}", 0.058, 0.02, (-0.18 + i * 0.045, y, 0.085), m["steel"], verts=8))
    # Fine shreds in a little tray on the back wall: cross-cut makes confetti, not strips.
    parts.append(box("ShredTray", (0.26, 0.09, 0.03), loc=(0.08, 0.195, 0.07), material=m["char"]))
    for i in range(7):
        parts.append(box(f"Bit{i}", (0.035, 0.02, 0.012), loc=(-0.02 + (i * 37 % 22) / 100, 0.17 + (i * 13 % 5) / 100, 0.10), material=m["paper"], rot_z=i * 0.9))
    parts.append(ball("Heap", 0.06, loc=(0.10, 0.195, 0.10), material=m["paper"], subdiv=1, scale=(1.6, 0.6, 0.5)))
    parent(join("shredder_m0_2_mesh", parts), root)
    return root


# Slot1 stands on the floor at the front face; the feed slot is SH_FEED_Y behind and SH_FEED_Z up.

def _sh_jam(n, s=1.0):
    """Crumpled sheets sticking askew out of the feed slot. They lean sideways only, so they stay
    in the slot's gap under a hood."""
    m = _sh_mats()
    parts = []
    spec = ((-0.08, 0.012, -0.38), (0.07, -0.012, 0.32), (0.0, 0.018, -0.08))[:n]
    for i, (x, dy, lean) in enumerate(spec):
        y, z = SH_FEED_Y + dy, SH_FEED_Z - 0.05
        low = box(f"Jam{i}Low", (0.14, 0.006, 0.17), loc=(x, y, z), material=m["paper"])
        kit.tilt(low, ry=lean, pivot=(x, y, z))
        tx, tz = x + 0.17 * math.sin(lean), z + 0.17 * math.cos(lean)
        top = box(f"Jam{i}Top", (0.12, 0.006, 0.12), loc=(tx, y, tz), material=m["paper"])
        kit.tilt(top, ry=lean * 2.2 + (0.3 if lean < 0 else -0.3), pivot=(tx, y, tz))
        parts += [low, top]
    return parts


def b_shredder_m1_1():
    """Jam: two crumpled sheets stuck askew in the slot and an orange fault light."""
    root = empty("shredder_m1_1")
    m = _sh_mats()
    parts = _sh_jam(2)
    parts += [cyl("LampBase", 0.042, 0.02, loc=(0.18, 0.035, SH_FEED_Z), material=m["char"], verts=10),
              ball("Lamp", 0.037, loc=(0.18, 0.035, SH_FEED_Z + 0.025), material=m["lamp"], subdiv=1)]
    parent(join("shredder_m1_1_mesh", parts), root)
    return root


def b_shredder_m1_2():
    """Bigger Bin: a wide orange catch tray at the foot, full of paper balls, three sheets in the
    slot and a big fault light on a post at the tray's corner."""
    root = empty("shredder_m1_2")
    m = _sh_mats()
    parts = _sh_jam(3)
    parts += [box("TrayFloor", (0.72, 0.30, 0.03), loc=(0, -0.15, 0), material=m["orange"]),
              box("TrayFront", (0.72, 0.035, 0.20), loc=(0, -0.2825, 0), material=m["orange"], bevel=0.008),
              box("TraySideL", (0.035, 0.30, 0.20), loc=(-0.3425, -0.15, 0), material=m["orange"], bevel=0.008),
              box("TraySideR", (0.035, 0.30, 0.20), loc=(0.3425, -0.15, 0), material=m["orange"], bevel=0.008),
              box("RimF", (0.73, 0.045, 0.025), loc=(0, -0.2825, 0.20), material=m["char"]),
              box("RimL", (0.045, 0.30, 0.025), loc=(-0.3425, -0.15, 0.20), material=m["char"]),
              box("RimR", (0.045, 0.30, 0.025), loc=(0.3425, -0.15, 0.20), material=m["char"])]
    parts += _sh_bang("Bang", (-0.18, -0.302, 0.05), 1.2, m["char"])
    for i, (x, y, z, r) in enumerate(((-0.24, -0.12, 0.10, 0.075), (-0.10, -0.18, 0.12, 0.08), (0.04, -0.10, 0.11, 0.075),
                                      (0.17, -0.17, 0.12, 0.08), (0.27, -0.09, 0.10, 0.065), (-0.03, -0.21, 0.17, 0.06),
                                      (0.12, -0.08, 0.18, 0.06))):
        parts.append(_sh_crumple(f"Wad{i}", x, y, z, r))
    parts += [box("LampPost", (0.035, 0.035, 0.26), loc=(0.30, -0.27, 0.20), material=m["char"]),
              cyl("LampBase", 0.06, 0.03, loc=(0.30, -0.27, 0.46), material=m["char"], verts=10),
              cyl("Lamp", 0.055, 0.09, loc=(0.30, -0.27, 0.49), material=m["lamp"], verts=10, radius_top=0.045),
              ball("LampCap", 0.045, loc=(0.30, -0.27, 0.58), material=m["lamp"], subdiv=1)]
    parent(join("shredder_m1_2_mesh", parts), root)
    return root


# Slot2 stands on the floor at the right flank; the module grows towards +X from x = 0.

def b_shredder_m2_1():
    """Recycling: a light blue bin with a white arrow panel on the front and the outer side."""
    root = empty("shredder_m2_1")
    m = _sh_mats()
    parts = [box("Bin", (0.20, 0.30, 0.33), loc=(0.105, 0, 0), material=m["blue"], bevel=0.015),
             box("Lid", (0.22, 0.32, 0.03), loc=(0.105, 0, 0.33), material=m["blue"], bevel=0.008),
             box("LidSlot", (0.12, 0.04, 0.01), loc=(0.105, 0, 0.36), material=m["char"]),
             box("Sheet", (0.10, 0.006, 0.12), loc=(0.105, 0, 0.30), material=m["paper"])]
    # The arrow loop: three white bars in a triangle and an arrow head, on the front and outside.
    def loop(pre, axis):
        out = []
        cx, cz = 0.105, 0.17
        for k in range(3):
            a = math.radians(90 + 120 * k)
            px, pz = 0.045 * math.cos(a), 0.045 * math.sin(a)
            if axis == "y":
                b = box(f"{pre}{k}", (0.075, 0.012, 0.022), loc=(cx - px * 0.0 + px, -0.152, cz + pz - 0.011), material=m["white"])
                kit.tilt(b, ry=-(a + math.pi / 2), pivot=(cx + px, -0.152, cz + pz))
            else:
                b = box(f"{pre}{k}", (0.012, 0.075, 0.022), loc=(0.207, px, cz + pz - 0.011), material=m["white"])
                kit.tilt(b, rx=(a + math.pi / 2), pivot=(0.207, px, cz + pz))
            out.append(b)
        return out
    parts += loop("ArrowF", "y") + loop("ArrowS", "x")
    parent(join("shredder_m2_1_mesh", parts), root)
    return root


def b_shredder_m2_2():
    """Confidential Bin: a locked light blue column with a letterbox slot, a yellow padlock and a
    red stamp bar all round."""
    root = empty("shredder_m2_2")
    m = _sh_mats()
    parts = [box("Column", (0.22, 0.34, 0.54), loc=(0.115, 0, 0), material=m["blue"], bevel=0.02),
             box("Cap", (0.23, 0.35, 0.045), loc=(0.115, 0, 0.54), material=m["char"], bevel=0.008),
             box("Letterbox", (0.14, 0.03, 0.01), loc=(0.115, 0, 0.582), material=m["black"]),
             box("StampF", (0.20, 0.012, 0.07), loc=(0.115, -0.172, 0.42), material=m["red"]),
             box("StampB", (0.20, 0.012, 0.07), loc=(0.115, 0.172, 0.42), material=m["red"]),
             box("StampS", (0.012, 0.30, 0.07), loc=(0.227, 0, 0.42), material=m["red"]),
             box("Hasp", (0.05, 0.015, 0.10), loc=(0.115, -0.176, 0.22), material=m["steel"])]
    parts += _sh_lock("Lock", 0.115, -0.19, 0.14, 1.5)
    parent(join("shredder_m2_2_mesh", parts), root)
    return root


# Heroes. Each keeps its feed slot where the Slot1 module expects it (scaled with the slot).

def b_shredder_p0_3():
    """Sticky Paper: red cutting head with two rows of teeth on an anthracite bin with a teal band,
    a big glue bottle upside down over the teeth, sticky strips hanging out of the bin."""
    root = empty("shredder_p0_3")
    m = _sh_mats()
    parts = [box("Foot", (0.56, 0.46, 0.04), material=m["char"]),
             box("Bin", (0.54, 0.44, 0.58), loc=(0, 0, 0.02), material=m["black"], bevel=0.02),
             box("Band", (0.555, 0.455, 0.08), loc=(0, 0, 0.42), material=m["teal"]),
             box("Head", (0.56, 0.46, 0.18), loc=(0, 0, 0.60), material=m["red"], bevel=0.02),
             box("Slot", (0.42, 0.04, 0.012), loc=(0, 0, 0.775), material=m["black"])]
    for row, y in enumerate((-0.06, 0.06)):
        for i in range(7):
            parts.append(box(f"Tooth{row}{i}", (0.045, 0.06, 0.09), loc=(-0.18 + i * 0.06, y, 0.78), material=m["steel"], taper=0.3))
    # Sticky strips hang out of the bin, front and left.
    for i, (x, h) in enumerate(((-0.18, 0.26), (-0.09, 0.20), (0.0, 0.30), (0.09, 0.18), (0.18, 0.24))):
        parts.append(box(f"Strip{i}", (0.045, 0.008, h), loc=(x, -0.224, 0.42 - h), material=m["yellow"] if i % 2 else m["paper"]))
    for i, (y, h) in enumerate(((-0.10, 0.22), (0.0, 0.30), (0.10, 0.18))):
        parts.append(box(f"Side{i}", (0.008, 0.045, h), loc=(-0.274, y, 0.42 - h), material=m["yellow"] if i % 2 else m["paper"]))
    # The glue bottle on a bracket at the back, nozzle down, a drop on its way.
    parts += [box("Post", (0.05, 0.05, 0.50), loc=(-0.12, 0.205, 0.78), material=m["char"]),
              box("Arm", (0.05, 0.10, 0.04), loc=(-0.12, 0.17, 1.22), material=m["char"]),
              cyl("Bottle", 0.08, 0.28, loc=(-0.12, 0.13, 0.94), material=m["white"], verts=12, bevel=0.01),
              cyl("Label", 0.083, 0.09, loc=(-0.12, 0.13, 1.02), material=m["teal"], verts=12),
              cyl("Nozzle", 0.014, 0.10, loc=(-0.12, 0.13, 0.84), material=m["orange"], verts=8, radius_top=0.045),
              ball("Drop", 0.024, loc=(-0.12, 0.13, 0.815), material=m["white"], subdiv=1, scale=(1, 1, 1.3))]
    # The back: a vent and the band; the right flank stays clear for Slot2.
    for k in range(3):
        parts.append(box(f"Vent{k}", (0.30, 0.012, 0.025), loc=(0.04, 0.222, 0.18 + k * 0.06), material=m["char"]))
    parent(join("shredder_p0_3_mesh", parts), root)
    s1 = 0.78 / SH_FEED_Z
    _slots(root, [((0, 0, 0.78), 1.0), ((0, -SH_FEED_Y * s1, 0), s1), ((0.28, -0.06, 0), 1.0)])
    return root


def b_shredder_p0_4():
    """Industrial Shredder: the big red machine with two cutter drums in an open hopper, now with a
    teal band and a stack light on a mast."""
    root = empty("shredder_p0_4")
    m = _sh_mats()
    steel = m["steel"]
    parts = [box("Base", (0.72, 0.60, 0.06), material=m["char"], bevel=0.01),
             box("Body", (0.66, 0.56, 0.70), loc=(0, 0, 0.0), material=m["red"], bevel=0.03),
             box("Band", (0.675, 0.575, 0.07), loc=(0, 0, 0.36), material=m["teal"])]
    # An open hopper, so the cutter drums inside are on show. The front wall is low: SH_FEED_Z-ish.
    parts += [box("HopperF", (0.64, 0.04, 0.08), loc=(0, -0.26, 0.70), material=steel),
              box("HopperB", (0.64, 0.04, 0.26), loc=(0, 0.26, 0.70), material=steel),
              box("HopperL", (0.04, 0.48, 0.18), loc=(-0.30, 0, 0.70), material=steel),
              box("HopperR", (0.04, 0.48, 0.18), loc=(0.30, 0, 0.70), material=steel)]
    for j, y in enumerate((-0.065, 0.065)):
        parts.append(_cylx(f"Drum{j}", 0.055, 0.54, (0, y, 0.80), steel, verts=12))
        for i in range(8):
            parts.append(box(f"Blade{j}_{i}", (0.02, 0.13, 0.13), loc=(-0.245 + i * 0.07, y, 0.735), material=steel, rot_z=0.4 * (1 if j else -1)))
    for i in range(6):
        parts.append(box(f"Chevron{i}", (0.1, 0.01, 0.05), loc=(-0.25 + i * 0.1, -0.282, 0.58), material=m["yellow"] if i % 2 else m["black"]))
    parts += [box("Panel", (0.2, 0.02, 0.14), loc=(0.20, -0.29, 0.14), material=m["black"]),
              box("Btn", (0.06, 0.03, 0.06), loc=(0.20, -0.30, 0.18), material=mat("red", emit=1.5)),
              box("Chute", (0.30, 0.16, 0.04), loc=(-0.17, -0.36, 0.06), material=steel, bevel=0.005)]
    parts += [box(f"Bit{i}", (0.03, 0.015, 0.005), loc=(-0.30 + (i * 37 % 26) / 100, -0.36 - (i * 13 % 8) / 100, 0.10), material=m["paper"], rot_z=i * 0.9) for i in range(8)]
    # The back and the sides: a service hatch with a grille, bolts in a row.
    parts += [box("Hatch", (0.36, 0.012, 0.30), loc=(0, 0.282, 0.06), material=m["black"])]
    for k in range(4):
        parts.append(box(f"Grille{k}", (0.30, 0.014, 0.025), loc=(0, 0.284, 0.10 + k * 0.06), material=steel))
    for sx in (-1, 1):
        parts.append(box(f"SidePlate{sx}", (0.012, 0.36, 0.22), loc=(sx * 0.332, 0, 0.08), material=m["black"]))
    # The stack light: a mast on the back wall, red, yellow and a teal light on top.
    parts += [cyl("Mast", 0.025, 0.24, loc=(-0.24, 0.24, 0.96), material=m["char"], verts=8),
              cyl("StackR", 0.06, 0.09, loc=(-0.24, 0.24, 1.20), material=mat("red", emit=1.5), verts=12),
              cyl("StackY", 0.06, 0.09, loc=(-0.24, 0.24, 1.29), material=mat("yellow", emit=1.5), verts=12),
              cyl("StackT", 0.06, 0.09, loc=(-0.24, 0.24, 1.38), material=mat(SH_ACCENT, emit=1.5), verts=12),
              cyl("StackCap", 0.062, 0.04, loc=(-0.24, 0.24, 1.47), material=m["char"], verts=12)]
    parent(join("shredder_p0_4_mesh", parts), root)
    s1 = 0.78 / SH_FEED_Z
    _slots(root, [((0, 0, 0.78), 1.0), ((0, -0.30, 0), s1), ((0.36, -0.06, 0), 1.0)])
    return root


def b_shredder_p1_3():
    """Paper Trail: an orange shredder with a big orange fault lamp on a stalk, and a long strip of
    paper that comes out of the back and runs away over the floor."""
    root = empty("shredder_p1_3")
    m = _sh_mats()
    top = 0.88
    parts = [box("Foot", (0.54, 0.46, 0.05), material=m["char"], bevel=0.01),
             box("Bin", (0.52, 0.44, 0.62), loc=(0, 0, 0.03), material=m["orange"], bevel=0.02),
             box("Seam", (0.535, 0.455, 0.03), loc=(0, 0, 0.645), material=m["char"]),
             box("Head", (0.56, 0.48, 0.22), loc=(0, 0, 0.66), material=m["orange"], bevel=0.02),
             box("Slot", (0.40, 0.035, 0.012), loc=(0, 0, top - 0.004), material=m["black"])]
    parts += _sh_window("Front", 0.34, 0.30, -0.222, 0.14)
    parts += _sh_bang("Bang", (0.17, -0.246, 0.70), 1.1, m["char"])
    for side, sx in (("L", -1), ("R", 1)):
        parts.append(box(f"Grip{side}", (0.014, 0.18, 0.04), loc=(sx * 0.263, 0, 0.52), material=m["char"]))
        parts += _sh_bang(f"Bang{side}", (sx * 0.286, 0.0, 0.70), 1.1, m["char"], axis="x")
    # The fault lamp: a big orange beacon on a stalk, back left.
    parts += [cyl("Stalk", 0.025, 0.20, loc=(-0.20, 0.19, top), material=m["char"], verts=8),
              cyl("LampBase", 0.085, 0.04, loc=(-0.20, 0.19, top + 0.20), material=m["char"], verts=12),
              cyl("Lamp", 0.075, 0.13, loc=(-0.20, 0.19, top + 0.24), material=m["lamp"], verts=12, radius_top=0.06),
              ball("LampCap", 0.06, loc=(-0.20, 0.19, top + 0.37), material=m["lamp"], subdiv=1, scale=(1, 1, 0.7))]
    # The trail: out of a slit in the back, down the back face, then away over the floor and round
    # to the left.
    paper = m["paper"]
    parts += [box("Exit", (0.20, 0.014, 0.03), loc=(0, 0.226, 0.56), material=m["black"]),
              box("Drop", (0.15, 0.008, 0.57), loc=(0, 0.234, 0.0), material=paper)]
    pts = [(0.0, 0.238), (0.02, 0.33), (-0.06, 0.40), (-0.18, 0.42), (-0.28, 0.37), (-0.35, 0.28), (-0.37, 0.16)]
    for i in range(len(pts) - 1):
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]
        ln = math.hypot(x1 - x0, y1 - y0) + 0.03
        a = math.atan2(y1 - y0, x1 - x0)
        parts.append(box(f"Trail{i}", (ln, 0.15, 0.008), loc=((x0 + x1) / 2, (y0 + y1) / 2, 0.002 + 0.0005 * (i % 2)), material=paper, rot_z=a))
    for i, (x, y, a) in enumerate(((-0.10, 0.415, 0.2), (-0.31, 0.33, 1.0), (-0.365, 0.20, 1.5))):
        parts.append(box(f"Dash{i}", (0.06, 0.025, 0.006), loc=(x, y, 0.009), material=m["orange"], rot_z=a))
    parent(join("shredder_p1_3_mesh", parts), root)
    _slots(root, [((0, 0, top), 1.0), ((0, -0.22, 0), 1.0), ((0.265, -0.06, 0), 1.0)])
    return root


def b_shredder_p1_4():
    """Out of Order: a wide orange shredder overflowing with paper, a traffic cone stuck in the
    pile with a warning light, caution tape in a cross, a sign on an A-frame in front."""
    root = empty("shredder_p1_4")
    m = _sh_mats()
    top = 0.72
    parts = [box("Foot", (0.70, 0.50, 0.05), material=m["char"], bevel=0.01),
             box("Bin", (0.68, 0.48, 0.55), loc=(0, 0, 0.03), material=m["orange"], bevel=0.03),
             box("Seam", (0.695, 0.495, 0.03), loc=(0, 0, 0.565), material=m["char"]),
             box("Head", (0.70, 0.50, 0.14), loc=(0, 0, 0.58), material=m["orange"], bevel=0.02),
             ball("Overflow", 0.30, loc=(0, 0.11, 0.66), material=m["paper"], subdiv=2, scale=(1.0, 0.5, 1.0))]
    for i, (x, y, z, r) in enumerate(((-0.24, 0.05, 0.78, 0.07), (0.25, 0.10, 0.80, 0.07), (0.12, 0.20, 0.92, 0.06), (-0.14, 0.16, 0.94, 0.06))):
        parts.append(_sh_crumple(f"Top{i}", x, y, z, r))
    # The cone, a little crooked, a light on its tip: the crown.
    cone = [cyl("ConeFoot", 0.13, 0.03, loc=(0.02, 0.12, 0.92), material=m["orange"], verts=4),
            cyl("Cone", 0.10, 0.40, loc=(0.02, 0.12, 0.95), material=m["orange"], verts=12, radius_top=0.025),
            cyl("ConeBand", 0.072, 0.07, loc=(0.02, 0.12, 1.07), material=m["white"], verts=12, radius_top=0.06),
            cyl("LampBase", 0.04, 0.03, loc=(0.02, 0.12, 1.35), material=m["char"], verts=10),
            ball("Lamp", 0.055, loc=(0.02, 0.12, 1.42), material=mat("yellow", emit=1.8), subdiv=1, scale=(1, 1, 1.15))]
    kit.tilt(cone, ry=0.14, pivot=(0.02, 0.12, 0.92))
    parts += cone
    # Caution tape in a cross over the front and the back.
    for face, y in (("F", -0.247), ("B", 0.247)):
        for d, lean in (("A", 0.42), ("B", -0.42)):
            for k in range(6):
                t = -0.35 + 0.7 * (k + 0.5) / 6
                px, pz = t * math.cos(lean), 0.30 - t * math.sin(lean)
                seg = box(f"Tape{face}{d}{k}", (0.13, 0.010, 0.055), loc=(px, y, pz - 0.0275), material=m["yellow"] if k % 2 else m["black"])
                kit.tilt(seg, ry=lean, pivot=(px, y, pz))
                parts.append(seg)
    # The A-frame sign in front: yellow boards with black bars, front and back.
    for side, sy, rx in (("F", -1, -0.22), ("B", 1, 0.22)):
        y0 = -0.36 + sy * 0.07
        board = [box(f"Board{side}", (0.36, 0.018, 0.36), loc=(0, y0, 0.0), material=m["yellow"], bevel=0.005),
                 box(f"Bar{side}1", (0.26, 0.022, 0.045), loc=(0, y0, 0.24), material=m["black"]),
                 box(f"Bar{side}2", (0.20, 0.022, 0.04), loc=(0, y0, 0.16), material=m["black"]),
                 box(f"Bar{side}3", (0.24, 0.022, 0.04), loc=(0, y0, 0.08), material=m["black"])]
        kit.tilt(board, rx=rx, pivot=(0, y0, 0.0))
        parts += board
    parts.append(box("Hinge", (0.38, 0.03, 0.03), loc=(0, -0.36, 0.33), material=m["char"]))
    # Paper on the floor all round, away from the right flank (Slot2).
    for i, (x, y, a) in enumerate(((-0.25, -0.33, 0.4), (-0.26, 0.24, 1.1), (-0.06, 0.27, 2.0), (0.16, 0.27, 0.7), (0.24, -0.35, 1.4))):
        parts.append(box(f"Floor{i}", (0.14, 0.10, 0.006), loc=(x, y, 0.0), material=m["paper"], rot_z=a))
    parts += [_sh_crumple("Ball0", -0.29, -0.31, 0.05), _sh_crumple("Ball1", -0.22, -0.38, 0.05, 0.05)]
    parent(join("shredder_p1_4_mesh", parts), root)
    _slots(root, [((0, -0.14, top), 0.75), ((0, -0.25, 0), 1.0), ((0.35, -0.06, 0), 1.0)])
    return root


def b_shredder_p2_3():
    """Compactor: a light blue press. A heavy plate on two pistons hangs over the bin from a beam
    on two columns, and a cardboard box pressed into a cube stands beside it."""
    root = empty("shredder_p2_3")
    m = _sh_mats()
    top = 0.70
    yf = -SH_FEED_Y + SH_FEED_Y * top / SH_FEED_Z
    parts = [box("Foot", (0.56, 0.48, 0.05), material=m["char"], bevel=0.01),
             box("Bin", (0.54, 0.46, 0.67), loc=(0, 0, 0.03), material=m["blue"], bevel=0.02),
             box("Rim", (0.55, 0.47, 0.03), loc=(0, 0, 0.67), material=m["char"]),
             box("Slot", (0.38, 0.035, 0.012), loc=(0, yf, top - 0.002), material=m["black"]),
             box("Stamp", (0.36, 0.012, 0.07), loc=(0, -0.232, 0.52), material=m["red"])]
    # In the window: paper pressed into slabs.
    parts += [box("Window", (0.36, 0.012, 0.30), loc=(0, -0.232, 0.13), material=m["glass"])]
    for k in range(4):
        parts.append(box(f"Slab{k}", (0.32, 0.014, 0.055), loc=(0, -0.234, 0.15 + k * 0.07), material=m["paper"] if k % 2 else m["white"]))
    # The press: two columns at the back corners, a beam over the bin, two pistons, the plate.
    parts += [box("ColL", (0.09, 0.09, 1.24), loc=(-0.20, 0.275, 0), material=m["blue"], bevel=0.01),
              box("ColR", (0.09, 0.09, 1.24), loc=(0.20, 0.275, 0), material=m["blue"], bevel=0.01),
              box("Beam", (0.54, 0.40, 0.12), loc=(0, 0.11, 1.22), material=m["blue"], bevel=0.015),
              box("BeamStripe", (0.545, 0.012, 0.04), loc=(0, -0.092, 1.26), material=m["char"])]
    for i, x in enumerate((-0.15, 0.15)):
        parts += [cyl(f"Sleeve{i}", 0.05, 0.12, loc=(x, 0.0, 1.10), material=m["char"], verts=10),
                  cyl(f"Rod{i}", 0.028, 0.06, loc=(x, 0.0, 1.06), material=m["steel"], verts=8)]
    parts += [box("Plate", (0.50, 0.40, 0.08), loc=(0, 0.0, 0.98), material=m["char"], bevel=0.01)]
    for k in range(5):
        parts.append(box(f"Hazard{k}", (0.10, 0.012, 0.05), loc=(-0.20 + k * 0.10, -0.204, 0.995), material=m["yellow"] if k % 2 == 0 else m["black"]))
    # A gauge on the back of the beam, a hatch on the back of the bin.
    parts += [_cyly("Gauge", 0.05, 0.02, (0.12, 0.315, 1.28), m["white"], verts=12),
              box("Hatch", (0.30, 0.012, 0.30), loc=(0, 0.232, 0.14), material=m["char"])]
    # The pressed cube on the left, tape round it, dents in it.
    parts += [box("Cube", (0.22, 0.22, 0.20), loc=(-0.38, -0.02, 0), material=m["card"], bevel=0.015),
              box("CubeTape", (0.225, 0.06, 0.205), loc=(-0.38, -0.02, 0), material=m["char"]),
              box("Dent0", (0.012, 0.10, 0.03), loc=(-0.493, 0.03, 0.12), material=m["char"], rot_z=0.0),
              box("Flap", (0.16, 0.10, 0.012), loc=(-0.38, 0.04, 0.20), material=m["card"], rot_z=0.4)]
    parent(join("shredder_p2_3_mesh", parts), root)
    s1 = top / SH_FEED_Z
    _slots(root, [((0, yf, top), 1.0), ((0, -0.23, 0), s1), ((0.27, 0, 0), 1.0)])
    return root


def b_shredder_p2_4():
    """Document Destruction: a dark secure cabinet, a console in front with the feed slot and a
    tall locked back with a beacon on top. Light blue doors, a red stamp band, sealed sacks."""
    root = empty("shredder_p2_4")
    m = _sh_mats()
    top = 0.78
    parts = [box("Console", (0.58, 0.42, top), loc=(0, 0, 0), material=m["char"], bevel=0.03),
             box("Tower", (0.58, 0.18, 1.24), loc=(0, 0.29, 0), material=m["char"], bevel=0.03),
             box("Slot", (0.38, 0.05, 0.012), loc=(0, 0, top - 0.002), material=m["black"]),
             box("BandC", (0.59, 0.43, 0.07), loc=(0, 0, 0.62), material=m["red"]),
             box("BandT", (0.59, 0.19, 0.07), loc=(0, 0.29, 0.62), material=m["red"]),
             # Light blue doors and panels: the path colour on every face.
             box("DoorF", (0.46, 0.012, 0.50), loc=(0, -0.212, 0.07), material=m["blue"]),
             box("DoorT", (0.46, 0.012, 0.36), loc=(0, 0.198, 0.80), material=m["blue"]),
             box("DoorB", (0.46, 0.012, 1.02), loc=(0, 0.382, 0.10), material=m["blue"])]
    for sx in (-1, 1):
        parts += [box(f"SideC{sx}", (0.012, 0.30, 0.50), loc=(sx * 0.292, -0.02, 0.07), material=m["blue"]),
                  box(f"SideT{sx}", (0.012, 0.12, 0.96), loc=(sx * 0.292, 0.29, 0.12), material=m["blue"])]
    parts += _sh_lock("Lock", 0.15, -0.226, 0.24, 1.5)
    parts += [box("Keypad", (0.13, 0.02, 0.17), loc=(-0.15, 0.188, 0.90), material=m["black"]),
              box("KeyScreen", (0.09, 0.012, 0.05), loc=(-0.15, 0.180, 1.0), material=mat("screen", emit=1.0)),
              box("Keys", (0.09, 0.012, 0.06), loc=(-0.15, 0.180, 0.92), material=m["char"])]
    # The beacon on the tower: the crown.
    parts += [cyl("BeaconBase", 0.085, 0.04, loc=(0.0, 0.29, 1.24), material=m["black"], verts=12),
              cyl("Beacon", 0.07, 0.15, loc=(0.0, 0.29, 1.28), material=mat("orange", emit=2.5), verts=12, radius_top=0.055),
              ball("BeaconCap", 0.055, loc=(0.0, 0.29, 1.43), material=mat("orange", emit=2.5), subdiv=1, scale=(1, 1, 0.6))]
    # Sealed sacks on the right, tied off in the path colour.
    for i, (x, y, r) in enumerate(((0.39, 0.16, 0.11), (0.38, -0.06, 0.10))):
        parts += [ball(f"Sack{i}", r, loc=(x, y, r), material=m["white"], subdiv=2, scale=(0.85, 0.9, 1.0)),
                  box(f"Tie{i}", (0.05, 0.05, 0.04), loc=(x, y, r * 1.9), material=m["blue"]),
                  box(f"Tuft{i}", (0.06, 0.03, 0.05), loc=(x, y, r * 1.9 + 0.04), material=m["white"])]
    parent(join("shredder_p2_4_mesh", parts), root)
    s1 = top / SH_FEED_Z
    _slots(root, [((0, 0, top), 1.0), ((0, -SH_FEED_Y * s1, 0), s1), ((0.29, 0, 0), 1.0)])
    return root


def tower_shredder(tiers):
    return tower_parts("shredder", tiers)


TOWER_PART_BUILDERS["shredder_core"] = b_shredder_core
for _p in range(3):
    for _t in (1, 2):
        TOWER_PART_BUILDERS[f"shredder_m{_p}_{_t}"] = globals()[f"b_shredder_m{_p}_{_t}"]
    for _t in (3, 4):
        TOWER_PART_BUILDERS[f"shredder_p{_p}_{_t}"] = globals()[f"b_shredder_p{_p}_{_t}"]


# --- quickreply (tower parts)

# --- Quick Reply (7.6). A phone as big as a door, upright in its charging dock, with three speech
# bubbles jumping out of it: three, because it hits three colleagues at once.
# Slot0 (KEEP TYPING) on the left flank of the phone: the module is a bubble whose tail touches
# the phone, built with its origin at the tail tip and growing towards -X. Slot1 (SHORTCUTS) on
# the dock, right front: the module is a keyboard standing on its origin. Slot2 (EMOJI) on the
# dock behind the phone: a clamp with a stick, the emoji up at about 1.2.

QR_ACCENT = "#8fa0b4"
QR_PATH = ("#8fa0b4", "#7fb6e3", "#f2c641")
QR_DOCK_H = 0.14
QR_EMOJI_Z = 1.02
# The screen is a lit mid blue, so the white and grey chat lines read from across the floor.
QR_SCREEN = "denim"  # height of the emoji above the clamp of the EMOJI modules


def _qr_tail(name, at, length, width, depth, phi, material):
    """A speech bubble's tail: a tapered block from at, pointing along phi in the XZ plane
    (0 is up, pi is down, pi/2 is +X)."""
    t = box(name, (width, depth, length), loc=at, material=material, taper=0.15)
    kit.tilt(t, ry=phi, pivot=at)
    return t


def _qr_bubble(name, c, w, h, d, material, tail=math.pi, tail_at=(0.0, -1.0), tilt=0.0):
    """A rounded speech bubble centred on c with a tail. tail_at says where the tail starts, in
    half-widths and half-heights from the centre; tail is its direction. tilt turns it all
    about Y (negative lifts the right side)."""
    cx, cy, cz = c
    parts = [box(f"{name}Body", (w, d, h), loc=(cx, cy, cz - h / 2), material=material, bevel=min(0.035, h * 0.22))]
    ax = cx + tail_at[0] * (w / 2 - 0.02)
    az = cz + tail_at[1] * (h / 2 - 0.015)
    parts.append(_qr_tail(f"{name}Tail", (ax, cy, az), max(0.045, h * 0.4), max(0.05, w * 0.22), d * 0.8, tail, material))
    if tilt:
        kit.tilt(parts, ry=tilt, pivot=c)
    return parts


def _qr_dots(name, c, d, material, n=3, r=0.025, gap=0.06):
    """Typing dots, as short rods through a bubble so they show on both faces."""
    x, y, z = c
    return [_cyly(f"{name}{i}", r, d + 0.014, (x + (i - (n - 1) / 2) * gap, y, z), material, verts=8) for i in range(n)]


def _qr_bar(name, p, q, y, t, d, material):
    """A straight bar in the XZ plane from p to q (x, z), t thick, d deep."""
    (x0, z0), (x1, z1) = p, q
    mx, mz = (x0 + x1) / 2, (z0 + z1) / 2
    b = box(name, (math.hypot(x1 - x0, z1 - z0) + t * 0.7, d, t), loc=(mx, y, mz - t / 2), material=material)
    kit.tilt(b, ry=-math.atan2(z1 - z0, x1 - x0), pivot=(mx, y, mz))
    return b


def _qr_tick(name, v, y, s, d, material):
    """A check mark with its point at v (x, z)."""
    bx, bz = v
    return [_qr_bar(f"{name}S", (bx - 0.035 * s, bz + 0.035 * s), (bx, bz), y, 0.03 * s, d, material),
            _qr_bar(f"{name}L", (bx, bz), (bx + 0.065 * s, bz + 0.085 * s), y, 0.03 * s, d, material)]


def _qr_dock(pre, w, d, col, h=QR_DOCK_H, stripe=None, xy=(0.0, 0.0)):
    """The charging dock: a low wedge in the tower colour, a glowing stripe on the front and the back."""
    x, y = xy
    stripe = stripe or mat("screen_glow", emit=0.8)
    slope = math.atan2(d / 2 * 0.08, h)
    parts = [box(f"{pre}Dock", (w, d, h), loc=(x, y, 0), material=mat(col), bevel=0.02, taper=0.92)]
    for s_, sy in (("F", -1), ("B", 1)):
        yy = y + sy * (d / 2) * (1 - 0.08 * 0.45)
        st = box(f"{pre}Stripe{s_}", (w * 0.62, 0.02, 0.03), loc=(x, yy, h * 0.45 - 0.015), material=stripe)
        kit.tilt(st, rx=-sy * slope, pivot=(x, yy, h * 0.45))
        parts.append(st)
    return parts


def _qr_phone(pre, c, w, h, d, case, bezel="plastic_black", lines=3, rz=0.0, collar=True):
    """The phone, standing on c (bottom centre), screen to the front. A case in the tower colour,
    a black border, a light screen with chat lines (white right, grey left), a camera on the back."""
    x, y, z = c
    fy = y - d / 2
    sw, sh = w - 0.10, h - 0.17
    parts = [box(f"{pre}Case", (w, d, h), loc=(x, y, z), material=mat(case), bevel=0.03),
             box(f"{pre}Bezel", (w - 0.04, 0.014, h - 0.045), loc=(x, fy, z + 0.025), material=mat(bezel)),
             box(f"{pre}Screen", (sw, 0.012, sh), loc=(x, fy - 0.008, z + 0.10), material=mat(QR_SCREEN, emit=0.5))]
    lh = min(0.10, sh / (lines * 1.55))
    step = (sh - 0.04) / lines
    for i in range(lines):
        right = i % 2 == 0
        lw = sw * (0.62 if right else 0.55)
        lx = x + (sw / 2 - 0.025 - lw / 2) * (1 if right else -1)
        lz = z + 0.10 + sh - 0.03 - (i + 1) * step + (step - lh) / 2
        parts.append(box(f"{pre}Line{i}", (lw, 0.012, lh), loc=(lx, fy - 0.016, lz),
                         material=mat("plastic_white" if right else "metal_light")))
    # The back: a camera bump with a lens and a flash, so it is not a bare plate.
    cs = min(0.16, w * 0.32)
    bx, bz = x - w / 2 + 0.04 + cs / 2, z + h - 0.05 - cs
    parts += [box(f"{pre}Bump", (cs, 0.025, cs), loc=(bx, y + d / 2 + 0.005, bz), material=mat("plastic_black"), bevel=0.008),
              _cyly(f"{pre}Lens", cs * 0.30, 0.02, (bx, y + d / 2 + 0.025, bz + cs * 0.58), mat("metal_light"), verts=10),
              _cyly(f"{pre}Lens2", cs * 0.18, 0.02, (bx, y + d / 2 + 0.025, bz + cs * 0.22), mat("metal_light"), verts=8),
              box(f"{pre}Button", (0.02, d * 0.5, 0.14), loc=(x + w / 2 + 0.004, y, z + h * 0.62), material=mat("plastic_black"))]
    # A big white speech bubble with typing dots on the back: the phone reads from behind too.
    ew, eh, ey = w * 0.52, w * 0.36, y + d / 2 + 0.006
    ec = (x + w * 0.04, ey, z + h * 0.30)
    parts += _qr_bubble(f"{pre}Emblem", ec, ew, eh, 0.012, mat("plastic_white"), tail_at=(-0.5, -1.0))
    parts += _qr_dots(f"{pre}EmDot", ec, 0.012, mat("plastic_black"), r=ew * 0.09, gap=ew * 0.25)
    if collar:
        parts.append(box(f"{pre}Collar", (w + 0.06, d + 0.06, 0.035), loc=(x, y, QR_DOCK_H), material=mat("plastic_black"), bevel=0.01))
    if rz:
        kit.tilt(parts, rz=rz, pivot=(x, y, z))
    return parts


def _qr_fan(z_mid, y=0.0, spread=0.235, cols=("plastic_white", QR_ACCENT, "plastic_white")):
    """Three bubbles in a fan above the phone."""
    parts = []
    for i, (sx, rot) in enumerate(((-1, -0.3), (0, 0.0), (1, 0.3))):
        zc = z_mid if sx == 0 else z_mid - 0.045
        parts += _qr_bubble(f"Fan{i}", (sx * spread, y, zc), 0.22, 0.15, 0.065, mat(cols[i]), tilt=rot)
    return parts


def b_quickreply_core():
    root = empty("quickreply_core")
    parts = _qr_dock("Dk", 0.64, 0.44, QR_ACCENT)
    parts += _qr_phone("Ph", (0, 0.03, 0.10), 0.46, 0.85, 0.08, QR_ACCENT)
    parts += _qr_fan(1.075)
    ob = join("quickreply_core_mesh", parts)
    parent(ob, root)
    _slots(root, [((-0.23, 0.03, 0.60), 1.0), ((0.11, -0.13, QR_DOCK_H), 1.0), ((0, 0.175, QR_DOCK_H), 1.0)])
    return root


# Modules. KEEP TYPING: a bubble on the flank, its tail at the origin, growing towards -X.

def b_quickreply_m0_1():
    """"OK": a big grey-blue bubble with three fat dots."""
    root = empty("quickreply_m0_1")
    k = mat(QR_PATH[0], emit=0.5)
    parts = _qr_bubble("Ok", (-0.13, 0, 0.0), 0.22, 0.20, 0.08, k, tail=math.pi / 2 + 0.35, tail_at=(1.0, -0.25))
    parts += _qr_dots("OkDot", (-0.13, 0, 0.0), 0.08, mat("plastic_black"), r=0.026, gap=0.062)
    parent(join("quickreply_m0_1_mesh", parts), root)
    return root


def b_quickreply_m0_2():
    """Thumbs-Up: a taller bubble with a white fist and thumb, on both faces."""
    root = empty("quickreply_m0_2")
    k = mat(QR_PATH[0], emit=0.5)
    white = mat("plastic_white")
    d = 0.10
    parts = _qr_bubble("Up", (-0.14, 0, 0.02), 0.24, 0.32, d, k, tail=math.pi / 2 + 0.35, tail_at=(1.0, -0.45))
    parts += [box("Fist", (0.13, d + 0.03, 0.11), loc=(-0.13, 0, -0.08), material=white, bevel=0.025),
              box("Thumb", (0.05, d + 0.03, 0.12), loc=(-0.165, 0, 0.02), material=white, bevel=0.018),
              box("Cuff", (0.05, d + 0.025, 0.10), loc=(-0.05, 0, -0.085), material=mat("plastic_black"), bevel=0.01)]
    for i in range(3):
        parts.append(box(f"Knuckle{i}", (0.10, d + 0.034, 0.012), loc=(-0.13, 0, -0.06 + i * 0.03), material=k))
    parent(join("quickreply_m0_2_mesh", parts), root)
    return root


# SHORTCUTS: a keyboard on the dock, standing on its origin.

def _qr_keyboard(w, d, blue, pre="Kb"):
    """A small keyboard, front edge on the dock, back on two feet: tilted like a real one."""
    parts = [box(f"{pre}Body", (w, d, 0.05), loc=(0, 0, 0.02), material=blue, bevel=0.012),
             box(f"{pre}Feet", (w * 0.8, 0.03, 0.02), loc=(0, d / 2 - 0.03, 0), material=mat("plastic_black"))]
    return parts


def b_quickreply_m1_1():
    """Ctrl+Enter: a light blue keyboard with two enormous keys, set at an angle."""
    root = empty("quickreply_m1_1")
    blue = mat(QR_PATH[1], rough=0.6)
    white = mat("plastic_white")
    keys = mat("plastic_black")
    parts = _qr_keyboard(0.30, 0.14, blue)
    parts += [box("Ctrl", (0.11, 0.10, 0.045), loc=(-0.08, -0.005, 0.07), material=keys, bevel=0.012),
              box("EnterA", (0.07, 0.11, 0.045), loc=(0.095, 0.0, 0.07), material=keys, bevel=0.012),
              box("EnterB", (0.13, 0.05, 0.045), loc=(0.065, -0.03, 0.07), material=keys, bevel=0.012),
              box("CtrlMark", (0.05, 0.03, 0.012), loc=(-0.08, -0.01, 0.115), material=white)]
    kit.tilt(parts, rx=0.12, rz=-0.12, pivot=(0, -0.07, 0))
    parent(join("quickreply_m1_1_mesh", parts), root)
    return root


def b_quickreply_m1_2():
    """Text Expander: a wider keyboard, an accordion of light blue folds springing up from its end."""
    root = empty("quickreply_m1_2")
    blue = mat(QR_PATH[1], rough=0.6)
    white = mat("plastic_white")
    parts = [box("KbBody", (0.44, 0.16, 0.05), loc=(-0.02, 0, 0.02), material=blue, bevel=0.012),
             box("KbFeet", (0.36, 0.03, 0.02), loc=(-0.02, 0.05, 0), material=mat("plastic_black"))]
    for i in range(4):
        parts.append(box(f"Key{i}", (0.06, 0.06, 0.035), loc=(-0.19 + i * 0.075, -0.02, 0.07), material=mat("plastic_black"), bevel=0.01))
    parts.append(box("Enter", (0.07, 0.11, 0.04), loc=(0.11, 0.0, 0.07), material=mat("plastic_black"), bevel=0.012))
    # The accordion: folds tilted left and right in turn, rising from the end of the keyboard.
    for i in range(5):
        z = 0.08 + i * 0.05
        f = box(f"Fold{i}", (0.10, 0.10, 0.045), loc=(0.19, 0.0, z), material=blue if i % 2 == 0 else white)
        kit.tilt(f, ry=0.38 if i % 2 == 0 else -0.38, pivot=(0.19, 0.0, z + 0.022))
        parts.append(f)
    parts.append(box("FoldCap", (0.13, 0.12, 0.04), loc=(0.19, 0.0, 0.33), material=blue, bevel=0.01))
    kit.tilt(parts, rx=0.10, pivot=(0, -0.08, 0))
    parent(join("quickreply_m1_2_mesh", parts), root)
    return root


# EMOJI: a clamp on the dock with a stick, the emoji at the top.

def _qr_stick(top):
    return [box("Clamp", (0.10, 0.05, 0.05), material=mat("plastic_black"), bevel=0.01),
            cyl("Stick", 0.018, top - 0.05, loc=(0, 0, 0.05), material=mat("metal_light"), verts=8)]


def b_quickreply_m2_1():
    """Reaction: a round yellow face on a stick."""
    root = empty("quickreply_m2_1")
    z = QR_EMOJI_Z
    black = mat("plastic_black")
    parts = _qr_stick(z - 0.10)
    parts += [ball("Face", 0.12, loc=(0, 0, z), material=mat(QR_PATH[2], rough=0.6), subdiv=2),
              ball("EyeL", 0.024, loc=(-0.042, -0.108, z + 0.03), material=black, scale=(0.8, 0.6, 1.5)),
              ball("EyeR", 0.024, loc=(0.042, -0.108, z + 0.03), material=black, scale=(0.8, 0.6, 1.5))]
    # A smile in three blocks.
    parts += [box("SmileM", (0.05, 0.02, 0.018), loc=(0, -0.112, z - 0.058), material=black)]
    for sx in (-1, 1):
        sm = box(f"Smile{sx}", (0.035, 0.02, 0.018), loc=(sx * 0.038, -0.106, z - 0.05), material=black)
        kit.tilt(sm, ry=-sx * 0.6, pivot=(sx * 0.038, -0.106, z - 0.041))
        parts.append(sm)
    parent(join("quickreply_m2_1_mesh", parts), root)
    return root


def b_quickreply_m2_2():
    """Eyes Emoji (sees hidden colleagues): two big eyeballs in yellow cups, looking ahead."""
    root = empty("quickreply_m2_2")
    z = QR_EMOJI_Z
    yellow = mat(QR_PATH[2], rough=0.6)
    parts = _qr_stick(z - 0.06)
    parts.append(box("Bar", (0.30, 0.05, 0.06), loc=(0, 0.05, z - 0.08), material=yellow, bevel=0.012))
    for sx in (-1, 1):
        x = sx * 0.105
        parts += [ball(f"Cup{sx}", 0.108, loc=(x, 0.035, z), material=yellow, scale=(1, 0.6, 1)),
                  ball(f"Eye{sx}", 0.10, loc=(x, 0.0, z), material=mat("plastic_white"), subdiv=2),
                  ball(f"Pupil{sx}", 0.05, loc=(x, -0.078, z - 0.005), material=mat("plastic_black"), scale=(1, 0.5, 1.2))]
    parent(join("quickreply_m2_2_mesh", parts), root)
    return root


# Heroes. Each keeps a dock and the slots of the two other paths.

def b_quickreply_p0_3():
    """Seen (breaks boxes): a bigger phone, a chain of three big bubbles climbing to the right, the
    last one with two fat glowing blue ticks."""
    root = empty("quickreply_p0_3")
    k = QR_PATH[0]
    km = mat(k)
    parts = _qr_dock("Dk", 0.72, 0.46, k, h=0.16)
    parts += _qr_phone("Ph", (0, 0.03, 0.11), 0.50, 0.95, 0.09, k, lines=4)
    chain = [((-0.26, 0, 1.15), 0.20, 0.14, 0.08, km), ((-0.02, 0, 1.235), 0.22, 0.16, 0.09, km),
             ((0.245, 0, 1.33), 0.28, 0.19, 0.10, mat("plastic_white"))]
    for i, (c, w, h, d, m) in enumerate(chain):
        parts += _qr_bubble(f"Seen{i}", c, w, h, d, m, tail=math.pi - 0.35 if i == 0 else math.pi + 0.5,
                            tail_at=(0.2, -1.0) if i == 0 else (-0.6, -1.0))
    for i in range(2):
        (x0, _, z0), (x1, _, z1) = chain[i][0], chain[i + 1][0]
        parts.append(_qr_bar(f"Link{i}", (x0, z0), (x1, z1), 0.0, 0.035, 0.035, mat("plastic_black")))
    parts += _qr_dots("SeenDot", (-0.26, 0, 1.15), 0.08, mat("plastic_black"), r=0.022, gap=0.055)
    blue = mat("blue", emit=1.3)
    for i in range(2):
        parts += _qr_tick(f"Tick{i}", (0.165 + i * 0.075, 1.285), 0.0, 1.0, 0.124, blue)
    ob = join("quickreply_p0_3_mesh", parts)
    parent(ob, root)
    _slots(root, [((-0.25, 0.03, 0.62), 1.0), ((0.12, -0.14, 0.16), 1.0), ((0, 0.19, 0.16), 1.0)])
    return root


def b_quickreply_p0_4():
    """Typing Forever: a phone as big as a tablet under a wobbling tower of five bubbles, each
    bigger than the last, the top one glowing with typing dots."""
    root = empty("quickreply_p0_4")
    k = QR_PATH[0]
    parts = _qr_dock("Dk", 0.76, 0.50, k)
    parts += _qr_phone("Ph", (0, 0.03, 0.10), 0.62, 0.98, 0.10, k, lines=5)
    sizes = ((0.16, 0.085), (0.19, 0.095), (0.22, 0.105), (0.26, 0.115), (0.32, 0.13))
    offs = (0.05, -0.04, 0.04, -0.03, 0.0)
    z = 1.105
    for i, ((w, h), ox) in enumerate(zip(sizes, offs)):
        top = i == len(sizes) - 1
        side = 1 if ox >= 0 else -1
        m = mat(k, emit=1.3) if top else mat(k if i % 2 == 0 else "plastic_white")
        c = (ox, 0, z + h / 2)
        parts += _qr_bubble(f"Stack{i}", c, w, h, 0.09, m, tail=side * (math.pi / 2 + 0.4), tail_at=(side, -0.3))
        if top:
            parts += _qr_dots("TopDot", c, 0.09, mat("plastic_black"), r=0.03, gap=0.08)
        z += h + 0.012
    ob = join("quickreply_p0_4_mesh", parts)
    parent(ob, root)
    _slots(root, [((-0.31, 0.03, 0.62), 1.0), ((0.14, -0.15, QR_DOCK_H), 1.0), ((0, 0.22, QR_DOCK_H), 1.0)])
    return root


def b_quickreply_p1_3():
    """Reply in Thread (five targets): the phone between two smaller ones, fanned like cards, a
    light blue thread between them and five bubbles in an arc above."""
    root = empty("quickreply_p1_3")
    s = QR_PATH[1]
    sm = mat(s, rough=0.6)
    parts = _qr_dock("Dk", 0.80, 0.44, s, h=0.12)
    parts += _qr_phone("Ph", (0, 0.02, 0.09), 0.40, 0.82, 0.08, s, collar=False)
    for i, sx in enumerate((-1, 1)):
        parts += _qr_phone(f"Side{i}", (sx * 0.25, 0.07, 0.09), 0.22, 0.56, 0.07, s, lines=2, rz=-sx * 0.35, collar=False)
    parts.append(box("Collar", (0.70, 0.16, 0.03), loc=(0, 0.05, 0.12), material=mat("plastic_black"), bevel=0.01))
    glow = mat(s, emit=1.0)
    for sx in (-1, 1):
        parts.append(_qr_bar(f"Thread{sx}", (sx * 0.25, 0.66), (sx * 0.11, 0.905), 0.125, 0.025, 0.025, glow))
    parts.append(_qr_bar("ThreadTop", (-0.11, 0.905), (0.11, 0.905), 0.125, 0.025, 0.025, glow))
    for i, a in enumerate((162, 126, 90, 54, 18)):
        t = math.radians(a)
        c = (0.32 * math.cos(t), 0, 0.98 + 0.32 * math.sin(t))
        parts += _qr_bubble(f"Arc{i}", c, 0.17, 0.11, 0.07, sm if i % 2 == 0 else mat("plastic_white"))
    ob = join("quickreply_p1_3_mesh", parts)
    parent(ob, root)
    # The emoji clamps high on the back of the phone, so it shows above the arc instead of behind it.
    _slots(root, [((-0.20, 0.02, 0.84), 1.0), ((0.11, -0.13, 0.12), 1.0), ((0, 0.086, 0.48), 1.0)])
    return root


def b_quickreply_p1_4():
    """Autocomplete: a big mechanical keyboard with glowing keys in front, the phone behind it,
    three words flying up out of it and a blinking cursor on top."""
    root = empty("quickreply_p1_4")
    s = QR_PATH[1]
    sm = mat(s, rough=0.6)
    glow = mat(s, emit=1.4)
    white = mat("plastic_white")
    kb = [box("KbBody", (0.78, 0.30, 0.07), loc=(0, -0.17, 0.0), material=sm, bevel=0.015)]
    for r in range(4):
        for c in range(10):
            if r == 0 and 3 <= c <= 6:
                continue
            lit = (r + c) % 3 == 0 or r == 2 and c in (4, 5)
            kb.append(box(f"Key{r}{c}", (0.058, 0.052, 0.035), loc=(-0.324 + c * 0.072, -0.285 + r * 0.066, 0.07),
                          material=glow if lit else white))
    kb.append(box("Space", (0.27, 0.052, 0.035), loc=(-0.324 + 4.5 * 0.072, -0.285, 0.07), material=glow))
    kit.tilt(kb, rx=0.10, pivot=(0, -0.32, 0))
    kb.append(box("KbFeet", (0.66, 0.04, 0.03), loc=(0, -0.05, 0), material=mat("plastic_black")))
    parts = kb + _qr_dock("Dk", 0.54, 0.30, s, h=0.12, xy=(0, 0.17))
    parts += _qr_phone("Ph", (0, 0.17, 0.09), 0.46, 0.86, 0.08, s, collar=False)
    parts.append(box("Collar", (0.52, 0.14, 0.03), loc=(0, 0.17, 0.12), material=mat("plastic_black"), bevel=0.01))
    # Three words flying up out of the keyboard, each bigger than the last.
    words = [((0.29, -0.16, 0.40), 0.18, 0.08, -0.25), ((0.27, -0.03, 0.82), 0.24, 0.09, 0.2), ((0.05, 0.10, 1.34), 0.32, 0.11, 0.0)]
    for i, ((x, y, z), w, h, rot) in enumerate(words):
        wd = box(f"Word{i}", (w, 0.08, h), loc=(x, y, z), material=glow, bevel=0.025)
        kit.tilt(wd, ry=rot, pivot=(x, y, z + h / 2))
        parts.append(wd)
    parts.append(box("Cursor", (0.04, 0.06, 0.26), loc=(0.27, 0.10, 1.30), material=white))
    ob = join("quickreply_p1_4_mesh", parts)
    parent(ob, root)
    _slots(root, [((-0.23, 0.17, 0.62), 1.0), ((0.12, -0.14, 0.12), 1.0), ((0, 0.29, 0.12), 1.0)])
    return root


def _qr_yellow_phone(pre, w, h, d, bezel="plastic_black"):
    """The EMOJI heroes stand on a yellow dock with a yellow phone."""
    e = QR_PATH[2]
    return _qr_dock(pre, 0.66, 0.46, e) + _qr_phone(f"{pre}Ph", (0, 0.03, 0.10), w, h, d, e, bezel=bezel)


def b_quickreply_p2_3():
    """Thumbs-Down (more on bosses): a giant yellow thumb down on a spring above the phone."""
    root = empty("quickreply_p2_3")
    e = QR_PATH[2]
    ym = mat(e)
    dark = mat("#d29a22", rough=0.6)
    parts = _qr_yellow_phone("Y", 0.46, 0.80, 0.08)
    top = 0.90
    sx = 0.07
    steel = mat("metal_light")
    parts += [cyl("SpringBase", 0.07, 0.025, loc=(sx, 0.03, top - 0.005), material=mat("plastic_black"), verts=10),
              cyl("SpringPost", 0.015, 0.22, loc=(sx, 0.03, top), material=steel, verts=6)]
    for i in range(5):
        parts += _ring(f"Coil{i}", 0.055, 8, 0.022, (sx, 0.03, top + 0.05 + i * 0.038), steel)
    fz = 1.11
    parts += [box("Fist", (0.34, 0.24, 0.22), loc=(0, 0.03, fz), material=ym, bevel=0.05),
              box("Thumb", (0.10, 0.13, 0.17), loc=(-0.11, 0.03, fz - 0.13), material=ym, bevel=0.035),
              box("Nail", (0.07, 0.14, 0.05), loc=(-0.11, 0.03, fz - 0.125), material=dark, bevel=0.012),
              box("Wrist", (0.24, 0.20, 0.11), loc=(0.02, 0.03, fz + 0.21), material=ym, bevel=0.03)]
    # Four curled fingers across the front, the creases repeated on the back.
    for i in range(4):
        z = fz + 0.035 + i * 0.05
        parts.append(_cylx(f"Finger{i}", 0.028, 0.27, (0.02, 0.03 - 0.12, z), dark, verts=8))
        if i % 2 == 0:
            parts.append(box(f"Crease{i}", (0.22, 0.012, 0.02), loc=(0.02, 0.03 + 0.12 + 0.002, z + 0.02), material=dark))
    ob = join("quickreply_p2_3_mesh", parts)
    parent(ob, root)
    _slots(root, [((-0.23, 0.03, 0.60), 1.0), ((0.11, -0.13, QR_DOCK_H), 1.0), ((0, 0.175, QR_DOCK_H), 1.0)])
    return root


def b_quickreply_p2_4():
    """Party Parrot: a bright low-poly bird in a party hat on top of the phone, confetti round it,
    the phone's border yellow. An original bird, not anybody's picture."""
    root = empty("quickreply_p2_4")
    e = QR_PATH[2]
    parts = _qr_yellow_phone("Y", 0.50, 0.90, 0.09, bezel=e)
    red, blue, teal = mat("red", rough=0.6), mat("blue", rough=0.6), mat("teal", rough=0.6)
    black, white, ym = mat("plastic_black"), mat("plastic_white"), mat(e)
    top, y0 = 1.0, 0.03
    parts += [box("FootL", (0.05, 0.13, 0.035), loc=(-0.05, y0, top - 0.01), material=black),
              box("FootR", (0.05, 0.13, 0.035), loc=(0.05, y0, top - 0.01), material=black),
              ball("Body", 0.12, loc=(0, y0 + 0.01, top + 0.15), material=red, scale=(0.85, 0.8, 1.25)),
              ball("Belly", 0.08, loc=(0, y0 - 0.06, top + 0.12), material=ym, scale=(0.85, 0.5, 1.2)),
              ball("Head", 0.095, loc=(0, y0 - 0.02, top + 0.35), material=red)]
    for sx in (-1, 1):
        parts += [ball(f"Patch{sx}", 0.05, loc=(sx * 0.07, y0 - 0.04, top + 0.36), material=white, scale=(0.5, 1, 1)),
                  ball(f"Eye{sx}", 0.022, loc=(sx * 0.093, y0 - 0.05, top + 0.37), material=black)]
        wing = box(f"Wing{sx}", (0.04, 0.13, 0.18), loc=(sx * 0.095, y0 + 0.04, top + 0.08), material=blue, bevel=0.012)
        tip = box(f"WingTip{sx}", (0.04, 0.08, 0.07), loc=(sx * 0.095, y0 + 0.06, top + 0.03), material=teal, bevel=0.01)
        kit.tilt([wing, tip], rx=0.30, ry=sx * 0.08, pivot=(sx * 0.095, y0 + 0.04, top + 0.26))
        parts += [wing, tip]
    beak = box("Beak", (0.07, 0.06, 0.10), loc=(0, y0 - 0.09, top + 0.35), material=white, taper=0.3)
    kit.tilt(beak, rx=math.pi / 2 + 0.45, pivot=(0, y0 - 0.09, top + 0.35))
    jaw = box("Jaw", (0.05, 0.04, 0.035), loc=(0, y0 - 0.10, top + 0.285), material=black)
    parts += [beak, jaw]
    # A long tail down the back of the phone, in two colours.
    for i, (dx, m) in enumerate(((-0.035, blue), (0.035, red))):
        f = box(f"Tail{i}", (0.06, 0.03, 0.32), loc=(dx, y0 + 0.11, top - 0.22), material=m, bevel=0.01)
        kit.tilt(f, rx=-0.2, ry=dx * 3, pivot=(dx, y0 + 0.11, top + 0.08))
        parts.append(f)
    # The party hat, jaunty, with a glowing pompom: the crown.
    hz = top + 0.43
    hat = [cyl("Hat", 0.075, 0.18, loc=(0, y0 - 0.02, hz), material=mat("pink", rough=0.6), verts=8, radius_top=0.008),
           cyl("HatBand", 0.068, 0.025, loc=(0, y0 - 0.02, hz + 0.03), material=ym, verts=8, radius_top=0.058),
           ball("Pompom", 0.04, loc=(0, y0 - 0.02, hz + 0.19), material=mat(e, emit=1.5))]
    kit.tilt(hat, rx=-0.15, ry=0.25, pivot=(0, y0 - 0.02, hz))
    parts += hat
    # Confetti in the air round the bird and a few pieces on the dock.
    cols = (mat("pink", rough=0.6), teal, blue, mat(e, emit=1.5))
    for i in range(12):
        a = 2 * math.pi * i / 12 + 0.2
        r = 0.26 + 0.06 * ((i * 7) % 3) / 2
        z = top + 0.08 + 0.42 * ((i * 5) % 12) / 11
        x, y = r * math.cos(a), y0 + 0.8 * r * math.sin(a)
        cf = box(f"Conf{i}", (0.06, 0.06, 0.014), loc=(x, y, z), material=cols[i % 4])
        kit.tilt(cf, rx=0.4 + i * 0.7, ry=i * 1.1, pivot=(x, y, z + 0.007))
        parts.append(cf)
    for i, (x, y) in enumerate(((-0.24, -0.15), (-0.14, -0.18), (-0.06, -0.14), (0.24, 0.16))):
        parts.append(box(f"DockConf{i}", (0.05, 0.05, 0.012), loc=(x, y, QR_DOCK_H - 0.004), material=cols[i % 4], rot_z=i * 0.8))
    ob = join("quickreply_p2_4_mesh", parts)
    parent(ob, root)
    _slots(root, [((-0.25, 0.03, 0.62), 1.0), ((0.12, -0.14, QR_DOCK_H), 1.0), ((0, 0.19, QR_DOCK_H), 1.0)])
    return root


def tower_quickreply(tiers):
    return tower_parts("quickreply", tiers)


TOWER_PART_BUILDERS["quickreply_core"] = b_quickreply_core
for _p in range(3):
    for _t in (1, 2):
        TOWER_PART_BUILDERS[f"quickreply_m{_p}_{_t}"] = globals()[f"b_quickreply_m{_p}_{_t}"]
    for _t in (3, 4):
        TOWER_PART_BUILDERS[f"quickreply_p{_p}_{_t}"] = globals()[f"b_quickreply_p{_p}_{_t}"]


# --- thumbtacks (tower parts)

# --- Thumbtacks (7.7). Somebody dropped the box: a push pin as tall as an Intern stands in a block
# of cork, the box lies on its side in front, tacks rolling out. Slot0 (SHARPER) on the cork beside
# the giant pin, at the back. Slot1 (SUPPLY) on the floor against the right flank. Slot2 (HEALTH
# AND SAFETY) on the cork, front left. Heroes keep the two free slots as clear pads at the front.

TT_ACCENT = "#d24b4b"
TT_PATH = ("#d24b4b", "#d9a05b", "#f2c641")
TT_CORK = "#a9825a"


def _tt_mats():
    return {
        "red": mat(TT_ACCENT, rough=0.5),
        "steel": mat("metal_light", metal=0.6, rough=0.35),
        "white": mat("plastic_white", rough=0.6),
        "char": mat("charcoal"),
        "cork": mat(TT_CORK, rough=0.95),
        "brown": mat(TT_PATH[1]),
        "card": mat("cardboard"),
        "yellow": mat(TT_PATH[2], rough=0.6),
        "brass": mat(TT_PATH[2], metal=0.6, rough=0.35),
    }


def _tt_pin(pre, c, s=1.0, head=None, collar=None, pin=0.44, rx=0.0, ry=0.0):
    """A push pin standing on its point at c: steel pin, flange, grip, head and a cap.
    Height pin + 0.34 * s. Leans by rx / ry round the point."""
    m = _tt_mats()
    x, y, z = c
    hm = head or m["red"]
    cm = collar or hm
    z1 = z + pin
    parts = [cyl(f"{pre}Pin", 0.008 * s, pin, loc=(x, y, z), material=m["steel"], verts=8, radius_top=0.045 * s),
             cyl(f"{pre}Flange", 0.13 * s, 0.035 * s, loc=(x, y, z1), material=cm, verts=12),
             cyl(f"{pre}Grip", 0.07 * s, 0.16 * s, loc=(x, y, z1 + 0.03 * s), material=cm, verts=12, radius_top=0.08 * s),
             cyl(f"{pre}Head", 0.16 * s, 0.12 * s, loc=(x, y, z1 + 0.19 * s), material=hm, verts=12, bevel=0.015 * s),
             cyl(f"{pre}Cap", 0.11 * s, 0.03 * s, loc=(x, y, z1 + 0.31 * s), material=hm, verts=12, radius_top=0.07 * s)]
    if rx or ry:
        kit.tilt(parts, rx=rx, ry=ry, pivot=(x, y, z))
    return parts


def _tt_tack(pre, c, col, lie=0.0, rz=0.0, s=1.0, up=False):
    """One loose drawing pin on a surface at c: a disc head with a short pin. lie tips it over on
    its side (the rim stays on the surface); up stands it on its head, point in the air."""
    m = _tt_mats()
    x, y, z = c
    r = 0.06 * s
    lift = r * math.sin(lie)
    hm = col if not isinstance(col, str) else (m[col] if col in ("red", "yellow") else mat(col, rough=0.5))
    head = cyl(f"{pre}H", r, 0.025 * s, loc=(x, y, z + lift), material=hm, verts=8)
    pin = cyl(f"{pre}P", 0.014 * s, 0.10 * s, loc=(x, y, z + lift + 0.025 * s), material=m["steel"], verts=6, radius_top=0.003)
    parts = [head, pin]
    if lie:
        kit.tilt(parts, rx=lie, rz=rz, pivot=(x, y, z + lift))
    return parts


def _tt_carton(pre, c, w, d, h, rz=0.0):
    """The dropped tack box lying on its side, open end to the front (-Y before rz), lid flat on
    the ground in front of it, a few tacks still inside. c is the bottom centre."""
    m = _tt_mats()
    x, y, z = c
    t = 0.025
    parts = [box(f"{pre}Bot", (w, d, t), loc=(x, y, z), material=m["white"]),
             box(f"{pre}Top", (w, d, t), loc=(x, y, z + h - t), material=m["white"]),
             box(f"{pre}L", (t, d, h - 2 * t), loc=(x - w / 2 + t / 2, y, z + t), material=m["white"]),
             box(f"{pre}R", (t, d, h - 2 * t), loc=(x + w / 2 - t / 2, y, z + t), material=m["white"]),
             box(f"{pre}Back", (w - 2 * t, t, h - 2 * t), loc=(x, y + d / 2 - t / 2, z + t), material=m["white"]),
             # A red band round the box: the brand-free colour of the tower.
             box(f"{pre}BandTop", (w * 0.5, d + 0.01, 0.012), loc=(x, y, z + h), material=m["red"]),
             box(f"{pre}BandBack", (w * 0.5, 0.012, h), loc=(x, y + d / 2, z), material=m["red"]),
             box(f"{pre}BandL", (0.012, d * 0.7, h * 0.6), loc=(x - w / 2 - 0.005, y + d * 0.1, z + h * 0.2), material=m["red"]),
             box(f"{pre}BandR", (0.012, d * 0.7, h * 0.6), loc=(x + w / 2 + 0.005, y + d * 0.1, z + h * 0.2), material=m["red"]),
             box(f"{pre}Lid", (w * 0.96, d * 0.55, 0.015), loc=(x, y - d / 2 - d * 0.29, z), material=m["red"])]
    parts += _tt_tack(f"{pre}In0", (x - 0.06, y - 0.02, z + t), m["red"], lie=1.2, rz=0.4)
    parts += _tt_tack(f"{pre}In1", (x + 0.06, y + 0.01, z + t), "blue", lie=1.3, rz=-0.6)
    kit.tilt(parts, rz=rz, pivot=(x, y, z))
    return parts


def _tt_cork(w, d, h=0.12, xy=(0, 0)):
    """The block of cork the whole thing is stuck in, with a red edge so the colour reads."""
    m = _tt_mats()
    x, y = xy
    parts = [box("Cork", (w, d, h), loc=(x, y, 0), material=m["cork"], bevel=0.015)]
    # Old pin holes and a few crumbs on the sides, so no face is bare.
    for i, (px, py) in enumerate(((-0.2, -0.1), (0.15, 0.2), (-0.05, 0.22), (0.24, -0.05))):
        parts.append(cyl(f"Hole{i}", 0.018, 0.004, loc=(x + px * w / 0.64, y + py * d / 0.56, h), material=m["char"], verts=6))
    return parts


def b_thumbtacks_core():
    root = empty("thumbtacks_core")
    m = _tt_mats()
    parts = _tt_cork(0.64, 0.56)
    parts += _tt_carton("Box", (0.12, -0.06, 0.12), 0.28, 0.22, 0.18, rz=-0.22)
    spill = [((0.06, -0.24, 0.12), m["red"], 1.25, 0.3), ((0.17, -0.25, 0.12), "blue", 0.0, 0.0),
             ((0.27, -0.21, 0.12), m["red"], 1.3, -0.8), ((0.0, -0.17, 0.12), "yellow", 1.35, 1.2),
             ((0.24, -0.31, 0.0), "blue", 1.3, -1.57), ((0.10, -0.30, 0.0), m["red"], 0.0, 0.0),
             ((0.22, 0.20, 0.12), "yellow", 1.2, -2.0), ((-0.02, -0.31, 0.0), m["red"], 1.35, -1.57)]
    for i, (c, col, lie, rz) in enumerate(spill):
        parts += _tt_tack(f"Spill{i}", c, col, lie=lie, rz=rz)
    parts += _tt_pin("Giant", (0.08, 0.13, 0.12), pin=0.44, rx=0.06, ry=0.05)
    parent(join("thumbtacks_core_mesh", parts), root)
    _slots(root, [((-0.19, 0.15, 0.12), 1.0), ((0.40, 0.08, 0.0), 1.0), ((-0.19, -0.16, 0.12), 1.0)])
    return root


# Modules. SHARPER: more pins beside the giant one. SUPPLY: a desk drawer full of boxes on the
# floor. HEALTH AND SAFETY: a tape measure, then glue. Each stands on its own origin.

def b_thumbtacks_m0_1():
    """Brass Tacks: a second big pin with a brass head and a red collar."""
    root = empty("thumbtacks_m0_1")
    m = _tt_mats()
    parts = _tt_pin("Brass", (0, 0, 0), s=0.72, head=m["brass"], collar=m["red"], pin=0.34, rx=-0.14)
    parent(join("thumbtacks_m0_1_mesh", parts), root)
    return root


def _tt_pushpin(pre, c, shaft, rx=0.0, ry=0.0):
    """A long map pin: a steel shaft and a red grip with a wide top."""
    m = _tt_mats()
    x, y, z = c
    parts = [cyl(f"{pre}Shaft", 0.006, shaft, loc=(x, y, z), material=m["steel"], verts=6, radius_top=0.018),
             cyl(f"{pre}Foot", 0.06, 0.025, loc=(x, y, z + shaft), material=m["red"], verts=10),
             cyl(f"{pre}Grip", 0.04, 0.15, loc=(x, y, z + shaft + 0.025), material=m["red"], verts=10, radius_top=0.05),
             cyl(f"{pre}Top", 0.08, 0.05, loc=(x, y, z + shaft + 0.175), material=m["red"], verts=10)]
    kit.tilt(parts, rx=rx, ry=ry, pivot=(x, y, z))
    return parts


def b_thumbtacks_m0_2():
    """Push Pins: three long red pins of different heights, splayed outward."""
    root = empty("thumbtacks_m0_2")
    parts = (_tt_pushpin("PinA", (-0.03, 0.02, 0), 0.60, rx=-0.10)
             + _tt_pushpin("PinB", (0.04, 0.06, 0), 0.43, rx=-0.20)
             + _tt_pushpin("PinC", (-0.02, -0.06, 0), 0.26, rx=0.25))
    parent(join("thumbtacks_m0_2_mesh", parts), root)
    return root


def _tt_drawer(pre="Drw", tall=False):
    """An open desk drawer, 0.20 x 0.28 x 0.20, front panel to the camera, full of small boxes."""
    m = _tt_mats()
    w, d, h, t = 0.20, 0.28, 0.18, 0.02
    parts = [box(f"{pre}Bot", (w, d, t), loc=(0, 0, 0), material=m["brown"]),
             box(f"{pre}L", (t, d, h), loc=(-w / 2 + t / 2, 0, 0), material=m["brown"]),
             box(f"{pre}R", (t, d, h), loc=(w / 2 - t / 2, 0, 0), material=m["brown"]),
             box(f"{pre}Back", (w, t, h), loc=(0, d / 2 - t / 2, 0), material=m["brown"]),
             box(f"{pre}Front", (w + 0.03, 0.03, h + 0.04), loc=(0, -d / 2 - 0.005, 0), material=m["brown"], bevel=0.008),
             box(f"{pre}Handle", (0.10, 0.025, 0.03), loc=(0, -d / 2 - 0.03, h * 0.55), material=m["steel"])]
    # Tier 1 shows them standing up out of the drawer; under the tipped box they sit lower.
    hs = (0.26, 0.20, 0.23, 0.29) if tall else (0.17, 0.14, 0.15, 0.17)
    for i, (bx, by, bh, col) in enumerate(((-0.04, -0.07, hs[0], "red"), (0.045, -0.06, hs[1], "white"),
                                            (-0.04, 0.06, hs[2], "card"), (0.045, 0.07, hs[3], "red"))):
        parts.append(box(f"{pre}Small{i}", (0.07, 0.10, bh), loc=(bx, by, t), material=m[col]))
    return parts


def b_thumbtacks_m1_1():
    """Desk Drawer: an open brown drawer, full of small boxes of tacks."""
    root = empty("thumbtacks_m1_1")
    parent(join("thumbtacks_m1_1_mesh", _tt_drawer(tall=True)), root)
    return root


def b_thumbtacks_m1_2():
    """Spilled Box: the drawer with a second box tipped over on top, tacks running down the side."""
    root = empty("thumbtacks_m1_2")
    m = _tt_mats()
    parts = _tt_drawer()
    # A brown box lying on the drawer, its open end over the outer (+X) edge.
    bx = [box("TopBox", (0.20, 0.22, 0.17), loc=(0.0, 0.0, 0.20), material=m["brown"], bevel=0.008),
          box("TopBoxMouth", (0.012, 0.16, 0.12), loc=(0.101, 0.0, 0.225), material=m["char"]),
          box("TopBoxFlap", (0.06, 0.20, 0.012), loc=(0.13, 0.0, 0.36), material=m["card"])]
    kit.tilt(bx[2], ry=-0.9, pivot=(0.10, 0.0, 0.365))
    kit.tilt(bx, ry=0.22, pivot=(0.10, 0.0, 0.20))
    parts += bx
    # The stream down the side and a heap at the foot.
    cols = ("red", "blue", "yellow", "red", "blue")
    for i, z in enumerate((0.25, 0.19, 0.13, 0.07)):
        parts += _tt_tack(f"Fall{i}", (0.125, 0.035 * ((i % 2) * 2 - 1), z), cols[i], lie=1.45, rz=-1.57 + 0.2 * i, s=0.7)
    parts.append(cyl("Heap", 0.05, 0.05, loc=(0.125, -0.04, 0), material=m["red"], verts=10, radius_top=0.02))
    parts += _tt_tack("HeapA", (0.12, -0.05, 0.05), "blue", lie=1.2, rz=3.1, s=0.7)
    parent(join("thumbtacks_m1_2_mesh", parts), root)
    return root


def _tt_tape(pre, c, s=1.0, reach=0.36):
    """A yellow tape measure on c with its blade stuck out to the front and up."""
    m = _tt_mats()
    x, y, z = c
    parts = [box(f"{pre}Case", (0.16 * s, 0.16 * s, 0.16 * s), loc=(x, y, z), material=m["yellow"], bevel=0.025 * s),
             _cylx(f"{pre}HubL", 0.05 * s, 0.17 * s, (x, y + 0.01 * s, z + 0.08 * s), m["char"], verts=10),
             box(f"{pre}Grip", (0.17 * s, 0.06 * s, 0.05 * s), loc=(x, y + 0.05 * s, z), material=m["char"]),
             box(f"{pre}Lock", (0.04 * s, 0.04 * s, 0.03 * s), loc=(x, y - 0.03 * s, z + 0.16 * s), material=m["red"])]
    a = math.radians(55)
    y0, z0 = y - 0.08 * s, z + 0.03 * s
    blade = [box(f"{pre}Blade", (0.09 * s, reach, 0.014), loc=(x, y0 - reach / 2, z0), material=m["yellow"]),
             box(f"{pre}Mark0", (0.092 * s, 0.02, 0.018), loc=(x, y0 - reach * 0.35, z0), material=m["char"]),
             box(f"{pre}Mark1", (0.092 * s, 0.02, 0.018), loc=(x, y0 - reach * 0.7, z0), material=m["char"]),
             box(f"{pre}Hook", (0.10 * s, 0.02, 0.05), loc=(x, y0 - reach, z0 - 0.02), material=m["steel"])]
    kit.tilt(blade, rx=-a, pivot=(x, y0, z0))
    return parts + blade


def b_thumbtacks_m2_1():
    """Longer Reach: a yellow tape measure, its blade sticking out to the front."""
    root = empty("thumbtacks_m2_1")
    parent(join("thumbtacks_m2_1_mesh", _tt_tape("Tape", (0, 0, 0))), root)
    return root


def b_thumbtacks_m2_2():
    """Glue Dots: a glue pot with a yellow cap in a puddle of glue, and the tape measure."""
    root = empty("thumbtacks_m2_2")
    m = _tt_mats()
    glue = mat("paper", rough=0.2)
    px, py = -0.045, 0.03
    parts = [cyl("Puddle", 0.11, 0.012, loc=(px + 0.03, py - 0.04, 0), material=glue, verts=12),
             cyl("Pot", 0.085, 0.20, loc=(px, py, 0.0), material=m["white"], verts=12),
             cyl("Label", 0.088, 0.08, loc=(px, py, 0.05), material=m["yellow"], verts=12),
             cyl("Cap", 0.093, 0.06, loc=(px, py, 0.20), material=m["yellow"], verts=12),
             cyl("Nozzle", 0.03, 0.07, loc=(px, py, 0.26), material=m["yellow"], verts=8, radius_top=0.012),
             ball("Drip", 0.03, loc=(px + 0.09, py - 0.02, 0.14), material=glue, scale=(0.6, 0.6, 1.4))]
    parts += _tt_tape("Tape", (0.085, -0.04, 0), s=0.85, reach=0.30)
    parent(join("thumbtacks_m2_2_mesh", parts), root)
    return root


# Heroes. SHARPER grows into a bed of points, SUPPLY into boxes and a closet, HEALTH AND SAFETY
# into a giant plug on a hazard plate. Each keeps two clear pads at the front for the other paths.

def _tt_spike(pre, c, h=0.30, head=True, s=1.0):
    """A drawing pin upside down: red head on the surface, steel point up."""
    m = _tt_mats()
    x, y, z = c
    parts = [cyl(f"{pre}Pt", 0.03 * s, h, loc=(x, y, z + (0.02 if head else 0)), material=m["steel"], verts=6, radius_top=0.003)]
    if head:
        parts.append(cyl(f"{pre}Hd", 0.05 * s, 0.02, loc=(x, y, z), material=m["red"], verts=10))
    return parts


def _tt_warning(pre, c, r, back="red"):
    """A standing warning triangle facing the front, with a ! of two blocks, centred on c."""
    m = _tt_mats()
    x, y, z = c
    out = _cyly(f"{pre}Out", r, 0.03, (x, y, z), m[back], verts=3)
    inn = _cyly(f"{pre}In", r * 0.72, 0.04, (x, y - 0.002, z), m["white"], verts=3)
    # A three-sided cylinder lies apex down after _cyly: turn it apex up.
    kit.tilt([out, inn], ry=math.pi, pivot=(x, y, z))
    bar = box(f"{pre}Bar", (0.035 * r / 0.2, 0.05, 0.14 * r / 0.2), loc=(x, y, z - 0.03 * r / 0.2), material=m["char"])
    dot = box(f"{pre}Dot", (0.035 * r / 0.2, 0.05, 0.035 * r / 0.2), loc=(x, y, z - 0.09 * r / 0.2), material=m["char"])
    # The back of the sign carries the triangle too, so it reads from behind.
    return [out, inn, bar, dot]


def b_thumbtacks_p0_3():
    """Drawing Pins: a red bed of sixteen steel points, a box impaled on them, a warning on a pole."""
    root = empty("thumbtacks_p0_3")
    m = _tt_mats()
    parts = [box("Plate", (0.80, 0.76, 0.06), material=m["red"], bevel=0.012),
             box("Bed", (0.52, 0.46, 0.10), loc=(0.0, 0.13, 0.06), material=m["red"], bevel=0.015),
             box("BedRim", (0.54, 0.48, 0.03), loc=(0.0, 0.13, 0.06), material=m["char"])]
    for i in range(4):
        for j in range(4):
            parts += _tt_spike(f"S{i}{j}", (-0.18 + i * 0.12, -0.05 + j * 0.12, 0.16), h=0.30)
    # The box came down on the points; four of them stick out through the top.
    bx = [box("Victim", (0.34, 0.30, 0.20), loc=(0.02, 0.15, 0.30), material=m["card"], bevel=0.01),
          box("VictimTape", (0.08, 0.31, 0.015), loc=(0.02, 0.15, 0.50), material=m["brown"]),
          box("VictimLabel", (0.14, 0.012, 0.08), loc=(-0.05, -0.006, 0.36), material=m["white"])]
    kit.tilt(bx, ry=0.10, rx=0.06, pivot=(0.02, 0.15, 0.30))
    parts += bx
    for k, (sx, sy) in enumerate(((-0.06, 0.07), (0.06, 0.07), (-0.06, 0.19), (0.06, 0.19))):
        parts.append(cyl(f"Through{k}", 0.022, 0.09, loc=(sx, sy, 0.49 + sx * 0.10), material=m["steel"], verts=6, radius_top=0.003))
    # A pole at the back left with a warning triangle at 1.15.
    parts += [cyl("Pole", 0.025, 0.94, loc=(-0.25, 0.34, 0.16), material=m["steel"], verts=8),
              cyl("PoleFoot", 0.04, 0.04, loc=(-0.25, 0.34, 0.16), material=m["char"], verts=10)]
    parts += _tt_warning("Warn", (-0.21, 0.34, 1.12), 0.21)
    parent(join("thumbtacks_p0_3_mesh", parts), root)
    _slots(root, [((0.0, 0.13, 0.16), 1.0), ((0.24, -0.23, 0.06), 1.0), ((-0.24, -0.23, 0.06), 1.0)])
    return root


def b_thumbtacks_p0_4():
    """Tack Carpet: a big red roll bristling with points, half unrolled, three glowing pins on top."""
    root = empty("thumbtacks_p0_4")
    m = _tt_mats()
    glow = mat(TT_ACCENT, emit=1.0)
    cy, cz, r, ln = 0.14, 0.22, 0.22, 0.66
    parts = [_cylx("Roll", r, ln, (0, cy, cz), m["red"], verts=12),
             _cylx("CoreL", 0.07, ln + 0.04, (0, cy, cz), m["char"], verts=8),
             box("Strip", (ln, 0.50, 0.03), loc=(0, -0.13, 0), material=m["red"])]
    # The spiral shows on both ends as rings of dark red.
    dark = mat("#9c3434")
    parts.append(_cylx("Spiral", 0.16, ln + 0.02, (0, cy, cz), dark, verts=12))
    # Points all round the roll.
    k = 0
    for ring in range(4):
        x = -0.24 + ring * 0.16
        for j in range(8):
            a = 2 * math.pi * j / 8 + ring * 0.4
            # rx turns the top point to the front for 0 < a < pi: none into the floor, few at the back.
            if math.cos(a) < 0.0 or math.sin(a) < -0.5:
                continue
            sp = cyl(f"RollPt{k}", 0.025, 0.08, loc=(x, cy, cz + r - 0.01), material=m["steel"], verts=4, radius_top=0.003)
            kit.tilt(sp, rx=a, pivot=(x, cy, cz))
            parts.append(sp)
            k += 1
    # The unrolled strip: points down the middle and along the back, the corners left clear.
    for i in range(3):
        for j in range(4):
            parts += _tt_spike(f"Lane{i}{j}", (-0.06 + i * 0.06, -0.34 + j * 0.07, 0.03), h=0.09, head=False, s=0.9)
    for i in range(9):
        parts += _tt_spike(f"Back{i}", (-0.29 + i * 0.0725, -0.07, 0.03), h=0.09, head=False, s=0.9)
    # The crown: three pins in the top of the roll, the middle one tall; heads glow.
    parts += _tt_pin("Crown0", (0, cy, cz + r - 0.04), s=1.0, head=glow, pin=0.74)
    parts += _tt_pin("Crown1", (-0.12, cy, cz + r - 0.05), s=0.7, head=glow, pin=0.36, ry=-0.22)
    parts += _tt_pin("Crown2", (0.12, cy, cz + r - 0.05), s=0.7, head=glow, pin=0.36, ry=0.22)
    parent(join("thumbtacks_p0_4_mesh", parts), root)
    _slots(root, [((0, cy, cz + r), 1.0), ((0.24, -0.24, 0.03), 1.0), ((-0.24, -0.24, 0.03), 1.0)])
    return root


def _tt_carton_box(pre, c, w, d, h, rz=0.0, label=True):
    """A closed brown shipping box with tape over the top and down front and back."""
    m = _tt_mats()
    x, y, z = c
    tape = mat("wood_dark")
    parts = [box(f"{pre}", (w, d, h), loc=(x, y, z), material=m["brown"], bevel=0.012),
             box(f"{pre}TapeTop", (0.08, d + 0.01, 0.012), loc=(x, y, z + h), material=tape),
             box(f"{pre}TapeFront", (0.08, 0.012, h * 0.35), loc=(x, y - d / 2 - 0.004, z + h * 0.65), material=tape),
             box(f"{pre}TapeBack", (0.08, 0.012, h * 0.35), loc=(x, y + d / 2 + 0.004, z + h * 0.65), material=tape)]
    if label:
        parts += [box(f"{pre}Label", (0.14, 0.012, 0.10), loc=(x - w * 0.25, y - d / 2 - 0.004, z + h * 0.2), material=m["white"]),
                  box(f"{pre}LabelBar", (0.10, 0.016, 0.025), loc=(x - w * 0.25, y - d / 2 - 0.006, z + h * 0.2 + 0.06), material=m["red"]),
                  box(f"{pre}SideLabel", (0.012, 0.14, 0.10), loc=(x + w / 2 + 0.004, y, z + h * 0.25), material=m["white"]),
                  box(f"{pre}SideLabelL", (0.012, 0.14, 0.10), loc=(x - w / 2 - 0.004, y, z + h * 0.25), material=m["white"])]
    if rz:
        kit.tilt(parts, rz=rz, pivot=(x, y, z))
    return parts


def b_thumbtacks_p1_3():
    """Bulk Order: two shipping boxes on a pallet, a chute from the top one dropping two heaps."""
    root = empty("thumbtacks_p1_3")
    m = _tt_mats()
    parts = [box("Pallet", (0.74, 0.72, 0.03), loc=(0, 0, 0.05), material=mat("wood"), bevel=0.006)]
    for i, x in enumerate((-0.30, 0.0, 0.30)):
        parts.append(box(f"Runner{i}", (0.10, 0.72, 0.05), loc=(x, 0, 0), material=mat("wood_dark")))
    parts += _tt_carton_box("Low", (0.11, 0.12, 0.08), 0.50, 0.44, 0.40)
    parts += _tt_carton_box("High", (0.12, 0.15, 0.48), 0.42, 0.36, 0.35, rz=0.08)
    # The chute: a steel channel from a hole in the top box, down to the front right.
    a = math.radians(32)
    ch = [box("ChuteBase", (0.14, 0.34, 0.015), loc=(0.20, -0.20, 0.56), material=m["steel"]),
          box("ChuteL", (0.015, 0.34, 0.05), loc=(0.13, -0.20, 0.56), material=m["steel"]),
          box("ChuteR", (0.015, 0.34, 0.05), loc=(0.27, -0.20, 0.56), material=m["steel"])]
    kit.tilt(ch, rx=a, pivot=(0.20, -0.03, 0.56))
    parts += ch
    parts.append(box("Hole", (0.12, 0.012, 0.08), loc=(0.20, -0.032, 0.56), material=m["char"]))
    # Two heaps on the pallet, tacks falling into the first.
    parts += [cyl("Heap0", 0.11, 0.07, loc=(0.20, -0.27, 0.08), material=m["red"], verts=10, radius_top=0.03),
              cyl("Heap1", 0.09, 0.06, loc=(0.03, -0.26, 0.08), material=m["red"], verts=10, radius_top=0.025)]
    for i, (c, col) in enumerate((((0.17, -0.31, 0.12), "blue"), ((0.24, -0.22, 0.12), "yellow"), ((0.05, -0.29, 0.11), "blue"))):
        parts += _tt_tack(f"HeapT{i}", c, col, lie=1.1, rz=i * 1.7, s=0.8)
    for i, z in enumerate((0.30, 0.22)):
        parts += _tt_tack(f"Drop{i}", (0.20 + 0.02 * i, -0.33, z), "red" if i else "blue", lie=0.8 + i, rz=i, s=0.8)
    # The big pin stuck in the top box like a flag.
    parts += _tt_pin("Flag", (0.02, 0.20, 0.83), s=0.62, pin=0.18, ry=-0.12)
    parent(join("thumbtacks_p1_3_mesh", parts), root)
    _slots(root, [((-0.25, 0.17, 0.08), 1.0), ((0.12, 0.15, 0.83), 1.0), ((-0.20, -0.24, 0.08), 1.0)])
    return root


def b_thumbtacks_p1_4():
    """Supply Closet: the steel cabinet, doors open, brown boxes on every shelf, tacks pouring out
    of the bottom, a glowing stock sign and more boxes on the roof."""
    root = empty("thumbtacks_p1_4")
    m = _tt_mats()
    st = m["steel"]
    w, d, h, y0 = 0.64, 0.44, 1.30, 0.11
    fy = y0 - d / 2
    parts = [box("Plinth", (w, d, 0.06), loc=(0, y0, 0), material=m["brown"]),
             box("CabBack", (w, 0.03, h), loc=(0, y0 + d / 2 - 0.015, 0.06), material=st),
             box("CabL", (0.03, d, h), loc=(-w / 2 + 0.015, y0, 0.06), material=st),
             box("CabR", (0.03, d, h), loc=(w / 2 - 0.015, y0, 0.06), material=st),
             box("CabTop", (w, d, 0.04), loc=(0, y0, 0.06 + h - 0.04), material=st, bevel=0.008),
             box("CabInside", (w - 0.06, 0.012, h - 0.06), loc=(0, y0 + d / 2 - 0.035, 0.06), material=m["char"])]
    # A brown band round the sides and back, vents on the back: no bare steel face.
    for sx in (-1, 1):
        parts.append(box(f"SideBand{sx}", (0.012, d * 0.8, 0.30), loc=(sx * (w / 2 + 0.004), y0, 0.55), material=m["brown"]))
    parts.append(box("BackBand", (w * 0.8, 0.012, 0.30), loc=(0, y0 + d / 2 + 0.004, 0.55), material=m["brown"]))
    for i in range(4):
        parts.append(box(f"Vent{i}", (0.30, 0.014, 0.025), loc=(0, y0 + d / 2 + 0.006, 1.0 + i * 0.05), material=m["char"]))
    for j in range(3):
        z = 0.30 + j * 0.33
        parts.append(box(f"Shelf{j}", (w - 0.06, d - 0.06, 0.02), loc=(0, y0, z), material=m["char"]))
        for i in range(3):
            col = m["brown"] if (i + j) % 2 == 0 else m["card"]
            parts.append(box(f"SBox{j}{i}", (0.17, 0.26, 0.20 - 0.03 * ((i + j) % 2)), loc=(-0.20 + i * 0.20, y0 - 0.02, z + 0.02), material=col, bevel=0.006))
            parts.append(box(f"SLabel{j}{i}", (0.08, 0.012, 0.05), loc=(-0.20 + i * 0.20, y0 - 0.156, z + 0.08), material=m["white"]))
    # Bottom: the overflow, a red heap pouring out over the plinth.
    parts += [cyl("Pour", 0.20, 0.16, loc=(0.0, y0 - 0.02, 0.06), material=m["red"], verts=10, radius_top=0.10),
              box("Spout", (0.22, 0.10, 0.05), loc=(0.0, fy - 0.02, 0.0), material=m["red"], bevel=0.01, taper=0.8)]
    for i, (c, col, lie, rz) in enumerate((((-0.10, fy + 0.02, 0.22), "blue", 1.1, 0.3), ((0.09, fy + 0.04, 0.22), "yellow", 1.2, 2.0),
                                          ((0.0, fy - 0.11, 0.05), "blue", 1.3, -0.5), ((-0.12, fy - 0.06, 0.0), "yellow", 1.2, 0.9),
                                          ((0.13, fy - 0.07, 0.0), "blue", 1.3, 2.5))):
        parts += _tt_tack(f"Out{i}", c, col, lie=lie, rz=rz, s=0.9)
    # Doors open a little past square: steel outside, brown inside.
    dw = w / 2
    for i, sx in enumerate((-1, 1)):
        hx = sx * w / 2
        dr = [box(f"Door{i}", (dw, 0.02, h - 0.04), loc=(hx - sx * dw / 2, fy - 0.01, 0.08), material=st),
              box(f"DoorIn{i}", (dw - 0.05, 0.012, h - 0.16), loc=(hx - sx * dw / 2, fy + 0.006, 0.14), material=m["brown"]),
              box(f"DoorOut{i}", (dw - 0.08, 0.012, 0.36), loc=(hx - sx * dw / 2, fy - 0.026, 0.50), material=m["brown"]),
              box(f"DoorHandle{i}", (0.03, 0.03, 0.14), loc=(hx - sx * (dw - 0.05), fy - 0.04, 0.62), material=m["char"])]
        kit.tilt(dr, rz=sx * 1.62, pivot=(hx, fy - 0.01, 0))
        parts += dr
    # The roof: a glowing brown stock sign with a pin on it, and two more boxes.
    sign_glow = mat(TT_PATH[1], emit=1.5)
    parts += [box("SignPostL", (0.03, 0.03, 0.08), loc=(-0.22, fy + 0.06, 1.36), material=m["char"]),
              box("SignPostR", (0.03, 0.03, 0.08), loc=(0.22, fy + 0.06, 1.36), material=m["char"]),
              box("SignFrame", (0.60, 0.05, 0.17), loc=(0, fy + 0.07, 1.42), material=m["char"], bevel=0.01),
              box("Sign", (0.54, 0.02, 0.12), loc=(0, fy + 0.04, 1.445), material=sign_glow),
              cyl("SignPinHead", 0.045, 0.03, loc=(-0.04, fy + 0.03, 1.505), material=m["red"], verts=10, rot=(math.pi / 2, 0, 0)),
              box("SignPinBar", (0.12, 0.03, 0.025), loc=(0.04, fy + 0.025, 1.493), material=m["red"])]
    parts += _tt_carton_box("RoofA", (-0.12, y0 + 0.08, 1.36), 0.26, 0.22, 0.18, rz=0.15, label=False)
    parts += _tt_carton_box("RoofB", (0.14, y0 + 0.10, 1.36), 0.22, 0.20, 0.14, rz=-0.2, label=False)
    parent(join("thumbtacks_p1_4_mesh", parts), root)
    _slots(root, [((0.16, -0.31, 0.0), 1.0), ((0.0, y0, 1.36), 1.0), ((-0.15, -0.31, 0.0), 1.0)])
    return root


def _tt_hazard_plate(w=0.80, d=0.76, h=0.05):
    """A yellow plate with a border of yellow and black hazard blocks."""
    m = _tt_mats()
    parts = [box("Hazard", (w, d, h), material=m["yellow"], bevel=0.01)]
    seg, bw = 0.10, 0.07
    k = 0
    for i in range(int(w / seg)):
        if i % 2 == 0:
            x = -w / 2 + seg * (i + 0.5)
            for sy in (-1, 1):
                parts.append(box(f"HzX{k}", (seg, bw, h + 0.006), loc=(x, sy * (d / 2 - bw / 2 + 0.002), 0), material=m["char"]))
                k += 1
    for j in range(int(d / seg)):
        if j % 2 == 1:
            y = -d / 2 + seg * (j + 0.5)
            for sx in (-1, 1):
                parts.append(box(f"HzY{k}", (bw, seg, h + 0.006), loc=(sx * (w / 2 - bw / 2 + 0.002), y, 0), material=m["char"]))
                k += 1
    return parts


def _tt_plug(pre, c, s=1.0, prong=0.34):
    """A giant white mains plug on its back, three steel prongs pointing up, the cord out of the
    -X side. c is the bottom centre."""
    m = _tt_mats()
    x, y, z = c
    bw, bd, bh = 0.40 * s, 0.30 * s, 0.60 * s
    parts = [box(f"{pre}Body", (bw, bd, bh), loc=(x, y, z), material=m["white"], bevel=0.03 * s),
             box(f"{pre}Face", (bw * 0.86, bd * 0.86, 0.02), loc=(x, y, z + bh), material=m["char"]),
             box(f"{pre}Grip", (bw + 0.01, bd * 0.5, bh * 0.25), loc=(x, y, z + bh * 0.15), material=m["yellow"]),
             box(f"{pre}Fuse", (bw * 0.4, 0.012, bh * 0.3), loc=(x, y + bd / 2 + 0.004, z + bh * 0.5), material=m["char"]),
             box(f"{pre}Prong0", (0.07 * s, 0.035 * s, prong), loc=(x - 0.10 * s, y - 0.06 * s, z + bh), material=m["steel"]),
             box(f"{pre}Prong1", (0.07 * s, 0.035 * s, prong), loc=(x + 0.10 * s, y - 0.06 * s, z + bh), material=m["steel"]),
             box(f"{pre}Prong2", (0.035 * s, 0.08 * s, prong * 1.18), loc=(x, y + 0.07 * s, z + bh), material=m["steel"]),
             _cylx(f"{pre}Boot", 0.07 * s, 0.10 * s, (x - bw / 2 - 0.04 * s, y, z + 0.12 * s), m["char"], verts=10)]
    return parts, (x, y + 0.07 * s, z + bh + prong * 1.18)


def _tt_coil(pre, c, n=3):
    m = _tt_mats()
    x, y, z = c
    parts = []
    for i in range(n):
        parts += _ring(f"{pre}{i}", 0.09 - 0.008 * i, 10, 0.045, (x, y, z + 0.0225 + i * 0.045), m["char"])
    return parts


def _tt_hardhat(pre, c, s=1.0):
    m = _tt_mats()
    x, y, z = c
    return [cyl(f"{pre}Brim", 0.17 * s, 0.025, loc=(x, y - 0.02 * s, z), material=m["yellow"], verts=14),
            cyl(f"{pre}Crown", 0.13 * s, 0.07 * s, loc=(x, y, z + 0.02), material=m["yellow"], verts=12),
            ball(f"{pre}Dome", 0.13 * s, loc=(x, y, z + 0.09 * s), material=m["yellow"], subdiv=2, scale=(1, 1.05, 0.75)),
            box(f"{pre}Ridge", (0.05 * s, 0.25 * s, 0.04 * s), loc=(x, y, z + 0.15 * s), material=m["yellow"], bevel=0.01)]


def b_thumbtacks_p2_3():
    """Upturned Plug: a giant plug on its back on a hazard plate, a hard hat hung on the earth pin."""
    root = empty("thumbtacks_p2_3")
    m = _tt_mats()
    parts = _tt_hazard_plate()
    plug, tip = _tt_plug("Plug", (0.04, 0.12, 0.05), prong=0.40)
    parts += plug
    parts += _tt_coil("Coil", (-0.27, 0.22, 0.05))
    parts.append(box("Cord", (0.10, 0.05, 0.04), loc=(-0.20, 0.17, 0.05), material=m["char"]))
    parts += _tt_hardhat("Hat", (tip[0], tip[1], tip[2] - 0.07))
    parent(join("thumbtacks_p2_3_mesh", parts), root)
    _slots(root, [((-0.22, -0.22, 0.05), 1.0), ((0.25, -0.23, 0.05), 1.0), (tip, 1.0)])
    return root


def _tt_bollard(pre, c, h=0.42):
    m = _tt_mats()
    x, y, z = c
    parts = [cyl(f"{pre}Foot", 0.07, 0.03, loc=(x, y, z), material=m["char"], verts=10)]
    for i in range(4):
        parts.append(cyl(f"{pre}Band{i}", 0.045, h / 4, loc=(x, y, z + 0.03 + i * h / 4), material=m["yellow"] if i % 2 == 0 else m["char"], verts=10))
    parts.append(ball(f"{pre}Cap", 0.05, loc=(x, y, z + 0.03 + h), material=m["yellow"]))
    return parts


def b_thumbtacks_p2_4():
    """Risk Assessment: the plug cordoned off, a tall A-frame sign, a clipboard, a beacon on a pole."""
    root = empty("thumbtacks_p2_4")
    m = _tt_mats()
    parts = _tt_hazard_plate()
    plug, tip = _tt_plug("Plug", (0.10, 0.12, 0.05), s=0.70, prong=0.30)
    parts += plug
    # Two bollards and a chain sagging between them, in front of the plug.
    for i, sx in enumerate((-1, 1)):
        parts += _tt_bollard(f"Bol{i}", (sx * 0.30, -0.02, 0.05))
    n = 9
    for i in range(n):
        t0, t1 = i / n, (i + 1) / n
        x0, x1 = -0.30 + 0.60 * t0, -0.30 + 0.60 * t1
        z0 = 0.47 - 0.16 * math.sin(math.pi * t0)
        z1 = 0.47 - 0.16 * math.sin(math.pi * t1)
        link = box(f"Chain{i}", (math.hypot(x1 - x0, z1 - z0) * 1.05, 0.025, 0.025), loc=((x0 + x1) / 2, -0.02, (z0 + z1) / 2 - 0.0125),
                   material=m["yellow"] if i % 2 else m["char"])
        kit.tilt(link, ry=-math.atan2(z1 - z0, x1 - x0), pivot=((x0 + x1) / 2, -0.02, (z0 + z1) / 2))
        parts.append(link)
    # The A-frame: two yellow panels leaning together at the back left, a ! on both faces.
    ax, ay, lean = -0.21, 0.20, 0.17
    for k, sy in enumerate((-1, 1)):
        pn = [box(f"Panel{k}", (0.36, 0.03, 0.93), loc=(ax, ay, 0.05), material=m["yellow"], bevel=0.01),
              box(f"PanelRim{k}", (0.38, 0.02, 0.06), loc=(ax, ay, 0.92), material=m["char"]),
              box(f"PanelBar{k}", (0.07, 0.04, 0.34), loc=(ax, ay, 0.45), material=m["char"]),
              box(f"PanelDot{k}", (0.07, 0.04, 0.07), loc=(ax, ay, 0.32), material=m["char"])]
        kit.tilt(pn, rx=sy * lean, pivot=(ax, ay, 0.98))
        parts += pn
    # The clipboard hangs on the right bollard.
    cx_, cy_ = 0.30, -0.08
    clip = [box("Clipboard", (0.16, 0.02, 0.22), loc=(cx_, cy_, 0.16), material=mat("wood"), bevel=0.006),
            box("ClipSheet", (0.13, 0.01, 0.17), loc=(cx_, cy_ - 0.012, 0.18), material=mat("paper")),
            box("ClipTick", (0.08, 0.012, 0.03), loc=(cx_, cy_ - 0.018, 0.29), material=m["yellow"]),
            box("ClipLine", (0.10, 0.012, 0.02), loc=(cx_, cy_ - 0.018, 0.23), material=m["char"]),
            box("ClipClamp", (0.07, 0.03, 0.04), loc=(cx_, cy_, 0.36), material=m["steel"])]
    parts += clip
    # The beacon on a pole at the back right, glowing orange.
    parts += [cyl("BeaconFoot", 0.07, 0.04, loc=(0.30, 0.27, 0.05), material=m["char"], verts=10),
              cyl("BeaconPole", 0.025, 1.21, loc=(0.30, 0.27, 0.05), material=m["yellow"], verts=8),
              cyl("BeaconBase", 0.07, 0.04, loc=(0.30, 0.27, 1.26), material=m["char"], verts=10),
              cyl("Beacon", 0.065, 0.13, loc=(0.30, 0.27, 1.30), material=mat("orange", emit=1.5), verts=10, radius_top=0.05),
              ball("BeaconTop", 0.05, loc=(0.30, 0.27, 1.43), material=mat("orange", emit=1.5))]
    parent(join("thumbtacks_p2_4_mesh", parts), root)
    _slots(root, [((-0.22, -0.24, 0.05), 1.0), ((0.22, -0.24, 0.05), 1.0), (tip, 1.0)])
    return root


def tower_thumbtacks(tiers):
    return tower_parts("thumbtacks", tiers)


TOWER_PART_BUILDERS["thumbtacks_core"] = b_thumbtacks_core
for _p in range(3):
    for _t in (1, 2):
        TOWER_PART_BUILDERS[f"thumbtacks_m{_p}_{_t}"] = globals()[f"b_thumbtacks_m{_p}_{_t}"]
    for _t in (3, 4):
        TOWER_PART_BUILDERS[f"thumbtacks_p{_p}_{_t}"] = globals()[f"b_thumbtacks_p{_p}_{_t}"]


# --- selfservice (tower parts)

# --- Self-Service (7.8). "Please hold": a teal kiosk with a slanted screen and a queue post with a
# ribbon. Slot0 (KNOWLEDGE BASE) on the left flank at the foot, Slot1 (CHATBOT) on top of the
# screen head, Slot2 (PORTAL) on the right flank, a module on its own pole.
# Path 1 modules grow towards -X from their origin, path 3 modules stand on their pole at the
# origin, path 2 modules stand on top of their origin.

SS_ACCENT = "#3fa7a0"
SS_PATH = ("#3fa7a0", "#7fb6e3", "#8fa0b4")
SS_TILT = -0.5


def _ss_mats():
    return {
        "black": mat("plastic_black", rough=0.6),
        "char": mat("charcoal"),
        "white": mat("plastic_white", rough=0.5),
        "steel": mat("metal_light", metal=0.6, rough=0.35),
        "screen": mat("screen", emit=1.2),
        "lit": mat("plastic_white", emit=1.0),
        "paper": mat("plastic_white", rough=0.5),  # paper and white plastic read the same: one material
        "teal": mat(SS_PATH[0], rough=0.6),
        "blue": mat(SS_PATH[1], rough=0.6),
        "grey": mat(SS_PATH[2], rough=0.6),
    }


def _ss_qmark(cx, y, cz, s, material, pre="Q"):
    """A question mark from five blocks, in the XZ plane at depth y, centred on (cx, cz)."""
    u = 0.034 * s
    spec = [((-1.5, 1.5), (1.5, 2.5)),   # top bar
            ((0.5, 1.5), (0.0, 2.5)),    # right side, down to the middle
            ((-0.5, 1.5), (-0.5, 0.5)),  # middle bar
            ((-0.5, 0.5), (-1.5, 0.0)),  # stem
            ((-0.5, 0.5), (-2.8, -2.0))]  # dot
    parts = []
    for i, ((x0, x1), (z0, z1)) in enumerate(spec):
        parts.append(box(f"{pre}{i}", ((x1 - x0) * u, 0.012, (z1 - z0) * u), loc=(cx + (x0 + x1) / 2 * u, y, cz + z0 * u),
                         material=material))
    return parts


def _ss_head(x, y, z, w=0.44, h=0.36, pre="Head", screen=None, q=True):
    """The slanted black head with a big lit screen and a white question mark. Stands on (x, y, z),
    leans back. Returns (parts, top) where top is the middle of its top edge (for Slot1)."""
    m = _ss_mats()
    d = 0.12
    parts = [box(f"{pre}Box", (w, d, h), loc=(x, y, z), material=m["black"], bevel=0.015),
             box(f"{pre}Screen", (w - 0.05, 0.012, h - 0.06), loc=(x, y - d / 2 - 0.004, z + 0.03),
                 material=screen or m["screen"]),
             # The back is a service hatch, so the head is not a bare slab from behind.
             box(f"{pre}Hatch", (w * 0.6, 0.012, h * 0.5), loc=(x, y + d / 2 + 0.004, z + h * 0.3), material=m["char"]),
             box(f"{pre}Cap", (w * 0.5, 0.06, 0.03), loc=(x, y + 0.01, z + h - 0.01), material=m["char"])]
    if q:
        parts += _ss_qmark(x, y - d / 2 - 0.014, z + h * 0.52, 1.0, m["lit"], pre=f"{pre}Q")
    kit.tilt(parts, rx=SS_TILT, pivot=(x, y, z))
    top = (x, y + 0.01 - (h + 0.02) * math.sin(SS_TILT), z + (h + 0.02) * math.cos(SS_TILT))
    return parts, top


def _ss_kiosk(x=0.0, y=0.04, col=SS_ACCENT, hgt=0.72, w=0.34, d=0.26, head_w=0.44, base=True, pre="K"):
    """Black foot plate, a slightly tapered column in col with a white band, a ticket slot with a
    ticket, the slanted screen head on top. Returns (parts, slot1 point)."""
    m = _ss_mats()
    z0 = 0.06 if base else 0.0
    parts = []
    if base:
        parts.append(box(f"{pre}Foot", (w + 0.06, d + 0.16, 0.06), loc=(x, y, 0), material=m["black"], bevel=0.01))
    parts += [box(f"{pre}Column", (w, d, hgt), loc=(x, y, z0), material=mat(col, rough=0.6), bevel=0.02, taper=0.92),
              box(f"{pre}Band", (w - 0.01, d + 0.012, 0.07), loc=(x, y, z0 + hgt * 0.62), material=m["white"]),
              box(f"{pre}Slot", (0.20, 0.03, 0.045), loc=(x, y - d / 2 + 0.005, z0 + hgt * 0.40), material=m["black"]),
              # Back: a charcoal service door with vent slats.
              box(f"{pre}Door", (w * 0.62, 0.012, hgt * 0.42), loc=(x, y + d / 2 - 0.004, z0 + 0.08), material=m["char"])]
    for i in range(3):
        parts.append(box(f"{pre}Vent{i}", (w * 0.5, 0.016, 0.02), loc=(x, y + d / 2, z0 + hgt * 0.75 + i * 0.04), material=m["char"]))
    tk = box(f"{pre}Ticket", (0.13, 0.006, 0.17), loc=(x, y - d / 2 - 0.01, z0 + hgt * 0.40 - 0.15), material=m["paper"])
    kit.tilt(tk, rx=0.35, pivot=(x, y - d / 2 - 0.01, z0 + hgt * 0.40))
    parts.append(tk)
    head, top = _ss_head(x, y - 0.02, z0 + hgt - 0.02, w=head_w, pre=f"{pre}Head")
    return parts + head, top


def _ss_post(x, y, h=0.60, pre="Post"):
    """A queue post: round black foot, a steel pole, a ball on top."""
    m = _ss_mats()
    return [cyl(f"{pre}Foot", 0.10, 0.035, loc=(x, y, 0), material=m["black"], verts=14, bevel=0.008),
            cyl(f"{pre}Pole", 0.022, h - 0.07, loc=(x, y, 0.035), material=m["steel"], verts=8),
            cyl(f"{pre}Top", 0.04, 0.05, loc=(x, y, h - 0.05), material=m["steel"], verts=10)]


def _ss_ribbon(a, b, z, material, pre="Rib", sag=0.05, w=0.06):
    """A ribbon from a to b (x, y) at height z, sagging in the middle: two strips."""
    mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
    parts = []
    for i, (p, q) in enumerate(((a, (mx, my)), ((mx, my), b))):
        za, zb = (z, z - sag) if i == 0 else (z - sag, z)
        cx, cy, cz = (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (za + zb) / 2
        ln = math.hypot(q[0] - p[0], q[1] - p[1])
        ang = math.atan2(q[1] - p[1], q[0] - p[0])
        r = box(f"{pre}{i}", (ln * 1.04, 0.014, w), loc=(cx, cy, cz - w / 2), material=material)
        kit.tilt(r, ry=-math.atan2(zb - za, ln), pivot=(cx, cy, cz))
        kit.tilt(r, rz=ang, pivot=(cx, cy, cz))
        parts.append(r)
    return parts


def b_selfservice_core():
    root = empty("selfservice_core")
    m = _ss_mats()
    parts, top = _ss_kiosk()
    parts += _ss_post(-0.26, -0.25)
    parts.append(box("RibClip", (0.05, 0.03, 0.10), loc=(0.09, -0.105, 0.51), material=m["steel"]))
    parts += _ss_ribbon((-0.26, -0.25), (0.09, -0.12), 0.58, m["teal"], sag=0.06, w=0.07)
    parent(join("selfservice_core_mesh", parts), root)
    _slots(root, [((-0.20, 0.07, 0), 1.0), ((top[0], top[1], top[2] - 0.02), 1.0), ((0.33, 0.06, 0), 1.0)])
    return root


# Modules.

def b_selfservice_m0_1():
    """Send the FAQ: a teal folder rack with three folders, standing against the left flank."""
    root = empty("selfservice_m0_1")
    m = _ss_mats()
    cx = -0.12
    parts = [box("Foot", (0.24, 0.22, 0.03), loc=(cx, 0, 0), material=m["char"], bevel=0.006),
             box("Rack", (0.22, 0.12, 0.52), loc=(cx, 0.04, 0.03), material=m["teal"], bevel=0.012)]
    for i in range(3):
        z = 0.08 + i * 0.15
        parts.append(box(f"Pocket{i}", (0.22, 0.06, 0.07), loc=(cx, -0.05, z), material=m["teal"], bevel=0.006))
        f = box(f"Folder{i}", (0.18, 0.02, 0.17), loc=(cx, -0.045, z + 0.02), material=m["white"])
        kit.tilt(f, rx=0.25, pivot=(cx, -0.045, z + 0.02))
        parts.append(f)
        parts.append(box(f"FolderTab{i}", (0.07, 0.024, 0.035), loc=(cx + 0.04, -0.05, z + 0.15), material=m["char"]))
    parent(join("selfservice_m0_1_mesh", parts), root)
    return root


def b_selfservice_m0_2():
    """Send the Wiki: a narrow teal bookcase with coloured spines, an info sign on top."""
    root = empty("selfservice_m0_2")
    m = _ss_mats()
    cx, w, d, h = -0.12, 0.22, 0.26, 0.62
    parts = [box("Back", (w, 0.025, h), loc=(cx, d / 2 - 0.0125, 0), material=m["teal"]),
             box("SideL", (0.025, d, h), loc=(cx - w / 2 + 0.0125, 0, 0), material=m["teal"]),
             box("SideR", (0.025, d, h), loc=(cx + w / 2 - 0.0125, 0, 0), material=m["teal"])]
    cols = (m["teal"], m["white"], m["char"], m["paper"], m["black"])
    for j in range(4):
        parts.append(box(f"Shelf{j}", (w, d, 0.025), loc=(cx, 0, j * 0.2), material=m["teal"]))
        if j == 3:
            break
        for i in range(4):
            hb = 0.15 - 0.02 * ((i + j) % 2)
            parts.append(box(f"Book{j}{i}", (0.04, d - 0.05, hb), loc=(cx - 0.065 + i * 0.043, -0.01, j * 0.2 + 0.025),
                             material=cols[(i + 2 * j) % 5]))
    # An info sign: a round teal disc with a white i on both faces.
    parts += [cyl("SignPole", 0.015, 0.06, loc=(cx, 0.02, h), material=m["steel"], verts=6),
              _cyly("Sign", 0.095, 0.03, (cx, 0.02, h + 0.15), m["teal"], verts=14)]
    for k, sy in enumerate((-1, 1)):
        yy = 0.02 + sy * 0.019
        parts += [box(f"IDot{k}", (0.03, 0.012, 0.03), loc=(cx, yy, h + 0.19), material=m["lit"]),
                  box(f"IStem{k}", (0.03, 0.012, 0.08), loc=(cx, yy, h + 0.09), material=m["lit"])]
    parent(join("selfservice_m0_2_mesh", parts), root)
    return root


def _ss_bubble(c, w, h, material, pre="Bub"):
    """A speech bubble standing on edge, facing the front, with a tail down-left and three dots
    on both faces."""
    x, y, z = c
    m = _ss_mats()
    parts = [box(f"{pre}Body", (w, 0.08, h), loc=(x, y, z), material=material, bevel=0.03)]
    tail = box(f"{pre}Tail", (0.07, 0.07, 0.09), loc=(x - w * 0.25, y, z - 0.06), material=material, taper=0.3)
    kit.tilt(tail, rx=math.pi, pivot=(x - w * 0.25, y, z - 0.015))
    kit.tilt(tail, ry=0.35, pivot=(x - w * 0.25, y, z))
    parts.append(tail)
    for sy in (-1, 1):
        for i in range(3):
            parts.append(box(f"{pre}Dot{sy}{i}", (0.04, 0.012, 0.04), loc=(x + (i - 1) * w * 0.27, y + sy * 0.042, z + h * 0.5 - 0.02),
                             material=m["lit"]))
    return parts


def b_selfservice_m1_1():
    """Canned Response: a light blue speech bubble on a short stalk on the head."""
    root = empty("selfservice_m1_1")
    m = _ss_mats()
    parts = [cyl("Stalk", 0.025, 0.09, loc=(0, 0, 0), material=m["char"], verts=8)]
    parts += _ss_bubble((0.02, 0, 0.11), 0.34, 0.23, m["blue"])
    parent(join("selfservice_m1_1_mesh", parts), root)
    return root


def _ss_robot_head(c, s, pre="Bot", visor=False):
    """A white robot head standing on c: two glowing light blue eyes (or a visor), light blue ears,
    an antenna with a glowing ball. Returns parts; the top of the ball is at c.z + 0.38 * s."""
    x, y, z = c
    m = _ss_mats()
    glow = mat(SS_PATH[1], emit=1.5)
    w, d, h = 0.26 * s, 0.22 * s, 0.21 * s
    parts = [cyl(f"{pre}Neck", 0.05 * s, 0.05 * s, loc=(x, y, z), material=m["char"], verts=10),
             box(f"{pre}Head", (w, d, h), loc=(x, y, z + 0.04 * s), material=m["white"], bevel=0.035 * s),
             box(f"{pre}Face", (w * 0.82, 0.012, h * 0.62), loc=(x, y - d / 2 - 0.002, z + 0.04 * s + h * 0.2), material=m["black"]),
             box(f"{pre}Back", (w * 0.6, 0.012, h * 0.4), loc=(x, y + d / 2 + 0.002, z + 0.04 * s + h * 0.3), material=m["blue"]),
             cyl(f"{pre}Ant", 0.012 * s, 0.10 * s, loc=(x, y, z + 0.04 * s + h - 0.01), material=m["steel"], verts=6),
             ball(f"{pre}Tip", 0.035 * s, loc=(x, y, z + 0.04 * s + h + 0.12 * s), material=glow)]
    if visor:
        parts.append(box(f"{pre}Visor", (w * 0.72, 0.016, h * 0.22), loc=(x, y - d / 2 - 0.008, z + 0.04 * s + h * 0.42), material=glow))
    else:
        for i, sx in enumerate((-1, 1)):
            parts.append(box(f"{pre}Eye{i}", (0.055 * s, 0.016, 0.055 * s), loc=(x + sx * 0.06 * s, y - d / 2 - 0.008, z + 0.04 * s + h * 0.38),
                             material=glow))
    for i, sx in enumerate((-1, 1)):
        parts.append(_cylx(f"{pre}Ear{i}", 0.05 * s, 0.03 * s, (x + sx * (w / 2 + 0.012 * s), y, z + 0.04 * s + h * 0.5), m["blue"], verts=10))
    return parts


def b_selfservice_m1_2():
    """Chatbot: a small robot head on the screen head, its speech bubble beside it."""
    root = empty("selfservice_m1_2")
    m = _ss_mats()
    parts = _ss_robot_head((0, 0, 0), 1.0)
    parts += [box("BubArm", (0.10, 0.02, 0.02), loc=(0.17, 0, 0.15), material=m["char"])]
    parts += _ss_bubble((0.25, 0, 0.16), 0.15, 0.12, m["blue"], pre="Sb")
    parent(join("selfservice_m1_2_mesh", parts), root)
    return root


def _ss_board(pre="Pin", pole_h=0.82):
    """A grey-blue pin board on a pole at the origin, with a big red pin and a note."""
    m = _ss_mats()
    parts = [cyl(f"{pre}Foot", 0.08, 0.03, loc=(0, 0.03, 0), material=m["black"], verts=12),
             cyl(f"{pre}Pole", 0.02, pole_h, loc=(0, 0.03, 0.03), material=m["steel"], verts=8),
             box(f"{pre}Frame", (0.30, 0.045, 0.36), loc=(0, 0, 0.45), material=m["char"], bevel=0.008),
             box(f"{pre}Felt", (0.27, 0.05, 0.33), loc=(0, 0, 0.465), material=m["grey"]),
             box(f"{pre}Note", (0.14, 0.012, 0.14), loc=(0.04, -0.03, 0.52), material=m["paper"]),
             ball(f"{pre}PinHead", 0.045, loc=(0.04, -0.075, 0.65), material=mat("red", rough=0.5)),
             box(f"{pre}PinNeedle", (0.012, 0.04, 0.012), loc=(0.04, -0.04, 0.644), material=m["steel"]),
             # The back is felt too, with a strap across.
             box(f"{pre}BackFelt", (0.22, 0.012, 0.26), loc=(0, 0.028, 0.50), material=m["grey"])]
    kit.tilt(parts[4], ry=0.15, pivot=(0.04, -0.03, 0.59))
    return parts


def b_selfservice_m2_1():
    """Pinned Post: a grey-blue pin board on its own pole."""
    root = empty("selfservice_m2_1")
    parent(join("selfservice_m2_1_mesh", _ss_board(pole_h=0.77)), root)
    return root


def b_selfservice_m2_2():
    """Hold Music: the board, a grey-blue horn speaker on top of the pole, two notes."""
    root = empty("selfservice_m2_2")
    m = _ss_mats()
    glow = mat(SS_PATH[2], emit=1.3)
    parts = _ss_board(pole_h=0.93)
    horn = [cyl("HornBody", 0.05, 0.08, loc=(0, 0.03, 0.96), material=m["char"], verts=10, rot=(math.pi / 2, 0, 0)),
            _cyly("Horn", 0.13, 0.20, (0, -0.12, 0.96), m["grey"], verts=12, r2=0.045),
            _cyly("HornMouth", 0.105, 0.02, (0, -0.215, 0.96), m["char"], verts=12)]
    kit.tilt(horn, rx=0.25, pivot=(0, 0.0, 0.96))
    parts += horn + [box("Bracket", (0.05, 0.05, 0.10), loc=(0, 0.03, 0.88), material=m["char"])]
    parts += _note("NoteA", (-0.12, -0.10, 1.10), glow) + _note("NoteB", (0.01, -0.14, 1.24), glow, 0.85)
    parent(join("selfservice_m2_2_mesh", parts), root)
    return root


# Heroes.

def b_selfservice_p0_3():
    """Send to Service Desk: a teal counter with the screen on it, a big bell, a searchlight."""
    root = empty("selfservice_p0_3")
    m = _ss_mats()
    teal = m["teal"]
    brass = mat("#d9b44a", metal=0.6, rough=0.35)
    parts = [box("Plinth", (0.56, 0.36, 0.06), loc=(0, 0.02, 0), material=m["black"]),
             box("Desk", (0.60, 0.40, 0.54), loc=(0, 0.02, 0.04), material=teal, bevel=0.02),
             box("DeskBand", (0.61, 0.41, 0.07), loc=(0, 0.02, 0.36), material=m["white"]),
             box("Top", (0.66, 0.46, 0.04), loc=(0, 0.02, 0.58), material=m["white"], bevel=0.01),
             # Front: a big recessed panel; back: two drawers.
             box("Panel", (0.44, 0.012, 0.24), loc=(0, -0.185, 0.09), material=mat(SS_PATH[0], emit=0.4)),
             box("DrawerA", (0.24, 0.012, 0.14), loc=(-0.14, 0.226, 0.18), material=m["char"]),
             box("DrawerB", (0.24, 0.012, 0.14), loc=(0.14, 0.226, 0.18), material=m["char"]),
             box("HandleA", (0.10, 0.02, 0.025), loc=(-0.14, 0.234, 0.28), material=m["steel"]),
             box("HandleB", (0.10, 0.02, 0.025), loc=(0.14, 0.234, 0.28), material=m["steel"])]
    # The screen sits on the desk on a short neck.
    parts.append(box("Neck", (0.10, 0.08, 0.10), loc=(-0.08, 0.10, 0.62), material=m["char"]))
    head, top = _ss_head(-0.08, 0.10, 0.70, w=0.38, h=0.32, pre="Scr")
    parts += head
    # A service bell the size of a cake.
    parts += [cyl("BellBase", 0.11, 0.035, loc=(0.18, -0.10, 0.62), material=m["char"], verts=14),
              ball("Bell", 0.10, loc=(0.18, -0.10, 0.655), material=brass, subdiv=2, scale=(1, 1, 0.85)),
              cyl("BellStem", 0.012, 0.05, loc=(0.18, -0.10, 0.73), material=m["steel"], verts=6),
              ball("BellKnob", 0.03, loc=(0.18, -0.10, 0.79), material=brass)]
    # A searchlight on a stalk at the back right, looking out over the floor.
    lx, ly, lz = 0.22, 0.17, 1.16
    parts += [cyl("LampStalk", 0.022, lz - 0.62, loc=(lx, ly, 0.62), material=m["steel"], verts=8),
              box("LampYoke", (0.20, 0.04, 0.03), loc=(lx, ly, lz - 0.02), material=m["char"])]
    lamp = [_cyly("Lamp", 0.10, 0.18, (lx, ly - 0.02, lz + 0.06), teal, verts=12, r2=0.08),
            _cyly("LampLens", 0.085, 0.02, (lx, ly - 0.115, lz + 0.06), m["lit"], verts=12),
            _cyly("LampBack", 0.06, 0.04, (lx, ly + 0.08, lz + 0.06), m["char"], verts=10)]
    kit.tilt(lamp, rx=-0.35, pivot=(lx, ly, lz + 0.06))
    kit.tilt(lamp, rz=0.5, pivot=(lx, ly, lz + 0.06))
    parts += lamp
    parent(join("selfservice_p0_3_mesh", parts), root)
    _slots(root, [((-0.32, 0.0, 0), 1.0), ((top[0], top[1], top[2] - 0.02), 1.0), ((0.46, 0.0, 0), 1.0)])
    return root


def _ss_wing(x, pre, glow, h=1.32, w=0.20, d=0.30):
    """A tall teal bookcase wing with teal light lines along the shelves."""
    m = _ss_mats()
    teal = m["teal"]
    parts = [box(f"{pre}Back", (w, 0.03, h), loc=(x, d / 2 - 0.015, 0), material=teal),
             box(f"{pre}SideL", (0.03, d, h), loc=(x - w / 2 + 0.015, 0, 0), material=teal),
             box(f"{pre}SideR", (0.03, d, h), loc=(x + w / 2 - 0.015, 0, 0), material=teal),
             box(f"{pre}Top", (w + 0.02, d + 0.02, 0.04), loc=(x, 0, h), material=teal, bevel=0.01),
             # Outside the back gets a charcoal panel and a light line, so it is not bare.
             box(f"{pre}BackPanel", (w * 0.7, 0.012, h * 0.7), loc=(x, d / 2 + 0.002, h * 0.12), material=m["char"]),
             box(f"{pre}BackLine", (0.03, 0.016, h * 0.62), loc=(x, d / 2 + 0.006, h * 0.16), material=glow)]
    cols = (m["white"], m["char"], m["paper"], m["black"], m["grey"])
    for j in range(5):
        z = j * 0.33
        parts += [box(f"{pre}Shelf{j}", (w - 0.04, d - 0.03, 0.03), loc=(x, -0.01, z), material=teal),
                  box(f"{pre}Light{j}", (w - 0.04, 0.02, 0.022), loc=(x, -d / 2 + 0.005, z + 0.004), material=glow)]
        if j == 4:
            break
        for i in range(3):
            hb = 0.24 - 0.04 * ((i + j) % 3)
            parts.append(box(f"{pre}Book{j}{i}", (0.05, d - 0.08, hb), loc=(x - 0.055 + i * 0.055, 0.0, z + 0.03),
                             material=cols[(i + j * 2) % 5]))
    return parts


def b_selfservice_p0_4():
    """Knowledge Base: the kiosk between two tall bookcase wings, a big magnifier on top."""
    root = empty("selfservice_p0_4")
    m = _ss_mats()
    glow = mat("#7fe8dc", emit=1.6)
    parts = [box("Plinth", (0.76, 0.34, 0.04), loc=(0, 0, 0), material=m["black"])]
    k, top = _ss_kiosk(x=0, y=0.0, w=0.30, d=0.24, head_w=0.34, base=False, pre="K")
    for o in k:
        o.data.transform(kit.Matrix.Translation((0, 0, 0.04)))
    parts += k
    for i, sx in enumerate((-1, 1)):
        wing = _ss_wing(sx * 0.28, f"W{i}", glow)
        for o in wing:
            o.data.transform(kit.Matrix.Translation((0, 0, 0.04)))
        parts += wing
    # The magnifier rests on the right wing, its handle leaning down into the gap above the kiosk.
    cx, cy, cz, r = 0.10, 0.0, 1.56, 0.16
    parts += _ring("Mag", r, 14, 0.055, (cx, cy, cz), m["teal"], axis="y")
    parts.append(_cyly("Lens", r - 0.01, 0.025, (cx, cy, cz), glow, verts=14))
    a = math.radians(225)
    hx, hz = cx + (r + 0.09) * math.cos(a), cz + (r + 0.09) * math.sin(a)
    hd = box("Handle", (0.18, 0.065, 0.065), loc=(hx, cy, hz - 0.0325), material=m["char"], bevel=0.01)
    kit.tilt(hd, ry=-a, pivot=(hx, cy, hz))
    parts.append(hd)
    parent(join("selfservice_p0_4_mesh", parts), root)
    _slots(root, [((-0.40, -0.30, 0), 1.0), ((-0.28, 0.0, 1.40), 0.85), ((0.27, -0.30, 0), 1.0)])
    return root


def _ss_streamer(x, pts, material, pre="Strip", w=0.12):
    """A paper strip through the (y, z) points at x."""
    parts = []
    for i in range(len(pts) - 1):
        (y0, z0), (y1, z1) = pts[i], pts[i + 1]
        my, mz = (y0 + y1) / 2, (z0 + z1) / 2
        ln = math.hypot(y1 - y0, z1 - z0) + 0.012
        b = box(f"{pre}{i}", (w, ln, 0.008), loc=(x, my, mz - 0.004), material=material)
        kit.tilt(b, rx=math.atan2(z1 - z0, y1 - y0), pivot=(x, my, mz))
        parts.append(b)
    return parts


def b_selfservice_p1_3():
    """Ticket Queue: a ticket machine with a drum, a long strip of tickets curling to the floor, a
    red number board above, and two queue posts with a light blue ribbon in front."""
    root = empty("selfservice_p1_3")
    m = _ss_mats()
    blue = m["blue"]
    red = mat("red", emit=1.6)
    parts = [cyl("Foot", 0.20, 0.05, loc=(0, 0.06, 0), material=m["black"], verts=14, bevel=0.01),
             cyl("Pole", 0.11, 0.66, loc=(0, 0.06, 0.05), material=blue, verts=12),
             cyl("PoleBand", 0.115, 0.06, loc=(0, 0.06, 0.40), material=m["white"], verts=12),
             box("Housing", (0.44, 0.32, 0.28), loc=(0, 0.06, 0.70), material=blue, bevel=0.03),
             box("HousingFront", (0.36, 0.012, 0.18), loc=(0, -0.105, 0.75), material=m["char"]),
             box("Mouth", (0.18, 0.03, 0.03), loc=(0, -0.11, 0.80), material=m["black"]),
             box("Button", (0.08, 0.03, 0.06), loc=(0.12, -0.11, 0.86), material=red),
             # Back: a key panel, a little door.
             box("Door", (0.26, 0.012, 0.16), loc=(0, 0.224, 0.76), material=m["char"]),
             box("Lock", (0.04, 0.02, 0.04), loc=(0.08, 0.232, 0.82), material=m["steel"]),
             # The ticket roll on top, between two blue cheeks.
             box("CheekL", (0.04, 0.20, 0.20), loc=(-0.19, 0.08, 0.96), material=blue, bevel=0.01),
             box("CheekR", (0.04, 0.20, 0.20), loc=(0.19, 0.08, 0.96), material=blue, bevel=0.01),
             _cylx("Roll", 0.11, 0.30, (0, 0.08, 1.08), m["paper"], verts=14),
             _cylx("Core", 0.04, 0.38, (0, 0.08, 1.08), m["char"], verts=8),
             # The number board on a stalk.
             cyl("BoardStalk", 0.02, 0.18, loc=(0, 0.18, 1.06), material=m["steel"], verts=8),
             box("Board", (0.40, 0.08, 0.17), loc=(0, 0.18, 1.22), material=m["char"], bevel=0.015),
             box("Digits", (0.30, 0.09, 0.11), loc=(0, 0.18, 1.25), material=red),
             box("DigitGap", (0.02, 0.095, 0.11), loc=(0, 0.18, 1.25), material=m["char"])]
    # The strip: out of the mouth, down the front, curling on the floor.
    pts = [(-0.11, 0.81), (-0.17, 0.74), (-0.21, 0.62), (-0.23, 0.48), (-0.23, 0.34), (-0.21, 0.20),
           (-0.17, 0.09), (-0.11, 0.02), (-0.04, 0.008), (0.02, 0.03), (0.03, 0.08), (-0.01, 0.12), (-0.06, 0.10), (-0.07, 0.06)]
    parts += _ss_streamer(-0.0, pts, m["paper"])
    for i, (yy, zz) in enumerate(pts[1:7:2]):
        parts.append(box(f"Perf{i}", (0.12, 0.006, 0.012), loc=(0, yy - 0.006, zz), material=blue))
    # The queue in front.
    for i, sx in enumerate((-1, 1)):
        parts += _ss_post(sx * 0.30, -0.33, pre=f"Post{i}")
    parts += _ss_ribbon((-0.30, -0.33), (0.30, -0.33), 0.56, blue, sag=0.07)
    parent(join("selfservice_p1_3_mesh", parts), root)
    _slots(root, [((-0.18, 0.08, 0), 1.0), ((0, 0.08, 1.20), 1.0), ((0.36, 0.08, 0), 1.0)])
    return root


def b_selfservice_p1_4():
    """AI Assistant: the kiosk becomes a robot torso, a big white head with a visor, two screens
    held out like hands, an antenna on top."""
    root = empty("selfservice_p1_4")
    m = _ss_mats()
    blue = m["blue"]
    glow = mat(SS_PATH[1], emit=1.5)
    parts = [box("Foot", (0.40, 0.36, 0.06), loc=(0, 0.04, 0), material=m["black"], bevel=0.01),
             box("Waist", (0.28, 0.22, 0.54), loc=(0, 0.04, 0.06), material=blue, bevel=0.02, taper=0.85),
             box("WaistBand", (0.26, 0.23, 0.06), loc=(0, 0.04, 0.30), material=m["white"]),
             box("Torso", (0.46, 0.32, 0.46), loc=(0, 0.04, 0.60), material=blue, bevel=0.04),
             box("Chest", (0.30, 0.012, 0.24), loc=(0, -0.122, 0.72), material=m["white"]),
             _cyly("ChestLight", 0.07, 0.02, (0, -0.135, 0.84), glow, verts=12),
             box("BackPack", (0.30, 0.06, 0.30), loc=(0, 0.22, 0.68), material=m["char"], bevel=0.015),
             box("BackLine", (0.20, 0.07, 0.03), loc=(0, 0.22, 0.90), material=glow),
             cyl("Neck", 0.07, 0.10, loc=(0, 0.04, 1.06), material=m["char"], verts=10)]
    # The big head: white, a light blue visor all the way across, ears, an antenna.
    hz = 1.14
    parts += [box("Head", (0.44, 0.34, 0.32), loc=(0, 0.04, hz), material=m["white"], bevel=0.05),
              box("Face", (0.38, 0.012, 0.18), loc=(0, -0.132, hz + 0.08), material=m["black"]),
              box("Visor", (0.34, 0.02, 0.08), loc=(0, -0.14, hz + 0.13), material=glow),
              box("HeadBack", (0.26, 0.012, 0.14), loc=(0, 0.212, hz + 0.10), material=blue),
              cyl("Ant", 0.014, 0.20, loc=(0.10, 0.06, hz + 0.31), material=m["steel"], verts=6),
              ball("AntTip", 0.045, loc=(0.10, 0.06, hz + 0.55), material=glow)]
    for i, sx in enumerate((-1, 1)):
        parts.append(_cylx(f"Ear{i}", 0.08, 0.05, (sx * 0.245, 0.04, hz + 0.16), blue, verts=12))
    # Arms with a screen each instead of hands.
    for i, sx in enumerate((-1, 1)):
        parts.append(_cylx(f"Shoulder{i}", 0.07, 0.06, (sx * 0.25, 0.04, 0.94), m["white"], verts=10))
        arm = box(f"Arm{i}", (0.06, 0.06, 0.22), loc=(sx * 0.28, 0.0, 0.76), material=m["char"])
        kit.tilt(arm, rx=0.45, pivot=(sx * 0.28, 0.0, 0.94))
        parts.append(arm)
        scr = [box(f"Pad{i}", (0.20, 0.035, 0.15), loc=(sx * 0.30, -0.13, 0.66), material=m["char"], bevel=0.008),
               box(f"PadScreen{i}", (0.17, 0.012, 0.12), loc=(sx * 0.30, -0.152, 0.675), material=m["screen"]),
               box(f"PadBack{i}", (0.12, 0.012, 0.08), loc=(sx * 0.30, -0.108, 0.70), material=blue)]
        kit.tilt(scr, rx=-0.45, pivot=(sx * 0.30, -0.13, 0.66))
        parts += scr
    parent(join("selfservice_p1_4_mesh", parts), root)
    _slots(root, [((-0.20, 0.14, 0), 1.0), ((0, 0.04, 1.60), 1.0), ((0.36, 0.16, 0), 1.0)])
    return root


def b_selfservice_p2_3():
    """Search Bar: a wide screen on the grey-blue column with a long white search bar and a
    magnifier, a turning lamp on top."""
    root = empty("selfservice_p2_3")
    m = _ss_mats()
    grey = m["grey"]
    parts = [box("Foot", (0.40, 0.40, 0.06), loc=(0, 0.04, 0), material=m["black"], bevel=0.01),
             box("Column", (0.30, 0.24, 0.74), loc=(0, 0.04, 0.06), material=grey, bevel=0.02, taper=0.9),
             box("Band", (0.29, 0.25, 0.07), loc=(0, 0.04, 0.48), material=m["white"]),
             box("Slot", (0.20, 0.03, 0.045), loc=(0, -0.08, 0.36), material=m["black"]),
             box("ColDoor", (0.18, 0.012, 0.30), loc=(0, 0.162, 0.12), material=m["char"]),
             box("Yoke", (0.20, 0.10, 0.12), loc=(0, 0.06, 0.78), material=m["char"])]
    # The wide screen, leaning back a little.
    sz, sy = 0.86, 0.02
    scr = [box("Frame", (0.80, 0.10, 0.36), loc=(0, sy, sz), material=grey, bevel=0.02),
           box("Screen", (0.74, 0.012, 0.29), loc=(0, sy - 0.054, sz + 0.035), material=m["screen"]),
           box("Bar", (0.52, 0.016, 0.085), loc=(-0.06, sy - 0.062, sz + 0.14), material=m["lit"]),
           box("Cursor", (0.014, 0.02, 0.06), loc=(-0.29, sy - 0.066, sz + 0.152), material=m["char"]),
           box("BackPanel", (0.60, 0.012, 0.24), loc=(0, sy + 0.054, sz + 0.06), material=m["char"])]
    for i in range(4):
        scr.append(box(f"Vent{i}", (0.40, 0.018, 0.02), loc=(0, sy + 0.058, sz + 0.10 + i * 0.04), material=grey))
    # The magnifier: a ring of blocks with a handle, at the end of the bar.
    scr += _ring("Mag", 0.055, 10, 0.022, (0.28, sy - 0.066, sz + 0.20), m["char"], axis="y")
    hd = box("MagHandle", (0.025, 0.02, 0.08), loc=(0.33, sy - 0.066, sz + 0.06), material=m["char"])
    kit.tilt(hd, ry=-0.7, pivot=(0.33, sy - 0.066, sz + 0.11))
    scr.append(hd)
    kit.tilt(scr, rx=SS_TILT * 0.5, pivot=(0, sy, sz))
    parts += scr
    # The turning lamp on top, right of centre.
    tz = sz + 0.36 * math.cos(SS_TILT * 0.5)
    ty = sy - 0.36 * math.sin(SS_TILT * 0.5)
    parts += [cyl("LampBase", 0.08, 0.04, loc=(0.24, ty, tz - 0.01), material=m["char"], verts=12),
              cyl("LampDome", 0.07, 0.10, loc=(0.24, ty, tz + 0.03), material=mat("orange", emit=1.3), verts=12, radius_top=0.05),
              cyl("LampCap", 0.03, 0.03, loc=(0.24, ty, tz + 0.13), material=m["char"], verts=8)]
    parent(join("selfservice_p2_3_mesh", parts), root)
    _slots(root, [((-0.16, 0.07, 0), 1.0), ((-0.14, ty, tz - 0.02), 1.0), ((0.46, 0.0, 0), 1.0)])
    return root


def b_selfservice_p2_4():
    """Closed as Resolved: the kiosk in a steel door frame, a glowing green tick on the lintel and
    a big stamp with a red handle at its feet."""
    root = empty("selfservice_p2_4")
    m = _ss_mats()
    grey = m["grey"]
    green = mat("#5fd16f", emit=1.5)
    parts = [box("Sill", (0.84, 0.32, 0.04), loc=(0, 0.04, 0), material=grey, bevel=0.01)]
    for i, sx in enumerate((-1, 1)):
        parts += [box(f"Post{i}", (0.08, 0.16, 1.40), loc=(sx * 0.38, 0.04, 0.04), material=grey, bevel=0.012),
                  box(f"Hinge{i}a", (0.09, 0.05, 0.08), loc=(sx * 0.38, 0.13, 0.35), material=m["char"]),
                  box(f"Hinge{i}b", (0.09, 0.05, 0.08), loc=(sx * 0.38, 0.13, 1.05), material=m["char"]),
                  box(f"Stop{i}", (0.02, 0.10, 1.38), loc=(sx * 0.33, 0.06, 0.06), material=m["char"])]
    parts += [box("Lintel", (0.84, 0.16, 0.10), loc=(0, 0.04, 1.44), material=grey, bevel=0.012),
              box("LintelFace", (0.60, 0.012, 0.05), loc=(0, -0.042, 1.465), material=green),
              box("LintelBack", (0.60, 0.012, 0.05), loc=(0, 0.122, 1.465), material=green)]
    # The tick standing on the lintel: two arms meeting low, seen from front and back alike.
    vx, vz = -0.06, 1.58
    for name, (ex, ez) in (("TickShort", (-0.19, 1.69)), ("TickLong", (0.17, 1.695))):
        mx, mz = (vx + ex) / 2, (vz + ez) / 2
        ln = math.hypot(ex - vx, ez - vz) + 0.07
        t = box(name, (ln, 0.07, 0.07), loc=(mx, 0.04, mz - 0.035), material=green)
        kit.tilt(t, ry=-math.atan2(ez - vz, ex - vx), pivot=(mx, 0.04, mz))
        parts.append(t)
    parts.append(box("TickFoot", (0.06, 0.06, 0.06), loc=(vx, 0.04, 1.535), material=m["char"]))
    k, top = _ss_kiosk(x=0.10, y=0.04, col=SS_PATH[2], hgt=0.62, w=0.30, d=0.22, head_w=0.40, base=False, pre="K")
    for o in k:
        o.data.transform(kit.Matrix.Translation((0, 0, 0.04)))
    parts += k
    top = (top[0], top[1], top[2] + 0.04)
    # The stamp, out front, on a closed ticket.
    sx, sy = -0.20, -0.27
    parts += [box("Ticket", (0.20, 0.14, 0.01), loc=(sx + 0.03, sy, 0), material=m["paper"], rot_z=0.2),
              box("TicketTick", (0.08, 0.04, 0.012), loc=(sx + 0.10, sy - 0.03, 0), material=green, rot_z=0.9),
              box("StampPad", (0.20, 0.16, 0.04), loc=(sx, sy, 0.01), material=m["char"], bevel=0.008),
              box("StampBody", (0.18, 0.14, 0.08), loc=(sx, sy, 0.05), material=grey, bevel=0.012),
              cyl("StampNeck", 0.03, 0.12, loc=(sx, sy, 0.13), material=m["steel"], verts=8),
              ball("StampHandle", 0.075, loc=(sx, sy, 0.30), material=mat("red", rough=0.5), subdiv=2, scale=(1, 1, 1.15))]
    parent(join("selfservice_p2_4_mesh", parts), root)
    _slots(root, [((-0.10, 0.10, 0.04), 1.0), ((top[0], top[1], top[2] - 0.02), 1.0), ((0.46, 0.0, 0), 1.0)])
    return root


def tower_selfservice(tiers):
    return tower_parts("selfservice", tiers)


TOWER_PART_BUILDERS["selfservice_core"] = b_selfservice_core
for _p in range(3):
    for _t in (1, 2):
        TOWER_PART_BUILDERS[f"selfservice_m{_p}_{_t}"] = globals()[f"b_selfservice_m{_p}_{_t}"]
    for _t in (3, 4):
        TOWER_PART_BUILDERS[f"selfservice_p{_p}_{_t}"] = globals()[f"b_selfservice_p{_p}_{_t}"]


# --- keyboardsmash (tower parts)

# --- Keyboard Smash (7.9). A big black keyboard held up like a hammer on a red arm, above an old
# beige monitor with a cracked red screen, on a heavy foot plate.
# Slot0 (SLAM) sits on the raised keyboard itself and is turned with it: SLAM modules are built
# on a flat keyboard (top of the case at z=0, keys above) and the slot tilts them into place.
# Slot1 (CAPS LOCK) is the front edge of the foot plate. Slot2 (SHORTCUTS) is the left flank: the
# module clamps onto the plate edge from the floor and carries its keys on a stalk.

KS_RED = "#e5534b"
KS_PATH = ("#e5534b", "#7fb6e3", "#f2c641")
KS_BEIGE = "#d8cdab"
KS_KEYCAP = "#62676f"
# The keyboard grid: three rows of thick keys, seven columns. SLAM modules line up with it.
KS_COLS = tuple(-0.27 + 0.09 * i for i in range(7))
KS_ROWS = (-0.087, 0.0, 0.087)
KS_KB, KS_TILT = (0.0, -0.02, 1.02), 0.9


def _ks_place(parts, c, a=0.0, rz=0.0):
    """Tilt flat-built parts about X by a (back edge up), turn by rz, then move their origin to c."""
    m = Matrix.Translation(c) @ Matrix.Rotation(rz, 4, "Z") @ Matrix.Rotation(a, 4, "X")
    for o in parts:
        o.data.transform(m)
    return parts


def _ks_at(c, a, local):
    """Where a point of a flat-built keyboard ends up after _ks_place(c, a)."""
    x, y, z = local
    return (c[0] + x, c[1] + y * math.cos(a) - z * math.sin(a), c[2] + y * math.sin(a) + z * math.cos(a))


def _ks_beam(name, p0, p1, t, material, bevel=0.01):
    """A square beam t thick from p0 to p1."""
    dx, dy, dz = (p1[i] - p0[i] for i in range(3))
    ln = math.sqrt(dx * dx + dy * dy + dz * dz)
    b = box(name, (t, t, ln), loc=p0, material=material, bevel=bevel)
    kit.tilt(b, ry=math.acos(dz / ln), rz=math.atan2(dy, dx), pivot=p0)
    return b


def _ks_bar(name, p0, p1, w, y, d, material):
    """A flat bar in the x-z plane at depth y, from p0 to p1 (x, z), w wide and d thick."""
    (x0, z0), (x1, z1) = p0, p1
    ln = math.hypot(x1 - x0, z1 - z0) + w * 0.5
    mx, mz = (x0 + x1) / 2, (z0 + z1) / 2
    b = box(name, (ln, d, w), loc=(mx, y, mz - w / 2), material=material)
    kit.tilt(b, ry=-math.atan2(z1 - z0, x1 - x0), pivot=(mx, y, mz))
    return b


def _ks_star(name, c, r, material, t=0.02, upright=False):
    """An eight-point star of two crossed squares, lying flat on c or standing facing the front."""
    w = r * 1.414
    parts = [box(f"{name}A", (w, w, t), loc=c, material=material),
             box(f"{name}B", (w, w, t), loc=c, material=material, rot_z=math.pi / 4)]
    if upright:
        kit.tilt(parts, rx=math.pi / 2, pivot=(c[0], c[1], c[2] + t / 2))
    return parts


def _ks_board(pre, s=1.0, caps="key", skip=(), bracket=(0.16, 0.03), base="plastic_black"):
    """The smash keyboard, flat, round its own centre: the top of the case at z=0, the case below,
    three rows of thick keys above. caps "pyramid" gives the spiked keys of Sharp Keycaps.
    skip: (row, col) of keys left out. bracket: where the arm grips the underside (x, y)."""
    parts = [box(f"{pre}Case", (0.66 * s, 0.26 * s, 0.06 * s), loc=(0, 0, -0.06 * s), material=mat(base), bevel=0.012),
             # The underside shows when the board is turned away: a red label and two rubber feet.
             box(f"{pre}Label", (0.40 * s, 0.12 * s, 0.01), loc=(-0.08 * s, 0, -0.068 * s), material=mat(KS_RED))]
    for k, y in enumerate((-0.09, 0.09)):
        parts.append(box(f"{pre}Foot{k}", (0.56 * s, 0.035 * s, 0.015), loc=(0, y * s, -0.072 * s), material=mat("charcoal")))
    cap = mat(KS_KEYCAP, rough=0.6)
    red = mat(KS_RED)
    blue = mat(KS_PATH[1], rough=0.4)
    white = mat("plastic_white", rough=0.5)
    for r, y in enumerate(KS_ROWS):
        for c, x in enumerate(KS_COLS):
            if (r, c) in skip:
                continue
            if caps == "pyramid":
                parts.append(box(f"{pre}Spike{r}{c}", (0.076 * s, 0.076 * s, 0.075 * s), loc=(x * s, y * s, 0),
                                 material=blue if (r + c) % 2 else white, taper=0.06))
            else:
                # Escape and Enter in red: the accent shows even on the plain board.
                m = red if (r, c) in ((2, 0), (0, 6)) else cap
                parts.append(box(f"{pre}Key{r}{c}", (0.074 * s, 0.072 * s, 0.035 * s), loc=(x * s, y * s, 0),
                                 material=m, taper=0.8))
    if bracket:
        parts.append(box(f"{pre}Bracket", (0.15, 0.11, 0.035), loc=(bracket[0] * s, bracket[1] * s, -0.06 * s - 0.03),
                         material=mat("charcoal")))
    return parts


def _ks_crt(pre, x, yf, z, screen=None, crack=True, s=1.0):
    """The old beige monitor: front of the bezel at yf, standing on z. 0.40 x 0.40 x 0.40.
    Returns the parts and the height of its top."""
    beige = mat(KS_BEIGE, rough=0.7)
    dark = mat("charcoal")
    scr = screen if screen is not None else mat(KS_RED, emit=1.2)
    parts = [box(f"{pre}Foot", (0.26 * s, 0.22 * s, 0.04 * s), loc=(x, yf + 0.20 * s, z), material=beige, bevel=0.01),
             box(f"{pre}Bezel", (0.40 * s, 0.22 * s, 0.36 * s), loc=(x, yf + 0.11 * s, z + 0.04 * s), material=beige, bevel=0.025),
             box(f"{pre}Screen", (0.32 * s, 0.02 * s, 0.27 * s), loc=(x, yf - 0.004, z + 0.085 * s), material=scr, bevel=0.01),
             box(f"{pre}Button", (0.06 * s, 0.012, 0.03 * s), loc=(x + 0.12 * s, yf - 0.004, z + 0.05 * s), material=dark)]
    back = box(f"{pre}Tube", (0.32 * s, 0.28 * s, 0.17 * s), loc=(x, yf + 0.21 * s, z + 0.22 * s), material=beige, taper=0.7, bevel=0.01)
    kit.tilt(back, rx=-math.pi / 2, pivot=(x, yf + 0.21 * s, z + 0.22 * s))
    parts.append(back)
    # Vents on the back of the tube and down both flanks of the bezel, so no side is bare.
    for k in range(3):
        parts.append(box(f"{pre}Vent{k}", (0.16 * s, 0.012, 0.022 * s), loc=(x, yf + 0.38 * s + 0.004, z + (0.16 + 0.05 * k) * s), material=dark))
        for sx in (-1, 1):
            parts.append(box(f"{pre}Side{k}{sx}", (0.012, 0.15 * s, 0.022 * s), loc=(x + sx * 0.204 * s, yf + 0.11 * s, z + (0.24 + 0.05 * k) * s), material=dark))
    if crack:
        white = mat("plastic_white", rough=0.5)
        zc, yc = z + 0.22 * s, yf - 0.018
        pts = [(-0.14, 0.10), (-0.05, 0.01), (0.02, 0.06), (0.13, -0.10)]
        for k in range(3):
            (ax, az), (bx, bz) = pts[k], pts[k + 1]
            parts.append(_ks_bar(f"{pre}Crack{k}", (x + ax * s, zc + az * s), (x + bx * s, zc + bz * s), 0.022, yc, 0.012, white))
        parts.append(_ks_bar(f"{pre}Crack3", (x - 0.05 * s, zc + 0.01 * s), (x - 0.02 * s, zc - 0.10 * s), 0.02, yc, 0.012, white))
    return parts, z + 0.40 * s


def _ks_plate(pre, w, d, top=None):
    """The heavy foot plate. top: a colour for a slab over the plate (the heroes), else a red band."""
    parts = [box(f"{pre}Plate", (w, d, 0.06 if top else 0.08), material=mat("charcoal"), bevel=0.015)]
    if top:
        parts.append(box(f"{pre}Slab", (w - 0.04, d - 0.04, 0.04), loc=(0, 0, 0.06), material=mat(top), bevel=0.01))
    else:
        parts.append(box(f"{pre}Band", (w + 0.012, d + 0.012, 0.03), loc=(0, 0, 0.025), material=mat(KS_RED)))
    return parts


def _ks_arm(pre, xy, z0, top, t, hinge_r, color, grip):
    """The arm: a flange, a post up to top, a hinge, and a boom from the hinge to grip."""
    x, y = xy
    col = mat(color)
    hz = top + hinge_r * 0.5
    return [box(f"{pre}Flange", (t + 0.06, t + 0.06, 0.04), loc=(x, y, z0), material=mat("charcoal"), bevel=0.008),
            box(f"{pre}Post", (t, t, top - z0 - 0.04), loc=(x, y, z0 + 0.04), material=col, bevel=0.01),
            _cylx(f"{pre}Hinge", hinge_r, t + 0.08, (x, y, hz), mat("metal_light", metal=0.6, rough=0.35), verts=12),
            _ks_beam(f"{pre}Boom", (x, y, hz), grip, t * 0.9, col)]


def _ks_loose_keys(z):
    """Four keys knocked off, lying on the plate."""
    cap = mat(KS_KEYCAP, rough=0.6)
    out = []
    for i, (x, y, rz) in enumerate(((0.24, -0.135, 0.4), (-0.23, -0.12, -0.3), (0.245, 0.03, 0.9), (-0.10, -0.14, 0.2))):
        out.append(box(f"Loose{i}", (0.08, 0.08, 0.05), loc=(x, y, z), material=mat(KS_RED) if i == 2 else cap, taper=0.8, rot_z=rz))
    return out


def _ks_slots(root, specs):
    """_slots plus a turn per slot: specs ((x, y, z), scale, (rx, ry, rz))."""
    _slots(root, [(loc, sc) for loc, sc, _ in specs])
    for ch in root.children:
        n = ch.name.split(".")[0]
        if n.startswith("Slot"):
            ch.rotation_euler = specs[int(n[4])][2]


def b_keyboardsmash_core():
    root = empty("keyboardsmash_core")
    parts = _ks_plate("", 0.66, 0.60)
    crt, _ = _ks_crt("Crt", 0.02, -0.09, 0.08)
    parts += crt
    kb = _ks_place(_ks_board("Kb"), KS_KB, KS_TILT)
    grip = _ks_at(KS_KB, KS_TILT, (0.16, 0.03, -0.075))
    parts += kb + _ks_arm("Arm", (0.27, 0.20), 0.08, 0.94, 0.08, 0.065, KS_RED, grip)
    parts += _ks_loose_keys(0.08)
    parent(join("keyboardsmash_core_mesh", parts), root)
    _ks_slots(root, [(KS_KB, 1.0, (KS_TILT, 0, 0)), ((0, -0.245, 0.08), 1.0, (0, 0, 0)), ((-0.35, 0.05, 0), 1.0, (0, 0, 0))])
    return root


# Modules. SLAM: built on a flat keyboard (top of the case at z=0), the slot tilts it.

def b_keyboardsmash_m0_1():
    """Mechanical Keys: three tall red keys on the top row, a red impact star on the left."""
    root = empty("keyboardsmash_m0_1")
    red = mat(KS_PATH[0])
    parts = [box(f"Mech{c}", (0.084, 0.084, 0.09), loc=(KS_COLS[c], KS_ROWS[2], -0.005), material=red, taper=0.85) for c in (3, 4, 5)]
    parts += _ks_star("Hit", (-0.19, -0.03, 0.03), 0.10, red)
    parent(join("keyboardsmash_m0_1_mesh", parts), root)
    return root


def b_keyboardsmash_m0_2():
    """Rage Quit: a red steel rim round the whole board, three keys flying off, two red puffs."""
    root = empty("keyboardsmash_m0_2")
    red = mat(KS_PATH[0])
    steel = red
    w, d, t, h = 0.74, 0.32, 0.04, 0.10
    parts = [box("RimF", (w, t, h), loc=(0, -d / 2 + t / 2, -0.08), material=steel, bevel=0.008),
             box("RimB", (w, t, h), loc=(0, d / 2 - t / 2, -0.08), material=steel, bevel=0.008),
             box("RimL", (t, d - 2 * t, h), loc=(-w / 2 + t / 2, 0, -0.08), material=steel, bevel=0.008),
             box("RimR", (t, d - 2 * t, h), loc=(w / 2 - t / 2, 0, -0.08), material=steel, bevel=0.008)]
    cap = mat(KS_KEYCAP, rough=0.6)
    for i, (x, y, z, r) in enumerate(((-0.12, 0.16, 0.12, 0.5), (0.06, 0.20, 0.19, 1.1), (0.22, 0.12, 0.14, 1.9))):
        k = box(f"Fly{i}", (0.08, 0.08, 0.05), loc=(x, y, z), material=red if i == 1 else cap, taper=0.8)
        kit.tilt(k, rx=r, ry=r * 0.6)
        parts.append(k)
    for j, (x, y, z) in enumerate(((-0.22, 0.10, 0.17), (0.20, 0.06, 0.21))):
        parts += [ball(f"Puff{j}A", 0.065, loc=(x, y, z), material=red),
                  ball(f"Puff{j}B", 0.05, loc=(x + 0.07, y, z + 0.03), material=red),
                  ball(f"Puff{j}C", 0.045, loc=(x - 0.03, y, z + 0.07), material=red)]
    parent(join("keyboardsmash_m0_2_mesh", parts), root)
    return root


# CAPS LOCK: on the front edge of the plate.

def b_keyboardsmash_m1_1():
    """Wrist Rest: a light blue gel pad along the front edge."""
    root = empty("keyboardsmash_m1_1")
    parts = [box("RestBase", (0.62, 0.13, 0.02), material=mat("plastic_white", rough=0.5), bevel=0.006),
             box("Rest", (0.60, 0.12, 0.07), loc=(0, 0, 0.02), material=mat(KS_PATH[1], rough=0.4), bevel=0.03)]
    parent(join("keyboardsmash_m1_1_mesh", parts), root)
    return root


def b_keyboardsmash_m1_2():
    """Ergonomic: the two halves of a split blue keyboard standing up as a low fence, a rest in front."""
    root = empty("keyboardsmash_m1_2")
    blue = mat(KS_PATH[1], rough=0.4)
    white = mat("plastic_white", rough=0.5)
    parts = [box("Rest", (0.62, 0.08, 0.05), loc=(0, -0.025, 0), material=blue, bevel=0.02)]
    for i, sx in enumerate((-1, 1)):
        x = sx * 0.165
        half = [box(f"Half{i}", (0.28, 0.05, 0.21), loc=(x, 0.045, 0), material=blue, bevel=0.012)]
        for r in range(2):
            for c in range(3):
                half.append(box(f"HKey{i}{r}{c}", (0.07, 0.03, 0.06), loc=(x - 0.09 + c * 0.09, 0.012, 0.035 + r * 0.085), material=white))
        kit.tilt(half, rx=-0.22, rz=sx * 0.14, pivot=(x, 0.045, 0))
        parts += half
    parent(join("keyboardsmash_m1_2_mesh", parts), root)
    return root


# SHORTCUTS: from the floor at the left flank, clamped to the plate edge, keys on a stalk.

def _ks_stalk(h, col):
    return [box("Clamp", (0.09, 0.12, 0.13), loc=(0.005, 0, 0), material=mat("charcoal"), bevel=0.01),
            box("ClampLip", (0.07, 0.12, 0.025), loc=(0.02, 0, 0.13), material=mat(col, rough=0.6)),
            box("Stalk", (0.04, 0.04, h - 0.13), loc=(-0.01, 0, 0.13), material=mat("charcoal"))]


def _ks_pad(c, n, size, glow_mid=False):
    """A yellow macro pad of n x n (or 3 x 1 when n == 1) black keys, tilted towards the front left."""
    yel = mat(KS_PATH[2], rough=0.6)
    cap = mat("plastic_black", rough=0.6)
    x, y, z = c
    w, d = size
    parts = [box("Pad", (w, d, 0.06), loc=(x, y, z - 0.03), material=yel, bevel=0.012)]
    if n == 1:
        for k in range(3):
            parts.append(box(f"Hot{k}", (0.06, 0.10, 0.04), loc=(x - 0.07 + k * 0.07, y, z + 0.03), material=cap, taper=0.85))
    else:
        p = (w - 0.04) / n
        for r in range(n):
            for k in range(n):
                m = mat(KS_PATH[2], emit=1.2) if glow_mid and r == k == n // 2 else cap
                parts.append(box(f"Mac{r}{k}", (p * 0.8, p * 0.8, 0.04), loc=(x - (n - 1) * p / 2 + k * p, y - (n - 1) * p / 2 + r * p, z + 0.03),
                                 material=m, taper=0.85))
    kit.tilt(parts, rx=0.5, ry=-0.35, pivot=c)
    return parts


def b_keyboardsmash_m2_1():
    """Hotkeys: a yellow pad of three big keys on a short stalk."""
    root = empty("keyboardsmash_m2_1")
    parts = _ks_stalk(0.30, KS_PATH[2]) + _ks_pad((-0.01, 0, 0.32), 1, (0.22, 0.15))
    parent(join("keyboardsmash_m2_1_mesh", parts), root)
    return root


def b_keyboardsmash_m2_2():
    """Macro: a bigger pad of three by three on a tall stalk, a yellow curly cord down to the clamp."""
    root = empty("keyboardsmash_m2_2")
    yel = mat(KS_PATH[2], rough=0.6)
    parts = _ks_stalk(0.52, KS_PATH[2]) + _ks_pad((0.0, 0, 0.55), 3, (0.25, 0.25), glow_mid=True)
    # The cord coils down behind the stalk.
    n, r, z0, z1 = 24, 0.035, 0.16, 0.46
    for i in range(n):
        a0, a1 = 2 * math.pi * i / 6, 2 * math.pi * (i + 1) / 6
        p0 = (-0.01 + r * math.cos(a0), 0.07 + r * math.sin(a0), z0 + (z1 - z0) * i / n)
        p1 = (-0.01 + r * math.cos(a1), 0.07 + r * math.sin(a1), z0 + (z1 - z0) * (i + 1) / n)
        parts.append(_ks_beam(f"Cord{i}", p0, p1, 0.022, yel, bevel=0))
    parts.append(box("CordTop", (0.022, 0.07, 0.022), loc=(-0.01, 0.035, 0.46), material=yel))
    parent(join("keyboardsmash_m2_2_mesh", parts), root)
    return root


# Heroes. Each keeps three slots; SLAM heroes do without Slot0, and so on.

def b_keyboardsmash_p0_3():
    """Ctrl+Z: one huge red key with a white arrow back on the board, a thicker arm, the screen
    showing an undo arrow, and three yellow stars above the end of the board."""
    root = empty("keyboardsmash_p0_3")
    red = mat(KS_PATH[0])
    white = mat("plastic_white", rough=0.5)
    parts = _ks_plate("", 0.70, 0.62, top=KS_PATH[0])
    crt, _ = _ks_crt("Crt", 0.02, -0.09, 0.10, crack=False)
    parts += crt
    # The undo arrow on the screen: back along the top, round to the right, an arrowhead left.
    zc, yc = 0.10 + 0.22, -0.108
    for k, (p0, p1) in enumerate((((-0.09, 0.05), (0.08, 0.05)), ((0.08, 0.05), (0.08, -0.06)), ((0.08, -0.06), (-0.02, -0.06)),
                                  ((-0.11, 0.05), (-0.05, 0.10)), ((-0.11, 0.05), (-0.05, 0.0)))):
        parts.append(_ks_bar(f"Undo{k}", (0.02 + p0[0], zc + p0[1]), (0.02 + p1[0], zc + p1[1]), 0.03, yc, 0.012, white))
    kc, a = (0.0, -0.02, 1.16), 0.95
    skip = [(r, c) for r in range(3) for c in (3, 4, 5)]
    board = _ks_board("Kb", skip=skip)
    board.append(box("BigKey", (0.27, 0.22, 0.14), loc=(0.09, 0, -0.005), material=red, bevel=0.02, taper=0.9))
    for k, (p0, p1) in enumerate((((0.15, 0.03), (0.03, 0.03)), ((0.03, 0.03), (0.07, 0.07)), ((0.03, 0.03), (0.07, -0.01)),
                                  ((0.15, 0.03), (0.15, -0.05)))):
        dx, dy = p1[0] - p0[0], p1[1] - p0[1]
        ln = math.hypot(dx, dy) + 0.03
        board.append(box(f"Arrow{k}", (ln, 0.03, 0.02), loc=((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, 0.13),
                         material=white, rot_z=math.atan2(dy, dx)))
    parts += _ks_place(board, kc, a)
    grip = _ks_at(kc, a, (0.16, 0.03, -0.075))
    parts += _ks_arm("Arm", (0.27, 0.20), 0.10, 1.00, 0.12, 0.085, KS_PATH[0], grip)
    star = mat(KS_PATH[2], emit=1.2)
    for i, c in enumerate(((-0.30, -0.12, 1.30), (-0.17, -0.18, 1.35), (-0.36, 0.0, 1.22))):
        parts += _ks_star(f"Stun{i}", c, 0.055, star, upright=True)
    parent(join("keyboardsmash_p0_3_mesh", parts), root)
    _ks_slots(root, [(kc, 1.0, (a, 0, 0)), ((0, -0.255, 0.10), 1.0, (0, 0, 0)), ((-0.37, 0.05, 0), 1.0, (0, 0, 0))])
    return root


def b_keyboardsmash_p0_4():
    """Keyboard Warrior: the keyboard as a war hammer on a tall pole, red and black with studs; the
    monitor wears a red helmet crest; a mouse mat strapped to the pole as a shield."""
    root = empty("keyboardsmash_p0_4")
    red = mat(KS_PATH[0])
    char = mat("charcoal")
    steel = mat("metal_light", metal=0.6, rough=0.35)
    parts = _ks_plate("", 0.68, 0.64, top=KS_PATH[0])
    crt, top = _ks_crt("Crt", -0.03, -0.10, 0.10)
    parts += crt
    # The crest: a steel holder over the monitor and a fan of red bristles front to back.
    parts.append(box("CrestHolder", (0.10, 0.20, 0.03), loc=(-0.03, 0.01, top), material=steel))
    for i, (y, h, rx) in enumerate(((-0.07, 0.12, 0.45), (-0.02, 0.17, 0.2), (0.04, 0.19, -0.05), (0.10, 0.16, -0.3), (0.15, 0.11, -0.55))):
        b = box(f"Crest{i}", (0.07, 0.07, h), loc=(-0.03, y, top + 0.02), material=red, taper=0.7)
        kit.tilt(b, rx=-rx, pivot=(-0.03, y, top + 0.02))
        parts.append(b)
    px, py = 0.25, 0.10
    parts += [box("Flange", (0.14, 0.14, 0.04), loc=(px, py, 0.10), material=char, bevel=0.008),
              cyl("Pole", 0.035, 1.30, loc=(px, py, 0.14), material=char, verts=8)]
    for k, z in enumerate((0.95, 1.10, 1.25)):
        parts.append(cyl(f"Grip{k}", 0.045, 0.06, loc=(px, py, z), material=red, verts=8))
    # The hammer head: a red keyboard on its long edge across the pole, black keys on both
    # faces, steel studs on top and on both striking ends, a glowing seam along the top.
    hz = 1.40
    parts += [box("Head", (0.14, 0.56, 0.22), loc=(px, py, hz), material=red, bevel=0.015),
              box("Collar", (0.10, 0.10, 0.10), loc=(px, py, hz - 0.08), material=char),
              box("Seam", (0.05, 0.46, 0.02), loc=(px, py, hz + 0.22), material=mat(KS_PATH[0], emit=1.4))]
    cap = mat("plastic_black", rough=0.6)
    for sx in (-1, 1):
        for r in range(2):
            for c in range(5):
                parts.append(box(f"HKey{sx}{r}{c}", (0.03, 0.075, 0.07), loc=(px + sx * 0.072, py - 0.20 + c * 0.10, hz + 0.03 + r * 0.09), material=cap))
    for k, y in enumerate((-0.18, 0.38)):
        parts.append(box(f"TopStud{k}", (0.07, 0.07, 0.06), loc=(px, py + (y - 0.10) * 0.8, hz + 0.22), material=steel, taper=0.1))
    for e, sy in enumerate((-1, 1)):
        for k, (dx, dz) in enumerate(((-0.035, 0.06), (0.035, 0.06), (-0.035, 0.15), (0.035, 0.15))):
            st = box(f"EndStud{e}{k}", (0.055, 0.055, 0.06), loc=(px + dx, py + sy * 0.28, hz + dz), material=steel, taper=0.1)
            kit.tilt(st, rx=-sy * math.pi / 2, pivot=(px + dx, py + sy * 0.28, hz + dz + 0.0))
            parts.append(st)
    # The shield: a red mouse mat with a black centre and a steel boss, strapped to the pole.
    sy, sz = py - 0.07, 0.70
    parts += [box("Shield", (0.26, 0.03, 0.34), loc=(px + 0.01, sy, sz - 0.17), material=red, bevel=0.03),
              box("ShieldMid", (0.18, 0.012, 0.24), loc=(px + 0.01, sy - 0.018, sz - 0.12), material=cap, bevel=0.01),
              ball("Boss", 0.05, loc=(px + 0.01, sy - 0.03, sz), material=steel),
              box("StrapA", (0.09, 0.06, 0.03), loc=(px, py - 0.035, sz + 0.08), material=char),
              box("StrapB", (0.09, 0.06, 0.03), loc=(px, py - 0.035, sz - 0.11), material=char)]
    parent(join("keyboardsmash_p0_4_mesh", parts), root)
    _ks_slots(root, [((px, py, hz), 1.0, (0, 0, 0)), ((0, -0.27, 0.10), 1.0, (0, 0, 0)), ((-0.36, 0.05, 0), 1.0, (0, 0, 0))])
    return root


def b_keyboardsmash_p1_3():
    """Sharp Keycaps: a bigger board, almost upright, full of blue and white spikes; a strip of the
    same spikes on the front edge to show what you step on."""
    root = empty("keyboardsmash_p1_3")
    blue = KS_PATH[1]
    parts = _ks_plate("", 0.70, 0.62, top=blue)
    crt, _ = _ks_crt("Crt", 0.02, -0.09, 0.10, screen=mat(blue, emit=1.2), crack=False)
    parts += crt
    kc, a, s = (0.0, -0.04, 1.15), 1.2, 1.1
    parts += _ks_place(_ks_board("Kb", s=s, caps="pyramid"), kc, a)
    grip = _ks_at(kc, a, (0.16 * s, 0.03 * s, -0.06 * s - 0.015))
    parts += _ks_arm("Arm", (0.27, 0.20), 0.10, 0.98, 0.09, 0.07, blue, grip)
    parts.append(box("Strip", (0.62, 0.14, 0.03), loc=(0, -0.24, 0.10), material=mat("plastic_black"), bevel=0.008))
    bl, wh = mat(blue, rough=0.4), mat("plastic_white", rough=0.5)
    for r in range(2):
        for c in range(7):
            parts.append(box(f"StripSpike{r}{c}", (0.07, 0.06, 0.07), loc=(-0.27 + c * 0.09, -0.27 + r * 0.06, 0.13), material=bl if (r + c) % 2 else wh, taper=0.06))
    parent(join("keyboardsmash_p1_3_mesh", parts), root)
    _ks_slots(root, [(kc, s, (a, 0, 0)), ((0, -0.24, 0.13), 1.0, (0, 0, 0)), ((-0.37, 0.05, 0), 1.0, (0, 0, 0))])
    return root


def b_keyboardsmash_p1_4():
    """Server Rack: the black rack full of blue lights with blue vented sides, a keyboard on its
    pulled-out tray, and the smash keyboard raised on a hinge on top."""
    root = empty("keyboardsmash_p1_4")
    blue = KS_PATH[1]
    glow = mat(blue, emit=1.6)
    black = mat("plastic_black")
    char = mat("charcoal")
    steel = mat("metal_light", metal=0.6, rough=0.35)
    w, d, top = 0.48, 0.54, 1.24
    parts = [box("Plinth", (0.64, 0.60, 0.05), material=char, bevel=0.01),
             box("Rack", (w, d, top - 0.05), loc=(0, 0, 0.05), material=black, bevel=0.012)]
    yf = -d / 2
    for j, z in enumerate((0.10, 0.25, 0.40, 0.80, 0.95, 1.10)):
        parts += [box(f"Unit{j}", (w - 0.06, 0.02, 0.11), loc=(0, yf - 0.006, z), material=char),
                  box(f"UnitGlow{j}", (0.22, 0.022, 0.03), loc=(-0.08, yf - 0.012, z + 0.04), material=glow),
                  box(f"UnitLed{j}", (0.05, 0.022, 0.03), loc=(0.14, yf - 0.012, z + 0.04), material=glow if j % 2 else steel)]
    # The pulled-out tray with a keyboard on it, halfway up.
    parts += [box("TrayRailL", (0.03, 0.22, 0.04), loc=(-0.22, yf - 0.10, 0.60), material=steel),
              box("TrayRailR", (0.03, 0.22, 0.04), loc=(0.22, yf - 0.10, 0.60), material=steel),
              box("Tray", (0.44, 0.20, 0.025), loc=(0, yf - 0.10, 0.62), material=steel)]
    parts += _ks_place(_ks_board("TrayKb", s=0.6, bracket=None), (0, yf - 0.10, 0.645 + 0.036), 0.0)
    # Blue vented panels on both sides and the back.
    for sx in (-1, 1):
        parts.append(box(f"SidePanel{sx}", (0.02, d - 0.10, 1.00), loc=(sx * (w / 2 + 0.005), 0, 0.17), material=mat(blue, rough=0.5)))
        for k in range(5):
            parts.append(box(f"SideVent{sx}{k}", (0.024, d - 0.18, 0.03), loc=(sx * (w / 2 + 0.006), 0, 0.30 + k * 0.18), material=black))
    parts.append(box("BackPanel", (w - 0.10, 0.02, 1.00), loc=(0, d / 2 + 0.005, 0.17), material=mat(blue, rough=0.5)))
    for k in range(4):
        parts.append(box(f"BackPort{k}", (0.07, 0.024, 0.05), loc=(-0.12 + k * 0.08, d / 2 + 0.006, 1.02), material=black))
    parts.append(box("BackCable", (0.05, 0.03, 0.80), loc=(0.13, d / 2 + 0.02, 0.05), material=black))
    # On top: a glowing bar at the back, and the smash keyboard on a hinge at the front.
    parts.append(box("Beacon", (0.30, 0.06, 0.05), loc=(0, 0.18, top), material=glow))
    a = 1.05
    hinge = (0, -0.16, top + 0.04)
    kc = (0, hinge[1] - (-0.08 * math.cos(a) + 0.10 * math.sin(a)), hinge[2] - (-0.08 * math.sin(a) - 0.10 * math.cos(a)))
    parts += _ks_place(_ks_board("Kb", bracket=None), kc, a)
    parts += [_cylx("Hinge", 0.035, 0.36, hinge, steel, verts=10),
              box("LugL", (0.05, 0.08, 0.05), loc=(-0.15, hinge[1], top), material=char),
              box("LugR", (0.05, 0.08, 0.05), loc=(0.15, hinge[1], top), material=char)]
    for k, x in enumerate((-0.15, 0.15)):
        parts.append(box(f"Ear{k}", (0.04, 0.05, 0.08), loc=_ks_at(kc, a, (x, -0.08, -0.12)), material=char))
    parent(join("keyboardsmash_p1_4_mesh", parts), root)
    _ks_slots(root, [(kc, 1.0, (a, 0, 0)), ((0, yf - 0.10, 0.645), 0.7, (0, 0, 0)), ((-0.355, 0.05, 0), 0.9, (0, 0, 0))])
    return root


def b_keyboardsmash_p2_3():
    """Autorepeat: two keyboards one above the other on a double arm, a little apart, with yellow
    swing arcs at both ends."""
    root = empty("keyboardsmash_p2_3")
    yel = KS_PATH[2]
    parts = _ks_plate("", 0.70, 0.62, top=yel)
    crt, _ = _ks_crt("Crt", 0.0, -0.09, 0.10)
    parts += crt
    a = KS_TILT
    # The second board sits a hand above the first along its face, shifted right, so both read.
    k1 = (-0.06, 0.03, 0.98)
    k2 = (0.06, k1[1] - 0.17 * math.sin(a), k1[2] + 0.17 * math.cos(a))
    parts += _ks_place(_ks_board("KbA", bracket=(-0.16, 0.03)), k1, a)
    parts += _ks_place(_ks_board("KbB", bracket=(0.16, 0.09)), k2, a)
    parts += _ks_arm("ArmL", (-0.27, 0.20), 0.10, 0.88, 0.08, 0.065, yel, _ks_at(k1, a, (-0.16, 0.03, -0.075)))
    parts += _ks_arm("ArmR", (0.27, 0.20), 0.10, 1.19, 0.08, 0.065, yel, _ks_at(k2, a, (0.16, 0.09, -0.075)))
    glow = mat(yel, emit=1.3)
    for sx in (-1, 1):
        # Swing arcs round the hinges, just outside the reach of the boards.
        for j, rad in enumerate((0.50, 0.56)):
            pts = [(0.20 + rad * math.cos(math.radians(t)), 0.85 + rad * math.sin(math.radians(t))) for t in range(95, 166, 14)]
            for i in range(len(pts) - 1):
                p0 = (sx * 0.37, pts[i][0], pts[i][1])
                p1 = (sx * 0.37, pts[i + 1][0], pts[i + 1][1])
                parts.append(_ks_beam(f"Arc{sx}{j}{i}", p0, p1, 0.028, glow, bevel=0))
    parent(join("keyboardsmash_p2_3_mesh", parts), root)
    _ks_slots(root, [(k2, 1.0, (a, 0, 0)), ((0, -0.255, 0.10), 1.0, (0, 0, 0)), ((-0.37, 0.05, 0), 1.0, (0, 0, 0))])
    return root


def b_keyboardsmash_p2_4():
    """Any Key: one giant yellow key on a big spring, a glowing rim round it; the plain keyboard
    lies in front under it as the anvil."""
    root = empty("keyboardsmash_p2_4")
    yel = KS_PATH[2]
    glow = mat(yel, emit=1.4)
    steel = mat("metal_light", metal=0.6, rough=0.35)
    char = mat("charcoal")
    parts = _ks_plate("", 0.78, 0.72, top=yel)
    anvil = (0, -0.22, 0.16)
    parts += _ks_place(_ks_board("Kb", bracket=None), anvil, 0.0)
    sx, sy, z0, z1 = 0.0, 0.06, 0.14, 1.08
    parts += [cyl("SpringFoot", 0.14, 0.04, loc=(sx, sy, 0.10), material=char, verts=12),
              cyl("SpringCap", 0.15, 0.04, loc=(sx, sy, z1), material=char, verts=12)]
    turns, seg, r = 6, 9, 0.12
    n = turns * seg
    for i in range(n):
        a0, a1 = 2 * math.pi * i / seg, 2 * math.pi * (i + 1) / seg
        p0 = (sx + r * math.cos(a0), sy + r * math.sin(a0), z0 + (z1 - z0) * i / n)
        p1 = (sx + r * math.cos(a1), sy + r * math.sin(a1), z0 + (z1 - z0) * (i + 1) / n)
        parts.append(_ks_beam(f"Coil{i}", p0, p1, 0.04, steel, bevel=0))
    ky, kz = 0.04, 1.14
    parts += [box("Stem", (0.14, 0.14, 0.04), loc=(sx, sy, z1 + 0.03), material=char),
              box("AnyKey", (0.50, 0.50, 0.30), loc=(0, ky, kz), material=mat(yel, rough=0.5), bevel=0.03, taper=0.8),
              box("Dish", (0.34, 0.34, 0.03), loc=(0, ky, kz + 0.29), material=glow, bevel=0.01)]
    for k, (w, d, x, y) in enumerate(((0.56, 0.04, 0, ky - 0.26), (0.56, 0.04, 0, ky + 0.26), (0.04, 0.48, -0.26, ky), (0.04, 0.48, 0.26, ky))):
        parts.append(box(f"Rim{k}", (w, d, 0.04), loc=(x, y, kz - 0.01), material=glow))
    parent(join("keyboardsmash_p2_4_mesh", parts), root)
    _ks_slots(root, [(anvil, 1.0, (0, 0, 0)), ((0, 0.29, 0.10), 1.0, (0, 0, math.pi)), ((-0.41, 0.05, 0), 1.0, (0, 0, 0))])
    return root


def tower_keyboardsmash(tiers):
    return tower_parts("keyboardsmash", tiers)


TOWER_PART_BUILDERS["keyboardsmash_core"] = b_keyboardsmash_core
for _p in range(3):
    for _t in (1, 2):
        TOWER_PART_BUILDERS[f"keyboardsmash_m{_p}_{_t}"] = globals()[f"b_keyboardsmash_m{_p}_{_t}"]
    for _t in (3, 4):
        TOWER_PART_BUILDERS[f"keyboardsmash_p{_p}_{_t}"] = globals()[f"b_keyboardsmash_p{_p}_{_t}"]


# --- chair (tower parts)

# --- Office Chair (7.10). The chair is the tower: a five-star base, a blue seat and back. It rolls
# along its lane as a whole, so every module is fixed to the chair itself, never to the floor.
# Slot0 (RAMMING) under the seat, Slot1 (ROLLING) on the base, Slot2 (STURDY) on the seat top.
# Every chair (core and heroes) keeps the same seat height, back plane, lean and leg layout, so a
# module fits on all of them.

CHAIR_ACCENT = "#3e7cc9"
CHAIR_PATH = ("#e5534b", "#7fb6e3", "#6fcf7f")
CHAIR_SEAT_Z = 0.45    # underside of the seat: Slot0
CHAIR_TOP_Z = 0.55     # top of the seat: Slot2
CHAIR_LEAN = 0.10      # how far every back leans
CHAIR_WHEEL_R = 0.27   # castors from the centre
# No leg straight ahead: that leaves room for bumpers and bull bars in front.
CHAIR_LEGS = [math.radians(36 + 72 * i) for i in range(5)]
CHAIR_SWIVEL = 0.5     # how far the Swivel has turned its seat


def _chair_m():
    return {
        "blue": mat(CHAIR_ACCENT, rough=0.6),
        "char": mat("charcoal"),
        "black": mat("plastic_black", rough=0.6),
        "steel": mat("metal_light", metal=0.6, rough=0.35),
        "red": mat(CHAIR_PATH[0], rough=0.6),
        "lblue": mat(CHAIR_PATH[1], rough=0.6),
        "green": mat(CHAIR_PATH[2], rough=0.6),
        "gold": mat("yellow", metal=0.6, rough=0.35),
    }


def _chair_rot(objs, a):
    """Parts built pointing at the front (-Y), turned to leg angle a."""
    return kit.tilt(objs, rz=a, pivot=(0, 0, 0))


def _chair_lean(objs, lean=CHAIR_LEAN):
    """Lean a back (and whatever is fixed to it) back round the rear edge of the seat top."""
    return kit.tilt(objs, rx=-lean, pivot=(0, 0.25, CHAIR_TOP_Z))


def _chair_lean_local(objs, lean=CHAIR_LEAN):
    """The same lean for a module built round the seat top (Slot2)."""
    return kit.tilt(objs, rx=-lean, pivot=(0, 0.25, 0.0))


def _chair_tube(name, p, q, r, material, verts=8):
    """A round tube from p to q."""
    d = [q[i] - p[i] for i in range(3)]
    ln = math.sqrt(sum(c * c for c in d))
    phi = math.acos(max(-1.0, min(1.0, d[2] / ln)))
    th = math.atan2(d[1], d[0])
    return cyl(name, r, ln, loc=p, material=material, verts=verts, rot=(0, phi, th))


def _chair_arc(name, r, a0, a1, n, w, h, z, material):
    """Part of a flat ring at height z, from angle a0 to a1."""
    parts = []
    for i in range(n):
        t0, t1 = a0 + (a1 - a0) * i / n, a0 + (a1 - a0) * (i + 1) / n
        tm = (t0 + t1) / 2
        seg = 2 * r * math.sin(abs(t1 - t0) / 2) * 1.12
        parts.append(box(f"{name}{i}", (w, seg, h), loc=(r * math.cos(tm), r * math.sin(tm), z), material=material, rot_z=tm))
    return parts


def _chair_base(leg, castor, hub=None, arm_w=0.06, pre=""):
    """Five legs and five castors (balls, radius 0.05) round a hub."""
    parts = [cyl(f"{pre}Hub", 0.075, 0.06, loc=(0, 0, 0.06), material=hub or leg, verts=10)]
    for i, a in enumerate(CHAIR_LEGS):
        g = [box(f"{pre}Leg{i}", (arm_w, 0.25, 0.045), loc=(0, -0.15, 0.065), material=leg, bevel=0.01),
             ball(f"{pre}Castor{i}", 0.05, loc=(0, -CHAIR_WHEEL_R, 0.05), material=castor)]
        parts += _chair_rot(g, a)
    return parts


def _chair_column(m, z0=0.12, cover=None):
    """Gas spring from z0 up to the mechanism under the seat."""
    return [cyl("Gas", 0.032, CHAIR_SEAT_Z - 0.06 - z0, loc=(0, 0, z0), material=m["steel"], verts=10),
            cyl("GasCover", 0.048, 0.14, loc=(0, 0, z0), material=cover or m["black"], verts=10),
            box("Mech", (0.22, 0.22, 0.06), loc=(0, 0, CHAIR_SEAT_Z - 0.06), material=m["char"], bevel=0.01)]


def _chair_seat(col, h=0.10, w=0.50):
    return box("Seat", (w, w, h), loc=(0, 0, CHAIR_TOP_Z - h), material=col, bevel=0.03)


def _chair_spine(m):
    """The bracket from under the seat up behind the back: the back's back is not bare."""
    return box("Spine", (0.10, 0.05, 0.24), loc=(0, 0.27, 0.38), material=m["char"], bevel=0.01)


def _chair_slots(root, yaw=0.0):
    _slots(root, [((0, 0, CHAIR_SEAT_Z), 1.0), ((0, 0, 0), 1.0), ((0, 0, CHAIR_TOP_Z), 1.0)])
    if yaw:
        for c in root.children:
            if c.name.split(".")[0] in ("Slot0", "Slot2"):
                c.rotation_euler = (0, 0, yaw)


def b_chair_core():
    root = empty("chair_core")
    m = _chair_m()
    parts = _chair_base(m["char"], m["black"]) + _chair_column(m)
    parts += [_chair_seat(m["blue"]), _chair_spine(m)]
    back = [box("Back", (0.46, 0.08, 0.50), loc=(0, 0.25, CHAIR_TOP_Z), material=m["blue"], bevel=0.03),
            box("BackShell", (0.40, 0.016, 0.40), loc=(0, 0.296, CHAIR_TOP_Z + 0.05), material=m["char"], bevel=0.005),
            box("BackSeam", (0.47, 0.085, 0.03), loc=(0, 0.25, CHAIR_TOP_Z + 0.16), material=m["char"])]
    parts += _chair_lean(back)
    parent(join("chair_core_mesh", parts), root)
    _chair_slots(root)
    return root


# Modules. Each is built round its slot: Slot0 the middle of the seat's underside, Slot1 the middle
# of the base on the floor, Slot2 the middle of the seat top.

def _chair_sleeve(m):
    """A thick red sleeve over the gas spring, from just above the hub to the mechanism."""
    return [cyl("Sleeve", 0.066, 0.25, loc=(0, 0, -0.31), material=m["red"], verts=12),
            cyl("SleeveRibA", 0.074, 0.03, loc=(0, 0, -0.25), material=m["red"], verts=12),
            cyl("SleeveRibB", 0.074, 0.03, loc=(0, 0, -0.14), material=m["red"], verts=12)]


def b_chair_m0_1():
    """Gas Lift: a red sleeve on the gas spring and a red bumper bar under the front edge."""
    root = empty("chair_m0_1")
    m = _chair_m()
    parts = _chair_sleeve(m)
    parts += [box("Bumper", (0.50, 0.08, 0.09), loc=(0, -0.28, -0.09), material=m["red"], bevel=0.025)]
    for i, sx in enumerate((-1, 1)):
        parts.append(box(f"BumperArm{i}", (0.04, 0.14, 0.04), loc=(sx * 0.12, -0.18, -0.04), material=m["char"]))
    parent(join("chair_m0_1_mesh", parts), root)
    return root


def b_chair_m0_2():
    """Armrests: the bumper with two buffers, and two padded red armrests at 0.70."""
    root = empty("chair_m0_2")
    m = _chair_m()
    parts = _chair_sleeve(m)
    parts += [box("Bumper", (0.54, 0.09, 0.10), loc=(0, -0.285, -0.10), material=m["red"], bevel=0.025)]
    for i, sx in enumerate((-1, 1)):
        parts += [box(f"BumperArm{i}", (0.04, 0.14, 0.04), loc=(sx * 0.12, -0.18, -0.04), material=m["char"]),
                  # Buffers, like the ends of a train: the chair is built to ram.
                  _cyly(f"Buffer{i}", 0.05, 0.08, (sx * 0.19, -0.36, -0.05), m["red"], verts=10),
                  _cyly(f"BufferCap{i}", 0.06, 0.025, (sx * 0.19, -0.405, -0.05), m["char"], verts=10),
                  box(f"ArmFoot{i}", (0.13, 0.06, 0.04), loc=(sx * 0.215, 0.0, -0.04), material=m["char"]),
                  box(f"ArmPost{i}", (0.045, 0.06, 0.29), loc=(sx * 0.28, 0.0, -0.04), material=m["char"]),
                  box(f"ArmPad{i}", (0.09, 0.30, 0.06), loc=(sx * 0.28, -0.02, 0.24), material=m["red"], bevel=0.02)]
    parent(join("chair_m0_2_mesh", parts), root)
    return root


def _chair_wheel(i, m, r=0.09):
    """A big light blue castor at the front leg, turned to leg i."""
    g = [_cylx(f"Wheel{i}", r, 0.11, (0, -CHAIR_WHEEL_R, r), m["lblue"], verts=12),
         _cylx(f"WheelHub{i}", 0.04, 0.12, (0, -CHAIR_WHEEL_R, r), m["char"], verts=8)]
    return g


def b_chair_m1_1():
    """Smooth Castors: five big light blue wheels and a light blue ring round the base."""
    root = empty("chair_m1_1")
    m = _chair_m()
    parts = []
    for i, a in enumerate(CHAIR_LEGS):
        parts += _chair_rot(_chair_wheel(i, m), a)
    parts += _ring("Ring", 0.17, 14, 0.045, (0, 0, 0.155), m["lblue"])
    parent(join("chair_m1_1_mesh", parts), root)
    return root


def b_chair_m1_2():
    """Polished Floor: the wheels under light blue mudguards, a glowing ring, two fins at the back."""
    root = empty("chair_m1_2")
    m = _chair_m()
    glow = mat(CHAIR_PATH[1], emit=1.2)
    parts = []
    r, wr = 0.095, 0.13
    for i, a in enumerate(CHAIR_LEGS):
        g = _chair_wheel(i, m, r)
        for j, th in enumerate((30, 60, 90, 120, 150)):
            t = math.radians(th)
            py, pz = -CHAIR_WHEEL_R + wr * math.cos(t), r + wr * math.sin(t)
            b = box(f"Guard{i}{j}", (0.14, 0.075, 0.025), loc=(0, py, pz - 0.0125), material=m["lblue"])
            kit.tilt(b, rx=t - math.pi / 2, pivot=(0, py, pz))
            g.append(b)
        if abs(a - math.pi) < 0.01:
            # Two fins on the rear mudguard, splayed like a V.
            for k, sx in enumerate((-1, 1)):
                f = box(f"Fin{k}", (0.025, 0.13, 0.14), loc=(sx * 0.03, -0.30, r + wr - 0.01), material=m["lblue"], taper=0.55)
                kit.tilt(f, ry=sx * 0.40, pivot=(sx * 0.03, -0.30, r + wr - 0.01))
                g.append(f)
        parts += _chair_rot(g, a)
    parts += _ring("Ring", 0.17, 14, 0.045, (0, 0, 0.155), glow)
    parent(join("chair_m1_2_mesh", parts), root)
    return root


def _chair_cushion(m):
    c = [box("Cushion", (0.44, 0.40, 0.08), loc=(0, -0.03, 0), material=m["green"], bevel=0.03),
         box("CushionSeam", (0.30, 0.26, 0.085), loc=(0, -0.03, 0), material=mat(CHAIR_PATH[2], rough=0.95), bevel=0.02)]
    lumbar = box("Lumbar", (0.36, 0.10, 0.15), loc=(0, 0.17, 0.09), material=m["green"], bevel=0.035)
    return c + _chair_lean_local([lumbar])


def b_chair_m2_1():
    """Cushion: a fat green cushion on the seat and a green lumbar cushion on the back."""
    root = empty("chair_m2_1")
    m = _chair_m()
    parent(join("chair_m2_1_mesh", _chair_cushion(m)), root)
    return root


def b_chair_m2_2():
    """Steel Frame: the cushion, and a green steel roll cage round the back, over the top to 1.20."""
    root = empty("chair_m2_2")
    m = _chair_m()
    tube = mat(CHAIR_PATH[2], metal=0.5, rough=0.4)
    parts = _chair_cushion(m)
    y, r = 0.33, 0.024
    frame = []
    for i, sx in enumerate((-1, 1)):
        frame += [box(f"Foot{i}", (0.07, 0.16, 0.04), loc=(sx * 0.27, 0.26, -0.09), material=m["char"]),
                  _chair_tube(f"Post{i}", (sx * 0.28, y, -0.11), (sx * 0.28, y, 0.56), r, tube),
                  _chair_tube(f"Corner{i}", (sx * 0.28, y, 0.56), (sx * 0.15, y, 0.65), r, tube),
                  ball(f"Joint{i}", 0.032, loc=(sx * 0.28, y, 0.56), material=tube),
                  box(f"Clamp{i}", (0.06, 0.06, 0.06), loc=(sx * 0.28, y, 0.30), material=m["char"])]
    frame += [_chair_tube("Top", (-0.16, y, 0.65), (0.16, y, 0.65), r, tube),
              _chair_tube("Cross", (-0.28, y, 0.06), (0.28, y, 0.06), r * 0.8, tube),
              box("CrossClamp", (0.08, 0.06, 0.05), loc=(0, 0.305, 0.035), material=m["char"])]
    parts += _chair_lean_local(frame)
    parent(join("chair_m2_2_mesh", parts), root)
    return root


# Heroes. Same seat height, back plane and legs as the core, so the other paths' modules fit.

def b_chair_p0_3():
    """Executive Chair: a tall dark leather back with red tufting and piping, broad red armrests,
    a chrome bull bar in front. It pushes colleagues a tile back."""
    root = empty("chair_p0_3")
    m = _chair_m()
    leather = mat("coffee", rough=0.5)
    red = mat(CHAIR_PATH[0], rough=0.45)
    chrome = mat("metal_light", metal=0.8, rough=0.2)
    parts = _chair_base(chrome, m["black"], hub=m["char"]) + _chair_column(m)
    parts += [_chair_seat(red, h=0.12, w=0.52), _chair_spine(m)]
    back = [box("Shell", (0.50, 0.095, 0.80), loc=(0, 0.2425, CHAIR_TOP_Z), material=leather, bevel=0.03),
            box("PipeTop", (0.52, 0.105, 0.035), loc=(0, 0.2425, CHAIR_TOP_Z + 0.78), material=red),
            box("PipeL", (0.03, 0.105, 0.78), loc=(-0.255, 0.2425, CHAIR_TOP_Z + 0.02), material=red),
            box("PipeR", (0.03, 0.105, 0.78), loc=(0.255, 0.2425, CHAIR_TOP_Z + 0.02), material=red),
            box("RearBand", (0.40, 0.012, 0.06), loc=(0, 0.294, CHAIR_TOP_Z + 0.50), material=red),
            box("RearPanel", (0.36, 0.012, 0.30), loc=(0, 0.294, CHAIR_TOP_Z + 0.12), material=m["char"])]
    for k in range(3):
        back.append(box(f"Tuft{k}", (0.40, 0.05, 0.21), loc=(0, 0.17, CHAIR_TOP_Z + 0.05 + k * 0.22), material=red, bevel=0.025))
    parts += _chair_lean(back)
    for i, sx in enumerate((-1, 1)):
        parts += [box(f"ArmBase{i}", (0.10, 0.30, 0.03), loc=(sx * 0.285, -0.02, 0.44), material=m["char"]),
                  cyl(f"ArmPostA{i}", 0.02, 0.24, loc=(sx * 0.30, -0.11, 0.46), material=chrome, verts=8),
                  cyl(f"ArmPostB{i}", 0.02, 0.24, loc=(sx * 0.30, 0.07, 0.46), material=chrome, verts=8),
                  box(f"ArmPad{i}", (0.11, 0.38, 0.07), loc=(sx * 0.30, -0.02, 0.70), material=red, bevel=0.025)]
    # The bull bar: two uprights and two cross bars, hung from under the seat.
    for i, sx in enumerate((-1, 1)):
        parts += [_chair_tube(f"BarUp{i}", (sx * 0.20, -0.33, 0.22), (sx * 0.20, -0.33, 0.42), 0.022, chrome),
                  _chair_tube(f"BarArm{i}", (sx * 0.20, -0.33, 0.41), (sx * 0.12, -0.10, 0.41), 0.02, chrome),
                  ball(f"BarKnob{i}", 0.03, loc=(sx * 0.20, -0.33, 0.42), material=chrome)]
    parts += [_chair_tube("BarLow", (-0.20, -0.33, 0.25), (0.20, -0.33, 0.25), 0.022, chrome),
              _chair_tube("BarHigh", (-0.20, -0.33, 0.37), (0.20, -0.33, 0.37), 0.022, chrome),
              box("BarPad", (0.30, 0.05, 0.07), loc=(0, -0.345, 0.275), material=red, bevel=0.015)]
    parent(join("chair_p0_3_mesh", parts), root)
    _chair_slots(root)
    return root


def b_chair_p0_4():
    """Racing Chair: a black bucket seat with red wings and a red stripe, a headrest, a spoiler at
    the back and two glowing exhausts."""
    root = empty("chair_p0_4")
    m = _chair_m()
    red = mat(CHAIR_PATH[0], rough=0.45)
    stripe = mat(CHAIR_PATH[0], emit=1.0)
    black = m["black"]
    parts = _chair_base(black, m["char"], hub=m["char"]) + _chair_column(m)
    parts += [_chair_seat(black), _chair_spine(m),
              box("SeatInsert", (0.36, 0.42, 0.02), loc=(0, -0.02, CHAIR_TOP_Z - 0.005), material=red)]
    for i, sx in enumerate((-1, 1)):
        parts.append(box(f"Bolster{i}", (0.05, 0.46, 0.08), loc=(sx * 0.25, -0.01, CHAIR_TOP_Z - 0.01), material=red, bevel=0.015))
    back = [box("Shell", (0.46, 0.09, 0.80), loc=(0, 0.245, CHAIR_TOP_Z), material=black, bevel=0.03, taper=0.85),
            box("Headrest", (0.30, 0.09, 0.14), loc=(0, 0.245, CHAIR_TOP_Z + 0.78), material=black, bevel=0.03),
            box("HeadCap", (0.32, 0.10, 0.05), loc=(0, 0.245, CHAIR_TOP_Z + 0.90), material=red, bevel=0.015),
            box("StripeF", (0.10, 0.012, 0.86), loc=(0, 0.196, CHAIR_TOP_Z + 0.04), material=stripe),
            box("StripeB", (0.10, 0.012, 0.72), loc=(0, 0.294, CHAIR_TOP_Z + 0.04), material=stripe)]
    for i, sx in enumerate((-1, 1)):
        back += [box(f"Slot{i}", (0.06, 0.095, 0.09), loc=(sx * 0.08, 0.245, CHAIR_TOP_Z + 0.62), material=red)]
        w = box(f"Wing{i}", (0.07, 0.15, 0.50), loc=(sx * 0.215, 0.20, CHAIR_TOP_Z + 0.16), material=red, bevel=0.02)
        kit.tilt(w, ry=-sx * 0.12, pivot=(sx * 0.215, 0.20, CHAIR_TOP_Z + 0.16))
        back.append(w)
    # The spoiler on two struts behind the back, tail lights in its end plates.
    for i, sx in enumerate((-1, 1)):
        back += [box(f"Strut{i}", (0.03, 0.14, 0.03), loc=(sx * 0.13, 0.36, CHAIR_TOP_Z + 0.38), material=black),
                 box(f"EndPlate{i}", (0.02, 0.12, 0.12), loc=(sx * 0.25, 0.42, CHAIR_TOP_Z + 0.36), material=black),
                 box(f"TailLight{i}", (0.024, 0.04, 0.05), loc=(sx * 0.25, 0.46, CHAIR_TOP_Z + 0.39), material=stripe)]
    back.append(box("Spoiler", (0.50, 0.11, 0.03), loc=(0, 0.42, CHAIR_TOP_Z + 0.41), material=red, bevel=0.01))
    parts += _chair_lean(back)
    flame = mat("#ff8a3d", emit=1.5)
    for i, sx in enumerate((-1, 1)):
        parts += [_cyly(f"Exhaust{i}", 0.03, 0.30, (sx * 0.15, 0.29, 0.415), m["steel"], verts=10),
                  _cyly(f"Flame{i}", 0.026, 0.03, (sx * 0.15, 0.445, 0.415), flame, verts=10)]
    parent(join("chair_p0_4_mesh", parts), root)
    _chair_slots(root)
    return root


def _chair_twin(i, m):
    """A castor with two light blue wheels, at the front leg."""
    return [_cylx(f"TwinA{i}", 0.065, 0.04, (-0.03, -CHAIR_WHEEL_R, 0.065), m["lblue"], verts=12),
            _cylx(f"TwinB{i}", 0.065, 0.04, (0.03, -CHAIR_WHEEL_R, 0.065), m["lblue"], verts=12),
            _cylx(f"TwinHub{i}", 0.03, 0.11, (0, -CHAIR_WHEEL_R, 0.065), m["char"], verts=8)]


def b_chair_p1_3():
    """Swivel: the seat turned on a big turntable, rings of light in front, twin wheels. It hits
    on the way back too."""
    root = empty("chair_p1_3")
    m = _chair_m()
    lblue = mat(CHAIR_PATH[1], rough=0.5)
    glow = mat(CHAIR_PATH[1], emit=1.3)
    parts = [cyl("Hub", 0.075, 0.06, loc=(0, 0, 0.06), material=m["char"], verts=10)]
    for i, a in enumerate(CHAIR_LEGS):
        parts += _chair_rot([box(f"Leg{i}", (0.06, 0.25, 0.045), loc=(0, -0.15, 0.065), material=m["char"], bevel=0.01)]
                            + _chair_twin(i, m), a)
    parts += [cyl("Gas", 0.032, 0.21, loc=(0, 0, 0.12), material=m["steel"], verts=10),
              cyl("GasCover", 0.048, 0.14, loc=(0, 0, 0.12), material=m["black"], verts=10),
              cyl("Turntable", 0.19, 0.03, loc=(0, 0, 0.33), material=m["char"], verts=14, bevel=0.008),
              cyl("TurntableTop", 0.16, 0.03, loc=(0, 0, 0.36), material=lblue, verts=14)]
    for k in range(6):
        a = k * math.pi / 3
        parts.append(box(f"Tick{k}", (0.06, 0.03, 0.035), loc=(0.17 * math.cos(a), 0.17 * math.sin(a), 0.33), material=glow, rot_z=a))
    upper = [box("Mech", (0.22, 0.22, 0.06), loc=(0, 0, CHAIR_SEAT_Z - 0.06), material=m["char"], bevel=0.01),
             _chair_seat(lblue), _chair_spine(m)]
    back = [box("Back", (0.46, 0.08, 0.52), loc=(0, 0.25, CHAIR_TOP_Z), material=lblue, bevel=0.03),
            box("BackShell", (0.40, 0.016, 0.42), loc=(0, 0.296, CHAIR_TOP_Z + 0.05), material=m["char"], bevel=0.005),
            box("Neck", (0.10, 0.05, 0.10), loc=(0, 0.26, CHAIR_TOP_Z + 0.50), material=m["char"]),
            box("Headrest", (0.30, 0.08, 0.12), loc=(0, 0.25, CHAIR_TOP_Z + 0.53), material=lblue, bevel=0.03)]
    upper += _chair_lean(back)
    # Motion: two arcs of light round the front, one at the seat and one round the column.
    upper += _chair_arc("Swish", 0.375, math.radians(200), math.radians(340), 9, 0.03, 0.025, 0.585, glow)
    upper += _chair_arc("SwishLow", 0.33, math.radians(215), math.radians(325), 7, 0.025, 0.02, 0.28, glow)
    head = box("SwishHead", (0.07, 0.07, 0.025), loc=(0.375 * math.cos(math.radians(342)), 0.375 * math.sin(math.radians(342)), 0.585),
               material=glow, rot_z=math.radians(342) + math.pi / 4)
    upper.append(head)
    parts += _chair_rot(upper, CHAIR_SWIVEL)
    parent(join("chair_p1_3_mesh", parts), root)
    _chair_slots(root, yaw=CHAIR_SWIVEL)
    return root


def b_chair_p1_4():
    """Office Olympics: a light blue soapbox chair, six big wheels on a long chassis, a race number
    on the back, a glowing gold medal and a chequered flag up to 1.50."""
    root = empty("chair_p1_4")
    m = _chair_m()
    lblue = mat(CHAIR_PATH[1], rough=0.5)
    hubglow = mat(CHAIR_PATH[1], emit=1.2)
    gold = mat("yellow", metal=0.7, rough=0.3, emit=0.8)
    white = mat("plastic_white", rough=0.5)
    parts = [box("Chassis", (0.40, 0.70, 0.07), loc=(0, 0, 0.10), material=lblue, bevel=0.02),
             box("ChassisStripe", (0.41, 0.10, 0.072), loc=(0, -0.20, 0.10), material=white)]
    for j, y in enumerate((-0.28, 0.0, 0.28)):
        parts.append(_cylx(f"Axle{j}", 0.022, 0.56, (0, y, 0.10), m["char"], verts=8))
        for i, sx in enumerate((-1, 1)):
            parts += [_cylx(f"Tyre{j}{i}", 0.10, 0.07, (sx * 0.29, y, 0.0975), m["black"], verts=14),
                      _cylx(f"Rim{j}{i}", 0.055, 0.075, (sx * 0.29, y, 0.0975), hubglow, verts=10)]
    parts += [cyl("Gas", 0.032, 0.22, loc=(0, 0, 0.17), material=m["steel"], verts=10),
              cyl("GasCover", 0.048, 0.11, loc=(0, 0, 0.17), material=m["black"], verts=10),
              box("Mech", (0.22, 0.22, 0.06), loc=(0, 0, CHAIR_SEAT_Z - 0.06), material=m["char"], bevel=0.01),
              _chair_seat(lblue), _chair_spine(m)]
    back = [box("Back", (0.46, 0.08, 0.50), loc=(0, 0.25, CHAIR_TOP_Z), material=lblue, bevel=0.03),
            box("Number", (0.30, 0.012, 0.26), loc=(0, 0.294, CHAIR_TOP_Z + 0.17), material=white),
            # The race number: a 1 from blocks, the right way round seen from behind.
            box("NumStem", (0.05, 0.012, 0.18), loc=(0.01, 0.302, CHAIR_TOP_Z + 0.21), material=m["black"]),
            box("NumFlag", (0.05, 0.012, 0.04), loc=(0.045, 0.302, CHAIR_TOP_Z + 0.35), material=m["black"]),
            box("NumFoot", (0.12, 0.012, 0.035), loc=(0.01, 0.302, CHAIR_TOP_Z + 0.20), material=m["black"]),
            _cyly("Medal", 0.075, 0.025, (0, 0.19, CHAIR_TOP_Z + 0.33), gold, verts=14),
            _cyly("MedalStar", 0.035, 0.03, (0, 0.185, CHAIR_TOP_Z + 0.33), m["red"], verts=5)]
    for i, sx in enumerate((-1, 1)):
        rb = box(f"Ribbon{i}", (0.05, 0.014, 0.17), loc=(sx * 0.05, 0.198, CHAIR_TOP_Z + 0.37), material=m["red"])
        kit.tilt(rb, ry=sx * 0.35, pivot=(sx * 0.05, 0.198, CHAIR_TOP_Z + 0.37))
        back.append(rb)
    parts += _chair_lean(back)
    # The flag on a pole at the side, fixed to the chassis between the middle and rear wheels.
    px, py = 0.35, 0.14
    parts += [box("PoleArm", (0.17, 0.04, 0.04), loc=(0.275, py, 0.11), material=m["char"]),
              cyl("Pole", 0.018, 1.36, loc=(px, py, 0.12), material=m["steel"], verts=8),
              ball("PoleTop", 0.032, loc=(px, py, 1.50), material=gold)]
    for i in range(3):
        for j in range(2):
            parts.append(box(f"Check{i}{j}", (0.012, 0.08, 0.08), loc=(px, py + 0.05 + i * 0.08, 1.30 + j * 0.08),
                             material=m["black"] if (i + j) % 2 else white))
    parent(join("chair_p1_4_mesh", parts), root)
    _chair_slots(root)
    return root


def b_chair_p2_3():
    """Ergonomic: a green mesh back with lumbar support and headrest, reinforced green legs, and a
    cardboard box squashed flat on the foot ring. It breaks boxes."""
    root = empty("chair_p2_3")
    m = _chair_m()
    green = mat(CHAIR_PATH[2], rough=0.55)
    steel = mat(CHAIR_PATH[2], metal=0.5, rough=0.4)
    parts = _chair_base(green, m["char"], hub=m["char"], arm_w=0.085)
    for i, a in enumerate(CHAIR_LEGS):
        parts += _chair_rot([box(f"Brace{i}", (0.03, 0.20, 0.03), loc=(0, -0.15, 0.11), material=m["steel"])], a)
    parts += _chair_column(m)
    parts += [_chair_seat(green), _chair_spine(m)]
    # Foot ring with three struts, and the flattened box on its front.
    parts += _ring("FootRing", 0.21, 16, 0.03, (0, 0, 0.28), steel)
    for k, t in enumerate((math.pi / 2, math.radians(200), math.radians(340))):
        parts.append(box(f"RingStrut{k}", (0.17, 0.025, 0.025), loc=(0.125 * math.cos(t), 0.125 * math.sin(t), 0.255), material=steel, rot_z=t))
    crate = [box("Crate", (0.26, 0.17, 0.055), loc=(0, -0.22, 0.28), material=mat("cardboard"), bevel=0.008),
             box("CrateTape", (0.05, 0.172, 0.058), loc=(0.03, -0.22, 0.28), material=mat("paper"))]
    kit.tilt(crate, rx=0.10, ry=0.06, pivot=(0, -0.22, 0.30))
    flap = box("CrateFlap", (0.12, 0.10, 0.018), loc=(-0.08, -0.25, 0.33), material=mat("cardboard"))
    kit.tilt(flap, ry=0.45, rz=0.2, pivot=(-0.08, -0.25, 0.33))
    parts += crate + [flap]
    back = [box("FrameL", (0.05, 0.07, 0.62), loc=(-0.205, 0.25, CHAIR_TOP_Z), material=green, bevel=0.012),
            box("FrameR", (0.05, 0.07, 0.62), loc=(0.205, 0.25, CHAIR_TOP_Z), material=green, bevel=0.012),
            box("FrameTop", (0.46, 0.07, 0.06), loc=(0, 0.25, CHAIR_TOP_Z + 0.56), material=green, bevel=0.012),
            box("FrameLow", (0.46, 0.07, 0.06), loc=(0, 0.25, CHAIR_TOP_Z), material=green, bevel=0.012),
            box("Mesh", (0.37, 0.02, 0.52), loc=(0, 0.25, CHAIR_TOP_Z + 0.04), material=m["char"]),
            box("Lumbar", (0.40, 0.07, 0.11), loc=(0, 0.20, CHAIR_TOP_Z + 0.13), material=green, bevel=0.03),
            box("HeadPostL", (0.025, 0.025, 0.12), loc=(-0.08, 0.25, CHAIR_TOP_Z + 0.61), material=m["steel"]),
            box("HeadPostR", (0.025, 0.025, 0.12), loc=(0.08, 0.25, CHAIR_TOP_Z + 0.61), material=m["steel"]),
            box("Headrest", (0.32, 0.08, 0.14), loc=(0, 0.25, CHAIR_TOP_Z + 0.65), material=green, bevel=0.03)]
    for k in range(4):
        back.append(box(f"MeshRib{k}", (0.37, 0.026, 0.02), loc=(0, 0.25, CHAIR_TOP_Z + 0.14 + k * 0.11), material=m["black"]))
    parts += _chair_lean(back)
    parent(join("chair_p2_3_mesh", parts), root)
    _chair_slots(root)
    return root


def b_chair_p2_4():
    """Throne: a tall green velvet back with gold studs and a crown with glowing stones, broad
    armrests, a green velvet seat. Still on castors."""
    root = empty("chair_p2_4")
    m = _chair_m()
    velvet = mat(CHAIR_PATH[2], rough=0.95)
    gold = mat("yellow", metal=0.7, rough=0.3)
    gem = mat(CHAIR_PATH[2], emit=1.5)
    parts = _chair_base(gold, m["char"], hub=gold)
    parts += [cyl("Column", 0.055, 0.27, loc=(0, 0, 0.12), material=gold, verts=10),
              box("Mech", (0.22, 0.22, 0.06), loc=(0, 0, CHAIR_SEAT_Z - 0.06), material=m["char"], bevel=0.01),
              _chair_seat(velvet, h=0.12), _chair_spine(m),
              box("SeatTrim", (0.52, 0.52, 0.03), loc=(0, 0, CHAIR_SEAT_Z - 0.02), material=gold, bevel=0.01)]
    for i, sx in enumerate((-1, 1)):
        parts += [box(f"Arm{i}", (0.10, 0.44, 0.23), loc=(sx * 0.30, 0.0, CHAIR_SEAT_Z), material=velvet, bevel=0.02),
                  box(f"ArmCap{i}", (0.11, 0.46, 0.03), loc=(sx * 0.30, 0.0, CHAIR_SEAT_Z + 0.23), material=gold, bevel=0.008),
                  ball(f"ArmKnob{i}", 0.045, loc=(sx * 0.30, -0.23, CHAIR_SEAT_Z + 0.25), material=gold)]
    back = [box("Back", (0.50, 0.10, 0.90), loc=(0, 0.25, CHAIR_TOP_Z), material=velvet, bevel=0.03),
            box("FrameL", (0.04, 0.11, 0.90), loc=(-0.25, 0.25, CHAIR_TOP_Z), material=gold),
            box("FrameR", (0.04, 0.11, 0.90), loc=(0.25, 0.25, CHAIR_TOP_Z), material=gold),
            box("Band", (0.54, 0.12, 0.07), loc=(0, 0.25, CHAIR_TOP_Z + 0.88), material=gold, bevel=0.01)]
    # Studs front and back, in a diamond pattern.
    for face, y in (("F", 0.195), ("B", 0.305)):
        for r_ in range(4):
            for c_ in range(3 if r_ % 2 == 0 else 2):
                x = (-0.12 + c_ * 0.12) if r_ % 2 == 0 else (-0.06 + c_ * 0.12)
                back.append(_cyly(f"Stud{face}{r_}{c_}", 0.028, 0.02, (x, y, CHAIR_TOP_Z + 0.16 + r_ * 0.17), gold, verts=6))
    # The crown: five points, a stone on each.
    for k in range(5):
        x = -0.20 + k * 0.10
        h = 0.20 if k == 2 else (0.15 if k in (1, 3) else 0.12)
        back += [box(f"Point{k}", (0.075, 0.08, h), loc=(x, 0.25, CHAIR_TOP_Z + 0.95), material=gold, taper=0.3),
                 ball(f"Gem{k}", 0.03, loc=(x, 0.20, CHAIR_TOP_Z + 0.99), material=gem)]
    parts += _chair_lean(back, lean=0.04)
    parent(join("chair_p2_4_mesh", parts), root)
    _chair_slots(root)
    return root


def tower_chair(tiers):
    return tower_parts("chair", tiers)


TOWER_PART_BUILDERS["chair_core"] = b_chair_core
for _p in range(3):
    for _t in (1, 2):
        TOWER_PART_BUILDERS[f"chair_m{_p}_{_t}"] = globals()[f"b_chair_m{_p}_{_t}"]
    for _t in (3, 4):
        TOWER_PART_BUILDERS[f"chair_p{_p}_{_t}"] = globals()[f"b_chair_p{_p}_{_t}"]


# --- replyall (tower parts)

# --- Reply All (7.11). The post room: a pigeonhole cabinet with an envelope leaning out of every
# hole and a fan of mail flying off the top. Slot0 (URGENT) on the roof behind the fan, Slot1
# (THREAD) at the top of the right flank, Slot2 (EVERYONE) halfway up the left flank.
# Slot1 modules are built with their origin on the top edge of the right flank and grow towards
# +X; Slot2 modules have their origin on the left flank and grow towards -X.

RPA_ACCENT = "#e2557a"
RPA_PATH = ("#e5534b", "#7fb6e3", "#e2557a")
RPA_GREY = "#c9cdd3"


def _rpa_steel():
    return mat("metal_light", metal=0.6, rough=0.35)


def _rpa_wedge(name, w, t, h, top, material):
    """An envelope flap: a triangle w wide along its top edge (top is the middle of that edge)
    pointing down."""
    x, y, z = top
    ob = box(name, (w, t, h), loc=(x, y, z - h), material=material)
    for v in ob.data.vertices:
        if v.co.z < z - h / 2:
            v.co.x = x
    ob.data.update()
    return ob


def _rpa_env(pre, c, w, h, body, flap, stripe=None, rx=0.0, ry=0.0, rz=0.0, pivot=None, t=0.016):
    """An envelope standing on its centre c, facing the front. The flap shows on both faces."""
    x, y, z = c
    parts = [box(f"{pre}B", (w, t, h), loc=(x, y, z - h / 2), material=body),
             _rpa_wedge(f"{pre}F", w * 0.94, t + 0.01, h * 0.55, (x, y, z + h / 2 - 0.003), flap)]
    if stripe is not None:
        parts.append(box(f"{pre}S", (w + 0.006, t + 0.006, h * 0.2), loc=(x, y, z - h * 0.44), material=stripe))
    if rx or ry or rz:
        kit.tilt(parts, rx=rx, ry=ry, rz=rz, pivot=pivot or c)
    return parts


def _rpa_at(pre, c, r, material, rz=0.0, t=0.02):
    """An @ of blocks standing in the XZ plane, facing the front, then turned rz about Z: a hollow
    bowl whose stem runs down and right into the outer ring, which ends at the bottom right."""
    x, y, z = c
    n, w = 12, r * 0.24
    seg = 2 * math.pi * r / n * 1.12
    parts = []
    for i in range(n - 1):  # no block at 330 degrees: the gap between the ring's end and the tail
        a = 2 * math.pi * i / n
        px, pz = x + r * math.cos(a), z + r * math.sin(a)
        b = box(f"{pre}R{i}", (seg, t, w), loc=(px, y, pz - w / 2), material=material)
        kit.tilt(b, ry=-(a + math.pi / 2), pivot=(px, y, pz))
        parts.append(b)
    bx, hb, bw = x - r * 0.08, r * 0.27, r * 0.2
    sx = bx + hb - bw / 2
    parts += [box(f"{pre}BowlL", (bw, t, 2 * hb), loc=(bx - hb + bw / 2, y, z - hb), material=material),
              box(f"{pre}BowlT", (2 * hb, t, bw), loc=(bx, y, z + hb - bw), material=material),
              box(f"{pre}BowlB", (2 * hb, t, bw), loc=(bx, y, z - hb), material=material),
              box(f"{pre}Stem", (bw, t, 2 * hb + r * 0.12), loc=(sx, y, z - hb - r * 0.12), material=material),
              box(f"{pre}Tail", (x + r * 0.9 - sx, t, bw), loc=((sx + x + r * 0.9) / 2, y, z - hb - r * 0.12), material=material)]
    if rz:
        kit.tilt(parts, rz=rz, pivot=c)
    return parts


def _rpa_cabinet(w=0.64, d=0.40, h=0.80, body=RPA_GREY, back=RPA_ACCENT, envs=((RPA_ACCENT, "paper"), ("paper", RPA_ACCENT)),
                 stripe=None, skip=(), trim=None, pre="Cab"):
    """The pigeonhole cabinet on a dark plinth: three by three open holes with an envelope leaning
    out of each (envs alternate), a back panel in `back` with a white @, a stripe on each side.
    Returns (parts, holes): holes[(row, col)] = (x of the hole centre, z of its floor, hole width)."""
    t, pl, dv = 0.035, 0.08, 0.02
    shell = mat(body)
    dark = mat("charcoal")
    parts = [box(f"{pre}Plinth", (w - 0.05, d - 0.05, pl), material=dark),
             box(f"{pre}Top", (w, d, t), loc=(0, 0, h - t), material=shell, bevel=0.008),
             box(f"{pre}Bottom", (w - 2 * t, d - t, t), loc=(0, -t / 2, pl), material=shell),
             box(f"{pre}Back", (w, t, h - pl - t), loc=(0, d / 2 - t / 2, pl), material=mat(back)),
             box(f"{pre}Liner", (w - 2 * t, 0.01, h - pl - 2 * t), loc=(0, d / 2 - t - 0.005, pl + t), material=dark)]
    for sx in (-1, 1):
        parts.append(box(f"{pre}Side{sx}", (t, d - t, h - pl - t), loc=(sx * (w / 2 - t / 2), -t / 2, pl), material=shell))
        parts.append(box(f"{pre}Stripe{sx}", (0.008, d * 0.8, 0.10), loc=(sx * (w / 2 + 0.002), 0, pl + 0.04), material=mat(trim or back)))
    x0, x1 = -w / 2 + t, w / 2 - t
    z0, z1 = pl + t, h - t
    cw = (x1 - x0 - 2 * dv) / 3
    ch = (z1 - z0 - 2 * dv) / 3
    for i in (1, 2):
        x = x0 + i * cw + (i - 0.5) * dv
        parts.append(box(f"{pre}Div{i}", (dv, d - t - 0.01, z1 - z0), loc=(x, -(t + 0.01) / 2, z0), material=shell))
        z = z0 + i * ch + (i - 1) * dv
        parts.append(box(f"{pre}Shelf{i}", (x1 - x0, d - t - 0.01, dv), loc=(0, -(t + 0.01) / 2, z), material=shell))
    holes = {}
    for r in range(3):
        for c in range(3):
            cx = x0 + c * (cw + dv) + cw / 2
            fz = z0 + r * (ch + dv)
            holes[(r, c)] = (cx, fz, cw)
            if (r, c) in skip:
                continue
            body_c, flap_c = envs[(r + c) % 2]
            # Standing in the hole, leaning back a little, so its face looks out at the camera.
            L = ch * 0.84
            py = -d / 2 + 0.03
            parts += _rpa_env(f"{pre}E{r}{c}", (cx, py, fz + 0.004 + L / 2), cw - 0.03, L, mat(body_c), mat(flap_c),
                              None if stripe is None else mat(stripe), rx=-0.22, pivot=(cx, py, fz + 0.004))
    # Label holders on both sides, towards the back, one per row: the flanks are not bare.
    for sx in (-1, 1):
        for r in range(3):
            lz = z0 + r * (ch + dv) + ch * 0.35
            parts += [box(f"{pre}Lab{sx}{r}", (0.010, 0.11, 0.075), loc=(sx * (w / 2 + 0.004), d / 2 - 0.085, lz), material=dark),
                      box(f"{pre}Card{sx}{r}", (0.014, 0.09, 0.05), loc=(sx * (w / 2 + 0.005), d / 2 - 0.085, lz + 0.012), material=mat("paper"))]
    parts += _rpa_at(f"{pre}At", (0, d / 2 + 0.006, pl + (h - pl) * 0.5), min(w, h - pl) * 0.3, mat("paper"), rz=math.pi)
    return parts, holes


def _rpa_band(w, d, z, col, pre="Band"):
    """A white band round the roof with blocks of col across it: the URGENT stripes."""
    parts = [box(f"{pre}", (w + 0.01, d + 0.01, 0.06), loc=(0, 0, z), material=mat("paper"))]
    for i in range(5):
        x = -w / 2 + w * (i + 0.5) / 5
        parts.append(box(f"{pre}{i}", (w / 10, d + 0.016, 0.062), loc=(x, 0, z - 0.001), material=mat(col)))
    return parts


def _rpa_flag(pre, x, pole_h, flag_w, flag_h, red, toward=1):
    """A red flag with a white ! on a pole standing at x; the cloth points towards +X or -X."""
    steel = _rpa_steel()
    paper = mat("paper")
    x0 = x + toward * 0.016
    fx = x0 + toward * flag_w / 2
    fz = pole_h - flag_h - 0.01
    return [box(f"{pre}Clamp", (0.06, 0.06, 0.04), loc=(x, 0, 0), material=mat("charcoal")),
            cyl(f"{pre}Pole", 0.016, pole_h, loc=(x, 0, 0), material=steel, verts=8),
            ball(f"{pre}Top", 0.026, loc=(x, 0, pole_h + 0.01), material=steel),
            box(f"{pre}Cloth", (flag_w, 0.022, flag_h), loc=(fx, 0, fz), material=red, bevel=0.004),
            box(f"{pre}Bar", (flag_h * 0.22, 0.034, flag_h * 0.5), loc=(fx, 0, fz + flag_h * 0.36), material=paper),
            box(f"{pre}Dot", (flag_h * 0.22, 0.034, flag_h * 0.2), loc=(fx, 0, fz + flag_h * 0.1), material=paper)]


def _rpa_lamp(pre, c, r, glow, h=0.12):
    """A warning lamp: a dark foot, a glowing dome, a cap."""
    x, y, z = c
    return [cyl(f"{pre}Foot", r * 1.1, 0.035, loc=(x, y, z), material=mat("charcoal"), verts=12),
            cyl(f"{pre}Dome", r, h, loc=(x, y, z + 0.035), material=glow, verts=12, radius_top=r * 0.7),
            ball(f"{pre}Cap", r * 0.45, loc=(x, y, z + 0.035 + h), material=mat("charcoal"))]


def b_replyall_core():
    root = empty("replyall_core")
    pink = mat(RPA_ACCENT)
    paper = mat("paper")
    h = 0.80
    parts, _ = _rpa_cabinet(h=h)
    # The mouth the mail flies out of, and three envelopes on their way to everyone.
    parts += [box("Mouth", (0.28, 0.15, 0.05), loc=(-0.03, -0.07, h), material=pink, bevel=0.01),
              box("MouthSlot", (0.22, 0.035, 0.012), loc=(-0.03, -0.07, h + 0.05), material=mat("charcoal"))]
    parts += _rpa_env("FanL", (-0.19, -0.07, 0.95), 0.17, 0.12, paper, pink, ry=-0.45)
    parts += _rpa_env("FanM", (-0.03, -0.07, 1.03), 0.18, 0.13, pink, paper)
    parts += _rpa_env("FanR", (0.11, -0.07, 0.96), 0.17, 0.12, paper, pink, ry=0.4)
    # The send lever at the front right of the roof.
    arm = box("LeverArm", (0.03, 0.03, 0.18), loc=(0.22, -0.12, h + 0.05), material=_rpa_steel())
    kit.tilt(arm, rx=0.5, pivot=(0.22, -0.12, h + 0.05))
    parts += [box("LeverBase", (0.08, 0.08, 0.05), loc=(0.22, -0.12, h), material=mat("charcoal"), bevel=0.01), arm,
              ball("LeverKnob", 0.045, loc=(0.22, -0.12 - 0.18 * math.sin(0.5), h + 0.05 + 0.18 * math.cos(0.5)), material=pink)]
    parent(join("replyall_core_mesh", parts), root)
    _slots(root, [((0, 0.12, h), 1.0), ((0.32, -0.10, h), 1.0), ((-0.32, -0.02, 0.40), 1.0)])
    return root


# Modules.

def b_replyall_m0_1():
    """High Priority: a red flag with a ! on a pole, up to 1.30 on the plain cabinet."""
    root = empty("replyall_m0_1")
    parts = _rpa_flag("Flag", 0.0, 0.47, 0.24, 0.16, mat(RPA_PATH[0]))
    parent(join("replyall_m0_1_mesh", parts), root)
    return root


def b_replyall_m0_2():
    """Read Receipt: two red flags and a red warning lamp between them."""
    root = empty("replyall_m0_2")
    red = mat(RPA_PATH[0])
    parts = _rpa_flag("FlagA", -0.19, 0.56, 0.17, 0.13, red, toward=1)
    parts += _rpa_flag("FlagB", 0.19, 0.44, 0.17, 0.13, red, toward=-1)
    parts += [cyl("LampPost", 0.02, 0.10, loc=(0, 0, 0), material=_rpa_steel(), verts=8)]
    parts += _rpa_lamp("Lamp", (0, 0, 0.08), 0.065, mat(RPA_PATH[0], emit=1.5), h=0.13)
    parent(join("replyall_m0_2_mesh", parts), root)
    return root


def _rpa_hanger(top):
    """A blue clip over the top edge of the flank, a post up to `top` and an arm out to the chain."""
    blue = mat(RPA_PATH[1])
    return [box("Clip", (0.07, 0.07, 0.035), loc=(0, 0, 0), material=blue),
            box("Post", (0.03, 0.03, top + 0.16), loc=(0.02, 0, -0.16), material=blue),
            box("Arm", (0.10, 0.03, 0.03), loc=(0.07, 0, top - 0.03), material=blue)]


def b_replyall_m1_1():
    """Reply: a chain of two blue envelopes hanging down the right flank."""
    root = empty("replyall_m1_1")
    blue = mat(RPA_PATH[1])
    paper = mat("paper")
    parts = _rpa_hanger(0.24)
    parts += [box("Link0", (0.012, 0.012, 0.07), loc=(0.08, 0, 0.15), material=blue)]
    parts += _rpa_env("EnvA", (0.08, 0, 0.08), 0.20, 0.14, blue, paper, rz=-1.05)
    parts += [box("Link1", (0.012, 0.012, 0.06), loc=(0.08, 0, -0.03), material=blue)]
    parts += _rpa_env("EnvB", (0.08, 0, -0.10), 0.20, 0.14, blue, paper, rz=-1.05)
    parent(join("replyall_m1_1_mesh", parts), root)
    return root


def b_replyall_m1_2():
    """Reply Again: a blue reel on a taller post, four envelopes spiralling down from it."""
    root = empty("replyall_m1_2")
    blue = mat(RPA_PATH[1])
    paper = mat("paper")
    parts = _rpa_hanger(0.22)
    rc = (0.075, 0, 0.31)
    parts += [_cyly("ReelA", 0.065, 0.016, (rc[0], -0.04, rc[2]), blue, verts=12),
              _cyly("ReelB", 0.065, 0.016, (rc[0], 0.04, rc[2]), blue, verts=12),
              _cyly("ReelHub", 0.045, 0.07, rc, paper, verts=10),
              box("Thread", (0.012, 0.012, 0.66), loc=(0.075, 0, -0.35), material=blue)]
    for k in range(4):
        a = -0.7 - k * 0.3
        parts += _rpa_env(f"Env{k}", (0.075, 0.03 * math.sin(k * 1.6), 0.15 - k * 0.155), 0.15, 0.12,
                          blue if k % 2 == 0 else paper, paper if k % 2 == 0 else blue, rz=a)
    parent(join("replyall_m1_2_mesh", parts), root)
    return root


def _rpa_disc(c, r, rz=0.26, pre="Disc"):
    """The pink CC disc with a white @, facing out of the left flank and a little to the front."""
    pink = mat(RPA_PATH[2])
    x, y, z = c
    disc = _cylx(pre, r, 0.035, c, pink, verts=14)
    kit.tilt(disc, rz=rz, pivot=c)
    n = (-math.cos(rz), -math.sin(rz))
    off = 0.0175 + 0.008
    at = _rpa_at(f"{pre}At", (x + n[0] * off, y + n[1] * off, z), r * 0.66, mat("paper"), rz=-math.pi / 2 + rz, t=0.016)
    return [disc] + at


def b_replyall_m2_1():
    """CC the Team: a pink @ disc on an arm, a small rack of cards under it."""
    root = empty("replyall_m2_1")
    pink = mat(RPA_PATH[2])
    paper = mat("paper")
    parts = [box("Plate", (0.02, 0.12, 0.16), loc=(-0.01, 0, 0.10), material=pink),
             box("ArmBar", (0.07, 0.03, 0.03), loc=(-0.045, 0, 0.17), material=_rpa_steel()),
             box("Rack", (0.08, 0.17, 0.06), loc=(-0.04, 0, -0.18), material=pink, bevel=0.006)]
    for i, (x, hh) in enumerate(((-0.022, 0.09), (-0.042, 0.11), (-0.062, 0.10))):
        parts.append(box(f"Card{i}", (0.01, 0.12, hh), loc=(x, 0, -0.16), material=paper))
    parts += _rpa_disc((-0.08, 0, 0.19), 0.12)
    parent(join("replyall_m2_1_mesh", parts), root)
    return root


def b_replyall_m2_2():
    """Distribution List: a card wheel on a shelf, and the @ disc above it."""
    root = empty("replyall_m2_2")
    pink = mat(RPA_PATH[2])
    paper = mat("paper")
    dark = mat("charcoal")
    cx, cz = -0.07, -0.04
    parts = [box("Bracket", (0.02, 0.28, 0.06), loc=(-0.01, 0, -0.27), material=dark),
             box("Shelf", (0.135, 0.28, 0.025), loc=(-0.0675, 0, -0.235), material=dark),
             box("StandA", (0.015, 0.08, cz + 0.21), loc=(-0.0075, 0, -0.21), material=pink),
             box("StandB", (0.015, 0.08, cz + 0.21), loc=(-0.1275, 0, -0.21), material=pink),
             _cylx("Axle", 0.022, 0.135, (cx, 0, cz), _rpa_steel(), verts=8),
             _cylx("Hub", 0.05, 0.095, (cx, 0, cz), pink, verts=10)]
    for i in range(10):
        a = 2 * math.pi * i / 10
        card = box(f"Card{i}", (0.095, 0.012, 0.11), loc=(cx, 0, cz + 0.045), material=pink if i % 2 else paper)
        kit.tilt(card, rx=a, pivot=(cx, 0, cz))
        parts.append(card)
    parts += [box("Plate", (0.02, 0.12, 0.16), loc=(-0.01, 0, 0.22), material=pink),
              box("ArmBar", (0.07, 0.03, 0.03), loc=(-0.045, 0, 0.29), material=_rpa_steel())]
    parts += _rpa_disc((-0.08, 0, 0.30), 0.12)
    parent(join("replyall_m2_2_mesh", parts), root)
    return root


# Heroes. Each repaints the cabinet in its path colour and replaces the roof.

def b_replyall_p0_3():
    """URGENT: a red cabinet with a striped band, a siren and a giant exclamation mark."""
    root = empty("replyall_p0_3")
    red = RPA_PATH[0]
    w, d, h = 0.70, 0.42, 0.84
    parts, _ = _rpa_cabinet(w, d, h, body=red, back=red, envs=(("paper", red), ("paper", red)), stripe=red, trim="paper")
    parts += _rpa_band(w, d, h, red)
    top = h + 0.06
    glow = mat(red, emit=0.4)
    parts += [box("BangDot", (0.13, 0.13, 0.11), loc=(-0.15, 0, top), material=glow, bevel=0.012),
              box("BangBar", (0.10, 0.10, 0.36), loc=(-0.15, 0, top + 0.18), material=glow, bevel=0.012, taper=1.45)]
    parts += _rpa_lamp("Siren", (0.17, 0, top), 0.12, mat(red, emit=1.5), h=0.16)
    parent(join("replyall_p0_3_mesh", parts), root)
    _slots(root, [((0, 0.12, top), 1.0), ((w / 2, -0.10, top), 1.0), ((-w / 2, -0.02, 0.44), 1.0)])
    return root


def b_replyall_p0_4():
    """Escalated: a red megaphone in a swivel fork on the roof, two sirens, and envelopes sticking
    out of the holes as a staircase up the front."""
    root = empty("replyall_p0_4")
    red = RPA_PATH[0]
    w, d, h = 0.72, 0.44, 0.86
    steps = ((0, 0), (1, 1), (2, 2))
    parts, holes = _rpa_cabinet(w, d, h, body=red, back=red, envs=(("paper", red), ("paper", red)), stripe=red, skip=steps, trim="paper")
    for i, rc in enumerate(steps):
        cx, fz, cw = holes[rc]
        c = (cx, -d / 2 - 0.02, fz + 0.012)
        parts += _rpa_env(f"Step{i}", c, cw - 0.03, 0.26, mat("paper"), mat(red), stripe=mat(red), rx=math.pi / 2, t=0.02)
    parts += _rpa_band(w, d, h, red)
    top = h + 0.06
    dark = mat("charcoal")
    glowr = mat(red, emit=1.5)
    pz, py = 1.30, -0.02
    parts += [cyl("Turn", 0.12, 0.04, loc=(0, py, top), material=dark, verts=12),
              cyl("ForkPost", 0.035, 1.0 - top - 0.04, loc=(0, py, top + 0.04), material=dark, verts=8),
              box("ForkBase", (0.48, 0.08, 0.04), loc=(0, py, 1.0), material=dark, bevel=0.006)]
    for sx in (-1, 1):
        parts += [box(f"Fork{sx}", (0.035, 0.08, pz + 0.04 - 1.0), loc=(sx * 0.225, py, 1.0), material=dark),
                  _cylx(f"Bolt{sx}", 0.04, 0.05, (sx * 0.225, py, pz), mat("paper"), verts=10)]
    horn = [_cyly("Horn", 0.25, 0.45, (0, py, pz), mat(red), verts=14, r2=0.08),
            _cyly("Rim", 0.258, 0.03, (0, py - 0.21, pz), glowr, verts=14),
            _cyly("Mouth", 0.215, 0.012, (0, py - 0.234, pz), dark, verts=14),
            _cyly("Throat", 0.128, 0.04, (0, py + 0.12, pz), mat("paper"), verts=12),
            _cyly("Cap", 0.09, 0.03, (0, py + 0.235, pz), dark, verts=12),
            box("Grip", (0.05, 0.06, 0.13), loc=(0, py + 0.12, pz - 0.25), material=dark, bevel=0.008)]
    kit.tilt(horn, rx=-0.2, pivot=(0, py, pz))
    parts += horn
    for sx in (-1, 1):
        parts += _rpa_lamp(f"Siren{sx}", (sx * 0.26, 0.13, top), 0.075, glowr, h=0.13)
    parent(join("replyall_p0_4_mesh", parts), root)
    _slots(root, [((0, 0.12, top), 1.0), ((w / 2, -0.10, top), 1.0), ((-w / 2, -0.02, 0.45), 1.0)])
    return root


def b_replyall_p1_3():
    """Reply Storm: a blue cabinet with a Y of blowers on the roof, each blowing a fan of mail,
    and a swirl above."""
    root = empty("replyall_p1_3")
    blue = RPA_PATH[1]
    w, d, h = 0.70, 0.42, 0.82
    parts, _ = _rpa_cabinet(w, d, h, body=blue, back=blue, envs=(("paper", blue), ("paper", "charcoal")), trim="paper")
    steel = _rpa_steel()
    bl = mat(blue)
    glow = mat(blue, emit=0.7)
    paper = mat("paper")
    parts += [cyl("Turret", 0.07, 0.06, loc=(0, 0, h), material=mat("charcoal"), verts=12),
              cyl("Stem", 0.045, 0.14, loc=(0, 0, h + 0.06), material=steel, verts=10),
              ball("Joint", 0.06, loc=(0, 0, 1.0), material=bl)]
    th, arm, noz = 0.9, 0.16, 0.10
    for s in (-1, 1):
        ex, ez = s * arm * math.sin(th), 1.0 + arm * math.cos(th)
        parts += [cyl(f"Arm{s}", 0.04, arm, loc=(0, 0, 1.0), material=steel, verts=10, rot=(0, s * th, 0)),
                  cyl(f"Nozzle{s}", 0.045, noz, loc=(ex, 0, ez), material=bl, verts=12, radius_top=0.09, rot=(0, s * th, 0))]
        nx, nz = ex + s * noz * math.sin(th), ez + noz * math.cos(th)
        a0 = math.pi / 2 - th
        for k, (da, dist) in enumerate(((-0.6, 0.10), (0.0, 0.14), (0.6, 0.12))):
            a = a0 + da
            c = (nx + s * dist * math.cos(a), 0, nz + dist * math.sin(a))
            parts += _rpa_env(f"Gust{s}{k}", c, 0.14, 0.10, paper if k != 1 else bl, bl if k != 1 else paper, ry=-s * a)
    parts += _ring("Swirl", 0.12, 10, 0.025, (0, 0, 1.40), glow, axis="z")
    parts += _ring("SwirlIn", 0.065, 8, 0.022, (0, 0, 1.33), glow, axis="z")
    parent(join("replyall_p1_3_mesh", parts), root)
    _slots(root, [((0, 0.15, h), 1.0), ((w / 2, -0.10, h), 1.0), ((-w / 2, -0.02, 0.41), 1.0)])
    return root


def b_replyall_p1_4():
    """Infinite Loop: ten envelopes riding a standing ring of blue light above the cabinet."""
    root = empty("replyall_p1_4")
    blue = RPA_PATH[1]
    w, d, h = 0.66, 0.42, 0.80
    parts, _ = _rpa_cabinet(w, d, h, body=blue, back=blue, envs=(("paper", blue), ("paper", "charcoal")), trim="paper")
    glow = mat(blue, emit=0.8)
    bl = mat(blue)
    paper = mat("paper")
    cz, r = 1.27, 0.36
    parts += [cyl("Foot", 0.07, 0.04, loc=(0, 0, h), material=mat("charcoal"), verts=12),
              box("Pillar", (0.05, 0.05, cz - r - h - 0.02), loc=(0, 0, h + 0.02), material=bl)]
    for sy in (-1, 1):
        parts += _ring(f"Rail{sy}", r, 28, 0.03, (0, sy * 0.035, cz), glow, axis="y")
    for k in range(10):
        a = math.radians(-72 + 36 * k)
        px, pz = r * math.cos(a), cz + r * math.sin(a)
        parts += _rpa_env(f"Loop{k}", (px, 0, pz), 0.15, 0.10, paper if k % 2 else bl, bl if k % 2 else paper,
                          ry=-(a + math.pi / 2))
    parent(join("replyall_p1_4_mesh", parts), root)
    _slots(root, [((0, 0.15, h), 1.0), ((w / 2, -0.12, h), 1.0), ((-w / 2, -0.02, 0.40), 1.0)])
    return root


def _rpa_horn(pre, pivot, rx=0.0, ry=0.0):
    """A square pink PA horn pointing out of pivot (built along +Z, then turned)."""
    x, y, z = pivot
    pink = mat(RPA_PATH[2])
    parts = [box(f"{pre}", (0.08, 0.08, 0.24), loc=(x, y, z + 0.05), material=pink, taper=2.4),
             box(f"{pre}Mouth", (0.17, 0.17, 0.006), loc=(x, y, z + 0.291), material=mat("charcoal"))]
    kit.tilt(parts, rx=rx, ry=ry, pivot=pivot)
    return parts


def b_replyall_p2_3():
    """Company-Wide Email: a pink cabinet with a mast of three loudspeaker horns."""
    root = empty("replyall_p2_3")
    pink = RPA_PATH[2]
    w, d, h = 0.70, 0.42, 0.84
    parts, _ = _rpa_cabinet(w, d, h, body=pink, back=pink, envs=(("paper", pink), ("paper", "charcoal")), trim="paper")
    hz = 1.28
    parts += [cyl("MastFoot", 0.08, 0.03, loc=(0, 0, h), material=mat("charcoal"), verts=12),
              cyl("Mast", 0.03, 1.36 - h, loc=(0, 0, h), material=_rpa_steel(), verts=8),
              box("Junction", (0.11, 0.11, 0.12), loc=(0, 0, hz - 0.06), material=mat("charcoal"), bevel=0.01),
              ball("MastTop", 0.04, loc=(0, 0, 1.37), material=mat(pink, emit=1.0))]
    dip = 0.15
    parts += _rpa_horn("HornR", (0, 0, hz), ry=math.pi / 2 + dip)
    parts += _rpa_horn("HornL", (0, 0, hz), ry=-(math.pi / 2 + dip))
    parts += _rpa_horn("HornF", (0, 0, hz), rx=math.pi / 2 + dip)
    parent(join("replyall_p2_3_mesh", parts), root)
    _slots(root, [((0, 0.15, h), 1.0), ((w / 2, -0.10, h), 1.0), ((-w / 2, -0.02, 0.42), 1.0)])
    return root


def b_replyall_p2_4():
    """All Staff: a wide pink cabinet with a big pink dish on a mast, three rings of light
    going out from it."""
    root = empty("replyall_p2_4")
    pink = RPA_PATH[2]
    w, d, h = 0.80, 0.44, 0.86
    parts, _ = _rpa_cabinet(w, d, h, body=pink, back=pink, envs=(("paper", pink), ("paper", "charcoal")), trim="paper")
    glow = mat(pink, emit=1.5)
    C = (0, -0.06, 1.24)
    e = 0.65
    parts += [cyl("MastFoot", 0.09, 0.03, loc=(0, -0.02, h), material=mat("charcoal"), verts=12),
              cyl("Mast", 0.035, 1.21 - h, loc=(0, -0.02, h), material=_rpa_steel(), verts=8)]
    dish = [_cyly("Dish", 0.35, 0.10, C, mat(pink), verts=16, r2=0.12),
            _cyly("Face", 0.30, 0.012, (0, C[1] - 0.053, C[2]), mat("paper"), verts=16),
            _cyly("Hub", 0.07, 0.05, (0, C[1] + 0.07, C[2]), mat("charcoal"), verts=10),
            _cyly("Feed", 0.015, 0.26, (0, C[1] - 0.18, C[2]), _rpa_steel(), verts=6),
            ball("FeedHead", 0.045, loc=(0, C[1] - 0.31, C[2]), material=glow)]
    for k, (dist, rr, n) in enumerate(((0.16, 0.18, 12), (0.26, 0.25, 14), (0.36, 0.32, 16))):
        dish += _ring(f"Wave{k}", rr, n, 0.022, (0, C[1] - dist, C[2]), glow, axis="y")
    kit.tilt(dish, rx=-e, pivot=C)
    parts += dish
    parent(join("replyall_p2_4_mesh", parts), root)
    _slots(root, [((0, 0.15, h), 1.0), ((w / 2, -0.10, h), 1.0), ((-w / 2, -0.02, 0.43), 1.0)])
    return root


def tower_replyall(tiers):
    return tower_parts("replyall", tiers)


TOWER_PART_BUILDERS["replyall_core"] = b_replyall_core
for _p in range(3):
    for _t in (1, 2):
        TOWER_PART_BUILDERS[f"replyall_m{_p}_{_t}"] = globals()[f"b_replyall_m{_p}_{_t}"]
    for _t in (3, 4):
        TOWER_PART_BUILDERS[f"replyall_p{_p}_{_t}"] = globals()[f"b_replyall_p{_p}_{_t}"]


# --- delegation (tower parts)

# --- Delegation (7.12). The mail cart that passes the work on: a tower of trays on wheels, yellow
# folders sliding out, an "out" tray on the roof and a big hooked arrow pointing away.
# Slot0 (ESCALATE) on the roof, Slot1 (DELEGATE) at the right foot, Slot2 (PROTOCOL) at the left
# foot. Flank modules grow away from their origin: path 2 towards +X, path 3 towards -X, so they
# stand next to any core or hero without reaching into it.

DG_ACCENT = "#f2c641"
DG_PATH = ("#f2c641", "#7fb6e3", "#8fa0b4")
DG_TOP = 0.80


def _dg_steel():
    return mat("metal_light", metal=0.6, rough=0.35)


def _dg_tray(pre, c, w, d, h=0.08, col="charcoal", fill="paper", poke=0.0, side=0, back=0.0):
    """An in-tray standing on c, its contents as a lighter top. poke: a yellow folder sticking out
    of the front on one side (-1 left, 1 right); back: a sheet sticking out of the back opposite."""
    x, y, z = c
    parts = [box(f"{pre}Tray", (w, d, h), loc=(x, y, z), material=mat(col), bevel=0.008),
             box(f"{pre}Fill", (w - 0.05, d - 0.05, 0.012), loc=(x, y, z + h - 0.004), material=mat(fill))]
    if poke:
        fw, fd = w * 0.44, d * 0.8
        parts.append(box(f"{pre}Folder", (fw, fd, 0.04), loc=(x + side * w * 0.22, y - d / 2 - poke + fd / 2, z + h - 0.046),
                         material=mat(DG_ACCENT), bevel=0.006))
    if back:
        sd = 0.20
        parts.append(box(f"{pre}Sheet", (w * 0.40, sd, 0.02), loc=(x - side * w * 0.22, y + d / 2 + back - sd / 2, z + h - 0.03),
                         material=mat("paper")))
    return parts


def _dg_wheels(pre, cx, cy, hx, hy, r=0.05):
    """Four casters: a steel fork and a black wheel at each corner, the top at 2r."""
    parts = []
    for i, (sx, sy) in enumerate(((-1, -1), (1, -1), (-1, 1), (1, 1))):
        x, y = cx + sx * hx, cy + sy * hy
        parts += [box(f"{pre}Fork{i}", (0.05, 0.05, 0.04), loc=(x, y, 2 * r - 0.04), material=_dg_steel()),
                  _cylx(f"{pre}Wheel{i}", r, 0.04, (x, y, r), mat("plastic_black"), verts=8)]
    return parts


def _dg_cart(pre, c, w, d, top, trays, panel, pokes=(), r=0.05, handle=True, deck=None):
    """The mail cart: casters, a steel deck, corner posts, two coloured side panels, a roof deck at
    top, and a tray on rails at every height in trays."""
    cx, cy = c
    z0 = 2 * r
    steel = _dg_steel()
    dk = mat(deck) if deck else steel
    parts = _dg_wheels(pre, cx, cy, w / 2 - 0.06, d / 2 - 0.06, r)
    parts += [box(f"{pre}Deck", (w, d, 0.04), loc=(cx, cy, z0), material=dk, bevel=0.008),
              box(f"{pre}Roof", (w, d, 0.04), loc=(cx, cy, top - 0.04), material=dk, bevel=0.008)]
    for i, (sx, sy) in enumerate(((-1, -1), (1, -1), (-1, 1), (1, 1))):
        parts.append(box(f"{pre}Post{i}", (0.035, 0.035, top - z0 - 0.08), loc=(cx + sx * (w / 2 - 0.0175), cy + sy * (d / 2 - 0.0175), z0 + 0.04),
                         material=steel))
    ph = top - z0 - 0.14
    for i, sx in enumerate((-1, 1)):
        parts.append(box(f"{pre}Panel{i}", (0.022, d - 0.05, ph), loc=(cx + sx * (w / 2 - 0.013), cy, z0 + 0.07), material=mat(panel)))
    tw, td = w - 0.10, d - 0.10
    for k, z in enumerate(trays):
        side = pokes[k] if k < len(pokes) else 0
        parts += _dg_tray(f"{pre}T{k}", (cx, cy, z), tw, td, poke=0.12 if side else 0.0, side=side, back=0.06 if side else 0.0)
        for j, sx in enumerate((-1, 1)):
            parts.append(box(f"{pre}Rail{k}{j}", (0.05, td, 0.02), loc=(cx + sx * (tw / 2 + 0.01), cy, z - 0.02), material=steel))
    if handle:
        hy, hz = cy + d / 2 + 0.045, top - 0.14
        for sx in (-1, 1):
            parts.append(box(f"{pre}Stub{sx}", (0.03, 0.06, 0.03), loc=(cx + sx * (w / 2 - 0.0175), cy + d / 2 + 0.02, hz - 0.015), material=steel))
        parts += [_cylx(f"{pre}Handle", 0.018, w - 0.02, (cx, hy, hz), steel, verts=8),
                  _cylx(f"{pre}Grip", 0.03, w * 0.5, (cx, hy, hz), mat("charcoal"), verts=8)]
    return parts


def _dg_arrow(pre, base, length, direction, material, w=0.07, hw=0.18, hl=None):
    """A solid arrow from base: a square shaft and a pyramid head, reads from every side."""
    hl = hl or min(length * 0.5, hw * 0.85)
    x, y, z = base
    parts = [box(f"{pre}Shaft", (w, w, length - hl + 0.01), loc=(x, y, z), material=material),
             box(f"{pre}Head", (hw, hw, hl), loc=(x, y, z + length - hl), material=material, taper=0.03)]
    rot = {"up": (0, 0), "down": (0, math.pi), "+x": (0, math.pi / 2), "-x": (0, -math.pi / 2)}[direction]
    if rot != (0, 0):
        kit.tilt(parts, rx=rot[0], ry=rot[1], pivot=(x, y, z))
    return parts


def _dg_hook(pre, x0, y, z0, material, s=1.0):
    """The big hooked arrow: up from z0, round a bend of three blocks, then off towards +X."""
    t = 0.09 * s
    R = 0.12 * s
    cx, cz = x0 + R, z0 + 0.04 * s
    parts = [box(f"{pre}Stem", (t, t, 0.05 * s), loc=(x0, y, z0), material=material)]
    for i, th in enumerate((165, 135, 105)):
        a = math.radians(th)
        px, pz = cx + R * math.cos(a), cz + R * math.sin(a)
        b = box(f"{pre}Bend{i}", (R * math.pi / 6 * 1.25, t, t), loc=(px, y, pz - t / 2), material=material)
        kit.tilt(b, ry=math.pi / 2 - a, pivot=(px, y, pz))
        parts.append(b)
    sx0, sx1 = cx - 0.01 * s, cx + 0.25 * s
    parts.append(box(f"{pre}Shaft", (sx1 - sx0, t, t), loc=((sx0 + sx1) / 2, y, cz + R - t / 2), material=material))
    parts += _dg_arrow(f"{pre}Tip", (sx1 - 0.01 * s, y, cz + R), 0.17 * s, "+x", material, w=t, hw=0.20 * s, hl=0.17 * s)[1:]
    return parts


def _dg_outtray(pre, c):
    """The 'out' tray on the roof, tipped forward, a yellow folder sliding out of it."""
    x, y, z = c
    parts = [box(f"{pre}Leg{i}", (0.04, 0.04, 0.055), loc=(x + sx * 0.11, y + 0.11, z), material=mat("charcoal")) for i, sx in enumerate((-1, 1))]
    tipped = _dg_tray(pre, (x, y, z), 0.30, 0.28, h=0.07)
    tipped.append(box(f"{pre}Slide", (0.22, 0.26, 0.035), loc=(x, y - 0.09, z + 0.035), material=mat(DG_ACCENT), bevel=0.005))
    kit.tilt(tipped, rx=0.20, pivot=(x, y - 0.14, z))
    return parts + tipped


def b_delegation_core():
    root = empty("delegation_core")
    parts = _dg_cart("C", (0, 0), 0.60, 0.46, DG_TOP, (0.16, 0.38, 0.60), DG_ACCENT, pokes=(-1, 1, -1))
    parts += _dg_outtray("Out", (-0.14, -0.07, DG_TOP))
    parts += _dg_hook("Hook", -0.22, 0.14, DG_TOP, mat(DG_ACCENT))
    parent(join("delegation_core_mesh", parts), root)
    _slots(root, [((0.15, -0.06, DG_TOP), 1.0), ((0.30, 0.0, 0.0), 1.0), ((-0.30, 0.0, 0.0), 1.0)])
    return root


# Modules. ESCALATE goes up on the roof, DELEGATE is a chute down the right side, PROTOCOL a shelf
# of binders on the left.

def b_delegation_m0_1():
    """Loop In: a fourth tray, and a yellow arrow up on a stick."""
    root = empty("delegation_m0_1")
    y_ = mat(DG_PATH[0])
    parts = _dg_tray("T4", (0, 0, 0), 0.28, 0.22, fill=DG_PATH[0])
    parts.append(box("Stick", (0.035, 0.035, 0.27), loc=(0, 0.02, 0.07), material=_dg_steel()))
    parts += _dg_arrow("Up", (0, 0.02, 0.30), 0.20, "up", y_, w=0.09, hw=0.19, hl=0.15)
    parent(join("delegation_m0_1_mesh", parts), root)
    return root


def b_delegation_m0_2():
    """Escalate: a yellow staircase, on every step a bigger folder than on the one before."""
    root = empty("delegation_m0_2")
    y_ = mat(DG_PATH[0])
    parts = []
    for i, (h, fh, fd) in enumerate(((0.16, 0.09, 0.12), (0.30, 0.12, 0.16), (0.44, 0.15, 0.20))):
        x = -0.10 + i * 0.10
        parts += [box(f"Step{i}", (0.10, 0.22, h), loc=(x, 0, 0), material=y_, bevel=0.01),
                  box(f"Folder{i}", (0.03, fd, fh), loc=(x + 0.02, 0.0, h), material=mat("paper"), bevel=0.004),
                  box(f"Tab{i}", (0.032, 0.05, 0.03), loc=(x + 0.02, -fd / 2 + 0.04, h + fh), material=mat("charcoal"))]
    parent(join("delegation_m0_2_mesh", parts), root)
    return root


def _dg_chute(pre):
    """A light blue chute from roof height down to the floor, on its own post, a folder on the way."""
    blue = mat(DG_PATH[1])
    steel = _dg_steel()
    y0, z0, y1, z1 = 0.17, 0.70, -0.34, 0.07
    L = math.hypot(y0 - y1, z0 - z1)
    a = math.atan2(z0 - z1, y0 - y1)
    cx, cy, cz = 0.078, (y0 + y1) / 2, (z0 + z1) / 2
    trough = [box(f"{pre}Bed", (0.13, L, 0.025), loc=(cx, cy, cz - 0.025), material=blue),
              box(f"{pre}RailL", (0.02, L, 0.075), loc=(cx - 0.065, cy, cz - 0.025), material=blue),
              box(f"{pre}RailR", (0.02, L, 0.075), loc=(cx + 0.065, cy, cz - 0.025), material=blue),
              box(f"{pre}Folder", (0.11, 0.17, 0.03), loc=(cx, cy - 0.04, cz), material=mat(DG_ACCENT), bevel=0.004)]
    kit.tilt(trough, rx=a, pivot=(cx, cy, cz))
    parts = trough + [
        box(f"{pre}Post", (0.04, 0.04, z0 - 0.05), loc=(cx, y0 - 0.01, 0), material=steel),
        box(f"{pre}MidPost", (0.035, 0.035, cz - 0.06), loc=(cx, cy, 0), material=steel),
        box(f"{pre}Hook", (0.10, 0.04, 0.035), loc=(cx - 0.05, y0 - 0.01, z0 - 0.09), material=steel),
        box(f"{pre}Lip", (0.13, 0.12, 0.03), loc=(cx, y1 - 0.06, 0), material=blue, bevel=0.005)]
    return parts, (cx, y0, z0, y1, z1)


def b_delegation_m1_1():
    """Delegate: the chute."""
    root = empty("delegation_m1_1")
    parts, _ = _dg_chute("Ch")
    parent(join("delegation_m1_1_mesh", parts), root)
    return root


def b_delegation_m1_2():
    """Assign: the chute, three light blue name flags along it and a stamp at the foot."""
    root = empty("delegation_m1_2")
    blue = mat(DG_PATH[1])
    parts, (cx, y0, z0, y1, z1) = _dg_chute("Ch")
    for i, t in enumerate((0.18, 0.45, 0.72)):
        y, z = y0 + (y1 - y0) * t, z0 + (z1 - z0) * t + 0.04
        x = cx + 0.065
        parts += [box(f"FlagStick{i}", (0.018, 0.018, 0.24), loc=(x, y, z), material=_dg_steel()),
                  box(f"Flag{i}", (0.02, 0.15, 0.11), loc=(x, y + 0.075, z + 0.13), material=blue, bevel=0.003),
                  box(f"Name{i}", (0.024, 0.10, 0.03), loc=(x, y + 0.08, z + 0.17), material=mat("paper"))]
    sy = y1 - 0.06
    parts += [box("StampPad", (0.13, 0.11, 0.04), loc=(cx, sy, 0.03), material=mat("charcoal"), bevel=0.005),
              box("StampFoot", (0.09, 0.07, 0.04), loc=(cx, sy, 0.07), material=mat("charcoal")),
              cyl("StampNeck", 0.022, 0.08, loc=(cx, sy, 0.11), material=_dg_steel(), verts=8),
              cyl("StampGrip", 0.045, 0.07, loc=(cx, sy, 0.19), material=blue, verts=10, bevel=0.008),
              ball("StampKnob", 0.05, loc=(cx, sy, 0.29), material=blue)]
    parent(join("delegation_m1_2_mesh", parts), root)
    return root


def _dg_binders(pre):
    """Two grey binders standing on a plank, spines to the front, labels front and back."""
    grey = mat(DG_PATH[2])
    parts = [box(f"{pre}Plank", (0.16, 0.34, 0.03), loc=(-0.08, 0, 0.07), material=mat("wood"), bevel=0.005)]
    for i, sy in enumerate((-1, 1)):
        parts.append(box(f"{pre}Foot{i}", (0.14, 0.04, 0.07), loc=(-0.08, sy * 0.13, 0), material=mat("charcoal")))
    for i, x in enumerate((-0.04, -0.115)):
        parts.append(box(f"{pre}Binder{i}", (0.075, 0.30, 0.34), loc=(x, 0, 0.10), material=grey, bevel=0.008))
        for sy in (-1, 1):
            parts += [box(f"{pre}Label{i}{sy}", (0.05, 0.012, 0.13), loc=(x, sy * 0.151, 0.25), material=mat("paper")),
                      _cyly(f"{pre}Hole{i}{sy}", 0.02, 0.012, (x, sy * 0.152, 0.17), mat("plastic_black"), verts=8)]
    return parts


def b_delegation_m2_1():
    """Wider Circle: two binders on a plank."""
    root = empty("delegation_m2_1")
    parent(join("delegation_m2_1_mesh", _dg_binders("Bn")), root)
    return root


def b_delegation_m2_2():
    """Paper Trail: the binders, a long paper trail out of them onto the floor, a magnifying glass on it."""
    root = empty("delegation_m2_2")
    paper = mat("paper")
    parts = _dg_binders("Bn")
    x = -0.115
    # Paper over the top of the outer binder, down its front and out over the floor.
    yb = -0.19
    parts += [box("TrailTop", (0.085, 0.10, 0.012), loc=(x, -0.14, 0.44), material=paper),
              box("TrailHang", (0.085, 0.012, 0.44), loc=(x, yb, 0.012), material=paper),
              box("TrailFloor", (0.09, 0.26, 0.012), loc=(x, yb - 0.124, 0), material=paper),
              box("TrailStripe", (0.06, 0.18, 0.004), loc=(x, yb - 0.14, 0.012), material=mat(DG_PATH[2])),
              _cylx("TrailCurl", 0.035, 0.09, (x, yb - 0.27, 0.035), paper, verts=10)]
    # The magnifying glass lies on the trail, propped on its rim.
    mc = (-0.075, -0.40, 0.05)
    glass = _ring("Lens", 0.075, 10, 0.024, mc, mat("charcoal"))
    glass += [cyl("LensGlass", 0.068, 0.012, loc=(mc[0], mc[1], mc[2] - 0.006), material=mat("window", rough=0.15, alpha=0.5), verts=12),
              box("LensHandle", (0.035, 0.10, 0.035), loc=(mc[0], mc[1] + 0.125, mc[2] - 0.018), material=mat(DG_PATH[2]), bevel=0.006)]
    kit.tilt(glass, rx=-0.18, pivot=(mc[0], mc[1] + 0.17, 0.02))
    parts += glass
    parent(join("delegation_m2_2_mesh", parts), root)
    return root


# Heroes.

def _dg_orgchart(pre, line, tray_fill=DG_PATH[0]):
    """The org chart on a yellow cart: one tray on top, two under it, four at the bottom, hung on
    lines. Returns the parts and the height of the top of the pole."""
    yel = mat(DG_PATH[0])
    steel = _dg_steel()
    ly = 0.165
    parts = _dg_wheels(pre, 0, 0, 0.27, 0.15)
    parts += [box(f"{pre}Base", (0.68, 0.42, 0.07), loc=(0, 0, 0.10), material=yel, bevel=0.012),
              box(f"{pre}Pole", (0.05, 0.05, 1.10), loc=(0, ly, 0.17), material=steel)]
    rows = ((1, 1.02, 0.38, "yellow"), (2, 0.74, 0.27, "plastic_white"), (4, 0.42, 0.17, "charcoal"))
    xs = {0: [0.0], 1: [-0.19, 0.19], 2: [-0.285, -0.095, 0.095, 0.285]}
    for r, (n, z, w, col) in enumerate(rows):
        for i, x in enumerate(xs[r]):
            parts += _dg_tray(f"{pre}R{r}{i}", (x, 0.0, z), w, 0.28, h=0.07, col=DG_PATH[0] if col == "yellow" else col,
                              fill="paper" if col == "yellow" else tray_fill)
    # Lines: top to a bar over the two, each of the two to a bar over its pair.
    parts.append(box(f"{pre}Bar1", (0.42, 0.04, 0.04), loc=(0, ly, 0.88), material=line))
    for i, x in enumerate((-0.19, 0.19)):
        parts.append(box(f"{pre}Drop1{i}", (0.04, 0.04, 0.08), loc=(x, ly, 0.81), material=line))
        parts.append(box(f"{pre}Up2{i}", (0.04, 0.04, 0.12), loc=(x, ly, 0.62), material=line))
        parts.append(box(f"{pre}Bar2{i}", (0.23, 0.04, 0.04), loc=(x, ly, 0.58), material=line))
        for j, cx in enumerate((x - 0.095, x + 0.095)):
            parts.append(box(f"{pre}Drop2{i}{j}", (0.04, 0.04, 0.09), loc=(cx, ly, 0.49), material=line))
    return parts, 0.17 + 1.10


def _dg_wheel(pre, c, r, material, knob):
    """A ship's steering wheel facing the front: a ring, four spokes, a hub and handles."""
    x, y, z = c
    parts = _ring(f"{pre}Rim", r, 12, 0.035, c, material, axis="y")
    for i in range(4):
        a = math.pi / 4 + i * math.pi / 2
        sp = box(f"{pre}Spoke{i}", (r * 2 + 0.10, 0.025, 0.025), loc=(x, y, z - 0.0125), material=material)
        kit.tilt(sp, ry=a, pivot=(x, y, z))
        parts.append(sp)
    parts.append(_cyly(f"{pre}Hub", 0.04, 0.06, (x, y, z), knob, verts=10))
    for i in range(4):
        a = math.pi / 4 + i * math.pi / 2
        parts.append(ball(f"{pre}Knob{i}", 0.03, loc=(x + (r + 0.05) * math.cos(a), y, z + (r + 0.05) * math.sin(a)), material=knob))
    return parts


def b_delegation_p0_3():
    """Steering Group: the org chart in trays on a yellow cart, a ship's wheel on top."""
    root = empty("delegation_p0_3")
    parts, pole = _dg_orgchart("Og", mat(DG_PATH[0]))
    wc = (0, 0.10, 1.27)
    parts += [box("Mast", (0.05, 0.05, wc[2] - pole + 0.02), loc=(0, 0.165, pole), material=_dg_steel()),
              _cyly("WheelAxle", 0.025, 0.07, (0, 0.14, wc[2]), _dg_steel(), verts=8)]
    parts += _dg_wheel("Wh", wc, 0.10, mat("wood_dark"), mat(DG_PATH[0]))
    parent(join("delegation_p0_3_mesh", parts), root)
    _slots(root, [((0, 0, DG_TOP), 1.0), ((0.38, -0.02, 0), 1.0), ((-0.38, -0.02, 0), 1.0)])
    return root


def b_delegation_p0_4():
    """Company Policy: the org chart with glowing lines and arrows running down it, a giant black
    rulebook behind it and a glowing wheel on top."""
    root = empty("delegation_p0_4")
    glow = mat(DG_PATH[0], emit=1.4)
    parts, pole = _dg_orgchart("Og", glow)
    for i, x in enumerate((-0.19, 0.19)):
        parts += _dg_arrow(f"Dn1{i}", (x, 0.165, 0.99), 0.17, "down", glow, w=0.04, hw=0.10, hl=0.08)
        parts += _dg_arrow(f"Dn2{i}", (x, 0.165, 0.735), 0.115, "down", glow, w=0.04, hw=0.10, hl=0.07)
    # The book stands behind it all: black covers, the page block, a yellow label and a ribbon.
    by, bh = 0.27, 1.00
    black = mat("plastic_black")
    parts += [box("BookBack", (0.56, 0.035, bh), loc=(0, by + 0.0625, 0), material=black, bevel=0.006),
              box("BookFront", (0.56, 0.035, bh), loc=(0, by - 0.0625, 0), material=black, bevel=0.006),
              box("BookPages", (0.53, 0.09, bh - 0.04), loc=(0.01, by, 0.02), material=mat("paper")),
              box("BookSpine", (0.035, 0.16, bh), loc=(-0.2625, by, 0), material=black, bevel=0.006),
              box("BookLabel", (0.40, 0.012, 0.30), loc=(0, by + 0.085, 0.55), material=mat(DG_PATH[0])),
              box("SpineBand", (0.04, 0.12, 0.10), loc=(-0.272, by, 0.75), material=mat(DG_PATH[0])),
              box("Ribbon", (0.05, 0.012, 0.60), loc=(0.14, by + 0.083, 0.42), material=glow),
              box("RibbonTop", (0.05, 0.10, 0.012), loc=(0.14, by + 0.03, bh), material=glow)]
    wc = (0, 0.10, 1.42)
    parts += [box("Mast", (0.05, 0.05, wc[2] - pole + 0.02), loc=(0, 0.165, pole), material=_dg_steel()),
              _cyly("WheelAxle", 0.025, 0.07, (0, 0.14, wc[2]), _dg_steel(), verts=8)]
    parts += _dg_wheel("Wh", wc, 0.12, glow, mat(DG_PATH[0]))
    parent(join("delegation_p0_4_mesh", parts), root)
    _slots(root, [((0, 0, DG_TOP), 1.0), ((0.38, -0.02, 0), 1.0), ((-0.38, -0.02, 0), 1.0)])
    return root


def b_delegation_p1_3():
    """Hand Off: two light blue tray towers, a roller track between them with a folder on it,
    an arrow out of each top."""
    root = empty("delegation_p1_3")
    blue = mat(DG_PATH[1])
    steel = _dg_steel()
    top = 1.04
    parts = []
    for i, sx in enumerate((-1, 1)):
        parts += _dg_cart(f"K{i}", (sx * 0.235, 0), 0.30, 0.36, top, (0.15, 0.36, 0.57, 0.78), DG_PATH[1],
                          pokes=(sx, 0, sx, 0), r=0.04, handle=False, deck=DG_PATH[1])
        parts.append(box(f"Ped{i}", (0.07, 0.07, 0.06), loc=(sx * 0.17, 0, top), material=mat("charcoal")))
        parts += _dg_arrow(f"Out{i}", (sx * 0.10, 0, top + 0.12), 0.30, "+x" if sx > 0 else "-x", blue, w=0.10, hw=0.20, hl=0.17)
    # The roller track at half height, through both towers.
    tz = 0.50
    for j, sy in enumerate((-1, 1)):
        parts.append(box(f"TrackRail{j}", (0.20, 0.025, 0.06), loc=(0, sy * 0.12, tz - 0.06), material=blue))
    for k in range(4):
        parts.append(_cyly(f"Roller{k}", 0.025, 0.22, (-0.075 + k * 0.05, 0, tz - 0.025), steel, verts=8))
    f = box("Passed", (0.16, 0.20, 0.035), loc=(0, 0, tz), material=mat(DG_ACCENT), bevel=0.005)
    kit.tilt(f, ry=-0.12, pivot=(0, 0, tz))
    parts.append(f)
    parent(join("delegation_p1_3_mesh", parts), root)
    _slots(root, [((0, -0.31, 0), 1.0), ((0.39, 0, 0), 1.0), ((-0.39, 0, 0), 1.0)])
    return root


def b_delegation_p1_4():
    """Outsource: a conveyor carrying parcels off the front, the tray tower behind it and a light
    blue globe in a glowing ring on top."""
    root = empty("delegation_p1_4")
    blue = mat(DG_PATH[1])
    glow = mat(DG_PATH[1], emit=1.4)
    steel = _dg_steel()
    tx, ty, top = -0.13, 0.15, 0.92
    parts = _dg_cart("T", (tx, ty), 0.34, 0.32, top, (0.16, 0.38, 0.60), DG_PATH[1], pokes=(1, 0, 1), handle=False, deck=DG_PATH[1])
    # Globe on the roof.
    gc = (tx, ty, 1.24)
    parts += [cyl("GlobeFoot", 0.09, 0.04, loc=(tx, ty, top), material=mat("charcoal"), verts=12),
              cyl("GlobePost", 0.022, 0.08, loc=(tx, ty, top + 0.04), material=steel, verts=8),
              ball("Globe", 0.18, loc=gc, material=blue, subdiv=2)]
    for i, (a, dz) in enumerate(((0.4, 0.05), (1.6, -0.06), (2.6, 0.08), (3.9, -0.02), (5.0, 0.04))):
        parts.append(ball(f"Land{i}", 0.07, loc=(tx + 0.155 * math.cos(a), ty + 0.155 * math.sin(a), gc[2] + dz),
                          material=mat("plant"), scale=(1.0, 1.0, 0.7)))
    parts += _ring("Meridian", 0.215, 14, 0.025, gc, glow, axis="y")
    parts.append(cyl("GlobePin", 0.02, 0.05, loc=(tx, ty, gc[2] + 0.225), material=steel, verts=8))
    # The conveyor runs to the front edge.
    bx, y0, y1, bz = 0.16, 0.30, -0.36, 0.34
    for i, (x, y) in enumerate(((bx - 0.09, y0 - 0.04), (bx + 0.09, y0 - 0.04), (bx - 0.09, y1 + 0.04), (bx + 0.09, y1 + 0.04))):
        parts.append(box(f"BeltLeg{i}", (0.03, 0.03, bz - 0.06), loc=(x, y, 0), material=steel))
    for j, sx in enumerate((-1, 1)):
        parts.append(box(f"BeltRail{j}", (0.025, y0 - y1, 0.08), loc=(bx + sx * 0.1075, (y0 + y1) / 2, bz - 0.08), material=blue, bevel=0.005))
    parts += [box("Belt", (0.19, y0 - y1 - 0.04, 0.02), loc=(bx, (y0 + y1) / 2, bz - 0.03), material=mat("charcoal")),
              _cylx("RollBack", 0.035, 0.19, (bx, y0 - 0.02, bz - 0.035), steel, verts=10),
              _cylx("RollFront", 0.035, 0.19, (bx, y1 + 0.02, bz - 0.035), steel, verts=10)]
    card = mat("cardboard")
    for i, (y, s) in enumerate(((0.20, 0.15), (-0.08, 0.14))):
        parts += [box(f"Parcel{i}", (s, s, s), loc=(bx, y, bz - 0.01), material=card, bevel=0.006),
                  box(f"ParcelLabel{i}", (0.08, 0.06, 0.006), loc=(bx + 0.01, y - 0.01, bz - 0.01 + s), material=mat("paper")),
                  box(f"ParcelStripe{i}", (0.08, 0.02, 0.008), loc=(bx + 0.01, y - 0.02, bz - 0.01 + s), material=blue),
                  box(f"ParcelSide{i}", (0.006, 0.07, 0.05), loc=(bx - s / 2 - 0.003, y, bz + 0.04), material=mat("paper"))]
    tip = [box("Falling", (0.14, 0.14, 0.14), loc=(bx, y1 - 0.02, bz - 0.01), material=card, bevel=0.006),
           box("FallingLabel", (0.08, 0.006, 0.06), loc=(bx, y1 - 0.093, bz + 0.03), material=mat("paper"))]
    kit.tilt(tip, rx=0.55, pivot=(bx, y1 - 0.09, bz - 0.01))
    parts += tip
    parent(join("delegation_p1_4_mesh", parts), root)
    _slots(root, [((-0.15, -0.26, 0), 1.0), ((0.39, 0, 0), 1.0), ((-0.31, 0.12, 0), 1.0)])
    return root


def b_delegation_p2_3():
    """Sign-Off: a big grey clipboard on an easel, a giant pen on a chain, a low tray cart in front."""
    root = empty("delegation_p2_3")
    grey = mat(DG_PATH[2])
    steel = _dg_steel()
    parts = _dg_cart("C", (0, -0.08), 0.52, 0.30, 0.44, (0.15, 0.27), DG_PATH[2], pokes=(-1, 1), handle=False, deck=DG_PATH[2])
    lean = 0.08
    fy = 0.10
    for i, sx in enumerate((-1, 1)):
        leg = box(f"Leg{i}", (0.045, 0.045, 1.30), loc=(sx * 0.30, fy, 0.004), material=grey, bevel=0.006)
        kit.tilt(leg, rx=-lean, ry=-sx * 0.035, pivot=(sx * 0.30, fy, 0))
        parts.append(leg)
    back = box("BackLeg", (0.045, 0.045, 1.26), loc=(0, 0.42, 0.008), material=grey, bevel=0.006)
    kit.tilt(back, rx=0.16, pivot=(0, 0.42, 0.008))
    parts += [back, box("Cap", (0.50, 0.10, 0.07), loc=(0, fy + 1.27 * lean + 0.01, 1.25), material=grey, bevel=0.01),
              box("Ledge", (0.62, 0.11, 0.04), loc=(0, fy + 0.04, 0.48), material=grey, bevel=0.006)]
    # The clipboard, leaning back with the legs.
    py, pz = fy - 0.015, 0.52
    board = [box("Board", (0.48, 0.05, 0.70), loc=(0, py, pz), material=grey, bevel=0.01),
             box("Paper", (0.40, 0.012, 0.52), loc=(0, py - 0.03, pz + 0.05), material=mat("paper")),
             box("Clip", (0.20, 0.05, 0.08), loc=(0, py - 0.035, pz + 0.60), material=steel, bevel=0.008),
             box("SignLine", (0.28, 0.014, 0.022), loc=(0.03, py - 0.04, pz + 0.14), material=mat("charcoal")),
             box("BackBatten0", (0.40, 0.02, 0.05), loc=(0, py + 0.03, pz + 0.18), material=mat("charcoal")),
             box("BackBatten1", (0.40, 0.02, 0.05), loc=(0, py + 0.03, pz + 0.50), material=mat("charcoal"))]
    for i, z in enumerate((0.36, 0.42, 0.48)):
        board.append(box(f"Line{i}", (0.30 - 0.04 * i, 0.014, 0.025), loc=(-0.02, py - 0.04, pz + z), material=steel))
    for i, a in enumerate((0.7, -0.7)):
        xb = box(f"Cross{i}", (0.08, 0.014, 0.02), loc=(-0.15, py - 0.042, pz + 0.18), material=grey)
        kit.tilt(xb, ry=a, pivot=(-0.15, py - 0.042, pz + 0.19))
        board.append(xb)
    for i, (dx, a) in enumerate(((-0.04, 0.6), (0.02, -0.5), (0.08, 0.5))):
        s = box(f"Scrawl{i}", (0.07, 0.014, 0.018), loc=(dx, py - 0.042, pz + 0.18), material=mat("navy"))
        kit.tilt(s, ry=a, pivot=(dx, py - 0.042, pz + 0.19))
        board.append(s)
    kit.tilt(board, rx=-lean, pivot=(0, py, pz))
    parts += board
    # The pen hangs on a chain from the right edge of the board.
    px, pyy = 0.30, py - 0.01
    for i in range(4):
        parts.append(box(f"Link{i}", (0.03 if i % 2 else 0.012, 0.012 if i % 2 else 0.03, 0.05),
                         loc=(0.25 + i * 0.0125, pyy, 1.08 - (i + 1) * 0.045), material=steel))
    parts += [cyl("PenCap", 0.042, 0.10, loc=(px, pyy, 0.80), material=grey, verts=10, bevel=0.006),
              cyl("PenBody", 0.035, 0.26, loc=(px, pyy, 0.54), material=mat("charcoal"), verts=10),
              cyl("PenTip", 0.006, 0.07, loc=(px, pyy, 0.47), material=steel, verts=8, radius_top=0.035)]
    parent(join("delegation_p2_3_mesh", parts), root)
    _slots(root, [((-0.17, -0.36, 0), 1.0), ((0.35, 0.0, 0), 1.0), ((-0.36, 0, 0), 1.0)])
    return root


def b_delegation_p2_4():
    """Compliance: the steel filing cabinet, a folder out of the top drawer, a big stamp on top
    with a glowing knob, a glowing tick on the side and a squashed box beside it."""
    root = empty("delegation_p2_4")
    grey = mat(DG_PATH[2])
    glow = mat("#d6e4f2", emit=1.4)
    steel = _dg_steel()
    H, fy = 1.12, -0.26
    parts = [box("Plinth", (0.52, 0.52, 0.05), loc=(0, 0.02, 0), material=mat("charcoal")),
             box("Cabinet", (0.56, 0.56, H - 0.05), loc=(0, 0.02, 0.05), material=grey, bevel=0.012)]
    for i, z in enumerate((0.10, 0.44)):
        parts += [box(f"Drawer{i}", (0.48, 0.03, 0.30), loc=(0, fy - 0.015, z), material=steel, bevel=0.006),
                  box(f"Handle{i}", (0.18, 0.04, 0.035), loc=(0, fy - 0.045, z + 0.17), material=mat("charcoal")),
                  box(f"Card{i}", (0.14, 0.012, 0.06), loc=(0, fy - 0.034, z + 0.23), material=glow)]
    # The top drawer stands open, a folder sticking out of it.
    oz, oy = 0.78, fy - 0.10
    parts += [box("OpenSideL", (0.02, 0.10, 0.24), loc=(-0.22, fy - 0.05, oz + 0.02), material=grey),
              box("OpenSideR", (0.02, 0.10, 0.24), loc=(0.22, fy - 0.05, oz + 0.02), material=grey),
              box("OpenFront", (0.48, 0.03, 0.30), loc=(0, oy - 0.015, oz), material=steel, bevel=0.006),
              box("OpenHandle", (0.18, 0.04, 0.035), loc=(0, oy - 0.045, oz + 0.17), material=mat("charcoal")),
              box("OpenCard", (0.14, 0.012, 0.06), loc=(0, oy - 0.034, oz + 0.23), material=glow),
              box("OpenFiles", (0.42, 0.08, 0.22), loc=(0, fy - 0.05, oz + 0.02), material=mat("paper"))]
    f = box("StuckFolder", (0.26, 0.04, 0.22), loc=(-0.04, fy - 0.06, oz + 0.16), material=mat(DG_ACCENT), bevel=0.005)
    kit.tilt(f, rx=0.25, ry=0.15, pivot=(-0.04, fy - 0.06, oz + 0.16))
    parts.append(f)
    # The stamp on top.
    sx, sy = 0.12, -0.12
    parts += [box("StampBase", (0.24, 0.18, 0.06), loc=(sx, sy, H), material=mat("charcoal"), bevel=0.008),
              box("StampInk", (0.25, 0.19, 0.015), loc=(sx, sy, H), material=mat("red")),
              cyl("StampNeck", 0.03, 0.14, loc=(sx, sy, H + 0.06), material=steel, verts=8),
              cyl("StampGrip", 0.065, 0.10, loc=(sx, sy, H + 0.20), material=grey, verts=12, bevel=0.01),
              ball("StampKnob", 0.075, loc=(sx, sy, H + 0.36), material=glow)]
    # Sides and back: a checklist with a glowing tick on the left, panels and vents elsewhere.
    parts += [box("Checklist", (0.012, 0.30, 0.40), loc=(-0.286, 0.02, 0.50), material=mat("paper")),
              box("PanelR", (0.012, 0.40, 0.80), loc=(0.286, 0.02, 0.18), material=steel),
              box("BackPanel", (0.40, 0.012, 0.80), loc=(0, 0.306, 0.18), material=steel)]
    for i in range(3):
        parts.append(box(f"Vent{i}", (0.30, 0.014, 0.03), loc=(0, 0.313, 0.85 + i * 0.06), material=mat("charcoal")))
    t1 = box("TickA", (0.02, 0.05, 0.12), loc=(-0.296, -0.02, 0.62), material=glow)
    kit.tilt(t1, rx=0.6, pivot=(-0.296, -0.02, 0.62))
    t2 = box("TickB", (0.02, 0.05, 0.24), loc=(-0.296, 0.0, 0.60), material=glow)
    kit.tilt(t2, rx=-0.5, pivot=(-0.296, 0.0, 0.60))
    parts += [t1, t2]
    # A cardboard box that met Compliance: flattened, flaps out, a stamp mark on it.
    card = mat("cardboard")
    flat = [box("Squashed", (0.22, 0.30, 0.07), loc=(-0.39, 0.05, 0), material=card, bevel=0.006),
            box("FlapA", (0.20, 0.10, 0.015), loc=(-0.39, -0.13, 0.01), material=card),
            box("Tape", (0.04, 0.30, 0.008), loc=(-0.39, 0.05, 0.07), material=mat("paper"))]
    for i, (dx, dy, w, d) in enumerate(((0, -0.06, 0.12, 0.02), (0, 0.06, 0.12, 0.02), (-0.05, 0, 0.02, 0.12), (0.05, 0, 0.02, 0.12))):
        flat.append(box(f"Mark{i}", (w, d, 0.006), loc=(-0.39 + dx - 0.02, 0.10 + dy, 0.07), material=grey))
    kit.tilt(flat, ry=0.08, pivot=(-0.29, 0.05, 0))
    parts += flat
    parent(join("delegation_p2_4_mesh", parts), root)
    _slots(root, [((-0.13, 0.12, H), 1.0), ((0.29, -0.02, 0), 1.0), ((-0.36, 0, 0), 1.0)])
    return root


def tower_delegation(tiers):
    return tower_parts("delegation", tiers)


TOWER_PART_BUILDERS["delegation_core"] = b_delegation_core
for _p in range(3):
    for _t in (1, 2):
        TOWER_PART_BUILDERS[f"delegation_m{_p}_{_t}"] = globals()[f"b_delegation_m{_p}_{_t}"]
    for _t in (3, 4):
        TOWER_PART_BUILDERS[f"delegation_p{_p}_{_t}"] = globals()[f"b_delegation_p{_p}_{_t}"]


# --- pomodoro (tower parts)

# --- Pomodoro Timer (7.13). A giant kitchen-timer tomato in a wooden catapult: a ball on an
# A-frame. Slot0 (FOCUS SPRINT) on the floor at the right flank of the frame, Slot1 (DEEP WORK) in
# the centre of the tomato itself (scaled with it), Slot2 (BREAK TIME) on top of a post at the
# left back. BREAK TIME modules bring their own pole up from that post.

POM_ACCENT = "#e2553f"
POM_PATH = ("#3fa7a0", "#e2553f", "#f2c641")
POM_R = 0.26


def _pom_stick(name, p0, p1, w, material, d=None, ext=0.0):
    """A square beam from p0 to p1, w thick (d deep if given), ext longer at both ends."""
    dx, dy, dz = p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]
    ln = math.sqrt(dx * dx + dy * dy + dz * dz)
    ux, uy, uz = dx / ln, dy / ln, dz / ln
    a = (p0[0] - ux * ext, p0[1] - uy * ext, p0[2] - uz * ext)
    b = box(name, (w, d or w, ln + 2 * ext), loc=a, material=material)
    kit.tilt(b, rx=math.asin(max(-1.0, min(1.0, -uy))), ry=math.atan2(ux, uz), pivot=a)
    return b


def _pom_arc(pre, c, r, a0, a1, n, w, material, plane="xz"):
    """An arc of beams round c, from angle a0 to a1 (degrees, 90 is straight up)."""
    pts = []
    for i in range(n + 1):
        a = math.radians(a0 + (a1 - a0) * i / n)
        if plane == "xz":
            pts.append((c[0] + r * math.cos(a), c[1], c[2] + r * math.sin(a)))
        else:
            pts.append((c[0], c[1] + r * math.cos(a), c[2] + r * math.sin(a)))
    return [_pom_stick(f"{pre}{i}", pts[i], pts[i + 1], w, material, ext=w * 0.45) for i in range(n)]


def _pom_rx(p, c, th):
    """Point p turned round the X axis through c."""
    y, z = p[1] - c[1], p[2] - c[2]
    return (p[0], c[1] + y * math.cos(th) - z * math.sin(th), c[2] + y * math.sin(th) + z * math.cos(th))


def _pom_tomato(c, r=POM_R, pre="Tom", top="stem", detail=2):
    """The kitchen timer, centred on c: a squashed red ball, a white dial band with ticks round the
    middle, a pointer on the front, a green stem with a star of leaves. detail 1: a small plain one."""
    x, y, z = c
    s = r / POM_R
    hz = r * 0.88
    green = mat("plant")
    parts = [ball(f"{pre}Body", r, loc=c, material=mat(POM_ACCENT, rough=0.5), subdiv=2 if detail == 2 else 1,
                  scale=(1, 1, 0.88))]
    zt = z + hz
    if detail == 2:
        ink = mat("plastic_black")
        parts.append(cyl(f"{pre}Band", r * 1.025, 0.075 * s, loc=(x, y, z - 0.045 * s), material=mat("plastic_white"), verts=16))
        for i in range(12):
            a = 2 * math.pi * i / 12 + math.pi / 12
            R = r * 1.02
            parts.append(box(f"{pre}Tick{i}", (0.025 * s, 0.022 * s, 0.055 * s), loc=(x + R * math.cos(a), y + R * math.sin(a), z - 0.035 * s),
                             material=ink, rot_z=a))
        ptr = box(f"{pre}Pointer", (0.045 * s, 0.025 * s, 0.12 * s), loc=(x, y - 0.252 * s, z + 0.03 * s), material=ink)
        kit.tilt(ptr, rx=-0.40, pivot=(x, y - 0.252 * s, z + 0.03 * s))
        parts.append(ptr)
    if top == "stem":
        parts.append(cyl(f"{pre}Stem", 0.04 * s, 0.13 * s, loc=(x, y, zt - 0.03 * s), material=green, verts=8))
        n = 5 if detail == 2 else 3
        for i in range(n):
            leaf = box(f"{pre}Leaf{i}", (0.17 * s, 0.065 * s, 0.022 * s), loc=(x + 0.085 * s, y, zt - 0.012 * s), material=green)
            kit.tilt(leaf, ry=0.30, rz=2 * math.pi * i / n + 0.3, pivot=(x, y, zt))
            parts.append(leaf)
    return parts


def _pom_tz(bowl_top, r):
    """Centre height of a tomato of radius r sitting in a bowl whose rim is at bowl_top."""
    return bowl_top - 0.025 + r * 0.88


def _pom_frame(x, z0=0.0, h=0.45, half=0.28, yc=0.0, w=0.065, col="wood", pre="Frame"):
    """One A-frame along Y at x: a sole beam, two legs meeting at h, a cap on the apex."""
    m = mat(col)
    zl = z0 + 0.05
    parts = [box(f"{pre}Base", (w + 0.015, 2 * half + 0.08, 0.05), loc=(x, yc, z0), material=m, bevel=0.01)]
    for i, sy in enumerate((-1, 1)):
        parts.append(_pom_stick(f"{pre}Leg{i}", (x, yc + sy * half, zl), (x, yc, h), w, m))
    parts.append(box(f"{pre}Cap", (w + 0.02, 0.11, 0.07), loc=(x, yc, h - 0.045), material=m, bevel=0.01))
    return parts


def _pom_catapult(z0=0.0, h=0.45, half=0.28, xs=0.25, yc=0.0, col="wood", arm="wood_dark", rb=0.19, w=0.065, pre="Cat"):
    """Two A-frames, an axle on the apexes, a ladle with its bowl on the axle and its handle down to
    a winch at the back. Returns (parts, bowl rim height)."""
    am = mat(arm)
    parts = _pom_frame(-xs, z0, h, half, yc, w, col, pre + "L") + _pom_frame(xs, z0, h, half, yc, w, col, pre + "R")
    parts.append(_cylx(f"{pre}Axle", 0.032, 2 * xs + 0.10, (0, yc, h), am, verts=10))
    zb = h + 0.015
    parts.append(cyl(f"{pre}Bowl", rb * 0.62, 0.085, loc=(0, yc, zb), material=am, verts=12, radius_top=rb))
    zw = z0 + 0.17
    yw = half * (1 - 0.12 / (h - z0 - 0.05))
    parts += [_pom_stick(f"{pre}Handle", (0, yc + rb * 0.55, zb + 0.04), (0, yc + yw, zw), 0.05, am),
              _cylx(f"{pre}Winch", 0.045, 2 * xs, (0, yc + yw, zw), mat(col), verts=10),
              _cylx(f"{pre}Rope", 0.06, 0.16, (0, yc + yw, zw), mat("charcoal"), verts=10),
              _pom_stick(f"{pre}Front", (-xs, yc - yw, zw), (xs, yc - yw, zw), 0.05, mat(col))]
    return parts, zb + 0.085


def _pom_post(x, y, z0, top, col="wood", pre="Post"):
    """The post Slot2 sits on."""
    m = mat(col)
    return [box(f"{pre}", (0.06, 0.06, top - 0.03 - z0), loc=(x, y, z0), material=m),
            box(f"{pre}Cap", (0.09, 0.09, 0.03), loc=(x, y, top - 0.03), material=m, bevel=0.008)]


def _pom_bell(pre, c, r, material, ry=0.0):
    """An alarm bell standing on c: a flared rim and a dome, a knob on top."""
    x, y, z = c
    parts = [cyl(f"{pre}Rim", r, 0.35 * r, loc=(x, y, z), material=material, verts=12, radius_top=0.78 * r),
             ball(f"{pre}Dome", 0.78 * r, loc=(x, y, z + 0.35 * r), material=material, subdiv=1, scale=(1, 1, 0.95)),
             cyl(f"{pre}Knob", 0.18 * r, 0.25 * r, loc=(x, y, z + 1.0 * r), material=mat("charcoal"), verts=8)]
    if ry:
        kit.tilt(parts, ry=ry, pivot=(x, y, z))
    return parts


def _pom_root(name, parts, slots=None):
    root = empty(name)
    parent(join(name + "_mesh", parts), root)
    if slots:
        _slots(root, slots)
    return root


# Core.

def b_pomodoro_core():
    parts, top = _pom_catapult()
    tz = _pom_tz(top, POM_R)
    parts += _pom_tomato((0, 0, tz))
    parts += _pom_post(-0.23, 0.31, 0.0, 0.60)
    return _pom_root("pomodoro_core", parts, [((0.40, 0.02, 0), 1.0), ((0, 0, tz), 1.0), ((-0.23, 0.31, 0.60), 1.0)])


# Modules. FOCUS SPRINT: a crate of spare tomatoes on the floor (origin on the floor).

def _pom_crate(pre="Crate"):
    teal = mat(POM_PATH[0])
    char = mat("charcoal")
    return [box(f"{pre}", (0.22, 0.30, 0.20), material=teal, bevel=0.012),
            box(f"{pre}Gap", (0.226, 0.306, 0.025), loc=(0, 0, 0.09), material=char),
            box(f"{pre}Inside", (0.18, 0.26, 0.01), loc=(0, 0, 0.195), material=char)]


def _pom_heap(pre="Heap"):
    r = 0.075
    return (_pom_tomato((0, -0.075, 0.24), r, pre + "A", detail=1) + _pom_tomato((0, 0.075, 0.24), r, pre + "B", detail=1)
            + _pom_tomato((0, 0.0, 0.355), r, pre + "C", detail=1))


def b_pomodoro_m0_1():
    return _pom_root("pomodoro_m0_1", _pom_crate() + _pom_heap())


def b_pomodoro_m0_2():
    teal = mat(POM_PATH[0])
    glow = mat(POM_PATH[0], emit=1.4)
    char = mat("charcoal")
    py = -0.165
    parts = _pom_crate() + _pom_heap()
    parts += [box("Clamp", (0.07, 0.04, 0.07), loc=(0, py + 0.01, 0.08), material=char),
              cyl("PhoneStick", 0.022, 0.26, loc=(0, py, 0.12), material=teal, verts=8),
              box("Phone", (0.20, 0.035, 0.30), loc=(0, py, 0.37), material=teal, bevel=0.012),
              box("Screen", (0.165, 0.01, 0.25), loc=(0, py - 0.02, 0.395), material=char),
              box("Camera", (0.05, 0.01, 0.05), loc=(0.05, py + 0.02, 0.59), material=char)]
    parts += _ring("TimerRing", 0.06, 10, 0.024, (0, py - 0.03, 0.53), glow, axis="y")
    parts += [box("TimerHand", (0.018, 0.012, 0.05), loc=(0, py - 0.03, 0.53), material=glow),
              box("TimerBar", (0.12, 0.012, 0.025), loc=(0, py - 0.03, 0.43), material=glow)]
    return _pom_root("pomodoro_m0_2", parts)


# DEEP WORK: on the tomato itself (origin in its centre, built for radius 0.26).

def _pom_waves(pre, material, w=0.035):
    return (_pom_arc(pre + "A", (0, 0, 0.30), 0.20, 40, 140, 6, w, material)
            + _pom_arc(pre + "B", (0, 0, 0.30), 0.28, 40, 140, 7, w, material))


def b_pomodoro_m1_1():
    red = mat(POM_PATH[1], rough=0.5)
    parts = [cyl("Collar", 0.262, 0.03, loc=(0, 0, 0.075), material=mat("charcoal"), verts=16)]
    parts += _ring("Ring", 0.272, 16, 0.05, (0, 0, 0.13), red, axis="z")
    parts += _pom_waves("Wave", red)
    return _pom_root("pomodoro_m1_1", parts)


def b_pomodoro_m1_2():
    red = mat(POM_PATH[1], rough=0.5)
    glow = mat(POM_PATH[1], emit=1.4)
    char = mat("charcoal")
    white = mat("plastic_white")
    hy = -0.04
    parts = [cyl("GlowBand", 0.272, 0.055, loc=(0, 0, 0.06), material=glow, verts=16),
             box("Hanger", (0.03, 0.20, 0.40), loc=(-0.295, hy, -0.22), material=red, bevel=0.008),
             box("HangerBar", (0.012, 0.13, 0.045), loc=(-0.315, hy, -0.06), material=white),
             box("HangerBarIn", (0.012, 0.13, 0.045), loc=(-0.277, hy, -0.06), material=white),
             _cylx("HangerHole", 0.035, 0.036, (-0.295, hy, 0.11), char, verts=10),
             _pom_stick("Cord", (-0.295, hy, 0.15), (-0.02, 0, 0.30), 0.02, char)]
    return _pom_root("pomodoro_m1_2", parts)


# BREAK TIME: on the post (origin on its top).

def b_pomodoro_m2_1():
    yel = mat(POM_PATH[2], rough=0.5)
    char = mat("charcoal")
    parts = [cyl("Pole", 0.025, 0.17, loc=(0, 0, 0), material=yel, verts=8),
             cyl("BellBase", 0.13, 0.04, loc=(0, 0, 0.16), material=char, verts=14),
             ball("Bell", 0.12, loc=(0, 0, 0.20), material=yel, subdiv=2, scale=(1, 1, 0.85)),
             cyl("BellButton", 0.025, 0.05, loc=(0, 0, 0.29), material=char, verts=8)]
    return _pom_root("pomodoro_m2_1", parts)


def b_pomodoro_m2_2():
    yel = mat(POM_PATH[2], rough=0.5)
    glow = mat(POM_PATH[2], emit=1.4)
    char = mat("charcoal")
    o = 0.068
    parts = [cyl("Pole", 0.03, 0.30, loc=(0, 0, 0), material=yel, verts=8),
             _pom_stick("Bar", (-o - 0.03, -o - 0.03, 0.30), (o + 0.03, o + 0.03, 0.30), 0.035, yel),
             _pom_stick("HammerStick", (0, 0, 0.30), (0, 0, 0.42), 0.022, char),
             ball("Hammer", 0.035, loc=(0, 0, 0.43), material=char)]
    parts += _pom_bell("BellA", (o, o, 0.315), 0.095, yel) + _pom_bell("BellB", (-o, -o, 0.315), 0.095, yel)
    parts += _pom_arc("WaveA", (0, 0, 0.42), 0.13, 35, 145, 5, 0.03, glow) + _pom_arc("WaveB", (0, 0, 0.42), 0.20, 45, 135, 6, 0.03, glow)
    return _pom_root("pomodoro_m2_2", parts)


# Heroes.

def b_pomodoro_p0_3():
    """Back to Back: a double catapult on a teal platform, two tomatoes side by side."""
    teal = POM_PATH[0]
    tm = mat(teal)
    r = 0.19
    parts = [box("Plate", (0.76, 0.58, 0.08), material=tm, bevel=0.015)]
    h, half, z0 = 0.72, 0.24, 0.08
    for i, x in enumerate((-0.35, 0.0, 0.35)):
        parts += _pom_frame(x, z0, h, half, 0.0, 0.075, teal, f"F{i}")
    am = mat("wood_dark")
    zb = h + 0.015
    yw = half * (1 - 0.12 / (h - z0 - 0.05))
    zw = z0 + 0.17
    parts += [_cylx("Axle", 0.032, 0.80, (0, 0, h), am, verts=10),
              _cylx("Winch", 0.05, 0.70, (0, yw, zw), tm, verts=10),
              _pom_stick("Front", (-0.35, -yw, zw), (0.35, -yw, zw), 0.05, tm)]
    tz = _pom_tz(zb + 0.085, r)
    for i, x in enumerate((-0.185, 0.185)):
        parts += [cyl(f"Bowl{i}", 0.10, 0.085, loc=(x, 0, zb), material=am, verts=12, radius_top=0.155),
                  _pom_stick(f"Handle{i}", (x, 0.09, zb + 0.04), (x, yw, zw), 0.05, am),
                  _cylx(f"Rope{i}", 0.065, 0.12, (x, yw, zw), mat("charcoal"), verts=10)]
        parts += _pom_tomato((x, 0, tz), r, f"T{i}")
    # Racing stripes along the front of the platform: two sprints at once.
    for i, x in enumerate((-0.2, 0.2)):
        parts.append(box(f"Stripe{i}", (0.26, 0.012, 0.03), loc=(x, -0.293, 0.025), material=mat("plastic_white")))
    parts += _pom_post(-0.30, 0.36, 0.0, 0.45, teal)
    return _pom_root("pomodoro_p0_3", parts, [((0, 0, 0.08), 1.0), ((-0.185, 0, tz), r / POM_R), ((-0.30, 0.36, 0.45), 1.0)])


def b_pomodoro_p0_4():
    """Flow: a tilted teal carousel of four tomatoes feeds the catapult, a glowing ring on a spire."""
    teal = POM_PATH[0]
    tm = mat(teal)
    glow = mat(teal, emit=1.4)
    parts = [box("Plate", (0.74, 0.70, 0.06), loc=(0, 0.02, 0), material=tm, bevel=0.012)]
    cat, top = _pom_catapult(z0=0.06, h=0.31, half=0.20, xs=0.22, yc=-0.14, col=teal, rb=0.15)
    parts += cat
    r = 0.20
    tz = _pom_tz(top, r)
    parts += _pom_tomato((0, -0.14, tz), r, "Main")
    dc, th = (0, 0.04, 1.20), 0.26
    plane = lambda y: dc[2] + (y - dc[1]) * math.tan(th)
    parts += [cyl("Column", 0.05, plane(0.22) - 0.03 - 0.06, loc=(0, 0.22, 0.06), material=tm, verts=10),
              cyl("ColumnFoot", 0.10, 0.05, loc=(0, 0.22, 0.06), material=mat("charcoal"), verts=10)]
    disc = [cyl("RimGlow", 0.33, 0.03, loc=(0, dc[1], dc[2] - 0.03), material=glow, verts=20),
            cyl("Disc", 0.30, 0.05, loc=(0, dc[1], dc[2] - 0.01), material=tm, verts=20)]
    kit.tilt(disc, rx=th, pivot=dc)
    parts += disc
    rr = 0.11
    for i, (lx, ly) in enumerate(((0, -0.205), (0.205, 0), (0, 0.205), (-0.205, 0))):
        p = _pom_rx((lx, dc[1] + ly, dc[2] + 0.04), dc, th)
        parts.append(cyl(f"Cup{i}", 0.075, 0.035, loc=(p[0], p[1], p[2] - 0.01), material=mat("charcoal"), verts=10))
        parts += _pom_tomato((p[0], p[1], p[2] + rr * 0.88 - 0.005), rr, f"R{i}", detail=1)
    hub = _pom_rx((0, dc[1], dc[2] + 0.04), dc, th)
    parts += [cyl("Spire", 0.035, 1.55 - hub[2], loc=hub, material=tm, verts=8),
              ball("SpireTop", 0.06, loc=(0, hub[1], 1.62), material=glow, subdiv=1)]
    parts += _ring("Halo", 0.10, 10, 0.03, (0, hub[1], 1.56), glow, axis="z")
    parts += _pom_post(-0.30, 0.30, 0.06, 0.40, teal)
    return _pom_root("pomodoro_p0_4", parts, [((0, 0, 0.06), 1.0), ((0, -0.14, tz), r / POM_R), ((-0.30, 0.30, 0.40), 1.0)])


def b_pomodoro_p1_3():
    """Burnt Out: a charred, cracked tomato glowing from inside, smoke rising, a scorched frame."""
    red = mat(POM_PATH[1], rough=0.5)
    ember = mat("#ff8a2a", emit=1.6)
    char = mat("charcoal", rough=1.0)
    parts = [box("Plate", (0.60, 0.64, 0.05), material=red, bevel=0.012)]
    cat, top = _pom_catapult(z0=0.05, h=0.48, half=0.26, xs=0.25, col="charcoal", arm="plastic_black")
    parts += cat
    r = 0.30
    tz = _pom_tz(top, r)
    parts += _pom_tomato((0, 0, tz), r, "Burnt", top="none")
    cz = tz + 0.17
    parts.append(ball("Char", 0.25, loc=(0, 0, cz), material=char, subdiv=2, scale=(1, 1, 0.5)))
    surf = lambda rho: cz + 0.125 * math.sqrt(max(0.0, 1 - (rho / 0.25) ** 2)) + 0.008
    for i in range(6):
        a = 2 * math.pi * i / 6 + 0.4
        kink = a + (0.25 if i % 2 else -0.25)
        p0 = (0.06 * math.cos(a), 0.06 * math.sin(a), surf(0.06))
        p1 = (0.14 * math.cos(kink), 0.14 * math.sin(kink), surf(0.14))
        p2 = (0.22 * math.cos(a), 0.22 * math.sin(a), surf(0.22) - 0.01)
        parts += [_pom_stick(f"CrackA{i}", p0, p1, 0.03, ember, ext=0.012), _pom_stick(f"CrackB{i}", p1, p2, 0.028, ember, ext=0.012)]
    parts.append(ball("Core", 0.085, loc=(0, 0, cz + 0.11), material=ember, subdiv=1))
    smoke = mat("#b9bec6", rough=1.0)
    for i, (x, z, rs) in enumerate(((0.0, tz + 0.34, 0.075), (0.04, tz + 0.43, 0.085), (-0.02, tz + 0.51, 0.075), (0.03, tz + 0.57, 0.055))):
        parts.append(ball(f"Smoke{i}", rs, loc=(x, 0.02, z), material=smoke, subdiv=1))
    # The burning spot: embers round the foot of the frame.
    for i, (x, y) in enumerate(((-0.17, -0.22), (0.12, -0.25), (0.19, 0.2), (-0.12, 0.23))):
        parts.append(box(f"Ember{i}", (0.07, 0.06, 0.03), loc=(x, y, 0.05), material=ember, rot_z=i * 0.7, bevel=0.008))
    parts += _pom_post(-0.27, 0.36, 0.0, 0.62, "charcoal")
    return _pom_root("pomodoro_p1_3", parts, [((0.42, 0.02, 0), 1.0), ((0, 0, tz), 1.0), ((-0.27, 0.36, 0.62), 1.0)])


def b_pomodoro_p1_4():
    """Deep Work: an enormous tomato on a heavy trebuchet, a stack of books as counterweight,
    a glowing core and barrier tape in front."""
    red = mat(POM_PATH[1], rough=0.5)
    glow = mat(POM_PATH[1], emit=1.5)
    wd = mat("wood_dark")
    white = mat("plastic_white")
    parts = [box("Plate", (0.68, 0.74, 0.06), material=red, bevel=0.015)]
    for i, x in enumerate((-0.30, 0.30)):
        parts += [box(f"Sole{i}", (0.09, 0.66, 0.06), loc=(x, 0.04, 0.06), material=wd, bevel=0.01),
                  _pom_stick(f"LegF{i}", (x, -0.24, 0.10), (x, 0.10, 0.76), 0.08, wd),
                  _pom_stick(f"LegB{i}", (x, 0.34, 0.10), (x, 0.10, 0.76), 0.08, wd),
                  _pom_stick(f"Brace{i}", (x, -0.10, 0.36), (x, 0.24, 0.36), 0.06, wd),
                  box(f"Cap{i}", (0.10, 0.14, 0.09), loc=(x, 0.10, 0.70), material=wd, bevel=0.01)]
    parts += [_cylx("Axle", 0.045, 0.72, (0, 0.10, 0.74), mat("charcoal"), verts=10),
              _pom_stick("Arm", (0, 0.36, 0.60), (0, -0.06, 0.79), 0.08, wd, ext=0.03),
              cyl("Cup", 0.15, 0.08, loc=(0, -0.06, 0.76), material=wd, verts=12, radius_top=0.21)]
    # The counterweight: a stack of books on two ropes.
    for i in range(2):
        parts.append(_pom_stick(f"Rope{i}", (-0.05 + 0.10 * i, 0.36, 0.58), (-0.08 + 0.16 * i, 0.32, 0.50), 0.018, mat("charcoal")))
    for i, (col, rz, hh) in enumerate(((POM_PATH[1], 0.0, 0.07), ("plastic_white", 0.12, 0.05), ("charcoal", -0.08, 0.08), (POM_PATH[1], 0.05, 0.06))):
        parts.append(box(f"Book{i}", (0.26, 0.17, hh), loc=(0, 0.31, 0.22 + 0.072 * i), material=mat(col), rot_z=rz, bevel=0.008))
    r = 0.36
    tz = _pom_tz(0.84, r)
    parts += _pom_tomato((0, -0.06, tz), r, "Big")
    parts.append(cyl("Core", r * 0.985, 0.06, loc=(0, -0.06, tz + 0.04), material=glow, verts=16))
    parts.append(ball("Beacon", 0.05, loc=(0, -0.06, tz + r * 0.88 + 0.13), material=glow, subdiv=1))
    # Barrier tape across the front.
    for i, x in enumerate((-0.30, 0.30)):
        for k in range(3):
            parts.append(cyl(f"TapePost{i}{k}", 0.025, 0.12, loc=(x, -0.33, 0.06 + 0.12 * k), material=red if k % 2 == 0 else white, verts=8))
    for k in range(6):
        x = -0.25 + k * 0.10
        parts.append(box(f"Tape{k}", (0.10, 0.012, 0.05), loc=(x, -0.33, 0.30), material=red if k % 2 == 0 else white))
    parts += _pom_post(-0.20, 0.35, 0.0, 0.40, "wood_dark")
    return _pom_root("pomodoro_p1_4", parts, [((0.46, 0.04, 0), 1.0), ((0, -0.06, tz), 1.0), ((-0.20, 0.35, 0.40), 1.0)])


def b_pomodoro_p2_3():
    """Snooze: a yellow catapult, a big snooze button on the tomato, a boxing glove on a scissor
    spring punching forward."""
    yc = POM_PATH[2]
    ym = mat(yc, rough=0.5)
    char = mat("charcoal")
    parts = [box("Plate", (0.56, 0.62, 0.05), material=ym, bevel=0.012)]
    cat, top = _pom_catapult(z0=0.05, h=0.52, half=0.27, xs=0.24, col=yc, rb=0.19, w=0.075)
    parts += cat
    tz = _pom_tz(top, POM_R)
    parts += _pom_tomato((0, 0, tz), POM_R, "Snooze", top="none")
    zt = tz + POM_R * 0.88
    parts += [cyl("ButtonRing", 0.17, 0.07, loc=(0, 0, zt - 0.04), material=char, verts=14),
              cyl("Button", 0.14, 0.10, loc=(0, 0, zt + 0.03), material=mat(yc, emit=0.6), verts=14, bevel=0.01)]
    for i in range(5):
        leaf = box(f"Leaf{i}", (0.16, 0.06, 0.02), loc=(0.17, 0, zt - 0.03), material=mat("plant"))
        kit.tilt(leaf, ry=0.35, pivot=(0.09, 0, zt - 0.02))
        kit.tilt(leaf, rz=2 * math.pi * i / 5 + 0.3, pivot=(0, 0, zt))
        parts.append(leaf)
    # The scissor spring and the glove.
    zs = 0.30
    parts.append(box("Mount", (0.16, 0.06, 0.14), loc=(0, -0.17, zs - 0.07), material=ym, bevel=0.01))
    ys = [-0.20, -0.235, -0.27, -0.31]
    for i in range(3):
        parts += [_pom_stick(f"ScA{i}", (-0.03, ys[i], zs - 0.06), (0.03, ys[i + 1], zs + 0.06), 0.02, char),
                  _pom_stick(f"ScB{i}", (0.03, ys[i], zs - 0.06), (-0.03, ys[i + 1], zs + 0.06), 0.02, char)]
    parts += [_cyly("Cuff", 0.07, 0.06, (0, -0.35, zs), mat("plastic_white"), verts=12),
              ball("Glove", 0.125, loc=(0, -0.42, zs + 0.01), material=ym, subdiv=2, scale=(1.0, 0.85, 0.9)),
              ball("Thumb", 0.045, loc=(0.09, -0.39, zs - 0.01), material=ym, subdiv=1)]
    parts += _pom_post(-0.24, 0.30, 0.0, 0.60, yc)
    return _pom_root("pomodoro_p2_3", parts, [((0.40, 0.03, 0), 1.0), ((0, 0, tz), 1.0), ((0, 0, 0.05), 1.0)])


def b_pomodoro_p2_4():
    """Alarm Clock: the tomato is the face of a giant yellow twin-bell alarm clock."""
    yc = POM_PATH[2]
    ym = mat(yc, rough=0.5)
    glow = mat(yc, emit=1.4)
    char = mat("charcoal")
    white = mat("plastic_white")
    cz, dy, dd, ty = 0.62, 0.29, 0.18, -0.12
    df, db = dy - dd / 2, dy + dd / 2
    parts = [box("Plate", (0.62, 0.78, 0.05), loc=(0, 0.01, 0), material=ym, bevel=0.012),
             _cyly("Drum", 0.36, dd, (0, dy, cz), ym, verts=20),
             _cyly("DrumBack", 0.30, 0.02, (0, db + 0.002, cz), white, verts=20),
             _cyly("Bracket", 0.07, df - ty, (0, (df + ty) / 2, cz), ym, verts=10),
             cyl("Cradle", 0.05, 0.36, loc=(0, ty, 0.05), material=ym, verts=10),
             cyl("CradleCup", 0.08, 0.04, loc=(0, ty, 0.38), material=ym, verts=10, radius_top=0.12)]
    for i in range(12):
        a = 2 * math.pi * i / 12
        r0, r1 = (0.28, 0.35) if i % 3 == 0 else (0.30, 0.345)
        parts.append(_pom_stick(f"Tick{i}", (r0 * math.cos(a), df - 0.005, cz + r0 * math.sin(a)), (r1 * math.cos(a), df - 0.005, cz + r1 * math.sin(a)),
                                0.035, white, d=0.02))
    # The winding key and the alarm knob on the back.
    parts += [_cyly("KeyShaft", 0.03, 0.05, (0, db + 0.025, cz + 0.08), char, verts=8),
              box("KeyWings", (0.26, 0.03, 0.10), loc=(0, db + 0.06, cz + 0.03), material=char, bevel=0.01),
              _cyly("AlarmKnob", 0.05, 0.04, (0.16, db + 0.02, cz - 0.14), char, verts=10)]
    for i, sx in enumerate((-1, 1)):
        parts += [_pom_stick(f"Leg{i}", (sx * 0.29, dy, 0.05), (sx * 0.16, dy, cz - 0.30), 0.05, ym),
                  ball(f"Foot{i}", 0.05, loc=(sx * 0.29, dy, 0.05), material=char, subdiv=1),
                  _pom_stick(f"BellPost{i}", (sx * 0.15, dy, cz + 0.30), (sx * 0.21, dy, cz + 0.40), 0.03, char)]
        parts += _pom_bell(f"Bell{i}", (sx * 0.21, dy, cz + 0.38), 0.15, ym, ry=-sx * 0.35)
    parts += [_pom_stick("HammerStick", (0, dy, cz + 0.36), (0, dy, cz + 0.50), 0.03, char),
              ball("Hammer", 0.05, loc=(0, dy, cz + 0.52), material=ym, subdiv=1)]
    parts += _pom_arc("RingA", (0, dy, cz + 0.36), 0.40, 45, 135, 7, 0.04, glow)
    parts += _pom_arc("RingB", (0, dy, cz + 0.36), 0.50, 50, 130, 8, 0.04, glow)
    parts += _pom_tomato((0, ty, cz), POM_R, "Face")
    return _pom_root("pomodoro_p2_4", parts, [((0.44, -0.12, 0), 1.0), ((0, ty, cz), 1.0), ((0, 0, 0.05), 1.0)])


def tower_pomodoro(tiers):
    return tower_parts("pomodoro", tiers)


TOWER_PART_BUILDERS["pomodoro_core"] = b_pomodoro_core
for _p in range(3):
    for _t in (1, 2):
        TOWER_PART_BUILDERS[f"pomodoro_m{_p}_{_t}"] = globals()[f"b_pomodoro_m{_p}_{_t}"]
    for _t in (3, 4):
        TOWER_PART_BUILDERS[f"pomodoro_p{_p}_{_t}"] = globals()[f"b_pomodoro_p{_p}_{_t}"]


# --- poster (tower parts)

# --- Motivational Poster (7.14). The roll-up banner of every trade fair and office lobby: a
# cassette on the floor, a tall yellow-edged print leaning back on its pole. Slot0 (HANG IN THERE)
# on the top edge, Slot1 (FRAMED PRINT) round the print itself, Slot2 (LED WALL) on the floor in
# front of the cassette. Slots 0 and 1 lean with the print, so a module built upright fits it.
# Slot1 is the bottom middle of a 0.62 x 1.20 picture (times the slot scale); heroes put it on a
# picture of that shape, so the frame always has something to frame.

PO_ACCENT = "yellow"
PO_PATH = ("#3fa7a0", "#e2553f", "#7fb6e3")
PO_SKY = "#5a7fb4"
PO_W, PO_Z0, PO_HGT, PO_T = 0.62, 0.10, 1.20, 0.024
PO_LEAN = 0.05


def _po_mats():
    return {
        "acc": mat(PO_ACCENT),
        "sky": mat(PO_SKY),
        "hill": mat("plant"),
        "white": mat("plastic_white", rough=0.5),
        "steel": mat("metal_light", metal=0.6, rough=0.35),
        "char": mat("charcoal"),
        "sun": mat(PO_ACCENT, emit=0.9),
        "gold": mat(PO_ACCENT, metal=0.6, rough=0.35),
        "beam": mat("screen_glow", rough=0.3, emit=0.5, alpha=0.2),
    }


def _po_lean_pt(p, pivot_z, lean=PO_LEAN):
    """Where a point of the upright print ends up once it leans back round (0, 0, pivot_z)."""
    x, y, z = p
    a = -lean
    dz = z - pivot_z
    return (x, y * math.cos(a) - dz * math.sin(a), pivot_z + y * math.sin(a) + dz * math.cos(a))


def _po_slots(root, specs):
    """_slots with a turn per slot: specs are ((x, y, z), scale, rx, rz)."""
    _slots(root, [(loc, sc) for loc, sc, _rx, _rz in specs])
    for c in root.children:
        n = c.name.split(".")[0]
        if n.startswith("Slot"):
            _l, _s, rx, rz = specs[int(n[4])]
            c.rotation_euler = (rx, 0, rz)


def _po_art(pre, w, h, x, yf, z0, sky=PO_SKY):
    """The motivational picture on a face at y = yf (facing -Y), w x h from z0: blue sky, a yellow
    sun, a green hill and an empty white line for the slogan. The board shows round the edges."""
    m = _po_mats()
    iw = w - 0.08 * w / PO_W
    parts = [box(f"{pre}Sky", (iw, 0.008, 0.66 * h), loc=(x, yf - 0.004, z0 + 0.22 * h), material=mat(sky)),
             box(f"{pre}HillA", (0.74 * iw, 0.008, 0.21 * h), loc=(x - 0.13 * iw, yf - 0.010, z0 + 0.22 * h), material=m["hill"], taper=0.42),
             box(f"{pre}HillB", (0.62 * iw, 0.008, 0.15 * h), loc=(x + 0.19 * iw, yf - 0.013, z0 + 0.22 * h), material=m["hill"], taper=0.38),
             _cyly(f"{pre}Sun", 0.19 * w, 0.012, (x + 0.16 * w, yf - 0.012, z0 + 0.69 * h), m["sun"], verts=14),
             box(f"{pre}Slogan", (iw - 0.06 * w / PO_W, 0.010, 0.11 * h), loc=(x, yf - 0.005, z0 + 0.085 * h), material=m["white"])]
    return parts


def _po_cassette(pre, w, col="metal_light", stripe=PO_ACCENT, foot_x=0.30):
    """The cassette the print rolls out of, on two fold-out feet. Top at 0.115."""
    m = _po_mats()
    body = mat(col, metal=0.6, rough=0.35) if col == "metal_light" else mat(col)
    parts = [box(f"{pre}Case", (w, 0.16, 0.09), loc=(0, 0, 0.025), material=body, bevel=0.02),
             box(f"{pre}CapL", (0.035, 0.17, 0.10), loc=(-w / 2, 0, 0.02), material=m["char"], bevel=0.01),
             box(f"{pre}CapR", (0.035, 0.17, 0.10), loc=(w / 2, 0, 0.02), material=m["char"], bevel=0.01),
             box(f"{pre}Lips", (w - 0.08, 0.05, 0.012), loc=(0, 0, 0.11), material=m["char"])]
    for sy in (-1, 1):
        parts.append(box(f"{pre}Stripe{sy}", (w - 0.10, 0.008, 0.035), loc=(0, sy * 0.081, 0.05), material=mat(stripe)))
    for i, sx in enumerate((-1, 1)):
        parts += [box(f"{pre}Foot{i}", (0.05, 0.31, 0.03), loc=(sx * foot_x, 0, 0), material=m["steel"], bevel=0.008),
                  box(f"{pre}Pad{i}a", (0.06, 0.04, 0.012), loc=(sx * foot_x, -0.145, 0), material=m["char"]),
                  box(f"{pre}Pad{i}b", (0.06, 0.04, 0.012), loc=(sx * foot_x, 0.145, 0), material=m["char"])]
    return parts


def _po_banner(pre, w=PO_W, h=PO_HGT, z0=PO_Z0, back=PO_ACCENT, art=True, lean=PO_LEAN, pole=True):
    """The print with its top rail and the pole behind it, leaning back round its foot."""
    m = _po_mats()
    parts = [box(f"{pre}Print", (w, PO_T, h), loc=(0, 0, z0), material=mat(back)),
             box(f"{pre}Rail", (w + 0.04, 0.045, 0.04), loc=(0, 0, z0 + h - 0.02), material=m["char"], bevel=0.008)]
    if art:
        parts += _po_art(f"{pre}Art", w, h, 0, -PO_T / 2, z0)
    if pole:
        parts += [cyl(f"{pre}Pole", 0.02, h - 0.03, loc=(0, PO_T / 2 + 0.021, z0), material=m["steel"], verts=8),
                  box(f"{pre}Clamp", (0.07, 0.05, 0.06), loc=(0, PO_T / 2 + 0.02, z0 + h - 0.07), material=m["char"])]
    if lean:
        kit.tilt(parts, rx=-lean, pivot=(0, 0, z0))
    return parts


def _po_strut(name, a, b, t, material):
    """A square bar from point a to point b in the YZ plane (x of a)."""
    dy, dz = b[1] - a[1], b[2] - a[2]
    ln = math.hypot(dy, dz)
    ang = math.atan2(dy, dz)
    # Lift it by the corner that the tilt swings under the floor.
    a = (a[0], a[1], a[2] + t / 2 * abs(math.sin(ang)))
    s = box(name, (t, t, ln), loc=a, material=material)
    kit.tilt(s, rx=-ang, pivot=a)
    return s


def _po_bar_xz(name, a, b, t, y, material, z0=0.0):
    """A flat bar from (x, z) a to b on a face at y, a little longer so two bars meet cleanly."""
    (x0, za), (x1, zb) = a, b
    mx, mz = (x0 + x1) / 2, z0 + (za + zb) / 2
    ln = math.hypot(x1 - x0, zb - za) + t * 0.8
    bar = box(name, (ln, 0.012, t), loc=(mx, y, mz - t / 2), material=material)
    kit.tilt(bar, ry=-math.atan2(zb - za, x1 - x0), pivot=(mx, y, mz))
    return bar


def _po_star(pre, c, r, material, depth=0.03):
    """A five-pointed star standing in the XZ plane, facing the front."""
    parts = [_cyly(f"{pre}Core", 0.42 * r, depth, c, material, verts=10)]
    for i in range(5):
        a = math.pi / 2 + 2 * math.pi * i / 5
        b = box(f"{pre}Pt{i}", (0.46 * r, depth * 0.9, r), loc=c, material=material, taper=0.12)
        kit.tilt(b, ry=math.pi / 2 - a, pivot=c)
        parts.append(b)
    return parts


def _po_rosette(pre, c, r, col, mid):
    """A prize rosette facing the front, with two ribbon tails. col is a material."""
    x, y, z = c
    parts = [_cyly(f"{pre}Disc", r, 0.02, c, col, verts=12),
             _cyly(f"{pre}Mid", r * 0.45, 0.03, (x, y - 0.006, z), mid, verts=10)]
    for i, sx in enumerate((-1, 1)):
        t = box(f"{pre}Tail{i}", (r * 0.5, 0.015, r * 1.3), loc=(x + sx * r * 0.35, y + 0.006, z - r * 1.35), material=col)
        kit.tilt(t, ry=sx * 0.3, pivot=(x + sx * r * 0.35, y, z - r * 0.2))
        parts.append(t)
    return parts


def _po_spot(pre, c, lens, back=0.33, out=0.0, beam=0.30):
    """A spotlight on the floor at c, aimed up and back at the picture, with its beam."""
    x, y, z = c
    m = _po_mats()
    parts = [box(f"{pre}Mount", (0.08, 0.08, 0.04), loc=(x, y, z), material=m["char"], bevel=0.008)]
    head = [cyl(f"{pre}Can", 0.055, 0.12, loc=(x, y, z + 0.03), material=m["char"], verts=10),
            cyl(f"{pre}Lens", 0.045, 0.012, loc=(x, y, z + 0.15), material=lens, verts=10)]
    if beam:
        head.append(cyl(f"{pre}Beam", 0.045, beam, loc=(x, y, z + 0.162), material=m["beam"], verts=10, radius_top=0.10))
    kit.tilt(head, rx=-back, ry=out, pivot=(x, y, z + 0.06))
    return parts + head


# --- Core.

def b_poster_core():
    root = empty("poster_core")
    m = _po_mats()
    parts = _po_cassette("Cas", 0.66) + _po_banner("Ban")
    # The brace from the pole to the floor behind, so the back is a poster on its stand too.
    top = _po_lean_pt((0, PO_T / 2 + 0.021, PO_Z0 + 0.50), PO_Z0)
    parts += [_po_strut("Brace", (0, 0.20, 0.0), top, 0.03, m["steel"]),
              box("BraceFoot", (0.08, 0.06, 0.02), loc=(0, 0.20, 0), material=m["char"])]
    parent(join("poster_core_mesh", parts), root)
    _po_slots(root, [(_po_lean_pt((0, 0, PO_Z0 + PO_HGT), PO_Z0), 1.0, -PO_LEAN, 0),
                     ((0, 0, PO_Z0), 1.0, -PO_LEAN, 0),
                     ((0, -0.155, 0), 1.0, 0, 0)])
    return root


# --- Modules. Path 1 on the top edge (origin: top middle of the picture), path 2 round the
# picture (origin: its bottom middle), path 3 on the floor in front (origin: on the floor).

def _po_bunting(pre, w, n, fw, fh, y, col):
    parts = [box(f"{pre}Line", (w + 0.02, 0.012, 0.012), loc=(0, y, -0.03), material=mat("charcoal"))]
    for i in range(n):
        fx = -w / 2 + fw / 2 + i * (w - fw) / (n - 1)
        f = box(f"{pre}Flag{i}", (fw, 0.012, fh), loc=(fx, y, -0.03 - fh), material=mat(col), taper=0.1)
        kit.tilt(f, rx=math.pi, pivot=(fx, y, -0.03 - fh / 2))
        parts.append(f)
    return parts


def _po_balloon(pre, x, y, h, r, col):
    """A balloon on a string from the top edge, its middle h above it."""
    return [box(f"{pre}String", (0.01, 0.01, h - r), loc=(x, y, -0.03), material=mat("charcoal")),
            cyl(f"{pre}Knot", 0.012, 0.03, loc=(x, y, h - r * 1.15 - 0.02), material=mat(col), verts=6, radius_top=0.025),
            ball(f"{pre}Ball", r, loc=(x, y, h), material=mat(col, rough=0.4), scale=(1, 1, 1.18))]


def b_poster_m0_1():
    root = empty("poster_m0_1")
    teal = PO_PATH[0]
    parts = _po_bunting("Bunt", 0.62, 6, 0.09, 0.11, -0.06, teal) + _po_balloon("Bal", 0.25, -0.06, 0.22, 0.08, teal)
    parent(join("poster_m0_1_mesh", parts), root)
    return root


def b_poster_m0_2():
    root = empty("poster_m0_2")
    teal = PO_PATH[0]
    parts = _po_bunting("Bunt", 0.64, 6, 0.10, 0.14, -0.06, teal)
    parts += (_po_balloon("BalA", 0.30, -0.08, 0.27, 0.085, teal) + _po_balloon("BalB", 0.08, -0.09, 0.30, 0.09, teal)
              + _po_balloon("BalC", -0.30, -0.08, 0.24, 0.08, teal))
    # Team photos on a ledge along the top: frames you can count from across the floor.
    parts.append(box("Ledge", (0.56, 0.06, 0.05), loc=(0, 0, 0.0), material=mat(teal), bevel=0.01))
    for i, x in enumerate((-0.19, 0.0, 0.19)):
        parts += [box(f"Photo{i}", (0.15, 0.03, 0.13), loc=(x, 0.0, 0.05), material=mat(teal), bevel=0.008),
                  box(f"Pic{i}", (0.105, 0.036, 0.085), loc=(x, 0.0, 0.072), material=mat("plastic_white", rough=0.5))]
    parent(join("poster_m0_2_mesh", parts), root)
    return root


def _po_frame(pre, bar, depth, col, w=PO_W, h=PO_HGT):
    """Four bars round a w x h picture whose bottom middle is the origin."""
    c = mat(col, rough=0.7)
    z0 = 0.02
    return [box(f"{pre}L", (bar, depth, h - z0 + bar / 2), loc=(-w / 2, 0, z0), material=c, bevel=0.008),
            box(f"{pre}R", (bar, depth, h - z0 + bar / 2), loc=(w / 2, 0, z0), material=c, bevel=0.008),
            box(f"{pre}T", (w + bar, depth, bar), loc=(0, 0, h - bar / 2), material=c, bevel=0.008),
            box(f"{pre}B", (w + bar, depth, bar), loc=(0, 0, z0), material=c, bevel=0.008)]


def b_poster_m1_1():
    root = empty("poster_m1_1")
    parent(join("poster_m1_1_mesh", _po_frame("Frame", 0.06, 0.06, PO_PATH[1])), root)
    return root


def b_poster_m1_2():
    root = empty("poster_m1_2")
    red = PO_PATH[1]
    m = _po_mats()
    bar = 0.09
    parts = _po_frame("Frame", bar, bar, red)
    for i, (x, z) in enumerate(((-1, 0.02 + bar / 2), (1, 0.02 + bar / 2), (-1, PO_HGT), (1, PO_HGT))):
        parts.append(ball(f"Knob{i}", 0.05, loc=(x * PO_W / 2, -bar / 2, z), material=m["gold"]))
    parts += _po_rosette("Ros", (-PO_W / 2 + 0.14, -bar / 2 - 0.012, PO_HGT - 0.16), 0.08, mat(red, rough=0.7), m["gold"])
    # A picture light over the top bar: a print worth lighting.
    arm = box("LampArm", (0.03, 0.03, 0.16), loc=(0, -bar / 2 - 0.01, PO_HGT), material=m["gold"])
    kit.tilt(arm, rx=0.7, pivot=(0, -bar / 2 - 0.01, PO_HGT))
    parts += [arm,
              box("LampHood", (0.32, 0.08, 0.05), loc=(0, -0.155, PO_HGT + 0.09), material=mat(red, rough=0.7), bevel=0.01),
              box("LampGlow", (0.28, 0.05, 0.012), loc=(0, -0.155, PO_HGT + 0.082), material=m["sun"])]
    parent(join("poster_m1_2_mesh", parts), root)
    return root


def b_poster_m2_1():
    root = empty("poster_m2_1")
    blue = PO_PATH[2]
    glow = mat(blue, emit=0.9)
    parts = [box("Base", (0.46, 0.12, 0.05), material=mat(blue), bevel=0.012)]
    for i, x in enumerate((-0.15, 0.15)):
        parts += _po_spot(f"Spot{i}", (x, 0, 0.05), glow)
    parent(join("poster_m2_1_mesh", parts), root)
    return root


def b_poster_m2_2():
    root = empty("poster_m2_2")
    blue = PO_PATH[2]
    glow = mat(blue, emit=0.9)
    parts = [box("Base", (0.54, 0.14, 0.06), material=mat(blue), bevel=0.012),
             box("BaseGlow", (0.46, 0.012, 0.025), loc=(0, -0.072, 0.018), material=glow)]
    for i, (x, out) in enumerate(((-0.20, -0.12), (-0.07, 0), (0.07, 0), (0.20, 0.12))):
        parts += _po_spot(f"Spot{i}", (x, 0.01, 0.06), glow, out=out, beam=0.26)
    # Two light sticks at the ends: the print stands in its own glow.
    for i, sx in enumerate((-1, 1)):
        parts += [box(f"StickFoot{i}", (0.08, 0.08, 0.04), loc=(sx * 0.25, 0, 0.06), material=mat("charcoal")),
                  box(f"Stick{i}", (0.05, 0.05, 0.56), loc=(sx * 0.25, 0, 0.10), material=glow, bevel=0.01),
                  box(f"StickCap{i}", (0.06, 0.06, 0.03), loc=(sx * 0.25, 0, 0.66), material=mat("charcoal"))]
    parent(join("poster_m2_2_mesh", parts), root)
    return root


# --- Heroes.

def _po_hand(pre, x, y, z, col, s=1.0, turn=0.0):
    """A raised hand from blocks: forearm, palm, three fingers and a thumb, from z up."""
    c = mat(col)
    parts = [box(f"{pre}Arm", (0.08 * s, 0.06 * s, 0.20 * s), loc=(x, y, z), material=c, bevel=0.008),
             box(f"{pre}Cuff", (0.10 * s, 0.075 * s, 0.05 * s), loc=(x, y, z), material=mat("plastic_white", rough=0.5)),
             box(f"{pre}Palm", (0.13 * s, 0.06 * s, 0.12 * s), loc=(x, y, z + 0.19 * s), material=c, bevel=0.01)]
    for i, (dx, hh) in enumerate(((-0.042, 0.08), (0.0, 0.095), (0.042, 0.085))):
        parts.append(box(f"{pre}Fin{i}", (0.036 * s, 0.05 * s, hh * s), loc=(x + dx * s, y, z + 0.30 * s), material=c, bevel=0.006))
    th = box(f"{pre}Thumb", (0.035 * s, 0.05 * s, 0.08 * s), loc=(x - 0.075 * s, y, z + 0.21 * s), material=c, bevel=0.006)
    kit.tilt(th, ry=-0.6, pivot=(x - 0.065 * s, y, z + 0.21 * s))
    parts.append(th)
    if turn:
        kit.tilt(parts, ry=turn, pivot=(x, y, z))
    return parts


def b_poster_p0_3():
    """All Hands: a wide teal banner on two poles, hands raised behind it, a searchlight."""
    root = empty("poster_p0_3")
    teal = PO_PATH[0]
    m = _po_mats()
    w, z0, h = 0.70, PO_Z0, 0.95
    parts = _po_cassette("Cas", 0.74, col=teal, stripe="plastic_white", foot_x=0.32)
    parts += [box("Print", (w, PO_T, h), loc=(0, 0, z0), material=mat(teal)),
              box("Rail", (w + 0.04, 0.045, 0.04), loc=(0, 0, z0 + h - 0.02), material=m["char"], bevel=0.008),
              box("Slogan", (0.54, 0.01, 0.08), loc=(0, -PO_T / 2 - 0.005, z0 + 0.05), material=m["white"])]
    # A white tick on the front, a white panel with a teal tick on the back.
    for side, sy in (("F", -1), ("B", 1)):
        y = sy * (PO_T / 2 + 0.006)
        # Mirrored on the back, so it reads as a tick from both sides.
        pts = [(-0.13 * -sy, 0.56), (-0.04 * -sy, 0.44), (0.13 * -sy, 0.72)]
        parts += [_po_bar_xz(f"Tick{side}A", pts[0], pts[1], 0.075, y, m["white"], z0),
                  _po_bar_xz(f"Tick{side}B", pts[1], pts[2], 0.075, y, m["white"], z0)]
    for i, sx in enumerate((-1, 1)):
        parts.append(cyl(f"Pole{i}", 0.022, h + 0.06, loc=(sx * 0.33, PO_T / 2 + 0.022, z0), material=m["steel"], verts=8))
    # Three hands go up behind the top edge: everyone has a question.
    top = z0 + h - 0.06
    parts += _po_hand("HandA", -0.24, 0.035, top, "skin_2", 1.0, 0.18)
    parts += _po_hand("HandB", -0.02, 0.035, top + 0.03, "skin_2", 1.08)
    parts += _po_hand("HandC", 0.18, 0.035, top - 0.02, "skin_2", 0.95, -0.15)
    # The searchlight on the right pole, sweeping the floor in front.
    lx, ly, lz = 0.33, PO_T / 2 + 0.022, z0 + h + 0.06
    lamp = [_cyly("LampCan", 0.075, 0.16, (lx, ly - 0.03, lz + 0.10), m["char"], verts=12, r2=0.06),
            _cyly("LampRim", 0.085, 0.03, (lx, ly - 0.115, lz + 0.10), mat(teal), verts=12),
            _cyly("LampLens", 0.068, 0.012, (lx, ly - 0.132, lz + 0.10), m["sun"], verts=12),
            _cyly("LampBeam", 0.07, 0.34, (lx, ly - 0.31, lz + 0.10), m["beam"], verts=12, r2=0.15)]
    kit.tilt(lamp, rx=0.30, rz=-0.35, pivot=(lx, ly, lz + 0.10))
    parts += lamp + [box("LampYoke", (0.04, 0.05, 0.12), loc=(lx, ly, lz - 0.02), material=m["char"])]
    parent(join("poster_p0_3_mesh", parts), root)
    s = 0.60
    _po_slots(root, [((0, 0, z0 + h), 1.0, 0, 0),
                     ((0.0, -PO_T / 2 - 0.03 * s, z0 + 0.16), s, 0, 0),
                     ((0, -0.155, 0), 1.0, 0, 0)])
    return root


def b_poster_p0_4():
    """Employee of the Month: a gold-framed board on a teal podium of three, a star above it."""
    root = empty("poster_p0_4")
    teal = PO_PATH[0]
    m = _po_mats()
    parts = []
    for i, (x, w, hh) in enumerate(((-0.265, 0.25, 0.28), (0.0, 0.28, 0.42), (0.265, 0.25, 0.18))):
        parts += [box(f"Step{i}", (w, 0.42, hh), loc=(x, 0.02, 0), material=mat(teal), bevel=0.015),
                  box(f"StepTop{i}", (w - 0.02, 0.40, 0.02), loc=(x, 0.02, hh), material=m["white"])]
    # A gold 1 on the front of the top step, and plain gold numbers' worth of trim on the others.
    parts += [box("One", (0.05, 0.02, 0.22), loc=(0.01, -0.195, 0.10), material=m["gold"]),
              box("OneFlag", (0.07, 0.02, 0.045), loc=(-0.02, -0.195, 0.27), material=m["gold"])]
    kit.tilt(parts[-1], ry=0.6, pivot=(-0.02, -0.195, 0.29))
    parts += [box("OneFoot", (0.11, 0.02, 0.04), loc=(0.01, -0.195, 0.08), material=m["gold"])]
    for i, x in enumerate((-0.265, 0.265)):
        parts.append(box(f"Trim{i}", (0.16, 0.02, 0.03), loc=(x, -0.195, 0.10 if i else 0.16), material=m["gold"]))
    # The board, on a little stand on the top step.
    bw, bh, bz, by = 0.40, 0.775, 0.52, 0.04
    parts += [box("Stand", (0.20, 0.14, 0.10), loc=(0, by, 0.42), material=m["char"], bevel=0.01),
              box("Board", (bw, 0.04, bh), loc=(0, by, bz), material=m["white"]),
              box("BoardBack", (bw - 0.06, 0.012, bh - 0.08), loc=(0, by + 0.024, bz + 0.04), material=mat(teal))]
    g = 0.045
    parts += [box("GoldL", (g, 0.06, bh + 2 * g), loc=(-bw / 2 - g / 2, by, bz - g), material=m["gold"], bevel=0.008),
              box("GoldR", (g, 0.06, bh + 2 * g), loc=(bw / 2 + g / 2, by, bz - g), material=m["gold"], bevel=0.008),
              box("GoldT", (bw + 2 * g, 0.06, g), loc=(0, by, bz + bh), material=m["gold"], bevel=0.008),
              box("GoldB", (bw + 2 * g, 0.06, g), loc=(0, by, bz - g), material=m["gold"], bevel=0.008)]
    # On the board: a big teal 1 and a teal rosette in the corner.
    fy = by - 0.02
    parts += [box("BigOne", (0.08, 0.02, 0.44), loc=(0.02, fy - 0.008, bz + 0.16), material=mat(teal)),
              box("BigOneFoot", (0.20, 0.02, 0.06), loc=(0.02, fy - 0.008, bz + 0.12), material=mat(teal))]
    flag = box("BigOneFlag", (0.12, 0.02, 0.07), loc=(-0.04, fy - 0.008, bz + 0.52), material=mat(teal))
    kit.tilt(flag, ry=0.6, pivot=(-0.01, fy - 0.008, bz + 0.58))
    parts.append(flag)
    parts += _po_rosette("Ros", (0.12, fy - 0.02, bz + bh - 0.14), 0.075, mat(teal), m["gold"])
    # The star over it all, lit, on a gold rod.
    parts += [box("StarRod", (0.03, 0.03, 0.12), loc=(0, by, bz + bh + g), material=m["gold"])]
    parts += _po_star("Star", (0, by, 1.50), 0.14, m["sun"], depth=0.04)
    # Spotlights on the low steps, aimed at the board.
    parts += _po_spot("SpotL", (-0.30, -0.08, 0.28), m["sun"], back=-0.25, out=0.35, beam=0.13)
    parts += _po_spot("SpotR", (0.30, -0.08, 0.18), m["sun"], back=-0.25, out=-0.35, beam=0.15)
    parent(join("poster_p0_4_mesh", parts), root)
    s = bw / PO_W
    _po_slots(root, [((0, by, bz + bh), 1.0, 0, 0),
                     ((0, by - 0.03 - 0.03 * s, bz - 0.02 * s), s, 0, 0),
                     ((0, -0.38, 0), 1.0, 0, 0)])
    return root


def b_poster_p1_3():
    """Inspirational Quote: a heavy black frame round a red mount on a red easel; at its foot a red
    arrow straight through a shield."""
    root = empty("poster_p1_3")
    red = PO_PATH[1]
    m = _po_mats()
    blk = mat("plastic_black", rough=0.6)
    wood = mat(red, rough=0.7)
    parts = []
    # The easel: two front legs leaning back, a back leg, a ledge for the frame.
    for i, sx in enumerate((-1, 1)):
        parts.append(_po_strut(f"Leg{i}", (sx * 0.27, -0.14, 0.0), (sx * 0.27, 0.06, 1.30), 0.05, wood))
    parts.append(_po_strut("BackLeg", (0, 0.25, 0.0), (0, 0.09, 1.20), 0.045, wood))
    parts += [box("Ledge", (0.72, 0.12, 0.05), loc=(0, -0.08, 0.40), material=wood, bevel=0.01),
              box("Mast", (0.06, 0.05, 1.10), loc=(0, 0.06, 0.25), material=wood)]
    # The frame, leaning on the legs.
    fw, fh, fz, fy, bar = 0.74, 0.80, 0.45, -0.06, 0.11
    fr = [box("FrameL", (bar, 0.08, fh), loc=(-fw / 2 + bar / 2, fy, fz), material=blk, bevel=0.012),
          box("FrameR", (bar, 0.08, fh), loc=(fw / 2 - bar / 2, fy, fz), material=blk, bevel=0.012),
          box("FrameT", (fw, 0.08, bar), loc=(0, fy, fz + fh - bar), material=blk, bevel=0.012),
          box("FrameB", (fw, 0.08, bar), loc=(0, fy, fz), material=blk, bevel=0.012),
          box("Mount", (fw - 2 * bar + 0.02, 0.05, fh - 2 * bar + 0.02), loc=(0, fy + 0.01, fz + bar - 0.01), material=mat(red)),
          box("Quote", (0.34, 0.056, 0.36), loc=(0, fy + 0.01, fz + 0.22), material=m["white"]),
          box("Backing", (fw - 0.04, 0.012, fh - 0.04), loc=(0, fy + 0.044, fz + 0.02), material=mat("wood"))]
    for i, (ww, zz) in enumerate(((0.24, 0.47), (0.20, 0.40), (0.24, 0.33))):
        fr.append(box(f"Text{i}", (ww, 0.062, 0.03), loc=(0, fy + 0.01, fz + zz), material=blk))
    for i, x in enumerate((-0.115, -0.065)):
        q = box(f"Mark{i}", (0.035, 0.062, 0.07), loc=(x, fy + 0.01, fz + 0.50), material=mat(red), taper=0.5)
        fr.append(q)
    parts += fr
    # The red arrow, straight through a shield on the floor.
    sx_, sy_, sz_ = 0.20, -0.27, 0.14
    sh = [_cyly("Shield", 0.12, 0.03, (sx_, sy_, sz_), m["steel"], verts=12),
          _cyly("ShieldRim", 0.13, 0.02, (sx_, sy_ + 0.02, sz_), blk, verts=12),
          _cyly("Boss", 0.04, 0.04, (sx_ + 0.05, sy_ - 0.02, sz_ + 0.04), blk, verts=8)]
    kit.tilt(sh, rx=-0.25, pivot=(sx_, sy_, 0.0))
    arrow = [_cyly("Shaft", 0.02, 0.36, (sx_, sy_ + 0.02, sz_ + 0.02), wood, verts=8),
             _cyly("Head", 0.055, 0.10, (sx_, sy_ + 0.24, sz_ + 0.02), wood, verts=8, r2=0.002)]
    for i, a in enumerate((0, math.pi / 2)):
        f = box(f"Fletch{i}", (0.10, 0.08, 0.012), loc=(sx_, sy_ - 0.13, sz_ + 0.014), material=wood)
        kit.tilt(f, ry=a, pivot=(sx_, sy_ - 0.13, sz_ + 0.02))
        arrow.append(f)
    kit.tilt(arrow, rx=0.12, rz=0.25, pivot=(sx_, sy_, sz_))
    parts += sh + arrow
    parent(join("poster_p1_3_mesh", parts), root)
    _po_slots(root, [((0, fy, fz + fh), 1.0, 0, 0),
                     ((0, fy, fz), 1.0, 0, 0),
                     ((-0.15, -0.31, 0), 0.75, 0, 0)])
    return root


def _po_panel(pre, x0, x1, h, red, gold, text, rz=0.0, hinge=None):
    """One leaf of the folding screen from x0 to x1, red with a gold frame on both faces."""
    w, x = x1 - x0, (x0 + x1) / 2
    g = 0.035
    parts = [box(f"{pre}Leaf", (w, 0.04, h), loc=(x, 0, 0.05), material=red),
             box(f"{pre}L", (g, 0.05, h), loc=(x0 + g / 2, 0, 0.05), material=gold),
             box(f"{pre}R", (g, 0.05, h), loc=(x1 - g / 2, 0, 0.05), material=gold),
             box(f"{pre}T", (w, 0.05, g), loc=(x, 0, 0.05 + h - g), material=gold),
             box(f"{pre}B", (w, 0.05, g), loc=(x, 0, 0.05), material=gold),
             box(f"{pre}FootL", (0.04, 0.10, 0.05), loc=(x0 + 0.04, 0, 0), material=mat("charcoal")),
             box(f"{pre}FootR", (0.04, 0.10, 0.05), loc=(x1 - 0.04, 0, 0), material=mat("charcoal"))]
    if text:
        for i in range(4):
            for sy in (-1, 1):
                parts.append(box(f"{pre}Text{i}{sy}", (w - 0.11 - (i % 2) * 0.05, 0.046, 0.035),
                                 loc=(x, 0, 0.05 + h * 0.62 - i * 0.10), material=text))
    if rz:
        kit.tilt(parts, rz=rz, pivot=hinge)
    return parts


def b_poster_p1_4():
    """Mission Statement: a folding screen of three framed red-and-gold leaves, a lit seal on top."""
    root = empty("poster_p1_4")
    red = mat(PO_PATH[1], rough=0.6)
    m = _po_mats()
    gold = m["gold"]
    paper = mat("paper")
    hx, turn = 0.17, 0.62
    parts = _po_panel("C", -hx, hx, 1.28, red, gold, None)
    parts += _po_panel("L", -hx - 0.29, -hx, 1.08, red, gold, paper, rz=-turn, hinge=(-hx, 0, 0))
    parts += _po_panel("R", hx, hx + 0.29, 1.08, red, gold, paper, rz=turn, hinge=(hx, 0, 0))
    for i, z in enumerate((0.20, 0.62, 1.00)):
        for j, sx in enumerate((-1, 1)):
            parts.append(cyl(f"Hinge{i}{j}", 0.022, 0.08, loc=(sx * hx, 0, z), material=gold, verts=8))
    # The middle leaf: a big gold seal and a brass plate at the bottom, both faces.
    for side, sy in (("F", -1), ("B", 1)):
        y = sy * 0.025
        parts += [_cyly(f"Seal{side}", 0.12, 0.02, (0, y, 0.92), gold, verts=14),
                  _cyly(f"SealIn{side}", 0.075, 0.026, (0, y, 0.92), red, verts=12),
                  _cyly(f"SealDot{side}", 0.035, 0.03, (0, y, 0.92), gold, verts=8),
                  box(f"Plate{side}", (0.22, 0.02, 0.12), loc=(0, y, 0.22), material=gold, bevel=0.006),
                  box(f"PlateLine{side}", (0.15, 0.026, 0.02), loc=(0, y, 0.27), material=mat("charcoal"))]
        for i in range(3):
            parts.append(box(f"Line{side}{i}", (0.20 - (i % 2) * 0.05, 0.046, 0.03), loc=(0, 0, 0.55 - i * 0.08), material=paper))
    # The crown: a gold pediment and a lit star over the middle leaf.
    parts += [box("Pediment", (0.40, 0.07, 0.10), loc=(0, 0, 1.31), material=gold, bevel=0.01, taper=0.35)]
    parts += _po_star("Star", (0, 0, 1.50), 0.10, m["sun"], depth=0.04)
    parent(join("poster_p1_4_mesh", parts), root)
    # Slot0 sits on the top of the left leaf, turned with it.
    lc = (-hx - 0.145, 0, 1.13)
    a = -turn
    lx = -hx + (lc[0] + hx) * math.cos(a)
    ly = (lc[0] + hx) * math.sin(a)
    _po_slots(root, [((lx, ly, lc[2]), 0.50, 0, a),
                     ((0, -0.05, 0.10), 0.40, 0, 0),
                     ((0, -0.17, 0), 1.0, 0, 0)])
    return root


def _po_screen(pre, w, h, z0, d=0.08, face="navy"):
    """A screen in a light blue housing, its face at the front; vents on the back."""
    blue = PO_PATH[2]
    parts = [box(f"{pre}Housing", (w, d, h), loc=(0, 0, z0), material=mat(blue), bevel=0.015),
             box(f"{pre}Face", (w - 0.06, 0.01, h - 0.06), loc=(0, -d / 2 - 0.003, z0 + 0.03), material=mat(face, emit=0.4))]
    for i in range(4):
        parts.append(box(f"{pre}Vent{i}", (w * 0.6, 0.01, 0.025), loc=(0, d / 2 + 0.003, z0 + h * 0.25 + i * 0.07), material=mat("charcoal")))
    return parts


def _po_percent(pre, c, s, material):
    """A % sign from blocks, standing on a face at c (its middle)."""
    x, y, z = c
    bar = box(f"{pre}Bar", (0.04 * s, 0.014, 0.34 * s), loc=(x, y, z - 0.17 * s), material=material)
    kit.tilt(bar, ry=0.6, pivot=(x, y, z))
    parts = [bar]
    for i, (dx, dz) in enumerate(((-0.09, 0.09), (0.09, -0.09))):
        parts += [box(f"{pre}Ring{i}", (0.09 * s, 0.014, 0.09 * s), loc=(x + dx * s, y, z + dz * s - 0.045 * s), material=material),
                  box(f"{pre}Hole{i}", (0.04 * s, 0.018, 0.04 * s), loc=(x + dx * s, y, z + dz * s - 0.02 * s), material=mat("navy", emit=0.4))]
    return parts


def b_poster_p2_3():
    """Sponsored Content: a screen on a light blue pillar with the old poster on its front, a big
    yellow price tag hanging off the corner."""
    root = empty("poster_p2_3")
    blue = PO_PATH[2]
    glow = mat(blue, emit=0.9)
    m = _po_mats()
    pw, ph = 0.32, 0.64
    parts = [box("Plate", (0.46, 0.34, 0.04), material=m["char"], bevel=0.01),
             box("Pillar", (pw, 0.22, ph), loc=(0, 0.0, 0.04), material=mat(blue), bevel=0.012),
             box("PillarBack", (0.20, 0.012, 0.30), loc=(0, 0.113, 0.16), material=m["char"]),
             box("Poster", (0.29, 0.01, 0.60), loc=(0, -0.112, 0.06), material=mat(PO_ACCENT))]
    parts += _po_art("Art", 0.29, 0.60, 0, -0.117, 0.06)
    sz0 = 0.66
    parts += _po_screen("Scr", 0.72, 0.50, sz0)
    parts += _po_percent("Pct", (-0.05, -0.05, sz0 + 0.25), 0.95, glow)
    # The price tag on a string from the bottom right corner.
    parts.append(box("TagString", (0.01, 0.01, 0.10), loc=(0.33, -0.06, sz0 - 0.08), material=m["char"]))
    tag = [box("Tag", (0.22, 0.02, 0.15), loc=(0.27, -0.07, sz0 - 0.24), material=m["acc"], bevel=0.008),
           box("TagHole", (0.03, 0.026, 0.03), loc=(0.35, -0.07, sz0 - 0.13), material=m["char"]),
           box("TagLine", (0.12, 0.026, 0.025), loc=(0.25, -0.07, sz0 - 0.19), material=m["char"])]
    kit.tilt(tag, ry=-0.35, pivot=(0.33, -0.07, sz0 - 0.08))
    parts += tag
    parent(join("poster_p2_3_mesh", parts), root)
    s = 0.29 / PO_W
    _po_slots(root, [((0, -0.01, sz0 + 0.50), 1.0, 0, 0),
                     ((0, -0.117 - 0.03 * s, 0.06), s, 0, 0),
                     ((0, -0.30, 0), 1.0, 0, 0)])
    return root


def b_poster_p2_4():
    """LED Wall: a video wall of nine lit tiles on two trusses, coloured lamps on top, a cable reel."""
    root = empty("poster_p2_4")
    blue = PO_PATH[2]
    m = _po_mats()
    shades = (mat(blue, emit=0.9), mat("#4f8fd6", emit=1.2), mat("#2f5fa6", emit=1.0))
    s = 0.58
    cw = PO_W * s
    ww, wh, wz, wd = 0.74, PO_HGT * s, 0.50, 0.08
    sw = (ww - cw) / 2
    parts = [box("Back", (ww + 0.02, wd, wh + 0.02), loc=(0, 0, wz - 0.01), material=m["char"], bevel=0.01)]
    cols = ((-cw / 2 - sw / 2, sw), (0, cw), (cw / 2 + sw / 2, sw))
    for r in range(3):
        for c, (x, w) in enumerate(cols):
            parts.append(box(f"Tile{r}{c}", (w - 0.02, 0.01, wh / 3 - 0.02), loc=(x, -wd / 2 - 0.004, wz + r * wh / 3 + 0.01),
                             material=shades[(r + c) % 3]))
    for i in range(3):
        parts.append(box(f"BackStripe{i}", (ww - 0.10, 0.01, 0.03), loc=(0, wd / 2 + 0.004, wz + 0.15 + i * 0.20), material=mat(blue)))
    # The trusses: a lattice tower each side, a crossbar on top with the lamps.
    tx = 0.39
    for i, sx in enumerate((-1, 1)):
        x = sx * tx
        parts += [box(f"TrussFoot{i}", (0.09, 0.32, 0.03), loc=(x, 0.02, 0), material=m["char"], bevel=0.008)]
        for j, (dx, dy) in enumerate(((-0.025, -0.025), (0.025, -0.025), (-0.025, 0.025), (0.025, 0.025))):
            parts.append(box(f"Rod{i}{j}", (0.014, 0.014, 1.42), loc=(x + dx, dy, 0.03), material=m["steel"]))
        for k in range(7):
            z = 0.06 + k * 0.20
            rung = box(f"Rung{i}{k}", (0.012, 0.012, 0.21), loc=(x, -0.025, z), material=m["steel"])
            kit.tilt(rung, ry=0.24 * (1 if k % 2 else -1), pivot=(x, -0.025, z + 0.10))
            parts.append(rung)
            rung = box(f"RungB{i}{k}", (0.012, 0.012, 0.21), loc=(x, 0.025, z), material=m["steel"])
            kit.tilt(rung, ry=0.24 * (-1 if k % 2 else 1), pivot=(x, 0.025, z + 0.10))
            parts.append(rung)
        parts.append(box(f"Bracket{i}", (tx - ww / 2 + 0.02, 0.04, 0.06), loc=(sx * (ww / 2 + (tx - ww / 2) / 2), 0, wz + wh / 2), material=m["char"]))
    parts += [box("Cross", (2 * tx + 0.07, 0.07, 0.06), loc=(0, 0.06, 1.38), material=m["char"], bevel=0.008)]
    lamp_cols = (m["sun"], shades[0], mat("pink", emit=1.5), m["sun"], shades[0], mat("pink", emit=1.5))
    for i in range(6):
        x = -0.30 + i * 0.12
        parts += [box(f"LampBody{i}", (0.07, 0.07, 0.06), loc=(x, 0.06, 1.44), material=m["char"]),
                  cyl(f"Lamp{i}", 0.035, 0.05, loc=(x, 0.06, 1.50), material=lamp_cols[i], verts=8)]
    # The cable reel at the foot, its cable up to the wall.
    rx, ry = 0.20, -0.26
    parts += [_cylx("ReelL", 0.12, 0.02, (rx - 0.07, ry, 0.12), mat(blue), verts=12),
              _cylx("ReelR", 0.12, 0.02, (rx + 0.07, ry, 0.12), mat(blue), verts=12),
              _cylx("ReelDrum", 0.08, 0.12, (rx, ry, 0.12), m["char"], verts=12),
              box("ReelFoot", (0.20, 0.08, 0.02), loc=(rx, ry, 0), material=m["char"]),
              _po_strut("Cable", (rx, ry + 0.05, 0.18), (rx, -wd / 2, wz + 0.02), 0.022, m["char"])]
    parent(join("poster_p2_4_mesh", parts), root)
    _po_slots(root, [((0, -0.01, wz + wh), 1.0, 0, 0),
                     ((0, -wd / 2 - 0.006 - 0.03 * s, wz - 0.02 * s), s, 0, 0),
                     ((0, -0.30, 0), 1.0, 0, 0)])
    return root


def tower_poster(tiers):
    return tower_parts("poster", tiers)


TOWER_PART_BUILDERS["poster_core"] = b_poster_core
for _p in range(3):
    for _t in (1, 2):
        TOWER_PART_BUILDERS[f"poster_m{_p}_{_t}"] = globals()[f"b_poster_m{_p}_{_t}"]
    for _t in (3, 4):
        TOWER_PART_BUILDERS[f"poster_p{_p}_{_t}"] = globals()[f"b_poster_p{_p}_{_t}"]





BUILDERS = {
    "intern": b_intern,
    "newhire": b_newhire,
    "requester": b_requester,
    "chaser": b_chaser,
    "headofcomms": b_headofcomms,
    "desk_pair": b_desk_pair,
    "plant": b_plant,
    "cooler": b_cooler,
    "printer": b_printer,
    "player_desk": b_player_desk,
    "door": b_door,
    "chatterbox": b_chatterbox,
    "oldguard": b_oldguard,
    "boardmember": b_boardmember,
    "repairguy": b_repairguy,
    "coffee_bar": b_coffee_bar,
    "vending": b_vending,
    "presenter": b_presenter,
    "projector_screen": b_projector_screen,
    "meeting_table": b_meeting_table,
    "impersonator": b_impersonator,
    "cleaner": b_cleaner,
    "food_counter": b_food_counter,
    "canteen_table": b_canteen_table,
    "wet_floor": b_wet_floor,
    "fridge": b_fridge,
    "kitchen_counter": b_kitchen_counter,
    "high_table": b_high_table,
    "kitchen_table": b_kitchen_table,
    "recycle_bins": b_recycle_bins,
    "keyboard_barrier": b_keyboard_barrier,
    "linemanager": b_linemanager,
    "boardroom_table": b_boardroom_table,
    "sideboard": b_sideboard,
    "coldcaller": b_coldcaller,
    "finalreview": b_finalreview,
    "baby": b_baby,
    "sofa": b_sofa,
    "tv_stand": b_tv_stand,
    "bed": b_bed,
    "bookshelf": b_bookshelf,
    "cat": b_cat,
    "phonecaller": b_phonecaller,
    "smoker": b_smoker,
    "car": b_car,
    "van": b_van,
    "ticket_machine": b_ticket_machine,
    "lamp_post": b_lamp_post,
    "glass_front": b_glass_front,
    "glass_doors": b_glass_doors,
    "waiting_bench": b_waiting_bench,
    "brochure_rack": b_brochure_rack,
    "mail_slots": b_mail_slots,
    "coat_stand": b_coat_stand,
    "glass_partition": b_glass_partition,
    "lounge_wide": b_lounge_wide,
    "lounge_square": b_lounge_square,
    "pillar": b_pillar,
    "logo_wall": b_logo_wall,
    "speed_gate": b_speed_gate,
    "lifts": b_lifts,
    "reception_desk": b_reception_desk,
    "security_post": b_security_post,
    "sculpture": b_sculpture,
    "planter_big": b_planter_big,
    "counter": b_counter,
    "counter_sink": b_counter_sink,
    "counter_coffee": b_counter_coffee,
    "counter_microwave": b_counter_microwave,
    "counter_hob": b_counter_hob,
    "tall_cabinet": b_tall_cabinet,
    "dining_table": b_dining_table,
    "kitchen_chair": b_kitchen_chair,
    "bar_table": b_bar_table,
    "bar_stool": b_bar_stool,
    "window_bar": b_window_bar,
    "beamer": b_beamer,
    "speaker": b_speaker,
    "whiteboard": b_whiteboard,
    "conference_table": b_conference_table,
    "conference_chair": b_conference_chair,
    "chair_stack": b_chair_stack,
    "canteen_long": b_canteen_long,
    "salad_bar": b_salad_bar,
    "serving_counter": b_serving_counter,
    "floor_lamp": b_floor_lamp,
    "trophy_cabinet": b_trophy_cabinet,
    "nightstand": b_nightstand,
    "wardrobe": b_wardrobe,
    "laundry_basket": b_laundry_basket,
    "armchair": b_armchair,
    "coffee_table": b_coffee_table,
    "file_boxes": b_file_boxes,
    "car_long_blue": b_car_long_blue,
    "car_long_red": b_car_long_red,
    "car_long_white": b_car_long_white,
    "van_long": b_van_long,
    "stairwell": b_stairwell,
    "garage_lift": b_garage_lift,
    "tomato_shell": b_tomato_shell,
    "flex_desk": b_flex_desk,
    "lockers": b_lockers,
    "phone_booth": b_phone_booth,
    "desk_phone": b_desk_phone,
    "reserved_sign": b_reserved_sign,
    "tribune_step": b_tribune_step,
    "auditorium_seats": b_auditorium_seats,
    "control_desk": b_control_desk,
    "tv_camera": b_tv_camera,
    "stage_screen": b_stage_screen,
    "glass_blinds": b_glass_blinds,
    "consultant": b_consultant,
    "pingpong_table": b_pingpong_table,
    "beanbag": b_beanbag,
    "neon_sign": b_neon_sign,
    "moving_boxes": b_moving_boxes,
    "hrmanager": b_hrmanager,
    "filing_cabinet": b_filing_cabinet,
    "safe": b_safe,
    "complaint_box": b_complaint_box,
    "one_way_mirror": b_one_way_mirror,
    "server_rack": b_server_rack,
    "server_cart": b_server_cart,
    "cable_reel": b_cable_reel,
    "floor_cables": b_floor_cables,
    "noc_wall": b_noc_wall,
    "projectmanager": b_projectmanager,
    "lamp_desk": b_lamp_desk,
    "pizza_boxes": b_pizza_boxes,
    "pizza": b_pizza,
}
BUILDERS.update(TOWER_PART_BUILDERS)


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    only = None
    out = os.path.join(os.path.dirname(__file__), "..", "..", "public", "models")
    for i, a in enumerate(argv):
        if a == "--only":
            only = set(argv[i + 1].split(","))
        if a == "--out":
            out = argv[i + 1]
    out = os.path.abspath(out)
    os.makedirs(out, exist_ok=True)
    for key, fn in BUILDERS.items():
        if only and key not in only:
            continue
        kit.reset()
        root = fn()
        path = os.path.join(out, f"{key}.glb")
        kit.export_glb(root, path)
        print(f"EXPORTED {key} -> {path} ({os.path.getsize(path)} bytes)")


if __name__ == "__main__":
    main()

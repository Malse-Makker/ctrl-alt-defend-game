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

def side_desk(name, w=0.78, d=0.7, h=0.42, top="wood"):
    """The small office cabinet every tower stands on."""
    top_ob = box(f"{name}Top", (w, d, 0.05), loc=(0, 0, h - 0.05), material=mat(top), bevel=0.012)
    body = box(f"{name}Cab", (w - 0.06, d - 0.08, h - 0.06), loc=(0, 0.01, 0.01), material=mat("metal_light"),
               bevel=0.01)
    drawer = box(f"{name}Drawer", (w - 0.16, 0.012, 0.11), loc=(0, -(d - 0.08) / 2 + 0.005, h - 0.2),
                 material=mat("metal"))
    plinth = box(f"{name}Plinth", (w - 0.1, d - 0.12, 0.02), loc=(0, 0.01, 0), material=mat("metal"))
    return [top_ob, body, drawer, plinth]


def b_coffee_1():
    root = empty("coffee_1")
    h = 0.42
    parts = side_desk("Desk")
    base = box("Base", (0.3, 0.26, 0.04), loc=(0, 0.02, h), material=mat("plastic_black"), bevel=0.01)
    tower = box("Body", (0.3, 0.12, 0.34), loc=(0, 0.09, h), material=mat("plastic_black"), bevel=0.015)
    head = box("Head", (0.3, 0.24, 0.07), loc=(0, 0.03, h + 0.32), material=mat("plastic_black"), bevel=0.015)
    pot = cyl("Pot", 0.085, 0.14, loc=(0, -0.03, h + 0.04), material=mat("window", rough=0.15), verts=12,
              radius_top=0.07)
    brew = cyl("Brew", 0.08, 0.06, loc=(0, -0.03, h + 0.045), material=mat("coffee"), verts=12)
    handle = box("PotHandle", (0.03, 0.03, 0.09), loc=(0.1, -0.03, h + 0.06), material=mat("plastic_black"))
    light = box("Light", (0.03, 0.012, 0.02), loc=(0.1, 0.025, h + 0.25), material=mat("red", emit=2.0))
    mug = cyl("Mug", 0.04, 0.08, loc=(-0.25, -0.18, h), material=mat("plastic_white"), verts=10)
    ob = join("coffee_1_mesh", parts + [base, tower, head, pot, brew, handle, light, mug])
    parent(ob, root)
    return root


def b_coffee_2():
    root = empty("coffee_2")
    h = 0.42
    parts = side_desk("Desk")
    chrome = mat("metal_light", rough=0.25, metal=0.8)
    body = box("Body", (0.46, 0.3, 0.3), loc=(0, 0.05, h), material=chrome, bevel=0.02)
    top = box("Top", (0.46, 0.3, 0.03), loc=(0, 0.05, h + 0.3), material=mat("plastic_black"), bevel=0.01)
    tray = box("Tray", (0.42, 0.1, 0.02), loc=(0, -0.12, h + 0.01), material=mat("metal"))
    parts += [body, top, tray]
    for x in (-0.11, 0.11):
        parts.append(cyl(f"Group{x}", 0.04, 0.05, loc=(x, -0.11, h + 0.19), material=mat("plastic_black"), verts=10))
        parts.append(box(f"Lever{x}", (0.02, 0.1, 0.02), loc=(x, -0.17, h + 0.21), material=mat("plastic_black")))
        parts.append(cyl(f"Cup{x}", 0.032, 0.05, loc=(x, -0.11, h + 0.03), material=mat("plastic_white"), verts=10))
    gauge = cyl("Gauge", 0.035, 0.01, loc=(0, -0.105, h + 0.25), material=mat("plastic_white"), verts=12,
                rot=(math.pi / 2, 0, 0))
    cups = [cyl(f"Stack{i}", 0.035, 0.04, loc=(0.0 + i * 0.0, 0.1, h + 0.33 + i * 0.04),
                material=mat("plastic_white"), verts=10) for i in range(2)]
    ob = join("coffee_2_mesh", parts + [gauge] + cups)
    parent(ob, root)
    return root


def b_coffee_3():
    root = empty("coffee_3")
    h = 0.42
    parts = side_desk("Desk", w=0.86, d=0.74, top="wood_dark")
    chrome = mat("metal_light", rough=0.25, metal=0.8)
    red = mat("red", rough=0.4)
    body = box("Body", (0.48, 0.32, 0.32), loc=(0.08, 0.06, h), material=red, bevel=0.025)
    top = box("Top", (0.48, 0.32, 0.03), loc=(0.08, 0.06, h + 0.32), material=chrome, bevel=0.01)
    parts += [body, top]
    for x in (-0.05, 0.08, 0.21):
        parts.append(cyl(f"Group{x}", 0.035, 0.05, loc=(x, -0.11, h + 0.2), material=chrome, verts=10))
        parts.append(cyl(f"Cup{x}", 0.03, 0.05, loc=(x, -0.11, h + 0.03), material=mat("plastic_white"), verts=10))
    grinder = cyl("Grinder", 0.07, 0.2, loc=(-0.3, 0.1, h), material=mat("plastic_black"), verts=10)
    hopper = cyl("Hopper", 0.05, 0.12, loc=(-0.3, 0.1, h + 0.2), material=mat("window", rough=0.1), verts=10,
                 radius_top=0.09)
    beans = cyl("Beans", 0.06, 0.06, loc=(-0.3, 0.1, h + 0.22), material=mat("coffee"), verts=10, radius_top=0.075)
    jug = cyl("Jug", 0.04, 0.09, loc=(-0.3, -0.2, h), material=chrome, verts=10, radius_top=0.032)
    # A small chalkboard: this is a barista station now, there is a menu.
    board = box("Board", (0.2, 0.02, 0.24), loc=(0.3, -0.25, h), material=mat("plastic_black"), bevel=0.01)
    chalk = box("Chalk", (0.14, 0.022, 0.015), loc=(0.3, -0.252, h + 0.15), material=mat("plastic_white"))
    kit.tilt([board, chalk], rx=0.2)
    steam = [ball(f"Steam{i}", 0.04 - i * 0.008, loc=(0.08 + i * 0.03, -0.05, h + 0.42 + i * 0.07),
                  material=mat("plastic_white", emit=0.3), subdiv=1) for i in range(3)]
    ob = join("coffee_3_mesh", parts + [grinder, hopper, beans, jug, board, chalk] + steam)
    parent(ob, root)
    return root


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


def b_autoreply_1():
    root = empty("autoreply_1")
    h = 0.42
    parts = side_desk("Desk")
    parts += _laptop(0, 0.02, h)
    parts += _envelope(0, 0.1, h + 0.07)
    mug = cyl("Mug", 0.035, 0.07, loc=(0.27, -0.15, h), material=mat("blue"), verts=10)
    ob = join("autoreply_1_mesh", parts + [mug])
    parent(ob, root)
    return root


def _monitor(x, y, z, w=0.42, hgt=0.27, rot=0.0, screen_key="screen", emit=1.2):
    stand = box("Stand", (0.12, 0.1, 0.012), loc=(x, y, z), material=mat("plastic_black"), rot_z=rot)
    neck = box("MonNeck", (0.04, 0.03, 0.14), loc=(x, y + 0.02, z), material=mat("plastic_black"), rot_z=rot)
    frame = box("Frame", (w, 0.035, hgt), loc=(x, y + 0.02, z + 0.1), material=mat("plastic_black"), bevel=0.008,
                rot_z=rot)
    scr = box("Screen", (w - 0.04, 0.004, hgt - 0.04), loc=(x, y + 0.002, z + 0.12), material=mat(screen_key, emit=emit),
              rot_z=rot)
    return [stand, neck, frame, scr]


def b_autoreply_2():
    root = empty("autoreply_2")
    h = 0.42
    parts = side_desk("Desk")
    parts += _monitor(0, 0.12, h, screen_key="yellow", emit=0.8)
    parts += _envelope(0, 0.1, h + 0.235, scale=1.3, tilt=0)
    kb = box("Keyboard", (0.32, 0.1, 0.018), loc=(0, -0.13, h), material=mat("plastic_white"), bevel=0.005)
    # The little "Out of Office" sign on the desk.
    sign = box("Sign", (0.16, 0.012, 0.08), loc=(0.26, -0.2, h + 0.01), material=mat("blue"), bevel=0.004)
    stripe = box("SignText", (0.11, 0.014, 0.015), loc=(0.26, -0.204, h + 0.045), material=mat("plastic_white"))
    kit.tilt([sign, stripe], rx=0.3)
    ob = join("autoreply_2_mesh", parts + [kb, sign, stripe])
    parent(ob, root)
    return root


def b_autoreply_3():
    root = empty("autoreply_3")
    h = 0.42
    parts = side_desk("Desk", w=0.86, d=0.74, top="plastic_white")
    parts += _monitor(-0.2, 0.12, h, w=0.36, rot=0.25, screen_key="screen_glow", emit=1.6)
    parts += _monitor(0.2, 0.12, h, w=0.36, rot=-0.25, screen_key="screen_glow", emit=1.6)
    # Inbox Zero: a big checkmark on the left screen and a zen plant.
    check1 = box("Check1", (0.05, 0.006, 0.018), loc=(-0.23, 0.08, h + 0.22), material=mat("teal", emit=1.0))
    kit.tilt(check1, ry=0.8)
    check2 = box("Check2", (0.1, 0.006, 0.018), loc=(-0.18, 0.075, h + 0.24), material=mat("teal", emit=1.0))
    kit.tilt(check2, ry=-0.9)
    kb = box("Keyboard", (0.34, 0.1, 0.018), loc=(0, -0.15, h), material=mat("plastic_black"), bevel=0.005)
    pot = cyl("Pot", 0.045, 0.06, loc=(0.32, -0.22, h), material=mat("plastic_white"), verts=8)
    succ = ball("Succulent", 0.05, loc=(0.32, -0.22, h + 0.08), material=mat("plant"), subdiv=1, scale=(1, 1, 0.7))
    lamp = box("Halo", (0.7, 0.012, 0.012), loc=(0, 0.14, h + 0.42), material=mat("screen_glow", emit=2.0))
    ob = join("autoreply_3_mesh", parts + [check1, check2, kb, pot, succ, lamp])
    parent(ob, root)
    return root


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

def b_headphones_1():
    root = empty("headphones_1")
    h = 0.42
    parts = side_desk("Desk")
    case = box("Case", (0.16, 0.1, 0.07), loc=(0, -0.02, h), material=mat("plastic_white"), bevel=0.03)
    lid_line = box("CaseLine", (0.165, 0.105, 0.006), loc=(0, -0.02, h + 0.045), material=mat("metal_light"))
    buds = [ball(f"Bud{i}", 0.035, loc=(x, 0.14, h + 0.03), material=mat("plastic_white"), subdiv=1) for i, x in enumerate((-0.08, 0.08))]
    stems = [box(f"Stem{i}", (0.02, 0.02, 0.06), loc=(x, 0.14, h), material=mat("plastic_white")) for i, x in enumerate((-0.08, 0.08))]
    led = box("Led", (0.02, 0.006, 0.01), loc=(0, -0.072, h + 0.03), material=mat("plant", emit=2.0))
    ob = join("headphones_1_mesh", parts + [case, lid_line, led] + buds + stems)
    parent(ob, root)
    return root


def _headset(x, y, z, scale, band_mat, cup_mat, pad_mat):
    s = scale
    parts = []
    for side in (-1, 1):
        parts.append(cyl(f"Cup{side}", 0.07 * s, 0.05 * s, loc=(x + side * 0.12 * s, y, z), material=cup_mat, verts=14, rot=(0, math.pi / 2, 0)))
        parts.append(cyl(f"Pad{side}", 0.06 * s, 0.02 * s, loc=(x + side * 0.095 * s, y, z), material=pad_mat, verts=14, rot=(0, math.pi / 2, 0)))
        parts.append(box(f"Arm{side}", (0.02 * s, 0.03 * s, 0.12 * s), loc=(x + side * 0.13 * s, y, z + 0.05 * s), material=band_mat))
    parts.append(box("Band", (0.28 * s, 0.035 * s, 0.025 * s), loc=(x, y, z + 0.17 * s), material=band_mat, bevel=0.008))
    return parts


def b_headphones_2():
    root = empty("headphones_2")
    h = 0.42
    parts = side_desk("Desk")
    stand = box("StandBase", (0.14, 0.12, 0.02), loc=(0, 0.04, h), material=mat("wood_dark"))
    pole = cyl("Pole", 0.015, 0.22, loc=(0, 0.04, h + 0.02), material=mat("metal"), verts=8)
    hook = box("Hook", (0.24, 0.04, 0.02), loc=(0, 0.04, h + 0.24), material=mat("metal"))
    parts += [stand, pole, hook]
    parts += _headset(0, 0.04, h + 0.12, 1.0, mat("plastic_black"), mat("plastic_black"), mat("plant"))
    ob = join("headphones_2_mesh", parts)
    parent(ob, root)
    return root


def b_headphones_3():
    root = empty("headphones_3")
    h = 0.42
    parts = side_desk("Desk", w=0.86, d=0.74, top="plastic_black")
    foam = [box(f"Foam{i}", (0.18, 0.05, 0.18), loc=(-0.28 + i * 0.28, 0.27, h), material=mat("charcoal", rough=1.0), bevel=0.02) for i in range(3)]
    parts += foam
    parts += _headset(0, -0.02, h + 0.1, 1.45, mat("metal"), mat("plant_dark"), mat("plastic_black"))
    meter = box("Meter", (0.2, 0.04, 0.07), loc=(0.27, -0.24, h), material=mat("plastic_black"), bevel=0.006)
    bars = [box(f"Bar{i}", (0.02, 0.042, 0.015 + i * 0.01), loc=(0.2 + i * 0.035, -0.242, h + 0.02), material=mat("plant", emit=1.8)) for i in range(5)]
    ob = join("headphones_3_mesh", parts + [meter] + bars)
    parent(ob, root)
    return root


def b_artillery_1():
    """Rubber Band: a wooden Y slingshot standing upright, band pulled tight."""
    root = empty("artillery_1")
    h = 0.42
    parts = side_desk("Desk")
    foot = box("Foot", (0.16, 0.12, 0.03), loc=(0, 0.05, h), material=mat("wood_dark"), bevel=0.01)
    handle = cyl("Handle", 0.035, 0.2, loc=(0, 0.05, h + 0.03), material=mat("wood"), verts=10)
    top = h + 0.23
    arms = [cyl(f"Fork{i}", 0.03, 0.18, loc=(0, 0.05, top), material=mat("wood"), verts=10, rot=(0, a, 0)) for i, a in enumerate((-0.5, 0.5))]
    tip = 0.18 * math.sin(0.5)
    tip_z = top + 0.18 * math.cos(0.5)
    band = box("Band", (2 * tip + 0.04, 0.015, 0.02), loc=(0, 0.05, tip_z - 0.01), material=mat("red"))
    pouch = box("Pouch", (0.06, 0.04, 0.04), loc=(0, -0.02, tip_z - 0.03), material=mat("red"))
    clips = [box(f"Clip{i}", (0.05, 0.012, 0.03), loc=(-0.25 + i * 0.07, -0.22, h), material=mat("metal_light", metal=0.7, rough=0.3)) for i in range(3)]
    ob = join("artillery_1_mesh", parts + [foot, handle, band, pouch] + arms + clips)
    parent(ob, root)
    return root


def _stapler(x, y, z, s, body, top):
    base = box("SBase", (0.12 * s, 0.4 * s, 0.03 * s), loc=(x, y, z), material=mat("plastic_black"), bevel=0.01)
    arm = box("SArm", (0.1 * s, 0.38 * s, 0.07 * s), loc=(x, y + 0.01 * s, z + 0.035 * s), material=body, bevel=0.015)
    cap = box("STop", (0.11 * s, 0.3 * s, 0.03 * s), loc=(x, y - 0.03 * s, z + 0.1 * s), material=top, bevel=0.01)
    hinge = cyl("SHinge", 0.025 * s, 0.13 * s, loc=(x - 0.065 * s, y + 0.17 * s, z + 0.06 * s), material=mat("metal"), verts=10, rot=(0, math.pi / 2, 0))
    return [base, arm, cap, hinge]


def b_artillery_2():
    root = empty("artillery_2")
    h = 0.42
    parts = side_desk("Desk")
    parts += _stapler(0, 0, h, 1.2, mat("red", rough=0.4), mat("metal_light", metal=0.7, rough=0.3))
    box_ = box("StapleBox", (0.1, 0.06, 0.04), loc=(0.26, -0.2, h), material=mat("yellow"))
    ob = join("artillery_2_mesh", parts + [box_])
    parent(ob, root)
    return root


def b_artillery_3():
    root = empty("artillery_3")
    h = 0.42
    parts = side_desk("Desk", w=0.86, d=0.74, top="metal")
    turret = cyl("Turret", 0.16, 0.06, loc=(0, 0.02, h), material=mat("metal"), verts=12)
    gun = box("Gun", (0.16, 0.42, 0.14), loc=(0, -0.02, h + 0.06), material=mat("red", rough=0.4), bevel=0.025)
    nose = box("Nose", (0.1, 0.12, 0.08), loc=(0, -0.28, h + 0.09), material=mat("metal_light", metal=0.8, rough=0.3), bevel=0.01)
    grip = box("Grip", (0.07, 0.08, 0.18), loc=(0, 0.14, h + 0.02), material=mat("plastic_black"), bevel=0.01)
    mag = box("Mag", (0.05, 0.3, 0.05), loc=(0, -0.02, h + 0.2), material=mat("yellow"), bevel=0.008)
    hose = cyl("Hose", 0.018, 0.4, loc=(0.1, 0.18, h + 0.05), material=mat("plastic_black"), verts=8, rot=(0, 1.3, 0))
    ob = join("artillery_3_mesh", parts + [turret, gun, nose, grip, mag, hose])
    parent(ob, root)
    return root


def b_shredder_1():
    root = empty("shredder_1")
    bin_ = cyl("Bin", 0.2, 0.42, loc=(0, 0, 0), material=mat("metal", rough=0.5, metal=0.4), verts=14, radius_top=0.24)
    rim = cyl("Rim", 0.25, 0.03, loc=(0, 0, 0.42), material=mat("metal_light", metal=0.6, rough=0.3), verts=14)
    papers = [box(f"Paper{i}", (0.16, 0.12, 0.02), loc=(0.03 * (i - 1), 0.02 * i, 0.4 + 0.02 * i), material=mat("paper"), rot_z=i * 0.7) for i in range(3)]
    ball_ = ball("Wad", 0.06, loc=(0.06, -0.05, 0.47), material=mat("paper"), subdiv=1)
    ob = join("shredder_1_mesh", [bin_, rim, ball_] + papers)
    parent(ob, root)
    return root


def b_shredder_2():
    root = empty("shredder_2")
    bin_ = box("Bin", (0.42, 0.3, 0.42), loc=(0, 0, 0), material=mat("plastic_black"), bevel=0.02)
    window = box("Window", (0.3, 0.01, 0.2), loc=(0, -0.152, 0.1), material=mat("window", rough=0.1))
    strips = [box(f"Strip{i}", (0.008, 0.012, 0.15), loc=(-0.12 + i * 0.03, -0.153, 0.12), material=mat("paper")) for i in range(9)]
    head = box("Head", (0.44, 0.32, 0.12), loc=(0, 0, 0.42), material=mat("teal", rough=0.5), bevel=0.02)
    slot = box("Slot", (0.3, 0.02, 0.01), loc=(0, 0, 0.545), material=mat("plastic_black"))
    sheet = box("Sheet", (0.2, 0.006, 0.18), loc=(0, 0, 0.55), material=mat("paper"))
    led = box("Led", (0.02, 0.02, 0.01), loc=(0.17, -0.1, 0.545), material=mat("plant", emit=2.0))
    ob = join("shredder_2_mesh", [bin_, window, head, slot, sheet, led] + strips)
    parent(ob, root)
    return root


def b_shredder_3():
    root = empty("shredder_3")
    body = box("Body", (0.7, 0.55, 0.7), loc=(0, 0, 0), material=mat("teal", rough=0.5), bevel=0.03)
    hopper = box("Hopper", (0.6, 0.45, 0.18), loc=(0, 0, 0.7), material=mat("metal_light", metal=0.6, rough=0.3), taper=1.25, bevel=0.01)
    stripe = box("Warn", (0.72, 0.01, 0.06), loc=(0, -0.278, 0.55), material=mat("yellow"))
    panel = box("Panel", (0.18, 0.02, 0.12), loc=(0.2, -0.28, 0.3), material=mat("plastic_black"))
    btn = box("Btn", (0.05, 0.03, 0.05), loc=(0.2, -0.29, 0.34), material=mat("red", emit=1.2))
    pile = [box(f"Pile{i}", (0.25, 0.2, 0.03), loc=(-0.38 + 0.02 * i, -0.2, 0.03 * i), material=mat("paper"), rot_z=0.3 * i) for i in range(4)]
    ob = join("shredder_3_mesh", [body, hopper, stripe, panel, btn] + pile)
    parent(ob, root)
    return root


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


def b_quickreply_1():
    root = empty("quickreply_1")
    h = 0.42
    parts = side_desk("Desk")
    parts += _phone(0, 0.02, h)
    parts += _bubble(0.12, 0.0, h + 0.32, 0.16)
    ok = [box(f"OK{i}", (0.02, 0.032, 0.05), loc=(0.09 + i * 0.05, -0.002, h + 0.34), material=mat("blue")) for i in range(2)]
    ob = join("quickreply_1_mesh", parts + ok)
    parent(ob, root)
    return root


def b_quickreply_2():
    root = empty("quickreply_2")
    h = 0.42
    parts = side_desk("Desk")
    parts += _phone(-0.12, 0.06, h)
    kb = box("MiniKb", (0.26, 0.1, 0.02), loc=(0.1, -0.12, h), material=mat("metal_light"), bevel=0.006)
    parts.append(kb)
    parts += _bubble(0.05, 0.02, h + 0.36, 0.18, "yellow", 0.4)
    thumb = box("Thumb", (0.04, 0.034, 0.07), loc=(0.05, 0.0, h + 0.37), material=mat("orange"), bevel=0.01)
    ob = join("quickreply_2_mesh", parts + [thumb])
    parent(ob, root)
    return root


def b_quickreply_3():
    root = empty("quickreply_3")
    h = 0.42
    parts = side_desk("Desk", w=0.86, d=0.74, top="plastic_white")
    stand = box("TStand", (0.16, 0.1, 0.03), loc=(0, 0.1, h), material=mat("metal"))
    tab = box("Tablet", (0.36, 0.025, 0.26), loc=(0, 0.1, h + 0.04), material=mat("plastic_black"), bevel=0.01)
    tscr = box("TScreen", (0.32, 0.004, 0.22), loc=(0, 0.086, h + 0.06), material=mat("screen_glow", emit=1.4))
    kit.tilt([stand, tab, tscr], rx=0.2, pivot=(0, 0.1, h))
    parts += [stand, tab, tscr]
    parts.append(box("Kb", (0.36, 0.1, 0.02), loc=(0, -0.16, h), material=mat("plastic_black"), bevel=0.006))
    for i, (col, w) in enumerate((("plastic_white", 0.16), ("yellow", 0.12), ("teal", 0.18))):
        parts += _bubble(-0.18 + i * 0.16, 0.06, h + 0.42 + i * 0.1, w, col, 0.5)
    ob = join("quickreply_3_mesh", parts)
    parent(ob, root)
    return root


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
    root = empty("projector_screen")
    legs = [cyl(f"Leg{i}", 0.02, 1.5, loc=(x, 0.1, 0), material=mat("metal"), verts=6) for i, x in enumerate((-1.2, 1.2))]
    bar = box("Bar", (2.6, 0.08, 0.08), loc=(0, 0.1, 1.5), material=mat("metal"))
    cloth = box("Cloth", (2.4, 0.02, 1.0), loc=(0, 0.06, 0.45), material=mat("plastic_white", emit=0.2))
    slide = box("Slide", (1.9, 0.024, 0.7), loc=(0, 0.04, 0.6), material=mat("blue", emit=0.6))
    title = box("STitle", (1.2, 0.026, 0.1), loc=(-0.2, 0.035, 1.12), material=mat("plastic_white", emit=0.8))
    bars = [box(f"Chart{i}", (0.18, 0.026, 0.12 + 0.12 * i), loc=(-0.6 + i * 0.3, 0.035, 0.68), material=mat(["yellow", "orange", "teal", "pink"][i], emit=0.8)) for i in range(4)]
    ob = join("projector_screen_mesh", legs + [bar, cloth, slide, title] + bars)
    parent(ob, root)
    return root


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


BUILDERS = {
    "intern": b_intern,
    "newhire": b_newhire,
    "requester": b_requester,
    "chaser": b_chaser,
    "headofcomms": b_headofcomms,
    "coffee_1": b_coffee_1,
    "coffee_2": b_coffee_2,
    "coffee_3": b_coffee_3,
    "autoreply_1": b_autoreply_1,
    "autoreply_2": b_autoreply_2,
    "autoreply_3": b_autoreply_3,
    "desk_pair": b_desk_pair,
    "plant": b_plant,
    "cooler": b_cooler,
    "printer": b_printer,
    "player_desk": b_player_desk,
    "door": b_door,
    "headphones_1": b_headphones_1,
    "headphones_2": b_headphones_2,
    "headphones_3": b_headphones_3,
    "artillery_1": b_artillery_1,
    "artillery_2": b_artillery_2,
    "artillery_3": b_artillery_3,
    "shredder_1": b_shredder_1,
    "shredder_2": b_shredder_2,
    "shredder_3": b_shredder_3,
    "chatterbox": b_chatterbox,
    "oldguard": b_oldguard,
    "boardmember": b_boardmember,
    "repairguy": b_repairguy,
    "coffee_bar": b_coffee_bar,
    "vending": b_vending,
    "quickreply_1": b_quickreply_1,
    "quickreply_2": b_quickreply_2,
    "quickreply_3": b_quickreply_3,
    "presenter": b_presenter,
    "projector_screen": b_projector_screen,
    "meeting_table": b_meeting_table,
}


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

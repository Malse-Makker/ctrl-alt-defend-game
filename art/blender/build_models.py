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
    # Tagged: join() keeps it as its own part, so a tower on a kitchen counter can stand without it.
    for ob in (top_ob, body, drawer, plinth):
        ob["desk"] = True
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


def b_thumbtacks_1():
    root = empty("thumbtacks_1")
    h = 0.42
    parts = side_desk("Desk")
    board = _corkboard(0, 0.22, h, 0.5, 0.36, pins=6)
    kit.tilt(board, rx=-0.18, pivot=(0, 0.22, h))
    parts += board
    tray = box("TackBox", (0.14, 0.1, 0.035), loc=(-0.15, -0.12, h), material=mat("plastic_white", rough=0.3), bevel=0.004)
    parts.append(tray)
    parts += _tacks(-0.15, -0.12, h + 0.035, 6, 0.035, seed=1)
    parts += _tacks(0.12, -0.14, h, 4, 0.06, seed=2)
    ob = join("thumbtacks_1_mesh", parts)
    parent(ob, root)
    return root


def b_thumbtacks_2():
    root = empty("thumbtacks_2")
    h = 0.42
    parts = side_desk("Desk", top="wood_dark")
    board = _corkboard(0, 0.22, h, 0.62, 0.44, pins=12, seed=5)
    kit.tilt(board, rx=-0.18, pivot=(0, 0.22, h))
    parts += board
    box_ = box("TackCarton", (0.2, 0.14, 0.08), loc=(-0.12, -0.1, h), material=mat("red", rough=0.5), bevel=0.006)
    lid = box("TackLid", (0.2, 0.02, 0.1), loc=(-0.12, -0.02, h + 0.08), material=mat("red", rough=0.5), bevel=0.004)
    kit.tilt([lid], rx=-0.9, pivot=(-0.12, -0.03, h + 0.08))
    parts += [box_, lid]
    parts += _tacks(-0.12, -0.1, h + 0.08, 8, 0.05, seed=3)
    parts += _tacks(0.14, -0.12, h, 9, 0.11, seed=4)
    ob = join("thumbtacks_2_mesh", parts)
    parent(ob, root)
    return root


def b_thumbtacks_3():
    root = empty("thumbtacks_3")
    crate = box("Crate", (0.62, 0.5, 0.46), loc=(0, 0.04, 0), material=mat("cardboard"), bevel=0.01)
    tape = box("Tape", (0.64, 0.06, 0.02), loc=(0, 0.04, 0.46), material=mat("yellow", rough=0.4))
    label = box("CrateLabel", (0.3, 0.01, 0.14), loc=(0, -0.215, 0.18), material=mat("paper"))
    stripe = box("CrateStripe", (0.3, 0.012, 0.04), loc=(0, -0.217, 0.26), material=mat("red"))
    chute = box("Chute", (0.18, 0.4, 0.04), loc=(0.0, -0.36, 0.2), material=mat("metal_light", metal=0.6, rough=0.3), bevel=0.006)
    kit.tilt([chute], rx=0.45, pivot=(0, -0.2, 0.3))
    parts = [crate, tape, label, stripe, chute]
    parts += _tacks(0, 0.04, 0.48, 14, 0.18, seed=6, s=1.3)
    parts += _tacks(0.0, -0.5, 0.0, 10, 0.16, seed=7, s=1.3)
    board = _corkboard(0, 0.33, 0.46, 0.56, 0.4, pins=10, seed=8)
    parts += board
    ob = join("thumbtacks_3_mesh", parts)
    parent(ob, root)
    return root


def _kiosk(w=0.36, hgt=0.95, screen="screen", body="plastic_white", accent="teal"):
    base = box("KBase", (w + 0.14, w * 0.9, 0.06), loc=(0, 0.04, 0), material=mat("plastic_black"), bevel=0.01)
    post = box("KPost", (w, w * 0.6, hgt), loc=(0, 0.06, 0.06), material=mat(body, rough=0.4), bevel=0.03)
    band = box("KBand", (w + 0.005, w * 0.6 + 0.005, 0.06), loc=(0, 0.06, 0.06 + hgt * 0.62), material=mat(accent, rough=0.4))
    head = box("KHead", (w + 0.06, 0.08, w * 0.85), loc=(0, -0.02, 0.06 + hgt - 0.02), material=mat("plastic_black"), bevel=0.012)
    scr = box("KScreen", (w - 0.02, 0.006, w * 0.7), loc=(0, -0.062, 0.06 + hgt + 0.02), material=mat(screen, emit=1.3))
    kit.tilt([head, scr], rx=0.35, pivot=(0, 0.0, 0.06 + hgt))
    slot = box("KSlot", (0.16, 0.02, 0.02), loc=(0, -0.13, 0.06 + hgt * 0.5), material=mat("plastic_black"))
    return [base, post, band, head, scr, slot]


def b_selfservice_1():
    root = empty("selfservice_1")
    parts = _kiosk()
    q = box("QMark", (0.05, 0.01, 0.08), loc=(0, -0.11, 1.08), material=mat("plastic_white", emit=1.2))
    kit.tilt([q], rx=0.35, pivot=(0, 0.0, 1.01))
    parts.append(q)
    ob = join("selfservice_1_mesh", parts)
    parent(ob, root)
    return root


def b_selfservice_2():
    root = empty("selfservice_2")
    parts = _kiosk(w=0.4, hgt=1.0)
    ticket = box("Ticket", (0.1, 0.004, 0.14), loc=(0, -0.14, 0.42), material=mat("paper"))
    kit.tilt([ticket], rx=0.5, pivot=(0, -0.13, 0.56))
    pole = cyl("SignPole", 0.015, 0.35, loc=(0.18, 0.15, 1.05), material=mat("metal"), verts=6)
    sign = box("Sign", (0.3, 0.03, 0.14), loc=(0.18, 0.15, 1.4), material=mat("teal", emit=0.4), bevel=0.01)
    txt = box("SignTxt", (0.2, 0.032, 0.03), loc=(0.18, 0.15, 1.455), material=mat("plastic_white", emit=1.0))
    parts += [ticket, pole, sign, txt]
    ob = join("selfservice_2_mesh", parts)
    parent(ob, root)
    return root


def b_selfservice_3():
    root = empty("selfservice_3")
    parts = []
    for i, x in enumerate((-0.24, 0.24)):
        k = _kiosk(w=0.36, hgt=1.0, screen="screen_glow", body="plastic_white", accent="teal")
        for ob in k:
            ob.data.transform(Matrix.Translation((x, 0, 0)))
        parts += k
    arch = box("Arch", (0.92, 0.12, 0.08), loc=(0, 0.1, 1.55), material=mat("teal", emit=0.5), bevel=0.02)
    posts = [box(f"ArchPost{i}", (0.05, 0.05, 1.5), loc=(x, 0.1, 0.05), material=mat("metal"), bevel=0.005) for i, x in enumerate((-0.44, 0.44))]
    bot = ball("BotHead", 0.09, loc=(0, 0.1, 1.72), material=mat("plastic_white", rough=0.3), subdiv=2, scale=(1.2, 0.9, 1.0))
    eyes = [box(f"BotEye{i}", (0.03, 0.01, 0.03), loc=(x, 0.01, 1.73), material=mat("screen_glow", emit=2.0)) for i, x in enumerate((-0.04, 0.04))]
    ant = cyl("BotAnt", 0.008, 0.08, loc=(0, 0.1, 1.8), material=mat("metal"), verts=5)
    tip = ball("BotTip", 0.02, loc=(0, 0.1, 1.89), material=mat("red", emit=1.5), subdiv=1)
    parts += [arch, bot, ant, tip] + posts + eyes
    ob = join("selfservice_3_mesh", parts)
    parent(ob, root)
    return root


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


def b_shredder_p0_3():
    """CROSS-CUT tier 3, Sticky Paper: red cutting head, teeth on show, sticky strips."""
    root = empty("shredder_p0_3")
    parts, top = _shredder_base("red")
    for i in range(7):
        parts.append(box(f"Tooth{i}", (0.035, 0.05, 0.05), loc=(-0.15 + i * 0.05, -0.06, top), material=mat("metal_light", metal=0.8, rough=0.25), taper=0.3))
    for i in range(4):
        x = -0.13 + i * 0.09
        parts.append(box(f"Strip{i}", (0.03, 0.006, 0.2 + 0.03 * (i % 2)), loc=(x, -0.162, 0.12), material=mat("yellow" if i % 2 else "paper")))
    glue = cyl("Glue", 0.035, 0.12, loc=(0.18, -0.24, 0), material=mat("plastic_white"), verts=10)
    cap = cyl("GlueCap", 0.02, 0.04, loc=(0.18, -0.24, 0.12), material=mat("orange"), verts=8)
    stripe = box("Warn", (0.46, 0.01, 0.04), loc=(0, -0.162, 0.34), material=mat("yellow"))
    ob = join("shredder_p0_3_mesh", parts + [glue, cap, stripe])
    parent(ob, root)
    return root


def b_shredder_p0_4():
    """CROSS-CUT tier 4, Industrial Shredder: a big red machine with two cutter drums."""
    root = empty("shredder_p0_4")
    body = box("Body", (0.74, 0.58, 0.62), loc=(0, 0, 0), material=mat("red", rough=0.45), bevel=0.03)
    base = box("Base", (0.8, 0.64, 0.06), loc=(0, 0, 0), material=mat("charcoal"), bevel=0.01)
    # An open hopper, so the cutter drums inside are on show.
    hm = mat("metal", metal=0.6, rough=0.35)
    hopper = [box("HopperF", (0.7, 0.04, 0.16), loc=(0, -0.27, 0.62), material=hm),
              box("HopperB", (0.7, 0.04, 0.24), loc=(0, 0.27, 0.62), material=hm),
              box("HopperL", (0.04, 0.5, 0.2), loc=(-0.33, 0, 0.62), material=hm),
              box("HopperR", (0.04, 0.5, 0.2), loc=(0.33, 0, 0.62), material=hm)]
    parts = [body, base] + hopper
    for j, y in enumerate((-0.06, 0.06)):
        parts.append(cyl(f"Drum{j}", 0.055, 0.56, loc=(-0.28, y, 0.72), material=mat("metal_light", metal=0.85, rough=0.2), verts=12, rot=(0, math.pi / 2, 0)))
        for i in range(8):
            parts.append(box(f"Blade{j}_{i}", (0.02, 0.13, 0.13), loc=(-0.24 + i * 0.07, y, 0.66), material=mat("metal_light", metal=0.9, rough=0.2), rot_z=0.4 * (1 if j else -1)))
    for i in range(6):
        parts.append(box(f"Chevron{i}", (0.1, 0.01, 0.05), loc=(-0.3 + i * 0.12, -0.292, 0.5), material=mat("yellow" if i % 2 else "plastic_black")))
    panel = box("Panel", (0.2, 0.02, 0.14), loc=(0.22, -0.3, 0.22), material=mat("plastic_black"))
    btn = box("Btn", (0.06, 0.03, 0.06), loc=(0.22, -0.31, 0.28), material=mat("red", emit=1.5))
    chute = box("Chute", (0.3, 0.2, 0.04), loc=(-0.2, -0.36, 0.06), material=mat("metal", metal=0.5), bevel=0.005)
    confetti = [box(f"Bit{i}", (0.03, 0.015, 0.005), loc=(-0.32 + (i * 37 % 30) / 100, -0.42 - (i * 13 % 10) / 100, 0.005), material=mat("paper"), rot_z=i * 0.9) for i in range(10)]
    ob = join("shredder_p0_4_mesh", parts + [panel, btn, chute] + confetti)
    parent(ob, root)
    return root


def _crumple(name, x, y, z, r=0.05):
    return ball(name, r, loc=(x, y, z), material=mat("paper", rough=1.0), subdiv=1, scale=(1.1, 0.9, 0.85))


def b_shredder_p1_3():
    """PAPER JAM tier 3: paper sticking out of the slot every which way, a red fault light."""
    root = empty("shredder_p1_3")
    parts, top = _shredder_base("teal")
    for i, (x, rz, rx) in enumerate(((-0.12, 0.3, 0.5), (-0.04, -0.2, -0.4), (0.05, 0.5, 0.3), (0.13, -0.4, -0.6))):
        sheet = box(f"Jam{i}", (0.14, 0.006, 0.16), loc=(x, 0, top), material=mat("paper"), rot_z=rz)
        kit.tilt([sheet], rx=rx, pivot=(x, 0, top))
        parts.append(sheet)
    light = ball("Fault", 0.03, loc=(0.17, -0.12, top + 0.01), material=mat("red", emit=3.0), subdiv=1)
    parts += [light, _crumple("Ball0", -0.26, -0.2, 0.04), _crumple("Ball1", 0.27, -0.12, 0.04), _crumple("Ball2", 0.22, 0.22, 0.04, 0.04)]
    ob = join("shredder_p1_3_mesh", parts)
    parent(ob, root)
    return root


def b_shredder_p1_4():
    """PAPER JAM tier 4, Out of Order: overflowing, a sign taped on, paper everywhere."""
    root = empty("shredder_p1_4")
    parts, top = _shredder_base("teal", w=0.56, d=0.4, h=0.5)
    pile = ball("Overflow", 0.24, loc=(0, 0, top + 0.02), material=mat("paper", rough=1.0), subdiv=2, scale=(1.15, 0.85, 0.55))
    sign = box("Sign", (0.32, 0.012, 0.2), loc=(0, -0.206, 0.18), material=mat("yellow", rough=0.4))
    bar = box("SignText", (0.24, 0.014, 0.035), loc=(0, -0.21, 0.29), material=mat("plastic_black"))
    bar2 = box("SignText2", (0.18, 0.014, 0.03), loc=(0, -0.21, 0.23), material=mat("plastic_black"))
    tape = [box(f"Tape{i}", (0.08, 0.014, 0.025), loc=(x, -0.212, 0.36), material=mat("plastic_white", rough=0.3), rot_z=0.0) for i, x in enumerate((-0.13, 0.13))]
    parts += [pile, sign, bar, bar2] + tape
    for i in range(7):
        a = i * 0.9
        parts.append(box(f"Floor{i}", (0.14, 0.1, 0.006), loc=(math.cos(a) * 0.42, math.sin(a) * 0.36, 0.0), material=mat("paper"), rot_z=a))
    parts += [_crumple("Ball0", -0.36, -0.16, 0.04), _crumple("Ball1", 0.38, 0.06, 0.04), _crumple("Ball2", 0.1, top + 0.18, 0.0, 0.05)]
    ob = join("shredder_p1_4_mesh", parts)
    parent(ob, root)
    return root


def _padlock(x, y, z, s=1.0):
    shackle = cyl("Shackle", 0.03 * s, 0.05 * s, loc=(x, y, z + 0.06 * s), material=mat("metal_light", metal=0.8, rough=0.25), verts=8, radius_top=0.03 * s)
    body = box("Lock", (0.08 * s, 0.03 * s, 0.07 * s), loc=(x, y, z), material=mat("yellow", metal=0.6, rough=0.3), bevel=0.006)
    return [shackle, body]


def b_shredder_p2_3():
    """CONFIDENTIAL tier 3, Compactor: a locked console bin with a red CONFIDENTIAL stamp."""
    root = empty("shredder_p2_3")
    body = box("Console", (0.5, 0.4, 0.62), loc=(0, 0, 0), material=mat("navy", rough=0.5), bevel=0.03)
    top = box("Top", (0.52, 0.42, 0.04), loc=(0, 0, 0.62), material=mat("wood_dark"), bevel=0.01)
    slot = box("Slot", (0.3, 0.06, 0.01), loc=(0, -0.02, 0.66), material=mat("plastic_black"))
    stamp = box("Stamp", (0.34, 0.01, 0.07), loc=(0, -0.205, 0.42), material=mat("red", emit=0.4))
    door = box("Door", (0.4, 0.008, 0.3), loc=(0, -0.204, 0.06), material=mat("charcoal"))
    lock = _padlock(0.12, -0.225, 0.2)
    ob = join("shredder_p2_3_mesh", [body, top, slot, stamp, door] + lock)
    parent(ob, root)
    return root


def b_shredder_p2_4():
    """CONFIDENTIAL tier 4, Document Destruction: a secure cabinet with a beacon and sealed sacks."""
    root = empty("shredder_p2_4")
    body = box("Cabinet", (0.66, 0.5, 0.78), loc=(0, 0, 0), material=mat("charcoal", rough=0.45), bevel=0.03)
    band = box("Band", (0.67, 0.51, 0.08), loc=(0, 0, 0.5), material=mat("red", rough=0.4))
    stamp = box("Secret", (0.36, 0.012, 0.09), loc=(0, -0.255, 0.3), material=mat("red", emit=0.6))
    slot = box("Slot", (0.36, 0.06, 0.01), loc=(-0.08, 0, 0.78), material=mat("plastic_black"))
    beacon_base = cyl("BeaconBase", 0.07, 0.04, loc=(0.2, 0.1, 0.78), material=mat("plastic_black"), verts=12)
    beacon = cyl("Beacon", 0.055, 0.1, loc=(0.2, 0.1, 0.82), material=mat("orange", emit=2.5), verts=12, radius_top=0.045)
    lock = _padlock(0.22, -0.27, 0.12, 1.3)
    keypad = box("Keypad", (0.12, 0.02, 0.16), loc=(-0.2, -0.26, 0.56), material=mat("plastic_black"))
    keys = [box(f"Key{i}", (0.025, 0.01, 0.025), loc=(-0.23 + (i % 3) * 0.03, -0.272, 0.6 + (i // 3) * 0.035), material=mat("screen", emit=1.0)) for i in range(9)]
    sacks = [ball(f"Sack{i}", 0.13, loc=(x, 0.36, 0.11), material=mat("plastic_white", rough=0.7), subdiv=2, scale=(1.0, 0.8, 0.95)) for i, x in enumerate((-0.18, 0.12))]
    ties = [box(f"Tie{i}", (0.05, 0.05, 0.03), loc=(x, 0.36, 0.22), material=mat("red")) for i, x in enumerate((-0.18, 0.12))]
    ob = join("shredder_p2_4_mesh", [body, band, stamp, slot, beacon_base, beacon, keypad] + lock + keys + sacks + ties)
    parent(ob, root)
    return root


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


def b_keyboardsmash_1():
    root = empty("keyboardsmash_1")
    h = 0.42
    parts = side_desk("Desk")
    parts += _monitor(0, 0.18, h, screen_key="red", emit=1.4)
    parts += _keyboard(0, -0.12, h, name="Kb")
    parts += _flying_keys(h)
    ob = join("keyboardsmash_1_mesh", parts)
    parent(ob, root)
    return root


def b_keyboardsmash_2():
    root = empty("keyboardsmash_2")
    h = 0.42
    parts = side_desk("Desk", top="wood_dark")
    parts += _monitor(0, 0.18, h, screen_key="red", emit=1.6)
    parts.append(box("Crack", (0.2, 0.01, 0.006), loc=(0.05, 0.16, h + 0.22), material=mat("plastic_white", emit=1.0), rot_z=0.6))
    parts += _keyboard(0, -0.12, h, w=0.5, d=0.17, rgb=True, name="Kb")
    parts += _flying_keys(h, seed=1)
    ob = join("keyboardsmash_2_mesh", parts)
    parent(ob, root)
    return root


def b_keyboardsmash_3():
    """A huge RGB keyboard on a pedestal, ready to come down on someone."""
    root = empty("keyboardsmash_3")
    base = box("Base", (0.55, 0.5, 0.14), loc=(0, 0, 0), material=mat("charcoal"), bevel=0.02)
    warn = box("Warn", (0.57, 0.01, 0.05), loc=(0, -0.252, 0.05), material=mat("yellow"))
    post = cyl("Post", 0.04, 0.5, loc=(0, 0.05, 0.14), material=mat("metal_light", metal=0.7, rough=0.3), verts=10)
    # The keyboard stands on its long edge, keys to the front.
    slab = box("Slab", (0.7, 0.06, 0.26), loc=(0, 0.05, 0.64), material=mat("plastic_black"), bevel=0.01)
    keys = []
    for r in range(4):
        for c in range(11):
            col = ["red", "orange", "yellow", "plant", "teal", "blue", "pink"][(c + r) % 7]
            keys.append(box(f"BK{r}{c}", (0.05, 0.015, 0.045), loc=(-0.3 + c * 0.06, 0.012, 0.67 + r * 0.055), material=mat(col, rough=0.5, emit=0.7)))
    ob = join("keyboardsmash_3_mesh", [base, warn, post, slab] + keys + _flying_keys(0.2, seed=2))
    parent(ob, root)
    return root


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


def b_chair_1():
    root = empty("chair_1")
    ob = join("chair_1_mesh", _chair("charcoal", "charcoal"))
    parent(ob, root)
    return root


def b_chair_2():
    root = empty("chair_2")
    ob = join("chair_2_mesh", _chair("blue", "navy", arms=True))
    parent(ob, root)
    return root


def b_chair_3():
    root = empty("chair_3")
    ob = join("chair_3_mesh", _chair("plastic_black", "plastic_black", racing=True, s=1.1))
    parent(ob, root)
    return root


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


def b_replyall_1():
    root = empty("replyall_1")
    h = 0.42
    parts = side_desk("Desk")
    parts += _laptop(0, 0.05, h)
    parts += _envelope_fan(0, 0.05, h + 0.25, 3, 1.0)
    ob = join("replyall_1_mesh", parts)
    parent(ob, root)
    return root


def b_replyall_2():
    root = empty("replyall_2")
    h = 0.42
    parts = side_desk("Desk", top="wood_dark")
    parts += _monitor(0, 0.15, h, screen_key="pink", emit=1.2)
    parts += _envelope_fan(0, 0.12, h + 0.42, 5, 1.6, seed=1)
    at = cyl("At", 0.05, 0.02, loc=(0.22, -0.15, h), material=mat("pink", emit=0.8), verts=16)
    ob = join("replyall_2_mesh", parts + [at])
    parent(ob, root)
    return root


def b_replyall_3():
    root = empty("replyall_3")
    h = 0.42
    parts = side_desk("Desk", w=0.86, d=0.74, top="plastic_white")
    parts += _monitor(-0.18, 0.15, h, screen_key="pink", emit=1.4)
    parts += _monitor(0.18, 0.15, h, screen_key="pink", emit=1.4)
    horn = cyl("Megaphone", 0.04, 0.22, loc=(0.0, -0.1, h + 0.12), material=mat("red", rough=0.4), verts=12, radius_top=0.1, rot=(math.pi / 2 + 0.3, 0, 0))
    parts.append(horn)
    parts += _envelope_fan(0, 0.12, h + 0.55, 8, 2.4, seed=2)
    ob = join("replyall_3_mesh", parts)
    parent(ob, root)
    return root


def b_coldcaller():
    s = 1.0
    root, body, hz = person("coldcaller", "teal", "charcoal", "skin_2", "hair_dark", style="short", h=s)
    band = box("Band", (0.28, 0.03, 0.03), loc=(0, 0.01, hz + 0.13), material=mat("plastic_black"))
    cup = ball("Cup", 0.045, loc=(-0.13, 0, hz), material=mat("plastic_black"), subdiv=1)
    mic = box("Mic", (0.02, 0.12, 0.02), loc=(-0.12, -0.08, hz - 0.06), material=mat("plastic_black"))
    badge = box("Badge", (0.06, 0.012, 0.04), loc=(0.08, -0.106, 0.6), material=mat("plastic_white"))
    acc = join("Props", [band, cup, mic, badge])
    parent(acc, root)
    arm = _arm(root, "R")
    arm.rotation_euler[0] = -2.4
    hp = _hand_world(arm, s)
    phone = box("Phone", (0.04, 0.02, 0.12), loc=(hp.x, hp.y, hp.z - 0.04), material=mat("plastic_black"), bevel=0.006)
    _hold(root, "R", s, [phone])
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


def b_delegation_1():
    root = empty("delegation_1")
    h = 0.42
    parts = side_desk("Desk")
    parts += _tray(-0.15, 0.05, h, folders=3, seed=1)
    parts += _tray(-0.15, 0.05, h + 0.12, folders=1, seed=2)
    parts += _tray(0.18, 0.0, h, col="plastic_white", folders=2, seed=3)
    arrow = box("Arrow", (0.18, 0.02, 0.04), loc=(0.02, -0.15, h + 0.02), material=mat("yellow", emit=0.6))
    head = box("ArrowHead", (0.06, 0.02, 0.08), loc=(0.13, -0.15, h + 0.0), material=mat("yellow", emit=0.6), taper=0.1)
    ob = join("delegation_1_mesh", parts + [arrow, head])
    parent(ob, root)
    return root


def b_delegation_2():
    root = empty("delegation_2")
    h = 0.42
    parts = side_desk("Desk", top="wood_dark")
    for k in range(3):
        parts += _tray(-0.15, 0.08, h + k * 0.12, folders=3 - k, seed=4 + k)
    parts += _tray(0.18, 0.05, h, col="plastic_white", folders=3, seed=8)
    stamp = cyl("Stamp", 0.035, 0.08, loc=(0.2, -0.18, h), material=mat("red", rough=0.4), verts=10)
    knob = ball("StampKnob", 0.03, loc=(0.2, -0.18, h + 0.1), material=mat("plastic_black"), subdiv=1)
    ob = join("delegation_2_mesh", parts + [stamp, knob])
    parent(ob, root)
    return root


def b_delegation_3():
    """An org chart in trays: one at the top, passing it down to two, then four."""
    root = empty("delegation_3")
    base = box("Base", (0.8, 0.5, 0.1), loc=(0, 0, 0), material=mat("charcoal"), bevel=0.02)
    pole = box("Pole", (0.05, 0.05, 1.0), loc=(0, 0.15, 0.1), material=mat("metal_light", metal=0.6, rough=0.3))
    parts = [base, pole]
    rows = [(1, 1.05), (2, 0.75), (4, 0.45)]
    for r, (n, z) in enumerate(rows):
        for i in range(n):
            x = (i - (n - 1) / 2) * 0.22
            parts += _tray(x, 0.05, z, col=["yellow", "plastic_white", "charcoal"][r], folders=2, seed=10 + r * 4 + i)
        if r > 0:
            parts.append(box(f"Bar{r}", (0.22 * n, 0.03, 0.02), loc=(0, 0.06, z + 0.2), material=mat("metal_light", metal=0.6)))
    ob = join("delegation_3_mesh", parts)
    parent(ob, root)
    return root


def b_phonecaller():
    s = 1.0
    root, body, hz = person("phonecaller", "orange", "denim", "skin_3", "hair_brown", style="side", h=s)
    tie = box("Tie", (0.035, 0.014, 0.15), loc=(0, -0.108, 0.5), material=mat("navy"), taper=0.6)
    acc = join("Props", [tie])
    parent(acc, root)
    arm = _arm(root, "R")
    arm.rotation_euler[0] = -2.5
    hp = _hand_world(arm, s)
    handset = box("Handset", (0.05, 0.05, 0.16), loc=(hp.x, hp.y, hp.z - 0.06), material=mat("plastic_black"), bevel=0.01)
    _hold(root, "R", s, [handset])
    hl = _hand_world(_arm(root, "L"), s)
    phone = box("DeskPhone", (0.14, 0.12, 0.06), loc=(hl.x, hl.y - 0.04, hl.z - 0.08), material=mat("plastic_black"), bevel=0.01)
    pad = box("Keypad", (0.08, 0.06, 0.005), loc=(hl.x, hl.y - 0.06, hl.z - 0.019), material=mat("plastic_white"))
    _hold(root, "L", s, [phone, pad])
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
    hood = box("HeatHood", (1.0, 0.3, 0.06), loc=(0, 0.3, 1.55), material=mat("metal", metal=0.6, rough=0.3))
    glow = box("HeatGlow", (0.8, 0.2, 0.02), loc=(0, 0.3, 1.53), material=mat("red", emit=1.6))
    back = box("Back", (1.0, 0.05, 1.6), loc=(0, 0.45, 0), material=mat("metal_light", metal=0.4, rough=0.5))
    ob = join("serving_counter_mesh", [counter, top, rail, pan, food, guard, hood, glow, back])
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
    "thumbtacks_1": b_thumbtacks_1,
    "thumbtacks_2": b_thumbtacks_2,
    "thumbtacks_3": b_thumbtacks_3,
    "selfservice_1": b_selfservice_1,
    "selfservice_2": b_selfservice_2,
    "selfservice_3": b_selfservice_3,
    "impersonator": b_impersonator,
    "cleaner": b_cleaner,
    "food_counter": b_food_counter,
    "canteen_table": b_canteen_table,
    "wet_floor": b_wet_floor,
    "shredder_p0_3": b_shredder_p0_3,
    "shredder_p0_4": b_shredder_p0_4,
    "shredder_p1_3": b_shredder_p1_3,
    "shredder_p1_4": b_shredder_p1_4,
    "shredder_p2_3": b_shredder_p2_3,
    "shredder_p2_4": b_shredder_p2_4,
    "fridge": b_fridge,
    "kitchen_counter": b_kitchen_counter,
    "high_table": b_high_table,
    "kitchen_table": b_kitchen_table,
    "recycle_bins": b_recycle_bins,
    "keyboardsmash_1": b_keyboardsmash_1,
    "keyboardsmash_2": b_keyboardsmash_2,
    "keyboardsmash_3": b_keyboardsmash_3,
    "chair_1": b_chair_1,
    "chair_2": b_chair_2,
    "chair_3": b_chair_3,
    "keyboard_barrier": b_keyboard_barrier,
    "linemanager": b_linemanager,
    "boardroom_table": b_boardroom_table,
    "sideboard": b_sideboard,
    "replyall_1": b_replyall_1,
    "replyall_2": b_replyall_2,
    "replyall_3": b_replyall_3,
    "coldcaller": b_coldcaller,
    "baby": b_baby,
    "sofa": b_sofa,
    "tv_stand": b_tv_stand,
    "bed": b_bed,
    "bookshelf": b_bookshelf,
    "cat": b_cat,
    "delegation_1": b_delegation_1,
    "delegation_2": b_delegation_2,
    "delegation_3": b_delegation_3,
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

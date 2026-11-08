// Written by art/blender/projector_ui.py: where each port sits in public/ui/projector_*.png,
// as fractions of the picture (centre x/y, width/height, top-left origin). Do not edit by hand.

export const PROJECTOR_SIZE = { w: 720, h: 450 };

export const PROJECTOR_PORTS = {
  vga: { x: 0.6061, y: 0.6710, w: 0.1027, h: 0.1173 },
  pwr: { x: 0.7550, y: 0.6126, w: 0.0616, h: 0.1083 },
  hdmi: { x: 0.6882, y: 0.6324, w: 0.0462, h: 0.0524 },
};

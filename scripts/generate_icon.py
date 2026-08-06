"""One-off placeholder artwork generator for Blox Creator (Phase 13).

Draws a simple abstract "stacked GLSL blocks" mark at 1024x1024, later fed to
`tauri icon` to produce the full multi-resolution icon set. Replace this
source artwork (and re-run `npx tauri icon scripts/app-icon-source.png`)
whenever real branding is available.
"""

from PIL import Image, ImageDraw

SIZE = 1024
BG = (30, 30, 30, 255)          # matches --bg-app in theme-dark.css
BLOCK_A = (14, 99, 156, 255)    # --accent
BLOCK_B = (17, 119, 187, 255)   # --accent-hover
BLOCK_C = (244, 135, 113, 255)  # --error, used here purely as an accent pop

img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

corner = SIZE * 0.22
draw.rounded_rectangle([0, 0, SIZE, SIZE], radius=corner, fill=BG)


def block(cx, cy, size, color, rotation_offset=0):
    half = size / 2
    rect = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    rect_draw = ImageDraw.Draw(rect)
    rect_draw.rounded_rectangle(
        [0, 0, size, size], radius=size * 0.18, fill=color
    )
    img.alpha_composite(rect, (int(cx - half), int(cy - half)))


block_size = SIZE * 0.40
block(SIZE * 0.36, SIZE * 0.40, int(block_size), BLOCK_A)
block(SIZE * 0.64, SIZE * 0.40, int(block_size), BLOCK_B)
block(SIZE * 0.50, SIZE * 0.66, int(block_size), BLOCK_C)

img.save("scripts/app-icon-source.png")
print("saved scripts/app-icon-source.png")

"""Generates the Rabati fortress silhouette used by index.html (hero scene and
the opening card's line sketch). The shapes are emitted as <symbol>s with no
fill of their own, so one geometry serves both: filled stone in the hero,
a gold outline on the envelope card.

    python3 tools/rabati_svg.py            # rewrites the block in index.html

Everything sits in a 1200x320 box, ground line around y=290."""
import pathlib, re

def crenel(x0, x1, top, bottom, h=9, w=8, gap=6):
    """Rectangle whose top edge is a row of merlons, evenly spread so the
    row always starts and ends on a merlon."""
    n = max(2, int((x1 - x0 + gap) // (w + gap)))
    g = (x1 - x0 - n * w) / (n - 1)
    d = [f"M{x0} {bottom}", f"V{top}"]
    x = x0
    for i in range(n):
        x += w
        d.append(f"H{x:.1f}")
        if i < n - 1:
            d.append(f"V{top + h}")
            x += g
            d.append(f"H{x:.1f}")
            d.append(f"V{top}")
    d.append(f"V{bottom}Z")
    return "".join(d)

def rect(x, y, w, h):
    return f"M{x} {y}h{w}v{h}h{-w}Z"

def arch(x, y, w, h):
    r = w / 2
    return f"M{x} {y + h}V{y + r}a{r} {r} 0 0 1 {w} 0V{y + h}Z"

body = [
    crenel(200, 292, 238, 296, w=7, gap=6),          # outer west wall
    crenel(280, 960, 213, 296),                       # main curtain wall
    crenel(292, 338, 166, 296, w=7, gap=5),           # west tower
    rect(382, 190, 76, 106),                          # church nave
    "M376 192L420 168L464 192Z",                      # gable
    rect(408, 148, 24, 26),                           # drum
    "M404 150L420 120L436 150Z",                      # conical roof
    rect(419, 103, 2, 18), rect(414, 109, 12, 2),     # cross
    rect(520, 108, 64, 188),                          # Jakeli keep
    rect(514, 100, 76, 10),                           # corbelled parapet
    crenel(514, 590, 90, 101, h=10, w=8, gap=6),
    rect(584, 172, 92, 124),                          # palace
    rect(580, 166, 100, 8),
    rect(680, 176, 106, 120),                         # mosque hall
    rect(700, 158, 64, 20),                           # dome drum
    rect(800, 98, 14, 198),                           # minaret shaft
    rect(794, 128, 26, 6), rect(796, 100, 22, 4),
    crenel(880, 930, 160, 296, w=7, gap=5),           # east tower
    crenel(930, 1040, 238, 296, w=7, gap=6),          # east wall, stepping down
]
dome = [
    "M696 160C698 116 766 116 768 160Z",
    "M798 100L807 64L816 100Z",
    rect(731, 100, 2, 18),
]
windows = [
    rect(536, 128, 6, 14), rect(562, 128, 6, 14), rect(549, 170, 6, 16),
    rect(536, 214, 6, 14), rect(562, 214, 6, 14), rect(549, 252, 6, 14),
    rect(312, 194, 5, 12), rect(312, 236, 5, 12),
    rect(418, 156, 4, 10), arch(415, 208, 10, 18),
    arch(594, 186, 12, 24), arch(616, 186, 12, 24), arch(638, 186, 12, 24), arch(660, 186, 12, 24),
    arch(694, 196, 9, 18), arch(716, 196, 9, 18), arch(740, 196, 9, 18), arch(762, 196, 9, 18),
    rect(712, 164, 5, 9), rect(729, 164, 5, 9), rect(746, 164, 5, 9),
    rect(805, 150, 4, 10), rect(805, 184, 4, 10),
    rect(902, 186, 5, 12), rect(902, 222, 5, 12),
]
# Old-town roofs in the foreground, both sides of the hill.
town = []
for x, w, h in [(30, 46, 30), (70, 40, 22), (112, 54, 34), (160, 44, 24),
                (1010, 50, 28), (1056, 42, 20), (1094, 56, 32), (1146, 48, 24)]:
    y = 300 - h
    town.append(f"M{x} 320V{y}L{x + w / 2:.0f} {y - 14}L{x + w} {y}V320Z")

def symbol(id_, paths):
    return f'<symbol id="{id_}" viewBox="0 0 1200 320"><path d="{"".join(paths)}"/></symbol>'

block = "\n".join([
    symbol("rb-body", body),
    symbol("rb-dome", dome),
    symbol("rb-windows", windows),
    symbol("rb-town", town),
])

if __name__ == "__main__":
    page = pathlib.Path(__file__).resolve().parent.parent / "index.html"
    html = page.read_text(encoding="utf-8")
    html, n = re.subn(r"(<!-- RABATI:BEGIN -->).*?(<!-- RABATI:END -->)",
                      lambda m: m.group(1) + "\n" + block + "\n" + m.group(2), html, flags=re.S)
    if not n:
        raise SystemExit("RABATI markers not found in index.html")
    page.write_text(html, encoding="utf-8")
    print("updated", page)

"""Découpe une grande image en tuiles WebP 256 px pour Leaflet (CRS.Simple)."""
import math, os, sys
from PIL import Image
Image.MAX_IMAGE_PIXELS = None

src, dest, zmax = sys.argv[1], sys.argv[2], int(sys.argv[3])
FOND = (26, 22, 17)  # couleur du fond de la carte sur le site : les bords des tuiles s y fondent
im = Image.open(src).convert("RGB")
W, H = im.size
nb = taille = 0
for z in range(zmax, -1, -1):
    f = 2 ** (zmax - z)
    img = im if f == 1 else im.resize((math.ceil(W / f), math.ceil(H / f)), Image.LANCZOS)
    w, h = img.size
    for tx in range(math.ceil(w / 256)):
        for ty in range(math.ceil(h / 256)):
            t = Image.new("RGB", (256, 256), FOND)
            t.paste(img.crop((tx * 256, ty * 256, min(w, tx * 256 + 256), min(h, ty * 256 + 256))), (0, 0))
            os.makedirs(f"{dest}/{z}/{tx}", exist_ok=True)
            chemin = f"{dest}/{z}/{tx}/{ty}.webp"
            t.save(chemin, "WEBP", quality=74, method=6)
            nb += 1; taille += os.path.getsize(chemin)
print(src, W, H, "tuiles", nb, round(taille / 1e6, 1), "Mo")

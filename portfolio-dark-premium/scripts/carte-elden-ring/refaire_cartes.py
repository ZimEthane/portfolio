"""Refait les cartes des chapitres à partir de la grande carte du jeu, sur la même emprise (les repères restent alignés)."""
import config
import json, os
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
SRC = {"surface": os.path.join(config.DOSSIER, "carte-surface.jpg"), "souterrain": os.path.join(config.DOSSIER, "carte-souterrain.jpg")}
DEST = "public/guides/elden-ring/img/cartes/"
cal = json.load(open("scripts/carte-elden-ring/calage-cartes.json"))
grandes = {k: Image.open(v).convert("RGB") for k, v in SRC.items()}
for nom, c in sorted(cal.items()):
    (a, b, tx), (cc, d, ty) = c["M"]
    w, h = c["taille"]
    s = c["echelle"]
    k = max(1.0, min(s, 2.2))
    boite = (tx, ty, tx + w * s, ty + h * s)
    img = grandes[c["carte"]].crop(tuple(round(v) for v in boite)).resize((round(w * k), round(h * k)), Image.LANCZOS)
    img.save(DEST + nom, "WEBP", quality=86, method=6)
    print(nom, img.size, round(os.path.getsize(DEST + nom) / 1024), "Ko")

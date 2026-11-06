"""Vignettes des donjons centrées sur leur vraie position (données du jeu), pour les fiches du guide."""
import config
import json
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
P = "public/guides/elden-ring/"
d = json.load(open(P + "carte/donnees.json"))["marqueurs"]
lieux = {m["f"]: m for m in d if m["c"] == "lieux" and m.get("f")}
grandes = {0: Image.open(os.path.join(config.DOSSIER, "carte-surface.jpg")).convert("RGB"),
           1: Image.open(os.path.join(config.DOSSIER, "carte-souterrain.jpg")).convert("RGB")}
FEN = 640  # mètres autour du donjon
for did, m in sorted(lieux.items()):
    x, y = m["x"], m["y"]
    c = grandes[m["s"]].crop((round(x - FEN / 2), round(y - FEN / 2), round(x + FEN / 2), round(y + FEN / 2)))
    c.resize((440, 440), Image.LANCZOS).save(f"{P}img/donjons/grand/{did}.webp", "WEBP", quality=86, method=6)
    c.resize((240, 240), Image.LANCZOS).save(f"{P}img/donjons/{did}.webp", "WEBP", quality=84, method=6)
print(len(lieux), "donjons")

"""Retrouve l'emprise de chaque ancienne carte de chapitre dans la grande carte du jeu (SIFT + RANSAC)."""
import config
import cv2, numpy as np, json, glob, os
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
ECH = 0.25
cartes = {}
for nom, f in [("surface", os.path.join(config.DOSSIER, "carte-surface.jpg")), ("souterrain", os.path.join(config.DOSSIER, "carte-souterrain.jpg"))]:
    im = Image.open(f).convert("L"); im = im.resize((int(im.width * ECH), int(im.height * ECH)), Image.LANCZOS)
    a = np.asarray(im)
    sift = cv2.SIFT_create(nfeatures=60000)
    kp, de = sift.detectAndCompute(a, None)
    cartes[nom] = (kp, de)
    print(nom, len(kp))
res = {}
sift = cv2.SIFT_create(nfeatures=8000)
bf = cv2.BFMatcher(cv2.NORM_L2)
for f in sorted(glob.glob("public/guides/elden-ring/img/cartes/carte-*.webp")):
    im = np.asarray(Image.open(f).convert("L"))
    best = None
    for nom, (kp2, de2) in cartes.items():
        for s in (1.0, 0.5):
            a = cv2.resize(im, None, fx=s, fy=s, interpolation=cv2.INTER_AREA) if s != 1 else im
            kp1, de1 = sift.detectAndCompute(a, None)
            m = bf.knnMatch(de1, de2, k=2)
            bons = [x for x, y in m if x.distance < 0.75 * y.distance]
            if len(bons) < 8:
                continue
            p1 = np.float32([kp1[x.queryIdx].pt for x in bons]) / s
            p2 = np.float32([kp2[x.trainIdx].pt for x in bons]) / ECH
            M, inl = cv2.estimateAffinePartial2D(p1, p2, method=cv2.RANSAC, ransacReprojThreshold=12, maxIters=5000)
            n = int(inl.sum()) if inl is not None else 0
            if M is not None and (best is None or n > best[0]):
                best = (n, nom, M, len(bons))
    n, nom, M, nb = best
    echelle = float(np.hypot(M[0, 0], M[1, 0])); rot = float(np.degrees(np.arctan2(M[1, 0], M[0, 0])))
    w, h = Image.open(f).size
    coins = (M @ np.array([[0, 0, 1], [w, 0, 1], [0, h, 1], [w, h, 1]]).T).T
    res[os.path.basename(f)] = {"carte": nom, "M": M.tolist(), "inliers": n, "matches": nb, "echelle": echelle, "rotation": rot, "taille": [w, h], "coins": coins.round(1).tolist()}
    print(os.path.basename(f), nom, "inliers", n, "/", nb, "échelle", round(echelle, 3), "m/px rot", round(rot, 2), "origine", coins[0].round(0))
json.dump(res, open("scripts/carte-elden-ring/calage-cartes.json", "w"), indent=1)

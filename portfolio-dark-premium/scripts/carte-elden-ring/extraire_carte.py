"""Construit les données de la carte interactive à partir des fichiers du jeu.

Sources : regulation.bin (params), msg/frafr (noms français), map/mapstudio (MSB), données ERDB 1.10.
Sortie : carte.json (marqueurs) + liste des icônes utilisées.
"""
import collections, glob, json, math, os, re, struct, sys, unicodedata
import monde, msb, paramdef, textes
from bs4 import BeautifulSoup

P = monde.P
import config
JEU = os.path.join(config.JEU, "map", "mapstudio") + "/"
ERDB = config.ERDB + "/"
GUIDE = config.GUIDE
ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
SORTIE = ARGS[0] if ARGS else os.path.join(config.DOSSIER, "carte.json")

# Calage des deux images (1 pixel = 1 mètre), voir les essais de superposition des grâces.
CALAGE = {0: (7083, 16514), 1: (7595, 14978)}  # couche → (X0, Z0) ; px = X - X0, py = Z0 - Z
TAILLE = {0: (9728, 9216), 1: (6400, 6912)}

def lire(f, d):
    return paramdef.lire(P, f, d)[0]

NPC = lire("NpcParam.param", "NpcParam")
LOT_MAP = lire("ItemLotParam_map.param", "ItemLotParam")
LOT_ENN = lire("ItemLotParam_enemy.param", "ItemLotParam")
GRACES = lire("BonfireWarpParam.param", "BonfireWarpParam")
POINTS = lire("WorldMapPointParam.param", "WorldMapPointParam")

LIEUX = textes.fmg("PlaceName")
PNJ_NOMS = textes.fmg("NpcName")
PNJ_EN = textes.fmg("NpcName", "engus")
LIEUX_EN = textes.fmg("PlaceName", "engus")
PNJ_EN_PAR_FR = {}
FMG_CAT = {1: "GoodsName", 2: "WeaponName", 3: "ProtectorName", 4: "AccessoryName", 5: "GemName"}

def nom_objet(cat, iid):
    t = textes.fmg(FMG_CAT.get(cat, "GoodsName"))
    if iid in t:
        return t[iid]
    if cat == 2 and iid - iid % 100 in t:
        return t[iid - iid % 100]
    return None

# ---------- Catégories ERDB (pour classer et trouver l'icône) ----------
ERDB_PAR_ID = {}
for fichier in glob.glob(ERDB + "*.json"):
    dossier = os.path.basename(fichier)[:-5]
    d = json.load(open(fichier))
    if not isinstance(d, dict):
        continue
    for v in d.values():
        if isinstance(v, dict) and "id" in v:
            ERDB_PAR_ID[(dossier, v["id"])] = v

DOSSIERS = {1: ["bolstering-materials", "keys", "info", "shop", "spells", "spirit-ashes", "tools", "crafting-materials", "gestures"],
            2: ["armaments", "ammo"], 3: ["armor"], 4: ["talismans"], 5: ["ashes-of-war"]}

def fiche_erdb(cat, iid):
    for dossier in DOSSIERS.get(cat, []):
        for cle in (iid, iid - iid % 100, iid - iid % 10000):
            v = ERDB_PAR_ID.get((dossier, cle))
            if v:
                return dossier, v
    return None, None

def categorie(cat, iid, nom):
    dossier, v = fiche_erdb(cat, iid)
    sous = (v or {}).get("category") or ""
    if cat == 2:
        return "munitions" if dossier == "ammo" else "armes"
    if cat == 3:
        return "armures"
    if cat == 4:
        return "talismans"
    if cat == 5:
        return "cendres-guerre"
    if iid in (10010, 10020):
        return "graines-larmes"
    if dossier == "bolstering-materials":
        return "pierres-forge" if "Smithing" in (v or {}).get("name", "") or "Somber" in (v or {}).get("name", "") else "materiaux"
    if dossier == "spells":
        return "sorts"
    if dossier == "spirit-ashes":
        return "cendres-spirituelles"
    if dossier in ("keys", "info"):
        return "objets-cles"
    if dossier == "shop":
        return "objets-cles" if sous in ("Bell Bearing", "Cookbook", "Spellbook", "Whetblade", "Map") or "Bell Bearing" in (v or {}).get("name", "") else "objets-cles"
    if dossier == "crafting-materials":
        return "materiaux"
    if dossier == "gestures":
        return "objets-cles"
    if dossier == "tools":
        n = (v or {}).get("name", "")
        if sous == "Crystal Tear" or "Crystal Tear" in n or "Cracked Tear" in n or "Hidden Tear" in n or "Bubbletear" in n or n.endswith(" Tear"):
            return "larmes"
        if "Rune" in n and ("Golden" in n or "Lord's" in n or "Hero's" in n or "Numen" in n):
            return "runes"
        return "consommables"
    # inconnu d'ERDB (ajouts DLC ou objets sans fiche) : on devine par le nom
    if nom and re.match(r"Pierre de forge|Pierre sombre", nom):
        return "pierres-forge"
    if nom and nom.startswith("Rune"):
        return "runes"
    return "consommables"

ICONES = {}  # "dossier/icone" utilisés

def icone(cat, iid):
    dossier, v = fiche_erdb(cat, iid)
    if v and v.get("icon") is not None:
        ref = f"{dossier}/{v['icon']}"
        ICONES[ref] = True
        return ref
    return None

LOTS_UTILISES = set()
LIEUX_OBJETS = collections.defaultdict(list)  # "cat:id" → repères où on trouve l'objet

def cle_objet(cat, iid):
    return f"{cat}:{iid - iid % 100 if cat == 2 and iid < 50000000 else iid}"

def noter(mid, objets):
    for cat, iid, _n, _q in objets:
        k = cle_objet(cat, iid)
        if mid not in LIEUX_OBJETS[k]:
            LIEUX_OBJETS[k].append(mid)

def lots(table, lid):
    """Objets donnés par un lot et ses lots enchaînés (lid, lid+1, …)."""
    res, drapeaux = [], []
    if lid is None or lid <= 0:
        return res, drapeaux
    for k in range(10):
        r = table.get(lid + k)
        if not r:
            if k == 0:
                continue
            break
        LOTS_UTILISES.add((id(table), lid + k))
        for i in range(1, 9):
            iid, cat = r.get(f"lotItemId0{i}", 0), r.get(f"lotItemCategory0{i}", 0)
            if iid > 0 and cat in FMG_CAT:
                n = nom_objet(cat, iid)
                if n:
                    res.append((cat, iid, n, max(1, r.get(f"lotItemNum0{i}", 1))))
        if r.get("getItemFlagId"):
            drapeaux.append(r["getItemFlagId"])
    return res, drapeaux

# ---------- Coordonnées ----------
def couche_de(aire):
    return 1 if aire == 12 else 0

def global_msb(nom, x, y, z):
    m = re.match(r"m(\d\d)_(\d\d)_(\d\d)_(\d\d)", nom)
    aire, bx, bz, suf = (int(v) for v in m.groups())
    if aire == 60:
        taille = {0: 256, 1: 512, 2: 1024}[suf % 10]
        decal = {256: 0, 512: 128, 1024: 384}[taille]
        return aire, bx * taille + decal + x, bz * taille + decal + z
    g = monde.vers_global(aire, bx, bz, x, y, z)
    return (g[0], g[1], g[3]) if g else None

def pixel(couche, X, Z):
    x0, z0 = CALAGE[couche]
    return round(X - x0, 1), round(z0 - Z, 1)

def dans_image(couche, px, py):
    w, h = TAILLE[couche]
    return 0 <= px < w and 0 <= py < h

# ---------- Lecture des MSB ----------
def s16(b, o):
    return msb._s16(b, o + struct.unpack_from("<q", b, o)[0])

TRESORS, ENNEMIS = [], []
for chemin in sorted(glob.glob(JEU + "*.msb")):
    nom = os.path.basename(chemin)[:-4]
    if nom.endswith("_99"):
        continue
    aire = int(nom[1:3])
    b = open(chemin, "rb").read()
    L = msb.listes(b)
    modeles = [s16(b, o) for o in L["MODEL_PARAM_ST"]]
    parties = []
    for o in L["PARTS_PARAM_ST"]:
        typ, _, imod = struct.unpack_from("<iii", b, o + 0xC)
        pos = struct.unpack_from("<3f", b, o + 0x20)
        offs = struct.unpack_from("<4q", b, o + 0x50)
        npc = talk = -1
        if typ == 2 and offs[3]:
            _, _, think, npc, talk = struct.unpack_from("<5i", b, o + offs[3])
        parties.append((s16(b, o), typ, modeles[imod] if 0 <= imod < len(modeles) else "", pos, npc, talk))
    for o in L["EVENT_PARAM_ST"]:
        typ = struct.unpack_from("<i", b, o + 0xC)[0]
        if typ != 4:
            continue
        bo, to = struct.unpack_from("<qq", b, o + 0x18)
        _, _, ipart, _, lot = struct.unpack_from("<5i", b, o + to)
        if lot <= 0 or not (0 <= ipart < len(parties)):
            continue
        p = parties[ipart]
        TRESORS.append((nom, aire, lot, p[0], p[2], p[3]))
    for p in parties:
        if p[1] == 2 and p[4] > 0:
            ENNEMIS.append((nom, aire, p[0], p[3], p[4], p[5]))
print("trésors", len(TRESORS), "ennemis", len(ENNEMIS), file=sys.stderr)

# ---------- Grâces ----------
marqueurs = []
graces_couche = {0: [], 1: []}
for gid, r in GRACES.items():
    n = LIEUX.get(r["textId1"])
    if not n:
        continue
    g = monde.vers_global(r["areaNo"], r["gridXNo"], r["gridZNo"], r["posX"], r["posY"], r["posZ"])
    if not g or g[0] != 60:
        continue
    c = couche_de(r["areaNo"])
    px, py = pixel(c, g[1], g[3])
    if not dans_image(c, px, py):
        continue
    marqueurs.append({"id": f"g{gid}", "c": "graces", "n": n, "en": LIEUX_EN.get(r["textId1"]), "s": c, "x": px, "y": py})
    graces_couche[c].append((px, py, n))

def grace_proche(c, px, py):
    best = min(graces_couche[c], key=lambda g: (g[0] - px) ** 2 + (g[1] - py) ** 2, default=None)
    return best[2] if best else ""

# ---------- Lieux de la carte (donjons, repères) ----------
for pid, r in POINTS.items():
    n = LIEUX.get(r.get("textId1", -1))
    if not n:
        continue
    g = monde.vers_global(r["areaNo"], r["gridXNo"], r["gridZNo"], r["posX"], r["posY"], r["posZ"])
    if not g or g[0] != 60:
        continue
    c = couche_de(r["areaNo"])
    px, py = pixel(c, g[1], g[3])
    if not dans_image(c, px, py):
        continue
    marqueurs.append({"id": f"p{pid}", "c": "lieux", "n": n, "en": LIEUX_EN.get(r["textId1"]), "s": c, "x": px, "y": py, "ic": r.get("iconId")})

# ---------- Objets posés dans le monde ----------
vus = set()
for nom_msb, aire, lot, partie, modele, pos in TRESORS:
    objets, drapeaux = lots(LOT_MAP, lot)
    if not objets:
        continue
    g = global_msb(nom_msb, *pos)
    if not g or g[0] != 60:
        continue
    c = couche_de(aire)
    px, py = pixel(c, g[1], g[2])
    if not dans_image(c, px, py):
        continue
    cle = drapeaux[0] if drapeaux else lot
    if cle in vus:
        continue
    vus.add(cle)
    principal = objets[0]
    contenant = "Coffre" if modele.startswith(("AEG099_630", "AEG099_631", "AEG099_632", "AEG099_633")) else ""
    noter(f"o{cle}", objets)
    marqueurs.append({
        "id": f"o{cle}", "c": categorie(principal[0], principal[1], principal[2]), "n": principal[2], "s": c, "x": px, "y": py,
        "q": principal[3] if principal[3] > 1 else None, "k": cle_objet(principal[0], principal[1]),
        "ico": icone(principal[0], principal[1]),
        "plus": [f"{o[2]}" + (f" ×{o[3]}" if o[3] > 1 else "") for o in objets[1:]] or None,
        "d": contenant or None, "_msb": nom_msb,
    })

# ---------- Boss (noms du bestiaire du guide) et butins garantis ----------
soupe = BeautifulSoup(open(GUIDE, encoding="utf-8").read(), "html.parser")
def norme(t):
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", t).strip()

boss_guide = {}
for carte in soupe.select("article.bcard[id]"):
    h3 = carte.select_one("h3")
    if h3:
        boss_guide[norme(h3.get_text(" ", strip=True))] = (carte["id"], h3.get_text(" ", strip=True))
donjons_guide = {}
for carte in soupe.select("article.dcard[id]"):
    h3 = carte.select_one("h3")
    if h3:
        donjons_guide[norme(h3.get_text(" ", strip=True))] = carte["id"]

# Noms des lignes de NpcParam (Paramdex, noms communautaires) : servent seulement à reconnaître les boss.
LIGNES = {}
for l in open(os.path.join(config.PARAMDEX, "Names", "NpcParam.txt"), encoding="utf-8"):
    p = l.rstrip("\n").split(" ", 1)
    if len(p) == 2 and p[0].isdigit():
        LIGNES[int(p[0])] = p[1]

ALIAS = {"abductor virgin": "Abductor Virgins", "carian knight bols": "Bols, Carian Knight", "death bird": "Deathbird",
         "fell twin": "Fell Twins", "fia s champion 1": "Fia's Champions", "lionel the lionhearted": "Fia's Champions",
         "frenzied grave warden duelist": "Frenzied Duelist", "godskin apostle": None, "maliketh": "Maliketh, the Black Blade",
         "beast clergyman": "Maliketh, the Black Blade", "putrid crystalian": "Putrid Crystalian Trio",
         "putrid erdtree avatar": "Putrid Avatar", "valiant gargoyle": "Valiant Gargoyles (duo)",
         "dragonkin soldier of nokstella healthbar": "Dragonkin Soldier", "tree sentinel torch": "Tree Sentinel",
         "god devouring serpent": "Rykard, Lord of Blasphemy", "malformed stars": "Astel, Stars of Darkness"}

def base_ligne(n):
    if "{Godskin Duo" in n:
        return norme("Godskin Duo")
    n = re.sub(r"\s*(\(.*?\)|\[.*?\]|\{.*)", "", n)
    n = re.sub(r"\s+-\s+.*$", "", n)
    b = norme(n)
    if b in ALIAS and ALIAS[b]:
        return norme(ALIAS[b])
    return b

def parties_guide(g):
    return {norme(x) for x in re.split(r"\s*(?:&|/|\(|\))\s*", g) if norme(x)}

GUIDE_PARTIES = {cle: parties_guide(nom) for cle, (bid, nom) in boss_guide.items()}

def boss_pour(npc_id):
    base = base_ligne(LIGNES.get(npc_id, ""))
    if not base:
        return None
    if base in boss_guide:
        return base
    for cle, parts in GUIDE_PARTIES.items():
        if base in parts:
            return cle
    return None

instances = collections.Counter(base_ligne(LIGNES.get(e[4], "")) for e in ENNEMIS)
boss_places, autres_boss, pnj_places = collections.defaultdict(list), collections.defaultdict(list), collections.defaultdict(list)
for nom_msb, aire, partie, pos, npc_id, talk in ENNEMIS:
    r = NPC.get(npc_id)
    if not r:
        continue
    est_boss = r.get("isSoulGetByBoss") == 1
    cle = boss_pour(npc_id)
    if not est_boss and not (cle and instances[base_ligne(LIGNES.get(npc_id, ""))] <= 3):
        if r.get("nameId", -1) > 0 and talk not in (-1, 0) and PNJ_NOMS.get(r["nameId"]):
            g = global_msb(nom_msb, *pos)
            if g and g[0] == 60:
                c = couche_de(aire)
                px, py = pixel(c, g[1], g[2])
                if dans_image(c, px, py):
                    pnj_places[PNJ_NOMS[r["nameId"]]].append((c, px, py))
                    PNJ_EN_PAR_FR[PNJ_NOMS[r["nameId"]]] = PNJ_EN.get(r["nameId"], "")
        continue
    g = global_msb(nom_msb, *pos)
    if not g or g[0] != 60:
        continue
    c = couche_de(aire)
    px, py = pixel(c, g[1], g[2])
    if not dans_image(c, px, py):
        continue
    if cle:
        boss_places[cle].append((c, px, py, npc_id, nom_msb))
    else:
        autres_boss[LIGNES.get(npc_id, "?")].append((c, px, py, npc_id))

# « Malformed Stars » sert aux deux Astel : celui du souterrain est Astel, Naturalborn of the Void.
_etoiles, _ne = norme("Astel, Stars of Darkness"), norme("Astel, Naturalborn of the Void")
if _etoiles in boss_places and _ne in boss_guide:
    boss_places[_ne] += [p for p in boss_places[_etoiles] if p[0] == 1]
    boss_places[_etoiles] = [p for p in boss_places[_etoiles] if p[0] == 0]

def regrouper(lieux, rayon=60):
    """Un seul point par emplacement (le même boss est souvent posé plusieurs fois)."""
    res = []
    for l in lieux:
        if all(l[0] != r[0] or math.hypot(l[1] - r[1], l[2] - r[2]) > rayon for r in res):
            res.append(l)
    return res

def butin(npc_id):
    objets, _ = lots(LOT_MAP, NPC[npc_id].get("itemLotId_map", -1))
    return [o[2] for o in objets] or None

for cle, places in boss_places.items():
    bid, nom = boss_guide[cle]
    for k, (c, px, py, npc_id, nom_msb) in enumerate(regrouper(places)):
        marqueurs.append({"id": f"{bid}" + (f"-{k}" if k else ""), "c": "boss", "n": nom, "s": c, "x": px, "y": py, "f": bid, "plus": butin(npc_id), "_msb": nom_msb})
# Boss sans ligne reconnue : on les place sur le donjon que leur fiche cite.
lieu_de = {m["f"]: m for m in marqueurs if m["c"] == "lieux" and m.get("f")}
for carte in soupe.select("article.bcard[id]"):
    cle = norme(carte.select_one("h3").get_text(" ", strip=True))
    if cle in boss_places:
        continue
    for a in carte.select("a[href]"):
        d = a["href"].split("/")[-1]
        if d in lieu_de:
            l = lieu_de[d]
            marqueurs.append({"id": carte["id"], "c": "boss", "n": boss_guide[cle][1], "s": l["s"], "x": l["x"], "y": l["y"] + 18, "f": carte["id"]})
            boss_places[cle] = []
            break

for nom, places in pnj_places.items():
    for k, (c, px, py) in enumerate(regrouper(places, 40)):
        marqueurs.append({"id": f"n{norme(nom).replace(' ', '-')}-{k}", "c": "pnj", "n": nom, "en": PNJ_EN_PAR_FR.get(nom), "s": c, "x": px, "y": py})

# Objets lâchés une seule fois par un ennemi précis (lot « map » de l'ennemi, avec drapeau d'obtention).
nb_butins = 0
for nom_msb, aire, partie, pos, npc_id, talk in ENNEMIS:
    r = NPC.get(npc_id)
    if not r:
        continue
    objets, drapeaux = lots(LOT_MAP, r.get("itemLotId_map", -1))
    if not (objets and drapeaux):
        objets, drapeaux = lots(LOT_ENN, r.get("itemLotId_enemy", -1))
        drapeaux = [d for d in drapeaux if d > 0]
    if not objets or not drapeaux or drapeaux[0] in vus:
        continue
    g = global_msb(nom_msb, *pos)
    if not g or g[0] != 60:
        continue
    c = couche_de(aire)
    px, py = pixel(c, g[1], g[2])
    if not dans_image(c, px, py):
        continue
    vus.add(drapeaux[0])
    qui = PNJ_NOMS.get(r.get("nameId", -1)) or re.sub(r"\s*(\(.*?\)|\[.*?\]|\{.*)", "", LIGNES.get(npc_id, "")).strip()
    if "dummy" in qui.lower() or qui.lower().startswith("dlc"):
        qui = ""
    principal = objets[0]
    noter(f"o{drapeaux[0]}", objets)
    marqueurs.append({
        "id": f"o{drapeaux[0]}", "c": categorie(principal[0], principal[1], principal[2]), "n": principal[2], "s": c, "x": px, "y": py,
        "q": principal[3] if principal[3] > 1 else None, "k": cle_objet(principal[0], principal[1]), "ico": icone(principal[0], principal[1]),
        "plus": [o[2] + (f" ×{o[3]}" if o[3] > 1 else "") for o in objets[1:]] or None,
        "d": f"Lâché par : {qui}" if qui else "Lâché par un ennemi", "_msb": nom_msb,
    })
    nb_butins += 1
print("butins d'ennemis", nb_butins, file=sys.stderr)

# Liens vers les fiches de donjon du guide
for m in marqueurs:
    if m["c"] == "lieux" and norme(m.get("en") or "") in donjons_guide:
        m["f"] = donjons_guide[norme(m["en"])]
    if m["c"] not in ("graces", "lieux"):
        m["pres"] = grace_proche(m["s"], m["x"], m["y"])

# Objets et boss à l'intérieur des petits donjons (catacombes, grottes, tunnels) : on nomme le donjon.
lieux = [m for m in marqueurs if m["c"] == "lieux"]
groupes = collections.defaultdict(list)
for m in marqueurs:
    if m.get("_msb", "")[1:3] in ("30", "31", "32", "39"):
        groupes[m["_msb"]].append(m)
for nom_msb, ms in groupes.items():
    cx = sum(m["x"] for m in ms) / len(ms); cy = sum(m["y"] for m in ms) / len(ms)
    l = min(lieux, key=lambda m: (m["x"] - cx) ** 2 + (m["y"] - cy) ** 2)
    if math.hypot(l["x"] - cx, l["y"] - cy) < 300:
        for m in ms:
            m["z"] = l["n"]
for m in marqueurs:
    m.pop("_msb", None)
    for k in [k for k, v in m.items() if v is None]:
        del m[k]

stats = collections.Counter((m["c"], m["s"]) for m in marqueurs)
print(sorted(stats.items()), file=sys.stderr)
print("autres boss", len(autres_boss), sorted(autres_boss)[:80], file=sys.stderr)
print("boss trouvés", len(boss_places), "/", len(boss_guide), "donjons liés", sum(1 for m in marqueurs if m.get("f", "").startswith("d")), "/", len(donjons_guide), file=sys.stderr)
print("boss manquants", [boss_guide[k][1] for k in boss_guide if k not in boss_places], file=sys.stderr)
print("donjons non liés", [n for k, n in ((k, k) for k in donjons_guide) if k not in {norme(m.get("en") or "") for m in marqueurs if m["c"] == "lieux"}], file=sys.stderr)
json.dump({"marqueurs": marqueurs, "icones": sorted(ICONES), "objets": LIEUX_OBJETS,
           "lots_utilises": sorted(l for t, l in LOTS_UTILISES if t == id(LOT_MAP))}, open(SORTIE, "w"), ensure_ascii=False)

# Copie pour le site : données compactes et icônes des objets (64 px).
if "--site" in sys.argv:
    from PIL import Image
    os.makedirs(config.SORTIE, exist_ok=True)
    json.dump({"version": "1.16 (jeu de base)", "marqueurs": marqueurs}, open(os.path.join(config.SORTIE, "donnees.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    for ref in ICONES:
        dest = os.path.join(config.SORTIE, "icones", ref + ".webp")
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        Image.open(os.path.join(config.ICONES, ref + ".webp")).convert("RGBA").resize((64, 64), Image.LANCZOS).save(dest, "WEBP", quality=80, method=6)
    print("site mis à jour :", config.SORTIE, file=sys.stderr)

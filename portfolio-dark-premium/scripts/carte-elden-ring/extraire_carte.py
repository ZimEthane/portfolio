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
# Recalé sur les repères placés à la main sur les cartes du guide (écart médian de 43 m vers l'ouest corrigé, reste ~8 m).
CALAGE = {0: (7040, 16514), 1: (7552, 14978)}  # couche → (X0, Z0) ; px = X - X0, py = Z0 - Z
TAILLE = {0: (9728, 9216), 1: (6400, 6912)}

def lire(f, d):
    return paramdef.lire(P, f, d)[0]

NPC = lire("NpcParam.param", "NpcParam")
LOT_MAP = lire("ItemLotParam_map.param", "ItemLotParam")
LOT_ENN = lire("ItemLotParam_enemy.param", "ItemLotParam")
GRACES = lire("BonfireWarpParam.param", "BonfireWarpParam")
POINTS = lire("WorldMapPointParam.param", "WorldMapPointParam")
ASSETS = lire("AssetEnvironmentGeometryParam.param", "AssetGeometryParam")
ARMES_PERSO = lire("EquipParamCustomWeapon.param", "EquipParamCustomWeapon")
SOUS_CAT = lire("BonfireWarpSubCategoryParam.param", "BonfireWarpSubCategoryParam")
MENU = textes.fmg_menu("GR_MenuText")

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
    for base in ((iid - iid % 100, iid - iid % 10000) if cat == 2 else ()):
        if base in t:
            return t[base]
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
    return f"{cat}:{iid - iid % 10000 if cat == 2 and iid < 50000000 else iid}"

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
            if cat == 6 and iid in ARMES_PERSO:  # arme « personnalisée » (déjà renforcée, avec sa compétence)
                cat, iid = 2, ARMES_PERSO[iid]["baseWepId"]
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
        return aire, bx * taille + decal + x, bz * taille + decal + z, y
    g = monde.vers_global(aire, bx, bz, x, y, z)
    return (g[0], g[1], g[3], g[2]) if g else None

def pixel(couche, X, Z):
    x0, z0 = CALAGE[couche]
    return round(X - x0, 1), round(z0 - Z, 1)

def dans_image(couche, px, py):
    w, h = TAILLE[couche]
    return 0 <= px < w and 0 <= py < h

# ---------- Lecture des MSB ----------
def s16(b, o):
    return msb._s16(b, o + struct.unpack_from("<q", b, o)[0])

TRESORS, ENNEMIS, RESSOURCES = [], [], []
ENTITES = {}  # identifiant d'entité (scripts) → (carte, aire, position, type de partie, NpcParam, talkId, modèle)
def id_asset(modele):
    m = re.match(r"AEG(\d{3})_(\d{3})", modele)
    return int(m.group(1)) * 1000 + int(m.group(2)) if m else None
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
        modele = modeles[imod] if 0 <= imod < len(modeles) else ""
        parties.append((s16(b, o), typ, modele, pos, npc, talk))
        if offs[2] and typ in (2, 13):
            eid = struct.unpack_from("<i", b, o + offs[2])[0]
            if eid > 0 and eid not in ENTITES:
                ENTITES[eid] = (nom, aire, pos, typ, npc, talk, modele)
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
        elif p[1] == 13:  # asset : plante, champignon, minerai… qu'on ramasse
            a = ASSETS.get(id_asset(p[2]) or -1)
            if a and a.get("pickUpItemLotParamId", -1) > 0:
                RESSOURCES.append((nom, aire, a["pickUpItemLotParamId"], p[3]))
print("trésors", len(TRESORS), "ennemis", len(ENNEMIS), "ressources", len(RESSOURCES), file=sys.stderr)

# ---------- Grâces ----------
marqueurs = []
graces_couche = {0: [], 1: []}
REGIONS = {}  # site de grâce → région (onglets du voyage rapide)
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
    graces_couche[c].append((px, py, n, r["areaNo"], g[2]))
    region = MENU.get(SOUS_CAT.get(r.get("bonfireSubCategoryId", -1), {}).get("textId", -1))
    if region:
        REGIONS[f"g{gid}"] = region

def grace_proche_t(c, px, py, aire=None):
    """Site de grâce le plus proche ; sous Leyndell (aire 35), seulement ceux des égouts."""
    gs = [g for g in graces_couche[c] if aire is None or g[3] == aire] or graces_couche[c]
    return min(gs, key=lambda g: (g[0] - px) ** 2 + (g[1] - py) ** 2, default=None)

def grace_proche(c, px, py, aire=None):
    best = grace_proche_t(c, px, py, aire)
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
        "d": contenant or None, "_msb": nom_msb, "_y": g[3],
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
env_places = collections.defaultdict(list)
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
                    pnj_places[PNJ_NOMS[r["nameId"]]].append((c, px, py, nom_msb))
                    PNJ_EN_PAR_FR[PNJ_NOMS[r["nameId"]]] = PNJ_EN.get(r["nameId"], "")
        elif r.get("nameId", -1) > 0 and PNJ_NOMS.get(r["nameId"]):
            g = global_msb(nom_msb, *pos)
            if g and g[0] == 60:
                c = couche_de(aire)
                px, py = pixel(c, g[1], g[2])
                if dans_image(c, px, py):
                    env_places[PNJ_NOMS[r["nameId"]]].append((c, px, py, nom_msb, npc_id))
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

def butin(npc_id, mid=None):
    """Butin garanti d'un boss ou d'un envahisseur ; noté pour l'encyclopédie si on donne l'identifiant du repère."""
    objets, _ = lots(LOT_MAP, NPC[npc_id].get("itemLotId_map", -1))
    if mid:
        noter(mid, objets)
    return [o[2] for o in objets] or None

# Nom français des boss (le guide les nomme en anglais) : d'après les noms du jeu, partie par partie (« A / B »).
PNJ_EN_FR = {}
for _i, _t in PNJ_EN.items():
    if _t and PNJ_NOMS.get(_i):
        PNJ_EN_FR.setdefault(norme(_t), PNJ_NOMS[_i])
# Groupes de boss que le jeu ne nomme pas d'un bloc (noms français composés à partir des noms officiels).
BOSS_FR = {
    "Abductor Virgins": "Vierges ravisseuses", "Elder Dragon Greyoll": "Greyll, dragon ancestral", "Fell Twins": "Jumeaux abominables",
    "Fia's Champions": "Champions de Fia", "Godfrey, First Elden Lord (ombre dorée)": "Godfrey, premier Seigneur d'Elden (ombre dorée)",
    "Godfrey, First Elden Lord / Hoarah Loux": "Godfrey, premier Seigneur d'Elden / Hoarah Loux le Guerrier",
    "Nox Swordstress & Nox Monk": "Épéiste nokrienne et moine nokrien", "Putrid Crystalian Trio": "Trio de cristaliens putrides",
    "Valiant Gargoyles (duo)": "Gargouilles vaillantes (duo)",
}
def nom_boss_fr(nom):
    if nom in BOSS_FR:
        return BOSS_FR[nom]
    parties = []
    for x in nom.split(" / "):
        m_ = re.match(r"(.*?)(\s*\((?:duo|trio)\))?$", x.strip())
        t = PNJ_EN_FR.get(norme(m_.group(1)))
        if not t:
            return None
        parties.append(t + (" (duo)" if m_.group(2) and "duo" in m_.group(2) else " (trio)" if m_.group(2) else ""))
    return " / ".join(parties)

for cle, places in boss_places.items():
    bid, nom = boss_guide[cle]
    for k, (c, px, py, npc_id, nom_msb) in enumerate(regrouper(places)):
        mid = f"{bid}" + (f"-{k}" if k else "")
        nom_fr = nom_boss_fr(nom)
        marqueurs.append({"id": mid, "c": "boss", "n": nom_fr or nom, **({"en": nom} if nom_fr and nom_fr != nom else {}), "s": c, "x": px, "y": py,
                          "f": bid, "plus": butin(npc_id, mid), "_msb": nom_msb})
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
            nom_fr = nom_boss_fr(boss_guide[cle][1])
            marqueurs.append({"id": carte["id"], "c": "boss", "n": nom_fr or boss_guide[cle][1], **({"en": boss_guide[cle][1]} if nom_fr else {}),
                              "s": l["s"], "x": l["x"], "y": l["y"] + 18, "f": carte["id"]})
            boss_places[cle] = []
            break

for nom, places in pnj_places.items():
    for k, (c, px, py, nom_msb) in enumerate(regrouper(places, 40)):
        marqueurs.append({"id": f"n{norme(nom).replace(' ', '-')}-{k}", "c": "pnj", "n": nom, "en": PNJ_EN_PAR_FR.get(nom), "s": c, "x": px, "y": py, "_msb": nom_msb})

# Envahisseurs et personnages hostiles nommés (sans dialogue) : Doigts sanglants, Récusants, chevaliers errants…
for nom, places in env_places.items():
    if nom in pnj_places or PNJ_EN_PAR_FR.get(nom) in ("Melina", "The Two Fingers") or len(regrouper(places, 40)) > 4:
        continue
    for k, (c, px, py, nom_msb, npc_id) in enumerate(regrouper(places, 40)):
        mid = f"e{norme(nom).replace(' ', '-')}-{k}"
        marqueurs.append({"id": mid, "c": "envahisseurs", "n": nom, "en": PNJ_EN_PAR_FR.get(nom),
                          "s": c, "x": px, "y": py, "plus": butin(npc_id, mid), "_msb": nom_msb})

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
        "d": f"Lâché par : {qui}" if qui else "Lâché par un ennemi", "_msb": nom_msb, "_y": g[3],
    })
    nb_butins += 1
print("butins d'ennemis", nb_butins, file=sys.stderr)

# Liens vers les fiches de donjon du guide
for m in marqueurs:
    if m["c"] == "lieux" and norme(m.get("en") or "") in donjons_guide:
        m["f"] = donjons_guide[norme(m["en"])]

# Objets, boss et personnages à l'intérieur des donjons fermés (catacombes, grottes, galeries, cimetière du début,
# Table ronde — que le jeu situe hors de la carte, au large de Nécrolimbe).
# Leurs coordonnées converties tombent 30 à 150 m autour de l'entrée, parfois sur un autre lieu. Le jeu relie chaque
# carte mAA_BB à son repère de la carte du monde (WorldMapPointParam AABB00) : on nomme ce donjon et on regroupe
# ses repères en spirale serrée autour de l'entrée, là où le joueur doit aller.
point_de = {m["id"]: m for m in marqueurs if m["c"] == "lieux"}
grace_par_id = {m["id"]: m for m in marqueurs if m["c"] == "graces"}
table = next((m for m in marqueurs if m["c"] == "graces" and m.get("en") == "Table of Lost Grace"), None)
ORDRE = {"boss": 0, "pnj": 1, "objets-cles": 1, "talismans": 2, "armes": 2, "armures": 2, "sorts": 2, "cendres-spirituelles": 2}
sorties = collections.defaultdict(list)  # sites de grâce de chaque donjon fermé, par carte mAA_BB
for gid, r in GRACES.items():
    if r["areaNo"] in (30, 31, 32) and f"g{gid}" in grace_par_id:
        sorties[f"m{r['areaNo']}_{r['gridXNo']:02}"].append(grace_par_id[f"g{gid}"])
def cible_interieure(nm, x, y):
    """Entrée du donjon fermé qui contient ce point (carte nm), ou None. Renvoie aussi le nom des grands souterrains
    gardés à leur place (« zone » seule)."""
    aire, grille = nm[1:3], nm[4:6]
    if aire in ("30", "31", "32"):
        l = point_de.get(f"p{aire}{grille}00")
        # Galerie à deux issues (Gael) : l'entrée dérobée a son propre site de grâce, loin de l'entrée principale.
        issues = [g for g in sorties.get(nm[:6], []) if l and math.hypot(g["x"] - l["x"], g["y"] - l["y"]) > 50]
        if l and issues:
            l = min([l] + [dict(g, n=l["n"]) for g in issues], key=lambda e: (e["x"] - x) ** 2 + (e["y"] - y) ** 2)
        return l, None
    if aire == "18":
        return point_de.get("p180000"), None  # Cimetière abandonné (la Tombe des héros des confins s'ouvre à l'intérieur)
    if nm.startswith("m11_10") and table:
        return dict(table, n=LIEUX.get(11100, "Table ronde")), None
    if aire in ("35", "39"):
        # Grands souterrains cartographiés au bon endroit : on garde la position, on nomme seulement le lieu.
        l = point_de.get(f"p{aire}{grille}00")
        return None, (l["n"] if l else None)
    return None, None

groupes = collections.defaultdict(list)
for m in marqueurs:
    nm = m.get("_msb", "")
    if m["c"] in ("graces", "lieux") or not nm:
        continue
    l, zone = cible_interieure(nm, m["x"], m["y"])
    if zone:
        m["z"] = zone
    if l:
        groupes[(l["n"], l["x"], l["y"])].append(m)
for (nom, cx, cy), ms in groupes.items():
    ms.sort(key=lambda m: (ORDRE.get(m["c"], 3), m["n"]))
    for k, m in enumerate(ms):
        r, a = 14 * math.sqrt(k + 1), k * 2.39996
        m["x"], m["y"], m["z"] = round(cx + r * math.cos(a), 1), round(cy + r * math.sin(a), 1), nom
        m["_regroupe"] = 1
print("donjons regroupés", len(groupes), sum(len(v) for v in groupes.values()), file=sys.stderr)

for m in marqueurs:
    if m["c"] not in ("graces", "lieux"):
        g = grace_proche_t(m["s"], m["x"], m["y"], 35 if m.get("_msb", "").startswith("m35") else None)
        m["pres"] = g[2] if g else ""
        # Différence de hauteur avec ce site de grâce (falaise, toit, sous-sol) — pas pour les repères regroupés à l'entrée.
        if g and m.get("_y") is not None and g[4] is not None and not m.get("_regroupe"):
            dh = round(m["_y"] - g[4])
            if abs(dh) >= 6:
                m["h"] = dh

# ---------- Ressources à récolter (plantes, champignons, minerais, herbes tombales…) ----------
# Une ressource par point (les cartes en niveaux de détail répètent les mêmes) ; dans les donjons fermés, un seul repère
# par donjon et par ressource, avec le nombre de points.
ressources, vues_r, internes = [], set(), collections.Counter()
for nom_msb, aire, lot, pos in RESSOURCES:
    objets, _ = lots(LOT_MAP, lot)
    if not objets:
        continue
    g = global_msb(nom_msb, *pos)
    if not g or g[0] != 60:
        continue
    c = couche_de(aire)
    px, py = pixel(c, g[1], g[2])
    if not dans_image(c, px, py):
        continue
    cle = (c, round(px / 1.5), round(py / 1.5), lot)
    if cle in vues_r:
        continue
    vues_r.add(cle)
    principal = max(objets, key=lambda o: o[3])
    k = cle_objet(principal[0], principal[1])
    icone(principal[0], principal[1])
    l, zone = cible_interieure(nom_msb, px, py)
    if l:
        internes[(k, principal[2], l["n"], l["x"], l["y"], l["s"])] += 1
        continue
    ressources.append({"k": k, "n": principal[2], "s": c, "x": px, "y": py, **({"z": zone} if zone else {})})
for (k, n, z, x, y, c), q in internes.items():
    ressources.append({"k": k, "n": n, "s": c, "x": x, "y": y, "z": z, "q": q, "int": 1})
# Repères intérieurs groupés : petite spirale autour de l'entrée, décalée de celle des objets.
par_entree = collections.defaultdict(list)
for r in ressources:
    if r.get("int"):
        par_entree[(r["x"], r["y"])].append(r)
for (cx, cy), rs in par_entree.items():
    for i, r in enumerate(sorted(rs, key=lambda r: r["n"])):
        rr, a = 30 + 8 * math.sqrt(i), 1.2 + i * 2.39996
        r["x"], r["y"] = round(cx + rr * math.cos(a), 1), round(cy + rr * math.sin(a), 1)
        r.pop("int")
for r in ressources:
    r["pres"] = grace_proche(r["s"], r["x"], r["y"])
print("ressources", len(ressources), "points", len(vues_r), file=sys.stderr)

# ---------- Emplacements de chaque ennemi (pour « lâché par … » dans l'encyclopédie) ----------
places_ennemis = collections.defaultdict(list)
for nom_msb, aire, partie, pos, npc_id, talk in ENNEMIS:
    g = global_msb(nom_msb, *pos)
    if not g or g[0] != 60:
        continue
    c = couche_de(aire)
    px, py = pixel(c, g[1], g[2])
    if not dans_image(c, px, py):
        continue
    l, zone = cible_interieure(nom_msb, px, py)
    if l:
        c, px, py = l["s"], l["x"], l["y"]
    pt = [c, round(px), round(py)]
    if all(q[0] != c or abs(q[1] - pt[1]) > 3 or abs(q[2] - pt[2]) > 3 for q in places_ennemis[npc_id]):
        places_ennemis[npc_id].append(pt)

# ---------- Scripts du jeu : qui donne les lots qui ne sont posés nulle part (boss, PNJ, envahisseurs, scènes) ----------
import scripts_jeu
DLC_LOT = lambda l: (len(str(l)) == 10 and str(l)[:2] == "20") or (len(str(l)) == 8 and str(l)[:2] in ("20", "21", "22", "25", "28", "40", "41", "42", "43"))
LIBRES = {l for l, r in LOT_MAP.items() if (id(LOT_MAP), l) not in LOTS_UTILISES and not DLC_LOT(l)
          and any(r.get(f"lotItemId0{i}", 0) > 0 for i in range(1, 9))}

def position_entite(eid):
    nom_msb, aire, pos, typ, npc, talk, modele = ENTITES[eid]
    g = global_msb(nom_msb, *pos)
    if not g or g[0] != 60:
        return None
    c = couche_de(aire)
    px, py = pixel(c, g[1], g[2])
    if not dans_image(c, px, py):
        return None
    l, zone = cible_interieure(nom_msb, px, py)
    if l:
        c, px, py = l["s"], l["x"], l["y"]
    nom = PNJ_NOMS.get(NPC.get(npc, {}).get("nameId", -1), "") if typ == 2 else ""
    if typ == 2 and not nom:
        nom = re.sub(r"\s*(\(.*?\)|\[.*?\]|\{.*)", "", LIGNES.get(npc, "")).strip()
        if "dummy" in nom.lower():
            nom = ""
    return {"s": c, "x": round(px, 1), "y": round(py, 1), "t": "ennemi" if typ == 2 else "objet", "n": nom}

lots_scripts = collections.defaultdict(list)
def lier(lot, pt):
    if pt and all(q["s"] != pt["s"] or math.hypot(q["x"] - pt["x"], q["y"] - pt["y"]) > 8 for q in lots_scripts[lot]):
        lots_scripts[lot].append(pt)

EVENEMENTS = scripts_jeu.tous_les_evenements()
# Appels d'événements (InitializeEvent 2000:00, InitializeCommonEvent 2000:06) : [identifiant, arguments…].
appels = collections.defaultdict(list)
for carte_ev, evs in EVENEMENTS.items():
    for eid_ev, instrs, params in evs:
        for banque, num, vals in instrs:
            if banque == 2000 and num in (0, 6) and len(vals) > 2:
                appels[vals[1]].append(vals[2:])
DON = ((2003, 4), (2003, 36))  # AwardItemLot, AwardItemsIncludingClients
# Drapeau → ennemis nommés (envahisseurs, PNJ hostiles) des événements de carte qui le citent.
par_valeur = collections.defaultdict(set)
for carte_ev, evs in EVENEMENTS.items():
    if carte_ev in ("common", "common_func"):
        continue
    for eid_ev, instrs, params in evs:
        vus_ = {v for _, _, vv in instrs for v in vv} | {v for args in appels.get(eid_ev, []) for v in args}
        nommes = [v for v in vus_ if v in ENTITES and ENTITES[v][3] == 2 and NPC.get(ENTITES[v][4], {}).get("nameId", -1) > 0]
        if nommes:
            for v in vus_:
                if v > 1000 and v not in ENTITES:
                    par_valeur[v].update(nommes)
def nommes_du_drapeau(f):
    res = par_valeur.get(f, set())
    if not 0 < len(res) <= 3:
        return []
    hostiles = [e for e in res if ENTITES[e][5] in (-1, 0)]  # envahisseurs : pas de dialogue
    return sorted(hostiles or res)
def ennemis_de(valeurs):
    return [v for v in valeurs if v in ENTITES and ENTITES[v][3] == 2]
for carte_ev, evs in EVENEMENTS.items():
    for eid_ev, instrs, params in evs:
        corps = ennemis_de(v for _, _, vv in instrs for v in vv)
        for j, (banque, num, vals) in enumerate(instrs):
            if (banque, num) not in DON:
                continue
            p = [x for x in params if x[0] == j and x[1] == 0]
            if p:
                # Lot passé en paramètre : chaque appel donne le lot et, à côté, l'ennemi concerné…
                idx = p[0][2] // 4
                for args in appels.get(eid_ev, []):
                    if idx < len(args) and args[idx] in LIBRES:
                        ents = ennemis_de(args) or corps
                        if not ents:
                            # … ou seulement le drapeau posé à sa mort : on cherche l'ennemi nommé qui pose ce drapeau.
                            ents = [e for a_ in args if a_ != args[idx] and a_ not in ENTITES for e in nommes_du_drapeau(a_)]
                        for e in ents[:4]:
                            lier(args[idx], position_entite(e))
            elif vals and vals[0] in LIBRES:
                ents = corps or [v for args in appels.get(eid_ev, []) for v in ennemis_de(args)]
                if not ents:  # scène sans ennemi (objet qui apparaît, illusion…) : l'objet du décor concerné
                    ents = [v for _, _, vv in instrs for v in vv if v in ENTITES]
                for e in ents[:4]:
                    lier(vals[0], position_entite(e))
# Récompenses de boss : l'événement commun 0 lance 1100/1200 (drapeau « boss vaincu », lot) ; le boss est l'ennemi
# des événements de sa carte qui citent ce même drapeau.
paires = [(v[2], v[3]) for evs in EVENEMENTS.values() for _, instrs, _ in evs for banque, num, v in instrs
          if banque == 2000 and num == 0 and len(v) > 3 and v[1] in (1100, 1200) and v[3] in LIBRES]
drapeaux_boss = {f for f, _ in paires}
boss_du_drapeau = collections.defaultdict(list)
for carte_ev, evs in EVENEMENTS.items():
    if carte_ev in ("common", "common_func"):
        continue
    for eid_ev, instrs, _ in evs:
        vals = [v for _, _, vv in instrs for v in vv] + [v for args in appels.get(eid_ev, []) for v in args]
        fl = drapeaux_boss & set(vals)
        if not fl:
            continue
        ents = [v for v in vals if v in ENTITES and ENTITES[v][3] == 2]
        gros = [v for v in ents if NPC.get(ENTITES[v][4], {}).get("isSoulGetByBoss") == 1]
        for f in fl:
            for e in gros:
                if e not in boss_du_drapeau[f]:
                    boss_du_drapeau[f].append(e)
for f, lot in paires:
    if lot not in lots_scripts:
        for e in boss_du_drapeau.get(f, [])[:3]:
            lier(lot, position_entite(e))

# Dialogues : un lot cité dans le script t<talkId>.esd est donné par ce personnage.
DIALOGUES = scripts_jeu.tous_les_dialogues()
places_talk = collections.defaultdict(list)
for nom_msb, aire, partie, pos, npc_id, talk in ENNEMIS:
    if talk and talk > 0:
        places_talk[talk].append((nom_msb, aire, pos, npc_id))
def position_talk(nom_msb, aire, pos, npc_id):
    g = global_msb(nom_msb, *pos)
    if not g or g[0] != 60:
        return None
    c = couche_de(aire)
    px, py = pixel(c, g[1], g[2])
    if not dans_image(c, px, py):
        return None
    l, zone = cible_interieure(nom_msb, px, py)
    if l:
        c, px, py = l["s"], l["x"], l["y"]
    nid = NPC.get(npc_id, {}).get("nameId", -1)
    return {"s": c, "x": round(px, 1), "y": round(py, 1), "t": "pnj", "n": PNJ_NOMS.get(nid, ""), "en": PNJ_EN.get(nid, "")}
boutiques_talk = {}
for talk, consts in DIALOGUES.items():
    ici = {c for c in consts & LIBRES if c >= 100000}
    pts = [p for p in (position_talk(*x) for x in places_talk.get(talk, [])) if p]
    for lot in ici:
        if lot not in lots_scripts:
            for p in pts[:6]:
                lier(lot, p)
    rangs = sorted(c for c in consts if 100000 <= c < 200000)
    if rangs and pts:
        boutiques_talk[talk] = {"rangs": rangs, "p": pts[:6]}
# Lots enchaînés (lot+1, lot+2…) : donnés en même temps que le premier.
for lot in sorted(LIBRES):
    if lot not in lots_scripts:
        for k in range(1, 6):
            if lot - k in lots_scripts and all(lot - j in LOT_MAP for j in range(k)):
                lots_scripts[lot] = list(lots_scripts[lot - k])
                break
print("lots donnés par les scripts", sum(1 for l in LIBRES if l in lots_scripts), "/", len(LIBRES), file=sys.stderr)

# Objets de la Chapelle de l'anticipation : île du début, hors de la carte.
hors_carte = []
for nom_msb, aire, lot, partie, modele, pos in TRESORS:
    if nom_msb.startswith("m10_01"):
        objets, _ = lots(LOT_MAP, lot)
        for o in objets:
            hors_carte.append({"k": cle_objet(o[0], o[1]), "n": o[2], "lieu": "Chapelle de l'anticipation"})
for m in marqueurs:
    m.pop("_msb", None)
    m.pop("_y", None)
    m.pop("_regroupe", None)
    for k in [k for k, v in m.items() if v is None]:
        del m[k]

stats = collections.Counter((m["c"], m["s"]) for m in marqueurs)
print(sorted(stats.items()), file=sys.stderr)
print("autres boss", len(autres_boss), sorted(autres_boss)[:80], file=sys.stderr)
print("boss trouvés", len(boss_places), "/", len(boss_guide), "donjons liés", sum(1 for m in marqueurs if m.get("f", "").startswith("d")), "/", len(donjons_guide), file=sys.stderr)
print("boss manquants", [boss_guide[k][1] for k in boss_guide if k not in boss_places], file=sys.stderr)
print("donjons non liés", [n for k, n in ((k, k) for k in donjons_guide) if k not in {norme(m.get("en") or "") for m in marqueurs if m["c"] == "lieux"}], file=sys.stderr)
json.dump({"marqueurs": marqueurs, "icones": sorted(ICONES), "objets": LIEUX_OBJETS, "ressources": ressources,
           "ennemis": {str(k): v for k, v in places_ennemis.items()}, "hors_carte": hors_carte, "regions": REGIONS, "lots_scripts": lots_scripts, "boutiques_talk": boutiques_talk,
           "lots_utilises": sorted(l for t, l in LOTS_UTILISES if t == id(LOT_MAP))}, open(SORTIE, "w"), ensure_ascii=False)

# Copie pour le site : données compactes et icônes des objets (64 px).
if "--site" in sys.argv:
    from PIL import Image
    os.makedirs(config.SORTIE, exist_ok=True)
    json.dump({"version": "1.16 (jeu de base)", "marqueurs": marqueurs, "regions": REGIONS},
              open(os.path.join(config.SORTIE, "donnees.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    # Ressources à récolter : fichier à part, chargé seulement quand on affiche la catégorie ou un objet.
    types = sorted({(r["k"], r["n"]) for r in ressources}, key=lambda t: t[1])
    it = {t: i for i, t in enumerate(types)}
    noms = sorted({r.get("z") or "" for r in ressources} | {r["pres"] for r in ressources})
    ino = {n: i for i, n in enumerate(noms)}
    def ico_cle(k):
        cat, iid = (int(v) for v in k.split(":"))
        return icone(cat, iid)
    json.dump({"types": [[k, n, ico_cle(k)] for k, n in types], "noms": noms,
               "points": [[it[(r["k"], r["n"])], r["s"], round(r["x"]), round(r["y"]), r.get("q", 1), ino[r.get("z") or ""], ino[r["pres"]]]
                          for r in ressources]},
              open(os.path.join(config.SORTIE, "ressources.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    for ref in ICONES:
        dest = os.path.join(config.SORTIE, "icones", ref + ".webp")
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        Image.open(os.path.join(config.ICONES, ref + ".webp")).convert("RGBA").resize((64, 64), Image.LANCZOS).save(dest, "WEBP", quality=80, method=6)
    print("site mis à jour :", config.SORTIE, file=sys.stderr)

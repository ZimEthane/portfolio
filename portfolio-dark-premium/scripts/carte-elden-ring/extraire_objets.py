"""Encyclopédie des objets du guide : une fiche par objet du jeu de base.

Sources : liste et catégories d'ERDB (jeu de base), statistiques des params du jeu (regulation.bin, version actuelle),
noms et descriptions français (msg/frafr), emplacements de la carte (carte.json, voir extraire_carte.py),
boutiques (ShopLineupParam) et récompenses (ItemLotParam_map, avec les noms de lignes de Paramdex).

À lancer après extraire_carte.py :
    python scripts/carte-elden-ring/extraire_objets.py
Sortie : public/guides/elden-ring/objets/ (objets.json, illustrations) et src/guides/elden-ring/objets/index.json.
"""
import collections, glob, json, os, re, sys, unicodedata
import config, monde, paramdef, textes
from PIL import Image

P = monde.P
SORTIE = os.path.join("public", "guides", "elden-ring", "objets")
INDEX = os.path.join("src", "guides", "elden-ring", "objets", "index.json")
ILLUS = os.path.join(config.DOSSIER, "images", "objets")  # MENU_Knowledge_XXXXX.webp (extraire_tout.py)

def lire(f, d):
    return paramdef.lire(P, f, d)[0]

ARMES = lire("EquipParamWeapon.param", "EquipParamWeapon")
ARMURES = lire("EquipParamProtector.param", "EquipParamProtector")
TALISMANS = lire("EquipParamAccessory.param", "EquipParamAccessory")
BIENS = lire("EquipParamGoods.param", "EquipParamGoods")
GEMMES = lire("EquipParamGem.param", "EquipParamGem")
MAGIES = lire("Magic.param", "MagicParam")
BOUTIQUES = lire("ShopLineupParam.param", "ShopLineupParam")
MATIERES = lire("EquipMtrlSetParam.param", "EquipMtrlSetParam")
LOTS = lire("ItemLotParam_map.param", "ItemLotParam")

def fr(nom):
    return textes.fmg(nom)

def en(nom):
    return textes.fmg(nom, "engus")

def noms_lignes(param):
    res = {}
    f = os.path.join(config.PARAMDEX, "Names", param + ".txt")
    for l in open(f, encoding="utf-8"):
        p = l.rstrip("\n").split(" ", 1)
        if len(p) == 2 and p[0].lstrip("-").isdigit():
            res[int(p[0])] = p[1]
    return res

def slug(t):
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")

# Traductions des noms anglais (personnages, lieux, objets) pour les boutiques et récompenses
def cle_nom(t):
    return re.sub(r"[^a-z0-9]+", " ", unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode().lower()).strip()

EN_FR = {}
for f in ("NpcName", "PlaceName", "GoodsName", "WeaponName", "ProtectorName", "AccessoryName"):
    e, r = en(f), fr(f)
    for i, t in e.items():
        if i in r and t:
            EN_FR.setdefault(cle_nom(t), r[i])
MOTS = {"merchant": "Marchand nomade", "hermit merchant": "Marchand ermite", "isolated merchant": "Marchand isolé",
        "imprisoned merchant": "Marchand emprisonné", "abandoned merchant": "Marchand abandonné", "nomadic merchant": "Marchand nomade",
        "merchant kale": "Kalé le marchand", "dragon communion": "Communion draconique", "pidia carian servant": "Pidia, serviteur carien",
        "field": "en extérieur", "corpse": "Cadavre", "boss drop": "Butin de boss", "invasion": "Invasion", "evergaol": "Prison éternelle",
        "quest": "Quête", "ranni quest": "quête de Ranni", "ld": "", "forging": "", "enia": "Enia (échange de Remembrance)",
        "weeping penisula": "Péninsule larmoyante", "weeping peninsula": "Péninsule larmoyante"}

from noms_ennemis import ENNEMIS, LIBELLES, FAUTES
for _en, _fr in list(ENNEMIS.items()) + list(LIBELLES.items()):
    MOTS.setdefault(cle_nom(_en), _fr)

def traduire(t):
    k = cle_nom(t)
    m_ = re.fullmatch(r"(\d+)(?:st|nd|rd|th) deathroot", k)
    if m_:
        n_ = int(m_.group(1))
        return f"{n_}{'re' if n_ == 1 else 'e'} Mortefleur"
    if k in MOTS or k in EN_FR:
        return MOTS.get(k, EN_FR.get(k))
    # Fautes de frappe des noms Paramdex, article manquant (« Shaded Castle » → « The Shaded Castle »)
    k2 = " ".join(FAUTES.get(w, w) for w in k.replace("spiritcaller s", "spiritcaller").split())
    for kk in (k2, "the " + k2):
        if kk in MOTS or kk in EN_FR:
            return MOTS.get(kk, EN_FR.get(kk))
    return t

def libelle(brut):
    morceaux = [traduire(x.strip()) for x in re.split(r"\s+[-–]\s+", brut)]
    return " – ".join(m for m in morceaux if m)

TYPES_ARMES = {
    "Dagger": "Dague", "Straight Sword": "Épée droite", "Greatsword": "Grande épée", "Colossal Sword": "Épée colossale",
    "Thrusting Sword": "Épée d'estoc", "Heavy Thrusting Sword": "Épée d'estoc lourde", "Curved Sword": "Épée courbe",
    "Curved Greatsword": "Grande épée courbe", "Katana": "Katana", "Twinblade": "Lame double", "Axe": "Hache",
    "Greataxe": "Grande hache", "Hammer": "Marteau", "Great Hammer": "Grand marteau", "Flail": "Fléau",
    "Spear": "Lance", "Great Spear": "Grande lance", "Halberd": "Hallebarde", "Reaper": "Faux", "Whip": "Fouet",
    "Fist": "Poing", "Claw": "Griffe", "Colossal Weapon": "Arme colossale", "Light Bow": "Arc léger", "Bow": "Arc",
    "Greatbow": "Grand arc", "Crossbow": "Arbalète", "Ballista": "Baliste", "Glintstone Staff": "Bâton de sorcellerie",
    "Sacred Seal": "Sceau sacré", "Torch": "Torche", "Small Shield": "Petit bouclier", "Medium Shield": "Bouclier moyen",
    "Greatshield": "Grand bouclier", "Arrow": "Flèche", "Greatarrow": "Grande flèche", "Bolt": "Carreau", "Greatbolt": "Grand carreau",
}
PIECES = {"Head": "Tête", "Body": "Torse", "Arms": "Bras", "Legs": "Jambes"}
SOUS_CAT = {
    "Incantation": "Incantation", "Sorcery": "Sorcellerie", "Pot": "Pot", "Crystal Tear": "Larme de cristal", "Edible": "Nourriture",
    "Utility": "Utilitaire", "Golden Rune": "Rune dorée", "Throwable": "Objet de jet", "Grease": "Graisse", "Essential": "Indispensable",
    "Online": "Multijoueur", "Rememberance": "Remembrance", "Offensive": "Offensif", "Great Rune": "Rune majeure", "Aromatic": "Parfum",
    "Quest": "Quête", "Map": "Fragment de carte", "Exploration": "Exploration", "Exchange": "Échange", "Feature": "Fonction",
    "Whetblade": "Pierre à aiguiser", "Container": "Contenant", "Mending Rune": "Rune de réparation", "Tutorial": "Tutoriel",
    "Note": "Note", "Clue": "Indice", "Painting": "Tableau", "Cookbook": "Livre de recettes", "Bell Bearing": "Clochette",
    "Spellbook": "Grimoire", "Glovewort": "Gantelée", "Somber Smithing Stone": "Pierre sombre", "Smithing Stone": "Pierre de forge",
    "Flask": "Fiole", "Fauna": "Faune", "Flora": "Flore", "Object": "Objet",
}
# dossier ERDB → (type de fiche, nom du groupe, catégorie des lots, param, FMG nom, FMG description, FMG effet)
GROUPES = [
    ("armaments", "armes", "Armes", 2), ("ammo", "munitions", "Flèches et carreaux", 2), ("armor", "armures", "Armures", 3),
    ("talismans", "talismans", "Talismans", 4), ("spells", "sorts", "Sorts et incantations", 1), ("ashes-of-war", "cendres-guerre", "Cendres de guerre", 5),
    ("spirit-ashes", "cendres-spirituelles", "Cendres spirituelles", 1), ("tools", "outils", "Outils et consommables", 1),
    ("bolstering-materials", "renforcement", "Matériaux de renforcement", 1), ("crafting-materials", "materiaux", "Matériaux d'artisanat", 1),
    ("keys", "cles", "Objets clés", 1), ("shop", "livres", "Livres, grimoires et clochettes", 1), ("info", "infos", "Notes et indices", 1),
]
FMG = {2: ("WeaponName", "WeaponCaption", None), 3: ("ProtectorName", "ProtectorCaption", None),
       4: ("AccessoryName", "AccessoryCaption", "AccessoryInfo"), 5: ("GemName", "GemCaption", "GemInfo"),
       1: ("GoodsName", "GoodsCaption", "GoodsInfo")}

def lettre(v):
    return "" if v <= 0 else "S" if v >= 175 else "A" if v >= 140 else "B" if v >= 90 else "C" if v >= 60 else "D" if v >= 25 else "E"

def stats_arme(i, erdb):
    r = ARMES.get(i)
    if not r:
        return {}
    deg = {"Physique": r["attackBasePhysics"], "Magie": r["attackBaseMagic"], "Feu": r["attackBaseFire"],
           "Foudre": r["attackBaseThunder"], "Sacré": r["attackBaseDark"]}
    st = {
        "Dégâts": {k: v for k, v in deg.items() if v},
        "Prérequis": {k: v for k, v in (("FOR", r["properStrength"]), ("DEX", r["properAgility"]), ("INT", r["properMagic"]), ("FOI", r["properFaith"]), ("ESO", r["properLuck"])) if v},
        "Bonus de caractéristique": {k: lettre(v) for k, v in (("FOR", r["correctStrength"]), ("DEX", r["correctAgility"]), ("INT", r["correctMagic"]), ("FOI", r["correctFaith"]), ("ESO", r["correctLuck"])) if lettre(v)},
        "Poids": round(r["weight"], 1),
    }
    std = (erdb.get("affinity") or {}).get("Standard") or {}
    effets = {"bleed": "Saignement", "frostbite": "Gelure", "poison": "Poison", "scarlet_rot": "Putréfaction", "sleep": "Sommeil", "madness": "Folie", "death_blight": "Mort"}
    se = {effets.get(k, k): v for k, v in (std.get("status_effects") or {}).items() if v}
    if se:
        st["Effets d'altération"] = se
    types = {"Standard": "Normal", "Slash": "Tranchant", "Strike": "Contondant", "Pierce": "Perforant"}
    if erdb.get("attack_attributes"):
        st["Type d'attaque"] = " / ".join(types.get(a, a) for a in erdb["attack_attributes"])
    if erdb.get("upgrade_material"):
        st["Amélioration"] = "Pierres sombres (+10)" if "Somber" in erdb["upgrade_material"] else "Pierres de forge (+25)" if "Smithing" in erdb["upgrade_material"] else erdb["upgrade_material"]
    comp = fr("ArtsName").get(r.get("swordArtsParamId", -1)) if r.get("swordArtsParamId", -1) > 0 else None
    if comp:
        st["Compétence"] = comp
    return st

def stats_armure(i):
    r = ARMURES.get(i)
    if not r:
        return {}
    pc = lambda v: round((1 - v) * 100, 1)
    return {
        "Absorption (%)": {"Physique": pc(r["neutralDamageCutRate"]), "Contondant": pc(r["blowDamageCutRate"]), "Tranchant": pc(r["slashDamageCutRate"]),
                           "Perforant": pc(r["thrustDamageCutRate"]), "Magie": pc(r["magicDamageCutRate"]), "Feu": pc(r["fireDamageCutRate"]),
                           "Foudre": pc(r["thunderDamageCutRate"]), "Sacré": pc(r["darkDamageCutRate"])},
        "Résistances": {"Immunité": r["resistPoison"], "Robustesse": r["resistBlood"], "Concentration": r["resistSleep"], "Vitalité": r["resistCurse"]},
        "Équilibre": round(r["toughnessCorrectRate"] * 1000),
        "Poids": round(r["weight"], 1),
    }

def stats_sort(i):
    m = MAGIES.get(i)
    if not m:
        return {}
    st = {"Coût en PC": m["mp"], "Endurance": m["stamina"], "Emplacements": m["slotLength"],
          "Prérequis": {k: v for k, v in (("INT", m["requirementIntellect"]), ("FOI", m["requirementFaith"]), ("ESO", m["requirementLuck"])) if v}}
    return st

# ---------- Emplacements (carte) ----------
carte = json.load(open(os.path.join(config.DOSSIER, "carte.json")))
reperes = {m["id"]: m for m in carte["marqueurs"]}
lieux_objets = carte["objets"]
lots_utilises = set(carte["lots_utilises"])

ARMES_PERSO = lire("EquipParamCustomWeapon.param", "EquipParamCustomWeapon")
ATTACHEES = collections.defaultdict(set)  # cendre de guerre → armes « personnalisées » qui la portent
def cle(cat, iid):
    """Clé d'objet commune aux lots, boutiques et fiches : arme de base (sans affinité ni renforcement)."""
    if cat == 6 and iid in ARMES_PERSO:
        cw = ARMES_PERSO[iid]
        base = cw["baseWepId"] - cw["baseWepId"] % 10000
        if cw.get("gemId", -1) > 0:
            ATTACHEES[f"5:{cw['gemId']}"].add(f"2:{base}")
        return f"2:{base}"
    return f"{cat}:{iid - iid % 10000 if cat == 2 and iid < 50000000 else iid}"

# ---------- Repères de la carte : index par nom anglais et par position ----------
MARQ = carte["marqueurs"]
CALAGE = {0: (7040, 16514), 1: (7552, 14978)}
def norme(t):
    return re.sub(r"[^a-z0-9]+", " ", unicodedata.normalize("NFKD", t or "").encode("ascii", "ignore").decode().lower()).strip()
SUJETS = [m for m in MARQ if m["c"] in ("boss", "pnj", "envahisseurs", "lieux")]
NOM_REPERE = {m["id"]: m["n"] for m in MARQ if m["c"] in ("boss", "pnj", "envahisseurs")}  # qui donne une récompense
for m in SUJETS:
    m["_noms"] = {norme(m["n"]), norme(m.get("en"))} - {""}
graces = [m for m in MARQ if m["c"] == "graces"]
def region_de(m):
    g = min((g for g in graces if g["s"] == m["s"]), key=lambda g: (g["x"] - m["x"]) ** 2 + (g["y"] - m["y"]) ** 2, default=None)
    return carte["regions"].get(g["id"], "") if g else ""

def point_lot(lid):
    """Endroit approximatif d'un lot d'après son numéro (10XXYY#### : tuile m60_XX_YY ; AABB#### : carte AA_BB)."""
    t = str(lid)
    if len(t) == 10 and t.startswith("10"):
        X, Z = int(t[2:4]) * 256 + 128, int(t[4:6]) * 256 + 128
        return 0, X - CALAGE[0][0], CALAGE[0][1] - Z
    if len(t) == 8 and t[:2] in ("10", "11", "12", "13", "14", "15", "16", "18", "19", "30", "31", "32", "34", "35", "39"):
        g = monde.vers_global(int(t[:2]), int(t[2:4]), 0, 0, 0, 0)
        if g and g[0] == 60:
            c = 1 if t[:2] == "12" else 0
            return c, g[1] - CALAGE[c][0], CALAGE[c][1] - g[3]
    return None

VIDES = {"the", "of", "a", "an", "and", "de", "la", "le", "les", "du", "des", "d", "l", "et", "field", "terrain", "boss", "drop", "quest",
         "knight", "chevalier", "merchant", "marchand", "teardrop", "scarab", "invasion", "killed", "corpse", "is", "en", "au", "aux"}
def mots(t):
    return {w for w in norme(t).split() if len(w) >= 3 and w not in VIDES}

# Mots rares des noms de repères (au plus 4 noms différents) : un seul en commun suffit pour relier un nom
# (« Alexander »), alors qu'un mot courant (« Royal », « Knight ») ne suffit pas.
_PAR_NOM = collections.defaultdict(set)  # un nom français → tous ses mots (français et anglais)
for m in SUJETS:
    for x in m["_noms"]:
        _PAR_NOM[norme(m["n"])] |= mots(x)
_FREQ = collections.Counter(w for ws in _PAR_NOM.values() for w in ws)
def concorde(noms_a, noms_b):
    a, b = set().union(*map(mots, noms_a)), set().union(*map(mots, noms_b))
    commun = a & b
    # Un mot du sujet inconnu de tous les repères (« Fortified » de Fortified Manor) : le sujet n'est pas un de ces
    # repères, un seul mot commun (« Manor ») ne suffit pas.
    if any(_FREQ[w] == 0 and len(w) >= 5 for w in a) and len(commun) < 2:
        return False
    return len(commun) >= 2 or any(_FREQ[w] <= 4 for w in commun)

# Mots des noms de lignes Paramdex qui ne désignent personne (« Corpse » ne doit pas mener à la Cabane fétide).
GENERIQUES = {"corpse", "unknown", "ld", "field", "incantation", "sorcery", "info item", "merchant", "boss drop", "invasion", "quest"}

def trouver(sujets, pres=None, cats=("boss", "pnj", "envahisseurs", "lieux"), maxi=4, strict=False):
    """Repères dont le nom anglais ou français correspond le mieux à l'un des sujets (du plus précis au plus vague).
    strict : nom exact ou contenu mot pour mot seulement (pas de ressemblance approximative)."""
    import difflib
    for sujet in sujets:
        n = " ".join(FAUTES.get(w, w) for w in norme(sujet).split())
        if len(n) < 3 or n in GENERIQUES:
            continue
        cands = [m for m in SUJETS if m["c"] in cats]
        res = [m for m in cands if n in m["_noms"]]
        if not res:
            res = [m for m in cands if any(len(n) >= 4 and (re.search(rf"\b{re.escape(n)}\b", x) or (len(x) >= 5 and re.search(rf"\b{re.escape(x)}\b", n))) for x in m["_noms"])]
            # « Godrick » : Godrick the Grafted plutôt que Soldier of Godrick (le nom qui commence par le sujet).
            if any(x.startswith(n) for m in res for x in m["_noms"]):
                res = [m for m in res if any(x.startswith(n) for x in m["_noms"])]
        if not res and not strict:
            res = [m for m in cands if max((difflib.SequenceMatcher(None, n, x).ratio() for x in m["_noms"]), default=0) >= 0.86]
        if not res and not strict and mots(n):
            # Mots en commun, à condition d'être parlants (voir concorde) : sinon « Royal » suffirait à confondre
            # Ensha of the Royal Remains avec Royal Revenant.
            score = {m["id"]: max(len(mots(n) & mots(x)) for x in m["_noms"]) for m in cands if concorde([n], m["_noms"])}
            best = max(score.values(), default=0)
            res = [m for m in cands if best and score.get(m["id"]) == best]
        if res:
            # Nom partagé par un personnage et son garde (Tanith / Chevalier de Tanith) : le personnage
            if any(m["c"] == "pnj" for m in res) and any(m["c"] == "envahisseurs" for m in res) and n not in {x for m in res if m["c"] == "envahisseurs" for x in m["_noms"]}:
                res = [m for m in res if m["c"] != "envahisseurs"]
            if pres:
                res = sorted(res, key=lambda m: (m["s"] != pres[0], (m["x"] - pres[1]) ** 2 + (m["y"] - pres[2]) ** 2))
            return [m["id"] for m in res[:maxi]]
    return []

def ennemis_proches(sujets, pres, rayon=520):
    """Ennemi nommé comme le sujet (noms de lignes de NpcParam) posé près de l'endroit du lot : un groupe d'un seul point."""
    if not pres:
        return None
    for sujet in sujets:
        ms = mots(sujet) | ({"scarab"} if "scarab" in norme(sujet) else set())
        if not ms:
            continue
        nids = [nid for nid, n in NOMS_NPC.items() if ms <= mots(n) | ({"scarab"} if "scarab" in norme(n) else set())]
        pts = [p for nid in nids for p in PLACES.get(str(nid), []) if p[0] == pres[0]]
        pts = [p for p in pts if abs(p[1] - pres[1]) < rayon and abs(p[2] - pres[2]) < rayon]
        if pts:
            p = min(pts, key=lambda p: (p[1] - pres[1]) ** 2 + (p[2] - pres[2]) ** 2)
            return p
    return None

def voisins(pres, rayon=320, maxi=2):
    """Personnages, boss et envahisseurs autour d'un endroit (lots sans nom de ligne)."""
    if not pres:
        return []
    c, x, y = pres
    res = sorted((m for m in SUJETS if m["c"] in ("boss", "pnj", "envahisseurs") and m["s"] == c
                  and abs(m["x"] - x) < rayon and abs(m["y"] - y) < rayon), key=lambda m: (m["x"] - x) ** 2 + (m["y"] - y) ** 2)
    return [m["id"] for m in res[:maxi]]

# ---------- Boutiques (avec le repère du marchand) ----------
NOMS_BOUTIQUES = noms_lignes("ShopLineupParam")
TYPE_BOUTIQUE = {0: 2, 1: 3, 2: 4, 3: 1, 4: 5}  # equipType → catégorie de lot
# Marchands sans nom propre : type de marchand (nom anglais) et site de grâce le plus proche.
MARCHANDS = {
    "North Limgrave": ("Nomadic Merchant", "Pont-saint"), "East Limgrave": ("Nomadic Merchant", "Ouest du Fort Haight"),
    "Coastal Cave": ("Nomadic Merchant", "Grotte marine"), "East Weeping Peninsula": ("Nomadic Merchant", "Rempart du Château de Vent-Hurlant"),
    "Liurnia of the Lakes": ("Nomadic Merchant", "Rive sud du lac de Liurnia"), "North Liurnia": ("Nomadic Merchant", "Le Ravin"),
    "Academy of Raya Lucaria": ("Isolated Merchant", "Salle de classe de l'école"), "Altus Plateau": ("Nomadic Merchant", "Viaduc enjambant la forêt"),
    "Mt. Gelmir": ("Nomadic Merchant", "Neuvième camp du Mont Gelmir"), "Caelid (Aeonia Swamp)": ("Nomadic Merchant", "Rives du marais d'Ivoine"),
    "South Caelid": ("Nomadic Merchant", "Rive sud du marais d'Ivoine"), "Mountaintops of the Giants": ("Hermit Merchant", "Antiques ruines de la vallée"),
    "Siofra River": ("Abandoned Merchant", None), "Ainsel River": ("Hermit Merchant", "Aval de l'Ainsel"),
    "Isolated Merchant - Weeping Peninsula": ("Isolated Merchant", "sud"), "Isolated Merchant - Dragonbarrow": ("Isolated Merchant", "est"),
    "Hermit Merchant - Leyndell": ("Hermit Merchant", "Cabane du marchand ermite"), "Imprisoned Merchant - Mohgwyn": ("Imprisoned Merchant", None),
}
def reperes_marchand(brut):
    cle = brut.split(" - ", 1)[1] if brut.startswith("Merchant - ") else brut
    if cle in MARCHANDS:
        type_en, ou = MARCHANDS[cle]
        ms = [m for m in SUJETS if m["c"] == "pnj" and m.get("en") == type_en]
        if ou == "sud":
            ms = sorted(ms, key=lambda m: -m["y"])[:1]
        elif ou == "est":
            ms = sorted(ms, key=lambda m: -m["x"])[:1]
        elif ou:
            ms = [m for m in ms if m.get("pres") == ou]
        return [m["id"] for m in ms]
    if brut.startswith(("Enia", "Remembrance", "Elden Remembrance")):
        return trouver(["Finger Reader Enia"], cats=("pnj",))
    if brut == "Dragon Communion":
        return trouver(["Cathedral of Dragon Communion"], cats=("lieux",), maxi=1) + trouver(["Church of Dragon Communion"], cats=("lieux",), maxi=1)
    personne = brut.split(" - ")[0]
    return trouver([personne, personne.split()[-1]], cats=("pnj",), maxi=6)

# Boutiques d'après les dialogues du jeu : chaque marchand ouvre sa boutique sur une plage de lignes (début, fin).
BOUTIQUES_TALK = carte.get("boutiques_talk", {})
def reperes_dialogue(rid):
    cands = []
    for talk, v in BOUTIQUES_TALK.items():
        r_ = sorted(set(v["rangs"]))
        if any(a_ <= rid <= b_ and b_ - a_ <= 50 for a_, b_ in zip(r_, r_[1:])):
            pts = [q for q in v["p"] if q.get("n") and q["n"] != "DLC dummy"]
            if pts:
                cands.append((len(r_), pts))
    if not cands:
        return []
    mini = min(c_[0] for c_ in cands)
    ids = []
    for _, pts in (c_ for c_ in cands if c_[0] == mini):
        for q in pts:
            proche = min((x for x in SUJETS if x["c"] in ("pnj", "lieux") and x["s"] == q["s"]),
                         key=lambda x: (x["x"] - q["x"]) ** 2 + (x["y"] - q["y"]) ** 2, default=None)
            if proche and math.hypot(proche["x"] - q["x"], proche["y"] - q["y"]) < 15 and proche["id"] not in ids:
                ids.append(proche["id"])
    return ids

import math
ECARTS_BOUTIQUES = []
boutiques = collections.defaultdict(list)
for rid, r in BOUTIQUES.items():
    cat = TYPE_BOUTIQUE.get(r.get("equipType"))
    if cat is None or r.get("equipId", 0) <= 0:
        continue
    nom = NOMS_BOUTIQUES.get(rid, "")
    m = re.match(r"\[(.+?)\]", nom)
    if not m:
        continue
    brut = m.group(1).strip()
    if brut in ("Reversion", "Alteration", "Sorcery", "Incantation", "Enia - Forging"):  # retouches, mémorisation, forge : pas des marchands
        continue
    if brut.startswith("Remembrance") or brut.startswith("Elden Remembrance"):
        qui = "Enia (échange de Remembrance) – " + traduire(brut)
    else:
        qui = libelle(brut)
    src = {"t": "boutique", "qui": qui}
    if brut.startswith("Enia - "):
        # Tenue d'un boss vendue contre des runes une fois le boss vaincu (drapeau 91xx) : pas un échange de Remembrance.
        BOSS_ENIA = {9104: "Morgott, roi Réprouvé", 9107: "Godfrey, premier Seigneur d'Elden / Hoarah Loux le Guerrier",
                     9130: "Radahn le Fléau des astres", 9112: "Mohg, seigneur du sang", 9118: "Rennala, reine de la pleine lune",
                     9116: "Maliketh la Lame d'ébène", 9120: "Malenia, épée de Miquella"}
        boss = BOSS_ENIA.get(r.get("eventFlag_forRelease")) or traduire(brut.split(" - ", 1)[1])
        src["qui"] = "Enia (Table ronde)"
        src["apres"] = f"après avoir vaincu {boss}"
    if brut.startswith("Twin Maiden Husks"):
        # Lignes débloquées par une Perle cinéraire donnée aux Carcasses (drapeau 111097xx = perle 89xx), ou en
        # rattrapage d'un objet clé manqué (Gideon mort, Renna partie, Kalé tué…).
        drapeau = r.get("eventFlag_forRelease", 0) or 0
        src["qui"] = "Carcasses des Servantes jumelles"
        if 11109745 <= drapeau <= 11109765:
            perle = fr("GoodsName").get(8900 + drapeau - 11109700)
            if perle:
                src["apres"] = f"après leur avoir donné la {perle}"
        elif drapeau:
            src["apres"] = "en rattrapage, si tu n'as pas pu l'obtenir à sa source normale"
    if r.get("value", -1) > 0:
        src["prix"] = r["value"]
    if r.get("mtrlId", -1) > 0 and MATIERES.get(r["mtrlId"]):
        mt = MATIERES[r["mtrlId"]]
        if mt.get("materialId01", -1) > 0:
            src["echange"] = fr("GoodsName").get(mt["materialId01"], "")
    if r.get("sellQuantity", -1) > 0:
        src["stock"] = r["sellQuantity"]
    # Repère du marchand d'après le nom de la ligne ; les plages de boutique des dialogues du jeu confirment
    # les marchands nomades/ermites et ne servent qu'à défaut (elles sont bruitées pour les autres PNJ).
    ids = reperes_marchand(brut)
    cle_m = brut.split(" - ", 1)[1] if brut.startswith("Merchant - ") else brut
    if ids and cle_m in MARCHANDS:
        # Nom français du marchand posé à cet endroit (nomade, ermite, ascétique…) plutôt que « Marchand nomade » partout
        lieu_m = cle_m.split(" - ", 1)[-1]
        qui = next(m["n"] for m in SUJETS if m["id"] == ids[0]) + " – " + traduire(lieu_m)
        src["qui"] = qui
    if not ids:
        ids = reperes_dialogue(rid)
        ECARTS_BOUTIQUES.append((brut, (), tuple(ids)))
    if ids:
        src["ids"] = ids
    iid = r["equipId"]
    k = cle(cat, iid)
    if src not in boutiques[k]:
        boutiques[k].append(src)

for x in sorted(set((e_[0], tuple(e_[1]), tuple(e_[2])) for e_ in ECARTS_BOUTIQUES)):
    print("boutique sans repère par le nom :", x)

# ---------- Récompenses : lots donnés par un événement (boss, quêtes, PNJ, envahisseurs) ----------
SCRIPTS = carte.get("lots_scripts", {})
beffrois = trouver(["Fourth Belfry", "Four Belfries"], cats=("lieux",), maxi=1)
import math
NOMS_LOTS = noms_lignes("ItemLotParam_map")
NOMS_NPC = noms_lignes("NpcParam")
PLACES = carte["ennemis"]
ennemis_site = {}
recompenses = collections.defaultdict(list)
def ennemi_proche_nom(p, rayon=12):
    """Nom (français) de l'ennemi posé à l'endroit d'un événement sans nom (ex. un Nocher diaphane qui lâche une Mortefleur)."""
    best = None
    for nid, pts_ in PLACES.items():
        for s_, x_, y_ in pts_:
            if s_ == p["s"]:
                d = math.hypot(x_ - p["x"], y_ - p["y"])
                if d < rayon and (best is None or d < best[0]):
                    best = (d, nid)
    if not best:
        return ""
    n_ = re.sub(r"\s*(\(.*?\)|\[.*?\]|\{.*)", "", NOMS_NPC.get(int(best[1]), "")).strip()
    return traduire(n_) if n_ and "dummy" not in n_.lower() else ""
TRACE_RECOMPENSES = []  # pour auditer_sources.py
LOTS_DE_SOURCE = {}  # (objet, source) → lots du jeu qui la donnent (audit des sources écartées)
SOURCES_ECARTEES = []
# Lots dont la ligne Paramdex ne nomme qu'un lieu, mais dont on sait qui les donne (nom anglais du repère).
LOTS_REPERES = {11100900: "Ensha of the Royal Remains",  # Main agrippée : lâchée par Ensha, envahisseur de la Table ronde
                11100800: "Mad Tongue Alberich",  # Langue de raillerie : lâchée par Alberich, envahisseur de la Table ronde
                # Perles des colporteurs : lâchées par le Chasseur de perles cinéraires qui apparaît la nuit près de ces
                # cabanes (le script vise le personnage qui s'y tient le jour : Bernahl, Miriel, les marchands).
                1037460400: "Bell Bearing Hunter", 1042380410: "Bell Bearing Hunter", 1043530400: "Bell Bearing Hunter",
                1048410800: "Bell Bearing Hunter"}
# Région nommée en tête de la ligne Paramdex (« Liurnia - Field - Tibia Mariner ») : on ne garde que les repères de cette
# région, sinon le butin d'un Nocher diaphane serait montré sur tous les Nochers du jeu.
REGIONS_EN = {"limgrave": "Nécrolimbe", "stormhill": "Nécrolimbe", "weeping peninsula": "Péninsule", "weeping penisula": "Péninsule",
              "liurnia": "Liurnia", "caelid": "Caelid", "greyoll s dragonbarrow": "Tertre draconique", "altus plateau": "Altus",
              "mt gelmir": "Gelmir", "capital outskirts": "Abords de la capitale", "leyndell": "Leyndell", "ashen leyndell": "cendres",
              "mountaintops of the giants": "Cimes", "mountaintops": "Cimes", "forbidden lands": "Terres interdites",
              "consecrated snowfield": "Champs enneigés", "flame peak": "Pic de la Flamme", "siofra": "Siofra", "ainsel": "Ainsel",
              "nokron": "Nokron", "deeproot depths": "Fonderacine", "lake of rot": "Lac putréfié", "farum azula": "Farum Azula",
              "haligtree": "Arbre-Sacré", "mohgwyn": "Mohgwyn"}
def filtre_region(ids, parties):
    if not parties or not ids:
        return ids
    voulu = REGIONS_EN.get(norme(parties[0]))
    if not voulu:
        return ids
    par_id_ = {m["id"]: m for m in SUJETS}
    garde = [i for i in ids if i in par_id_ and voulu.lower() in region_de(par_id_[i]).lower()]
    return garde or ids
for lid, r in LOTS.items():
    if lid in lots_utilises or lid < 10000:
        continue  # déjà sur la carte, ou lot « système » (moins de 10000 : tests, objets de départ, lots génériques des scripts)
    t = str(lid)
    if (len(t) == 10 and t[:2] == "20") or (len(t) == 8 and t[:2] in ("20", "21", "22", "25", "28")):
        continue  # extension
    nom = NOMS_LOTS.get(lid, "")
    m = re.match(r"\[(.+?)\]", nom)
    pres = point_lot(lid)
    e, ids = None, []
    contexte = libelle(m.group(1)) if m else ""
    parties = [x.strip() for x in re.split(r"\s+[-–/]\s+", m.group(1))] if m else []
    parties = [{"Big Boggart": "Blackguard", "Blackguard Big Boggart": "Blackguard"}.get(x, x) for x in parties]
    if parties and parties[0] == "Melina":
        continue  # scènes de Melina : sources écrites à la main (SPECIAUX), avec le bon site de grâce
    pts = SCRIPTS.get(str(lid), [])
    # Dialogue d'un autre personnage que celui que nomme la ligne du lot : coïncidence de nombres, on l'écarte.
    if parties:
        pts = [p for p in pts if p["t"] != "pnj" or mots(p.get("en", "")) & mots(" ".join(parties))]
    # Récompense de boss nommée : le nom du boss est plus sûr que les drapeaux partagés entre événements.
    boss_nomme = trouver(list(reversed(parties)), pres, cats=("boss",), strict=True, maxi=12) if parties else []
    if lid in LOTS_REPERES:
        ids = [m_["id"] for m_ in MARQ if m_.get("en") == LOTS_REPERES[lid]]
        if pres and len(ids) > 1:  # plusieurs repères du même nom : celui de l'endroit du lot
            ids = [min(ids, key=lambda i_: next(((m_["s"] != pres[0], (m_["x"] - pres[1]) ** 2 + (m_["y"] - pres[2]) ** 2) for m_ in MARQ if m_["id"] == i_)))]
    elif boss_nomme:
        ids = filtre_region(boss_nomme, parties)
    elif pts:
        # Donné par un personnage, un boss ou une scène : d'après les scripts du jeu (événements et dialogues).
        for p in pts:
            # Repère tout proche, et du même nom que la ligne du lot quand elle en a un : sinon ce n'est qu'un voisin
            # (un scarabée tué à côté de Rogier n'est pas un cadeau de Rogier) et on montre l'endroit exact.
            # À égalité, le personnage passe avant le garde posé à côté de lui (Tanith avant le Chevalier de Tanith).
            # Sans nom de ligne, le nom de l'entité du script fait foi (Chasseur de perles cinéraires ≠ marchand voisin).
            nom_ref = parties or [n_ for n_ in (p.get("en"), p.get("n")) if n_ and "dummy" not in n_.lower()]
            voisins = [x for x in SUJETS if x["c"] in ("boss", "pnj", "envahisseurs") and x["s"] == p["s"]
                       and math.hypot(x["x"] - p["x"], x["y"] - p["y"]) < 15 and (not nom_ref or concorde(nom_ref, x["_noms"]))]
            proche = min(voisins, key=lambda x: (x["c"] != "pnj", math.hypot(x["x"] - p["x"], x["y"] - p["y"])), default=None)
            if proche:
                if proche["id"] not in ids:
                    ids.append(proche["id"])
            else:
                e = f"lot-{lid}"
                nom_p = p.get("n") if p.get("n") and "dummy" not in p.get("n", "").lower() else ennemi_proche_nom(p)
                ennemis_site.setdefault(e, {"n": (libelle(parties[-1]) if parties else nom_p) or "Endroit de l'événement", "p": []})
                if [p["s"], round(p["x"]), round(p["y"])] not in ennemis_site[e]["p"]:
                    ennemis_site[e]["p"].append([p["s"], round(p["x"]), round(p["y"])])
    elif parties and parties[0].startswith("Chapel of Anticipation"):
        ids = beffrois
    elif parties:
        ids = filtre_region(trouver(list(reversed(parties)), pres, maxi=12), parties)[:4]
        if not ids:
            # Nom de lieu : le site de grâce du même nom (ex. Trône du prince de la mort)
            ids = [m_["id"] for m_ in graces if norme(m_.get("en")) in {norme(x) for x in parties}][:1]
        if not ids:
            p = ennemis_proches(list(reversed(parties)), pres)
            if p:
                e = f"lot-{lid}"
                ennemis_site[e] = {"n": libelle(parties[-1]), "p": [p]}
    TRACE_RECOMPENSES.append({"lot": lid, "parties": parties, "ids": list(ids), "e": e,
                              "noms": [(x["n"], x.get("en")) for x in SUJETS if x["id"] in ids][:6],
                              "scripts": [(p.get("t"), p.get("n"), p.get("en")) for p in pts][:4]})
    for j in range(1, 9):
        iid, cat = r.get(f"lotItemId0{j}", 0), r.get(f"lotItemCategory0{j}", 0)
        if iid > 0 and (cat in FMG or cat == 6):
            k = cle(cat, iid)
            src = {"t": "recompense", "quoi": contexte or ("Événement du jeu (lâché ou donné)" if ids else "Événement du jeu")}
            if ids:
                src["ids"] = ids
            if e:
                src["e"], src["nb"] = e, len(ennemis_site[e]["p"])
            if src not in recompenses[k]:
                recompenses[k].append(src)
            LOTS_DE_SOURCE.setdefault((k, json.dumps(src, sort_keys=True, ensure_ascii=False)), []).append(lid)

# ---------- Butins aléatoires des ennemis : lot de l'ennemi (NpcParam) → ses emplacements sur la carte ----------
LOTS_ENN = lire("ItemLotParam_enemy.param", "ItemLotParam")
NOMS_ENN = noms_lignes("ItemLotParam_enemy")
NPC = lire("NpcParam.param", "NpcParam")
butins = collections.defaultdict(dict)  # objet → {nom de l'ennemi: pourcentage}
groupes_enn = collections.defaultdict(set)  # nom de l'ennemi → NpcParam
for nid, n in NPC.items():
    base = n.get("itemLotId_enemy", -1)
    if not base or base <= 0:
        continue
    for k in range(10):
        lid = base + k
        r = LOTS_ENN.get(lid)
        if not r:
            if k == 0:
                continue
            break
        m = re.match(r"\[(.+?)\]", NOMS_ENN.get(lid, ""))
        qui = libelle(m.group(1)) if m and m.group(1) != "Unknown" else ""
        if not qui:
            qui = traduire(re.sub(r"\s*(\(.*?\)|\[.*?\]|\{.*)", "", NOMS_NPC.get(nid, "")).strip())
        if not qui or "dummy" in qui.lower():
            continue
        total = sum(r.get(f"lotItemBasePoint0{j}", 0) for j in range(1, 9)) or 1
        for j in range(1, 9):
            iid, cat = r.get(f"lotItemId0{j}", 0), r.get(f"lotItemCategory0{j}", 0)
            if iid > 0 and (cat in FMG or cat == 6):
                kk = cle(cat, iid)
                pc = round(100 * r.get(f"lotItemBasePoint0{j}", 0) / total, 1)
                if pc > 0:
                    butins[kk][qui] = max(pc, butins[kk].get(qui, 0))
                    groupes_enn[qui].add(nid)
def cle_ennemi(qui):
    k = slug(qui)[:48]
    if k not in ennemis_site:
        pts = []
        for nid in groupes_enn.get(qui, ()):
            for p in PLACES.get(str(nid), []):
                if all(q[0] != p[0] or abs(q[1] - p[1]) > 6 or abs(q[2] - p[2]) > 6 for q in pts):
                    pts.append(p)
        ennemis_site[k] = {"n": qui, "p": pts}
    return k

# ---------- Fabrication : recettes (ShopLineupParam_Recipe) et carnet qui les débloque ----------
RECETTES = lire("ShopLineupParam_Recipe.param", "ShopLineupParam")
NOMS_RECETTES = noms_lignes("ShopLineupParam_Recipe")
ingredients = collections.defaultdict(list)  # objet → (id de bien, nombre)
fabrication = collections.defaultdict(list)  # objet → noms anglais des carnets (« Default » : connue dès le début)
for rid, r in RECETTES.items():
    cat = TYPE_BOUTIQUE.get(r.get("equipType"))
    iid = r.get("equipId", 0)
    if cat is None or iid <= 0:
        continue
    nom = NOMS_RECETTES.get(rid, "")
    livre = nom.rsplit(" - ", 1)[1].strip() if " - " in nom else ""
    k = cle(cat, iid)
    if livre and livre not in fabrication[k]:
        fabrication[k].append(livre)
    mt = MATIERES.get(r.get("mtrlId", -1)) or {}
    for j in range(1, 7):
        mid_, nb = mt.get(f"materialId0{j}", -1), mt.get(f"itemNum0{j}", 0)
        if mid_ and mid_ > 0 and (mid_, nb) not in ingredients[k]:
            ingredients[k].append((mid_, max(1, nb or 1)))

# Ressources à récolter : nombre de points par objet
nb_ressources = collections.Counter()
for r in carte["ressources"]:
    nb_ressources[r["k"]] += r.get("q", 1)
hors_carte = collections.defaultdict(list)
for h in carte["hors_carte"]:
    hors_carte[h["k"]].append(h["lieu"])

# Plusieurs identifiants pour un même nom (doublons du jeu, ex. les objets multijoueur 100 et 170)
ALIAS = collections.defaultdict(list)
for cat_, (nom_f_, _, _) in FMG.items():
    for j, t in en(nom_f_).items():
        ALIAS[(cat_, t)].append(j)
# L'événement commun 701 donne doigts, effigies et anneaux multijoueur, mais seulement dans les versions de test réseau
# (drapeaux 2000/2001) : en jeu normal ils se trouvent (Doigt crochu sur un cadavre du Cimetière abandonné, Langue de
# raillerie d'Alberich, Doigt sanglant de Varré…). On ne s'en sert donc pas comme source.

# ---------- Fiches ----------
os.makedirs(os.path.join(SORTIE, "img"), exist_ok=True)
os.makedirs(os.path.join(SORTIE, "min"), exist_ok=True)
fiches, slugs, coupes = [], set(), []
manque_illus = 0
for dossier, type_fiche, groupe, cat in GROUPES:
    erdb_tout = json.load(open(os.path.join(config.ERDB, dossier + ".json")))
    if dossier == "tools":
        # Oubliés par ERDB : la Fiole de larmes pourpres (tous ses niveaux, la version pleine) et la Fiole de salut miraculeux
        modele = erdb_tout["Flask of Cerulean Tears"]
        manquants_ = [(1000 + 2 * k, "Flask of Crimson Tears" + (f" +{k}" if k else "")) for k in range(13)] + [(250, "Flask of Wondrous Physick")]
        for iid_, nom_ in manquants_:
            if nom_ not in erdb_tout and BIENS.get(iid_):
                erdb_tout[nom_] = {**modele, "id": iid_, "name": nom_, "icon": BIENS[iid_].get("iconId", modele["icon"]),
                                   "summary": "", "category": modele.get("category", "")}
    nom_f, desc_f, eff_f = FMG[cat]
    for nom_en, e in erdb_tout.items():
        iid = e["id"]
        n = fr(nom_f).get(iid) or nom_en
        if not fr(nom_f).get(iid) or n.startswith("[ERROR]"):
            coupes.append(nom_en)
            continue
        s = slug(n)
        if s in slugs:
            s = f"{s}-{iid}"
        slugs.add(s)
        k = f"{cat}:{iid}"
        sous = e.get("category") or ""
        fiche = {
            "s": s, "t": type_fiche, "n": n, "en": nom_en,
            "c": TYPES_ARMES.get(sous) or PIECES.get(sous) or SOUS_CAT.get(sous) or "",
            "i": e.get("icon"),
            "d": fr(desc_f).get(iid, ""),
            "_k": k, "_cles": [k] + [f"{cat}:{j}" for j in ALIAS.get((cat, nom_en), []) if j != iid],
        }
        if eff_f and fr(eff_f).get(iid):
            fiche["e"] = fr(eff_f)[iid]
        if cat == 2:
            fiche["st"] = stats_arme(iid, e)
        elif cat == 3:
            fiche["st"] = stats_armure(iid)
        elif dossier == "spells":
            fiche["st"] = stats_sort(iid)
        elif cat == 4 and TALISMANS.get(iid):
            fiche["st"] = {"Poids": round(TALISMANS[iid]["weight"], 1)}
        elif dossier == "spirit-ashes" and BIENS.get(iid):
            b = BIENS[iid]
            fiche["st"] = {k2: v for k2, v in (("Coût en PC", b.get("consumeMP", -1)), ("Coût en PV", b.get("consumeHP", -1))) if v and v > 0}
        if not fiche.get("st"):
            fiche.pop("st", None)
        # Où le trouver (le jeu a parfois plusieurs identifiants pour un même objet : on les réunit)
        cles = [k] + [f"{cat}:{j}" for j in ALIAS.get((cat, nom_en), []) if j != iid]
        ou = []
        for mid in [m for kk in cles for m in lieux_objets.get(kk, [])]:
            m = reperes.get(mid)
            if m:
                comment = m.get("d") or ("Butin de " + m["n"] if m["c"] in ("boss", "envahisseurs") else "Ramassé sur place")
                ou.append({"t": "carte", "id": mid, "comment": comment, "pres": m.get("pres", ""), "z": m.get("z", ""), "sous": m["s"]})
        if sum(nb_ressources.get(kk, 0) for kk in cles):
            ou.append({"t": "cueillette", "nb": sum(nb_ressources.get(kk, 0) for kk in cles), "k": [kk for kk in cles if nb_ressources.get(kk)]})
        for lieu in {l for kk in cles for l in hors_carte.get(kk, [])}:
            ou.append({"t": "hors-carte", "quoi": f"{lieu} (île du début du jeu, hors de la carte ; on y retourne par le portail des Quatre beffrois)",
                       **({"ids": beffrois} if beffrois else {})})
        for kk in cles:
            ou += [x for x in boutiques.get(kk, []) + recompenses.get(kk, []) if x not in ou]
        for qui, pc in sorted({q: p for kk in cles for q, p in butins.get(kk, {}).items() if ennemis_site[cle_ennemi(q)]["p"]}.items(),
                              key=lambda x: -x[1]):  # tous les ennemis qui le lâchent, du plus probable au moins
            # Ennemi jamais posé sur les cartes du jeu de base : variante de l'extension, on l'écarte.
            ce = cle_ennemi(qui)
            ou.append({"t": "butin", "qui": qui, "pc": pc, "e": ce, "nb": len(ennemis_site[ce]["p"])})
        fab = [l for kk in cles for l in fabrication.get(kk, [])]
        if fab:
            ou.append({"t": "fabrication", "livres": list(dict.fromkeys(fab)), "_ingr": [x for kk in cles for x in ingredients.get(kk, [])]})
        if ou:
            fiche["ou"] = ou
        fiches.append(fiche)
        # Illustration (grande) et miniature
        ic = e.get("icon")
        src = os.path.join(ILLUS, f"MENU_Knowledge_{ic:05d}.webp") if ic is not None else ""
        if src and os.path.exists(src):
            dest = os.path.join(SORTIE, "img", f"{ic}.webp")
            if not os.path.exists(dest):
                im = Image.open(src).convert("RGBA")
                im.resize((320, 320), Image.LANCZOS).save(dest, "WEBP", quality=82, method=4)
                im.resize((96, 96), Image.LANCZOS).save(os.path.join(SORTIE, "min", f"{ic}.webp"), "WEBP", quality=80, method=4)
        else:
            manque_illus += 1

# ---------- Objets impossibles à obtenir dans le jeu (aucune source dans les données) : retirés de l'encyclopédie ----------
INOBTENABLES = {"Ragged Hat", "Ragged Armor", "Ragged Gloves", "Ragged Loincloth", "Ragged Hat (Altered)", "Ragged Armor (Altered)",
                "Phantom Bloody Finger", "Phantom Recusant Finger", "Phantom Great Rune"}
coupes += [f["en"] for f in fiches if f["en"] in INOBTENABLES]
fiches = [f for f in fiches if f["en"] not in INOBTENABLES]

# ---------- Sources sans emplacement propre, reliées à d'autres fiches ----------
par_en = {f["en"]: f for f in fiches}
par_id_bien = {int(f["_k"].split(":")[1]): f for f in fiches if f["_k"].startswith("1:")}
fiche_par_k = {f["_k"]: f for f in fiches}
# Objets donnés par une scène ou un dialogue, sans lot ni boutique dans les params : source écrite à la main,
# avec le repère où aller (personnage, boss ou site de grâce).
SPECIAUX = {
    "Spectral Steed Whistle": [{"t": "recompense", "quoi": "Donné par Melina au premier repos à un site de grâce après en avoir activé trois (en général au site de grâce des Portes, en Nécrolimbe)",
                                "sujets": [("graces", "Gatefront")]}],
    "Miniature Ranni": [{"t": "recompense", "quoi": "Quête de Ranni : sur un corps, juste après le site de grâce du Lit principal de l'Ainsel",
                         "sujets": [("graces", "Lit principal de l'Ainsel")]}],
    "Mending Rune of Perfect Order": [{"t": "recompense", "quoi": "Fin de la quête de Noble Masque d'or (Cimes des Géants)", "sujets": [("pnj", "The Noble Goldmask")]}],
    "Mending Rune of the Fell Curse": [{"t": "recompense", "quoi": "Fin de la quête du Coprophage : cinq Seedbed Curses dans sa cellule des égouts",
                                        "sujets": [("pnj", "Le Coprophage")]}],
    "Rold Medallion": [{"t": "recompense", "quoi": "Donné par Melina après la mort de Morgott", "sujets": [("boss", "Morgott, the Omen King")]}],
    "Small Golden Effigy": [{"t": "recompense", "quoi": "Reçue en activant ta première Effigie du martyr (bassin d'invocation) : la plus proche est juste à l'est du site de grâce de la Première étape",
                             "sujets": [("graces", "The First Step")]}],
    "Flask of Cerulean Tears": [{"t": "depart", "classes": ["toutes les classes"]}],
    "Flask of Crimson Tears": [{"t": "depart", "classes": ["toutes les classes"]}],
}
CLASSES_NOMS = ["Vagabond", "Guerrier", "Héros", "Bandit", "Astrologue", "Prophète", "Confesseur", "Samouraï", "Prisonnier", "Misérable"]
CLASSES_P = lire("CharaInitParam.param", "CharaInitParam")
depart = collections.defaultdict(list)
CHAMPS_DEPART = [("equip_Wep_Right", 2), ("equip_Subwep_Right", 2), ("equip_Wep_Left", 2), ("equip_Subwep_Left", 2),
                 ("equip_Helm", 3), ("equip_Armer", 3), ("equip_Gaunt", 3), ("equip_Leg", 3), ("equip_Arrow", 2), ("equip_Bolt", 2),
                 ("equip_SubArrow", 2), ("equip_SubBolt", 2), ("equip_Accessory01", 4), ("equip_Accessory02", 4)] + \
                [(f"equip_Spell_0{k}", 1) for k in range(1, 8)] + [(f"item_{k:02}", 1) for k in range(1, 11)] + \
                [(f"secondaryItem_0{k}", 1) for k in range(1, 6)]
for i, nom_classe in enumerate(CLASSES_NOMS):
    r = CLASSES_P.get(3000 + i, {})
    for champ, cat in CHAMPS_DEPART:
        iid = r.get(champ, -1)
        if iid and iid > 0:
            k = cle(cat, iid)
            if nom_classe not in depart[k]:
                depart[k].append(nom_classe)
SOUVENIRS = ["Crimson Amber Medallion", "Lands Between Rune", "Golden Seed", "Fanged Imp Ashes", "Cracked Pot",
             "Stonesword Key", "Bewitching Branch", "Boiled Prawn", "Shabriri's Woe"]
for f in fiches:
    ou = f.setdefault("ou", [])
    k = f["_k"]
    if depart.get(k):
        ou.insert(0, {"t": "depart", "classes": depart[k] if len(depart[k]) < 10 else ["toutes les classes"]})
    if f["en"] in SOUVENIRS:
        ou.insert(0, {"t": "souvenir"})
    for src in ou:
        if src["t"] == "fabrication":
            src["livres"] = [{"s": par_en[l]["s"], "n": par_en[l]["n"]} if l in par_en else {"n": "connue dès le début" if l == "Default" else l}
                             for l in src["livres"]]
    if f["en"].endswith(" (Altered)") and par_en.get(f["en"][:-10]):
        base = par_en[f["en"][:-10]]
        ou.append({"t": "retouche", "s": base["s"], "n": base["n"]})
    elif par_en.get(f["en"] + " (Altered)") and f["t"] == "armures":
        alt = par_en[f["en"] + " (Altered)"]
        ou.append({"t": "retouche", "s": alt["s"], "n": alt["n"], "inverse": 1})
    for src in ou:
        if src["t"] == "fabrication":
            src["ingredients"] = [{"s": par_id_bien[i]["s"], "n": par_id_bien[i]["n"], "q": q} for i, q in src.pop("_ingr", []) if i in par_id_bien]
    for src in SPECIAUX.get(f["en"], []):
        src = dict(src)
        if "sujets" in src:
            ids = []
            for cat_, nom_ in src.pop("sujets"):
                ids += [m["id"] for m in MARQ if m["c"] == cat_ and (nom_ in (m.get("en"), m["n"], m.get("pres")))]
            if ids:
                src["ids"] = ids
        ou.append(src)
    mm = re.match(r"Flask of (Crimson|Cerulean) Tears \+(\d+)$", f["en"])
    if mm and par_en.get("Sacred Tear"):
        ou.append({"t": "fiole", "niveau": int(mm.group(2)), "s": par_en["Sacred Tear"]["s"], "n": par_en["Sacred Tear"]["n"]})
    armes = [fiche_par_k[w] for kk in f.get("_cles", []) for w in sorted(ATTACHEES.get(kk, ())) if w in fiche_par_k]
    if armes and f["t"] == "cendres-guerre":
        ou.append({"t": "attachee", "armes": [{"s": a["s"], "n": a["n"]} for a in armes]})
    if f["t"] == "infos" and f["en"].startswith("About "):
        ou.append({"t": "aide"})
    # « Événement du jeu » sans repère ni endroit : n'apporte rien quand l'objet a d'autres sources
    vides = [x for x in ou if x["t"] == "recompense" and not x.get("ids") and not x.get("e") and (x.get("quoi", "").startswith("Événement du jeu") or x.get("quoi") == "Objet d'information")]
    if vides and len(vides) < len(ou):
        for x in vides:
            SOURCES_ECARTEES.append({"objet": f["en"], "source": x, "lots": [l_ for kk in f["_cles"] for l_ in LOTS_DE_SOURCE.get((kk, json.dumps(x, sort_keys=True, ensure_ascii=False)), [])]})
        ou[:] = [x for x in ou if x not in vides]
    # Qui donne la récompense (noms des repères), pour l'encyclopédie
    for x in ou:
        if x["t"] in ("recompense", "boutique") and x.get("ids"):
            noms_ = list(dict.fromkeys(NOM_REPERE[i] for i in x["ids"] if i in NOM_REPERE))
            if noms_ and x["t"] == "recompense":
                x["chez"] = noms_[:4]
        elif x["t"] == "recompense" and x.get("e") and x.get("quoi", "").startswith("Événement du jeu"):
            nom_e = ennemis_site.get(x["e"], {}).get("n", "")
            if nom_e and nom_e != "Endroit de l'événement":
                x["chez"] = [nom_e]
    if not ou:
        f.pop("ou")
# Noms de lignes Paramdex (anglais) de tout ce qui donne chaque objet : lots de la carte, butins d'ennemis, boutiques.
# Sert à extraire_quetes.py pour rattacher aux quêtes les objets donnés par leurs personnages.
BRUT = collections.defaultdict(set)
for _lid, _r in LOTS.items():
    _m = re.match(r"\[(.+?)\]", NOMS_LOTS.get(_lid, ""))
    _t = str(_lid)
    if not _m or (len(_t) == 10 and _t[:2] == "20") or (len(_t) == 8 and _t[:2] in ("20", "21", "22", "25", "28")):
        continue  # sans nom, ou extension
    for j in range(1, 9):
        iid, cat = _r.get(f"lotItemId0{j}", 0), _r.get(f"lotItemCategory0{j}", 0)
        if iid > 0 and (cat in FMG or cat == 6):
            BRUT[cle(cat, iid)].add("lot:" + _m.group(1))
for _lid, _r in LOTS_ENN.items():
    _m = re.match(r"\[(.+?)\]", NOMS_ENN.get(_lid, ""))
    if not _m:
        continue
    for j in range(1, 9):
        iid, cat = _r.get(f"lotItemId0{j}", 0), _r.get(f"lotItemCategory0{j}", 0)
        if iid > 0 and (cat in FMG or cat == 6):
            BRUT[cle(cat, iid)].add("ennemi:" + _m.group(1))
for _rid, _r in BOUTIQUES.items():
    _m = re.match(r"\[(.+?)\]", NOMS_BOUTIQUES.get(_rid, ""))
    _cat = TYPE_BOUTIQUE.get(_r.get("equipType"))
    if _m and _cat is not None and _r.get("equipId", 0) > 0:
        BRUT[cle(_cat, _r["equipId"])].add("boutique:" + _m.group(1))
json.dump({f["s"]: sorted(set().union(*(BRUT.get(kk, set()) for kk in f["_cles"]))) for f in fiches},
          open(os.path.join(config.DOSSIER, "sources-brutes.json"), "w"), ensure_ascii=False)

# Tableaux : la récompense posée à l'endroit peint n'apparaît que si l'on a le tableau (lots « Reward - "X" Painting »)
TABLEAU_DE_LOT = {}
for _lid, _nom in NOMS_LOTS.items():
    _m = re.match(r'\[Reward - (".+?" Painting)\]', _nom)
    if _m:
        TABLEAU_DE_LOT[str(_lid)] = _m.group(1)
for f in fiches:
    for x in f.get("ou", []):
        if x["t"] == "carte":
            lot_ = next((l_ for l_ in TABLEAU_DE_LOT if x["id"].endswith(l_) and len(x["id"]) - len(l_) <= 2), None)
            if lot_ and par_en.get(TABLEAU_DE_LOT[lot_]):
                t_ = par_en[TABLEAU_DE_LOT[lot_]]
                x["comment"] = "Récompense du " + re.sub(r"^Tableau\s*:\s*", "tableau ", t_["n"])
                x["tableau"] = {"s": t_["s"], "n": t_["n"]}

# Perle cinéraire de chaque marchand (lâchée quand il meurt) : les Carcasses des Servantes jumelles vendent alors son stock.
reperes_id = {m["id"]: m for m in MARQ}
perle_par_marchand = {}
for f in fiches:
    if not re.search(r"Bell Bearing", f["en"]) or re.search(r"Miner|Peddler|Picker", f["en"]):
        continue
    for x in f.get("ou", []):
        for i_ in ([x["id"]] if x["t"] == "carte" and x.get("id") else []) + x.get("ids", []):
            m_ = reperes_id.get(i_)
            if not m_:
                continue
            if m_["c"] == "pnj":
                perle_par_marchand.setdefault(i_, f)
                continue
            proche = min((y for y in SUJETS if y["c"] == "pnj" and y["s"] == m_["s"]),
                         key=lambda y: (y["x"] - m_["x"]) ** 2 + (y["y"] - m_["y"]) ** 2, default=None)
            if proche and math.hypot(proche["x"] - m_["x"], proche["y"] - m_["y"]) < 30:
                perle_par_marchand.setdefault(proche["id"], f)
for f in fiches:
    for x in f.get("ou", []):
        if x["t"] == "boutique" and not x.get("apres"):
            perle = next((perle_par_marchand[i_] for i_ in x.get("ids", []) if i_ in perle_par_marchand), None)
            if perle:
                x["perle"] = {"s": perle["s"], "n": perle["n"]}

fiche_par_cle = {f["_k"]: f["s"] for f in fiches}
for f in fiches:
    f.pop("_k", None)
    f.pop("_cles", None)
os.makedirs(config.SORTIE, exist_ok=True)
# Ressources à cueillir : fiche de l'objet de chaque type (4e colonne), pour le lien depuis la carte
chemin_res = os.path.join(config.SORTIE, "ressources.json")
if os.path.exists(chemin_res):
    res_ = json.load(open(chemin_res))
    k_vers_s = {k_: f["s"] for f in fiches for x in f.get("ou", []) if x["t"] == "cueillette" for k_ in x.get("k", [])}
    res_["types"] = [t_[:3] + [k_vers_s.get(t_[0], "")] for t_ in res_["types"]]
    json.dump(res_, open(chemin_res, "w"), ensure_ascii=False, separators=(",", ":"))
json.dump(TRACE_RECOMPENSES, open(os.path.join(config.DOSSIER, "trace-recompenses.json"), "w"), ensure_ascii=False)
json.dump(SOURCES_ECARTEES, open(os.path.join(config.DOSSIER, "sources-ecartees.json"), "w"), ensure_ascii=False)
utilises = {x["e"] for f in fiches for x in f.get("ou", []) if x.get("e")}
json.dump({k: v for k, v in ennemis_site.items() if k in utilises and v["p"]},
          open(os.path.join(config.SORTIE, "ennemis.json"), "w"), ensure_ascii=False, separators=(",", ":"))

json.dump({"version": "1.16 (jeu de base)", "groupes": [{"t": t, "nom": g} for _, t, g, _ in GROUPES], "objets": fiches},
          open(os.path.join(SORTIE, "objets.json"), "w"), ensure_ascii=False, separators=(",", ":"))

# Index léger, embarqué dans le guide : nom anglais et français → fiche (pour rendre les noms d'objets cliquables)
par_cle = {}
for f in fiches:
    par_cle[f["en"].lower()] = f["s"]
    par_cle.setdefault(f["n"].lower(), f["s"])
os.makedirs(os.path.dirname(INDEX), exist_ok=True)
json.dump(par_cle, open(INDEX, "w"), ensure_ascii=False, separators=(",", ":"))

# Lien des repères de la carte vers les fiches (même ordre de parcours que ci-dessus)
chemin_carte = os.path.join(config.SORTIE, "donnees.json")
donnees = json.load(open(chemin_carte))
lies = 0
for m in donnees["marqueurs"]:
    k = m.pop("k", None)
    if k and k in fiche_par_cle:
        m["o"] = fiche_par_cle[k]
        lies += 1
json.dump(donnees, open(chemin_carte, "w"), ensure_ascii=False, separators=(",", ":"))

stats = collections.Counter(f["t"] for f in fiches)
print(len(fiches), "fiches", dict(stats), file=sys.stderr)
print("avec emplacement :", sum(1 for f in fiches if f.get("ou")), "| illustrations manquantes :", manque_illus, "| repères liés :", lies, file=sys.stderr)

# ---------- Équipement de départ des classes (CharaInitParam 3000 à 3011) ----------
CLASSES = lire("CharaInitParam.param", "CharaInitParam")
fiche_par_s = {f["s"]: f for f in fiches}
classes = []
for rid in range(3000, 3012):
    r = CLASSES.get(rid)
    if not r:
        continue
    objets = []
    champs = [("equip_Wep_Right", 2), ("equip_Subwep_Right", 2), ("equip_Wep_Left", 2), ("equip_Subwep_Left", 2),
              ("equip_Helm", 3), ("equip_Armer", 3), ("equip_Gaunt", 3), ("equip_Leg", 3), ("equip_Arrow", 2), ("equip_Bolt", 2),
              ("equip_Accessory01", 4), ("equip_Accessory02", 4)] + [(f"equip_Spell_0{k}", 1) for k in range(1, 8)]
    for champ, cat in champs:
        iid = r.get(champ, -1)
        if iid is None or iid <= 0:
            continue
        cle_ = cle(cat, iid)
        s = fiche_par_cle.get(cle_)
        if s and s not in [o["s"] for o in objets]:
            f = fiche_par_s[s]
            objets.append({"s": s, "i": f.get("i"), "n": f["n"]})
    stats = [r[k] for k in ("baseVit", "baseWil", "baseEnd", "baseStr", "baseDex", "baseMag", "baseFai", "baseLuc")]
    classes.append({"stats": stats, "objets": objets})
json.dump(classes, open(os.path.join(os.path.dirname(INDEX), "classes.json"), "w"), ensure_ascii=False, separators=(",", ":"))
print("classes :", [len(c["objets"]) for c in classes], file=sys.stderr)

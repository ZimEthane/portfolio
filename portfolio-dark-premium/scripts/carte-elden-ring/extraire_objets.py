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
        "field": "Terrain", "corpse": "Cadavre", "boss drop": "Butin de boss", "invasion": "Invasion", "evergaol": "Prison éternelle",
        "quest": "Quête", "ranni quest": "quête de Ranni", "ld": "", "forging": "", "enia": "Enia (échange de Remembrance)",
        "weeping penisula": "Péninsule pleureuse", "weeping peninsula": "Péninsule pleureuse"}

def traduire(t):
    k = cle_nom(t)
    return MOTS.get(k, EN_FR.get(k, t))

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

# ---------- Boutiques ----------
NOMS_BOUTIQUES = noms_lignes("ShopLineupParam")
TYPE_BOUTIQUE = {0: 2, 1: 3, 2: 4, 3: 1, 4: 5}  # equipType → catégorie de lot
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
    if brut in ("Reversion", "Alteration", "Sorcery", "Incantation"):  # retouches d'armures, mémorisation : pas des marchands
        continue
    if brut.startswith("Remembrance") or brut.startswith("Elden Remembrance"):
        qui = "Enia (échange de Remembrance) – " + traduire(brut)
    else:
        qui = libelle(brut)
    src = {"t": "boutique", "qui": qui}
    if r.get("value", -1) > 0:
        src["prix"] = r["value"]
    if r.get("mtrlId", -1) > 0 and MATIERES.get(r["mtrlId"]):
        mt = MATIERES[r["mtrlId"]]
        if mt.get("materialId01", -1) > 0:
            src["echange"] = fr("GoodsName").get(mt["materialId01"], "")
    if r.get("sellQuantity", -1) > 0:
        src["stock"] = r["sellQuantity"]
    iid = r["equipId"]
    k = f"{cat}:{iid - iid % 100 if cat == 2 and iid < 50000000 else iid}"
    if src not in boutiques[k]:
        boutiques[k].append(src)

# ---------- Récompenses (lots donnés par un événement : boss, quêtes, PNJ) ----------
NOMS_LOTS = noms_lignes("ItemLotParam_map")
recompenses = collections.defaultdict(list)
for lid, r in LOTS.items():
    if lid in lots_utilises:
        continue
    nom = NOMS_LOTS.get(lid, "")
    m = re.match(r"\[(.+?)\]", nom)
    if not m:
        continue
    contexte = libelle(m.group(1))
    for j in range(1, 9):
        iid, cat = r.get(f"lotItemId0{j}", 0), r.get(f"lotItemCategory0{j}", 0)
        if iid > 0 and cat in FMG:
            k = f"{cat}:{iid - iid % 100 if cat == 2 and iid < 50000000 else iid}"
            src = {"t": "recompense", "quoi": contexte}
            if src not in recompenses[k]:
                recompenses[k].append(src)

# ---------- Butins aléatoires des ennemis (ItemLotParam_enemy, noms de lignes de Paramdex) ----------
LOTS_ENN = lire("ItemLotParam_enemy.param", "ItemLotParam")
NOMS_ENN = noms_lignes("ItemLotParam_enemy")
butins = collections.defaultdict(dict)
for lid, r in LOTS_ENN.items():
    m = re.match(r"\[(.+?)\]", NOMS_ENN.get(lid, ""))
    if not m or m.group(1) in ("Unknown",):
        continue
    qui = libelle(m.group(1))
    total = sum(r.get(f"lotItemBasePoint0{j}", 0) for j in range(1, 9)) or 1
    for j in range(1, 9):
        iid, cat = r.get(f"lotItemId0{j}", 0), r.get(f"lotItemCategory0{j}", 0)
        if iid > 0 and cat in FMG:
            k = f"{cat}:{iid - iid % 100 if cat == 2 and iid < 50000000 else iid}"
            pc = round(100 * r.get(f"lotItemBasePoint0{j}", 0) / total, 1)
            if pc > 0 and pc > butins[k].get(qui, 0):
                butins[k][qui] = pc

# ---------- Fiches ----------
os.makedirs(os.path.join(SORTIE, "img"), exist_ok=True)
os.makedirs(os.path.join(SORTIE, "min"), exist_ok=True)
fiches, slugs = [], set()
manque_illus = 0
for dossier, type_fiche, groupe, cat in GROUPES:
    erdb_tout = json.load(open(os.path.join(config.ERDB, dossier + ".json")))
    nom_f, desc_f, eff_f = FMG[cat]
    for nom_en, e in erdb_tout.items():
        iid = e["id"]
        n = fr(nom_f).get(iid) or nom_en
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
        # Où le trouver
        ou = []
        for mid in lieux_objets.get(k, []):
            m = reperes.get(mid)
            if m:
                ou.append({"t": "carte", "id": mid, "comment": m.get("d") or "Ramassé sur place",
                           "pres": m.get("pres", ""), "z": m.get("z", ""), "sous": m["s"]})
        ou += boutiques.get(k, []) + recompenses.get(k, [])
        for qui, pc in sorted(butins.get(k, {}).items(), key=lambda x: -x[1])[:6]:
            ou.append({"t": "butin", "qui": qui, "pc": pc})
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
fiche_par_cle = {}
i = 0
for dossier, type_fiche, groupe, cat in GROUPES:
    for nom_en, e in json.load(open(os.path.join(config.ERDB, dossier + ".json"))).items():
        fiche_par_cle[f"{cat}:{e['id']}"] = fiches[i]["s"]
        i += 1
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
        cle = f"{cat}:{iid - iid % 100 if cat == 2 and iid < 50000000 else iid}"
        s = fiche_par_cle.get(cle)
        if s and s not in [o["s"] for o in objets]:
            f = fiche_par_s[s]
            objets.append({"s": s, "i": f.get("i"), "n": f["n"]})
    stats = [r[k] for k in ("baseVit", "baseWil", "baseEnd", "baseStr", "baseDex", "baseMag", "baseFai", "baseLuc")]
    classes.append({"stats": stats, "objets": objets})
json.dump(classes, open(os.path.join(os.path.dirname(INDEX), "classes.json"), "w"), ensure_ascii=False, separators=(",", ":"))
print("classes :", [len(c["objets"]) for c in classes], file=sys.stderr)

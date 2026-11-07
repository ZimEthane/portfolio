"""Guides de quêtes pas à pas : chaque étape avec sa carte annotée (cible, site de grâce de départ, direction, distance).

Ranni a un guide détaillé écrit à la main (RANNI ci-dessous). Les autres quêtes reprennent les étapes du guide
(chapitres de la progression) et y ajoutent la carte : le script reconnaît dans chaque étape les lieux, les
personnages et les objets cités, et les place grâce aux données du jeu (voir extraire_carte.py).

À lancer après extraire_carte.py et extraire_objets.py :
    python scripts/carte-elden-ring/extraire_quetes.py
Sortie : public/guides/elden-ring/quetes/quetes.json
"""
import json, math, os, re, sys, unicodedata
from bs4 import BeautifulSoup
import config

SITE = os.path.join("public", "guides", "elden-ring")
donnees = json.load(open(os.path.join(SITE, "carte", "donnees.json")))["marqueurs"]
objets = {o["s"]: o for o in json.load(open(os.path.join(SITE, "objets", "objets.json")))["objets"]}
index_objets = json.load(open(os.path.join("src", "guides", "elden-ring", "objets", "index.json")))
calage = json.load(open(os.path.join("scripts", "carte-elden-ring", "calage-cartes.json")))
par_id = {m["id"]: m for m in donnees}

def norme(t):
    t = unicodedata.normalize("NFKD", t or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", t).strip()

# ---------- Index des lieux et des personnages ----------
lieux = {}
for m in donnees:
    if m["c"] in ("graces", "lieux"):
        for n in (m["n"], m.get("en")):
            if n and len(norme(n)) > 3:
                lieux.setdefault(norme(n), []).append(m)
graces = [m for m in donnees if m["c"] == "graces"]

def pnj(motif):
    r = re.compile(motif, re.I)
    return [m for m in donnees if m["c"] in ("pnj", "boss") and (r.search(m["n"]) or r.search(m.get("en") or ""))]

def grace_proche(c, x, y, sauf=None):
    cands = [g for g in graces if g["s"] == c and g["id"] != sauf]
    return min(cands, key=lambda g: (g["x"] - x) ** 2 + (g["y"] - y) ** 2, default=None)

DIRS = ["à l'est", "au nord-est", "au nord", "au nord-ouest", "à l'ouest", "au sud-ouest", "au sud", "au sud-est"]

def direction(de, vers):
    dx, dy = vers["x"] - de["x"], de["y"] - vers["y"]  # y de l'image vers le bas
    d = math.hypot(dx, dy)
    a = (math.degrees(math.atan2(dy, dx)) + 360 + 22.5) % 360
    return round(d / 10) * 10, DIRS[int(a // 45)]

def point(m, role=""):
    return {"x": round(m["x"], 1), "y": round(m["y"], 1), "n": m["n"], "id": m["id"], **({"t": role} if role else {})}

def carte(cible, depart=None, autres=(), via=(), chemin=None):
    """Spécification d'une carte d'étape : cible, site de grâce de départ (le plus proche sinon), autres repères,
    trajet conseillé (points de passage) et texte du chemin."""
    if not cible:
        return None
    if depart is None or depart["id"] == cible["id"] or depart["s"] != cible["s"]:
        # Le site de grâce noté sur le repère tient compte des souterrains (égouts de Leyndell) ; sinon, le plus proche.
        meme = [g for g in graces if g["s"] == cible["s"] and g["n"] == cible.get("pres") and g["id"] != cible["id"]]
        depart = min(meme, key=lambda g: (g["x"] - cible["x"]) ** 2 + (g["y"] - cible["y"]) ** 2, default=None) \
            or grace_proche(cible["s"], cible["x"], cible["y"], sauf=cible["id"])
    spec = {"s": cible["s"], "cible": point(cible), "autres": [point(a) for a in autres if a and a["s"] == cible["s"] and a["id"] != cible["id"]]}
    via = [v for v in via if v and v["s"] == cible["s"]]
    if via:
        spec["via"] = [point(v) for v in via]
    if depart:
        spec["depart"] = point(depart)
        dist, sens = direction(depart, cible)
        spec["chemin"] = chemin or (f"À environ {dist} m {sens} du site de grâce « {depart['n']} »." if dist >= 30 else f"Juste à côté du site de grâce « {depart['n']} ».")
        z = cible.get("z")
        # Donjons fermés (catacombes p30…, grottes p31…, galeries p32…, cimetière p18…) : repères regroupés à l'entrée.
        entree = next((l for l in lieux.get(norme(z or ""), []) if l["c"] == "lieux" and l["id"][:3] in ("p18", "p30", "p31", "p32")
                       and math.hypot(l["x"] - cible["x"], l["y"] - cible["y"]) < 90), None)
        if z and not chemin:
            if entree and math.hypot(entree["x"] - depart["x"], entree["y"] - depart["y"]) < 30:
                spec["chemin"] = f"À l'intérieur de « {z} » : le site de grâce « {depart['n']} » est à l'entrée."
            elif entree:
                d2, s2 = direction(depart, entree)
                spec["chemin"] = f"À l'intérieur de « {z} », dont l'entrée est à environ {d2} m {s2} du site de grâce « {depart['n']} »."
            else:
                spec["chemin"] = f"Dans « {z} ». " + spec["chemin"]
    elif chemin:
        spec["chemin"] = chemin
    return spec

def repere_objet(slug, pres_de=None):
    o = objets.get(slug)
    ms = [par_id[s["id"]] for s in (o or {}).get("ou", []) if s["t"] == "carte" and s.get("id") in par_id]
    if not ms:
        return None
    if pres_de:
        return min(ms, key=lambda m: (m["s"] != pres_de["s"], (m["x"] - pres_de["x"]) ** 2 + (m["y"] - pres_de["y"]) ** 2))
    return ms[0]

def lieu(nom, couche=None):
    ms = lieux.get(norme(nom), [])
    if couche is not None:
        ms = [m for m in ms if m["s"] == couche] or ms
    ms = sorted(ms, key=lambda m: m["c"] != "lieux")
    return ms[0] if ms else None

def obj(nom_en):
    return index_objets.get(nom_en.replace("’", "'").lower())

def lien_objet(nom_en, texte=None):
    s = obj(nom_en)
    n = objets[s]["n"] if s else nom_en
    return f'<a class="er-objet" href="#guides/elden-ring/objets/{s}"><strong>{texte or n}</strong></a>' if s else f"<strong>{texte or n}</strong>"

# ---------- Ranni : guide détaillé ----------
L = lien_objet
def P(motif, i=0):
    r = pnj(motif)
    return r[i] if len(r) > i else None

def G(nom):
    return next((m for m in graces if norme(m["n"]) == norme(nom) or norme(m.get("en")) == norme(nom)), None)

renna, ranni_tour, ranni_cath = P("^Renna la|^Renna the"), next(m for m in pnj("^Ranni") if "Chambre" in (m.get("pres") or "")), next(m for m in pnj("^Ranni") if m["y"] > 5000)
blaidd_tour = next(m for m in pnj("^Blaidd") if "Chambre de Ranni" in (m.get("pres") or ""))
iji_tour = next(m for m in pnj("^Iji le") if m["y"] < 3750)
seluvis_tour = next(m for m in pnj("Seluvis") if m["y"] < 3700)
RANNI = {
    "id": "ranni", "nom": "Ranni la Sorcière", "en": "Ranni the Witch", "detaille": True,
    "resume": "La quête la plus importante du jeu : elle mène à la fin « Âge des Étoiles » et à l'Espadon de la lune obscure. Elle traverse Nécrolimbe, Liurnia, Caelid, la Siofra, Nokron, la rivière Ainsel et le Lac putréfié.",
    "recompenses": [obj(n) for n in ("Spirit Calling Bell", "Lone Wolf Ashes", "Carian Inverted Statue", "Dark Moon Greatsword", "Royal Greatsword")],
    "alertes": [
        "Ne parle pas à Ranni avant d'avoir donné le Black Knifeprint à Rogier et qu'il t'ait demandé d'enquêter sur elle : sa quête serait perdue.",
        "Rends l'Amber Starlight à Seluvis AVANT de donner la Fingerslayer Blade à Ranni : Seluvis et Pidia meurent à ce moment-là.",
        "Ne donne jamais l'Amber Draught de Seluvis à Ranni.",
    ],
    "etapes": [
        {"titre": "Rencontrer Renna à l'Église d'Elleh", "region": "Nécrolimbe", "niveau": "dès le début",
         "texte": f"Une fois <strong>Torrent</strong> obtenu (Melina te le confie après tes premiers sites de grâce), reviens à l'<strong>Église d'Elleh de nuit</strong> : repose-toi au site de grâce et choisis « Attendre jusqu'à la nuit ». Une femme en manteau bleu apparaît dans les ruines, à côté de la grâce : c'est <strong>Renna</strong>. Elle te donne la {L('Spirit Calling Bell')} et les {L('Lone Wolf Ashes')}.",
         "repere": "Une silhouette en manteau bleu et chapeau pointu, debout dans la nef en ruine. Si elle n'est pas là, il fait encore jour.",
         "astuce": "Fais-le avant d'aller à la Table ronde : Renna ne vient plus ensuite. Renna, c'est Ranni sous un autre nom.",
         "carte": carte(renna, lieu("Church of Elleh"))},
        {"titre": "Finir d'abord la partie de Rogier", "region": "Table ronde", "niveau": "avant Liurnia",
         "texte": "Si tu suis aussi la quête de <strong>Rogier</strong> : donne-lui le <strong>Black Knifeprint</strong> (indice de Fia), recharge la zone et reparle-lui jusqu'à ce qu'il te demande d'enquêter sur Ranni. Seulement ensuite, va voir Ranni.",
         "alerte": "Parler à Ranni avant cette étape fait perdre la quête de Rogier.", "carte": None},
        {"titre": "Atteindre la Tour de Ranni par le Manoir de Caria", "region": "Liurnia (nord-ouest)", "niveau": "niv. 40–60",
         "texte": "Traverse le <strong>Manoir de Caria</strong>, au nord-ouest de Liurnia, jusqu'au site de grâce de l'arrière du manoir. Monte l'escalier : bats <strong>Royal Knight Loretta</strong>. Derrière elle, un long pont mène au plateau des <strong>Trois Sœurs</strong> (Three Sisters). La tour bleue au bout, c'est la <strong>Tour de Ranni</strong> (Ranni's Rise).",
         "repere": "Trois tours sur un plateau enneigé : la plus haute, au bout du chemin, est celle de Ranni.",
         "carte": carte(lieu("Ranni's Rise"), lieu("Caria Manor") and grace_proche(0, 2048, 3639), [P("Royal Knight Loretta")])},
        {"titre": "Entrer au service de Ranni", "region": "Tour de Ranni", "niveau": "niv. 40–60",
         "texte": "Monte tout en haut de la tour : <strong>Ranni</strong> est assise dans sa chambre. Parle-lui plusieurs fois et accepte de la servir. Au rez-de-chaussée, parle aux formes spectrales de <strong>Blaidd</strong>, <strong>Iji</strong> et <strong>Seluvis</strong> : ils deviennent tes contacts pour la suite.",
         "repere": "Une poupée à quatre bras, assise à une table, dans la pièce du sommet.",
         "carte": carte(ranni_tour, lieu("Ranni's Rise"), [blaidd_tour, iji_tour, seluvis_tour])},
        {"titre": "Battre Radahn pour ouvrir Nokron", "region": "Caelid (sud-est)", "niveau": "niv. 60–80",
         "texte": "Ranni te demande de trouver la Ville éternelle de <strong>Nokron</strong>. Pour y accéder, il faut battre <strong>Radahn, le Fléau des astres</strong>, pendant le festival du <strong>Château du Lion rouge</strong> : utilise les signes d'invocation près du portail. Après sa mort, une étoile tombe en Nécrolimbe.",
         "astuce": "Le combat est beaucoup plus simple à cheval et avec les PNJ invoqués : laisse-les attirer son attention.",
         "carte": carte(P("Starscourge Radahn"), lieu("Redmane Castle Plaza"))},
        {"titre": "Descendre dans le cratère jusqu'à Nokron", "region": "Nécrolimbe → Nokron", "niveau": "niv. 60–80",
         "texte": "Retourne au site de grâce de l'<strong>Orée des Bois brumeux</strong> (Mistwood Outskirts) : à l'est, l'étoile a creusé un énorme cratère. Descends ses parois en sautant de corniche en corniche jusqu'au fond, puis suis le passage souterrain : tu débouches dans <strong>Nokron, la Ville éternelle</strong>.",
         "repere": "Un trou immense et fumant au milieu de la forêt, là où il n'y avait que des arbres.",
         "carte": carte(lieu("Nokron, Eternal City"), G("Nokron, Eternal City"))},
        {"titre": "Récupérer la Fingerslayer Blade", "region": "Nokron", "niveau": "niv. 60–80",
         "texte": f"Traverse Nokron jusqu'au <strong>Sanctuaire de la nuit</strong> (Night's Sacred Ground). La {L('Fingerslayer Blade')} est dans un coffre, au fond du bâtiment principal.",
         "repere": "Un coffre au milieu d'une grande salle aux colonnes, gardée par des soldats spectraux.",
         "carte": carte(repere_objet(obj("Fingerslayer Blade")) or lieu("Night's Sacred Ground"), lieu("Night's Sacred Ground"))},
        {"titre": "(Avant de la donner) Régler la potion et l'Amber Starlight de Seluvis", "region": "Liurnia, Plateau Altus", "niveau": "optionnel",
         "texte": f"Si tu veux finir la quête de Seluvis : rapporte-lui la {L('Amber Starlight')} (ravin au nord-est du site Altus Highway Junction, avec la Weathered Map de Pidia). Il te propose alors l'{L('Amber Draught')} pour Ranni : ne la lui donne pas.",
         "alerte": "Donner la Fingerslayer Blade à Ranni tue Seluvis et Pidia : fais cette étape avant.",
         "carte": carte(repere_objet(obj("Amber Starlight")))},
        {"titre": "Donner la Fingerslayer Blade à Ranni", "region": "Tour de Ranni", "niveau": "niv. 60–80",
         "texte": f"Remonte voir Ranni et donne-lui la lame. Elle te remet la {L('Carian Inverted Statue')}, puis disparaît après un repos.",
         "carte": carte(ranni_tour, lieu("Ranni's Rise"))},
        {"titre": "Retourner la Salle d'étude de Caria", "region": "Liurnia (nord)", "niveau": "niv. 60–80",
         "texte": f"Pose la statue sur l'autel de la <strong>Salle d'étude de Caria</strong> (Carian Study Hall) : le bâtiment se retourne. Monte jusqu'en haut de la <strong>Tour divine de Liurnia</strong> : la {L('Cursemark of Death')} y attend (elle sert à la quête de Fia).",
         "repere": "Une tour ronde au bord du lac, au nord de Raya Lucaria ; une fois retournée, l'intérieur est à l'envers.",
         "carte": carte(lieu("Carian Study Hall"), lieu("Study Hall Entrance"), [repere_objet(obj("Cursemark of Death"))])},
        {"titre": "Prendre le portail de la Tour de Renna", "region": "Trois Sœurs → rivière Ainsel", "niveau": "niv. 60–80",
         "texte": "Repose-toi : la <strong>Tour de Renna</strong> (Renna's Rise), juste à côté de celle de Ranni, est maintenant ouverte. Monte au sommet et active le portail : il te mène au <strong>Lit principal de l'Ainsel</strong>, sous terre.",
         "carte": carte(lieu("Renna's Rise"), lieu("Ranni's Rise"))},
        {"titre": "Trouver la Ranni miniature", "region": "Rivière Ainsel", "niveau": "niv. 60–80",
         "texte": f"Près du site <strong>Lit principal de l'Ainsel</strong>, ramasse la {L('Miniature Ranni')} : une petite poupée. Parle-lui à plusieurs sites de grâce pour faire avancer la quête, puis descends jusqu'à <strong>Nokstella</strong> et au site <strong>Bassin des cascades de Nokstella</strong>.",
         "carte": carte(lieu("Ainsel River Main"), None, [lieu("Nokstella Waterfall Basin")])},
        {"titre": "Prendre l'Anneau de la lune noire", "region": "Académie de Raya Lucaria", "niveau": "niv. 60–80",
         "texte": f"Dans la <strong>Grande bibliothèque de Raya Lucaria</strong> (la salle de Rennala), ouvre le coffre au fond : {L('Dark Moon Ring')}. C'est l'anneau que tu passeras au doigt de Ranni.",
         "carte": carte(repere_objet(obj("Dark Moon Ring")) or lieu("Raya Lucaria Grand Library"), lieu("Raya Lucaria Grand Library"))},
        {"titre": "Traverser le Lac putréfié et battre Astel", "region": "Lac putréfié", "niveau": "niv. 70–90",
         "texte": "Depuis Nokstella, rejoins les <strong>Rives du Lac putréfié</strong> : la putréfaction te ronge, avance vite d'îlot en îlot (prends des Boluses préservants). Au <strong>Grand cloître</strong>, descends jusqu'au cercueil et laisse-le te porter : tu affrontes <strong>Astel, Naturalborn of the Void</strong>. Derrière lui, l'ascenseur monte à l'<strong>Autel lunaire</strong>.",
         "astuce": "Astel se téléporte et frappe en rafales : reste près de sa tête et esquive vers l'avant.",
         "carte": carte(lieu("Grand Cloister"), None, [lieu("Lake of Rot Shoreside")])},
        {"titre": "Passer l'anneau au doigt de Ranni", "region": "Autel lunaire", "niveau": "niv. 80+",
         "texte": f"À l'Autel lunaire, attention au dragon <strong>Glintstone Dragon Adula</strong>. Entre dans la <strong>Cathédrale de Manus Celes</strong> et descends par le trou dans le sol : le corps de Ranni repose là. Passe-lui l'Anneau de la lune noire au doigt. Tu reçois l'{L('Dark Moon Greatsword')} et la fin « Âge des Étoiles » est débloquée.",
         "repere": "Une grande cathédrale en ruine au centre de l'Autel lunaire ; le trou est derrière l'autel.",
         "carte": carte(ranni_cath, lieu("Cathedral of Manus Celes"), [P("Glintstone Dragon Adula")])},
        {"titre": "Libérer Blaidd", "region": "Tour de Ranni", "niveau": "niv. 80+",
         "texte": f"Après l'anneau, <strong>Blaidd</strong> est devenu fou devant la Tour de Ranni. Bats-le : il laisse son set et l'{L('Royal Greatsword')}. Parle aussi à la mini Ranni au sommet de la tour, et à <strong>Iji</strong>.",
         "carte": carte(blaidd_tour, lieu("Ranni's Rise"))},
        {"titre": "Fin « Âge des Étoiles »", "region": "Leyndell en cendres", "niveau": "fin du jeu",
         "texte": "Après le dernier boss, au lieu de réparer le Cercle d'Elden, utilise le signe d'invocation de Ranni à côté de Marika : c'est la fin « Âge des Étoiles » (trophée).",
         "carte": None},
    ],
}

# ---------- Autres quêtes : étapes du guide + cartes ----------
QUETES = [
    ("blaidd", "Blaidd le Semi-loup", r"\bBlaidd\b"), ("seluvis", "Seluvis et Pidia", r"Seluvis|Pidia"), ("rogier", "Rogier", r"Rogier"),
    ("fia", "Fia", r"\bFia\b"), ("d", "D, chasseur de morts", r"\bD\b(?!·)|\bD,|Gurranq"), ("sellen", "Sellen la Sorcière", r"Sellen"),
    ("alexander", "Alexander, la jarre guerrière", r"Alexander"), ("millicent", "Millicent et Gowry", r"Millicent|Gowry"),
    ("hyetta", "Hyetta et Irina", r"Hyetta|Irina|Edgar"), ("varre", "Varré le Blême", r"Varr[ée]"), ("patches", "Patches", r"Patches"),
    ("boc", "Boc le couturier", r"\bBoc\b"), ("yura", "Yura", r"\bYura\b"), ("kenneth", "Kenneth Haight", r"Kenneth"),
    ("nepheli", "Nepheli Loux", r"Nepheli"), ("rya", "Rya et le Manoir du Volcan", r"\bRya\b|Tanith|Volcano Manor|Manoir du Volcan"),
    ("diallos", "Diallos", r"Diallos|Lanya"), ("bernahl", "Bernahl", r"Bernahl"), ("thops", "Thops", r"Thops"),
    ("roderika", "Roderika", r"Roderika"), ("latenna", "Latenna et Albus", r"Latenna|Albus"), ("corhyn", "Corhyn et Goldmask", r"Corhyn|Goldmask"),
    ("dung-eater", "Le Coprophage (Dung Eater)", r"Dung Eater|Coprophage"), ("boggart", "Blackguard Big Boggart", r"Boggart"),
    ("jarburg", "Jarburg et Jar Bairn", r"Jarburg|Jar Bairn|Diallos"), ("gideon", "Gideon Ofnir", r"Gideon"), ("miriel", "Miriel", r"Miriel"),
]

soupe = BeautifulSoup(open(config.GUIDE, encoding="utf-8").read(), "html.parser")

def lier_objets(li):
    for fort in li.find_all(["strong", "b"]):
        if fort.find_parent("a"):
            continue
        n = re.sub(r"\s*[×x]\s*\d+$", "", fort.get_text().replace("’", "'")).strip().lower()
        s = index_objets.get(n) or index_objets.get(re.sub(r"\s*\(.*\)$", "", n))
        if s:
            a = soupe.new_tag("a", href=f"#guides/elden-ring/objets/{s}", **{"class": "er-objet"})
            fort.wrap(a)
    return li

def bbox_chapitre(h1):
    """Emprise (en pixels de la grande carte) des cartes d'un chapitre, pour départager les homonymes."""
    boites = []
    for el in h1.find_all_next():
        if el.name == "h1" and "chapter" in (el.get("class") or []) and el is not h1:
            break
        if el.name == "image":
            m = re.search(r"carte-\d+", el.get("href", ""))
            if m and m.group(0) + ".webp" in calage:
                c = calage[m.group(0) + ".webp"]
                (_, _, tx), (_, _, ty) = c["M"]
                boites.append((0 if c["carte"] == "surface" else 1, tx, ty, tx + c["taille"][0] * c["echelle"], ty + c["taille"][1] * c["echelle"]))
    return boites

def dans(m, boites):
    return any(m["s"] == s and x0 - 300 <= m["x"] <= x1 + 300 and y0 - 300 <= m["y"] <= y1 + 300 for s, x0, y0, x1, y1 in boites)

def carte_etape(li, motif, boites):
    forts = [f.get_text(" ", strip=True) for f in li.find_all(["strong", "b"])]
    texte = li.get_text(" ", strip=True)
    places = [lieu(f) for f in forts if lieu(f)]
    places = [p for p in places if not boites or dans(p, boites)] or places
    ref = places[0] if places else None
    gr = next((p for p in places if p["c"] == "graces"), None)
    # 1. le personnage de la quête, s'il est cité
    if motif and re.search(motif, texte):
        cands = [m for m in pnj(motif) if m["c"] == "pnj"]
        if ref:
            cands = [m for m in cands if m["s"] == ref["s"] and math.hypot(m["x"] - ref["x"], m["y"] - ref["y"]) < 700]
        elif boites:
            cands = [m for m in cands if dans(m, boites)]
        if cands:
            c = min(cands, key=lambda m: math.hypot(m["x"] - (ref or m)["x"], m["y"] - (ref or m)["y"]))
            return carte(c, gr)
    # 2. un objet cité, placé sur la carte
    for f in forts:
        s = index_objets.get(f.replace("’", "'").lower())
        if s:
            m = repere_objet(s, ref)
            if m and (not boites or dans(m, boites)) and (not ref or math.hypot(m["x"] - ref["x"], m["y"] - ref["y"]) < 900):
                return carte(m, gr)
    # 3. le lieu cité
    if ref:
        lieu_pref = next((p for p in places if p["c"] == "lieux"), ref)
        return carte(lieu_pref, gr if gr and gr["id"] != lieu_pref["id"] else None)
    return None

etapes_guide = []  # (chapitre, titre de quête, li)
chap, slug_chap, boites = "", "", []
for el in soupe.find_all(["h1", "h4"]):
    if el.name == "h1" and "chapter" in (el.get("class") or []):
        chap = el.select_one(".ch-label").get_text(" ", strip=True) if el.select_one(".ch-label") else ""
        m = re.match(r"Chapitre (\d+)", chap)
        slug_chap = f"chapitre-{m.group(1)}" if m else ""
        boites = bbox_chapitre(el)
        continue
    if el.name == "h4" and "quest" in (el.get("class") or []) and slug_chap:
        ol = el.find_next_sibling("ol")
        if ol:
            for li in ol.find_all("li", recursive=False):
                etapes_guide.append((chap, slug_chap, el.get_text(" ", strip=True), li, boites))

# ---------- Guides détaillés écrits à la main (quetes_detaillees.py) ----------
import types
import quetes_detaillees

def N(prefixe, pres=None, i=0):
    """Personnage (ou boss) dont le nom commence par « prefixe » ; « pres » : morceau du site de grâce le plus proche."""
    p = norme(prefixe)
    ms = [m for m in donnees if m["c"] in ("pnj", "boss") and (norme(m["n"]).startswith(p) or norme(m.get("en")).startswith(p))]
    if pres:
        ms = [m for m in ms if norme(pres) in norme(m.get("pres") or "")]
    return ms[i] if len(ms) > i else None

SLUG = re.compile(r"#guides/elden-ring/objets/([\w-]+)")

def E(titre, region, niveau, texte, carte=None, repere=None, astuce=None, alerte=None):
    e = {"titre": titre, "region": region, "niveau": niveau, "texte": texte, "carte": carte}
    for k, v in (("repere", repere), ("astuce", astuce), ("alerte", alerte)):
        if v:
            e[k] = v
    objets_cites = list(dict.fromkeys(SLUG.findall(texte)))
    if objets_cites:
        e["objets"] = objets_cites
    return e

def M(nom_en, i=0):
    """Repère de n'importe quelle catégorie (envahisseur, lieu…) par son nom anglais."""
    ms = [m for m in donnees if m.get("en") == nom_en]
    return ms[i] if len(ms) > i else None

api = types.SimpleNamespace(N=N, M=M, Li=lambda n: lieu(n), G=G, OM=lambda en, pres=None: repere_objet(obj(en), pres), carte=carte, o=lien_objet, E=E)
DETAILLEES = quetes_detaillees.quetes(api)
for q in DETAILLEES:
    q["detaille"] = True
    q["recompenses"] = [obj(r) for r in q.get("recompenses", []) if obj(r)]
    for i, e in enumerate(q["etapes"]):
        if e.get("carte") is None and not any(k in e["texte"] for k in ("Table ronde",)):
            print(f"  (sans carte) {q['id']} #{i + 1} {e['titre']}", file=sys.stderr)
for e in RANNI["etapes"]:
    objets_cites = list(dict.fromkeys(SLUG.findall(e.get("texte", ""))))
    if objets_cites:
        e["objets"] = objets_cites
RANNI["region"] = "Nécrolimbe, Liurnia, Caelid, Siofra, Ainsel"

# Illustration d'en-tête (écrans de chargement du jeu, public/guides/elden-ring/img/ambiance)
FONDS = {"ranni": "lune", "blaidd": "necrolimbe", "rogier": "voilorage", "fia": "racines", "d": "prairie", "alexander": "caelid",
         "millicent": "caelid", "irina": "prairie", "hyetta": "liurnia", "varre": "chateau-ombrage", "patches": "grace", "nepheli": "voilorage",
         "volcan": "volcan", "sellen": "caria", "goldmask": "leyndell", "dung-eater": "chateau-ombrage", "boc": "dragon", "yura": "prairie",
         "thops": "liurnia", "latenna": "caria", "roderika": "grace", "jarbairn": "liurnia", "seluvis": "caria", "kenneth": "necrolimbe"}
for q in [RANNI] + DETAILLEES:
    q["fond"] = FONDS.get(q["id"], "table-ronde")
quetes = [RANNI] + DETAILLEES
ids_detailles = {q["id"] for q in quetes} | {"rya", "corhyn", "boggart", "jarburg", "hyetta", "kenneth", "nepheli"}
for qid, nom, motif in QUETES:
    if qid in ids_detailles:
        continue
    etapes = []
    for chap, slug_chap, titre, li, boites in etapes_guide:
        if re.search(motif, titre) or re.search(motif, li.get_text(" ", strip=True)):
            spec = carte_etape(li, motif, boites)
            html = "".join(str(x) for x in lier_objets(li).contents)
            etapes.append({"chapitre": chap, "lien": slug_chap, "html": html, "carte": spec})
    if etapes:
        quetes.append({"id": qid, "nom": nom, "etapes": etapes})

# ---------- Envahisseurs : une page faite à partir des données (où ils apparaissent, ce qu'ils laissent) ----------
objets_liste = json.load(open(os.path.join(SITE, "objets", "objets.json")))
for f_ in objets_liste["objets"]:
    f_["ou"] = [x for x in f_.get("ou", []) if x["t"] != "quete"]  # relance : on refait les liens vers les quêtes
regions_cartes = json.load(open(os.path.join(SITE, "carte", "donnees.json"))).get("regions", {})
def region_m(m):
    g = grace_proche(m["s"], m["x"], m["y"])
    return regions_cartes.get(g["id"], "") if g else ""
CONDITIONS_ENV = {
    "Mad Tongue Alberich": "Il t'envahit quand tu sautes du balcon dans la grande salle basse de la Table ronde.",
    "Ensha of the Royal Remains": "Il t'envahit à la Table ronde dès que tu as ramassé une moitié du Médaillon secret de l'Arbre-Sacré, et revient à chaque visite tant qu'il n'est pas vaincu. Son set t'attend ensuite là où il se tenait.",
    "Edgar the Revenger": "Pendant la quête d'Irina : après le drame du Château de Vent-Hurlant, repose-toi au site de grâce de la Cabane du vengeur.",
    "Eleonora, Violet Bloody Finger": "Pendant la quête de Yura.",
    "Knight of the Great Jar": "Les trois duels du défi de la Grande jarre (signes rouges devant elle).",
    "Festering Fingerprint Vyke": "Il t'envahit près de l'Église de l'inhibition, au nord de Liurnia (sur la route du village de la Flamme exaltée).",
    # Tarnished Pack : envahisseurs ordinaires (pas de condition de quête), présents seulement si tu as le pack.
    "Knight Leontiel": "Tarnished Pack : elle t'envahit quand tu approches de ce secteur de Caelid, autour du Château du Lion rouge.",
    "The Noble Broken Mask": "Tarnished Pack : il t'envahit dans la Leyndell d'avant l'incendie, près du Sanctuaire de l'Arbre-Monde. Il n'existe pas dans la Capitale des cendres : fais-le avant de brûler l'Arbre-Monde.",
}
par_marqueur = {}
for f_ in objets_liste["objets"]:
    for x in f_.get("ou", []):
        for i_ in ([x["id"]] if x["t"] == "carte" and x.get("id") else []) + x.get("ids", []):
            par_marqueur.setdefault(i_, []).append(f_["s"])
envs = {}
for m in donnees:
    # Les envahisseurs, plus les personnages qui envahissent à un moment de leur histoire (Ensha à la Table ronde)
    if m["c"] == "envahisseurs" or (m["c"] == "pnj" and m.get("en") in CONDITIONS_ENV):
        envs.setdefault(m.get("en") or m["n"], []).append(m)
etapes_env = []
for en_nom, ms in sorted(envs.items(), key=lambda kv: (region_m(kv[1][0]), kv[1][0]["n"])):
    lache = list(dict.fromkeys(s_ for m in ms for s_ in par_marqueur.get(m["id"], [])))
    if not lache:
        continue  # esprits invoqués et figurants : rien à récupérer
    m0 = ms[0]
    ou = f"près du site de grâce <strong>{m0.get('pres')}</strong>" if m0.get("pres") else "à l'endroit indiqué sur la carte"
    cond_ = CONDITIONS_ENV.get(en_nom, 'Envahisseur PNJ : il apparaît quand tu approches de cet endroit (parfois seulement à une étape précise d’une quête).')
    elle_ = " elle " in cond_
    texte = f"{cond_} {'On la trouve' if elle_ else 'On le trouve'} {ou}. {'Elle laisse' if elle_ else 'Il laisse'} : " + \
        ", ".join(lien_objet(objets[s_]["en"]) for s_ in lache if s_ in objets) + "."
    e = E(m0["n"], region_m(m0), "", texte, carte(m0))
    e["objets"] = lache
    etapes_env.append(e)
quetes.append({"id": "envahisseurs", "nom": "Tous les envahisseurs PNJ", "en": "NPC invaders", "detaille": True, "fond": "table-ronde",
               "resume": "Chaque envahisseur PNJ du jeu de base qui laisse quelque chose : où il apparaît et ce qu'il lâche (armes, armures, talismans…). Les conditions particulières sont précisées ; sinon, il suffit d'approcher.",
               "region": "Toute la carte", "recompenses": list(dict.fromkeys(s_ for e in etapes_env for s_ in e["objets"])), "etapes": etapes_env})

# ---------- Tableaux : trouver le tableau, puis l'endroit peint, où l'esprit du peintre laisse sa récompense ----------
ennemis_json = json.load(open(os.path.join(SITE, "carte", "ennemis.json")))
AIDE_TABLEAUX = {
    '"Homing Instinct" Painting': "La vue est prise au bord de la mer, au nord-ouest du site de grâce des Ruines côtières, au sud des Ruines brûlées par le dragon.",
    '"Resurrection" Painting': "L'endroit peint se trouve au Manoir de Caria, dans les étages.",
    '"Champion\'s Song" Painting': "L'endroit peint est la falaise au sud-ouest du site de grâce Chemin des remparts (là où l'on affronte Lansseax), face à la Tombe du héros canonisé.",
    '"Sorcerer" Painting': "L'endroit peint est dans les Champs enneigés consacrés, près de la Grotte des parias.",
    '"Prophecy" Painting': "L'endroit peint est derrière l'Église des pèlerins, sur la Péninsule larmoyante.",
    '"Flightless Bird" Painting': "L'endroit peint est le village des moulins (Hauteurs aux moulins, Plateau Altus), au-delà des danseuses.",
    '"Redmane" Painting': "L'endroit peint est en contrebas des falaises du Tertre draconique, au sud-est de l'Arbre-Monde mineur.",
}
etapes_tab = []
for en_t, aide_t in AIDE_TABLEAUX.items():
    s_t = obj(en_t)
    if not s_t:
        continue
    o_t = objets[s_t]
    recomp = [f_["s"] for f_ in objets_liste["objets"] for x in f_.get("ou", []) if (x.get("tableau") or {}).get("s") == s_t]
    marque = next((par_id[x["id"]] for f_ in objets_liste["objets"] for x in f_.get("ou", []) if (x.get("tableau") or {}).get("s") == s_t and x.get("id") in par_id), None)
    src_t = next((x for x in o_t.get("ou", []) if x["t"] == "recompense"), {})
    ou_t = src_t.get("quoi", "")
    texte = (f"Le {lien_objet(en_t)} se trouve ici : <strong>{ou_t}</strong>. Examine-le, puis rends-toi à l'endroit qu'il représente. {aide_t} "
             f"L'esprit du peintre y apparaît (seulement si tu as le tableau) et laisse : " + ", ".join(lien_objet(objets[r]["en"]) for r in recomp) + ".")
    pt_t = None
    if src_t.get("ids") and src_t["ids"][0] in par_id:
        pt_t = par_id[src_t["ids"][0]]
    elif src_t.get("e") and ennemis_json.get(src_t["e"], {}).get("p"):
        s_, x_, y_ = ennemis_json[src_t["e"]]["p"][0]
        pt_t = {"id": f"tab-{s_t}", "s": s_, "x": x_, "y": y_, "n": o_t["n"], "c": "objets-cles"}
    e = E(o_t["n"].replace("Tableau : ", "").replace("Tableau\xa0: ", ""), ou_t.split(" – ")[0], "", texte, carte(marque, None, [pt_t] if pt_t else []) if marque else None)
    e["objets"] = [s_t] + recomp
    etapes_tab.append(e)
if etapes_tab:
    quetes.append({"id": "tableaux", "nom": "Les sept tableaux du peintre", "en": "Artist's Paintings", "detaille": True, "fond": "caria",
                   "resume": "Sept tableaux cachés dans les Cabanes de l'artiste et les châteaux. Chacun montre un paysage : va à l'endroit peint et l'esprit du peintre te laisse une récompense.",
                   "region": "Toute la carte", "recompenses": list(dict.fromkeys(s_ for e in etapes_tab for s_ in e["objets"])), "etapes": etapes_tab})

# ---------- Tarnished Pack : où récupérer chaque objet du pack (d'après les sources de l'encyclopédie) ----------
ORDRE_REGIONS = ["Nécrolimbe", "Péninsule larmoyante", "Château de Voilorage", "Liurnia, contrée lacustre", "Caelid", "Marais d'Ivoine",
                 "Tertre draconique de Greyoll", "Plateau Altus", "Abords de la capitale", "Leyndell, capitale royale", "Bastion de la Table ronde"]
env_par_nom = {m.get("en") or m["n"]: m for m in donnees if m["c"] == "envahisseurs"}
groupes_pack = {}
for f_ in objets_liste["objets"]:
    if not f_.get("pack"):
        continue
    for x in f_.get("ou", []):
        if x["t"] == "carte" and x.get("id") in par_id:
            cle_, m = ("carte", x["id"]), par_id[x["id"]]
        elif x["t"] in ("boutique", "recompense") and x.get("ids") and x["ids"][0] in par_id:
            cle_, m = (x["t"], x.get("qui") or x["ids"][0]), par_id[x["ids"][0]]
        else:
            continue
        g = groupes_pack.setdefault(cle_, {"src": x, "m": m, "objets": []})
        if f_["s"] not in g["objets"]:
            g["objets"].append(f_["s"])
def rang_region(g):
    r = region_m(g["m"])
    return (ORDRE_REGIONS.index(r) if r in ORDRE_REGIONS else len(ORDRE_REGIONS), r, g["m"]["n"])
etapes_pack = []
for g in sorted(groupes_pack.values(), key=rang_region):
    x, m = g["src"], g["m"]
    liens = ", ".join(lien_objet(objets[s_]["en"]) for s_ in g["objets"])
    pres = f" Site de grâce le plus proche : <strong>{m['pres']}</strong>." if m.get("pres") else ""
    if x["t"] == "carte":
        titre = objets[g["objets"][0]]["n"]
        texte = f"{x.get('comment') or 'Ramassé sur place'} : {liens}.{pres}"
    elif x["t"] == "boutique":
        titre = x["qui"]
        prix = {s_: next((y.get("prix") for y in objets[s_].get("ou", []) if y["t"] == "boutique" and y.get("qui") == x["qui"]), None) for s_ in g["objets"]}
        texte = "En vente : " + ", ".join(lien_objet(objets[s_]["en"]) + (f" ({prix[s_]:,} runes)".replace(",", " ") if prix[s_] else "") for s_ in g["objets"]) + "." + pres
        if x.get("perle"):
            texte += f" Si tu as donné la {x['perle']['n']} aux Carcasses des Servantes jumelles, elles vendent aussi tout ça à la Table ronde."
    else:
        titre = (x.get("chez") or [m["n"]])[0]
        cond = CONDITIONS_ENV.get(m.get("en") or "", "Il t'envahit quand tu approches de cet endroit.").replace("Tarnished Pack : ", "")
        texte = f"{cond[0].upper() + cond[1:]} Il laisse : {liens}.{pres}".replace("Il laisse", "Elle laisse" if titre.startswith("Chevaleresse") else "Il laisse")
    e = E(titre, region_m(m), "", texte, carte(m))
    e["objets"] = g["objets"]
    etapes_pack.append(e)
classes_pack = [o for o in objets_liste["objets"] if any(y["t"] == "depart" and y.get("pack") for y in o.get("ou", []))]
if classes_pack:
    par_classe = {}
    for o in classes_pack:
        for y in o["ou"]:
            if y["t"] == "depart" and y.get("pack"):
                for c_ in y["classes"]:
                    par_classe.setdefault(c_, []).append(o["s"])
    texte = "Si tu crées un nouveau personnage, les deux classes du pack partent avec leur équipement : " + " ; ".join(
        f"<strong>{c_}</strong> : " + ", ".join(lien_objet(objets[s_]["en"]) for s_ in ss) for c_, ss in par_classe.items()) +         ". Avec un personnage existant, tout s'achète chez les marchands ci-dessous."
    e = E("Les deux nouvelles classes", "Création du personnage", "", texte)
    e["objets"] = [s_ for ss in par_classe.values() for s_ in ss]
    etapes_pack.insert(0, e)
if etapes_pack:
    quetes.append({"id": "tarnished-pack", "nom": "Tarnished Pack : tout récupérer", "en": "Tarnished Pack", "detaille": True, "fond": "table-ronde",
                   "resume": "Le DLC payant de la version 1.17 ajoute deux classes, des armes, quatre tenues, deux envahisseurs et trois apparences pour Torrent. Rien de tout ça n'apparaît dans le monde sans le pack.",
                   "region": "Toute la carte", "recompenses": list(dict.fromkeys(s_ for e in etapes_pack for s_ in e["objets"])), "etapes": etapes_pack})

# ---------- Objets donnés par les personnages de chaque quête (noms de lignes Paramdex), en plus de ceux cités ----------
QUETE_PNJ = {
    "ranni": ["Ranni the Witch", "Renna"], "blaidd": ["Blaidd is the Half-Wolf", "Blaidd", "War Counselor Iji", "Iji"],
    "rogier": ["Sorcerer Rogier"], "fia": ["Fia", "Prince of Death's Throne"], "d": ["D- Hunter of the Dead", "Prince of Death's Throne"],
    "alexander": ["Iron Fist Alexander"], "millicent": ["Millicent", "Gowry"], "irina": ["Irina", "Edgar"], "hyetta": ["Hyetta", "Shabriri"],
    "varre": ["White-Faced Varre"], "patches": ["Patches"], "nepheli": ["Nepheli Loux", "Gatekeeper Gostoc", "Kenneth Haight"],
    "volcan": ["Tanith", "Rya", "Zorayas", "Juno Hoslow", "Rileigh the Idle", "Old Knight Istvan"],
    "sellen": ["Sorceress Sellen", "Witch-Hunter Jerren", "Master Lusat", "Master Azur"], "goldmask": ["Goldmask", "Brother Corhyn"],
    "dung-eater": ["Dung Eater", "Big Boggart"], "boc": ["Boc"], "yura": ["Bloody Finger Hunter Yura", "[Bloody Finger Hunter Yura", "Eleonora- Violet Bloody Finger"],
    "thops": ["Thops"], "latenna": ["Latenna"], "roderika": ["Roderika", "Hewg"], "jarbairn": ["Jar Bairn"],
    "seluvis": ["Seluvis", "Preceptor Seluvis", "Pidia- Carian Servant"], "kenneth": ["Kenneth Haight"], "bernahl": ["Knight Bernahl"], "miriel": ["Miriel- Pastor of Vows"],
    "gurranq": ["Gurranq"], "ensha": ["Ensha of the Royal Remains"], "albus": ["Albus"], "gideon": ["Gideon Ofnir"],
    "grande-jarre": ["The Great-Jar"], "melina": ["Melina"], "enia": ["Enia", "Finger Reader Enia"],
}
BRUTES = json.load(open(os.path.join(config.DOSSIER, "sources-brutes.json")))
def parties_brut(b):
    t, nom = b.split(":", 1)
    return t, [norme(x) for x in re.split(r"\s+[-–/]\s+", nom)]
noms_quete = {qid: {norme(n) for n in ns} for qid, ns in QUETE_PNJ.items()}
pnj_sans_quete = {}
for slug_, bruts in BRUTES.items():
    for b in bruts:
        t, parts = parties_brut(b)
        if t == "boutique" and not any("quest" in p for p in parts[1:]):
            continue  # boutique ordinaire : déjà indiquée comme source, pas une récompense de quête
        for q in quetes:
            if noms_quete.get(q["id"], set()) & set(parts) and slug_ in objets:
                q.setdefault("recompenses", [])
                if slug_ not in q["recompenses"]:
                    q["recompenses"].append(slug_)
# Lien de chaque objet vers les quêtes qui en parlent (étape qui le cite, sinon récompense de la quête)
par_objet_quete = {}
for q in quetes:
    for i, e in enumerate(q["etapes"]):
        for s_ in e.get("objets", []):
            par_objet_quete.setdefault(s_, {}).setdefault(q["id"], (i, e.get("titre") or e.get("chapitre") or ""))
    for s_ in q.get("recompenses", []):
        par_objet_quete.setdefault(s_, {}).setdefault(q["id"], (None, ""))
nom_quete = {q["id"]: q["nom"] for q in quetes}
for f_ in objets_liste["objets"]:
    for qid, (i, titre) in par_objet_quete.get(f_["s"], {}).items():
        f_.setdefault("ou", []).append({"t": "quete", "q": qid, "n": nom_quete[qid], **({"i": i, "et": titre} if i is not None else {})})
json.dump(objets_liste, open(os.path.join(SITE, "objets", "objets.json"), "w"), ensure_ascii=False, separators=(",", ":"))
print("liens objets → quêtes :", sum(len(v) for v in par_objet_quete.values()), "pour", len(par_objet_quete), "objets", file=sys.stderr)

os.makedirs(os.path.join(SITE, "quetes"), exist_ok=True)
json.dump({"quetes": quetes}, open(os.path.join(SITE, "quetes", "quetes.json"), "w"), ensure_ascii=False, separators=(",", ":"))
n = sum(len(q["etapes"]) for q in quetes)
c = sum(1 for q in quetes for e in q["etapes"] if e.get("carte"))
print(len(quetes), "quêtes,", n, "étapes,", c, "avec carte", file=sys.stderr)
print([(q["id"], len(q["etapes"])) for q in quetes], file=sys.stderr)

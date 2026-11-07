"""Contrôle du guide « 100 % » : chaque objet de l'encyclopédie doit avoir une source, et au moins un endroit à montrer
sur la carte (ou une raison claire de ne pas en avoir : équipement de départ, souvenir, aide de jeu).

    python scripts/carte-elden-ring/verifier_objets.py      (après extraire_carte.py --site et extraire_objets.py)
Code de sortie 1 s'il reste un objet sans source ou sans carte.
"""
import collections, json, sys

O = json.load(open("public/guides/elden-ring/objets/objets.json"))["objets"]
D = {m["id"] for m in json.load(open("public/guides/elden-ring/carte/donnees.json"))["marqueurs"]}
E = json.load(open("public/guides/elden-ring/carte/ennemis.json"))
PAR_S = {f["s"]: f for f in O}
R = {t[0] for t in json.load(open("public/guides/elden-ring/carte/ressources.json"))["types"]}
SANS_CARTE = {"depart", "souvenir", "aide"}  # raisons acceptées de ne rien montrer sur la carte

def cibles(f, vus=None):
    """Repères (et groupes d'ennemis / ressources) qu'on peut montrer pour cet objet, en suivant les liens vers d'autres fiches."""
    vus = vus or set()
    if f["s"] in vus:
        return set()
    vus.add(f["s"])
    res = set()
    for src in f.get("ou", []):
        if src["t"] == "carte" and src["id"] in D:
            res.add(src["id"])
        res |= {i for i in src.get("ids", []) if i in D}
        if src.get("e") and E.get(src["e"], {}).get("p"):
            res.add("ennemi:" + src["e"])
        if src["t"] == "cueillette" and any(k in R for k in src.get("k", [])):
            res.add("ressource:" + f["s"])
        # Comme sur la carte : le livre de recettes (ou, recette connue d'emblée, les ingrédients), la version
        # d'origine d'une pièce retouchée, la larme qui améliore la fiole, l'arme qui porte la cendre.
        livres = [l.get("s") for l in src.get("livres", []) if l.get("s")]
        liens = livres or [l.get("s") for l in src.get("ingredients", [])]
        liens = liens + [l.get("s") for l in src.get("armes", [])] + \
            ([src.get("s")] if src["t"] in ("fiole", "retouche") else [])  # retouche : dans les deux sens (elle s'annule)
        for s in filter(None, liens):
            if s in PAR_S:
                res |= cibles(PAR_S[s], vus)
    return res

sans_source = [f for f in O if not f.get("ou")]
sans_carte = [f for f in O if f.get("ou") and not cibles(f) and not ({s["t"] for s in f["ou"]} & SANS_CARTE)]
types = collections.Counter(s["t"] for f in O for s in f.get("ou", []))
print(f"{len(O)} objets — sources : {dict(types)}")
print(f"sans aucune source : {len(sans_source)}")
for f in sans_source:
    print("   ", f["t"], "|", f["n"], "|", f["en"])
print(f"avec source mais rien à montrer sur la carte : {len(sans_carte)}")
for f in sans_carte:
    print("   ", f["t"], "|", f["n"], "|", f["en"], "|", [s.get("qui") or s.get("quoi") or s["t"] for s in f["ou"]][:3])
# Références cassées : repère, groupe d'ennemis, ressource ou fiche liée qui n'existe pas
casses = []
for f in O:
    for src in f.get("ou", []):
        ids = ([src["id"]] if src["t"] == "carte" else []) + src.get("ids", [])
        casses += [(f["n"], "repère", i) for i in ids if i not in D]
        if src.get("e") and not E.get(src["e"], {}).get("p"):
            casses.append((f["n"], "ennemis", src["e"]))
        casses += [(f["n"], "ressource", k) for k in src.get("k", []) if k not in R]
        for l in src.get("livres", []) + src.get("ingredients", []) + src.get("armes", []) + ([src] if src["t"] in ("retouche", "fiole") else []):
            if l.get("s") and l["s"] not in PAR_S:
                casses.append((f["n"], "fiche", l["s"]))
print(f"références cassées : {len(casses)}")
for c in casses[:40]:
    print("   ", *c)
sys.exit(1 if sans_source or sans_carte or casses else 0)

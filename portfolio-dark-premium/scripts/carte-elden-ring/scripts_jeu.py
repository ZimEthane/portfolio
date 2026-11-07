"""Lecture des scripts du jeu : événements (EMEVD) et dialogues (ESD).

Ils disent quel objet est donné par quel personnage ou quel événement : un lot d'objets (ItemLotParam) cité dans les
arguments d'une instruction, à côté de l'identifiant d'entité (MSB) du personnage ou de l'objet concerné ; un lot
ou une boutique cité dans le dialogue d'un personnage (fichier t<talkId>.esd).
Fichiers : <ER_DONNEES>/decompresse/event/*.emevd et decompresse/talk/*.esd (voir decompresser.py --scripts).
"""
import glob, os, struct
import config

DOSSIER_EVENT = os.path.join(config.JEU, "event")
DOSSIER_TALK = os.path.join(config.JEU, "talk")


def emevd(b):
    """Événements d'un fichier EMEVD (Elden Ring, 64 bits) : [(id, [(banque, instruction, [entiers])], paramètres)]."""
    assert b[:4] == b"EVD\0", b[:4]
    # En-tête (depuis 0x10) : (compte, position) des événements, instructions, ?, couches, paramètres,
    # fichiers liés, puis (taille, position) des arguments et des chaînes.
    h = struct.unpack_from("<16q", b, 0x10)
    n_ev, o_ev, o_ins, o_par, o_args = h[0], h[1], h[3], h[9], h[13]
    res = []
    for i in range(n_ev):
        eid, n, o, n_p, o_p = struct.unpack_from("<qqqqq", b, o_ev + i * 0x30)
        ins = []
        for j in range(n):
            banque, num, taille, oa = struct.unpack_from("<iiqq", b, o_ins + o + j * 0x20)
            vals = list(struct.unpack_from(f"<{taille // 4}i", b, o_args + oa)) if taille >= 4 else []
            ins.append((banque, num, vals))
        # Paramètres : (instruction, octet visé dans ses arguments, octet source dans les arguments de l'appel, taille)
        params = [struct.unpack_from("<qqqi", b, o_par + o_p + k * 0x20) for k in range(n_p)]
        res.append((eid, ins, params))
    return res


def tous_les_evenements():
    """{nom de carte: événements} pour tous les fichiers EMEVD disponibles."""
    res = {}
    for f in sorted(glob.glob(os.path.join(DOSSIER_EVENT, "*.emevd"))):
        try:
            res[os.path.basename(f)[:-6]] = emevd(open(f, "rb").read())
        except Exception:
            pass
    return res


def constantes_esd(b):
    """Entiers littéraux des expressions d'un script de dialogue (octet 0x82 suivi d'un entier 32 bits)."""
    vals = set()
    i = b.find(b"\x82")
    while i != -1 and i + 5 <= len(b):
        vals.add(struct.unpack_from("<i", b, i + 1)[0])
        i = b.find(b"\x82", i + 1)
    return vals


def tous_les_dialogues():
    """{talkId: constantes} pour tous les scripts de dialogue (t<talkId>.esd)."""
    res = {}
    for f in glob.glob(os.path.join(DOSSIER_TALK, "t*.esd")):
        try:
            res[int(os.path.basename(f)[1:-4])] = constantes_esd(open(f, "rb").read())
        except ValueError:
            pass
    return res

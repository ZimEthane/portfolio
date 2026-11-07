import souls, functools
import os
from config import JEU
BASE = os.path.join(JEU, "msg", "%s", "item_dlc02.msgbnd")

@functools.lru_cache(None)
def _bnd(langue):
    return {n.split("/")[-1]: d for n, d in souls.bnd4(open(BASE % langue, "rb").read()).items()}

@functools.lru_cache(None)
def fmg(nom, langue="frafr"):
    b = _bnd(langue)
    out = {}
    for suf in ("", "_dlc01", "_dlc02"):
        k = f"{nom}{suf}.fmg"
        if k in b:
            out.update({i: t for i, t in souls.fmg(b[k]).items() if t and t != "[ERROR]"})
    return out

@functools.lru_cache(None)
def fmg_menu(nom, langue="frafr"):
    """Textes de l'interface (menu.msgbnd et extensions) : régions du voyage rapide, etc."""
    out = {}
    for suf in ("", "_dlc01", "_dlc02"):
        chemin = os.path.join(JEU, "msg", langue, f"menu{suf}.msgbnd")
        if not os.path.exists(chemin):
            continue
        b = {n.split("/")[-1]: d for n, d in souls.bnd4(open(chemin, "rb").read()).items()}
        for k in (f"{nom}.fmg", f"{nom}_dlc01.fmg", f"{nom}_dlc02.fmg"):
            if k in b:
                out.update({i: t for i, t in souls.fmg(b[k]).items() if t and t != "[ERROR]"})
    return out

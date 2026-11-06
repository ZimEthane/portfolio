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

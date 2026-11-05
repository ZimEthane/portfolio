"""Conversion des coordonnées du jeu vers des coordonnées globales m60 (mètres)."""
import paramdef, functools, souls
from config import REGULATION

# Tous les params du jeu : {nom de fichier: octets}
P = {n.split("/")[-1]: b for n, b in souls.bnd4(souls.regulation(open(REGULATION, "rb").read())).items()}

@functools.lru_cache(None)
def _legacy():
    L, _, _ = paramdef.lire(P, "WorldMapLegacyConvParam.param", "WorldMapLegacyConvParam")
    return [r for r in L.values() if r.get("isBasePoint")] + [r for r in L.values() if not r.get("isBasePoint")]

def vers_global(area, gx, gz, x, y, z, profondeur=0):
    """Renvoie (aire_finale, X, Y, Z) en coordonnées globales (aire 60/61) ou None."""
    if area in (60, 61):
        return area, gx * 256 + x, y, gz * 256 + z
    if profondeur > 4:
        return None
    for r in _legacy():
        if r["srcAreaNo"] == area and r["srcGridXNo"] == gx and r["srcGridZNo"] == gz:
            nx = x - r["srcPosX"] + r["dstPosX"]
            ny = y - r["srcPosY"] + r["dstPosY"]
            nz = z - r["srcPosZ"] + r["dstPosZ"]
            res = vers_global(r["dstAreaNo"], r["dstGridXNo"], r["dstGridZNo"], nx, ny, nz, profondeur + 1)
            if res:
                return res
    return None

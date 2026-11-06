"""Décompresse les fichiers .dcx d'Elden Ring avec la DLL Oodle fournie avec le jeu,
puis range le résultat dans decompresse.zip (cartes MSB + textes FR/EN).

Utilisation (dans E:\\ER-extraction) :  python decompresser.py
"""
import ctypes, glob, os, struct, sys, zipfile, zlib

ICI = os.path.dirname(os.path.abspath(__file__))
JEU = os.path.join(ICI, "Game")
dll = ctypes.WinDLL(os.path.join(JEU, "oo2core_6_win64.dll"))
oodle = dll.OodleLZ_Decompress
oodle.restype = ctypes.c_int64
oodle.argtypes = [ctypes.c_void_p, ctypes.c_int64, ctypes.c_void_p, ctypes.c_int64,
                  ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_void_p, ctypes.c_int64,
                  ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_int64, ctypes.c_int]

def dcx(data):
    taille, comp = struct.unpack(">II", data[0x1C:0x24])
    fmt = data[0x28:0x2C]
    corps = data[0x4C:0x4C + comp]
    if fmt == b"DFLT":
        return zlib.decompress(corps)
    if fmt != b"KRAK":
        raise ValueError(fmt)
    sortie = ctypes.create_string_buffer(taille + 64)
    n = oodle(corps, len(corps), sortie, taille, 1, 0, 0, None, 0, None, None, None, 0, 3)
    if n != taille:
        raise ValueError("Oodle a renvoyé %d au lieu de %d" % (n, taille))
    return sortie.raw[:taille]

fichiers = sorted(glob.glob(os.path.join(JEU, "map", "mapstudio", "*.msb.dcx")))
for langue in ("frafr", "engus"):
    fichiers += sorted(glob.glob(os.path.join(JEU, "msg", langue, "*.msgbnd.dcx")))

erreurs = 0
with zipfile.ZipFile(os.path.join(ICI, "decompresse.zip"), "w", zipfile.ZIP_DEFLATED) as z:
    for i, chemin in enumerate(fichiers, 1):
        nom = os.path.relpath(chemin, JEU).replace("\\", "/")[:-4]
        try:
            z.writestr(nom, dcx(open(chemin, "rb").read()))
        except Exception as e:
            erreurs += 1
            print("ERREUR", nom, e)
        if i % 50 == 0 or i == len(fichiers):
            print("%d / %d" % (i, len(fichiers)))
print("Terminé :", len(fichiers) - erreurs, "fichiers OK,", erreurs, "erreur(s) -> decompresse.zip")

"""Extrait d'Elden Ring tout ce qui peut servir au guide : images (objets, écrans de chargement, tutoriels,
interface, tuiles de carte de l'extension) et scripts (événements, dialogues).

À lancer dans E:\\ER-extraction (à côté du dossier Game déjà extrait avec UXM) :
    pip install -U pillow
    python extraire_tout.py

Résultat : des archives extraction-images-N.zip (300 Mo maximum chacune) et extraction-donnees.zip.
"""
import concurrent.futures as cf
import ctypes, glob, io, os, struct, sys, time, zipfile, zlib

ICI = os.path.dirname(os.path.abspath(__file__))
JEU = os.path.join(ICI, "Game")
TAILLE_MAX_ZIP = 300 * 1024 * 1024

# ---------- Décompression (DLL Oodle fournie avec le jeu) ----------
_oodle = None

def oodle():
    global _oodle
    if _oodle is None:
        dll = ctypes.WinDLL(os.path.join(JEU, "oo2core_6_win64.dll"))
        f = dll.OodleLZ_Decompress
        f.restype = ctypes.c_int64
        f.argtypes = [ctypes.c_void_p, ctypes.c_int64, ctypes.c_void_p, ctypes.c_int64, ctypes.c_int, ctypes.c_int, ctypes.c_int,
                      ctypes.c_void_p, ctypes.c_int64, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_int64, ctypes.c_int]
        _oodle = f
    return _oodle

def dcx(data):
    if data[:4] != b"DCX\0":
        return data
    taille, comp = struct.unpack(">II", data[0x1C:0x24])
    fmt, corps = data[0x28:0x2C], data[0x4C:0x4C + comp]
    if fmt == b"DFLT":
        return zlib.decompress(corps)
    if fmt == b"ZSTD":
        import zstandard
        return zstandard.ZstdDecompressor().decompress(corps, max_output_size=taille)
    if fmt != b"KRAK":
        raise ValueError(f"compression inconnue {fmt}")
    sortie = ctypes.create_string_buffer(taille + 64)
    n = oodle()(corps, len(corps), sortie, taille, 1, 0, 0, None, 0, None, None, None, 0, 3)
    if n != taille:
        raise ValueError(f"Oodle a renvoyé {n} au lieu de {taille}")
    return sortie.raw[:taille]

# ---------- Archives BND4 / BHF4 (en-têtes) ----------
def _s16(b, o):
    e = o
    while b[e:e + 2] != b"\0\0":
        e += 2
    return b[o:e].decode("utf-16-le")

def entrees(entete):
    """[(nom, décalage, taille)] d'un BND4 ou d'un BHF4 (les données d'un BHF4 sont dans le .bdt voisin)."""
    assert entete[:4] in (b"BND4", b"BHF4"), entete[:4]
    bit_big = not entete[0xA]
    nb = struct.unpack_from("<i", entete, 0xC)[0]
    hsize = struct.unpack_from("<q", entete, 0x20)[0]
    unicode = entete[0x30] == 1
    brut = entete[0x31]
    fmt = brut if (bit_big or ((brut & 1) and not (brut & 0x80))) else int(f"{brut:08b}"[::-1], 2)
    res, o = [], 0x40
    for _ in range(nb):
        p = o + 8
        taille = struct.unpack_from("<q", entete, p)[0]; p += 8
        if fmt & 0x20:
            p += 8
        if fmt & 0x10:
            dec = struct.unpack_from("<q", entete, p)[0]; p += 8
        else:
            dec = struct.unpack_from("<I", entete, p)[0]; p += 4
        if fmt & 0x02:
            p += 4
        nom = ""
        if fmt & 0x0C:
            no = struct.unpack_from("<i", entete, p)[0]
            nom = _s16(entete, no) if unicode else entete[no:entete.index(b"\0", no)].decode("shift_jis", "replace")
        res.append((nom.replace("\\", "/").split("/")[-1], dec, taille))
        o += hsize
    return res

# ---------- Textures (TPF → DDS → WebP) ----------
def textures(data):
    assert data[:4] == b"TPF\0", data[:4]
    nb, enc = struct.unpack_from("<i", data, 8)[0], data[0xE]
    o, res = 0x10, []
    for _ in range(nb):
        dec, taille, _fmt, _typ, _mips, flags, no, flt = struct.unpack_from("<IiBBBBIi", data, o)
        o += 20
        if flt == 1:
            o += 8 + struct.unpack_from("<i", data, o + 4)[0]
        nom = _s16(data, no) if enc == 1 else data[no:data.index(b"\0", no)].decode("shift_jis", "replace")
        octets = data[dec:dec + taille]
        if flags in (2, 3):
            octets = dcx(octets)
        res.append((nom, octets))
    return res

def en_webp(dds, qualite):
    from PIL import Image
    im = Image.open(io.BytesIO(dds))
    im.load()
    if im.mode not in ("RGB", "RGBA"):
        im = im.convert("RGBA")
    out = io.BytesIO()
    im.save(out, "WEBP", quality=qualite, method=4)
    return out.getvalue()

def traiter(tache):
    """Une tâche : (fichier source, décalage, taille, nom dans l'archive, dossier de sortie, qualité)."""
    source, dec, taille, nom, dossier, qualite = tache
    res, erreurs = [], []
    try:
        with open(source, "rb") as f:
            f.seek(dec)
            brut = f.read(taille) if taille else f.read()
        for tex, dds in textures(dcx(brut)):
            try:
                res.append((f"{dossier}/{tex}.webp", en_webp(dds, qualite)))
            except Exception as e:  # format non lu par Pillow : on garde la texture d'origine
                res.append((f"{dossier}/brut/{tex}.dds", dds))
                erreurs.append(f"{nom}/{tex} : gardé en .dds ({e})")
    except Exception as e:
        erreurs.append(f"{nom} : {e}")
    return res, erreurs

# ---------- Ce qu'on extrait ----------
def taches_images():
    t = []
    menu = os.path.join(JEU, "menu")
    # Illustrations des objets, écrans de chargement, images des tutoriels
    bhd = os.path.join(menu, "hi", "00_solo.tpfbhd")
    dossiers = {"MENU_Knowledge": "objets", "MENU_Load": "chargement", "MENU_Tuto": "tutoriels"}
    for nom, dec, taille in entrees(open(bhd, "rb").read()):
        d = next((v for k, v in dossiers.items() if nom.startswith(k)), "divers")
        t.append((bhd[:-3] + "bdt", dec, taille, nom, f"images/{d}", 90))
    # Interface : icônes, pictogrammes de la carte, titres, création de personnage
    for f in ("01_common", "02_title", "03_chrmake", "06_platform"):
        chemin = os.path.join(menu, "hi", f + ".tpf.dcx")
        if os.path.exists(chemin):
            t.append((chemin, 0, 0, f, f"images/interface/{f}", 92))
    # Tuiles les plus détaillées de la carte de l'extension (M10, M11) ; celles du jeu de base sont déjà faites
    bhd = os.path.join(menu, "71_maptile.tpfbhd")
    for nom, dec, taille in entrees(open(bhd, "rb").read()):
        if "_L0_" in nom and ("_M10_" in nom or "_M11_" in nom):
            t.append((bhd[:-3] + "bdt", dec, taille, nom, "images/carte-tuiles/" + nom.split("_")[2], 92))
    return t

def fichiers_donnees():
    motifs = ["menu/71_maptile.mtmskbnd.dcx", "menu/hi/01_common.sblytbnd.dcx",
              "event/*.emevd.dcx", "script/talk/*.talkesdbnd.dcx", "msg/*/*.msgbnd.dcx"]
    res = []
    for m in motifs:
        res += sorted(glob.glob(os.path.join(JEU, *m.split("/"))))
    return res

class Zips:
    """Écrit les fichiers dans extraction-images-1.zip, -2.zip… sans dépasser TAILLE_MAX_ZIP."""
    def __init__(self, prefixe):
        self.prefixe, self.n, self.z, self.taille = prefixe, 0, None, 0
    def ajouter(self, nom, octets):
        if self.z is None or self.taille + len(octets) > TAILLE_MAX_ZIP:
            self.fermer()
            self.n += 1
            self.z = zipfile.ZipFile(os.path.join(ICI, f"{self.prefixe}-{self.n}.zip"), "w", zipfile.ZIP_STORED)
            self.taille = 0
        self.z.writestr(nom, octets)
        self.taille += len(octets)
    def fermer(self):
        if self.z:
            self.z.close()
            self.z = None

def main():
    debut = time.time()
    erreurs = []
    taches = taches_images()
    print(f"{len(taches)} archives de textures à convertir…")
    zips = Zips("extraction-images")
    nb_images = 0
    with cf.ProcessPoolExecutor(max_workers=max(1, (os.cpu_count() or 2) - 1)) as pool:
        for i, (res, err) in enumerate(pool.map(traiter, taches, chunksize=4), 1):
            for nom, octets in res:
                zips.ajouter(nom, octets)
                nb_images += 1
            erreurs += err
            if i % 100 == 0 or i == len(taches):
                print(f"  {i} / {len(taches)}  ({nb_images} images, {int(time.time() - debut)} s)")
    zips.fermer()

    print("Scripts et textes…")
    with zipfile.ZipFile(os.path.join(ICI, "extraction-donnees.zip"), "w", zipfile.ZIP_DEFLATED) as z:
        for chemin in fichiers_donnees():
            nom = os.path.relpath(chemin, JEU).replace("\\", "/")
            try:
                z.writestr(nom[:-4] if nom.endswith(".dcx") else nom, dcx(open(chemin, "rb").read()))
            except Exception as e:
                erreurs.append(f"{nom} : {e}")
        z.writestr("erreurs.txt", "\n".join(erreurs))

    print(f"\nTerminé en {int(time.time() - debut)} s : {nb_images} images dans {zips.n} archive(s) extraction-images-N.zip,"
          f" plus extraction-donnees.zip. {len(erreurs)} avertissement(s) (liste dans erreurs.txt du zip de données).")

if __name__ == "__main__":
    main()

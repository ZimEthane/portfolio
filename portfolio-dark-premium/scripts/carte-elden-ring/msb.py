"""Lecture partielle des MSB d'Elden Ring (modèles, événements, parties)."""
import struct

def _s16(b, o):
    e = o
    while b[e:e + 2] != b"\0\0":
        e += 2
    return b[o:e].decode("utf-16-le")

def listes(b):
    """Renvoie {nom_liste: [offsets des entrées]}."""
    assert b[:4] == b"MSB ", b[:4]
    o = 0x10
    out = {}
    while o:
        ver, count, noff = struct.unpack_from("<iiq", b, o)
        nom = _s16(b, noff)
        offs = list(struct.unpack_from("<%dq" % (count - 1), b, o + 16))
        nxt = struct.unpack_from("<q", b, o + 16 + 8 * (count - 1))[0]
        out[nom] = offs
        o = nxt
    return out

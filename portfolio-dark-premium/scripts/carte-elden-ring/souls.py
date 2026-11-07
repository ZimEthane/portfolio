"""Lecture minimale des formats FromSoftware (DCX, BND4, FMG, PARAM) pour Elden Ring."""
import struct, zlib
import ooz

ER_REG_KEY = bytes.fromhex("99BFFC366A6BC8C6F5827D093602D676C42892A01C207FB024D3AF4E493FEF99")

def kraken(src: bytes, usize: int) -> bytes:
    """Oodle Kraken : le jeu redémarre le décodeur tous les 256 Ko, on décode donc chaque bloc séparément
    (le décodeur libre « ooz » ne sait pas enchaîner les blocs d'Elden Ring)."""
    if usize <= 0x40000:
        return ooz.decompress(src, usize)
    out, pos = bytearray(), 0
    while len(out) < usize:
        n = min(0x40000, usize - len(out))
        b0, b1 = src[pos], src[pos + 1]
        if (b0 >> 6) & 1:  # bloc non compressé
            debut = pos + 2
            out += src[debut:debut + n]
            pos = debut + n
            continue
        q = pos + 2
        v = (src[q] << 16) | (src[q + 1] << 8) | src[q + 2]
        taille = v & 0x3FFFF
        fin = q + (6 if b1 >> 7 else 3) + (taille + 1 if taille != 0x3FFFF else 1)
        out += ooz.decompress(src[pos:fin], n)
        pos = fin
    return bytes(out)

def dcx(data: bytes) -> bytes:
    assert data[:4] == b"DCX\0", data[:4]
    usize, csize = struct.unpack(">II", data[0x1C:0x24])
    fmt = data[0x28:0x2C]
    off = 0x4C
    if fmt == b"KRAK":
        return kraken(data[off:off + csize], usize)
    if fmt == b"ZSTD":
        import zstandard
        return zstandard.ZstdDecompressor().decompress(data[off:off + csize], max_output_size=usize)
    if fmt == b"DFLT":
        return zlib.decompress(data[off:off + csize])
    raise ValueError(fmt)

def regulation(raw: bytes) -> bytes:
    from Crypto.Cipher import AES
    iv, body = raw[:16], raw[16:]
    dec = AES.new(ER_REG_KEY, AES.MODE_CBC, iv).decrypt(body[: len(body) // 16 * 16])
    return dcx(dec)

def _cstr16(b, o):
    e = o
    while b[e:e + 2] != b"\0\0":
        e += 2
    return b[o:e].decode("utf-16-le")

def _cstr(b, o):
    return b[o:b.index(b"\0", o)].decode("shift_jis", "replace")

def bnd4(data: bytes):
    """Renvoie {nom: octets} d'une archive BND4."""
    assert data[:4] == b"BND4", data[:4]
    bit_big = not data[0xA]
    count = struct.unpack_from("<i", data, 0xC)[0]
    hsize = struct.unpack_from("<q", data, 0x20)[0]
    unicode = data[0x30] == 1
    raw = data[0x31]
    reverse = bit_big or ((raw & 1) and not (raw & 0x80))
    fmt = raw if reverse else int(f"{raw:08b}"[::-1], 2)
    out = {}
    o = 0x40
    for _ in range(count):
        p = o + 8
        csize = struct.unpack_from("<q", data, p)[0]; p += 8
        if fmt & 0x20:
            p += 8
        if fmt & 0x10:
            doff = struct.unpack_from("<q", data, p)[0]; p += 8
        else:
            doff = struct.unpack_from("<I", data, p)[0]; p += 4
        if fmt & 0x02:
            p += 4
        name = ""
        if fmt & 0x0C:
            noff = struct.unpack_from("<i", data, p)[0]; p += 4
            name = _cstr16(data, noff) if unicode else _cstr(data, noff)
        out[name.replace("\\", "/")] = data[doff:doff + csize]
        o += hsize
    return out

def fmg(data: bytes):
    """Renvoie {id: texte} d'un fichier FMG (Elden Ring, 64 bits)."""
    groups = struct.unpack_from("<i", data, 0xC)[0]
    strings = struct.unpack_from("<i", data, 0x10)[0]
    soff = struct.unpack_from("<q", data, 0x18)[0]
    out = {}
    g = 0x28
    for _ in range(groups):
        si, first, last = struct.unpack_from("<iii", data, g)
        for k, i in enumerate(range(first, last + 1)):
            po = struct.unpack_from("<q", data, soff + (si + k) * 8)[0]
            if po:
                out[i] = _cstr16(data, po)
        g += 16
    return out

def param_rows(data: bytes):
    """Renvoie (type, [(id, nom, octets)]) d'un PARAM Elden Ring (sans paramdef)."""
    strings_off = struct.unpack_from("<I", data, 0)[0]
    rows_off = struct.unpack_from("<H", data, 4)[0]
    count = struct.unpack_from("<H", data, 0xA)[0]
    flags = data[0x2D]
    ptype_off = struct.unpack_from("<q", data, 0x10)[0]
    ptype = _cstr(data, ptype_off)
    rows = []
    hdr = 0x40
    offs = []
    for i in range(count):
        rid, _, doff, noff = struct.unpack_from("<iiqq", data, hdr + i * 24)
        offs.append((rid, doff, noff))
    starts = sorted(set(d for _, d, _ in offs))
    size = (starts[1] - starts[0]) if len(starts) > 1 else 0
    for rid, doff, noff in offs:
        name = _cstr16(data, noff) if noff else ""
        rows.append((rid, name, data[doff:doff + size]))
    return ptype, rows, size

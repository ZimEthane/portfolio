"""Lecture des lignes de PARAM avec les définitions XML de Paramdex."""
import re, struct, xml.etree.ElementTree as ET
from souls import param_rows

from config import PARAMDEX
DEFS = PARAMDEX + "/Defs/"
TYPES = {"s8": ("b", 1), "u8": ("B", 1), "s16": ("h", 2), "u16": ("H", 2), "s32": ("i", 4),
         "u32": ("I", 4), "f32": ("f", 4), "angle32": ("f", 4), "b32": ("i", 4), "f64": ("d", 8)}

def champs(defname):
    root = ET.parse(DEFS + defname + ".xml").getroot()
    out, off, bit_unit, bit_pos, bit_type = [], 0, 0, 0, None
    for f in root.iter("Field"):
        d = f.get("Def").split("=")[0].strip()
        typ, rest = d.split(None, 1)
        m = re.match(r"(\w+)(?::(\d+))?(?:\[(\d+)\])?", rest)
        name, bits, arr = m.group(1), m.group(2), m.group(3)
        if bits and typ == "dummy8":
            typ = "u8"
        if bits and typ in TYPES:
            size = TYPES[typ][1]
            if bit_type != typ or bit_pos + int(bits) > size * 8:
                if bit_type is not None:
                    off += TYPES[bit_type][1]
                bit_unit, bit_pos, bit_type = off, 0, typ
            out.append((name, typ, bit_unit, bit_pos, int(bits)))
            bit_pos += int(bits)
            continue
        if bit_type is not None:
            off += TYPES[bit_type][1]
            bit_type = None
        n = int(arr) if arr else 1
        if typ in ("dummy8",):
            off += n
            continue
        if typ == "fixstr":
            out.append((name, "fixstr", off, n, 0)); off += n; continue
        if typ == "fixstrW":
            out.append((name, "fixstrW", off, n, 0)); off += 2 * n; continue
        fmt, size = TYPES[typ]
        if n == 1:
            out.append((name, typ, off, 0, 0))
        else:
            for k in range(n):
                out.append((f"{name}{k}", typ, off + k * size, 0, 0))
        off += size * n
    if bit_type is not None:
        off += TYPES[bit_type][1]
    return out, off

def lire(params, fichier, defname):
    ptype, rows, size = param_rows(params[fichier])
    flds, total = champs(defname)
    res = {}
    for rid, nom, b in rows:
        r = {"_nom": nom}
        for name, typ, off, a, bits in flds:
            if off >= len(b):
                continue
            if typ == "fixstr":
                r[name] = b[off:off + a].split(b"\0")[0].decode("shift_jis", "replace")
            elif typ == "fixstrW":
                r[name] = b[off:off + 2 * a].decode("utf-16-le", "replace").split("\0")[0]
            elif bits:
                fmt, sz = TYPES[typ]
                if off + sz > len(b):
                    continue
                v = int.from_bytes(b[off:off + sz], "little")
                r[name] = (v >> a) & ((1 << bits) - 1)
            elif off + TYPES[typ][1] <= len(b):
                r[name] = struct.unpack_from("<" + TYPES[typ][0], b, off)[0]
        res[rid] = r
    return res, size, total

"""Emplacements des fichiers sources (voir README.md). Dossier de travail : variable ER_DONNEES."""
import os

DOSSIER = os.environ.get("ER_DONNEES", "donnees-elden-ring")
REGULATION = os.path.join(DOSSIER, "regulation.bin")          # Game/regulation.bin
JEU = os.path.join(DOSSIER, "decompresse")                     # contenu de decompresse.zip (decompresser.py)
ERDB = os.path.join(DOSSIER, "erdb", "1.10.0")                 # sortie de « erdb generate »
ICONES = os.path.join(DOSSIER, "icones")                       # sortie de « erdb icons »
PARAMDEX = os.path.join(DOSSIER, "Paramdex", "ER")             # github.com/soulsmods/Paramdex
GUIDE = os.path.join("src", "guides", "elden-ring", "guide.html")
SORTIE = os.path.join("public", "guides", "elden-ring", "carte")

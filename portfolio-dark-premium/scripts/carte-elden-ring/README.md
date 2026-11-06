# Carte interactive Elden Ring : extraction des données

Les repères de la carte (`public/guides/elden-ring/carte/`) sont extraits des fichiers du jeu. Rien n'est copié d'un autre site.

| Repère | Source |
|---|---|
| Sites de grâce | `BonfireWarpParam` (regulation.bin) |
| Lieux et donjons | `WorldMapPointParam` |
| Objets posés dans le monde | événements « trésor » des cartes MSB + `ItemLotParam_map` |
| Objets lâchés une seule fois | ennemis des MSB + `NpcParam` + lots avec drapeau d'obtention |
| Boss | ennemis marqués boss dans `NpcParam`, reconnus grâce aux noms de lignes de [Paramdex](https://github.com/soulsmods/Paramdex) et reliés aux fiches du bestiaire |
| Personnages | ennemis nommés qui ont un dialogue |
| Noms français | `msg/frafr/item_dlc02.msgbnd` |
| Icônes des objets | `erdb icons` ([ERDB](https://github.com/EldenRingDatabase/erdb)) |

Les cartes (`erdb map`) sont à l'échelle 1 pixel = 1 mètre. Le calage des deux couches est dans `CALAGE` (extraire_carte.py) : il a été vérifié en superposant les sites de grâce aux images.

Ce que contiennent les donjons fermés (catacombes, grottes, galeries, Cimetière abandonné, Table ronde) n'a pas de vraie place sur la carte du monde : leurs coordonnées converties tombent 30 à 150 m autour de l'entrée. On les regroupe donc en spirale autour de l'entrée, en suivant le lien du jeu entre la carte `mAA_BB` et son repère `WorldMapPointParam` `AABB00`, avec « À l'intérieur : … » dans la fiche. La Prison souterraine des parias et les Ruines des falaises gardent leur position (cartographiées au bon endroit), avec le nom du lieu.

## Mettre à jour

1. Sur le PC où le jeu est installé : extraire le jeu avec UXM Selective Unpack, puis lancer `erdb map`, `erdb icons` et `erdb generate` (voir la doc d'ERDB).
2. Toujours sur ce PC, copier `decompresser.py` à côté du dossier `Game` et le lancer. Il décompresse les cartes MSB et les textes avec la DLL Oodle fournie avec le jeu, puis crée `decompresse.zip`.
3. Créer le dossier de travail (variable `ER_DONNEES`, `donnees-elden-ring` par défaut) :
   ```
   donnees-elden-ring/
     regulation.bin        ← Game/regulation.bin
     decompresse/          ← contenu de decompresse.zip
     erdb/1.10.0/          ← JSON d'erdb generate
     icones/               ← sortie d'erdb icons
     Paramdex/             ← git clone https://github.com/soulsmods/Paramdex
   ```
4. Depuis la racine du projet :
   ```
   pip install ooz zstandard pycryptodome beautifulsoup4 pillow   # ooz : paquet « pyooz »
   python scripts/carte-elden-ring/extraire_carte.py --site
   python scripts/carte-elden-ring/tuiles.py carte-surface.jpg public/guides/elden-ring/carte/surface 6
   python scripts/carte-elden-ring/tuiles.py carte-souterrain.jpg public/guides/elden-ring/carte/souterrain 6
   ```
   (Les tuiles ne sont à refaire que si les images de carte changent.)

Limites actuelles : le jeu de base seulement (les fichiers de l'extension ne sont pas reconnus par UXM), et 6 boss du bestiaire sans repère.

## Guides de quêtes

`quetes_detaillees.py` contient les guides écrits à la main (une étape = titre, région, niveau, texte, carte, « à reconnaître », astuce, alerte). Les positions viennent des données : `N("Millicent", "Église de la putréfaction")` choisit le personnage dont le site de grâce le plus proche contient ce texte, `Li()` un lieu, `G()` un site de grâce, `OM()` un objet. `o("Nom anglais")` crée un lien vers l'encyclopédie et affiche l'illustration de l'objet sous l'étape.

```
python scripts/carte-elden-ring/extraire_quetes.py   # après extraire_carte.py et extraire_objets.py
```

Les illustrations d'en-tête (`public/guides/elden-ring/img/ambiance/`) sont des écrans de chargement du jeu (extraits par `extraire_tout.py`).

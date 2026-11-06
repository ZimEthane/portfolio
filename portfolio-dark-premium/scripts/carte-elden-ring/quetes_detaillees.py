"""Guides de quêtes détaillés, écrits à la main (voir extraire_quetes.py pour Ranni et la mise en forme).

Chaque étape : titre, région, niveau conseillé, texte, carte (cible, site de grâce de départ, autres repères),
« à reconnaître » (ce qu'on voit en jeu), astuce et alerte. Les objets cités avec o("Nom anglais") deviennent
des liens vers l'encyclopédie et s'affichent avec leur illustration sous l'étape.
Les positions viennent des données du jeu : N() personnage, Li() lieu, G() site de grâce, OM() objet sur la carte.
"""


def quetes(a):
    N, Li, G, OM, carte, o, E = a.N, a.Li, a.G, a.OM, a.carte, a.o, a.E
    Q = []

    # ------------------------------------------------------------------ Blaidd
    Q.append({
        "id": "blaidd", "nom": "Blaidd le Semi-loup", "en": "Blaidd the Half-Wolf", "region": "Nécrolimbe, Siofra, Liurnia",
        "resume": "Le fidèle chien de garde de Ranni. Sa quête accompagne celle de Ranni du début à la fin et se conclut par un duel, après lequel il laisse son épée et son set.",
        "recompenses": ["Royal Greatsword", "Blaidd's Armor"],
        "alertes": ["Blaidd devient hostile après que tu as passé l'anneau au doigt de Ranni : finis tout ce qui le concerne avant."],
        "etapes": [
            E("Entendre le loup, puis demander à Kalé", "Nécrolimbe (est)", "dès le début",
              "En passant près des <strong>Ruines des Bois brumeux</strong> (Mistwood Ruins), tu entends un loup hurler. Retourne à l'<strong>Église d'Elleh</strong> et parle au marchand <strong>Kalé</strong> : il t'apprend le geste <strong>Claquement de doigts</strong> (Finger Snap).",
              carte(N("Kalé"), G("Church of Elleh"), [Li("Mistwood Ruins")]), repere="Kalé est assis près du feu, dans les ruines de l'église."),
            E("Faire le geste sous Blaidd", "Bois brumeux", "dès le début",
              "Retourne aux Ruines des Bois brumeux. Le loup est perché sur un mur, au-dessus de l'escalier qui descend sous terre : place-toi en dessous et fais le geste. <strong>Blaidd</strong> saute à côté de toi. Parle-lui : il cherche <strong>Bloodhound Knight Darriwil</strong>.",
              carte(Li("Mistwood Ruins"), G("Mistwood Outskirts")), repere="Des ruines entourées d'arbres, avec un escalier qui descend vers une porte ; le hurlement vient du haut des murs."),
            E("Battre Darriwil à Forlorn Hound Evergaol", "Nécrolimbe (sud)", "niv. 20+",
              "Rends-toi à la <strong>Prison éternelle du chien perdu</strong> (Forlorn Hound Evergaol), en Nécrolimbe (voir la carte). Une fois dedans, invoque Blaidd avec le signe doré à côté de l'entrée, puis bats <strong>Bloodhound Knight Darriwil</strong> avec lui.",
              carte(Li("Forlorn Hound Evergaol")), astuce="Darriwil frappe vite et de loin : laisse Blaidd l'occuper et frappe dans son dos."),
            E("Le retrouver dans la Siofra", "Siofra (sous Nécrolimbe)", "niv. 30+",
              "Plus tard, Blaidd t'attend au bord de la rivière <strong>Siofra</strong>, près du site <strong>Berge de la Siofra</strong> (descends par l'ascenseur du puits de la Siofra, au sud-est de Nécrolimbe). Il te parle de Ranni et te demande de passer par Seluvis.",
              carte(N("Blaidd", "Berge de la Siofra"), G("Siofra River Bank"))),
            E("Seluvis, puis Sellen", "Liurnia, Nécrolimbe", "niv. 40+",
              "Une fois au service de Ranni, parle au <strong>Précepteur Seluvis</strong> (Tour de Ranni) : il t'envoie chez <strong>Sellen</strong>, aux Ruines du relais, qui te parle de <strong>Radahn</strong>. Retourne à la Siofra : Blaidd te donne rendez-vous au festival de Radahn. Au passage, sur la route du Manoir de Caria, le forgeron géant <strong>Iji</strong> a une option « Blaidd m'envoie » qui ajoute un objet à sa boutique.",
              carte(N("Précepteur Seluvis", "Chambre de Ranni"), G("Ranni's Rise"), [N("Sellen", "Cave du relais")])),
            E("Le festival de Radahn", "Caelid (sud-est)", "niv. 60+",
              "Au <strong>Château du Lion rouge</strong>, invoque Blaidd avec son signe près du portail avant de descendre affronter Radahn. Après le combat, parle-lui sur le champ de bataille.",
              carte(N("Starscourge Radahn"), G("Chamber Outside the Plaza"))),
            E("L'ombre de Blaidd et la Discarded Palace Key", "Rivière Ainsel", "niv. 70+",
              f"Pendant la quête de Ranni, l'ombre de Blaidd apparaît le long de la rivière Ainsel : elle te mène à la {o('Discarded Palace Key')}, qui ouvre le coffre de Rennala à Raya Lucaria (Dark Moon Ring).",
              None),
            E("Le duel final", "Tour de Ranni", "niv. 80+",
              f"Après avoir passé l'anneau au doigt de Ranni, Blaidd est devenu fou devant la <strong>Tour de Ranni</strong>. Bats-le : il laisse l'{o('Royal Greatsword')} et son set. Parle aussi à <strong>Iji</strong> au pied de la tour.",
              carte(N("Blaidd", "Chambre de Ranni"), G("Ranni's Rise"), [N("Iji", "Tour de Ranni")]), alerte="Le combat se déclenche dès que tu t'approches : prépare-toi avant."),
        ]})

    # ------------------------------------------------------------------ Fia, D, Rogier
    Q.append({
        "id": "rogier", "nom": "Rogier le Sorcier", "en": "Sorcerer Rogier", "region": "Voilorage, Table ronde",
        "resume": "Un sorcier blessé que tu croises à Voilorage. Sa quête est courte mais elle déclenche celle de Fia et doit être menée AVANT de rencontrer Ranni.",
        "recompenses": ["Rogier's Rapier", "Spellblade's Pointed Hat"],
        "alertes": ["Parler à Ranni (Tour de Ranni) avant d'avoir donné le Black Knifeprint à Rogier fait perdre la quête."],
        "etapes": [
            E("Le rencontrer dans le Château de Voilorage", "Voilorage", "niv. 20+",
              "Dans le <strong>Château de Voilorage</strong>, au site <strong>Chambre voisine de l'ascenseur</strong> (Rampart Tower), un sorcier assis près de la grâce : <strong>Rogier</strong>. Épuise son dialogue (il vend aussi des sorts).",
              carte(N("Rogier", "Chambre voisine"), G("Rampart Tower"))),
            E("Montrer le Deathroot à D", "Summonwater / Table ronde", "dès le début",
              "Après Godrick, Rogier s'installe à la <strong>Table ronde</strong> (salle de gauche). Parle-lui à chaque visite : il s'affaiblit au fil du temps.",
              None),
            E("Demander à Fia un indice", "Table ronde", "après Godrick",
              f"Laisse <strong>Fia</strong> te tenir dans ses bras, puis reparle-lui en lui disant que tu viens « en secret » de la part de Rogier : elle donne le {o('Knifeprint Clue')}.",
              None),
            E("Trouver le Black Knifeprint", "Liurnia (ouest)", "niv. 30+",
              f"L'indice mène aux <strong>Catacombes des Couteaux noirs</strong> (Black Knife Catacombs), à l'ouest de Liurnia. Explore-les jusqu'au fond : le {o('Black Knifeprint')} y est.",
              carte(Li("Black Knife Catacombs"))),
            E("Rendre l'empreinte à Rogier", "Table ronde", "avant Liurnia nord",
              "Donne le Black Knifeprint à Rogier. Recharge la zone et reparle-lui jusqu'à ce qu'il te demande d'enquêter sur la sorcière Ranni. Tu peux maintenant aller voir Ranni.",
              None, alerte="C'est seulement maintenant que tu peux parler à Ranni sans casser la quête."),
            E("Sa fin", "Table ronde", "après Ranni",
              f"Après avoir rencontré Ranni, reviens voir Rogier : il s'est éteint. Sur sa chaise : sa lettre, son set, la {o('Rogier’s Rapier')} et sa clochette de marchand.",
              None),
        ]})

    Q.append({
        "id": "fia", "nom": "Fia la Compagne mortuaire", "en": "Fia, Deathbed Companion", "region": "Table ronde, Racines profondes",
        "resume": "La quête qui mène à la fin « Âge du Crépuscule ». Elle s'entremêle avec celles de Rogier, D et Ranni, et se termine aux Racines profondes contre Lichdragon Fortissax.",
        "recompenses": ["Mending Rune of the Death-Prince"],
        "alertes": ["À finir avant de brûler l'Arbre-Monde (Forge des Géants) : sinon Fia est perdue.",
                    "Donner le Twinned Armor au frère de D le pousse à tuer Fia."],
        "etapes": [
            E("Se laisser tenir par Fia", "Table ronde", "après Godrick",
              "À la <strong>Table ronde</strong>, Fia est assise dans la salle de gauche. Accepte qu'elle te tienne dans ses bras (bonus temporaire). Épuise son dialogue à chaque visite.",
              None),
            E("Le Knifeprint pour Rogier", "Table ronde", "après Godrick",
              "Mène la quête de <strong>Rogier</strong> en parallèle : Fia te donne l'indice qui mène au Black Knifeprint.",
              None, astuce="Voir le guide de Rogier."),
            E("La Weathered Dagger", "Table ronde", "après Ranni",
              f"Quand Rogier est mort et que tu as parlé à Ranni, Fia te confie une {o('Weathered Dagger')} à remettre à <strong>D</strong>. Donne-la à D : D meurt, Fia s'en va.",
              None, alerte="Ce moment met fin à la quête de D (son frère apparaîtra plus tard)."),
            E("La Cursemark of Death", "Liurnia (Tour divine)", "niv. 60+",
              f"Pendant la quête de Ranni, retourne la <strong>Salle d'étude de Caria</strong> et monte au sommet de la <strong>Tour divine de Liurnia</strong> : la {o('Cursemark of Death')} t'attend.",
              carte(OM("Cursemark of Death") or Li("Divine Tower of Liurnia"), G("Study Hall Entrance"))),
            E("Rejoindre Fia aux Racines profondes", "Profondeurs de Fonderacine", "niv. 80+",
              "Dans les <strong>Profondeurs de Fonderacine</strong> (Deeproot Depths, accessibles depuis Nokron), Fia est allongée au <strong>Trône du Prince de la Mort</strong>. Parle-lui, puis bats ses trois champions (<strong>Fia's Champions</strong>) dans l'arène voisine.",
              carte(N("Fia la", "Trône du Prince"), G("Prince of Death's Throne"), [N("D, Celui", "Trône")])),
            E("Donner la Cursemark et battre Fortissax", "Profondeurs de Fonderacine", "niv. 90+",
              f"Donne la Cursemark of Death à Fia, repose-toi au site de grâce, puis parle-lui : tu entres dans son rêve et affrontes <strong>Lichdragon Fortissax</strong>. Après le combat, ramasse la {o('Mending Rune of the Death-Prince')} sur Fia : elle débloque la fin « Âge du Crépuscule ».",
              carte(N("Fia la", "Trône du Prince"), G("Prince of Death's Throne")), astuce="Fortissax craint la foudre noire : un bouclier qui bloque la foudre aide beaucoup."),
        ]})

    Q.append({
        "id": "d", "nom": "D, chasseur de morts, et son frère", "en": "D, Hunter of the Dead", "region": "Nécrolimbe, Table ronde, Racines profondes",
        "resume": "D chasse les morts-vivants. Il te récompense pour la Tibia Mariner, t'envoie chez Gurranq, puis meurt pendant la quête de Fia. Son frère jumeau apparaît ensuite aux Racines profondes.",
        "recompenses": ["Twinned Armor", "Inseparable Sword"],
        "alertes": ["Donner le Twinned Armor au frère de D le pousse à tuer Fia : à ne faire qu'après la fin de la quête de Fia."],
        "etapes": [
            E("Rencontrer D près de Summonwater", "Nécrolimbe (nord-est)", "dès le début",
              "Sur la route, juste avant le site <strong>Abords du village des Eaux nécromantes</strong> (Summonwater Village Outskirts), un chevalier en armure dorée : <strong>D</strong>. Parle-lui : il chasse les morts-vivants.",
              carte(N("D, traqueur", "Abords du village"), G("Summonwater Village Outskirts"))),
            E("Battre la Tibia Mariner", "Summonwater", "niv. 20+",
              f"Dans le village inondé, juste à côté, bats la <strong>Tibia Mariner</strong> (le passeur sur sa barque) : elle laisse un {o('Deathroot')}.",
              carte(N("Tibia Mariner", "Eaux nécromantes") or Li("Summonwater Village Outskirts"))),
            E("Le retrouver à la Table ronde", "Table ronde", "après Godrick",
              "Montre le Deathroot à D (au village, puis à la Table ronde) : il t'indique le portail du <strong>Sanctuaire bestial</strong>, caché dans les buissons à l'est du village de Summonwater.",
              None),
            E("Gurranq au Sanctuaire bestial", "Caelid (Dragonbarrow)", "dès le portail",
              f"Le portail t'emmène au <strong>Sanctuaire bestial</strong>, au nord-est de Caelid. Donne chaque {o('Deathroot')} à <strong>Gurranq</strong> (9 dans le jeu) : sorts bestiaux, {o('Clawmark Seal')}, et au bout une {o('Ancient Dragon Smithing Stone')}.",
              carte(N("Gurranq"), G("Bestial Sanctum")), alerte="Au 4e Deathroot, Gurranq devient fou : frappe-le jusqu'à ce qu'il se calme, puis continue."),
            E("La mort de D", "Table ronde", "pendant Fia",
              "Quand tu lui remets la Weathered Dagger de Fia, D meurt. Son corps reste à la Table ronde : ramasse son équipement.",
              None),
            E("Le frère de D", "Racines profondes", "niv. 80+",
              f"Aux <strong>Racines profondes</strong>, au Trône du Prince de la Mort, tu croises <strong>D, Celui qui sourit devant la mort</strong>, le jumeau de D. Il te demande l'armure de son frère ({o('Twinned Armor')}).",
              carte(N("D, Celui", "Trône"), G("Prince of Death's Throne")), alerte="Lui donner l'armure avant la fin de Fia : il la tue. Garde-la jusqu'à ce que la quête de Fia soit finie."),
        ]})

    # ------------------------------------------------------------------ Alexander
    Q.append({
        "id": "alexander", "nom": "Alexander, la jarre guerrière", "en": "Alexander, Warrior Jar", "region": "Nécrolimbe, Caelid, Liurnia, Mont Gelmir, Farum Azula",
        "resume": "Un guerrier coincé dans une jarre géante, qui veut devenir le plus fort des combattants. Une des quêtes les plus attachantes du jeu.",
        "recompenses": ["Shard of Alexander", "Alexander's Innards"],
        "etapes": [
            E("Le libérer de son trou", "Stormhill", "dès le début",
              "Sur <strong>Stormhill</strong>, juste à l'ouest du site <strong>Pont-saint</strong> (Saintsbridge), une jarre est coincée dans un trou : <strong>Alexander</strong>. Frappe-la jusqu'à ce qu'elle sorte.",
              carte(N("Alexander", "Pont-saint"), G("Saintsbridge")),
              repere="Une énorme jarre ronde enfoncée dans le sol, qui t'appelle à l'aide quand tu passes."),
            E("Le festival de Radahn", "Caelid (sud-est)", "niv. 50+",
              "Au <strong>Château du Lion rouge</strong>, Alexander participe au festival : parle-lui sur la place, puis invoque-le avec son signe avant Radahn.",
              carte(N("Alexander", "Place du Château"), G("Redmane Castle Plaza"))),
            E("Le dégager à Liurnia", "Liurnia (nord)", "niv. 50+",
              "Après Radahn, Alexander est de nouveau coincé, à Liurnia près de la <strong>Cabane du peintre</strong> (Artist's Shack, au nord du lac). Lance-lui des pots d'huile, puis frappe-le pour le libérer.",
              carte(N("Alexander", "Jarrebourg") or Li("Artist's Shack (Liurnia of the Lakes)"))),
            E("Le lac de lave du Mont Gelmir", "Mont Gelmir", "niv. 70+",
              "Au <strong>Fort Laiedd</strong>, sur le Mont Gelmir, Alexander s'est jeté dans la lave pour se tremper. Bats le <strong>Magma Wyrm</strong> du lac voisin, puis parle-lui.",
              carte(Li("Fort Laiedd"), G("Fort Laiedd"))),
            E("Contre le Géant de feu", "Cimes des Géants", "niv. 100+",
              "Son signe d'invocation est près de l'arène du <strong>Géant de feu</strong> : invoque-le pour t'aider.",
              carte(N("Fire Giant"))),
            E("Le duel à Farum Azula", "Ruines de Farum Azula", "niv. 110+",
              f"Dans les <strong>Ruines de Farum Azula</strong>, Alexander t'attend pour un dernier duel : bats-le. Il laisse le {o('Shard of Alexander')} et ses {o('Alexander’s Innards')}.",
              carte(N("Alexander", "Temple des dragons"), G("Dragon Temple")), astuce="Garde ses entrailles : elles servent à la quête du Môme-jarre à Jarrebourg."),
        ]})

    # ------------------------------------------------------------------ Millicent
    Q.append({
        "id": "millicent", "nom": "Millicent et Gowry", "en": "Millicent", "region": "Caelid, Plateau Altus, Cimes des Géants, Arbre sacré",
        "resume": "Une jeune femme rongée par la putréfaction écarlate, que tu soignes puis accompagnes jusqu'à l'Arbre sacré de Miquella. Sa fin dépend d'un choix entre deux signes.",
        "recompenses": ["Unalloyed Gold Needle", "Rotten Winged Sword Insignia", "Miquella's Needle"],
        "alertes": ["Le signe rouge (la tuer) ou le signe doré (l'aider) à Elphael donne deux fins différentes : choisis en connaissance de cause."],
        "etapes": [
            E("Accepter d'aider Gowry", "Caelid (Sellia)", "niv. 50+",
              "À la <strong>Cabane de Gowry</strong>, au sud de Sellia, un vieil homme : <strong>Gowry</strong>. Accepte de l'aider à guérir Millicent.",
              carte(Li("Gowry's Shack"), G("Gowry's Shack"))),
            E("L'aiguille d'O'Neil", "Caelid (marais d'Aeonia)", "niv. 50+",
              f"Au cœur du <strong>marais d'Aeonia</strong>, bats le <strong>Commander O'Neil</strong> : il laisse l'{o('Unalloyed Gold Needle')}. Donne-la à Gowry, recharge, reviens : il l'a réparée et te dit comment ouvrir Sellia (allumer les braseros).",
              carte(N("Commander O'Neil") or Li("Swamp of Aeonia"), G("Inner Aeonia")), astuce="Le marais putride inflige la putréfaction écarlate : prends des Boluses préservants."),
            E("Soigner Millicent", "Caelid (Église de la peste)", "niv. 50+",
              f"À l'<strong>Église de la putréfaction</strong> (Church of the Plague), sur la falaise à l'est de Sellia, Millicent est allongée. Donne-lui l'aiguille, repose-toi, parle-lui : {o('Prosthesis-Wearer Heirloom')}. Repose-toi encore : elle est à la Cabane de Gowry, épuise son dialogue.",
              carte(N("Millicent", "Église de la putréfaction"), G("Church of the Plague"))),
            E("Le Château ombragé : la prothèse", "Plateau Altus (Château ombragé)", "niv. 70+",
              f"Sur le plateau Altus, Millicent t'attend près de la <strong>Colline face à l'Arbre-Monde</strong>. Elle a perdu sa prothèse : la {o('Valkyrie’s Prosthesis')} est dans le <strong>Château ombragé</strong> (nord-ouest du plateau), après le boss Elemer of the Briar. Rapporte-la-lui.",
              carte(OM("Valkyrie's Prosthesis") or Li("Shaded Castle Ramparts"), None, [N("Millicent", "Colline face")])),
            E("Le Godskin Apostle du Village aux moulins", "Plateau Altus (Dominula)", "niv. 80+",
              "Invoque Millicent avec son signe doré aux <strong>Hauteurs aux moulins</strong> (Windmill Heights) pour affronter le <strong>Godskin Apostle</strong>. Parle-lui ensuite près de la grâce.",
              carte(N("Millicent", "Hauteurs aux moulins"), G("Windmill Heights"))),
            E("Les Ruines de la vallée enneigée", "Cimes des Géants", "niv. 100+",
              "Aux <strong>Antiques ruines de la vallée</strong> (Ancient Snow Valley Ruins), Millicent t'attend près de la grâce. Épuise son dialogue.",
              carte(N("Millicent", "Antiques ruines"), G("Ancient Snow Valley Ruins"))),
            E("Le choix à Elphael", "Arbre sacré (Elphael)", "niv. 110+",
              "À <strong>Elphael</strong>, près du site <strong>Salle de prière</strong>, deux signes au sol : le doré pour l'aider contre les sœurs de la putréfaction, le rouge pour l'envahir et la tuer. Les deux te donnent une de ses récompenses.",
              carte(N("Millicent", "Salle de prière"), G("Prayer Room")), alerte="Ce choix est définitif pour cette partie."),
            E("Après Malenia", "Arbre sacré", "fin",
              f"Si tu l'as aidée, après <strong>Malenia</strong>, retrouve son corps près de l'arène : il te laisse son aiguille ({o('Unalloyed Gold Needle')}). Apporte-la dans l'arène de Placidusax, à Farum Azula : elle devient l'{o('Miquella’s Needle')} (elle peut annuler la Flamme de la frénésie).",
              carte(N("Millicent", "Malenia"), G("Malenia, Goddess of Rot"))),
        ]})

    # ------------------------------------------------------------------ Hyetta, Irina, Edgar
    Q.append({
        "id": "irina", "nom": "Irina et Edgar", "en": "Irina of Morne", "region": "Péninsule larmoyante",
        "resume": "Une jeune aveugle qui cherche à faire parvenir une lettre à son père, le châtelain Edgar. Une quête triste, dont la fin scriptée lance celle de Hyetta.",
        "recompenses": ["Shabriri Grape"],
        "alertes": ["Ne tue jamais Irina : sa mort scriptée est indispensable à la quête de Hyetta."],
        "etapes": [
            E("Rencontrer Irina", "Péninsule larmoyante (nord)", "niv. 20+",
              f"Au <strong>Pont du sacrifice</strong> (Bridge of Sacrifice), à l'entrée de la Péninsule, une jeune femme assise : <strong>Irina</strong>. Accepte sa lettre ({o('Irina’s Letter')}).",
              carte(N("Irina"), G("Bridge of Sacrifice"))),
            E("Remettre la lettre à Edgar", "Château de Vent-Hurlant", "niv. 20+",
              "Dans le <strong>Château de Vent-Hurlant</strong> (Castle Morne), au sud de la Péninsule, le châtelain <strong>Edgar</strong> se tient près de l'ascenseur. Donne-lui la lettre, puis termine le château (Leonine Misbegotten).",
              carte(N("Châtelain Edgar", "Ascenseur"), G("Castle Morne Lift"))),
            E("La fin d'Irina", "Pont du sacrifice", "après le château",
              "Retourne au Pont du sacrifice : Irina a été tuée. Edgar se tient près de son corps, fou de chagrin. Il t'envahira plus tard aux falaises de Liurnia (Revenger's Shack).",
              carte(N("Châtelain Edgar", "Pont du sacrifice"), G("Bridge of Sacrifice"))),
            E("Edgar le vengeur", "Liurnia (ouest)", "niv. 40+",
              f"Près de la <strong>Cabane du vengeur</strong> (Revenger's Shack), à l'ouest de Liurnia, Edgar t'envahit. Bats-le : il laisse une {o('Shabriri Grape')} (pour la quête de Hyetta).",
              carte(Li("Revenger's Shack"), G("Revenger's Shack"))),
        ]})

    Q.append({
        "id": "hyetta", "nom": "Hyetta et la Flamme de la frénésie", "en": "Lightseeker Hyetta", "region": "Liurnia, Leyndell",
        "resume": "Une jeune aveugle qui cherche la lumière. En lui apportant des grappes de Shabriri, tu la conduis à la Flamme de la frénésie et à la fin « Seigneur de la Flamme frénétique ».",
        "recompenses": ["Frenzied Flame Seal"],
        "alertes": ["Recevoir la Flamme de la frénésie verrouille la fin du Seigneur de la Flamme (sauf avec l'aiguille de Miquella).",
                    "Il faut que la quête d'Irina soit terminée (sa mort) pour que Hyetta apparaisse."],
        "etapes": [
            E("Rencontrer Hyetta", "Liurnia (falaises)", "niv. 40+",
              f"Aux <strong>Falaises surplombant le lac</strong> (Lake-Facing Cliffs), à l'entrée de Liurnia, Hyetta est assise près de la grâce. Donne-lui une {o('Shabriri Grape')} (celle trouvée à Voilorage).",
              carte(N("Hyetta la chercheuse", "Falaises"), G("Lake-Facing Cliffs"))),
            E("Deuxième grappe : Ruines purifiées", "Liurnia", "niv. 40+",
              "Elle part aux <strong>Ruines purifiées</strong> (Purified Ruins). La deuxième grappe est dans le cellier caché des ruines : donne-la-lui.",
              carte(Li("Purified Ruins"), None, [N("Hyetta la chercheuse", "Ruines de Laskyar")])),
            E("Troisième grappe : Edgar", "Liurnia", "niv. 40+",
              "Elle part ensuite au <strong>Pont du village</strong> (Gate Town Bridge). La troisième grappe est sur <strong>Edgar le Vengeur</strong>, qui t'envahit à la Cabane du vengeur (quête d'Irina finie). Donne-la-lui.",
              carte(N("Hyetta la chercheuse", "Pont du village"), G("Gate Town Bridge"))),
            E("La Fingerprint Grape de Vyke", "Liurnia (nord)", "niv. 50+",
              f"Elle t'attend enfin à l'<strong>Église martiale</strong> (Bellum Church) et veut une {o('Fingerprint Grape')} : c'est l'envahisseur <strong>Festering Fingerprint Vyke</strong> qui l'a, près de l'<strong>Église de l'inhibition</strong>. Bats-le et rapporte-la.",
              carte(N("Hyetta la chercheuse", "Église martiale"), G("Bellum Church"), [N("Vyke")])),
            E("La Flamme de la frénésie", "Sous Leyndell", "niv. 90+",
              "Sous Leyndell, dans les égouts (<strong>Terres d'exil souterraines</strong>), bats <strong>Mohg the Omen</strong>, puis frappe l'autel derrière lui : un passage secret descend vers la <strong>Proscription de la Flamme exaltée</strong>. Hyetta y attend et t'explique comment ouvrir la porte des Trois Doigts (sans armure).",
              carte(N("Hyetta, Servante"), G("Frenzied Flame Proscription")), alerte="Accepter la flamme = fin du Seigneur de la Flamme frénétique (sauf si tu la retires avec l'aiguille de Miquella)."),
        ]})

    # ------------------------------------------------------------------ Varré
    Q.append({
        "id": "varre", "nom": "Varré le Blême", "en": "White Mask Varré", "region": "Nécrolimbe, Liurnia, Mohgwyn",
        "resume": "L'homme au masque blanc qui t'accueille au premier pas. Sa quête t'ouvre l'accès au Palais Mohgwyn bien avant la fin du jeu.",
        "recompenses": ["Pureblood Knight's Medal", "Bloody Finger"],
        "alertes": ["Finis sa quête avant de tuer Mohg, seigneur du sang : son invasion finale disparaît sinon."],
        "etapes": [
            E("Le premier pas", "Nécrolimbe", "dès le début",
              "En sortant de la Crypte des damnés, au site <strong>Le commencement</strong> (The First Step), parle à <strong>Varré</strong>. Épuise son dialogue.",
              carte(N("Varré", "Le commencement"), G("The First Step"))),
            E("Une Rune majeure, puis les Deux Doigts", "Table ronde", "après Godrick",
              "Bats Godrick, va à la Table ronde et rencontre les <strong>Deux Doigts</strong> (Enia t'y conduit). Reviens au Premier pas : Varré te propose de servir Mohg.",
              None),
            E("L'Église de la Rose", "Liurnia (est)", "niv. 40+",
              "Varré t'attend à l'<strong>Église de la Rose</strong> (Rose Church), à Liurnia. Il te demande d'envahir trois fois.",
              carte(N("Varré", "Ruines tombées") or Li("Rose Church"), G("Fallen Ruins of the Lake") or Li("Rose Church"))),
            E("Trois invasions… ou Magnus", "Liurnia, Plateau Altus", "niv. 50+",
              f"Remplis le contrat avec des {o('Festering Bloody Finger')} (en ligne), ou bats <strong>Magnus</strong> aux <strong>Ruines du Sang tortueux</strong> (Writheblood Ruins, Plateau Altus) : ça compte comme les invasions.",
              carte(Li("Writheblood Ruins"))),
            E("Le sang d'une vierge", "Liurnia (Église de l'inhibition)", "niv. 50+",
              f"Varré te donne le {o('Lord of Blood’s Favor')} : imbibe-le du sang d'une vierge. À l'<strong>Église de l'inhibition</strong>, une servante est déjà morte : utilise le tissu sur son corps, puis rapporte-le à Varré.",
              carte(Li("Church of Inhibition"), G("Church of Inhibition"))),
            E("Le Pureblood Knight's Medal", "Église de la Rose", "niv. 50+",
              f"Varré te remet le {o('Pureblood Knight’s Medal')} : utilise-le n'importe où pour être téléporté au <strong>Palais Mohgwyn</strong>.",
              carte(Li("Rose Church"))),
            E("Son invasion à Mohgwyn", "Palais Mohgwyn", "niv. 90+",
              "Au Palais Mohgwyn, Varré t'envahit près du <strong>Centre du Mausolée de la dynastie</strong>. Bats-le avant d'affronter Mohg.",
              carte(N("Varré", "Centre du Mausolée"), G("Dynasty Mausoleum Midpoint"))),
        ]})

    # ------------------------------------------------------------------ Patches
    Q.append({
        "id": "patches", "nom": "Patches", "en": "Patches", "region": "Nécrolimbe, Liurnia, Mont Gelmir",
        "resume": "Le traître le plus célèbre des Souls. Il te tend des pièges, se rend, puis devient marchand et allié douteux.",
        "recompenses": ["Magma Whip Candlestick"],
        "alertes": ["À la Grotte des eaux noires, accepte sa reddition : le tuer fait perdre sa boutique et sa quête.",
                    "Son contrat du Manoir du Volcan doit être fait avant de tuer Rykard."],
        "etapes": [
            E("La Grotte des eaux noires", "Nécrolimbe (est)", "niv. 15+",
              "Au fond des <strong>Cavernes des eaux noires</strong> (Murkwater Cave), au nord de Nécrolimbe, ouvrir le coffre lance le combat contre Patches. Quand il se rend (vers 50 % de PV), arrête de frapper et accepte. Recharge la zone : sa boutique s'ouvre.",
              carte(N("Pat", "Cavernes des eaux noires"), G("Murkwater Cave")), alerte="Ne l'achève pas quand il se rend."),
            E("Le coffre piégé", "Grotte des eaux noires", "niv. 15+",
              "S'il te propose un coffre « bonus », c'est un piège qui te téléporte loin de là. Reviens le voir : il te donne un nouveau geste.",
              None),
            E("L'Île panoramique", "Liurnia (île du lac)", "niv. 40+",
              "À Liurnia, Patches est au site <strong>Île panoramique</strong> (Scenic Isle). Parle-lui avant de rejoindre le Manoir du Volcan.",
              carte(N("Pat", "Île panoramique"), G("Scenic Isle"))),
            E("Le Manoir du Volcan", "Mont Gelmir", "niv. 60+",
              "Rejoins le <strong>Manoir du Volcan</strong> : Patches y est. Il te confie le contrat de <strong>Great Horned Tragoth</strong> (Prison Town Church / Mont Gelmir). Remplis-le avant de tuer Rykard.",
              carte(N("Pat", "Manoir du volcan"), G("Volcano Manor"))),
            E("Sa fin", "Manoir du Volcan", "après les contrats",
              f"Après les contrats, il part. Retrouve sa note et son butin dans le manoir ({o('Magma Whip Candlestick')} parmi ses récompenses).",
              None),
        ]})

    # ------------------------------------------------------------------ Nepheli, Kenneth, Gostoc
    Q.append({
        "id": "nepheli", "nom": "Nepheli, Kenneth et Gostoc", "en": "Nepheli Loux", "region": "Voilorage, Table ronde, Leyndell",
        "resume": "La guerrière de la Table ronde qui finit reine de Voilorage. Une quête liée à Kenneth Haight, Gideon et Gostoc, qui rapporte deux Ancient Dragon Smithing Stones.",
        "recompenses": ["Arsenal Charm", "Ancient Dragon Smithing Stone"],
        "alertes": ["Ne tue pas Gostoc : il vend une Ancient Dragon Smithing Stone à la fin.",
                    "Ne donne jamais la potion de Seluvis à Nepheli."],
        "etapes": [
            E("Nepheli à Voilorage", "Château de Voilorage", "niv. 20+",
              "Dans le <strong>Château de Voilorage</strong>, au site <strong>Chambre voisine de l'ascenseur</strong>, Nepheli est assise près de Rogier. Parle-lui : son signe d'invocation est devant la porte de Godrick.",
              carte(N("Nepheli", "Chambre voisine"), G("Rampart Tower"))),
            E("Kenneth et le Fort Haight", "Nécrolimbe (est)", "niv. 20+",
              "<strong>Kenneth Haight</strong> (sur l'arche au nord des Bois brumeux) te demande de libérer le <strong>Fort Haight</strong> : bats le chevalier au sommet, puis reparle-lui. Il s'y installe.",
              carte(N("Kenneth", "Ouest du Fort"), G("Fort Haight West"), [N("Kenneth", "Orée des Bois")])),
            E("Table ronde : la mission de Gideon", "Table ronde", "après Godrick",
              f"À la Table ronde, Nepheli te remet l'{o('Arsenal Charm')}, puis part au <strong>Village des Albinauriques</strong>. Parle-lui sous le pont, bats l'<strong>Omenkiller</strong> (elle est invocable), reparle-lui : elle rentre à la Table ronde.",
              carte(Li("Village of the Albinaurics"), G("Village of the Albinaurics"))),
            E("Le Stormhawk King", "Table ronde", "niv. 60+",
              "Aux <strong>Quatre Beffrois</strong> (nord de Liurnia), prends le portail vers la Chapelle de l'anticipation (Imbued Sword Key), bats le Grafted Scion, puis prends la porte à droite de l'entrée jusqu'au toit : le <strong>Stormhawk King</strong> (cendre spirituelle). Donne-le à Nepheli.",
              carte(Li("The Four Belfries"))),
            E("Battre Morgott, puis reparler à Gideon", "Leyndell", "niv. 90+",
              "Après Morgott, reparle à Gideon : il te parle de Nepheli. Kenneth est au Château de Voilorage, dans la salle du trône.",
              None),
            E("Nepheli, reine de Voilorage", "Château de Voilorage", "fin",
              f"Va à la salle du trône de Voilorage (là où était Godrick) : Nepheli est devenue reine. Reparle à <strong>Gostoc</strong> (près de la porte principale) : il vend une {o('Ancient Dragon Smithing Stone')}.",
              carte(N("Nepheli", "Godrick"), G("Godrick the Grafted"), [N("Gostoc", "Falaise")])),
        ]})

    # ------------------------------------------------------------------ Manoir du Volcan
    Q.append({
        "id": "volcan", "nom": "Le Manoir du Volcan (Rya, Tanith, Bernahl, Diallos)", "en": "Volcano Manor", "region": "Liurnia, Mont Gelmir",
        "resume": "Rya t'invite à rejoindre les Récusants du Manoir du Volcan. Leurs contrats d'assassinat rapportent armes et sets uniques, et chaque PNJ du manoir a sa propre histoire.",
        "recompenses": ["Daedicar's Woe", "Serpent's Amnion", "Recusant Finger"],
        "alertes": ["Tuer Rykard met fin à tous les contrats et aux quêtes du manoir : garde-le pour la fin.",
                    "Avant de rejoindre le manoir, fais la quête de Rya (son collier) et vois Patches sur l'Île panoramique."],
        "etapes": [
            E("Le collier de Rya", "Liurnia (est)", "niv. 40+",
              f"Sous un pavillon entre les <strong>Ruines de Laskyar</strong> et la Cabane aux crevettes bouillies, une jeune femme : <strong>Rya</strong>. On lui a volé son collier : <strong>Big Boggart</strong> te le vend 1 000 runes. Rends-le-lui : invitation au Manoir du Volcan.",
              carte(N("Rya", "Île panoramique") or N("Rya"), G("Scenic Isle"), [N("Malfrat", "Cabane aux crevettes")])),
            E("Rejoindre les Récusants", "Mont Gelmir", "niv. 60+",
              f"Utilise l'invitation de Rya : elle t'emmène au <strong>Manoir du Volcan</strong>. Parle à <strong>Tanith</strong> dans la grande salle et rejoins les Récusants ({o('Recusant Finger')}).",
              carte(N("Tanith", "Manoir"), G("Volcano Manor"))),
            E("Contrat 1 : Old Knight Istvan", "Limgrave (Ruines du gibet)", "niv. 60+",
              "Prends la première lettre de contrat que te remet Tanith et envahis <strong>Old Knight Istvan</strong> (le signe rouge apparaît en Nécrolimbe, voir la lettre). Reviens voir Tanith.",
              None),
            E("Rya et l'Église de la Ville carcérale", "Mont Gelmir", "niv. 60+",
              "Rya te parle de son passé : va à l'<strong>Église de la Ville carcérale</strong> (Prison Town Church), au pied du Mont Gelmir : tu y trouves <strong>Zorayas</strong> sous sa vraie forme… Reviens lui parler au manoir.",
              carte(N("Zorayas", "Église de la ville"), G("Prison Town Church"))),
            E("Contrat 2 : Rileigh l'Oisif", "Plateau Altus", "niv. 70+",
              "Deuxième contrat : envahis <strong>Rileigh</strong> au Plateau Altus. Après lui, <strong>Diallos</strong> quitte le manoir (il part pour Jarrebourg). Avant tout ça, à Liurnia, Diallos pleurait Lanya sur un toit au nord-ouest du Village aux portes de l'Académie.",
              None),
            E("Bernahl et Patches", "Manoir du Volcan", "niv. 70+",
              f"<strong>Bernahl</strong> te demande de l'aider contre <strong>Vargram et Willem</strong> : utilise son signe rouge au Manoir fortifié de Leyndell, puis reviens au manoir ({o('Gelmir’s Fury')} et set Raging Wolf). <strong>Patches</strong> te confie celui de <strong>Great Horned Tragoth</strong>.",
              carte(N("Bernahl", "Manoir fortifié"))),
            E("Le Godskin Noble et le Serpent's Amnion", "Manoir du Volcan (temple)", "niv. 80+",
              f"Bats le <strong>Godskin Noble</strong> dans le temple d'Eiglay (au fond du manoir) : tu obtiens le {o('Serpent’s Amnion')}. Montre-le à Rya : elle te demande de l'aider à oublier. Tu peux lui donner le {o('Tonic of Forgetfulness')}… ou non.",
              carte(Li("Temple of Eiglay"), G("Temple of Eiglay"))),
            E("Contrat 3 : Juno Hoslow (Cimes)", "Cimes des Géants", "niv. 100+",
              f"Dernier contrat : <strong>Juno Hoslow</strong>, aux Cimes des Géants. Reviens voir Tanith : elle te remet {o('Daedicar’s Woe')}.",
              None),
            E("Rykard en tout dernier", "Mont Gelmir", "niv. 90+",
              "Bats <strong>Rykard, seigneur du blasphème</strong> seulement quand tous les contrats sont finis. Après le combat, Tanith est en deuil dans la salle du boss.",
              carte(N("Tanith", "Rykard"), G("Rykard, Lord of Blasphemy")), astuce="Avec la Serpent-Hunter (trouvée juste avant), le combat devient facile."),
        ]})

    # ------------------------------------------------------------------ Sellen
    Q.append({
        "id": "sellen", "nom": "Sellen la Sorcière", "en": "Sorceress Sellen", "region": "Nécrolimbe, Mont Gelmir, Caelid, Péninsule, Liurnia",
        "resume": "La première professeure de sorcellerie du jeu. Elle t'envoie chercher deux sorciers originels, puis il faut choisir entre elle et le chasseur de sorcières Jerren.",
        "recompenses": ["Comet Azur", "Stars of Ruin", "Witch's Glintstone Crown"],
        "alertes": ["La fin de la quête est un choix exclusif entre Sellen et Jerren."],
        "etapes": [
            E("Les Ruines du relais", "Nécrolimbe (est)", "dès le début",
              "Aux <strong>Ruines du relais</strong> (Waypoint Ruins), descends au sous-sol et bats le <strong>Mad Pumpkin Head</strong>. Dans la pièce du fond, une sorcière masquée : <strong>Sellen</strong>. Deviens son élève (elle vend des sorts).",
              carte(N("Sellen", "Cave du relais"), G("Waypoint Ruins Cellar"))),
            E("Le corps d'Azur", "Mont Gelmir (Village des ermites)", "niv. 60+",
              f"Sellen te parle du sorcier originel <strong>Azur</strong>. Son corps est au Mont Gelmir, près du <strong>Village des ermites</strong>, au site <strong>Azur le Sorcier originel</strong>. Ramasse {o('Comet Azur')} et raconte-le à Sellen.",
              carte(N("Azur"), G("Primeval Sorcerer Azur"))),
            E("Lusat dans la Cachette de Sellia", "Caelid (Sellia)", "niv. 60+",
              f"Sellen te remet le briseur de sceau pour <strong>Lusat</strong>. Dans l'<strong>Antre de Sellia</strong> (Sellia Hideaway), passe le mur illusoire et brise le sceau : Lusat te donne {o('Stars of Ruin')}.",
              carte(N("Lusat"), G("Sellia Hideaway")), repere="Une grotte de cristal au sud de Sellia ; frappe les murs qui sonnent creux."),
            E("Les Ruines de la sorcière", "Péninsule larmoyante", "après Radahn",
              f"Radahn doit être mort. Sellen t'envoie aux <strong>Ruines de la sorcière</strong> (Witchbane Ruins), dans la Péninsule : au sous-sol, son corps et la {o('Sellen’s Primal Glintstone')}.",
              carte(N("Sellen", "Quatrième église"), G("Fourth Church of Marika"), [N("Châtelain Jerren", "Quatrième église")])),
            E("Jerren entre en scène", "Château du Lion rouge → Péninsule", "après Radahn",
              "Au <strong>Château du Lion rouge</strong>, parle au châtelain <strong>Jerren</strong> dans la salle du trône : il se rend lui aussi aux Ruines de la sorcière.",
              carte(N("Châtelain Jerren", "Place du Château"), G("Redmane Castle Plaza"))),
            E("Le corps de rechange chez Seluvis", "Liurnia (Trois Sœurs)", "niv. 60+",
              "Sellen a besoin d'un corps : dans la cave cachée de <strong>Seluvis</strong> (sous la Tour de Seluvis), récupère le corps-marionnette et apporte-le-lui.",
              carte(N("Précepteur Seluvis", "Étage inférieur") or Li("Seluvis's Rise"))),
            E("Le choix à la Grande bibliothèque", "Raya Lucaria", "niv. 70+",
              f"Dans la <strong>Grande bibliothèque de Raya Lucaria</strong> (après Rennala), deux signes : le doré pour aider Sellen contre Jerren, le rouge pour aider Jerren. Aider Sellen donne la {o('Witch’s Glintstone Crown')}.",
              carte(N("Sellen", "Grande bibliothèque"), G("Raya Lucaria Grand Library"), [N("Jerren le Chasseur")]), alerte="Choix définitif."),
        ]})

    # ------------------------------------------------------------------ Corhyn et Goldmask
    Q.append({
        "id": "goldmask", "nom": "Corhyn et Goldmask", "en": "Brother Corhyn & Goldmask", "region": "Table ronde, Plateau Altus, Leyndell, Cimes",
        "resume": "Le frère Corhyn cherche Goldmask, un sage qui a percé le secret de l'Ordre d'or. La quête mène à la fin « Âge de l'Ordre » et demande 37 d'Intelligence pour un sort.",
        "recompenses": ["Mending Rune of Perfect Order"],
        "alertes": ["Trouve Goldmask sur le pont d'Altus et dis-le à Corhyn AVANT d'entrer dans Leyndell.",
                    "Il faut lancer Law of Regression (37 d'Intelligence) devant la statue de Radagon."],
        "etapes": [
            E("Corhyn à la Table ronde", "Table ronde", "après Godrick",
              "<strong>Frère Corhyn</strong> se tient dans la grande salle de la Table ronde : il vend des incantations. Épuise son dialogue à chaque visite.",
              None),
            E("Trouver Goldmask sur le pont", "Plateau Altus", "niv. 60+",
              "Arrivé au plateau Altus, Corhyn est à la <strong>Croisée de la chaussée d'Altus</strong>. Goldmask, lui, se tient au bout d'un pont en ruine (près du site Chemin détourné de l'iniquité, voir la carte). Va le voir, puis dis-le à Corhyn. À Leyndell, ils sont sur une falaise au pied du colisée.",
              carte(N("Noble Masque", "Chemin détourné"), None, [N("Frère Corhyn", "Croisée")])),
            E("Le Golden Order Principia", "Leyndell", "niv. 80+",
              f"Après l'ombre de Godfrey, récupère le {o('Golden Order Principia')} sur la chaise suspendue au-dessus du site <strong>Sanctuaire de l'Arbre-Monde</strong> (par le balcon, la fenêtre, puis la racine). Donne-le à Corhyn ou à Miriel et achète {o('Law of Regression')} : il faut 37 en Intelligence.",
              carte(OM("Golden Order Principia"))),
            E("La statue de Radagon", "Leyndell (Arbre-Monde)", "niv. 80+",
              "Lance le sort devant la <strong>statue de Radagon</strong> (ascenseur près du site Sanctuaire de l'Arbre-Monde). Parle à Goldmask, puis à Corhyn : ils partent pour les Cimes.",
              carte(N("Noble Masque", "Sanctuaire"), G("Erdtree Sanctuary"), [N("Scribe Corhyn", "Sanctuaire")])),
            E("Les Cimes : Corhyn sur le pont", "Cimes des Géants", "niv. 100+",
              "Aux Cimes des Géants, Corhyn t'attend sur le pont qui mène aux champs de neige. Épuise son dialogue.",
              None),
            E("La Mending Rune of Perfect Order", "Cimes / Champ de neige", "fin",
              f"Plus tard, retrouve le corps de Goldmask aux <strong>Antiques ruines de la vallée</strong> : la {o('Mending Rune of Perfect Order')} débloque la fin « Âge de l'Ordre ».",
              carte(N("Noble Masque", "Antiques ruines"), G("Ancient Snow Valley Ruins"))),
        ]})

    # ------------------------------------------------------------------ Dung Eater et Boggart
    Q.append({
        "id": "dung-eater", "nom": "Le Coprophage et Big Boggart", "en": "Dung Eater", "region": "Liurnia, Table ronde, Leyndell",
        "resume": "La quête la plus sombre du jeu. En apportant des Seedbed Curses au Coprophage, tu débloques la fin « Bénédiction du Désespoir » et le set Omen.",
        "recompenses": ["Mending Rune of the Fell Curse", "Omen Helm"],
        "alertes": ["Ne tue pas Big Boggart : la quête du Coprophage a besoin de lui.",
                    "Ne donne pas la potion de Seluvis au Coprophage : quête perdue."],
        "etapes": [
            E("Big Boggart et les crevettes", "Liurnia (est)", "niv. 40+",
              f"À la <strong>Cabane aux crevettes bouillies</strong> (Boilprawn Shack), achète le collier de Rya, puis des crevettes bouillies ({o('Boiled Prawn')}) : il devient ton ami et partira ensuite pour Leyndell.",
              carte(N("Malfrat", "Cabane aux crevettes"), G("Boilprawn Shack"))),
            E("Le Coprophage à la Table ronde", "Table ronde", "après Altus",
              f"Après avoir atteint le plateau Altus, un homme en guenilles apparaît à la Table ronde : le <strong>Coprophage</strong>. Trouve une {o('Seedbed Curse')} (une au Manoir fortifié de Leyndell, une autre en haut d'une tour ronde près du Rempart oriental) et montre-la-lui : il te donne la {o('Sewer-Gaol Key')}.",
              None),
            E("Son vrai corps dans les égouts", "Leyndell (égouts)", "niv. 90+",
              "Dans les égouts, les <strong>Terres d'exil souterraines</strong>, ouvre sa cellule et dis-lui de partir.",
              carte(N("Le Coprophage", "Rempart de la capitale") or Li("Subterranean Shunning-Grounds"))),
            E("Boggart dans les douves", "Leyndell", "niv. 90+",
              "À la Table ronde, il a laissé un message : rendez-vous aux douves extérieures. Parle à Boggart dans les douves : le Coprophage t'envahit. Bats-le (Sword of Milos). Boggart est mort : récupère sur lui une Seedbed Curse.",
              carte(N("Malfrat", "Rempart"), G("Avenue Balcony"))),
            E("Cinq Seedbed Curses", "Égouts de Leyndell", "fin",
              f"Donne cinq {o('Seedbed Curse')} au vrai corps du Coprophage dans sa cellule. Au 5e : {o('Mending Rune of the Fell Curse')} (fin « Bénédiction du Désespoir »), et le set Omen après rechargement.",
              None),
        ]})

    # ------------------------------------------------------------------ Boc
    Q.append({
        "id": "boc", "nom": "Boc le couturier", "en": "Boc the Seamster", "region": "Nécrolimbe, Liurnia, Plateau Altus",
        "resume": "Un semi-humain qui rêve de devenir beau. Il devient ton couturier : il retouche et améliore tes armures.",
        "recompenses": ["Gold Sewing Needle"],
        "alertes": ["Ne lui donne pas de Larval Tear : il meurt."],
        "etapes": [
            E("Le buisson qui parle", "Nécrolimbe (lac d'Agheel)", "dès le début",
              "Au sud du site <strong>Nord du lac d'Agheel</strong>, juste à l'est du télescope, un arbuste parle : frappe-le, c'est <strong>Boc</strong>. Il te donne rendez-vous à la Grotte marine.",
              carte(G("Agheel Lake North")), repere="Un petit arbuste isolé qui gémit quand tu t'approches."),
            E("La Grotte marine", "Nécrolimbe (côte ouest)", "niv. 10+",
              "Dans la <strong>Grotte marine</strong> (Coastal Cave), parle à Boc près du site de grâce, puis bats les deux <strong>Demi-Human Chiefs</strong> au fond : rapporte-lui l'aiguille à coudre et les outils de couture. Il devient ton couturier.",
              carte(N("Boc le semi-humain", "Grotte marine"), G("Coastal Cave"))),
            E("Raya Lucaria et l'Église des vœux", "Liurnia", "niv. 40+",
              f"Boc apparaît aux Falaises surplombant le lac (ou à la Porte orientale de Raya Lucaria). Récupère l'{o('Gold Sewing Needle')} à l'<strong>Église des vœux</strong> et garde-la pour Leyndell.",
              carte(N("Boc le couturier", "Porte orientale"), G("East Raya Lucaria Gate"))),
            E("La fin de Boc", "Leyndell", "niv. 80+",
              "Au site <strong>Rempart oriental de la capitale</strong>, donne-lui l'aiguille en or, épuise son dialogue, puis utilise le Prattling Pate « You're Beautiful » à côté de lui : il reste en vie et continue de te servir.",
              carte(N("Boc le couturier", "Rempart oriental"), G("East Capital Rampart"))),
        ]})

    # ------------------------------------------------------------------ Yura
    Q.append({
        "id": "yura", "nom": "Yura, chasseur de Doigts sanglants", "en": "Yura, Hunter of Bloody Fingers", "region": "Nécrolimbe, Liurnia, Plateau Altus",
        "resume": "Un samouraï qui chasse les envahisseurs, et en particulier Eleonora. Il t'aide dans plusieurs combats.",
        "etapes": [
            E("Les Ruines du littoral", "Nécrolimbe (côte)", "dès le début",
              "Sous l'arche en ruine au nord-est du site <strong>Ruines du littoral</strong> (Seaside Ruins), un samouraï : <strong>Yura</strong>. Parle-lui.",
              carte(N("Yura", "Ruines du littoral"), G("Seaside Ruins")), alerte="Facile à rater : va le voir tôt."),
            E("Le surplomb de la grotte des eaux noires", "Nécrolimbe", "niv. 15+",
              "Va aux Cavernes des eaux noires : l'envahisseur <strong>Bloody Finger Nerijus</strong> apparaît près de l'entrée, Yura vient t'aider. Reparle-lui un peu au nord de la grotte.",
              carte(N("Yura", "Surplomb"), G("Murkwater Coast"))),
            E("La Grande porte de l'Académie", "Liurnia", "niv. 40+",
              "Depuis le site <strong>Grande porte de l'Académie</strong>, va au pont cassé au nord et utilise son signe rouge contre le <strong>Ravenmount Assassin</strong>. Reparle-lui : Pierre de forge (5) et une cendre de guerre.",
              carte(N("Yura", "Grande porte"))),
            E("Altus : Eleonora", "Plateau Altus", "niv. 70+",
              "Au Plateau Altus, près de la <strong>Vieille galerie d'Altus</strong>, il affronte Eleonora. Plus tard, tu le retrouves mort : son équipement est sur place.",
              carte(N("Yura", "Vieille galerie"), G("Old Altus Tunnel"))),
        ]})

    # ------------------------------------------------------------------ Thops, Latenna, Roderika, Diallos/Jar-Bairn, Seluvis
    Q.append({
        "id": "thops", "nom": "Thops le Sorcier", "en": "Sorcerer Thops", "region": "Liurnia",
        "resume": "Un sorcier expulsé de l'Académie. Apporte-lui une clé et il tentera d'y retourner.",
        "recompenses": ["Thops's Barrier"],
        "etapes": [
            E("L'Église d'Irith", "Liurnia (ouest)", "niv. 30+",
              "À l'<strong>Église d'Irith</strong>, à l'entrée sud de Liurnia, donne 10 runes à <strong>Thops</strong> : sa boutique s'ouvre. Il cherche une clé de l'Académie.",
              carte(N("Thops", "Falaises"), G("Church of Irith"))),
            E("Lui donner une clé", "Liurnia", "niv. 40+",
              f"La deuxième {o('Academy Glintstone Key')} est sur le lustre au-dessus de l'Église du Coucou (par les poutres). Donne-la à Thops (garde la tienne) : il part pour l'Académie.",
              carte(OM("Academy Glintstone Key", Li("Church of the Cuckoo")) or Li("Church of the Cuckoo"))),
            E("Sa fin dans l'Académie", "Raya Lucaria", "niv. 50+",
              f"Dans l'Académie, à la <strong>Salle de classe de l'école</strong>, Thops est mort près de son pupitre : {o('Thops’s Barrier')}.",
              carte(N("Thops", "Salle de classe"), G("Schoolhouse Classroom"))),
        ]})

    Q.append({
        "id": "latenna", "nom": "Latenna l'Albinaurique", "en": "Latenna the Albinauric", "region": "Liurnia, Champs de neige",
        "resume": "Une archère albinaurique qui te demande de la conduire aux Champs de neige consacrés, jusqu'au corps de son loup. Récompense : une Somber Ancient Dragon Smithing Stone.",
        "recompenses": ["Somber Ancient Dragon Smithing Stone"],
        "alertes": ["Va la voir avec la moitié du médaillon d'Albus AVANT de ramasser celle du Château Sol, sinon elle meurt."],
        "etapes": [
            E("Albus et le médaillon", "Liurnia (Village des Albinauriques)", "niv. 40+",
              f"Au <strong>Village des Albinauriques</strong>, frappe un pot qui bouge : c'est le vieil <strong>Albus</strong>. Il te donne la moitié droite du {o('Haligtree Secret Medallion (Right)')}. De retour à la Table ronde, <strong>Ensha</strong> t'attaque pour le médaillon : bats-le.",
              carte(N("Le vieil Albus"), G("Village of the Albinaurics"))),
            E("Latenna à la Dernière halte du loup", "Liurnia (nord)", "niv. 40+",
              "Traverse la <strong>Grotte de cristal du lac</strong> (Lakeside Crystal Cave, Bloodhound Knight) jusqu'à la <strong>Cabane du loup endormi</strong> : montre le médaillon à <strong>Latenna</strong> et accepte sa demande (tu obtiens ses cendres).",
              carte(N("Latenna", "Dernier refuge"))),
            E("Le Château Sol", "Cimes des Géants", "niv. 100+",
              "Récupère l'autre moitié du médaillon au <strong>Château Sol</strong> (Commander Niall), seulement après avoir vu Latenna.",
              carte(OM("Haligtree Secret Medallion (Left)") or Li("Castle Sol"))),
            E("Les Champs de neige consacrés", "Champs de neige", "fin",
              "Aux <strong>Champs de neige consacrés</strong>, invoque Latenna près du corps de son loup géant : elle te remet une Somber Ancient Dragon Smithing Stone.",
              carte(N("Latenna", "Ruines cléricales"))),
        ]})

    Q.append({
        "id": "roderika", "nom": "Roderika", "en": "Roderika", "region": "Stormhill, Table ronde",
        "resume": "Une jeune femme brisée que tu rencontres sur Stormhill. Elle deviendra l'harmonisatrice spirituelle de la Table ronde (amélioration des cendres spirituelles).",
        "etapes": [
            E("La cabane de Stormhill", "Stormhill", "dès le début",
              f"Dans la <strong>Cabane de Stormhill</strong>, une jeune femme assise : Roderika. Épuise son dialogue : {o('Spirit Jellyfish Ashes')}.",
              carte(G("Stormhill Shack"))),
            E("La Table ronde", "Table ronde", "après Godrick",
              "Elle arrive à la Table ronde (salle de gauche, au fond). Parle-lui, puis à <strong>Hewg</strong> le forgeron, puis encore à elle : elle devient l'harmonisatrice spirituelle.",
              None),
        ]})

    Q.append({
        "id": "jarbairn", "nom": "Le Môme-jarre et Diallos", "en": "Jar-Bairn & Diallos", "region": "Liurnia (Jarrebourg)",
        "resume": "Le petit village de jarres de Liurnia, où Diallos finit par s'installer. La quête se termine avec les entrailles d'Alexander.",
        "recompenses": ["Companion Jar", "Diallos's Mask"],
        "alertes": ["Ne casse pas les jarres du village."],
        "etapes": [
            E("Jarrebourg", "Liurnia (nord-est)", "niv. 40+",
              "Le village de <strong>Jarrebourg</strong> est caché dans les falaises du nord-est de Liurnia. Le <strong>Môme-jarre</strong> te salue. Épuise son dialogue.",
              carte(N("Môme-jarre"), G("Jarburg"))),
            E("Diallos le protecteur", "Jarrebourg", "après le Manoir",
              "Après les deux premiers contrats du Manoir du Volcan, <strong>Diallos</strong> s'installe à Jarrebourg pour protéger les jarres. Il finit tué par un assassin : son équipement reste là.",
              carte(N("Môme-jarre"), None, [N("Chevalier Diallos", "Village")])),
            E("Les entrailles d'Alexander", "Jarrebourg", "fin",
              f"Après le duel d'Alexander à Farum Azula, donne ses {o('Alexander’s Innards')} au Môme-jarre : il te remet la {o('Companion Jar')}.",
              carte(N("Môme-jarre"), G("Jarburg"))),
        ]})

    Q.append({
        "id": "seluvis", "nom": "Seluvis et Pidia", "en": "Preceptor Seluvis", "region": "Liurnia (Trois Sœurs), Plateau Altus",
        "resume": "Le précepteur de Ranni, un sorcier qui fabrique des marionnettes. Sa quête mêle une potion, un vieil ami (Pidia) et une carte au trésor.",
        "recompenses": ["Magic Scorpion Charm", "Amber Starlight"],
        "alertes": ["Donne la potion de Seluvis à Gideon, jamais à Nepheli ni au Coprophage.",
                    "Rends l'Amber Starlight avant de donner la Fingerslayer Blade à Ranni : Seluvis meurt alors."],
        "etapes": [
            E("Le précepteur", "Tour de Ranni", "niv. 40+",
              "Au service de Ranni, parle au <strong>Précepteur Seluvis</strong> (forme spectrale dans la Tour de Ranni). Il te confie une potion à faire boire à quelqu'un.",
              carte(N("Précepteur Seluvis", "Chambre de Ranni"), G("Ranni's Rise"))),
            E("La potion : à Gideon", "Table ronde", "niv. 40+",
              "Donne la potion à <strong>Gideon Ofnir</strong> à la Table ronde (il la démasque, mais c'est la bonne option). Retourne voir Seluvis : il t'ouvre sa boutique.",
              None, alerte="Jamais à Nepheli ni au Coprophage."),
            E("La cave cachée", "Tour de Seluvis", "niv. 40+",
              "Parle-lui encore : il te révèle sa cave cachée sous sa tour, où il garde ses marionnettes (dont celle de Nepheli…).",
              carte(N("Précepteur Seluvis", "Étage inférieur"), None)),
            E("Pidia et la carte", "Manoir de Caria", "niv. 50+",
              f"Dans le <strong>Manoir de Caria</strong>, <strong>Pidia</strong> te vend une carte usée qui mène à l'{o('Amber Starlight')} (ravin au nord-est de la Croisée de la chaussée d'Altus).",
              carte(N("Pidia"), G("Manor Lower Level"))),
            E("Rendre l'Amber Starlight", "Tour de Seluvis", "niv. 60+",
              "Rapporte-la à Seluvis : il t'offre une potion pour Ranni (ne la lui donne pas). Fais-le AVANT la Fingerslayer Blade.",
              carte(N("Précepteur Seluvis", "Chambre de Ranni"), G("Ranni's Rise"))),
        ]})

    Q.append({
        "id": "kenneth", "nom": "Kenneth Haight", "en": "Kenneth Haight", "region": "Nécrolimbe, Voilorage",
        "resume": "L'héritier autoproclamé de Nécrolimbe. Libère son fort et il te récompense ; il finit par jurer fidélité à Nepheli.",
        "recompenses": ["Erdsteel Dagger"],
        "etapes": [
            E("L'arche des Bois brumeux", "Nécrolimbe (est)", "dès le début",
              "Kenneth crie depuis une arche en ruine au nord des Bois brumeux. Accepte de libérer son fort.",
              carte(N("Kenneth", "Orée des Bois"), G("Mistwood Outskirts"))),
            E("Le Fort Haight", "Nécrolimbe (est)", "niv. 20+",
              f"Au <strong>Fort Haight</strong>, tue le chevalier de Godrick sur les remparts. Retourne voir Kenneth : il te donne l'{o('Erdsteel Dagger')}. Prends aussi la moitié gauche du {o('Dectus Medallion (Left)')} dans le fort.",
              carte(Li("Fort Haight"), G("Fort Haight West"))),
            E("Fidèle à Nepheli", "Château de Voilorage", "fin",
              "Plus tard, il te demande de trouver un souverain digne : c'est Nepheli. Il finit dans la salle du trône de Voilorage.",
              carte(N("Kenneth", "Godrick"), G("Godrick the Grafted"))),
        ]})

    return Q

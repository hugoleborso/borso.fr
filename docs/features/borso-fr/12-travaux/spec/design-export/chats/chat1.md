# Les 12 travaux

_Started 2026-05-11 01:14 UTC_

---

## User

Depuis 2025, je me suis créé des défis mensuels, que j'appelle chaque année les 12 travaux de Borso. J'aimerais ajouter une page à mon site qui est un calendrier des défis mensuels que j'ai (parfois plusieurs par mois, parfois ponctuel, parfois quotidien pendant le mois), avec leur complétion, et potentiellement des preuves( photos, liens...)

## Assistant

_[tool: questions_v2]_

## User

Questions answered:
- context: Oui mais design libre pour cette page
- aesthetic: Explore a few options
- years: Toutes les années depuis 2025, extensible
- challenge_types: Plusieurs sous-défis dans un mois
- completion_states: Partiellement réussi, À faire / futur, En cours, Réussi, Échoué, Abandonné
- proof_types: Photos, Liens externes (Strava, Instagram, articles…), Notes / réflexions courtes, Vidéos, Stats / chiffres (km parcourus, livres lus…)
- layout: Explore a few options
- interactions: Cliquer sur un mois pour voir le détail dans un panneau, Hover pour aperçu rapide, Animation de progression / barre d'avancement, Mode 'ajouter une preuve' (interface d'édition)
- real_data: Les 12 travaux de Borso
Résolution 2025 : 12 extraordinaires à faire 

Janvier : sport tout les jours, smasher correctement au volley 
Février : 2h de tel par jour en moyenne, 14 livres dans le mois
Mars : passer la flèche d’or
Avril : 5k sub20
Mai : le GR75
Juin : Finir la montecristo
Juillet : Apprendre 1 ouverture par jour et monter à 1500 en rapid
Août : Une traversée en Méditerranée en bateau ? La fabuleuse armada ?
200km à vélo d’un coup
Septembre : un triathlon L et battre mon record + apprendre les départements nombre et loc + sport tous les jours 
Octobre : 20m en apnée
Novembre : monter 100x les marches de Montmartre dans la même journée 
Décembre : aller en Italie sans utiliser l’anglais faire un muscle up 


12 travaux 2026
Janvier 
- [x] Mois de la positivité : partager du positif chaque jour avec les colocs
- [x] Sport tous les jours 

Février 
- [x] Au lit à 23h, extinction 23h30, 6j/7
- [ ] Trouver et organiser 2 dates pour Pragma
- [x] 10x1h de sport dans la même journée 

Mars
- [x] Être admissible au CAPES de maths
- [x] Battre le métro entre 2 stations
- [ ] 3h de HT par semaine 

Avril
- [ ] Courir toutes les lignes de métro dans l’ordre en 1 mois

Mai
- [ ] Organiser une Backyard et y participer

Juin
- [ ] 1 poème par jour à une personne différente
- [ ] Peut être la montecristo (1. Finir, 2. Sub1h30)

Juillet
- [ ] Sub 1h30 au Semi
- [ ] Participer aux championnats de France de Catan

Août 
- [ ] Traversée du lac d’Annecy à la nage

Septembre
- [ ] Sub 6h au L de Lépin 

Octobre 
- [ ] Paris Dieppe à vélo en 1j et se baigner

Novembre
- [ ] 3000 pages lues dans le mois

Décembre
- [ ] Atteindre 1500 ELO aux échecs dans une cadence
- variations: 2-3 directions visuelles différentes

## Assistant

_[tool: copy_starter_component]_

_[tool: update_todos]_

Parfait, j'ai tout ce qu'il me faut. Je pars sur **3 directions visuelles distinctes** présentées côte à côte sur un canvas, chacune avec les vraies données 2025 + 2026, panneaux de détail interactifs, états de complétion et zones pour preuves.

Mes 3 directions :
- **A — Stèle** : éditorial sobre, numéros romains, serif (Newsreader), clin d'œil mythologique sans excès
- **B — Carnet** : dense façon log de coach, monospace, frise verticale, heatmap d'activité
- **C — Magazine** : frise horizontale, gros titres, slots photos, contrasté éditorial

_[tool: write_file]_

_[tool: read_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: snip]_

_[tool: write_file]_

_[tool: snip]_

_[tool: write_file]_

_[tool: done]_

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Voilà, **3 directions** posées côte à côte sur un canvas, avec les vraies données 2025 & 2026 :

- **A · Stèle éditoriale** — grille 4×3, chiffres romains, serif Newsreader, panneau de détail à droite
- **B · Carnet de coach** — frise verticale dense, monospace, heatmap d'année, lignes dépliables
- **C · Frise magazine** — spread éditorial avec mois en focus + filmstrip de 12 chapitres

Chaque direction est interactive (clic mois, sélection, switch d'année, bouton « ajouter une preuve »). Pour passer une œuvre en plein écran, clic sur l'icône en haut à droite de l'artboard.

**Pour la suite** : dis-moi laquelle te parle le plus, ou un mix (ex: layout A + densité B), et je peux aussi brancher le mode édition sur un format de données réel (JSON, markdown, etc).

## User

Je préfère la frise ! Et pas besoin de faire un truc avec un back, je peux mettre à jour dans le code avec une PR, tant que ça n'est pas trop d'effort

## Assistant

_[tool: snip]_

_[tool: copy_files]_

_[tool: write_file]_

_[tool: snip]_

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: snip]_

_[tool: fork_verifier_agent]_

**Frise gardée et passée en pleine page** (`index.html`). Les 3 directions restent dispo dans `explorations.html` si besoin de comparer plus tard.

**Pour mettre à jour via PR** : tout est dans `data.js`. Un commentaire en tête du fichier explique le schéma (statuts, types, preuves). Ajouter une preuve = ajouter une ligne dans le tableau `proofs` du bon défi.

## User

Le site c'est borso.fr. Et je veux le titre de 12 travaux mis + en valeur. J'aime bien le 2026 en gros, garde le

## Assistant

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: snip]_

_[tool: fork_verifier_agent]_

**« Les douze travaux » mis en grand** en titre éditorial italique, masthead branché sur **borso.fr**, et **2026** gardé en énorme juste en dessous comme tu voulais.

## User

Verifier agent check completed

## Assistant

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: done]_

Fix appliqué — filmstrip ne déborde plus sur écrans étroits.


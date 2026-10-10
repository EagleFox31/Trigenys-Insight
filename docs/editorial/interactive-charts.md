# Graphiques interactifs dans Trigenys Insight

Le site possède **déjà** le bloc Payload CMS `chart` dans l'éditeur riche de `posts`, rendu en place par `RichText` avec `ChartBlock` / `InteractiveChart`. Ce travail enrichit **le composant existant**, sans ajouter de CDN graphique ni modifier les articles publiés.

## Mode d'emploi pour la rédaction

1. Ouvrir un **brouillon** de `Posts` dans Payload CMS, dans la bonne langue.
2. Positionner le curseur dans **Content** au niveau souhaité, puis insérer **Graphique interactif** (bloc `chart`).
3. Fournir un **titre** explicite, une **description** qui dit ce que la comparaison prouve et ce qu'elle ne prouve pas, une **étiquette de source** et l'**URL HTTPS originale de la source**. Inclure **la date des données, l'unité, la géographie, les conditions et la méthodologie** dans la description si nécessaire.
4. Créer une ou plusieurs **métriques** (par exemple `Volume des opérations / millions de transactions` et `Valeur / milliards FCFA`). Mettre des **unités comparables uniquement dans une même métrique** ; ne pas placer 10 millions d'opérations sur la même échelle que 419 milliards FCFA.
5. Pour chaque métrique, ajouter les points `catégorie/année → nombre vérifié`. Ne pas saisir une valeur 0 pour « indisponible », « non vérifié » ou « sans service » : ces états **ne sont pas des montants**. Si les données sont inconnues, ne pas afficher la barre.
6. Utiliser **Aperçu** et contrôler bureau/mobile en FR/EN. Changer les métriques, rechercher une catégorie, trier et ouvrir **Voir les données** ; tester le CSV dans Excel/LibreOffice. Le tableau et le CSV suivent les mêmes filtres que le graphique.
7. **Ne pas publier** sans revue éditoriale de l'angle, des sources et des droits : Editorial OS conserve Gate A/B/C et le contrôle humain. Le simple fait d'ajouter un bloc dans Payload ne valide pas ses chiffres.

## Exemple ciblé : enquête « Fintech au Cameroun : jusqu'où va notre argent ? »

### Graphique prêt dès que l'on dispose des séries validées

**Titre :** `Le mobile money progresse-t-il dans la CEMAC ?`

**Métriques distinctes :**
- `Transactions interopérables via GIMAC (millions)` ;
- `Valeur des transactions interopérables via GIMAC (milliards FCFA)`.

**Source primaire à vérifier par année** : rapport BEAC sur les services de paiement, année d'observation explicite, `https://www.beac.int/systemes-paiement/rapports/`. Attention : l'indicateur `GIMAC interopérable` n'est **pas égal** à l'intégralité des transferts mobile money au Cameroun. La géographie CEMAC n'est pas la géographie Cameroun. Il faut au moins deux périodes réellement comparables pour tracer une évolution.

### Comparaison des coûts des transferts — prochaine étape après collecte

Pour comparer 100 € envoyés de France vers le Cameroun, relever le même jour les devis et conditions de chaque service (Remitly, banques, mobiles et tout autre canal réellement disponible). **Montant net XAF** uniquement, tous frais pertinents inclus avec même scénario. Les services sans offre accessible ne figurent pas comme `0 XAF` : ajouter une note « service non disponible » dans l'article et garder les devis sourcés avec leurs dates.

Les données des principaux prix, frais et délais **ne sont pas encore collectées**. Aucun exemple chiffré fictif n'est livré dans le graphique public.

## Comportement du composant

- Sélection d'une **métrique** par bouton (reste disponible sans requête réseau).
- **Filtre texte** au-delà de 4 catégories, insensible aux accents.
- **Tri** par valeur croissante / décroissante / ordre de la source au-delà de 2 catégories.
- Barres horizontales avec valeurs visibles, y compris si JavaScript est indisponible temporairement pendant l'hydratation.
- **Tableau accessible** dépliable, navigation clavier et zones tactiles.
- **Export CSV** du jeu de points *actuellement visible*, entêtes/unités localisées ; protection anti-formules tableur.
- Aucune dépendance JS de visualisation tierce ; aucune requête ou tracking additionnel.

## Limites de cette version

Le bloc actuel accepte exclusivement des valeurs **numériques**. Il ne doit **pas** être utilisé pour encoder des statuts de disponibilité (« disponible », « conditionnel », « à vérifier ») comme s'il s'agissait de montants. Un **explorateur de parcours/compatibilité par prestataire**, avec de vrais états catégoriels, requiert un second bloc typé et une migration CMS ; il reste dans le backlog Editorial OS #92. Une version en production du composant ne signifie pas qu'un article contenant ce graphique a été publié.

Références : `Trigenys/trigenys-editorial-os#90` (enquête) et `#92` (visualisations, cahier complet).

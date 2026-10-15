# Visuels des nœuds de l'explorateur fintech

Ce dossier contient **dix visuels SVG autonomes** utilisés pour les dix nœuds de l'explorateur de paiements. Ils sont hébergés sur le domaine de Trigenys Insight et ne nécessitent ni appels à un CDN tiers, ni police externe. `MoneyFlowExplorer.tsx` utilise `next/image` et conserve une icône de secours pour chaque catégorie.

## Usage et droits

- `france.svg`, `cameroon.svg` : interprétations simples des drapeaux nationaux.
- `bank.svg`, `cash.svg`, `school.svg`, `shopping.svg`, `international.svg`, `crypto.svg` : illustrations SVG originales de catégories, **non** logos de sociétés.
- `orange.svg`, `mtn.svg` : **identifiants éditoriaux illustrés**. Ils utilisent les couleurs et des initiales textuelles pour que le lecteur reconnaisse les services, sans prétendre être les logos authentiques de Orange Money et MTN MoMo. Ne pas les communiquer comme « logos officiels », et ne pas présenter l'article comme agréé ou parrainé par les deux opérateurs.

Les règles de marque MTN MoMo mentionnent des contraintes sur l'utilisation du logo officiel hors parcours de paiement : https://momodeveloper.mtn.com/content/html_widgets/1tio4.html. Avant de remplacer les deux identifiants par des fichiers officiels, obtenir les assets autorisés et vérifier les conditions de reproduction.

## Contrôles

- Chaque clé `Origin | Wallet | Goal` dans `MoneyFlowExplorer.nodeImages` doit correspondre à un fichier `public/money-flow/<clé>.svg`.
- Tous les fichiers doivent être des SVG locaux, sans liens externes, scripts, `foreignObject` ou traqueurs.
- L'image est décorative dans le nœud ; le bouton conserve son nom accessible en français/anglais.
- Tester le rendu sur smartphone (graphe défilant), ordinateur, thème clair/sombre, et le cas de ressource image invalide.
- **La représentation visuelle du service ne prouve pas que la liaison financière est disponible.** Les états du graphe restent `documented`, `conditional` ou `unknown`.

L'issue éditoriale demeure Trigenys/trigenys-editorial-os#92 ; aucune publication d'article, aucune validation Gate A/B/C, aucun virement et aucun changement de tarification ne résulte de ce travail.

# Préparation du plugin Trigenys Insight

## État réel

La fiche publique est préparée, sans publication du plugin privé existant.
L’éditrice choisie est Jennifer Aka’a, la disponibilité souhaitée couvre tous les
pays autorisés par OpenAI et le plugin ne propose aucun paiement. L’identité
n’a pas encore été vérifiée dans le portail développeur.

Le package expose le serveur existant, avec OAuth et enregistrement dynamique de
client. Le PNG 512 × 512 initial était tronqué ; l’icône du package a été réexportée
depuis le favicon SVG existant, sans changer son dessin. Ses données PNG, son
format, ses dimensions et sa lisibilité ont été vérifiés.

Les schémas des 19 outils sont exportés depuis le vrai serveur MCP du SDK, sans
connexion à la base et sans exécution d’opérations éditoriales. Le contrôle CI
compare leur contrat au fichier versionné et reconstruit l’archive. Cela ne
rafraîchit pas le catalogue ChatGPT et ne soumet pas automatiquement le plugin.

## Fiche préparée

Nom : Trigenys Insight.
Sous-titre français : Gérez articles et brouillons.
Sous-titre anglais : Manage editorial publishing.
Public : membres de la rédaction disposant déjà d’un compte habilité.
Fonctions : brouillons, édition ciblée, auteurs/catégories, sources, médias,
articles liés, publication explicite et programmation. Liste filtrée des articles,
modification complète par ID et audit technique FR/EN sont également disponibles.
Limites : pas de gestion de comptes, d’autres sites, de réseaux sociaux ou de
paiements. La programmation publie la dernière version du brouillon ; statut
commun FR/EN et vérification environ toutes les cinq minutes, sans garantie de
publication à la minute exacte.

Présentation publique déployée et vérifiée (HTTP 200 et contenu) :
https://insight.trigenys.com/en/integrations/chatgpt ; version française également déployée.
Assistance vérifiée : `https://insight.trigenys.com/fr/contact` (formulaire public).
Les pages de confidentialité et de conditions du plugin ne sont pas publiées ;
leurs URL sont volontairement absentes du manifeste.

## Cas de revue et preuves

Le manifeste contient cinq scénarios positifs et trois négatifs, avec préparation,
outils attendus et résultats observables.

1. Auteurs et catégories : appels réels des deux outils réussis, avec uniquement
   IDs et noms publics. La sélection du scénario complet par le modèle dans la
   version enregistrée du portail n’a pas encore été testée.
2. Création d’un brouillon d’exemple : couvert par les tests du SDK/API ; parcours
   du compte de revue isolé non exécuté.
3. Modification du résumé sans autre changement : couvert par les tests du
   SDK/API ; parcours du compte de revue isolé non exécuté.
4. Programmation et consultation : vérifiées en production dans le cadre de la
   demande explicite de la propriétaire. Treize brouillons programmés le
   15 octobre 2026 de 14 h 45 à 20 h 45, heure du Cameroun, toutes les 30 minutes.
   Tâches 1 à 13, articles 3, 5, 21, 22, 25 à 33. Une vérification réelle de la
   liste a révélé puis confirmé la correction du filtre PostgreSQL sur les erreurs
   JSON nulles. Ce contrôle ne remplace pas le scénario isolé dans le portail.
5. Annulation : couverte par les tests du SDK/API ; aucun article de production
   de la propriétaire n’a été déprogrammé pour servir de démonstration.

Scénarios négatifs préparés : publier sur des réseaux sociaux, créer un compte
administrateur, payer une campagne publicitaire. Ils doivent produire une
explication honnête de la limite, sans appeler un outil d’écriture ni inventer
une réussite. Ces scénarios ne sont pas encore exécutés dans le portail.

## Démonstration à enregistrer — environ trois minutes

Utiliser un compte de test et un environnement isolé avec données fictives.
Les outils disponibles ici ne fournissent pas de capture vidéo vérifiée. Une
suite de captures ou un script ne doit pas être présentée comme un enregistrement.

1. Démarrer l’enregistreur d’écran sur la conversation ChatGPT de démonstration.
   Masquer les mots de passe, jetons et contenus de production.
2. Demander les auteurs et catégories ; montrer les vrais résultats.
3. Demander un brouillon original « Exemple de revue Trigenys », avec un texte
   court et les IDs fictifs préparés ; montrer le statut DRAFT et l’identifiant.
4. Modifier uniquement le résumé, puis relire le brouillon.
5. Programmer pour le lendemain à 9 h, heure du Cameroun, puis afficher la liste.
6. Annuler la programmation et vérifier que le brouillon demeure présent.
7. Demander une publication LinkedIn ; montrer que le plugin explique sa limite.
8. Arrêter l’enregistrement. Relire la vidéo pour vérifier sa lisibilité et
   l’absence de secrets. L’héberger à une URL de visionnage accessible aux
   évaluateurs, vérifier la lecture, puis renseigner `review.demo_recording_url`.

## Accès de revue

Le CMS actuel est un espace éditorial de confiance : tous ses utilisateurs
habilités peuvent gérer ses contenus. Ce n’est pas un service multi-client isolé.
Ne pas fournir un compte de production aux évaluateurs pour contourner cette
limite. Préparer un environnement de démonstration avec une base et un stockage
indépendants, des articles fictifs et un utilisateur dédié.

Cet accès de test doit fonctionner via le serveur MCP effectivement soumis.
Le routage vers les seules données de démonstration reste à mettre en place et
à tester ; un simple compte supplémentaire dans la production actuelle ne
garantit pas cet isolement. Ne pas soumettre un serveur de staging en supposant
que son origine pourra être remplacée par celle de production après approbation.

Les identifiants doivent être renseignés dans les champs sécurisés du portail,
jamais dans le ZIP, Git, la vidéo ou une conversation. Vérifier la connexion et
les scénarios avec cet accès avant de le déclarer prêt. La création et le coût
effectif de cet environnement restent à déterminer ; aucun service payant ni
nouveau compte d’administration n’a été créé par cette préparation.

## Confidentialité et conditions : faits à reprendre, décisions à confirmer

Le projet concret des deux textes est dans `docs/plugins/privacy-and-terms-draft.md`.
L’éditrice a confirmé la conservation des articles et médias jusqu’à suppression
par une personne habilitée. Les autres durées restent à confirmer.

Les éléments techniques observés permettent de décrire :

- Les entrées explicites envoyées aux outils : contenu, médias, sources,
  identifiants d’articles, catégories et horaires.
- L’authentification d’un compte CMS existant et le consentement aux droits
  de lecture, écriture et publication.
- Le stockage des contenus dans le CMS, des médias dans son stockage associé,
  des dates de publication dans la file de tâches et de données OAuth côté serveur.
- Le fait que publier rend les contenus accessibles publiquement ; un brouillon
  demeure réservé aux accès habilités.
- Le passage des requêtes et résultats par ChatGPT/OpenAI et l’infrastructure
  utilisée pour héberger Trigenys Insight.
- Le formulaire d’assistance, qui enregistre la demande dans le CMS et peut
  transmettre une notification à la rédaction lorsque l’envoi d’e-mails est configuré.

Il reste à confirmer avec l’éditrice avant de publier des engagements :

- Durées de conservation des comptes, contenus, journaux, demandes de support
  et sauvegardes ; modalités et délais réels de suppression.
- Prestataires effectivement actifs, lieux de traitement pertinents et usage
  des outils d’analyse sur les pages web d’accompagnement.
- Identité et coordonnées à afficher dans les textes, modalités d’accès à
  l’espace éditorial et canal de demande concernant les données.
- Conditions d’utilisation retenues : contenus autorisés, responsabilité de
  l’éditeur du contenu, droits de reproduction et modalités de suspension.

Ne pas inventer une conformité, un lieu de stockage, une durée de suppression,
une absence d’analytique ou une politique d’entraînement des prestataires.

## Passage au portail, une fois les matériaux prêts

Utiliser l’identité Jennifer Aka’a et le serveur existant. Vérifier la reprise de
l’app liée ; ne pas créer silencieusement un doublon du plugin privé. En cas de
liaison inconnue, arrêter et résoudre la migration avant d’aller plus loin.

Importer l’archive finale, compléter la vérification du domaine et l’authentification,
contrôler la fiche et les pays enregistrés, puis exécuter les cas sur cette version.
La développeuse doit lire et compléter les attestations légales/politiques.
L’envoi en revue et la publication d’une version approuvée sont deux étapes
distinctes. À ce stade : aucune archive n’a été envoyée au portail, aucune demande
de revue n’a été soumise et aucune publication publique du plugin n’a été réalisée.

Sources de procédure :
- https://developers.openai.com/plugins/deploy/connect-chatgpt
- https://developers.openai.com/plugins/deploy/submission
- https://developers.openai.com/plugins/deploy/app-review
- https://developers.openai.com/plugins/plugin-guidelines

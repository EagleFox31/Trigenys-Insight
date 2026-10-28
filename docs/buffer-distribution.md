# Distribution sociale avec Buffer

Configurer `BUFFER_API_KEY` comme secret serveur en Production, puis déployer.
Aucun jeton Buffer n'est demandé au client MCP ni renvoyé par les outils.

1. `insight_buffer_status` vérifie la connexion et retourne les vrais canaux connectés.
2. `insight_buffer_create_draft` prend un article public, sa langue, un canal LinkedIn/Facebook et une clé d'idempotence stable. Le texte fourni peut être adapté au réseau. Sans texte, le serveur compose un modèle titre/résumé/lien UTM. `socialMediaId` sélectionne explicitement une bannière sociale approuvée dans les médias du CMS, séparée de `heroImage` : PNG/JPEG/WebP, 1080 × 1350, au plus 3 Mio, alt renseigné et URL HTTPS publique vérifiée sans redirection. La sélection est liée à l'article, à la langue et au canal. Sans ce paramètre, la couverture publique reste utilisable pour préparer un brouillon ancien ; elle ne suffit plus à autoriser une programmation.
3. Le worker minute livre la demande à Buffer avec `saveToDraft: true`. Vérifier `insight_buffer_list_posts` : `pending-draft` signifie seulement que la demande est enregistrée ; `draft` avec `bufferPostId` confirme la réponse Buffer. `insight_get_post` expose aussi les derniers exports sociaux de l'article.
4. Après validation du contenu et d'une date explicite par l'utilisateur, `insight_buffer_schedule_post` programme le brouillon existant. Fournir `exportId`, `expectedUpdatedAt` relu et `publishAt` avec fuseau, au moins deux minutes dans le futur. Vérifier ensuite `scheduled` et la date confirmée.
5. `insight_buffer_cancel_schedule` redemande le statut brouillon. Vérifier ce statut après passage du worker. Une publication déjà envoyée ne peut pas être annulée ainsi.

Les mêmes opérations sont accessibles au SDK : `bufferStatus`, `bufferCreateDraft`, `bufferListPosts`, `bufferSchedulePost`, `bufferCancelSchedule`.

Le statut est la dernière réponse observée de Buffer, pas une garantie de livraison sur le réseau social. La V1 ne fournit pas d'analytique ni de synchronisation continue des publications déjà envoyées. Une publication d'article dans le CMS ne lance pas automatiquement sa distribution sociale.

Le worker ne lit jamais une révision privée comme source sociale. Les demandes sont persistées avec leur texte, leur canal, la référence d'article et le reçu Buffer. Un résultat de création inconnu est recherché parmi les brouillons avant toute autre action. S'il reste inconnu, l'export est bloqué pour revue, sans renvoi automatique. Les programmations et annulations utilisent le même verrou que la livraison et vérifient les modifications externes du texte Buffer.

La migration initiale enregistre un seul test autorisé pour l'article public 1, en français, clairement marqué « Test d'intégration — brouillon à relire ». Il vise un canal Trigenys LinkedIn/Facebook non ambigu, avec priorité LinkedIn. Aucun calendrier social n'est créé par la migration. Si aucun canal unique ne correspond, le test s'arrête avec `buffer_test_needs_channel_selection`.

Après déploiement, un client ChatGPT qui a gardé l'ancien inventaire d'outils peut devoir actualiser sa connexion pour voir les six outils Buffer. Le serveur expose alors 20 outils au total.

`insight_buffer_update_draft` / `bufferUpdateDraft` modifie le texte, le lien et la bannière du même brouillon Buffer, y compris lorsque seule l'image change. Fournir `socialMediaId` pour sélectionner une nouvelle bannière ; l'omettre conserve la sélection sociale existante. Le contrôle de version et le verrou du worker protègent les modifications simultanées. Une modification externe du texte ou du média exige une revue.

Les échecs définitifs de création `buffer_graphql_error` / `buffer_mutation_rejected` peuvent être repris avec `update_draft`, sur le même `exportId`, après relecture de `expectedUpdatedAt`. Une bannière sociale explicitement validée est obligatoire. Le worker recherche d'abord le texte/lien précédent sur le canal d'origine, y compris parmi les publications programmées ou envoyées ; il conserve tout ID distant retrouvé. Un résultat ambigu (`uncertain` / `blocked`) n'est jamais renvoyé automatiquement. Ne pas créer une nouvelle clé d'idempotence pour contourner un échec.

`list_posts` expose `socialAsset` (sélection article/langue/canal), `bufferAssets` (reçu réel de Buffer), `attempts` et `lastFailure` (type d'erreur reconnu, opération, raison et explication issue d'un vocabulaire fixe). Aucun texte d'erreur fournisseur brut, jeton, en-tête ou donnée privée n'est conservé. Une programmation est refusée si la bannière n'est pas validée ou si Buffer ne confirme pas son média.

Pour examiner un blocage externe, utiliser `buffer_list_posts` avec `refresh:true` et `limit` au plus 6. Le champ `remote` contient alors le texte, l'état et les médias actuels, sans modifier Buffer ni le reçu local. Si une création ancienne a laissé un brouillon non confirmé, le lire avant toute reprise. Un export `failed` avec ID distant bloqué par une différence de texte/média ne peut être repris qu'avec `expectedRemoteText` et `expectedRemoteImageURL` (URL ou `null` sans image) issus de cette lecture, ainsi qu'une sélection explicite `socialMediaId`. Le serveur relit Buffer et refuse une revue devenue obsolète. Conserver le texte distant lorsqu'il est déjà correct, puis remplacer uniquement la bannière.

Les téléversements sociaux 1080 × 1350 conservent désormais une URL canonique du fichier original dans le même média CMS. Cela corrige le cas où le stockage des tailles dérivées remplaçait le nom du fichier principal par celui d'une miniature. Le serveur compare aussi la taille du fichier public à celle du média et refuse une miniature, même si les dimensions enregistrées décrivent l'original. La reprise de l'import répare le média existant plutôt que de changer son ID ; les octets du fichier Drive restent identiques.

Les fichiers Drive `ARCHIVE-*` ne doivent pas être importés comme visuels actifs. Le serveur refuse aussi les médias CMS dont le nom contient `ARCHIVE`. Conserver les originaux dans Drive et importer la version `00-PRINCIPAL` de la bonne langue. Pour Trigenys Group, choisir les véritables canaux connectés de cette marque ; les anciens brouillons AgensStudio restent distincts. Une publication d'article ne crée pas automatiquement de publication sociale.

Facebook exige `metadata.facebook.type: post` pour les publications de ce flux. Les images sont envoyées via `assets.image.url`, avec `metadata.altText`, sans ajouter simultanément de carte de lien. Références : [FacebookPostMetadataInput](https://developers.buffer.com/types/FacebookPostMetadataInput.html), [ImageAssetInput](https://developers.buffer.com/types/ImageAssetInput.html), [PostActionPayload](https://developers.buffer.com/types/PostActionPayload.html).

Le worker traite au plus trois demandes par passage, dans son budget de temps. Les migrations du 16 octobre ont préparé des brouillons LinkedIn seulement, sans programmation. Elles ne sont pas rejouées par ces corrections.

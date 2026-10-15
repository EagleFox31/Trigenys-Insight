# Distribution sociale avec Buffer

Configurer `BUFFER_API_KEY` comme secret serveur en Production, puis déployer.
Aucun jeton Buffer n'est demandé au client MCP ni renvoyé par les outils.

1. `insight_buffer_status` vérifie la connexion et retourne les vrais canaux connectés.
2. `insight_buffer_create_draft` prend un article public, sa langue, un canal LinkedIn/Facebook et une clé d'idempotence stable. Le texte fourni peut être adapté au réseau. Sans texte, le serveur compose un modèle titre/résumé/lien UTM et reprend la couverture publique.
3. Le worker minute livre la demande à Buffer avec `saveToDraft: true`. Vérifier `insight_buffer_list_posts` : `pending-draft` signifie seulement que la demande est enregistrée ; `draft` avec `bufferPostId` confirme la réponse Buffer. `insight_get_post` expose aussi les derniers exports sociaux de l'article.
4. Après validation du contenu et d'une date explicite par l'utilisateur, `insight_buffer_schedule_post` programme le brouillon existant. Fournir `exportId`, `expectedUpdatedAt` relu et `publishAt` avec fuseau, au moins deux minutes dans le futur. Vérifier ensuite `scheduled` et la date confirmée.
5. `insight_buffer_cancel_schedule` redemande le statut brouillon. Vérifier ce statut après passage du worker. Une publication déjà envoyée ne peut pas être annulée ainsi.

Les mêmes opérations sont accessibles au SDK : `bufferStatus`, `bufferCreateDraft`, `bufferListPosts`, `bufferSchedulePost`, `bufferCancelSchedule`.

Le statut est la dernière réponse observée de Buffer, pas une garantie de livraison sur le réseau social. La V1 ne fournit pas d'analytique ni de synchronisation continue des publications déjà envoyées. Une publication d'article dans le CMS ne lance pas automatiquement sa distribution sociale.

Le worker ne lit jamais une révision privée comme source sociale. Les demandes sont persistées avec leur texte, leur canal, la référence d'article et le reçu Buffer. Un résultat de création inconnu est recherché parmi les brouillons avant toute autre action. S'il reste inconnu, l'export est bloqué pour revue, sans renvoi automatique. Les programmations et annulations utilisent le même verrou que la livraison et vérifient les modifications externes du texte Buffer.

La migration initiale enregistre un seul test autorisé pour l'article public 1, en français, clairement marqué « Test d'intégration — brouillon à relire ». Il vise un canal Trigenys LinkedIn/Facebook non ambigu, avec priorité LinkedIn. Aucun calendrier social n'est créé par la migration. Si aucun canal unique ne correspond, le test s'arrête avec `buffer_test_needs_channel_selection`.

Après déploiement, un client ChatGPT qui a gardé l'ancien inventaire d'outils peut devoir actualiser sa connexion pour voir les cinq outils Buffer. Le serveur expose alors 19 outils au total.

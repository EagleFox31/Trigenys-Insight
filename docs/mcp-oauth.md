# Connect Trigenys Insight to ChatGPT

Use `https://insight.trigenys.com/api/mcp` and select **OAuth**. The server advertises dynamic client registration; no fixed client ID, client secret or service Bearer token needs to be pasted into ChatGPT.

Discovery:

- `/.well-known/oauth-protected-resource/api/mcp` (also available at `/.well-known/oauth-protected-resource`)
- `/.well-known/oauth-authorization-server`

ChatGPT registers a public client with `token_endpoint_auth_method=none`, then starts authorization-code authentication with mandatory PKCE S256. Only exact HTTPS ChatGPT callback paths are accepted and each redirect must match the registered client. Authorization responses include the canonical issuer and original state. Resource indicators must exactly match `https://insight.trigenys.com/api/mcp` during authorization and token exchange.

The user signs in through the existing Payload editorial login and explicitly approves a consent form. No editorial action is allowed anonymously. Codes and consent requests expire after five minutes and are redeemed once through a PostgreSQL transaction; tokens are stored only as hashes. Access tokens expire after one hour, refresh tokens rotate and the authorization ends after thirty days. Reusing an old refresh token revokes the entire grant. Removing the editorial user also blocks access.

Scopes:

- `editorial:read`: articles including drafts, authors and categories.
- `editorial:write`: create drafts, edit articles/categories, upload media and update sources.
- `editorial:publish`: publish or explicitly restore a published status; this also requires write access.

Omitting scopes requests all three, shown on the consent screen. Refresh requests cannot expand the previously approved scope. Runtime tool handlers enforce scopes and return MCP OAuth challenges when additional permission is required.

The existing service Bearer hash and same-origin editorial browser sessions remain supported. OAuth access tokens are intended for `/api/mcp`, not the SDK's `/api/editorial-os` endpoint. Registration, authorization and token endpoints use database rate limits and bounded bodies. The migration runs with the existing production `vercel-build` workflow; no new secret is required.

Users can review and immediately revoke their grants at `/oauth/connections`; RFC-style revocation is available at `/oauth/revoke`. These operations revoke OAuth token families, leaving the independent service Bearer credential unchanged.

Validation covers PKCE, issuer/resource/client/redirect binding, state, consent user binding, replay/concurrent redemption, expiration, refresh rotation and escalation, revocation, deleted users, scope enforcement and the legacy Bearer integration. Production discovery and unauthenticated rejection can be tested without linking a real ChatGPT account. A complete ChatGPT connection still requires that user's OAuth consent.

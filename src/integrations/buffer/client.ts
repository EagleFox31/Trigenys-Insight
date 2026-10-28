// Server-side only. Never return request headers, the key, or raw provider errors.
export type BufferDiagnostic = {
  kind: 'graphql' | 'mutation'
  providerType?: string
  operation?: string
  field?: string
  reason: string
  message: string
}
const providerTypes = new Set([
  'NotFoundError',
  'UnauthorizedError',
  'UnexpectedError',
  'RestProxyError',
  'LimitReachedError',
  'InvalidInputError',
  'VoidMutationError',
  'GRAPHQL_VALIDATION_FAILED',
  'GRAPHQL_PARSE_FAILED',
  'BAD_USER_INPUT',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'INTERNAL_SERVER_ERROR',
])
// Return a fixed, actionable explanation, never a provider string that might echo
// a token, the post body, a private URL or other account data.
export function bufferDiagnostic(kind: BufferDiagnostic['kind'], raw: unknown): BufferDiagnostic {
  const value = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const extensions = value.extensions as Record<string, unknown> | undefined
  const type = value.__typename ?? extensions?.code
  const providerType = typeof type === 'string' && providerTypes.has(type) ? type : undefined
  const message = typeof value.message === 'string' ? value.message : ''
  const field = [
    'externalLink',
    'channelId',
    'assets',
    'source',
    'mimeType',
    'text',
    'metadata',
    'type',
    'needsApproval',
    'status',
  ].find((name) => message.includes(`\"${name}\"`) || message.includes(`'${name}'`))
  const reasons: Array<[RegExp, string, string]> = [
    [
      /facebook.*(?:type|required)|(?:metadata|post).*(?:type).*required/i,
      'facebook_post_type_required',
      'Facebook requires metadata.facebook.type: post.',
    ],
    [
      /cannot query field|cannot return null|unknown (?:argument|type)|not defined by type|variable .* (?:invalid|required)|graphql_validation/i,
      'schema_validation',
      'Buffer rejected a GraphQL field, argument or input type.',
    ],
    [
      /not authorized|unauthori[sz]ed|permission|access denied|forbidden/i,
      'permission_denied',
      'Buffer denied access to the selected channel or operation.',
    ],
    [
      /disconnect|reconnect|authentication.*expired|token.*expired/i,
      'channel_disconnected',
      'The selected social channel needs reconnection in Buffer.',
    ],
    [
      /image|media|asset|mime|file.*(?:type|format)/i,
      'media_rejected',
      'Buffer rejected the attached media; check its public URL and supported format.',
    ],
    [
      /text.*(?:long|limit)|character.*limit/i,
      'text_too_long',
      'The post exceeds the channel text limit.',
    ],
    [
      /rate.*limit|too many requests|quota|limit.*reach/i,
      'limit_reached',
      'Buffer reported an account or request limit.',
    ],
    [
      /not found|does not exist/i,
      'not_found',
      'Buffer could not find the selected channel or post.',
    ],
  ]
  const reason = reasons.find(([pattern]) => pattern.test(message))
  return {
    kind,
    ...(providerType ? { providerType } : {}),
    ...(field ? { field } : {}),
    reason:
      reason?.[1] ?? (providerType === 'InvalidInputError' ? 'invalid_input' : 'provider_rejected'),
    message:
      reason?.[2] ??
      'Buffer rejected the request; the provider error type is retained when recognized.',
  }
}
export class BufferAPIError extends Error {
  constructor(
    public code: string,
    public ambiguous = false,
    public diagnostic?: BufferDiagnostic,
  ) {
    super(code)
  }
}
export type BufferChannel = { id: string; name: string; service: string; organizationId: string }
export type BufferPost = {
  id: string
  text: string
  status: string
  dueAt?: string | null
  channelId: string
  externalLink?: string | null
  assets?: Array<{ id?: string | null; mimeType: string; source: string; thumbnail?: string }>
}
const postFields = 'id text status dueAt channelId assets { id mimeType source }'
export class BufferClient {
  constructor(
    private key = process.env.BUFFER_API_KEY?.trim(),
    private fetcher: typeof fetch = fetch,
  ) {}
  async query<T>(
    query: string,
    variables: Record<string, unknown> = {},
    mutation = false,
  ): Promise<T> {
    if (!this.key) throw new BufferAPIError('buffer_not_configured')
    let response: Response
    try {
      response = await this.fetcher('https://api.buffer.com', {
        method: 'POST',
        redirect: 'manual',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.key}` },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(12000),
        cache: 'no-store',
      })
    } catch {
      throw new BufferAPIError('buffer_network_error', mutation)
    }
    if (!response.ok) {
      await response.body?.cancel()
      throw new BufferAPIError(
        response.status === 401 || response.status === 403
          ? 'buffer_access_denied'
          : response.status === 429
            ? 'buffer_rate_limited'
            : 'buffer_http_error',
        mutation && response.status >= 500,
      )
    }
    let body: { data?: T; errors?: unknown[] }
    try {
      body = await response.json()
    } catch {
      throw new BufferAPIError('buffer_invalid_response', mutation)
    }
    if (body.errors?.length || !body.data) {
      const diagnostic = bufferDiagnostic('graphql', body.errors?.[0])
      diagnostic.operation = [
        'InsightOrganizations',
        'InsightChannels',
        'InsightSocialPost',
        'InsightDrafts',
        'InsightSocialMutation',
      ].find((name) => query.includes(name))
      const rejectedBeforeExecution = [
        'GRAPHQL_VALIDATION_FAILED',
        'GRAPHQL_PARSE_FAILED',
      ].includes(diagnostic.providerType ?? '')
      throw new BufferAPIError(
        'buffer_graphql_error',
        mutation && !rejectedBeforeExecution,
        diagnostic,
      )
    }
    return body.data
  }
  async channels(): Promise<BufferChannel[]> {
    const data = await this.query<{ account: { organizations: { id: string }[] } }>(
      'query InsightOrganizations { account { organizations { id } } }',
    )
    if (!Array.isArray(data.account?.organizations) || data.account.organizations.length > 20)
      throw new BufferAPIError('buffer_invalid_organizations')
    const channels: BufferChannel[] = []
    for (const org of data.account.organizations) {
      const result = await this.query<{ channels: Omit<BufferChannel, 'organizationId'>[] }>(
        'query InsightChannels($input: ChannelsInput!) { channels(input: $input) { id name service } }',
        { input: { organizationId: org.id } },
      )
      if (!Array.isArray(result.channels)) throw new BufferAPIError('buffer_invalid_channels')
      channels.push(...result.channels.map((channel) => ({ ...channel, organizationId: org.id })))
    }
    return channels
  }
  async post(id: string): Promise<BufferPost> {
    const result = await this.query<{ post: BufferPost }>(
      `query InsightSocialPost($id: PostId!) { post(input: { id: $id }) { ${postFields} } }`,
      { id },
    )
    if (!result.post?.id) throw new BufferAPIError('buffer_post_not_found')
    return result.post
  }
  async findMatching(
    channel: BufferChannel,
    text: string,
    sourceURL?: string,
  ): Promise<BufferPost | null> {
    let after: string | null = null
    for (let page = 0; page < 10; page++) {
      const r: {
        posts: {
          edges: { node: BufferPost }[]
          pageInfo: { hasNextPage: boolean; endCursor: string | null }
        }
      } = await this.query(
        `query InsightDrafts($input: PostsInput!, $after: String) { posts(first: 20, after: $after, input: $input) { edges { node { ${postFields} } } pageInfo { hasNextPage endCursor } } }`,
        {
          input: {
            organizationId: channel.organizationId,
            // Include scheduled/sent posts too: an external state change must
            // never turn a retry into a duplicate public post.
            filter: { channelIds: [channel.id] },
          },
          after,
        },
      )
      const matches = r.posts.edges
        .map((item) => item.node)
        .filter(
          (post) =>
            post.channelId === channel.id &&
            (post.text === text || (sourceURL && post.text.includes(sourceURL))),
        )
      if (matches.length > 1) throw new BufferAPIError('buffer_duplicate_matches_review_required')
      if (matches[0]) return matches[0]
      if (!r.posts.pageInfo.hasNextPage) return null
      after = r.posts.pageInfo.endCursor
      if (!after) break
    }
    throw new BufferAPIError('buffer_reconciliation_limit')
  }
  private async mutation(
    name: 'createPost' | 'editPost',
    input: Record<string, unknown>,
  ): Promise<BufferPost> {
    const result = await this.query<
      Record<string, { __typename: string; post?: BufferPost; message?: string }>
    >(
      `mutation InsightSocialMutation($input: ${name === 'createPost' ? 'CreatePostInput' : 'EditPostInput'}!) { ${name}(input: $input) { __typename ... on PostActionSuccess { post { ${postFields} } } ... on MutationError { message } } }`,
      { input },
      true,
    )
    const payload = result[name]
    if (!payload?.post?.id) {
      const diagnostic = bufferDiagnostic('mutation', payload)
      diagnostic.operation = name
      const ambiguous =
        !payload ||
        payload.__typename === 'UnexpectedError' ||
        !providerTypes.has(payload.__typename)
      throw new BufferAPIError('buffer_mutation_rejected', ambiguous, diagnostic)
    }
    return payload.post
  }
  createDraft(
    channelId: string,
    text: string,
    imageURL?: string,
    service?: string,
    altText?: string,
  ): Promise<BufferPost> {
    return this.mutation('createPost', {
      channelId,
      text,
      schedulingType: 'automatic',
      mode: 'addToQueue',
      saveToDraft: true,
      needsApproval: false,
      assets: imageURL
        ? [{ image: { url: imageURL, ...(altText ? { metadata: { altText } } : {}) } }]
        : [],
      ...(service?.toLowerCase() === 'facebook'
        ? { metadata: { facebook: { type: 'post' } } }
        : {}),
      source: 'trigenys-insight',
      aiAssisted: true,
    })
  }
  editDraft(
    id: string,
    text: string,
    imageURL?: string,
    service?: string,
    altText?: string,
  ): Promise<BufferPost> {
    return this.mutation('editPost', {
      id,
      text,
      saveToDraft: true,
      aiAssisted: true,
      assets: imageURL
        ? [{ image: { url: imageURL, ...(altText ? { metadata: { altText } } : {}) } }]
        : [],
      ...(service?.toLowerCase() === 'facebook'
        ? { metadata: { facebook: { type: 'post' } } }
        : {}),
    })
  }
  schedule(id: string, dueAt: string): Promise<BufferPost> {
    return this.mutation('editPost', {
      id,
      schedulingType: 'automatic',
      mode: 'customScheduled',
      dueAt,
      saveToDraft: false,
    })
  }
  cancel(id: string): Promise<BufferPost> {
    return this.mutation('editPost', { id, saveToDraft: true })
  }
}

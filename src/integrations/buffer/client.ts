// Server-side only. Never return request headers, the key, or raw provider errors.
export class BufferAPIError extends Error {
  constructor(
    public code: string,
    public ambiguous = false,
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
}
const postFields = 'id text status dueAt channelId externalLink'
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
    if (body.errors?.length || !body.data)
      throw new BufferAPIError('buffer_graphql_error', mutation)
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
  async findMatching(channel: BufferChannel, text: string): Promise<BufferPost | null> {
    let after: string | null = null
    for (let page = 0; page < 10; page++) {
      const r: {
        posts: {
          edges: { node: BufferPost }[]
          pageInfo: { hasNextPage: boolean; endCursor: string | null }
        }
      } = await this.query(
        `query InsightDrafts($input: PostsInput!, $after: String) { posts(first: 100, after: $after, input: $input) { edges { node { ${postFields} } } pageInfo { hasNextPage endCursor } } }`,
        {
          input: {
            organizationId: channel.organizationId,
            filter: { channelIds: [channel.id], status: ['draft'] },
          },
          after,
        },
      )
      const match = r.posts.edges.find((item) => item.node.text === text)?.node
      if (match) return match
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
    const result = await this.query<Record<string, { __typename: string; post?: BufferPost }>>(
      `mutation InsightSocialMutation($input: ${name === 'createPost' ? 'CreatePostInput' : 'EditPostInput'}!) { ${name}(input: $input) { __typename ... on PostActionSuccess { post { ${postFields} } } ... on MutationError { message } } }`,
      { input },
      true,
    )
    const payload = result[name]
    if (!payload?.post?.id) throw new BufferAPIError('buffer_mutation_rejected')
    return payload.post
  }
  createDraft(channelId: string, text: string, imageURL?: string): Promise<BufferPost> {
    return this.mutation('createPost', {
      channelId,
      text,
      schedulingType: 'automatic',
      mode: 'addToQueue',
      saveToDraft: true,
      needsApproval: false,
      assets: imageURL ? [{ image: { url: imageURL } }] : [],
      source: 'trigenys-insight',
      aiAssisted: true,
    })
  }
  editDraft(id: string, text: string, imageURL?: string): Promise<BufferPost> {
    return this.mutation('editPost', {
      id,
      text,
      saveToDraft: true,
      aiAssisted: true,
      assets: imageURL ? [{ image: { url: imageURL } }] : [],
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

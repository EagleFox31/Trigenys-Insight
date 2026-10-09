import 'server-only'

export type OperatorRunSummary = {
  id: string
  vertical_key: string
  status: string
  risk_class: string
  confidence_class: string
  state_version: number
  policy_version: string
  topic_title: string | null
  topic_decision: string | null
  topic_urgency: string | null
  topic_composite_score: number | null
  topic_proposed_angle: string | null
  topic_proposed_format: string | null
  topic_sources: string[]
  pending_gate: string | null
  created_at: string
  updated_at: string
}

export type GateOutcome = 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED' | 'WATCH'

function apiConfig() {
  const baseURL = process.env.EDITORIAL_OS_API_URL?.replace(/\/$/, '')
  const token = process.env.EDITORIAL_OS_OPERATOR_TOKEN

  if (!baseURL || !token) {
    throw new Error('Editorial OS operator integration is not configured.')
  }

  return { baseURL, token }
}

async function operatorFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { baseURL, token } = apiConfig()
  const response = await fetch(`${baseURL}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const detail =
      payload && typeof payload === 'object' && 'detail' in payload
        ? String((payload as { detail?: unknown }).detail)
        : `HTTP ${response.status}`
    throw new Error(`Editorial OS request failed: ${detail}`)
  }

  return (await response.json()) as T
}

export async function getGateARuns(): Promise<OperatorRunSummary[]> {
  const params = new URLSearchParams({
    vertical: 'trigenys-insight',
    status: 'CANDIDATE',
    topic_decision: 'PROPOSE',
    policy_version: '2026.10-pilot.2',
    limit: '50',
  })

  return operatorFetch<OperatorRunSummary[]>(`/api/operator/runs?${params.toString()}`)
}

export async function decideGateA(args: {
  runId: string
  outcome: GateOutcome
  actorId: string
  reason?: string
  requestedAngle?: string
}): Promise<unknown> {
  return operatorFetch(`/api/operator/runs/${encodeURIComponent(args.runId)}/gate`, {
    method: 'POST',
    body: JSON.stringify({
      outcome: args.outcome,
      actor_id: args.actorId,
      reason: args.reason || null,
      details: args.requestedAngle
        ? {
            requested_angle: args.requestedAngle,
            surface: 'trigenys-insight-news-radar',
          }
        : { surface: 'trigenys-insight-news-radar' },
    }),
  })
}

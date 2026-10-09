import { NextResponse } from 'next/server'

import { decideGateA, type GateOutcome } from '@/utilities/editorialOperator'
import { getEditorialUser } from '@/utilities/getEditorialUser'

const outcomes = new Set<GateOutcome>(['APPROVED', 'REJECTED', 'REVISION_REQUESTED', 'WATCH'])

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const user = await getEditorialUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { runId } = await params
  const body = (await request.json().catch(() => null)) as
    | {
        outcome?: GateOutcome
        reason?: string
        requestedAngle?: string
      }
    | null

  if (!body?.outcome || !outcomes.has(body.outcome)) {
    return NextResponse.json({ error: 'invalid_outcome' }, { status: 400 })
  }

  const reason = body.reason?.trim().slice(0, 1000)
  const requestedAngle = body.requestedAngle?.trim().slice(0, 1000)

  if (body.outcome === 'REVISION_REQUESTED' && !requestedAngle) {
    return NextResponse.json({ error: 'requested_angle_required' }, { status: 400 })
  }

  try {
    await decideGateA({
      runId,
      outcome: body.outcome,
      actorId: user.email || String(user.id),
      reason,
      requestedAngle,
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'operator_action_failed' }, { status: 502 })
  }
}

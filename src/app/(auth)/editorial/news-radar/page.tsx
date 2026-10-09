import { redirect } from 'next/navigation'

import { NewsRadarClient } from './NewsRadarClient'
import './styles.css'

import { getGateARuns } from '@/utilities/editorialOperator'
import { getEditorialUser } from '@/utilities/getEditorialUser'

export const dynamic = 'force-dynamic'

export default async function NewsRadarPage() {
  const user = await getEditorialUser()
  if (!user) {
    redirect('/login?redirect=/editorial/news-radar')
  }

  const runs = await getGateARuns()

  return (
    <NewsRadarClient
      initialRuns={runs}
      operatorName={user.email || 'Éditeur Trigenys'}
    />
  )
}

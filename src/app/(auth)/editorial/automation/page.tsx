import { redirect } from 'next/navigation'
import { getEditorialUser } from '@/utilities/getEditorialUser'
import { AutomationPublication } from './Publication'

export const dynamic = 'force-dynamic'

export default async function AutomationPage() {
  const user = await getEditorialUser()
  if (!user) redirect('/login?redirect=/editorial/automation')
  return <AutomationPublication authorId={user.id} />
}

import { LocalConsumptionPage, localConsumptionMetadata, parseConsumptionScope } from '@/components/insights/LocalConsumptionPage'

export default async function Page({ params }: { params: Promise<{ scope: string }> }) {
  const { scope } = await params
  return <LocalConsumptionPage locale="fr" scope={parseConsumptionScope(scope)} />
}
export async function generateMetadata({ params }: { params: Promise<{ scope: string }> }) {
  const { scope } = await params
  return localConsumptionMetadata('fr', parseConsumptionScope(scope))
}

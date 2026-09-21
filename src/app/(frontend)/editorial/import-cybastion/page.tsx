import { ImportCybastionButton } from '@/components/insights/ImportCybastionButton'
import { cybastionArticleMetadata, cybastionArticleSources } from '@/editorial/cybastion-data-center'
import config from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

export const dynamic = 'force-dynamic'

export default async function ImportCybastionPage() {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()
  const { user } = await payload.auth({ headers: requestHeaders })

  if (!user) {
    redirect('/login')
  }

  return (
    <main className="min-h-[70vh] bg-[#fafaf7] py-16">
      <div className="insights-shell max-w-[860px]">
        <p className="eyebrow">Outil éditorial · import sécurisé</p>

        <div className="rounded-md border border-border bg-white p-8 shadow-[0_20px_50px_rgba(16,47,82,0.07)] md:p-10">
          <div className="mb-8 border-b border-border pb-8">
            <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-[#e07520]">
              Brouillon prêt à importer
            </p>
            <h1 className="m-0 font-[var(--font-fraunces)] text-[clamp(34px,5vw,52px)] font-semibold leading-[1.05] tracking-[-0.035em] text-[#102f52]">
              {cybastionArticleMetadata.title}
            </h1>
            <p className="mt-5 max-w-[720px] text-[15px] leading-7 text-[#62686d]">
              {cybastionArticleMetadata.excerpt}
            </p>
          </div>

          <div className="grid gap-5 text-sm md:grid-cols-2">
            <div>
              <span className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8a8e91]">
                Paramètres CMS
              </span>
              <p className="mt-2 leading-6 text-[#343b40]">
                Analyse de fond · Featured · Editor&apos;s Pick · {cybastionArticleMetadata.readingTime}{' '}
                min
              </p>
            </div>

            <div>
              <span className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8a8e91]">
                Catégories
              </span>
              <p className="mt-2 leading-6 text-[#343b40]">
                Technologie · Systèmes d&apos;information · Afrique
              </p>
            </div>

            <div>
              <span className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8a8e91]">
                Sources
              </span>
              <p className="mt-2 leading-6 text-[#343b40]">
                {cybastionArticleSources.length} sources seront créées ou réutilisées automatiquement.
              </p>
            </div>

            <div>
              <span className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8a8e91]">
                Publication
              </span>
              <p className="mt-2 leading-6 text-[#343b40]">
                Import en brouillon uniquement. Rien n&apos;est publié automatiquement.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-md bg-[#f2f2ed] p-5 text-sm leading-6 text-[#555b60]">
            Le script est idempotent : si l&apos;article existe déjà, il ne l&apos;écrase pas. Après
            import, ajoute simplement l&apos;image de couverture, relis le rendu et publie depuis
            Payload.
          </div>

          <ImportCybastionButton />
        </div>
      </div>
    </main>
  )
}

import { ImportCybastionButton } from '@/components/insights/ImportCybastionButton'
import { ImportEditorialLaunchPackButton } from '@/components/insights/ImportEditorialLaunchPackButton'
import { cybastionArticleMetadata, cybastionArticleSources } from '@/editorial/cybastion-data-center'
import { editorialLaunchArticles } from '@/editorial/editorial-launch-pack'
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
      <div className="insights-shell max-w-[920px]">
        <p className="eyebrow">Outils éditoriaux · imports sécurisés</p>
        <h1 className="mb-10 mt-3 font-[var(--font-fraunces)] text-[clamp(38px,6vw,64px)] font-semibold leading-[1.02] tracking-[-0.04em] text-[#102f52]">
          Préparer les brouillons dans Payload.
        </h1>

        <div className="grid gap-8">
          <section className="rounded-md border border-border bg-white p-8 shadow-[0_20px_50px_rgba(16,47,82,0.07)] md:p-10">
            <div className="mb-8 border-b border-border pb-8">
              <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-[#e07520]">
                Article Technology · import unitaire
              </p>
              <h2 className="m-0 font-[var(--font-fraunces)] text-[clamp(30px,4vw,44px)] font-semibold leading-[1.08] tracking-[-0.035em] text-[#102f52]">
                {cybastionArticleMetadata.title}
              </h2>
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
                  Sources
                </span>
                <p className="mt-2 leading-6 text-[#343b40]">
                  {cybastionArticleSources.length} sources créées ou réutilisées automatiquement.
                </p>
              </div>
            </div>

            <ImportCybastionButton />
          </section>

          <section className="rounded-md border border-border bg-white p-8 shadow-[0_20px_50px_rgba(16,47,82,0.07)] md:p-10">
            <div className="mb-8 border-b border-border pb-8">
              <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-[#e07520]">
                Pack de lancement · Business + Information Systems + Africa
              </p>
              <h2 className="m-0 font-[var(--font-fraunces)] text-[clamp(30px,4vw,44px)] font-semibold leading-[1.08] tracking-[-0.035em] text-[#102f52]">
                Trois analyses bilingues prêtes pour le CMS.
              </h2>
              <p className="mt-5 max-w-[760px] text-[15px] leading-7 text-[#62686d]">
                Un clic crée les trois brouillons en français, ajoute leur traduction anglaise sur le
                même post, rattache les catégories et réutilise les sources déjà présentes.
              </p>
            </div>

            <div className="grid gap-4">
              {editorialLaunchArticles.map((article) => (
                <div
                  className="rounded-md border border-border bg-[#fafaf7] px-5 py-4"
                  key={article.slug}
                >
                  <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8a8e91]">
                    {article.primaryCategory} · {article.readingTime} min · FR + EN
                  </p>
                  <p className="mb-0 mt-2 font-[var(--font-fraunces)] text-xl font-semibold leading-snug text-[#102f52]">
                    {article.fr.title}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-md bg-[#f2f2ed] p-5 text-sm leading-6 text-[#555b60]">
              Import idempotent : un article existant n&apos;est pas écrasé. Si seule la traduction
              anglaise manque, elle est ajoutée sans toucher à la version française. Les trois posts
              restent en brouillon pour te laisser ajouter les hero images et faire la dernière relecture.
            </div>

            <ImportEditorialLaunchPackButton />
          </section>
        </div>
      </div>
    </main>
  )
}

import { ImportCybastionButton } from '@/components/insights/ImportCybastionButton'
import { ImportEditorialLaunchPackButton } from '@/components/insights/ImportEditorialLaunchPackButton'
import { UpdateArticleReadabilityButton } from '@/components/insights/UpdateArticleReadabilityButton'
import { cybastionArticleMetadata, cybastionArticleSources } from '@/editorial/cybastion-data-center'
import { editorialLaunchArticles } from '@/editorial/editorial-launch-pack'
import { learningAiBackwardsArticle } from '@/editorial/learning-ai-backwards'
import { fc27Article } from '@/editorial/fc27'
import { ImportFC27Button } from '@/components/insights/ImportFC27Button'
import { SetupLocalConsumptionButton } from '@/components/insights/SetupLocalConsumptionButton'
import { ImportWhispButton } from '@/components/insights/ImportWhispButton'
import { whispArticle } from '@/editorial/whisp'
import { freellmapiArticle } from '@/editorial/freellmapi'
import config from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

export const dynamic = 'force-dynamic'

const importableArticles = [...editorialLaunchArticles, learningAiBackwardsArticle, freellmapiArticle]

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
            <p className="eyebrow">Consommer camerounais · Comparatif FR + EN</p>
            <h2 className="mt-3 font-[var(--font-fraunces)] text-3xl font-semibold text-[#102f52]">{whispArticle.fr.title}</h2>
            <p className="mt-4 text-[#62686d]">{whispArticle.fr.excerpt}</p>
            <p className="text-sm text-[#62686d]">Importe les deux langues, les sources et les métadonnées SEO dans un brouillon. L’article existant ne sera pas écrasé.</p>
            <ImportWhispButton />
          </section>
          <section className="rounded-md border border-border bg-white p-8 shadow-[0_20px_50px_rgba(16,47,82,0.07)] md:p-10">
            <p className="eyebrow">Nouvelle rubrique · Consommer local</p>
            <h2 className="mt-3 font-[var(--font-fraunces)] text-3xl font-semibold text-[#102f52]">Cameroun et Afrique dans Payload</h2>
            <p className="mt-4 text-[#62686d]">Crée les deux catégories bilingues. Classe ensuite chaque article dans « Consommer camerounais » ou « Consommer africain » : la rubrique et ses deux séries se remplissent automatiquement à la publication.</p>
            <SetupLocalConsumptionButton />
          </section>
          <section className="rounded-md border border-border bg-white p-8 shadow-[0_20px_50px_rgba(16,47,82,0.07)] md:p-10">
            <p className="eyebrow">Article à la une · import unitaire FR + EN</p>
            <h2 className="mt-3 font-[var(--font-fraunces)] text-3xl font-semibold text-[#102f52]">
              {fc27Article.fr.title}
            </h2>
            <p className="text-[#62686d]">{fc27Article.fr.excerpt}</p>
            <p className="text-sm text-[#62686d]">
              Un clic crée le brouillon et ses deux locales, avec catégories et sources. Aucun article
              existant n’est écrasé.
            </p>
            <ImportFC27Button />
          </section>
          <section className="rounded-md border border-[#e07520]/25 bg-[#fffaf5] p-8 shadow-[0_20px_50px_rgba(16,47,82,0.06)] md:p-10">
            <div className="mb-6 border-b border-[#e07520]/20 pb-6">
              <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-[#e07520]">
                Révision éditoriale · articles existants
              </p>
              <h2 className="m-0 font-[var(--font-fraunces)] text-[clamp(30px,4vw,44px)] font-semibold leading-[1.08] tracking-[-0.035em] text-[#102f52]">
                Rendre les analyses plus simples à lire sans les appauvrir.
              </h2>
              <p className="mt-5 max-w-[760px] text-[15px] leading-7 text-[#62686d]">
                Cette action met à jour les articles déjà présents dans Payload. Les faits, chiffres
                et sources restent inchangés ; la révision explique le jargon, simplifie les phrases
                trop abstraites et rapproche le texte d’un lecteur non spécialiste.
              </p>
            </div>

            <div className="grid gap-4 text-sm md:grid-cols-3">
              <div className="rounded-md border border-border bg-white p-4">
                <span className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8a8e91]">
                  Français
                </span>
                <p className="mb-0 mt-2 leading-6 text-[#343b40]">
                  Termes techniques expliqués dès leur première apparition.
                </p>
              </div>
              <div className="rounded-md border border-border bg-white p-4">
                <span className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8a8e91]">
                  English
                </span>
                <p className="mb-0 mt-2 leading-6 text-[#343b40]">
                  Même niveau de clarté, sans traduction littérale lourde.
                </p>
              </div>
              <div className="rounded-md border border-border bg-white p-4">
                <span className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8a8e91]">
                  Sécurité
                </span>
                <p className="mb-0 mt-2 leading-6 text-[#343b40]">
                  Seules les locales réellement différentes sont enregistrées.
                </p>
              </div>
            </div>

            <p className="mt-6 rounded-md bg-white p-4 text-sm leading-6 text-[#555b60]">
              Les articles déjà publiés restent publiés. Les brouillons restent des brouillons.
              Payload conserve ses versions, ce qui permet de revenir en arrière si nécessaire.
            </p>

            <UpdateArticleReadabilityButton />
          </section>
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
                Pack éditorial · Technology + Business + Information Systems + Africa
              </p>
              <h2 className="m-0 font-[var(--font-fraunces)] text-[clamp(30px,4vw,44px)] font-semibold leading-[1.08] tracking-[-0.035em] text-[#102f52]">
                Analyses bilingues prêtes pour le CMS.
              </h2>
              <p className="mt-5 max-w-[760px] text-[15px] leading-7 text-[#62686d]">
                Un clic crée les brouillons manquants en français, ajoute leur traduction anglaise sur le
                même post, rattache les catégories et réutilise les sources déjà présentes.
              </p>
            </div>

            <div className="grid gap-4">
              {importableArticles.map((article) => (
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
              anglaise manque, elle est ajoutée sans toucher à la version française. Les nouveaux posts
              restent en brouillon pour te laisser ajouter les hero images et faire la dernière relecture.
            </div>

            <ImportEditorialLaunchPackButton />
          </section>
        </div>
      </div>
    </main>
  )
}

import Link from 'next/link'

export function ChatGPTIntegrationPage({ locale }: { locale: 'fr' | 'en' }) {
  const fr = locale === 'fr'
  const sections = fr
    ? [
        [
          'Préparer les contenus',
          'Consultez les auteurs et catégories, créez des brouillons, révisez les textes, ajoutez des sources, des images et des articles liés.',
        ],
        [
          'Publier sur demande',
          'La publication rend l’article public. Demandez-la explicitement et vérifiez le contenu avant de la confirmer. Les statuts de publication sont partagés entre les versions française et anglaise.',
        ],
        [
          'Choisir un horaire',
          'Programmez un brouillon avec une date, une heure et un fuseau horaire. Modifiez ou annulez sa programmation avant son exécution. Le déclencheur vérifie les tâches environ toutes les cinq minutes ; un retard reste possible. La dernière version enregistrée du brouillon sera publiée.',
        ],
        [
          'Un accès éditorial autorisé',
          'L’intégration utilise OAuth pour connecter un compte Trigenys Insight existant. Elle demande des droits de lecture, de modification et de publication. Elle ne crée pas de compte, ne gère pas d’autres sites et ne propose ni achat ni paiement.',
        ],
        [
          'Disponibilité du plugin',
          'L’intégration est actuellement utilisée avec une connexion MCP privée. Sa fiche destinée au répertoire OpenAI est en préparation ; sa publication dépendra des validations requises.',
        ],
      ]
    : [
        [
          'Prepare content',
          'List authors and categories, create drafts, revise text, and add research sources, images and related articles.',
        ],
        [
          'Publish on request',
          'Publishing makes an article public. Request it explicitly and review the content before confirming. Publication status is shared across French and English translations.',
        ],
        [
          'Choose a publication time',
          'Schedule a draft with a date, time and time zone. Reschedule or cancel before execution starts. The worker checks approximately every five minutes; delays are possible. The latest saved draft will be published.',
        ],
        [
          'Authorized editorial access',
          'The integration uses OAuth to connect an existing authorized Trigenys Insight account. It requests read, edit and publication permissions. It does not create accounts, manage other websites or offer purchases or payments.',
        ],
        [
          'Plugin availability',
          'The integration currently uses a private MCP connection. Its OpenAI directory listing is being prepared; publication depends on the required review process.',
        ],
      ]
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
      <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-purple-600 dark:text-purple-300">
        Trigenys Insight · ChatGPT
      </p>
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        {fr ? 'Votre rédaction, depuis ChatGPT.' : 'Your editorial workspace, in ChatGPT.'}
      </h1>
      <p className="mt-6 text-lg leading-8 text-muted-foreground">
        {fr
          ? 'Une intégration pour gérer les articles de Trigenys Insight avec un compte éditorial habilité. Éditrice du plugin : Jennifer Aka’a.'
          : 'An integration for managing Trigenys Insight articles with an authorized editorial account. Plugin publisher: Jennifer Aka’a.'}
      </p>
      <div className="mt-12 space-y-9">
        {sections.map(([title, body]) => (
          <section key={title}>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mt-3 leading-7 text-muted-foreground">{body}</p>
          </section>
        ))}
      </div>
      <section className="mt-12 border-t pt-8">
        <h2 className="text-xl font-semibold">{fr ? 'Assistance' : 'Support'}</h2>
        <p className="mt-3 leading-7">
          {fr
            ? 'Pour une question sur le plugin ou une demande concernant vos données, utilisez notre formulaire de contact. N’y transmettez pas de mot de passe ni de jeton.'
            : 'For plugin support or questions about your data, use our contact form. Do not send passwords or tokens.'}
        </p>
        <div className="mt-5 flex flex-wrap gap-6 underline underline-offset-4">
          <Link href={`/${locale}/contact`}>{fr ? 'Contacter Trigenys' : 'Contact Trigenys'}</Link>
          <Link href="/login">{fr ? 'Connexion éditoriale' : 'Editorial sign-in'}</Link>
          <Link href={`/${fr ? 'en' : 'fr'}/integrations/chatgpt`}>
            {fr ? 'English version' : 'Version française'}
          </Link>
        </div>
      </section>
    </main>
  )
}

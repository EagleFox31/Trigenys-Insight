import type { SiteLocale } from '@/i18n/config'
import { editorialRubrics, localizedRubricPath } from '@/editorial/rubrics'
import { getFaqItems, getKeyTakeaways } from '@/seo/answerContent'
import { isPublicLocalizedPost, type PublicSitemapPost } from '@/seo/postsSitemap'
import { absoluteCanonicalURL, SITE_IDENTITY } from '@/seo/structuredData'

export type LlmsSource = {
  title?: string | null
  publisher?: string | null
  url?: string | null
}

export type LlmsPost = PublicSitemapPost & {
  publishedAt?: string | null
  categories?: unknown[] | null
  sources?: unknown[] | null
  populatedAuthors?: { name?: string | null }[] | null
  keyTakeaways?: { text?: string | null }[] | null
  faq?: { question?: string | null; answer?: string | null }[] | null
}

export type LlmsPostsByLocale = Record<SiteLocale, LlmsPost[]>

type LexicalNode = {
  type?: string
  tag?: string
  listType?: string
  text?: string
  children?: LexicalNode[]
}

const LOCALE_LABELS: Record<SiteLocale, string> = {
  fr: 'French',
  en: 'English',
}

export const LLMS_CACHE_TAG = 'llms'

// Keeps llms-full.txt well under the context budget most agents fetch in one go.
export const LLMS_FULL_MAX_CHARS = 400_000

function oneLine(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function inlineText(node: LexicalNode): string {
  if (node.type === 'linebreak') return ' '
  if (typeof node.text === 'string') return node.text
  if (!Array.isArray(node.children)) return ''
  return node.children.map(inlineText).join('')
}

function blockText(node: LexicalNode, depth = 0): string[] {
  switch (node.type) {
    case 'heading': {
      const level = Number(node.tag?.replace('h', '')) || 2
      const text = oneLine(inlineText(node))
      return text ? [`${'#'.repeat(Math.min(Math.max(level, 2), 6))} ${text}`] : []
    }
    case 'paragraph': {
      const text = oneLine(inlineText(node))
      return text ? [text] : []
    }
    case 'quote': {
      const text = oneLine(inlineText(node))
      return text ? [`> ${text}`] : []
    }
    case 'list': {
      const ordered = node.listType === 'number'
      const items: string[] = []
      let position = 0

      for (const child of node.children || []) {
        const nested = (child.children || []).filter((grandChild) => grandChild.type === 'list')
        const text = oneLine(
          inlineText({
            ...child,
            children: (child.children || []).filter((c) => c.type !== 'list'),
          }),
        )

        if (text) {
          position += 1
          items.push(`${'  '.repeat(depth)}${ordered ? `${position}.` : '-'} ${text}`)
        }
        for (const list of nested) items.push(...blockText(list, depth + 1))
      }

      return items.length > 0 ? [items.join('\n')] : []
    }
    case 'horizontalrule':
    case 'upload':
    case 'block':
    case 'inlineBlock':
      return []
    default: {
      if (!Array.isArray(node.children)) return []
      return node.children.flatMap((child) => blockText(child, depth))
    }
  }
}

/** Plain-text (light Markdown) rendition of a Lexical rich-text document. */
export function lexicalToPlainText(content: unknown): string {
  if (typeof content !== 'object' || content === null) return ''

  const root = (content as { root?: LexicalNode }).root ?? (content as LexicalNode)
  return blockText(root).join('\n\n').trim()
}

function categoryTitles(categories: LlmsPost['categories']) {
  return (categories || [])
    .map((category) =>
      typeof category === 'object' && category !== null
        ? (category as { title?: string | null }).title?.trim()
        : null,
    )
    .filter((title): title is string => Boolean(title))
}

function publicSources(sources: LlmsPost['sources']) {
  return (sources || []).filter(
    (source): source is LlmsSource & { title: string; url: string } =>
      typeof source === 'object' &&
      source !== null &&
      Boolean((source as LlmsSource).title?.trim()) &&
      /^https?:\/\//i.test((source as LlmsSource).url || ''),
  )
}

function sortByRecency<T extends LlmsPost>(posts: T[]): T[] {
  return [...posts].sort((a, b) =>
    (b.publishedAt || b.updatedAt || '').localeCompare(a.publishedAt || a.updatedAt || ''),
  )
}

function postURL(locale: SiteLocale, slug: string) {
  return absoluteCanonicalURL(`/${locale}/posts/${slug}`)
}

function day(value?: string | null) {
  return value ? value.slice(0, 10) : undefined
}

const EDITORIAL_DESKS = editorialRubrics
  .map((rubric) =>
    '- ' + rubric.title.en + ': ' +
    absoluteCanonicalURL(localizedRubricPath(rubric, 'en')) +
    ' (FR: ' + absoluteCanonicalURL(localizedRubricPath(rubric, 'fr')) + ')',
  )
  .join('\n')

const HEADER = `# ${SITE_IDENTITY.name}

> ${SITE_IDENTITY.name} is an independent bilingual publication covering AI, technology, gaming, finance, education, African-made products and society. We provide sourced analysis, practical guides and original African perspectives in English and French.

Canonical site: ${SITE_IDENTITY.url}

## Languages

- French: ${absoluteCanonicalURL('/fr')}
- English: ${absoluteCanonicalURL('/en')}

## Editorial desks

${EDITORIAL_DESKS}

## Article archives

- French analysis: ${absoluteCanonicalURL('/fr/posts')}
- English analysis: ${absoluteCanonicalURL('/en/posts')}

## Discovery

- Pages sitemap: ${absoluteCanonicalURL('/pages-sitemap.xml')}
- Posts sitemap: ${absoluteCanonicalURL('/posts-sitemap.xml')}
- News sitemap: ${absoluteCanonicalURL('/news-sitemap.xml')}
- Full text of recent articles: ${absoluteCanonicalURL('/llms-full.txt')}

## Editorial approach

${SITE_IDENTITY.name} distinguishes verified facts, sourced claims, estimates and editorial analysis. Time-sensitive claims should be supported by current sources, with primary or official sources preferred when available. Comparative articles should explain criteria and context rather than manufacture an overall winner.

Preferred publication name when citing: ${SITE_IDENTITY.name}`

/** Concise llms.txt: publication guide followed by the latest articles per language. */
export function buildLlmsTxt(postsByLocale: LlmsPostsByLocale, limitPerLocale = 25) {
  const sections = [HEADER]

  for (const locale of ['fr', 'en'] as const) {
    const posts = sortByRecency(postsByLocale[locale].filter(isPublicLocalizedPost)).slice(
      0,
      limitPerLocale,
    )
    if (posts.length === 0) continue

    const lines = posts.map(
      (post) =>
        `- [${oneLine(post.title)}](${postURL(locale, post.slug)}): ${oneLine(post.excerpt)}`,
    )
    sections.push(`## Latest analysis (${LOCALE_LABELS[locale]})\n\n${lines.join('\n')}`)
  }

  return `${sections.join('\n\n')}\n`
}

const SECTION_LABELS: Record<SiteLocale, { takeaways: string; faq: string; sources: string }> = {
  fr: { takeaways: 'À retenir', faq: 'Questions fréquentes', sources: 'Sources' },
  en: { takeaways: 'Key takeaways', faq: 'Frequently asked questions', sources: 'Sources' },
}

/**
 * Markdown rendition of a published article for agents and answer engines:
 * metadata, editor takeaways, body, FAQ and public sources. Used by
 * llms-full.txt and by the per-article .md endpoint.
 */
export function renderPostMarkdown(
  locale: SiteLocale,
  post: LlmsPost & { title: string; slug: string; excerpt: string },
) {
  const labels = SECTION_LABELS[locale]
  const authors = (post.populatedAuthors || [])
    .map((author) => author?.name?.trim())
    .filter((name): name is string => Boolean(name))

  const meta = [
    `URL: ${postURL(locale, post.slug)}`,
    `Language: ${locale}`,
    authors.length > 0 && `Authors: ${authors.join(', ')}`,
    day(post.publishedAt) && `Published: ${day(post.publishedAt)}`,
    day(post.updatedAt) && `Updated: ${day(post.updatedAt)}`,
    categoryTitles(post.categories).length > 0 &&
      `Desk: ${categoryTitles(post.categories).join(', ')}`,
    `Publisher: ${SITE_IDENTITY.name}`,
  ].filter(Boolean)

  const takeaways = getKeyTakeaways(post as Parameters<typeof getKeyTakeaways>[0])
  const faq = getFaqItems(post as Parameters<typeof getFaqItems>[0])

  const sources = publicSources(post.sources).map((source) =>
    [`- ${oneLine(source.title)}`, source.publisher?.trim(), source.url]
      .filter(Boolean)
      .join(' — '),
  )

  return [
    `# ${oneLine(post.title)}`,
    meta.join('\n'),
    `> ${oneLine(post.excerpt)}`,
    takeaways.length > 0
      ? `## ${labels.takeaways}\n\n${takeaways.map((item) => `- ${item}`).join('\n')}`
      : '',
    lexicalToPlainText(post.content),
    faq.length > 0
      ? `## ${labels.faq}\n\n${faq.map((item) => `### ${item.question}\n\n${item.answer}`).join('\n\n')}`
      : '',
    sources.length > 0 ? `## ${labels.sources}\n\n${sources.join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}

/**
 * llms-full.txt: plain-text bodies of the most recent articles, newest first
 * across both languages, bounded by a character budget.
 */
export function buildLlmsFullTxt(postsByLocale: LlmsPostsByLocale, maxChars = LLMS_FULL_MAX_CHARS) {
  const intro = `# ${SITE_IDENTITY.name} — full text of recent articles\n\n> ${SITE_IDENTITY.description} Preferred publication name when citing: ${SITE_IDENTITY.name}. Each article below starts with its canonical URL; cite that URL.`

  const entries = (['fr', 'en'] as const)
    .flatMap((locale) =>
      postsByLocale[locale].filter(isPublicLocalizedPost).map((post) => ({ locale, post })),
    )
    .sort((a, b) =>
      (b.post.publishedAt || b.post.updatedAt || '').localeCompare(
        a.post.publishedAt || a.post.updatedAt || '',
      ),
    )

  let output = intro
  for (const { locale, post } of entries) {
    const block = `\n\n---\n\n${renderPostMarkdown(locale, post)}`
    if (output.length + block.length > maxChars) continue
    output += block
  }

  return `${output}\n`
}

'use client'

import type { SiteLocale } from '@/i18n/config'
import { getEditorialVisuals, localizedEditorialText } from '@/editorial/editorial-visuals'
import { useEffect } from 'react'

function textOf(element: Element) {
  return (element.textContent || '').replace(/\s+/g, ' ').trim()
}

function isQuestionParagraph(element: Element) {
  return element.tagName === 'P' && /[?？]$/.test(textOf(element))
}

export function ArticleBodyEnhancer({ locale, slug }: { locale: SiteLocale; slug: string }) {
  useEffect(() => {
    const content = document.querySelector<HTMLElement>('.article-content')
    if (!content || content.dataset.editorialEnhanced === 'true') return

    const children = Array.from(content.children)

    for (let index = 0; index < children.length; index += 1) {
      const node = children[index]

      if (node.tagName === 'H2') {
        const next = children[index + 1]
        if (next?.tagName === 'P' && !isQuestionParagraph(next)) {
          next.classList.add('article-section-lead')
        }
      }

      if (node.tagName === 'P') {
        const text = textOf(node)
        if (text.length > 0 && text.length <= 96 && !isQuestionParagraph(node)) {
          node.classList.add('article-short-beat')
        }
      }
    }

    let cursor = 0

    while (cursor < content.children.length) {
      const node = content.children[cursor]
      if (!node || !isQuestionParagraph(node)) {
        cursor += 1
        continue
      }

      const group: Element[] = []
      let probe = cursor

      while (probe < content.children.length) {
        const candidate = content.children[probe]
        if (!candidate || !isQuestionParagraph(candidate)) break
        group.push(candidate)
        probe += 1
      }

      if (group.length >= 3) {
        const wrapper = document.createElement('section')
        wrapper.className = 'article-question-cluster'
        wrapper.setAttribute('aria-label', locale === 'fr' ? 'Questions clés' : 'Key questions')

        const heading = document.createElement('div')
        heading.className = 'article-question-cluster__heading'
        heading.innerHTML =
          locale === 'fr'
            ? '<span>Questions clés</span><strong>Ce sont elles qui font passer une idée du papier au terrain.</strong>'
            : '<span>Key questions</span><strong>These are what turn an idea on paper into something that works in practice.</strong>'

        const grid = document.createElement('div')
        grid.className = 'article-question-cluster__grid'

        group[0].before(wrapper)
        wrapper.appendChild(heading)
        wrapper.appendChild(grid)

        group.forEach((paragraph, itemIndex) => {
          const card = document.createElement('div')
          card.className = 'article-question-card'

          const indexLabel = document.createElement('span')
          indexLabel.className = 'article-question-card__index'
          indexLabel.textContent = String(itemIndex + 1).padStart(2, '0')

          paragraph.classList.remove('article-short-beat')
          card.appendChild(indexLabel)
          card.appendChild(paragraph)
          grid.appendChild(card)
        })

        cursor += 1
        continue
      }

      cursor = probe
    }

    const visuals = getEditorialVisuals(slug)

    if (visuals) {
      for (const visual of visuals.sections) {
        const headingText = localizedEditorialText(visual.heading, locale)
        const heading = Array.from(content.querySelectorAll('h2')).find(
          (candidate) => textOf(candidate) === headingText,
        )

        if (!heading || heading.nextElementSibling?.classList.contains('article-editorial-figure')) {
          continue
        }

        const figure = document.createElement('figure')
        figure.className = 'article-editorial-figure'

        const image = document.createElement('img')
        image.src = visual.src
        image.alt = localizedEditorialText(visual.alt, locale)
        image.loading = 'lazy'
        image.decoding = 'async'
        image.width = 1600
        image.height = 900

        const caption = document.createElement('figcaption')
        caption.textContent = localizedEditorialText(visual.caption, locale)

        figure.appendChild(image)
        figure.appendChild(caption)

        const insertionPoint =
          heading.nextElementSibling?.tagName === 'P' ? heading.nextElementSibling : heading
        insertionPoint.after(figure)
      }
    }

    content.dataset.editorialEnhanced = 'true'
  }, [locale, slug])

  return null
}

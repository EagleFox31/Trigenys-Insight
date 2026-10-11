import type { Post } from '@/payload-types'

export type FaqItem = { question: string; answer: string }

function clean(value?: string | null) {
  return value?.replace(/\s+/g, ' ').trim() || ''
}

/** Editor-written key takeaways, trimmed and without empty rows. */
export function getKeyTakeaways(post: Pick<Post, 'keyTakeaways'>): string[] {
  return (post.keyTakeaways || []).map((row) => clean(row?.text)).filter(Boolean)
}

/** Complete question/answer pairs only: a half-filled row is never published. */
export function getFaqItems(post: Pick<Post, 'faq'>): FaqItem[] {
  return (post.faq || [])
    .map((row) => ({ question: clean(row?.question), answer: clean(row?.answer) }))
    .filter((item) => item.question && item.answer)
}

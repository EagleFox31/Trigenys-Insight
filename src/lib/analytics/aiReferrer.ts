// Answer engines that send readers to the site. Matched against the referrer
// host (exact or subdomain) or the utm_source some of them append to links.
export const AI_REFERRERS = [
  {
    id: 'chatgpt',
    hosts: ['chatgpt.com', 'chat.openai.com'],
    utmSources: ['chatgpt.com', 'chatgpt'],
  },
  { id: 'perplexity', hosts: ['perplexity.ai'], utmSources: ['perplexity', 'perplexity.ai'] },
  { id: 'gemini', hosts: ['gemini.google.com', 'bard.google.com'], utmSources: [] },
  { id: 'copilot', hosts: ['copilot.microsoft.com'], utmSources: ['copilot'] },
  { id: 'claude', hosts: ['claude.ai'], utmSources: ['claude.ai', 'claude'] },
  { id: 'deepseek', hosts: ['chat.deepseek.com'], utmSources: [] },
  { id: 'mistral', hosts: ['chat.mistral.ai'], utmSources: [] },
  { id: 'meta_ai', hosts: ['meta.ai'], utmSources: [] },
  { id: 'grok', hosts: ['grok.com'], utmSources: [] },
] as const

export type AiReferrer = (typeof AI_REFERRERS)[number]['id']

function referrerHost(referrer: string) {
  try {
    return referrer ? new URL(referrer).hostname.toLowerCase() : ''
  } catch {
    return ''
  }
}

export function classifyAiReferrer(referrer: string, search: string): AiReferrer | null {
  const host = referrerHost(referrer)
  const utmSource = (new URLSearchParams(search).get('utm_source') || '').toLowerCase()

  for (const engine of AI_REFERRERS) {
    if ((engine.utmSources as readonly string[]).includes(utmSource)) return engine.id
    if (engine.hosts.some((candidate) => host === candidate || host.endsWith(`.${candidate}`))) {
      return engine.id
    }
  }

  return null
}

/**
 * Inline counterpart of classifyAiReferrer, run right after posthog.init so the
 * landing page view already carries the session property. Same rules, plain ES5.
 */
export function aiReferralBootstrap() {
  return `
(function () {
  try {
    var engines = ${JSON.stringify(AI_REFERRERS)};
    var utm = (new URLSearchParams(location.search).get('utm_source') || '').toLowerCase();
    var host = '';
    try { host = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : ''; } catch (e) {}
    for (var i = 0; i < engines.length; i++) {
      var engine = engines[i];
      var match = engine.utmSources.indexOf(utm) > -1;
      for (var j = 0; !match && j < engine.hosts.length; j++) {
        var candidate = engine.hosts[j];
        match = host === candidate || host.slice(-candidate.length - 1) === '.' + candidate;
      }
      if (match) {
        posthog.register_for_session({ ai_referrer: engine.id });
        posthog.capture('ai_referral_landing', { ai_referrer: engine.id, landing_path: location.pathname });
        break;
      }
    }
  } catch (e) {}
})();
`
}

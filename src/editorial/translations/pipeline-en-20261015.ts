import { createSourcedEditorialDocument } from '../sourced-markdown-lexical'

export const pipelineEnglish = {
  title: 'I Built a Multi-Agent AI Pipeline in Four Hours',
  excerpt:
    'In June 2026, I built a prototype in four hours with three AI agents and two human approval steps. Here are the architecture, seven real problems and lessons learned, without the jargon.',
  metaTitle: 'A Multi-Agent AI Pipeline: Architecture, Bugs and Lessons',
  metaDescription:
    'A hands-on account of building Campaign OS with n8n, Gemini and human approvals: architecture, seven problems, real costs and reliability lessons.',
  content: createSourcedEditorialDocument(`*Speed proves an idea. Reliability proves a system.*

## What I actually built

In June 2026, I wanted to test a simple idea: could the early stages of a marketing campaign, from auditing a store and understanding its audience to developing strategic angles, become a process supported by several AI agents while keeping the important decisions in human hands?

Four hours later, a first prototype was working. It connected three specialist agents, two human approval steps, a web form and n8n orchestration. The amount billed during that prototyping session was €0. That figure describes a specific experiment using the quotas available on my accounts in June 2026. It is neither a promise of permanent free access nor a universal cost model.

Here are the architecture, the seven problems that actually slowed me down and what I would build differently today.

## The context: prototyping under constraints

I am building Trigenys with a constraint familiar to small teams: we need to test quickly, but every additional service costs money, needs maintenance and introduces another possible point of failure.

I was not trying to put together a spectacular demo. I wanted a usable workflow: a request comes in, the analysis moves through several stages, someone can accept or correct sensitive decisions, and the result comes back in a useful format.

The prototype, called Campaign OS, used n8n to coordinate the stages, Gemini 2.5 Flash for generative tasks, Gmail for approvals, and Claude through MCP, a protocol that lets one tool operate another, to speed up the construction of the workflow.

API plans and quotas change. In September 2026, Google explained that Gemini limits depend on the model, usage tier and project, and are not guaranteed. Good practice therefore means checking the project's active limits and measuring the actual cost of each run, rather than building a business plan around a fixed quota.

## Three agents, two human decisions

The first agent, Auditor, received the store's data and produced a structured assessment: apparent positioning, clarity of the message, friction in the customer journey and trust signals.

The second, Cartographer, turned that assessment into audience hypotheses: segments, motivations, objections and purchasing contexts.

The third, Strategist, proposed several campaign angles based on the assessment and audience map.

Between these stages, two human approval steps stopped the system from automatically continuing with a weak assumption. A person could approve, reject or request a correction. The aim was to place human judgment at the points where a poor decision would spread through the rest of the pipeline, rather than leave someone at the end to rubber-stamp the result.

## Why n8n rather than a custom backend

For this first version, n8n made dependencies, branches and the data moving between stages visible. That visibility mattered more than the elegance of an architecture written entirely in code.

The Wait node also let an execution pause until an approval arrived through a webhook: a URL automatically called by another service. The n8n documentation explains that data from a waiting execution is offloaded to the database and that each execution has its own resume URL. In other words, the workflow does not need to keep a server process busy throughout the wait. Resuming it, however, must be treated as a critical part of the system.

## The seven problems that really mattered

### 1. An available API is not necessarily ready to use

My first choice was the Anthropic API. On the account I was using that day, the access I wanted required activating billing. Rather than let that block the prototype, I switched to Gemini.

The lesson is not that one API is “free” and the other is not. Generative APIs are priced according to models and volumes, and access conditions change. Before development begins, check billing, project limits, available regions and what should happen when a limit is reached.

### 2. A Shopify refusal is not a protection to bypass

The audit of a client's store was receiving 403 responses. My first instinct was to work out how to make the requests acceptable. The correct approach is stricter: identify the agent properly and obtain the appropriate authorization.

Since May 2026, Shopify has applied stricter limits to bots and agents accessing hosted pages and recommends Web Bot Auth for signing requests. Merchants crawling their own stores can obtain ready-to-use signatures from their Shopify administration.

For a product serving several clients, I would therefore never present this step as bypassing a protection. I would make it an explicit consent flow, with a signature tied to the correct domain and a fallback when access is not authorized.

### 3. The exact domain is part of the signed identity

During testing, a signature prepared for the bare domain did not work when the request went to the www version. That may sound like a tiny detail, but it matters in an HTTP signing mechanism.

Normalize the URL at the point of entry, follow redirects in a controlled way and sign the exact authority being called. A subdomain difference should never be patched at random halfway through the workflow.

### 4. Valid JSON can make a terrible interface

The first approval requests arrived by email as raw JSON. The data was complete, but making a human decision became unnecessarily difficult.

I replaced that output with a readable summary: headings, priority findings, risks, recommendations and decision buttons. This did not improve the model. It improved the system, because a quick approval depends as much on how an analysis is presented as on its quality.

### 5. Building a URL by hand eventually breaks

I initially appended “?approved=true” to the resume URL. Some URLs already had a query string, so they needed “&”, not a second “?”.

The durable fix is to use URL and URLSearchParams, then test existing parameters, encoding and redirects. A URL is a data structure, not a string to assemble by intuition.

### 6. Resume URLs belong to the current execution

In n8n, the URL exposed through $execution.resumeUrl is generated for the current execution. The documentation also warns that partial executions can produce a new resume URL.

I therefore now treat that URL as a temporary token: it must go to the right recipient, stay out of public logs, expire with the execution and never be copied from an earlier test.

### 7. Stable instructions and changing data serve different purposes

At first, I mixed the agent's mission, output rules and client data in a single user message. It worked, but became difficult to evaluate and maintain.

I separated stable instructions, including the role, constraints and expected structure, from inputs specific to each run. This makes testing, model changes and comparisons between results easier.

## The observed result

On the prototype, a complete analysis took around five to ten minutes, including human approval time. This is not yet a benchmark: it came from a small number of tests, without concurrent load or a formal evaluation dataset.

The real gain was traceability. Each stage received an identifiable input, produced structured output and waited for a decision when uncertainty could change what happened next.

## What the experiment changes economically

This prototype makes a faster audit and campaign-preparation service plausible, but it does not establish a price, margin or market demand. The amounts initially considered, from a one-off audit to a complete support package, remain commercial hypotheses to test with real clients.

The marginal cost of a run was close to zero under the conditions of the experiment. At scale, however, the full calculation must include the volume of text processed by models, measured in tokens, emails, storage, error and performance monitoring, retries, human review time and support. Profitable automation is automation whose total cost is measured, not simply a system whose first API bill happens to be empty.

## What I would build differently today

I would add an evaluation dataset, a set of test cases with expected results, before changing prompts or models. I would version the instructions and record the model used at each stage.

I would make every resume operation safe to repeat, or idempotent: a double click or replayed webhook should never trigger two campaigns. I would add expiry times, bounded retries and an inspectable failure queue.

I would track the cost and duration of every run. I would keep secrets separate from functional configuration and limit the client data sent to model providers to what is strictly necessary.

Finally, I would retain the sources used by the audit. A recommendation becomes much more useful when we can return to the signal that prompted it.

## What I take from it

Building under constraints forces us to distinguish what is essential from what is decorative. Three agents are useful only when their responsibilities are genuinely distinct. Two human approval steps have value only when they happen before errors spread.

AI did not remove the need for method. It made weaknesses in that method more visible: misunderstood permissions, hand-built URLs, unreadable outputs and untested commercial assumptions.

Four hours were enough to establish a proof of concept. Turning that proof into a reliable product then requires the less spectacular, more important work of security, evaluation, observability and consent.

This article opens Trigenys Insight's field notes: technical experiments told through their limitations, sources and the decisions they help us make.`),
}

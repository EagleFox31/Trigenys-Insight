import { DurableObject } from 'cloudflare:workers'
import worker from './handlers.mjs'
import { PublicationClockState } from './clock.mjs'

// One coordination object for this application's publication queue. Article
// data stays in the CMS; only the next alarm and execution receipts live here.
export class PublicationClock extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env)
    this.clock = new PublicationClockState(ctx.storage, env)
  }
  wake(at) {
    return this.clock.wake(at)
  }
  status() {
    return this.clock.status()
  }
  reconcile(reason) {
    return this.clock.reconcile(reason)
  }
  alarm() {
    return this.clock.reconcile('alarm')
  }
}

export default worker

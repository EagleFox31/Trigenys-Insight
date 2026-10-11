import { permanentRedirect } from 'next/navigation'

// Backstop for old links; next.config also installs a 308 at the edge.
export default function Page() {
  permanentRedirect('/fr/business-finance')
}

import React from 'react'

import { SeedButton } from './SeedButton'
import './index.scss'

const baseClass = 'before-dashboard'

const BeforeDashboard: React.FC = () => {
  return (
    <section aria-labelledby="editorial-import-title" className={baseClass}>
      <div>
        <p className={`${baseClass}__eyebrow`}>Lancement éditorial</p>
        <h2 id="editorial-import-title">Préparer le premier article</h2>
        <p className={`${baseClass}__description`}>
          Importe les catégories, les sources de recherche et le premier article en brouillon.
          L’opération est idempotente et ne publie rien automatiquement.
        </p>
      </div>
      <SeedButton />
    </section>
  )
}

export default BeforeDashboard

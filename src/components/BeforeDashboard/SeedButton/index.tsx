'use client'

import Link from 'next/link'
import React, { useCallback, useState } from 'react'
import { toast } from '@payloadcms/ui'

import './index.scss'

const SuccessMessage: React.FC = () => (
  <div>
    Contenu éditorial importé. Tu peux maintenant{' '}
    <Link href="/admin/collections/posts">relire le brouillon</Link>.
  </div>
)

export const SeedButton: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [seeded, setSeeded] = useState(false)

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()

      if (seeded) {
        toast.info('Le contenu a déjà été importé pendant cette session.')
        return
      }
      if (loading) {
        toast.info('Import déjà en cours.')
        return
      }

      setLoading(true)

      try {
        const response = await fetch('/next/seed', {
          method: 'POST',
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error(await response.text())
        }

        setSeeded(true)
        toast.success(<SuccessMessage />)
      } catch (err) {
        console.error(err)
        toast.error('L’import a échoué. Réessaie ou contacte le support technique.')
      } finally {
        setLoading(false)
      }
    },
    [loading, seeded],
  )

  return (
    <button className="seedButton" disabled={loading || seeded} onClick={handleClick} type="button">
      {loading ? 'Import en cours…' : seeded ? 'Contenu importé' : 'Importer le contenu'}
    </button>
  )
}

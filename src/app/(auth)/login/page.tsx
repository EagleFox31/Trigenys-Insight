import Link from 'next/link'

import { LoginForm } from './LoginForm'
import './styles.css'

export default function LoginPage() {
  return (
    <main className="admin-login">
      <section aria-labelledby="admin-login-title" className="admin-login__panel">
        <Link className="admin-login__brand" href="/">
          <span aria-hidden="true" className="admin-login__mark">
            T
          </span>
          <span>
            <strong>TRIGENYS</strong> <em>INSIGHTS</em>
          </span>
        </Link>

        <div className="admin-login__heading">
          <p>ESPACE ÉDITORIAL</p>
          <h1 id="admin-login-title">Bon retour.</h1>
          <span>Connecte-toi pour gérer les articles, rapports et sources de recherche.</span>
        </div>

        <LoginForm />

        <Link className="admin-login__back" href="/">
          ← Retour au site
        </Link>
      </section>

      <aside aria-hidden="true" className="admin-login__story">
        <div>
          <p>RESEARCH FOR BETTER DECISIONS</p>
          <blockquote>
            Comprendre les systèmes.
            <br />
            Construire l’avenir.
            <br />
            <em>Garder le cap.</em>
          </blockquote>
        </div>
      </aside>
    </main>
  )
}

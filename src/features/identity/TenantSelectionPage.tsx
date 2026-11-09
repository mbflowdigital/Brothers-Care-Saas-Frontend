import { useState } from 'react'
import { ArrowRight, Building2, HeartPulse, LoaderCircle, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { selectActiveTenant } from './accountActionApi'
import { toUiSession, type AuthenticatedUiSession } from './LoginPage'

export function TenantSelectionPage({ session, onSelect }: { session: AuthenticatedUiSession; onSelect: (session: AuthenticatedUiSession) => void }) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function select(tenantId: string) {
    setError(''); setLoadingId(tenantId)
    try {
      const next = toUiSession(await selectActiveTenant(tenantId))
      onSelect(next)
      navigate(next.profile === 'professional' ? '/app/minha-agenda' : '/app/dashboard', { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível abrir a empresa. Tente novamente.')
    } finally { setLoadingId(null) }
  }

  return <main className="tenant-selection-page">
    <header><Link to="/" className="public-brand"><span className="brand-mark"><HeartPulse size={18} strokeWidth={2.5} /></span><span>brothers care</span></Link><span><ShieldCheck /> Sessão protegida</span></header>
    <section className="tenant-selection-card">
      <div className="eyebrow">Olá, {session.name.split(' ')[0]}</div>
      <h1>Qual empresa você quer acessar?</h1>
      <p>Escolha o ambiente de trabalho desta sessão. Seus dados e permissões permanecem separados por empresa.</p>
      <div className="tenant-options">{session.memberships.map((membership) => <button key={membership.id} type="button" onClick={() => void select(membership.tenantId)} disabled={loadingId !== null}><span className="tenant-option-icon"><Building2 /></span><span><strong>{membership.tenantName}</strong><small>{membership.role === 'ClinicAdministrator' ? 'Administração da clínica' : 'Espaço profissional'}</small></span>{loadingId === membership.tenantId ? <LoaderCircle className="spin" /> : <ArrowRight />}</button>)}</div>
      {error && <div className="login-error" role="alert">{error}</div>}
      <small className="tenant-selection-note">Você fará esta escolha novamente no próximo login.</small>
    </section>
  </main>
}

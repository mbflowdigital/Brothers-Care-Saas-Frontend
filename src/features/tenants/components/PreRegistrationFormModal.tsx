import { LoaderCircle, X } from 'lucide-react'
import { useEffect, type FormEvent } from 'react'
import type { TenantPreRegistrationInput } from '../../identity/accountActionApi'

type Props = {
  editing: boolean
  form: TenantPreRegistrationInput
  saving: boolean
  error: string
  onChange: (form: TenantPreRegistrationInput) => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

const formatCnpj = (value: string) => value.replace(/\D/g, '').slice(0, 14)
  .replace(/^(\d{2})(\d)/, '$1.$2')
  .replace(/^(\d{2}\.\d{3})(\d)/, '$1.$2')
  .replace(/\.(\d{3})(\d)/, '.$1/$2')
  .replace(/(\d{4})(\d)/, '$1-$2')

export function PreRegistrationFormModal({ editing, form, saving, error, onChange, onClose, onSubmit }: Props) {
  const update = (field: keyof TenantPreRegistrationInput, value: string) => onChange({ ...form, [field]: value })
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose, saving])

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget && !saving) onClose()
  }}>
    <section className="modal pre-registration-modal" role="dialog" aria-modal="true" aria-labelledby="pre-registration-title">
      <button className="modal-close" onClick={onClose} aria-label="Fechar" type="button" disabled={saving}><X /></button>
      <div className="eyebrow">ATIVAÇÃO DE CLÍNICA</div>
      <h2 id="pre-registration-title">{editing ? 'Editar pré-cadastro' : 'Novo pré-cadastro'}</h2>
      <p>O responsável receberá um convite para completar o cadastro e configurar a primeira unidade.</p>

      <form onSubmit={onSubmit}>
        <div className="form-grid">
          <div className="field full"><label htmlFor="company-name">Nome da clínica</label><input id="company-name" value={form.companyName} onChange={(event) => update('companyName', event.target.value)} maxLength={200} required autoFocus /></div>
          <div className="field"><label htmlFor="company-cnpj">CNPJ</label><input id="company-cnpj" value={form.cnpj} onChange={(event) => update('cnpj', formatCnpj(event.target.value))} inputMode="numeric" minLength={18} maxLength={18} required /></div>
          <div className="field"><label htmlFor="responsible-name">Responsável</label><input id="responsible-name" value={form.responsibleName} onChange={(event) => update('responsibleName', event.target.value)} maxLength={200} required /></div>
          <div className="field full"><label htmlFor="responsible-email">E-mail do responsável</label><input id="responsible-email" type="email" value={form.responsibleEmail} onChange={(event) => update('responsibleEmail', event.target.value)} maxLength={320} required /></div>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-footer">
          <button type="button" className="button button-outline" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="button button-primary" disabled={saving}>
            {saving ? <><LoaderCircle className="spin" />Salvando...</> : editing ? 'Salvar alterações' : 'Cadastrar e enviar convite'}
          </button>
        </div>
      </form>
    </section>
  </div>
}

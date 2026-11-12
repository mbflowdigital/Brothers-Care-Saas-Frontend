import { AlertTriangle, ArrowRight, Check, CheckCircle2, Copy, LoaderCircle, Mail, ShieldCheck, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { TenantListItem } from '../../identity/accountActionApi'

export function CancelPreRegistrationDialog({
  item,
  busy,
  onCancel,
  onConfirm,
}: {
  item: TenantListItem
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [busy, onCancel])

  return <div className="modal-backdrop confirmation-backdrop" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget && !busy) onCancel()
  }}>
    <section className="confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby="cancel-pre-registration-title" aria-describedby="cancel-pre-registration-description">
      <button className="modal-close" type="button" onClick={onCancel} disabled={busy} aria-label="Fechar"><X /></button>
      <span className="confirmation-dialog-icon"><AlertTriangle /></span>
      <div className="eyebrow">CONFIRMAR CANCELAMENTO</div>
      <h2 id="cancel-pre-registration-title">Cancelar o convite de {item.name}?</h2>
      <p id="cancel-pre-registration-description">O link atual deixará de funcionar, mas o histórico do pré-cadastro será preservado. Esta clínica não conseguirá concluir o onboarding sem um novo cadastro.</p>
      <div className="confirmation-dialog-actions">
        <button className="button button-outline" type="button" onClick={onCancel} disabled={busy}>Manter pré-cadastro</button>
        <button className="button button-danger-solid" type="button" onClick={onConfirm} disabled={busy}>
          {busy ? <><LoaderCircle className="spin" />Cancelando...</> : 'Sim, cancelar convite'}
        </button>
      </div>
    </section>
  </div>
}

export function DeletePreRegistrationDialog({
  item,
  busy,
  onCancel,
  onConfirm,
}: {
  item: TenantListItem
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const [confirmation, setConfirmation] = useState('')
  const matches = confirmation.trim().toLocaleLowerCase('pt-BR') === item.name.trim().toLocaleLowerCase('pt-BR')
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [busy, onCancel])

  return <div className="modal-backdrop confirmation-backdrop" role="presentation">
    <section className="confirmation-dialog deletion-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-pre-registration-title" aria-describedby="delete-pre-registration-description">
      <button className="modal-close" type="button" onClick={onCancel} disabled={busy} aria-label="Fechar"><X /></button>
      <span className="confirmation-dialog-icon danger"><Trash2 /></span>
      <div className="eyebrow">EXCLUSÃO PERMANENTE</div>
      <h2 id="delete-pre-registration-title">Excluir este pré-cadastro?</h2>
      <p id="delete-pre-registration-description">Essa ação remove definitivamente a clínica, o convite e seus vínculos de pré-cadastro. Ela não poderá ser desfeita.</p>
      <label className="deletion-confirmation-field" htmlFor="delete-confirmation">
        <span>Digite <strong>{item.name}</strong> para confirmar</span>
        <input id="delete-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={busy} autoComplete="off" autoFocus />
      </label>
      <div className="confirmation-dialog-actions">
        <button className="button button-outline" type="button" onClick={onCancel} disabled={busy}>Voltar</button>
        <button className="button button-danger-solid" type="button" onClick={onConfirm} disabled={busy || !matches}>
          {busy ? <><LoaderCircle className="spin" />Excluindo...</> : <><Trash2 />Excluir permanentemente</>}
        </button>
      </div>
    </section>
  </div>
}

export function OnboardingPreparationOverlay({ clinicName }: { clinicName: string }) {
  return <div className="operation-overlay" role="status" aria-live="polite">
    <section className="operation-card">
      <div className="operation-animation" aria-hidden="true">
        <span className="operation-ring" />
        <span className="operation-core"><ShieldCheck /></span>
      </div>
      <div className="eyebrow">ACESSO ASSISTIDO</div>
      <h2>Preparando o onboarding</h2>
      <p>Estamos criando um novo convite seguro para <strong>{clinicName}</strong>.</p>
      <div className="operation-steps">
        <span className="done"><Check />Validando o pré-cadastro</span>
        <span className="active"><LoaderCircle className="spin" />Gerando o link protegido</span>
        <span><Mail />Abrindo a jornada da clínica</span>
      </div>
      <small>Isso costuma levar apenas alguns segundos.</small>
    </section>
  </div>
}

export function PreRegistrationSuccessDialog({
  clinicName,
  onboardingUrl,
  onClose,
}: {
  clinicName: string
  onboardingUrl: string
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const copyLink = async () => {
    if (!onboardingUrl) return
    await navigator.clipboard.writeText(onboardingUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return <div className="modal-backdrop confirmation-backdrop" role="presentation">
    <section className="confirmation-dialog pre-registration-success-dialog" role="dialog" aria-modal="true" aria-labelledby="pre-registration-success-title">
      <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar"><X /></button>
      <span className="confirmation-dialog-icon success"><CheckCircle2 /></span>
      <div className="eyebrow">PRÉ-CADASTRO CONCLUÍDO</div>
      <h2 id="pre-registration-success-title">Tudo pronto para {clinicName}</h2>
      <p>A clínica foi adicionada no topo da lista e o convite seguro de onboarding já está disponível.</p>
      <div className="success-dialog-note"><ShieldCheck /><span><strong>{onboardingUrl ? 'Link protegido gerado' : 'Pré-cadastro salvo'}</strong><small>{onboardingUrl ? 'O responsável poderá completar o cadastro e criar seu acesso.' : 'O convite poderá ser acessado pelas ações da lista.'}</small></span></div>
      {onboardingUrl && <div className="confirmation-dialog-actions success-dialog-actions">
        <button className="button button-outline" type="button" onClick={() => void copyLink()}>{copied ? <><Check />Link copiado</> : <><Copy />Copiar link</>}</button>
        <a className="button button-primary" href={onboardingUrl}>Iniciar onboarding <ArrowRight /></a>
      </div>}
      <button className="success-dialog-finish" type="button" onClick={onClose}>Concluir e voltar à lista</button>
    </section>
  </div>
}

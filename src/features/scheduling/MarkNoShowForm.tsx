import { useState } from 'react'
import type { FormEvent } from 'react'
import { UserX } from 'lucide-react'
import { markAppointmentNoShow, type AppointmentScheduleItem } from './schedulingApi'

export function MarkNoShowForm({ appointment, onCompleted, onCancel }: {
  appointment: AppointmentScheduleItem
  onCompleted: () => void
  onCancel: () => void
}) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!reason.trim()) {
      setError('Informe o motivo da falta.')
      return
    }

    setError('')
    setSubmitting(true)
    try {
      await markAppointmentNoShow(appointment.id, { reason: reason.trim() })
      onCompleted()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível registrar a falta.')
    } finally {
      setSubmitting(false)
    }
  }

  return <form className="appointment-cancel-form" onSubmit={submit} aria-busy={submitting}>
    <div className="appointment-cancel-warning appointment-no-show-warning"><UserX /><div><strong>Registrar falta</strong><p>O atendimento ficará no histórico como falta do paciente.</p></div></div>
    <div className="field">
      <label htmlFor="appointment-no-show-reason">Motivo da falta <b>*</b></label>
      <textarea id="appointment-no-show-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={3} placeholder="Ex.: paciente não compareceu" disabled={submitting} required />
      <small className="appointment-cancel-counter">{reason.length}/500</small>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="appointment-reschedule-actions">
      <button type="button" className="button button-outline" onClick={onCancel} disabled={submitting}>Voltar</button>
      <button type="submit" className="button button-danger-solid" disabled={submitting}>{submitting ? 'Registrando…' : 'Confirmar falta'}</button>
    </div>
  </form>
}

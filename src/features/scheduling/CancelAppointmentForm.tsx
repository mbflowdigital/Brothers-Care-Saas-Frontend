import { useState } from 'react'
import type { FormEvent } from 'react'
import { CircleAlert } from 'lucide-react'
import { cancelAppointment, type AppointmentScheduleItem } from './schedulingApi'

export function CancelAppointmentForm({ appointment, onCompleted, onCancel }: {
  appointment: AppointmentScheduleItem
  onCompleted: () => void
  onCancel: () => void
}) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedReason = reason.trim()
    if (!normalizedReason) {
      setError('Informe o motivo do cancelamento.')
      return
    }

    setError('')
    setSubmitting(true)
    try {
      await cancelAppointment(appointment.id, { reason: normalizedReason })
      onCompleted()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível cancelar o atendimento.')
    } finally {
      setSubmitting(false)
    }
  }

  return <form className="appointment-cancel-form" onSubmit={submit} aria-busy={submitting}>
    <div className="appointment-cancel-warning"><CircleAlert /><div><strong>Cancelar atendimento</strong><p>O atendimento continuará no histórico como cancelado.</p></div></div>
    <div className="field">
      <label htmlFor="appointment-cancellation-reason">Motivo do cancelamento <b>*</b></label>
      <textarea
        id="appointment-cancellation-reason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        maxLength={500}
        rows={3}
        placeholder="Ex.: solicitação do paciente"
        disabled={submitting}
        required
      />
      <small className="appointment-cancel-counter">{reason.length}/500</small>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="appointment-reschedule-actions">
      <button type="button" className="button button-outline" onClick={onCancel} disabled={submitting}>Voltar</button>
      <button type="submit" className="button button-danger-solid" disabled={submitting}>{submitting ? 'Cancelando…' : 'Confirmar cancelamento'}</button>
    </div>
  </form>
}

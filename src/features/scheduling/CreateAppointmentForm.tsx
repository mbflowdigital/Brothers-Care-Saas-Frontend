import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { CalendarDays, CheckCircle2 } from 'lucide-react'
import { addMinutesToLocalDateTime, localDateTimeToOffsetIso } from './dateTime'
import { createAppointment, getSchedulingOptions, type SchedulingOptions } from './schedulingApi'

export function CreateAppointmentForm({ onCreated }: { onCreated: () => void }) {
  const [options, setOptions] = useState<SchedulingOptions | null>(null)
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [optionsError, setOptionsError] = useState('')
  const [retry, setRetry] = useState(0)
  const [patientId, setPatientId] = useState('')
  const [clinicUnitId, setClinicUnitId] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    setLoadingOptions(true)
    setOptionsError('')
    getSchedulingOptions()
      .then((result) => {
        if (!active) return
        setOptions(result)
        if (result.clinicUnits.length === 1) setClinicUnitId(result.clinicUnits[0].id)
      })
      .catch((caught: unknown) => {
        if (active) setOptionsError(caught instanceof Error ? caught.message : 'Não foi possível carregar as opções.')
      })
      .finally(() => {
        if (active) setLoadingOptions(false)
      })
    return () => { active = false }
  }, [retry])

  const selectedUnit = options?.clinicUnits.find((unit) => unit.id === clinicUnitId)
  const hasOptions = Boolean(options?.patients.length && options.clinicUnits.length)

  function updateStartsAt(value: string) {
    setStartsAt(value)
    if (!value) {
      setEndsAt('')
      return
    }
    const duration = options?.defaultAppointmentDurationMinutes
    if (duration && duration > 0) setEndsAt(addMinutesToLocalDateTime(value, duration))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!selectedUnit) {
      setError('Selecione uma unidade para continuar.')
      return
    }

    let created = false
    try {
      const startWithOffset = localDateTimeToOffsetIso(startsAt, selectedUnit.timeZoneId)
      const endWithOffset = localDateTimeToOffsetIso(endsAt, selectedUnit.timeZoneId)
      const startMilliseconds = Date.parse(startWithOffset)
      const endMilliseconds = Date.parse(endWithOffset)
      if (startMilliseconds < Date.now()) {
        setError('O horário inicial precisa estar no presente ou no futuro.')
        return
      }
      if (endMilliseconds <= startMilliseconds) {
        setError('O horário final precisa ser posterior ao horário inicial.')
        return
      }

      setSubmitting(true)
      await createAppointment({
        patientId,
        clinicUnitId,
        startsAt: startWithOffset,
        endsAt: endWithOffset,
        notes: notes.trim() || null,
      })
      created = true
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível criar o agendamento.')
    } finally {
      setSubmitting(false)
    }
    if (created) onCreated()
  }

  return <form className="record-form" onSubmit={submit} aria-busy={loadingOptions || submitting}>
    <div className="form-intro">
      <span className="form-step"><CalendarDays size={15}/></span>
      <div>
        <strong>Agende um atendimento</strong>
        <small>Os horários serão interpretados no fuso da unidade selecionada.</small>
      </div>
    </div>

    {loadingOptions
      ? <p role="status" className="modal-copy">Carregando pacientes e unidades disponíveis…</p>
      : optionsError
        ? <div className="form-error" role="alert">{optionsError}<button type="button" className="link-button" onClick={() => setRetry((value) => value + 1)}>Tentar novamente</button></div>
        : !hasOptions
          ? <p className="modal-copy" role="status">Não há pacientes ativos vinculados ou unidades disponíveis para agendamento.</p>
          : <div className="form-grid">
            <div className="field full">
              <label htmlFor="appointment-patient">Paciente <b>*</b></label>
              <select id="appointment-patient" value={patientId} onChange={(event) => setPatientId(event.target.value)} required>
                <option value="" disabled>Selecione um paciente</option>
                {options?.patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.fullName}</option>)}
              </select>
            </div>
            <div className="field full">
              <label htmlFor="appointment-unit">Unidade <b>*</b></label>
              <select
                id="appointment-unit"
                value={clinicUnitId}
                onChange={(event) => {
                  setClinicUnitId(event.target.value)
                  setStartsAt('')
                  setEndsAt('')
                  setError('')
                }}
                required
              >
                <option value="" disabled>Selecione uma unidade</option>
                {options?.clinicUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
              </select>
              {selectedUnit && <small>Fuso horário: {selectedUnit.timeZoneId}</small>}
            </div>
            <div className="field">
              <label htmlFor="appointment-start">Início <b>*</b></label>
              <input id="appointment-start" type="datetime-local" value={startsAt} onChange={(event) => updateStartsAt(event.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="appointment-end">Término <b>*</b></label>
              <input id="appointment-end" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} required />
              {options?.defaultAppointmentDurationMinutes && <small>Duração sugerida: {options.defaultAppointmentDurationMinutes} minutos.</small>}
            </div>
            <div className="field full">
              <label htmlFor="appointment-notes">Observação <span>(opcional)</span></label>
              <textarea id="appointment-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} rows={3} />
              <small>{notes.length}/1000 caracteres</small>
            </div>
          </div>}

    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="form-footer">
      <span><CheckCircle2 size={13}/>O profissional e a empresa são definidos pela sessão.</span>
      <button className="button button-primary" type="submit" disabled={loadingOptions || submitting || !hasOptions}>
        {submitting ? 'Salvando…' : 'Criar agendamento'}
      </button>
    </div>
  </form>
}

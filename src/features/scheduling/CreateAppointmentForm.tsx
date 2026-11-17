import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, CheckCircle2 } from 'lucide-react'
import { addMinutesToLocalDateTime, getTodayInTimeZone, offsetIsoToLocalDateTime } from './dateTime'
import {
  createAppointment,
  getAvailableAppointmentSlots,
  getSchedulingOptions,
  type AvailableAppointmentSlot,
  type SchedulingOptions,
} from './schedulingApi'

const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export function CreateAppointmentForm({ onCreated }: { onCreated: () => void }) {
  const [options, setOptions] = useState<SchedulingOptions | null>(null)
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [optionsError, setOptionsError] = useState('')
  const [retry, setRetry] = useState(0)
  const [patientId, setPatientId] = useState('')
  const [clinicUnitId, setClinicUnitId] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [availableSlots, setAvailableSlots] = useState<AvailableAppointmentSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotsError, setSlotsError] = useState('')
  const [slotsRetry, setSlotsRetry] = useState(0)
  const [visibleMonth, setVisibleMonth] = useState(monthStart(new Date()))
  const [durationMinutes, setDurationMinutes] = useState(60)
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
        const initialUnit = result.clinicUnits[0]
        if (initialUnit) {
          setClinicUnitId(initialUnit.id)
          const today = getTodayInTimeZone(initialUnit.timeZoneId)
          setSelectedDate(today)
          setVisibleMonth(`${today.slice(0, 7)}-01`)
        }
        if (result.defaultAppointmentDurationMinutes && result.defaultAppointmentDurationMinutes > 0) {
          setDurationMinutes(result.defaultAppointmentDurationMinutes)
        }
      })
      .catch((caught: unknown) => {
        if (active) setOptionsError(caught instanceof Error ? caught.message : 'Não foi possível carregar as opções.')
      })
      .finally(() => { if (active) setLoadingOptions(false) })
    return () => { active = false }
  }, [retry])

  const selectedUnit = options?.clinicUnits.find((unit) => unit.id === clinicUnitId)
  const timeZoneId = selectedUnit?.timeZoneId ?? 'America/Sao_Paulo'
  const today = getTodayInTimeZone(timeZoneId)
  const dates = useMemo(() => getMonthDates(visibleMonth), [visibleMonth])
  const durationOptions = [...new Set([30, 45, 60, 90, 120, durationMinutes])].sort((left, right) => left - right)
  const selectedSlot = availableSlots.find((slot) =>
    getSlotTime(slot, timeZoneId) === selectedTime)
  const endPreview = selectedDate && selectedTime
    ? addMinutesToLocalDateTime(`${selectedDate}T${selectedTime}`, durationMinutes).slice(11, 16)
    : ''
  const hasOptions = Boolean(options?.patients.length && options.clinicUnits.length)

  useEffect(() => {
    if (!options?.professionalId || !patientId || !selectedUnit || !selectedDate) {
      setAvailableSlots([])
      setSlotsError('')
      setLoadingSlots(false)
      setSelectedTime('')
      return
    }

    let active = true
    setAvailableSlots([])
    setSlotsError('')
    setLoadingSlots(true)
    getAvailableAppointmentSlots({
      patientId,
      clinicUnitId,
      date: selectedDate,
      durationMinutes,
    })
      .then((slots) => {
        if (!active) return
        setAvailableSlots(slots)
        setSelectedTime((current) =>
          slots.some((slot) => getSlotTime(slot, selectedUnit.timeZoneId) === current) ? current : '')
      })
      .catch((caught: unknown) => {
        if (!active) return
        setAvailableSlots([])
        setSelectedTime('')
        setSlotsError(caught instanceof Error ? caught.message : 'Não foi possível consultar os horários disponíveis.')
      })
      .finally(() => { if (active) setLoadingSlots(false) })

    return () => { active = false }
  }, [clinicUnitId, durationMinutes, options?.professionalId, patientId, selectedDate, selectedUnit, slotsRetry])

  function changeUnit(unitId: string) {
    setClinicUnitId(unitId)
    const unit = options?.clinicUnits.find((item) => item.id === unitId)
    if (unit) {
      const date = getTodayInTimeZone(unit.timeZoneId)
      setSelectedDate(date)
      setVisibleMonth(`${date.slice(0, 7)}-01`)
    }
    setSelectedTime('')
    setError('')
  }

  function changeDate(date: string) {
    setSelectedDate(date)
    setSelectedTime('')
    setError('')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!selectedUnit || !patientId || !selectedDate || !selectedSlot) {
      setError('Selecione paciente, unidade, dia e um horário disponível para continuar.')
      return
    }

    try {
      if (Date.parse(selectedSlot.startsAt) < Date.now()) {
        setError('Escolha um horário futuro para criar o agendamento.')
        return
      }
      setSubmitting(true)
      await createAppointment({
        patientId,
        clinicUnitId,
        startsAt: selectedSlot.startsAt,
        endsAt: selectedSlot.endsAt,
        notes: notes.trim() || null,
      })
      onCreated()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível criar o agendamento.')
    } finally {
      setSubmitting(false)
    }
  }

  return <form className="record-form appointment-create-form" onSubmit={submit} aria-busy={loadingOptions || loadingSlots || submitting}>
    <div className="form-intro">
      <span className="form-step"><CalendarDays size={15}/></span>
      <div><strong>Agende um atendimento</strong><small>Escolha o paciente, dia e horário para reservar a sessão.</small></div>
    </div>
    {loadingOptions
      ? <p role="status" className="modal-copy">Carregando pacientes e unidades disponíveis…</p>
      : optionsError
        ? <div className="form-error" role="alert">{optionsError}<button type="button" className="link-button" onClick={() => setRetry((value) => value + 1)}>Tentar novamente</button></div>
        : !hasOptions
          ? <p className="modal-copy" role="status">Não há pacientes ativos vinculados ou unidades disponíveis para agendamento.</p>
          : <>
            <div className="form-grid">
              <div className="field full"><label htmlFor="appointment-patient">Paciente <b>*</b></label><select id="appointment-patient" value={patientId} onChange={(event) => { setPatientId(event.target.value); setSelectedTime(''); setError('') }} required><option value="" disabled>Selecione um paciente</option>{options?.patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.fullName}</option>)}</select></div>
              <div className="field full"><label htmlFor="appointment-unit">Unidade <b>*</b></label><select id="appointment-unit" value={clinicUnitId} onChange={(event) => changeUnit(event.target.value)} required><option value="" disabled>Selecione uma unidade</option>{options?.clinicUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></div>
            </div>
            <div className="appointment-create-picker">
              <section className="reschedule-calendar" aria-label="Selecione o dia">
                <div className="reschedule-calendar-header"><button type="button" className="icon-button" aria-label="Mês anterior" onClick={() => setVisibleMonth((month) => shiftMonth(month, -1))}><ChevronLeft /></button><strong>{formatMonth(visibleMonth)}</strong><button type="button" className="icon-button" aria-label="Próximo mês" onClick={() => setVisibleMonth((month) => shiftMonth(month, 1))}><ChevronRight /></button></div>
                <div className="reschedule-weekdays">{WEEKDAY_LABELS.map((label) => <span key={label}>{label}</span>)}</div>
                <div className="reschedule-days">{dates.map((date) => <button key={date} type="button" className={`${date === selectedDate ? 'selected' : ''} ${date.slice(0, 7) !== visibleMonth.slice(0, 7) ? 'outside' : ''}`} onClick={() => changeDate(date)} disabled={date < today} aria-pressed={date === selectedDate}>{Number(date.slice(-2))}</button>)}</div>
              </section>
              <section className="reschedule-time" aria-label="Selecione o horário">
                <div className="reschedule-time-heading"><Clock3 /><div><strong>Horário</strong><small>{selectedDate ? formatShortDate(selectedDate) : 'Selecione um dia'}</small></div></div>
                {loadingSlots
                  ? <p className="modal-copy" role="status">Consultando horários disponíveis…</p>
                  : slotsError
                    ? <p className="form-error" role="alert">{slotsError} <button type="button" className="link-button" onClick={() => setSlotsRetry((value) => value + 1)}>Tentar novamente</button></p>
                    : !patientId
                      ? <p className="modal-copy" role="status">Selecione um paciente para consultar os horários.</p>
                      : availableSlots.length === 0
                        ? <p className="modal-copy" role="status">Não há horários disponíveis nesta data para a duração selecionada.</p>
                        : <div className="reschedule-time-slots">{availableSlots.map((slot) => {
                          const time = getSlotTime(slot, timeZoneId)
                          return <button key={slot.startsAt} type="button" className={time === selectedTime ? 'selected' : ''} onClick={() => setSelectedTime(time)}>{time}</button>
                        })}</div>}
                <label className="reschedule-duration"><span>Duração</span><select value={durationMinutes} onChange={(event) => { setDurationMinutes(Number(event.target.value)); setSelectedTime('') }}>{durationOptions.map((minutes) => <option key={minutes} value={minutes}>{minutes} minutos</option>)}</select></label>
                {endPreview && <p className="reschedule-summary">Horário selecionado: <strong>{selectedTime} – {endPreview}</strong></p>}
              </section>
            </div>
            <div className="field full"><label htmlFor="appointment-notes">Observação <span>(opcional)</span></label><textarea id="appointment-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} rows={3} /><small>{notes.length}/1000 caracteres</small></div>
          </>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="form-footer"><span><CheckCircle2 size={13}/>O profissional e a empresa são definidos pela sessão.</span><button className="button button-primary" type="submit" disabled={loadingOptions || loadingSlots || submitting || !hasOptions || !selectedSlot}>{submitting ? 'Salvando…' : 'Criar agendamento'}</button></div>
  </form>
}

function getMonthDates(month: string): string[] {
  const [year, monthNumber] = month.split('-').map(Number)
  const first = new Date(Date.UTC(year, monthNumber - 1, 1))
  const daysBefore = (first.getUTCDay() + 6) % 7
  const start = new Date(Date.UTC(year, monthNumber - 1, 1 - daysBefore))
  return Array.from({ length: 42 }, (_, index) => toDateInputValue(new Date(start.getTime() + index * 86400000)))
}

function shiftMonth(month: string, amount: number): string {
  const [year, monthNumber] = month.split('-').map(Number)
  return toDateInputValue(new Date(Date.UTC(year, monthNumber - 1 + amount, 1))).slice(0, 8) + '01'
}

function monthStart(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

function toDateInputValue(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

function formatMonth(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))
}

function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))
}

function getSlotTime(slot: AvailableAppointmentSlot, timeZoneId: string): string {
  return offsetIsoToLocalDateTime(slot.startsAt, timeZoneId).slice(11, 16)
}

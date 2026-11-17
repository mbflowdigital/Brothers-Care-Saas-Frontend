import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { CalendarClock, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { getPatientRegistrationOptions } from '../patients/patientApi'
import {
  createProfessionalAvailabilityBlock,
  deleteProfessionalAvailabilityBlock,
  getProfessionalAvailability,
  getSchedulingOptions,
  setProfessionalWeeklyAvailability,
} from './schedulingApi'
import type {
  ProfessionalAvailability,
  ProfessionalAvailabilityBlock,
  WeeklyAvailabilityWindowInput,
} from './schedulingApi'
import { localDateTimeToOffsetIso } from './dateTime'

type ViewerRole = 'professional' | 'clinicAdministrator'
type ProfessionalOption = { id: string; name: string; specialty: string; clinicUnitIds: string[] }
type ClinicUnitOption = { id: string; name: string; timeZoneId: string }
type WeeklyWindowDraft = WeeklyAvailabilityWindowInput & { key: string }

const WEEKDAYS = [
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
]

export function ProfessionalAvailabilityPage({ viewerRole }: { viewerRole: ViewerRole }) {
  const [professionals, setProfessionals] = useState<ProfessionalOption[]>([])
  const [units, setUnits] = useState<ClinicUnitOption[]>([])
  const [professionalId, setProfessionalId] = useState('')
  const [clinicUnitId, setClinicUnitId] = useState('')
  const [availability, setAvailability] = useState<ProfessionalAvailability | null>(null)
  const [weeklyDraft, setWeeklyDraft] = useState<WeeklyWindowDraft[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [savingWeekly, setSavingWeekly] = useState(false)
  const [savingBlock, setSavingBlock] = useState(false)
  const [removingBlockId, setRemovingBlockId] = useState('')
  const [optionsError, setOptionsError] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [optionsRetry, setOptionsRetry] = useState(0)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [blockKind, setBlockKind] = useState<ProfessionalAvailabilityBlock['kind']>('Blocked')
  const [blockStartsAt, setBlockStartsAt] = useState('')
  const [blockEndsAt, setBlockEndsAt] = useState('')
  const [blockReason, setBlockReason] = useState('')

  useEffect(() => {
    let active = true
    setLoadingOptions(true)
    setOptionsError('')
    const loadOptions = viewerRole === 'professional'
      ? getSchedulingOptions().then((result) => ({
          professionals: [{ id: result.professionalId, name: 'Meu perfil', specialty: '', clinicUnitIds: result.clinicUnits.map((unit) => unit.id) }],
          units: result.clinicUnits,
        }))
      : getPatientRegistrationOptions().then((result) => ({
          professionals: result.professionals.filter((professional) =>
            result.clinicUnits.some((unit) => professional.clinicUnitIds.includes(unit.id))),
          units: result.clinicUnits,
        }))

    loadOptions
      .then((result) => {
        if (!active) return
        setProfessionals(result.professionals)
        setUnits(result.units)
        const firstProfessional = result.professionals[0]
        setProfessionalId(firstProfessional?.id ?? '')
        setClinicUnitId(firstProfessional
          ? result.units.find((unit) => firstProfessional.clinicUnitIds.includes(unit.id))?.id ?? ''
          : '')
      })
      .catch((caught: unknown) => {
        if (active) setOptionsError(caught instanceof Error ? caught.message : 'Não foi possível carregar profissionais e unidades.')
      })
      .finally(() => { if (active) setLoadingOptions(false) })

    return () => { active = false }
  }, [viewerRole, optionsRetry])

  const selectedProfessional = professionals.find((professional) => professional.id === professionalId)
  const availableUnits = useMemo(
    () => units.filter((unit) => selectedProfessional?.clinicUnitIds.includes(unit.id)),
    [selectedProfessional, units],
  )
  const selectedUnit = availableUnits.find((unit) => unit.id === clinicUnitId)
  const selectedTimeZone = selectedUnit?.timeZoneId ?? availability?.timeZoneId ?? 'America/Sao_Paulo'

  useEffect(() => {
    if (!professionalId || !clinicUnitId || loadingOptions) {
      setAvailability(null)
      setWeeklyDraft([])
      return
    }

    let active = true
    setLoadingAvailability(true)
    setError('')
    getProfessionalAvailability(professionalId, clinicUnitId)
      .then((result) => {
        if (!active) return
        setAvailability(result)
        setWeeklyDraft(result.weeklyWindows.map((window) => ({
          key: window.id,
          dayOfWeek: window.dayOfWeek,
          startsAt: window.startsAt.slice(0, 5),
          endsAt: window.endsAt.slice(0, 5),
        })))
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Não foi possível carregar a disponibilidade.')
      })
      .finally(() => { if (active) setLoadingAvailability(false) })

    return () => { active = false }
  }, [professionalId, clinicUnitId, loadingOptions, refreshVersion])

  function changeProfessional(nextProfessionalId: string) {
    const nextProfessional = professionals.find((professional) => professional.id === nextProfessionalId)
    setProfessionalId(nextProfessionalId)
    setClinicUnitId(nextProfessional
      ? availableUnitsFor(nextProfessional, units)[0]?.id ?? ''
      : '')
    setAvailability(null)
    setWeeklyDraft([])
    setError('')
    setSuccess('')
  }

  function changeUnit(nextClinicUnitId: string) {
    setClinicUnitId(nextClinicUnitId)
    setError('')
    setSuccess('')
  }

  function addWindow(dayOfWeek: number) {
    setWeeklyDraft((current) => [...current, {
      key: crypto.randomUUID(),
      dayOfWeek,
      startsAt: '09:00',
      endsAt: '12:00',
    }])
    setError('')
    setSuccess('')
  }

  function updateWindow(key: string, field: 'startsAt' | 'endsAt', value: string) {
    setWeeklyDraft((current) => current.map((window) => window.key === key ? { ...window, [field]: value } : window))
    setError('')
    setSuccess('')
  }

  function removeWindow(key: string) {
    setWeeklyDraft((current) => current.filter((window) => window.key !== key))
    setError('')
    setSuccess('')
  }

  async function saveWeeklyAvailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!professionalId || !clinicUnitId) return
    const validationMessage = validateWeeklyWindows(weeklyDraft)
    if (validationMessage) {
      setError(validationMessage)
      setSuccess('')
      return
    }

    setSavingWeekly(true)
    setError('')
    setSuccess('')
    try {
      const windows = weeklyDraft.map(({ dayOfWeek, startsAt, endsAt }) => ({
        dayOfWeek,
        startsAt: `${startsAt}:00`,
        endsAt: `${endsAt}:00`,
      }))
      await setProfessionalWeeklyAvailability(professionalId, clinicUnitId, windows)
      setSuccess('Jornada semanal salva.')
      setRefreshVersion((version) => version + 1)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível salvar a jornada semanal.')
    } finally {
      setSavingWeekly(false)
    }
  }

  async function createBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!professionalId || !selectedUnit || !blockStartsAt || !blockEndsAt) return
    setError('')
    setSuccess('')
    try {
      const startsAt = localDateTimeToOffsetIso(blockStartsAt, selectedUnit.timeZoneId)
      const endsAt = localDateTimeToOffsetIso(blockEndsAt, selectedUnit.timeZoneId)
      if (Date.parse(endsAt) <= Date.parse(startsAt)) {
        setError('O término precisa ser posterior ao início.')
        return
      }

      setSavingBlock(true)
      await createProfessionalAvailabilityBlock(professionalId, {
        startsAt,
        endsAt,
        kind: blockKind,
        reason: blockReason.trim() || null,
      })
      setBlockStartsAt('')
      setBlockEndsAt('')
      setBlockReason('')
      setSuccess(blockKind === 'Vacation' ? 'Período de férias criado.' : 'Bloqueio criado.')
      setRefreshVersion((version) => version + 1)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível criar o bloqueio.')
    } finally {
      setSavingBlock(false)
    }
  }

  async function removeBlock(block: ProfessionalAvailabilityBlock) {
    if (!professionalId) return
    setRemovingBlockId(block.id)
    setError('')
    setSuccess('')
    try {
      await deleteProfessionalAvailabilityBlock(professionalId, block.id)
      setSuccess('Bloqueio removido.')
      setRefreshVersion((version) => version + 1)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível remover o bloqueio.')
    } finally {
      setRemovingBlockId('')
    }
  }

  return <section className="professional-availability" aria-busy={loadingOptions || loadingAvailability}>
    {loadingOptions
      ? <p role="status" className="availability-message">Carregando profissionais e unidades…</p>
      : optionsError
        ? <div className="availability-message availability-error" role="alert">{optionsError}<button type="button" className="button button-outline" onClick={() => setOptionsRetry((value) => value + 1)}>Tentar novamente</button></div>
        : professionals.length === 0 || units.length === 0
          ? <div className="card availability-card"><p>Não há profissionais com unidades ativas disponíveis para configurar.</p></div>
          : <>
            <div className="card availability-card">
              <div className="availability-heading">
                <div className="availability-icon"><CalendarClock size={18}/></div>
                <div><h2>Disponibilidade profissional</h2><p>A jornada usa o fuso local da unidade selecionada. Bloqueios e férias valem para todas as unidades.</p></div>
              </div>
              <div className="availability-filters">
                {viewerRole === 'clinicAdministrator' && <div className="field">
                  <label htmlFor="availability-professional">Profissional</label>
                  <select id="availability-professional" value={professionalId} onChange={(event) => changeProfessional(event.target.value)}>
                    {professionals.map((professional) => <option key={professional.id} value={professional.id}>{professional.name}</option>)}
                  </select>
                </div>}
                <div className="field">
                  <label htmlFor="availability-unit">Unidade e fuso horário</label>
                  <select id="availability-unit" value={clinicUnitId} onChange={(event) => changeUnit(event.target.value)}>
                    {availableUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.name} · {unit.timeZoneId}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {error && <p className="availability-message availability-error" role="alert">{error}</p>}
            {success && <p className="availability-message availability-success" role="status">{success}</p>}
            {loadingAvailability
              ? <div className="card availability-card" role="status">Carregando disponibilidade…</div>
              : !availability
                ? <div className="card availability-card availability-empty"><p>Selecione um profissional e uma unidade para continuar.</p><button type="button" className="button button-outline" onClick={() => setRefreshVersion((version) => version + 1)}><RefreshCw size={14}/>Tentar novamente</button></div>
                : <>
                  {!availability.isScheduleConfigured && <p className="availability-notice" role="note">Ainda não há jornada semanal configurada para esta unidade. Até a configuração, o sistema permite agendamentos sem validar o expediente; conflitos e bloqueios continuam sendo verificados.</p>}

                  <form className="card availability-card" onSubmit={saveWeeklyAvailability}>
                    <div className="availability-section-heading">
                      <div><h2>Jornada semanal</h2><p>Adicione um ou mais períodos por dia. Horários encostados são permitidos.</p></div>
                      <button className="button button-primary" type="submit" disabled={savingWeekly || loadingAvailability}>{savingWeekly ? 'Salvando…' : 'Salvar jornada'}</button>
                    </div>
                    <div className="availability-week">
                      {WEEKDAYS.map((day) => {
                        const dayWindows = weeklyDraft.filter((window) => window.dayOfWeek === day.value)
                        return <div className="availability-day" key={day.value}>
                          <strong>{day.label}</strong>
                          <div className="availability-day-windows">
                            {dayWindows.length === 0
                              ? <span className="availability-muted">Sem horário configurado</span>
                              : dayWindows.map((window) => <div className="availability-window" key={window.key}>
                                <label><span className="sr-only">Início, {day.label}</span><input type="time" value={window.startsAt} onChange={(event) => updateWindow(window.key, 'startsAt', event.target.value)} required/></label>
                                <span>até</span>
                                <label><span className="sr-only">Término, {day.label}</span><input type="time" value={window.endsAt} onChange={(event) => updateWindow(window.key, 'endsAt', event.target.value)} required/></label>
                                <button type="button" className="availability-icon-button" onClick={() => removeWindow(window.key)} aria-label={`Remover horário de ${day.label}`}><Trash2 size={15}/></button>
                              </div>)}
                          </div>
                          <button type="button" className="availability-add" onClick={() => addWindow(day.value)}><Plus size={14}/>Adicionar horário</button>
                        </div>
                      })}
                    </div>
                  </form>

                  <div className="availability-blocks-grid">
                    <form className="card availability-card" onSubmit={createBlock}>
                      <div className="availability-section-heading"><div><h2>Bloqueio ou férias</h2><p>O período será aplicado a todas as unidades.</p></div></div>
                      <div className="availability-form-fields">
                        <div className="field">
                          <label htmlFor="availability-block-kind">Tipo</label>
                          <select id="availability-block-kind" value={blockKind} onChange={(event) => setBlockKind(event.target.value as ProfessionalAvailabilityBlock['kind'])}>
                            <option value="Blocked">Bloqueio</option>
                            <option value="Vacation">Férias</option>
                          </select>
                        </div>
                        <div className="field"><label htmlFor="availability-block-start">Início · {selectedTimeZone}</label><input id="availability-block-start" type="datetime-local" value={blockStartsAt} onChange={(event) => setBlockStartsAt(event.target.value)} required/></div>
                        <div className="field"><label htmlFor="availability-block-end">Término · {selectedTimeZone}</label><input id="availability-block-end" type="datetime-local" value={blockEndsAt} onChange={(event) => setBlockEndsAt(event.target.value)} required/></div>
                        <div className="field"><label htmlFor="availability-block-reason">Motivo <span>(opcional)</span></label><input id="availability-block-reason" value={blockReason} onChange={(event) => setBlockReason(event.target.value)} maxLength={500}/></div>
                      </div>
                      <button className="button button-primary" type="submit" disabled={savingBlock || loadingAvailability}>{savingBlock ? 'Salvando…' : 'Criar período'}</button>
                    </form>

                    <section className="card availability-card">
                      <div className="availability-section-heading"><div><h2>Bloqueios próximos</h2><p>Exibidos no fuso {availability.timeZoneId}.</p></div></div>
                      {availability.blocks.length === 0
                        ? <p className="availability-muted">Nenhum bloqueio ou período de férias próximo.</p>
                        : <ul className="availability-block-list">{availability.blocks.map((block) => <li key={block.id}>
                          <div><strong>{block.kind === 'Vacation' ? 'Férias' : 'Bloqueio'}</strong><span>{formatBlockRange(block, availability.timeZoneId)}</span>{block.reason && <small>{block.reason}</small>}</div>
                          <button type="button" className="availability-icon-button" onClick={() => void removeBlock(block)} disabled={removingBlockId === block.id} aria-label={`Remover ${block.kind === 'Vacation' ? 'férias' : 'bloqueio'}`}>
                            <Trash2 size={15}/>
                          </button>
                        </li>)}</ul>}
                    </section>
                  </div>
                </>}
          </>}
  </section>
}

function availableUnitsFor(professional: ProfessionalOption, units: ClinicUnitOption[]): ClinicUnitOption[] {
  return units.filter((unit) => professional.clinicUnitIds.includes(unit.id))
}

function validateWeeklyWindows(windows: WeeklyWindowDraft[]): string {
  for (const day of WEEKDAYS) {
    const dayWindows = windows
      .filter((window) => window.dayOfWeek === day.value)
      .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
    for (let index = 0; index < dayWindows.length; index += 1) {
      if (dayWindows[index].startsAt >= dayWindows[index].endsAt) {
        return `O término deve ser posterior ao início em ${day.label.toLocaleLowerCase('pt-BR')}.`
      }
      if (index > 0 && dayWindows[index].startsAt < dayWindows[index - 1].endsAt) {
        return `Os horários de ${day.label.toLocaleLowerCase('pt-BR')} não podem se sobrepor.`
      }
    }
  }
  return ''
}

function formatBlockRange(block: ProfessionalAvailabilityBlock, timeZone: string): string {
  const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone,
  })
  const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  })
  const startsAt = new Date(block.startsAt)
  const endsAt = new Date(block.endsAt)
  const startDate = dateFormatter.format(startsAt)
  const endDate = dateFormatter.format(endsAt)
  return startDate === endDate
    ? `${startDate}, ${timeFormatter.format(startsAt)}–${timeFormatter.format(endsAt)}`
    : `${startDate} ${timeFormatter.format(startsAt)} – ${endDate} ${timeFormatter.format(endsAt)}`
}

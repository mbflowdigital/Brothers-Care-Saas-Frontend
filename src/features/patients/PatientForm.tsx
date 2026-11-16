import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { createPatient, getPatientRegistrationOptions, updatePatient, type PatientListItem, type PatientRegistration, type PatientRegistrationOptions } from './patientApi'

type Props = {
  onDone: (patient: PatientRegistration) => void
  patient?: PatientListItem
}

export function PatientForm({ onDone, patient }: Props) {
  const [fullName, setFullName] = useState(patient?.fullName ?? '')
  const [birthDate, setBirthDate] = useState(patient?.birthDate ?? '')
  const [healthPlan, setHealthPlan] = useState(patient?.healthPlan ?? '')
  const [professionalId, setProfessionalId] = useState(patient?.professionalId ?? '')
  const [clinicUnitId, setClinicUnitId] = useState(patient?.clinicUnitId ?? '')
  const [options, setOptions] = useState<PatientRegistrationOptions | null>(null)
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getPatientRegistrationOptions()
      .then(setOptions)
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Não foi possível carregar as opções.'))
      .finally(() => setLoadingOptions(false))
  }, [])

  const selectedProfessional = options?.professionals.find((item) => item.id === professionalId)
  const availableUnits = useMemo(() => {
    if (!options || !selectedProfessional) return []
    return options.clinicUnits.filter((unit) => selectedProfessional.clinicUnitIds.includes(unit.id))
  }, [options, selectedProfessional])

  function changeProfessional(value: string) {
    setProfessionalId(value)
    setClinicUnitId('')
    setError('')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedName = fullName.trim()
    if (!normalizedName || !birthDate) {
      setError('Informe o nome completo e a data de nascimento do paciente.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const input = { fullName: normalizedName, birthDate, healthPlan: healthPlan.trim(), professionalId, clinicUnitId }
      onDone(patient ? await updatePatient(patient.id, input) : await createPatient(input))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível cadastrar o paciente.')
    } finally {
      setSubmitting(false)
    }
  }

  return <form className="record-form" onSubmit={submit}>
    <div className="form-intro">
      <span className="form-step">01</span>
      <div><strong>Dados essenciais</strong><small>O cadastro será vinculado à empresa ativa.</small></div>
    </div>
    <div className="form-grid">
      <div className="field full">
        <label htmlFor="patient-full-name">Nome completo <b>*</b></label>
        <input id="patient-full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={200} autoComplete="name" autoFocus required />
      </div>
      <div className="field">
        <label htmlFor="patient-birth-date">Data de nascimento <b>*</b></label>
        <input id="patient-birth-date" type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} required />
      </div>
      <div className="field">
        <label>Status inicial</label>
        <input value="Ativo" readOnly />
      </div>
      <div className="field full">
        <label htmlFor="patient-health-plan">Convênio</label>
        <input id="patient-health-plan" value={healthPlan} onChange={(event) => setHealthPlan(event.target.value)} maxLength={150} placeholder="Ex.: Particular ou nome do convênio" />
      </div>
      <div className="field">
        <label htmlFor="patient-professional">Profissional responsável</label>
        <select id="patient-professional" value={professionalId} onChange={(event) => changeProfessional(event.target.value)} disabled={loadingOptions}>
          <option value="">Sem profissional no momento</option>
          {options?.professionals.map((professional) => <option key={professional.id} value={professional.id}>{professional.name} · {professional.specialty}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="patient-clinic-unit">Unidade do vínculo</label>
        <select id="patient-clinic-unit" value={clinicUnitId} onChange={(event) => setClinicUnitId(event.target.value)} disabled={!professionalId || loadingOptions} required={Boolean(professionalId)}>
          <option value="">{professionalId ? 'Selecione a unidade' : 'Selecione um profissional primeiro'}</option>
          {availableUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
        </select>
      </div>
      {professionalId && availableUnits.length === 0 && <p className="form-error full" role="alert">Este profissional não possui vínculo com uma unidade ativa.</p>}
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="form-footer">
      <span><CheckCircle2 size={14} />Dados protegidos no contexto da empresa</span>
      <button className="button button-primary" type="submit" disabled={submitting}>
        {submitting ? 'Salvando...' : patient ? 'Salvar alterações' : 'Cadastrar paciente'}
      </button>
    </div>
  </form>
}

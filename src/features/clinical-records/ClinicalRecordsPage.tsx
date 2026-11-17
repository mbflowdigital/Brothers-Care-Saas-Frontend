import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, ArrowLeft, Check, ChevronRight, Clock3, FileCheck2, FileText, LoaderCircle, LockKeyhole, Paperclip, Save, ShieldCheck, Stethoscope, UserRound, X } from 'lucide-react'
import { createClinicalRecord, finalizeClinicalRecord, getClinicalRecord, getClinicalRecordOptions, listClinicalRecords, updateClinicalRecord, type ClinicalRecord, type ClinicalRecordInput, type ClinicalRecordOptions, type ClinicalRecordSummary } from './clinicalRecordsApi'
import './clinicalRecords.css'

const emptyInput: ClinicalRecordInput = { patientReport: '', proceduresAndObservations: '', assessmentAndPlan: '' }
const dateTime = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

export function ClinicalRecordsPage() {
  const [options, setOptions] = useState<ClinicalRecordOptions | null>(null)
  const [patientId, setPatientId] = useState('')
  const [unitId, setUnitId] = useState('')
  const [records, setRecords] = useState<ClinicalRecordSummary[]>([])
  const [current, setCurrent] = useState<ClinicalRecord | null>(null)
  const [form, setForm] = useState<ClinicalRecordInput>(emptyInput)
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [confirming, setConfirming] = useState(false)

  const patient = options?.patients.find(item => item.id === patientId)
  const availableUnits = useMemo(() => options?.units.filter(unit => patient?.clinicUnitIds.includes(unit.id)) ?? [], [options, patient])
  const finalized = current?.status === 'Finalized'

  const loadHistory = useCallback(async (selectedPatientId: string) => {
    if (!selectedPatientId) { setRecords([]); return }
    setHistoryLoading(true)
    try { setRecords(await listClinicalRecords(selectedPatientId)) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível carregar o histórico.') }
    finally { setHistoryLoading(false) }
  }, [])

  useEffect(() => {
    getClinicalRecordOptions().then(result => {
      setOptions(result)
      const firstPatient = result.patients[0]
      if (firstPatient) { setPatientId(firstPatient.id); setUnitId(firstPatient.clinicUnitIds[0] ?? '') }
    }).catch(caught => setError(caught instanceof Error ? caught.message : 'Não foi possível abrir o prontuário.')).finally(() => setLoading(false))
  }, [])

  useEffect(() => { if (patientId) void loadHistory(patientId) }, [patientId, loadHistory])
  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault() }
    window.addEventListener('beforeunload', protect)
    return () => window.removeEventListener('beforeunload', protect)
  }, [dirty])

  function changePatient(nextId: string) {
    if (dirty && !window.confirm('Há alterações não salvas. Deseja trocar de paciente e descartá-las?')) return
    const next = options?.patients.find(item => item.id === nextId)
    setPatientId(nextId); setUnitId(next?.clinicUnitIds[0] ?? ''); resetEditor(); setError(''); setMessage('')
  }

  function setField(field: keyof ClinicalRecordInput, value: string) {
    setForm(currentForm => ({ ...currentForm, [field]: value })); setDirty(true); setMessage(''); setError('')
  }

  function resetEditor() { setCurrent(null); setForm(emptyInput); setDirty(false); setConfirming(false) }

  async function openRecord(id: string) {
    if (dirty && !window.confirm('Descartar as alterações ainda não salvas?')) return
    setSaving(true); setError('')
    try {
      const record = await getClinicalRecord(id)
      setCurrent(record); setPatientId(record.patientId); setUnitId(record.clinicUnitId)
      setForm({ patientReport: record.patientReport, proceduresAndObservations: record.proceduresAndObservations, assessmentAndPlan: record.assessmentAndPlan })
      setDirty(false); window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível abrir a evolução.') }
    finally { setSaving(false) }
  }

  async function saveDraft(showMessage = true): Promise<ClinicalRecord | null> {
    if (!patientId || !unitId) { setError('Selecione o paciente e a unidade de atendimento.'); return null }
    setSaving(true); setError(''); setMessage('')
    try {
      const saved = current
        ? await updateClinicalRecord(current.id, current.version, form)
        : await createClinicalRecord(patientId, unitId, form)
      setCurrent(saved); setForm({ patientReport: saved.patientReport, proceduresAndObservations: saved.proceduresAndObservations, assessmentAndPlan: saved.assessmentAndPlan })
      setDirty(false); if (showMessage) setMessage('Rascunho salvo com segurança.')
      await loadHistory(patientId); return saved
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível salvar o rascunho.'); return null }
    finally { setSaving(false) }
  }

  async function confirmFinalization() {
    if (!form.proceduresAndObservations.trim() || !form.assessmentAndPlan.trim()) {
      setConfirming(false); setError('Preencha “Procedimentos e observações” e “Avaliação e próximas condutas” para finalizar.'); return
    }
    const draft = dirty || !current ? await saveDraft(false) : current
    if (!draft) { setConfirming(false); return }
    setSaving(true)
    try {
      const result = await finalizeClinicalRecord(draft.id, draft.version)
      setCurrent(result); setDirty(false); setConfirming(false); setMessage('Evolução finalizada e protegida contra alterações.')
      await loadHistory(patientId)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível finalizar a evolução.'); setConfirming(false) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="clinical-loading" role="status"><LoaderCircle /><strong>Preparando o prontuário clínico</strong><span>Validando seus pacientes e unidades autorizadas…</span></div>
  if (!options || options.patients.length === 0) return <section className="clinical-empty"><ShieldCheck /><h2>Nenhum paciente disponível</h2><p>Você precisa de um vínculo assistencial ativo para registrar e consultar evoluções.</p></section>

  return <div className="clinical-records-page">
    <header className="clinical-hero"><div><span className="clinical-eyebrow"><Stethoscope /> Prontuário autorizado</span><h1>{current ? finalized ? 'Consultar evolução' : 'Continuar evolução' : 'Nova evolução clínica'}</h1><p>Registre o essencial com clareza. Você pode salvar e continuar depois.</p></div><div className={`clinical-save-state ${dirty ? 'dirty' : ''}`}>{saving ? <LoaderCircle className="spin" /> : dirty ? <AlertCircle /> : <Check />}<span><strong>{saving ? 'Salvando…' : dirty ? 'Alterações não salvas' : current ? 'Tudo salvo' : 'Novo registro'}</strong><small>{current ? `Atualizado em ${dateTime(current.updatedAt)}` : 'O rascunho pode ficar incompleto'}</small></span></div></header>

    {error && <div className="clinical-feedback error" role="alert"><AlertCircle /><span>{error}</span><button onClick={() => setError('')} aria-label="Fechar aviso"><X /></button></div>}
    {message && <div className="clinical-feedback success" role="status"><Check /><span>{message}</span><button onClick={() => setMessage('')} aria-label="Fechar aviso"><X /></button></div>}

    <div className="clinical-layout"><main className="clinical-editor">
      <section className="clinical-context" aria-label="Contexto da evolução"><label><span>Paciente</span><select id="evolution-patient" value={patientId} onChange={event => changePatient(event.target.value)} disabled={Boolean(current)}>{options.patients.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label><span>Unidade</span><select value={unitId} onChange={event => { setUnitId(event.target.value); setDirty(true) }} disabled={Boolean(current)}>{availableUnits.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><div><span>Profissional autor</span><strong><UserRound />{options.author.name}</strong><small>{options.author.specialty || 'Especialidade não informada'}</small></div><div><span>Situação</span><strong className={`record-status ${finalized ? 'finalized' : 'draft'}`}>{finalized ? <FileCheck2 /> : <Clock3 />}{finalized ? 'Finalizada' : 'Rascunho'}</strong></div></section>

      <section className="clinical-writing"><ClinicalField number="1" title="Estado e relato do paciente" description="Queixas, sintomas, estado inicial e mudanças percebidas desde o último encontro." optional value={form.patientReport} onChange={value => setField('patientReport', value)} disabled={finalized} placeholder="Ex.: Paciente relata redução da dor e maior segurança nas atividades diárias…" /><ClinicalField number="2" title="Procedimentos e observações" description="Atividades realizadas, intervenções, resposta ao tratamento e observações objetivas." value={form.proceduresAndObservations} onChange={value => setField('proceduresAndObservations', value)} disabled={finalized} placeholder="Descreva o que foi realizado e como o paciente respondeu…" /><ClinicalField number="3" title="Avaliação e próximas condutas" description="Progresso, orientações, plano de continuidade e próximos passos." value={form.assessmentAndPlan} onChange={value => setField('assessmentAndPlan', value)} disabled={finalized} placeholder="Registre sua avaliação e a conduta definida para continuidade…" /></section>

      <section className="clinical-attachments" aria-labelledby="attachments-title"><div><span><Paperclip /></span><div><h2 id="attachments-title">Exames e anexos <small>Opcional</small></h2><p>O envio ficará disponível após a configuração de armazenamento clínico privado e seguro.</p></div></div><button className="button button-outline" disabled title="Armazenamento seguro ainda não configurado"><LockKeyhole />Indisponível nesta etapa</button></section>

      <footer className="clinical-actions"><button className="button button-outline" onClick={() => { if (!dirty || window.confirm('Descartar alterações não salvas?')) resetEditor() }} disabled={saving}><ArrowLeft />Voltar ao histórico</button>{!finalized && <div><button className="button button-outline" onClick={() => void saveDraft()} disabled={saving || !dirty && Boolean(current)}><Save />Salvar rascunho</button><button className="button button-primary" onClick={() => setConfirming(true)} disabled={saving}><FileCheck2 />Finalizar evolução</button></div>}</footer>
    </main>

    <aside className="clinical-history"><div className="clinical-history-heading"><div><span>Histórico do paciente</span><strong>{patient?.name}</strong></div><b>{records.length}</b></div>{historyLoading ? <div className="history-state"><LoaderCircle className="spin" />Carregando histórico…</div> : records.length === 0 ? <div className="history-state"><FileText /><strong>Primeira evolução</strong><span>Os registros salvos aparecerão aqui.</span></div> : <div className="history-list">{records.map(record => <button key={record.id} className={current?.id === record.id ? 'selected' : ''} onClick={() => void openRecord(record.id)}><span className={`history-icon ${record.status.toLowerCase()}`}>{record.status === 'Finalized' ? <FileCheck2 /> : <FileText />}</span><span><strong>{record.status === 'Finalized' ? 'Evolução finalizada' : 'Rascunho'}</strong><small>{dateTime(record.finalizedAt || record.updatedAt)} · {record.authorName}</small><p>{record.summary}</p><em>{record.clinicUnitName}</em></span><ChevronRight /></button>)}</div>}</aside></div>

    {confirming && <div className="modal-backdrop"><section className="modal clinical-confirm" role="dialog" aria-modal="true" aria-labelledby="finalize-title"><span><LockKeyhole /></span><h2 id="finalize-title">Finalizar esta evolução?</h2><p>Depois de finalizada, a evolução ficará protegida contra edição direta. Revise o conteúdo antes de confirmar.</p><div><button className="button button-outline" onClick={() => setConfirming(false)} disabled={saving}>Continuar revisando</button><button className="button button-primary" onClick={() => void confirmFinalization()} disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <FileCheck2 />}Confirmar finalização</button></div></section></div>}
  </div>
}

function ClinicalField({ number, title, description, optional, value, onChange, disabled, placeholder }: { number: string; title: string; description: string; optional?: boolean; value: string; onChange: (value: string) => void; disabled: boolean; placeholder: string }) {
  return <label className="clinical-field"><span className="clinical-field-number">{number}</span><span className="clinical-field-copy"><strong>{title}{optional && <small>Opcional</small>}</strong><em>{description}</em></span><textarea value={value} onChange={event => onChange(event.target.value)} disabled={disabled} placeholder={placeholder} rows={6} maxLength={100000} /><small className="clinical-character-count">{value.length.toLocaleString('pt-BR')} caracteres</small></label>
}

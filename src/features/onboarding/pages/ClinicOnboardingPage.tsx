import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Building2, HeartPulse, LoaderCircle, LockKeyhole, MapPin, RefreshCw, ShieldCheck, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { onboardingApi } from '../api/onboardingApi'
import { AdministratorStep } from '../components/AdministratorStep'
import { ClinicUnitStep } from '../components/ClinicUnitStep'
import { CompanyStep } from '../components/CompanyStep'
import { OnboardingProgress } from '../components/OnboardingProgress'
import type { AdministratorData, ClinicUnitData, CompanyData, FieldErrors, InvitationState, OnboardingContext, OnboardingFormData } from '../types'
import { OnboardingApiError } from '../types'
import { maskCnpj, validateAdministrator, validateClinicUnit, validateCompany } from '../validation'
import { OnboardingSuccessPage } from './OnboardingSuccessPage'
import '../styles/onboarding.css'

const developmentPassword = import.meta.env.DEV ? 'Aabbcc123!' : ''
const initialAdministrator: AdministratorData = { displayName: '', cpf: '', password: developmentPassword, passwordConfirmation: developmentPassword }
const initialCompany: CompanyData = { legalName: '', tradeName: '', commercialEmail: '', phone: '' }
const initialClinicUnit: ClinicUnitData = { name: 'Unidade Principal', postalCode: '', street: '', number: '', complement: '', district: '', city: '', state: '', phone: '' }

const invitationCopy: Record<Exclude<InvitationState, 'ready'>, { title: string; description: string }> = {
  invalid: { title: 'Convite inválido', description: 'Não foi possível reconhecer este convite. Confira se o link foi copiado por completo.' },
  expired: { title: 'Este convite expirou', description: 'Solicite um novo link para continuar o cadastro da clínica.' },
  revoked: { title: 'Convite revogado', description: 'Este convite não está mais disponível. Entre em contato com a equipe Brothers Care.' },
  used: { title: 'Cadastro já concluído', description: 'Este convite já foi utilizado. Se você concluiu o cadastro, acesse a plataforma.' },
  unavailable: { title: 'Serviço temporariamente indisponível', description: 'Não foi possível validar o convite agora. Tente novamente em alguns instantes.' },
}

export function ClinicOnboardingPage() {
  const tokenRef = useRef(new URLSearchParams(window.location.search).get('token') ?? '')
  const [invitationState, setInvitationState] = useState<InvitationState>('unavailable')
  const [context, setContext] = useState<OnboardingContext | null>(null)
  const [loadingContext, setLoadingContext] = useState(true)
  const [step, setStep] = useState(0)
  const [reviewing, setReviewing] = useState(false)
  const [administrator, setAdministrator] = useState(initialAdministrator)
  const [company, setCompany] = useState(initialCompany)
  const [clinicUnit, setClinicUnit] = useState(initialClinicUnit)
  const [errors, setErrors] = useState<FieldErrors<AdministratorData> | FieldErrors<CompanyData> | FieldErrors<ClinicUnitData>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [completed, setCompleted] = useState(false)

  const loadContext = async () => {
    setLoadingContext(true)
    try {
      const nextContext = await onboardingApi.getContext(tokenRef.current)
      setContext(nextContext)
      setCompany((current) => ({ ...current, tradeName: current.tradeName || nextContext.companyName || '', commercialEmail: current.commercialEmail || nextContext.email }))
      setInvitationState('ready')
    } catch (caught) {
      setInvitationState(caught instanceof OnboardingApiError ? caught.state : 'unavailable')
    } finally {
      setLoadingContext(false)
    }
  }

  useEffect(() => {
    const cleanUrl = `${window.location.pathname}${window.location.hash}`
    window.history.replaceState(window.history.state, '', cleanUrl)
    void loadContext()
  }, [])

  const validateCurrent = () => {
    const nextErrors = step === 0 ? validateAdministrator(administrator) : step === 1 ? validateCompany(company) : validateClinicUnit(clinicUnit)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) window.requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
    return Object.keys(nextErrors).length === 0
  }

  const next = () => {
    if (!validateCurrent()) return
    setErrors({})
    if (step === 2) setReviewing(true)
    else setStep((current) => current + 1)
  }

  const back = () => {
    setErrors({})
    setSubmitError('')
    if (reviewing) setReviewing(false)
    else setStep((current) => Math.max(0, current - 1))
  }

  const submit = async () => {
    setSubmitError('')
    const validations = [validateAdministrator(administrator), validateCompany(company), validateClinicUnit(clinicUnit)]
    const invalidStep = validations.findIndex((validation) => Object.keys(validation).length > 0)
    if (invalidStep >= 0) {
      setReviewing(false)
      setStep(invalidStep)
      setErrors(validations[invalidStep])
      window.requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    setSubmitting(true)
    const data: OnboardingFormData = { administrator, company, clinicUnit }
    try {
      await onboardingApi.complete({ token: tokenRef.current, ...data })
      setCompleted(true)
    } catch (caught) {
      setSubmitError(caught instanceof Error ? caught.message : 'Não foi possível concluir o cadastro. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingContext) return <OnboardingFrame><section className="onboarding-result" role="status"><LoaderCircle className="spin" /><h1>Validando seu convite…</h1><p>Estamos preparando o cadastro seguro da sua clínica.</p></section></OnboardingFrame>
  if (invitationState !== 'ready' || !context) {
    const copy = invitationCopy[invitationState === 'ready' ? 'unavailable' : invitationState]
    return <OnboardingFrame><section className="onboarding-result"><span className="onboarding-result-icon error"><LockKeyhole /></span><h1>{copy.title}</h1><p>{copy.description}</p><div className="onboarding-result-actions">{invitationState === 'unavailable' && <button className="button button-dark" onClick={() => void loadContext()}><RefreshCw />Tentar novamente</button>}<Link className="button button-outline" to="/login">Ir para o login</Link></div>{import.meta.env.DEV && <small className="development-note">Ambiente de desenvolvimento: use <code>?token=demo</code>, <code>expirado</code>, <code>revogado</code> ou <code>utilizado</code>.</small>}</section></OnboardingFrame>
  }
  if (completed) return <OnboardingFrame><OnboardingSuccessPage /></OnboardingFrame>

  return <OnboardingFrame>
    <OnboardingProgress current={reviewing ? 3 : step} />
    <section className="onboarding-card">
      <header className="onboarding-card-head"><div><div className="eyebrow">{reviewing ? 'Revisão final' : `Etapa ${step + 1} de 3`}</div><h1>{reviewing ? 'Confira os dados da clínica' : step === 0 ? 'Vamos criar seu acesso' : step === 1 ? 'Conte sobre a empresa' : 'Configure a primeira unidade'}</h1><p>{reviewing ? 'Revise as informações antes de concluir o cadastro.' : step === 0 ? 'Seus dados serão usados para administrar a clínica com segurança.' : step === 1 ? 'Complete os dados que identificam a empresa.' : 'Esta será a unidade padrão para iniciar a operação.'}</p></div>{!reviewing && <span className="onboarding-head-icon">{step === 0 ? <UserRound /> : step === 1 ? <Building2 /> : <MapPin />}</span>}</header>
      <div className="onboarding-card-body">
        {!reviewing && step === 0 && <AdministratorStep value={administrator} email={context.email} errors={errors as FieldErrors<AdministratorData>} onChange={setAdministrator} />}
        {!reviewing && step === 1 && <CompanyStep value={company} cnpj={context.cnpj} errors={errors as FieldErrors<CompanyData>} onChange={setCompany} />}
        {!reviewing && step === 2 && <ClinicUnitStep value={clinicUnit} errors={errors as FieldErrors<ClinicUnitData>} onChange={setClinicUnit} />}
        {reviewing && <Review context={context} data={{ administrator, company, clinicUnit }} onEdit={(nextStep) => { setReviewing(false); setStep(nextStep); setErrors({}) }} />}
        {submitError && <div className="login-error" role="alert">{submitError}</div>}
      </div>
      <footer className="onboarding-card-foot"><button className="button button-outline" onClick={back} disabled={!reviewing && step === 0 || submitting}><ArrowLeft />Voltar</button>{reviewing ? <button className="button button-primary" onClick={() => void submit()} disabled={submitting}>{submitting ? <><LoaderCircle className="spin" />Concluindo…</> : <>Concluir cadastro <ShieldCheck /></>}</button> : <button className="button button-dark" onClick={next}>Avançar <ArrowRight /></button>}</footer>
    </section>
  </OnboardingFrame>
}

function Review({ context, data, onEdit }: { context: OnboardingContext; data: OnboardingFormData; onEdit: (step: number) => void }) {
  const groups = [
    { title: 'Administrador', icon: UserRound, rows: [['Nome', data.administrator.displayName], ['E-mail', context.email], ['CPF', data.administrator.cpf]] },
    { title: 'Empresa', icon: Building2, rows: [['CNPJ', maskCnpj(context.cnpj)], ['Razão social', data.company.legalName], ['Nome fantasia', data.company.tradeName], ['Contato', `${data.company.commercialEmail} · ${data.company.phone}`]] },
    { title: 'Unidade padrão', icon: MapPin, rows: [['Unidade', data.clinicUnit.name], ['Endereço', `${data.clinicUnit.street}, ${data.clinicUnit.number}${data.clinicUnit.complement ? ` · ${data.clinicUnit.complement}` : ''}`], ['Localidade', `${data.clinicUnit.district} · ${data.clinicUnit.city}/${data.clinicUnit.state} · ${data.clinicUnit.postalCode}`]] },
  ] as const
  return <div className="onboarding-review">{groups.map(({ title, icon: Icon, rows }, index) => <section key={title} className="review-group"><header><span><Icon /></span><h2>{title}</h2><button type="button" onClick={() => onEdit(index)}>Editar</button></header>{rows.map(([label, value]) => <div className="review-row" key={label}><small>{label}</small><strong>{value}</strong></div>)}</section>)}</div>
}

function OnboardingFrame({ children }: { children: React.ReactNode }) {
  return <main className="onboarding-page"><header className="onboarding-top"><Link to="/" className="public-brand"><span className="brand-mark"><HeartPulse size={18} strokeWidth={2.5} /></span><span>brothers care</span></Link><span className="onboarding-secure"><ShieldCheck /> Ambiente seguro</span></header><div className="onboarding-shell">{children}</div><footer className="onboarding-page-foot">© 2026 Brothers Digital · Seus dados são tratados com segurança e privacidade.</footer></main>
}

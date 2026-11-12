import { useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Building2, HeartPulse, LoaderCircle, LockKeyhole, MapPin, RefreshCw, ShieldCheck, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { login, selectActiveTenant } from '../../identity/accountActionApi'
import { toUiSession, type AuthenticatedUiSession } from '../../identity/LoginPage'
import { onboardingApi } from '../api/onboardingApi'
import { AdministratorStep } from '../components/AdministratorStep'
import { ClinicUnitStep } from '../components/ClinicUnitStep'
import { CompanyStep } from '../components/CompanyStep'
import { OnboardingProgress } from '../components/OnboardingProgress'
import type { AdministratorData, ClinicUnitData, CompanyData, FieldErrors, InvitationState, OnboardingContext, OnboardingFormData } from '../types'
import { OnboardingApiError } from '../types'
import { isValidCnpj, maskCnpj, validateAdministrator, validateClinicUnit, validateCompany } from '../validation'
import { OnboardingSuccessPage } from './OnboardingSuccessPage'
import '../styles/onboarding.css'

const initialAdministrator: AdministratorData = { displayName: '', cpf: '', password: '', passwordConfirmation: '' }
const initialCompany: CompanyData = { legalName: '', tradeName: '', commercialEmail: '', phone: '' }
const initialClinicUnit: ClinicUnitData = { name: 'Unidade Principal', postalCode: '', street: '', number: '', complement: '', district: '', city: '', state: '', phone: '' }

const invitationCopy: Record<Exclude<InvitationState, 'ready'>, { title: string; description: string }> = {
  'cnpj-required': { title: 'Confirme o CNPJ', description: 'Informe o CNPJ cadastrado para validar este convite.' },
  'cnpj-mismatch': { title: 'CNPJ não corresponde', description: 'Confira o CNPJ informado ou entre em contato com a equipe Brothers Care.' },
  invalid: { title: 'Convite inválido', description: 'Não foi possível reconhecer este convite. Confira se o link foi copiado por completo.' },
  expired: { title: 'Este convite expirou', description: 'Solicite um novo link para continuar o cadastro da clínica.' },
  revoked: { title: 'Convite revogado', description: 'Este convite não está mais disponível. Entre em contato com a equipe Brothers Care.' },
  used: { title: 'Cadastro já concluído', description: 'Este convite já foi utilizado. Se você concluiu o cadastro, acesse a plataforma.' },
  unavailable: { title: 'Serviço temporariamente indisponível', description: 'Não foi possível validar o convite agora. Tente novamente em alguns instantes.' },
}

type ClinicOnboardingPageProps = {
  hasPlatformAdministratorSession: boolean
  onAuthenticated: (session: AuthenticatedUiSession) => void
}

export function ClinicOnboardingPage({ hasPlatformAdministratorSession, onAuthenticated }: ClinicOnboardingPageProps) {
  const navigate = useNavigate()
  const tokenRef = useRef(
    new URLSearchParams(window.location.search).get('token')
      ?? (window.history.state?.onboardingToken as string | undefined)
      ?? '',
  )
  const [invitationState, setInvitationState] = useState<InvitationState>(tokenRef.current ? 'cnpj-required' : 'invalid')
  const [context, setContext] = useState<OnboardingContext | null>(null)
  const [loadingContext, setLoadingContext] = useState(false)
  const [cnpj, setCnpj] = useState('')
  const [step, setStep] = useState(0)
  const [reviewing, setReviewing] = useState(false)
  const [administrator, setAdministrator] = useState(initialAdministrator)
  const [company, setCompany] = useState(initialCompany)
  const [clinicUnit, setClinicUnit] = useState(initialClinicUnit)
  const [errors, setErrors] = useState<FieldErrors<AdministratorData> | FieldErrors<CompanyData> | FieldErrors<ClinicUnitData>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [completedTenantId, setCompletedTenantId] = useState('')
  const [enteringClinic, setEnteringClinic] = useState(false)
  const [entryError, setEntryError] = useState('')

  const enterClinic = async () => {
    setEntryError('')
    setEnteringClinic(true)
    try {
      const authenticated = await login(administrator.cpf, administrator.password)
      const selected = authenticated.activeTenant?.id === completedTenantId
        ? authenticated
        : await selectActiveTenant(completedTenantId)
      const session = toUiSession(selected)
      onAuthenticated(session)
      const role = session.memberships.find((membership) => membership.tenantId === session.tenantId)?.role
      navigate(role === 'Professional' ? '/app/minha-agenda' : role === 'Receptionist' ? '/app/agenda' : '/app/dashboard', { replace: true })
    } catch (caught) {
      setEntryError(caught instanceof Error ? caught.message : 'Não foi possível entrar na nova clínica. Tente novamente.')
    } finally {
      setEnteringClinic(false)
    }
  }

  const finishOnboarding = () => navigate(hasPlatformAdministratorSession ? '/admin/pre-cadastros' : '/login', { replace: true })

  const loadContext = async (cnpjValue: string) => {
    if (!isValidCnpj(cnpjValue)) {
      setInvitationState('cnpj-required')
      return
    }

    setLoadingContext(true)
    try {
      const nextContext = await onboardingApi.getContext(tokenRef.current, cnpjValue)
      setContext(nextContext)
      setCnpj(nextContext.cnpj)
      setCompany((current) => ({ ...current, tradeName: current.tradeName || nextContext.companyName || '', commercialEmail: current.commercialEmail || nextContext.email }))
      setInvitationState('ready')
      const cleanUrl = `${window.location.pathname}${window.location.hash}`
      window.history.replaceState({ ...window.history.state, onboardingToken: tokenRef.current }, '', cleanUrl)
    } catch (caught) {
      setInvitationState(caught instanceof OnboardingApiError ? caught.state : 'unavailable')
    } finally {
      setLoadingContext(false)
    }
  }

  const validateCnpj = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setInvitationState('cnpj-required')
    await loadContext(cnpj)
  }

  const validateCurrent = () => {
    const nextErrors = step === 0 ? validateAdministrator(administrator, context?.requiresExistingPassword) : step === 1 ? validateCompany(company) : validateClinicUnit(clinicUnit)
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
    if (!context) return

    const validations = [validateAdministrator(administrator, context.requiresExistingPassword), validateCompany(company), validateClinicUnit(clinicUnit)]
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
      const result = await onboardingApi.complete({ token: tokenRef.current, cnpj: context.cnpj, ...data })
      setCompletedTenantId(result.tenantId)
    } catch (caught) {
      setSubmitError(caught instanceof Error ? caught.message : 'Não foi possível concluir o cadastro. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingContext) return <OnboardingFrame><InvitationValidationLoading /></OnboardingFrame>
  if (invitationState !== 'ready' || !context) {
    const copy = invitationCopy[invitationState === 'ready' ? 'unavailable' : invitationState]
    if (invitationState === 'cnpj-required' || invitationState === 'cnpj-mismatch') {
      return <OnboardingFrame><section className={`onboarding-result onboarding-validation ${invitationState === 'cnpj-mismatch' ? 'has-error' : ''}`}><span className={`onboarding-result-icon ${invitationState === 'cnpj-mismatch' ? 'error' : ''}`}><LockKeyhole /></span><div className="eyebrow">CONVITE PROTEGIDO</div><h1>{copy.title}</h1><p>{copy.description}</p><form className="onboarding-cnpj-form" onSubmit={(event) => void validateCnpj(event)}><div className="onboarding-cnpj-field"><label htmlFor="onboarding-cnpj">CNPJ da clínica</label><input id="onboarding-cnpj" value={maskCnpj(cnpj)} onChange={(event) => setCnpj(event.target.value)} inputMode="numeric" autoComplete="organization" placeholder="00.000.000/0000-00" maxLength={18} aria-invalid={invitationState === 'cnpj-mismatch'} autoFocus required /></div><button className="button button-dark" type="submit" disabled={loadingContext || !isValidCnpj(cnpj)}><ShieldCheck />Validar e continuar</button></form><div className="onboarding-security-points"><span><ShieldCheck />Seus dados são validados com segurança</span><span><HeartPulse />Leva poucos minutos para concluir</span></div><div className="onboarding-result-actions"><Link className="button button-outline" to="/login">Já tenho acesso</Link></div></section></OnboardingFrame>
    }
    return <OnboardingFrame><section className="onboarding-result"><span className="onboarding-result-icon error"><LockKeyhole /></span><h1>{copy.title}</h1><p>{copy.description}</p><div className="onboarding-result-actions">{invitationState === 'unavailable' && <button className="button button-dark" onClick={() => void loadContext(cnpj)}><RefreshCw />Tentar novamente</button>}<Link className="button button-outline" to="/login">Ir para o login</Link></div></section></OnboardingFrame>
  }
  if (completedTenantId) return <OnboardingFrame><OnboardingSuccessPage hasPlatformAdministratorSession={hasPlatformAdministratorSession} enteringClinic={enteringClinic} error={entryError} onEnterClinic={() => void enterClinic()} onFinish={finishOnboarding} /></OnboardingFrame>

  return <OnboardingFrame>
    <OnboardingProgress current={reviewing ? 3 : step} />
    <section className="onboarding-card">
      <header className="onboarding-card-head"><div><div className="eyebrow">{reviewing ? 'Revisão final' : `Etapa ${step + 1} de 3`}</div><h1>{reviewing ? 'Confira os dados da clínica' : step === 0 ? 'Vamos criar seu acesso' : step === 1 ? 'Conte sobre a empresa' : 'Configure a primeira unidade'}</h1><p>{reviewing ? 'Revise as informações antes de concluir o cadastro.' : step === 0 ? 'Seus dados serão usados para administrar a clínica com segurança.' : step === 1 ? 'Complete os dados que identificam a empresa.' : 'Esta será a unidade padrão para iniciar a operação.'}</p></div>{!reviewing && <span className="onboarding-head-icon">{step === 0 ? <UserRound /> : step === 1 ? <Building2 /> : <MapPin />}</span>}</header>
      <div className="onboarding-card-body">
        {!reviewing && step === 0 && <AdministratorStep value={administrator} email={context.email} requiresExistingPassword={context.requiresExistingPassword} errors={errors as FieldErrors<AdministratorData>} onChange={setAdministrator} />}
        {!reviewing && step === 1 && <CompanyStep value={company} cnpj={context.cnpj} errors={errors as FieldErrors<CompanyData>} onChange={setCompany} />}
        {!reviewing && step === 2 && <ClinicUnitStep value={clinicUnit} errors={errors as FieldErrors<ClinicUnitData>} onChange={setClinicUnit} />}
        {reviewing && <Review context={context} data={{ administrator, company, clinicUnit }} onEdit={(nextStep) => { setReviewing(false); setStep(nextStep); setErrors({}) }} />}
        {submitError && <div className="login-error" role="alert">{submitError}</div>}
      </div>
      <footer className="onboarding-card-foot"><button className="button button-outline" onClick={back} disabled={!reviewing && step === 0 || submitting}><ArrowLeft />Voltar</button>{reviewing ? <button className="button button-primary" onClick={() => void submit()} disabled={submitting}>{submitting ? <><LoaderCircle className="spin" />Concluindo…</> : <>Concluir cadastro <ShieldCheck /></>}</button> : <button className="button button-dark" onClick={next}>Avançar <ArrowRight /></button>}</footer>
    </section>
  </OnboardingFrame>
}

function InvitationValidationLoading() {
  return <section className="onboarding-result onboarding-loading" role="status" aria-live="polite">
    <div className="onboarding-loading-animation" aria-hidden="true"><span /><ShieldCheck /></div>
    <div className="eyebrow">ACESSO SEGURO</div>
    <h1>Validando seu convite</h1>
    <p>Estamos confirmando os dados e preparando a jornada da sua clínica.</p>
    <div className="onboarding-loading-track"><span /></div>
    <small>Isso costuma levar apenas alguns segundos.</small>
  </section>
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

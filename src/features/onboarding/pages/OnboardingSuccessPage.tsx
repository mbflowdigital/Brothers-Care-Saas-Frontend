import { ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, LoaderCircle, MapPin, UserRound } from 'lucide-react'

type OnboardingSuccessPageProps = {
  hasPlatformAdministratorSession: boolean
  enteringClinic: boolean
  error: string
  onEnterClinic: () => void
  onFinish: () => void
}

export function OnboardingSuccessPage({ hasPlatformAdministratorSession, enteringClinic, error, onEnterClinic, onFinish }: OnboardingSuccessPageProps) {
  return <section className="onboarding-result onboarding-success" role="status">
    <span className="onboarding-result-icon"><CheckCircle2 /></span>
    <div className="eyebrow">Cadastro concluído</div>
    <h1>Sua clínica está pronta para o primeiro acesso.</h1>
    <p>Criamos a estrutura inicial da operação. Você pode entrar agora na nova clínica ou encerrar este onboarding.</p>
    <div className="onboarding-result-list"><span><UserRound /><Check />Administrador ativado</span><span><Building2 /><Check />Empresa configurada</span><span><MapPin /><Check />Primeira unidade criada</span></div>
    {error && <div className="login-error onboarding-entry-error" role="alert">{error}</div>}
    <div className="onboarding-result-actions onboarding-success-actions">
      <button className="button button-dark" type="button" onClick={onEnterClinic} disabled={enteringClinic}>{enteringClinic ? <><LoaderCircle className="spin" />Entrando na clínica…</> : <>Entrar na nova clínica <ArrowRight /></>}</button>
      <button className="button button-outline" type="button" onClick={onFinish} disabled={enteringClinic}><ArrowLeft />{hasPlatformAdministratorSession ? 'Voltar aos pré-cadastros' : 'Ir para o login'}</button>
    </div>
  </section>
}

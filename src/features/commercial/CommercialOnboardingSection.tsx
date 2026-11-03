import { useState } from 'react'
import { ArrowRight, CheckCircle2, ChevronLeft, QrCode } from 'lucide-react'
import { requestCommercialOnboarding, resendCommercialOnboardingInvitation } from './commercialOnboardingApi'

type FormValues = {
  companyName: string
  cnpj: string
  responsibleName: string
  responsibleEmail: string
}

const emptyForm: FormValues = { companyName: '', cnpj: '', responsibleName: '', responsibleEmail: '' }

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2}\.\d{3})(\d)/, '$1.$2')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function CommercialOnboardingSection() {
  const [form, setForm] = useState<FormValues>(emptyForm)
  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [resendMessage, setResendMessage] = useState('')

  function update(field: keyof FormValues, value: string) {
    setForm((current) => ({ ...current, [field]: field === 'cnpj' ? formatCnpj(value) : value }))
  }

  function continueToPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setStep('payment')
  }

  async function confirmSimulatedPayment() {
    setError('')
    setLoading(true)
    try {
      const result = await requestCommercialOnboarding(form)
      setTenantId(result.tenantId)
      setStep('success')
      setForm(emptyForm)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível enviar sua solicitação. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function resendInvitation() {
    if (!tenantId) return
    setError('')
    setResendMessage('')
    setLoading(true)
    try {
      await resendCommercialOnboardingInvitation(tenantId)
      setResendMessage('Solicitação de reenvio registrada. Confira também Spam e Promoções.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível reenviar o convite. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return <section className="public-section" id="demonstracao">
    <div className="commercial-onboarding">
      <div className="commercial-onboarding-copy">
        <div className="eyebrow">Comece com o Brothers Care</div>
        <h2>Mais clareza para cuidar e crescer.</h2>
        <p>Conte um pouco sobre sua empresa. Vamos enviar o próximo passo para o e-mail da pessoa responsável.</p>
        <small>Você concluirá o cadastro da empresa e da primeira clínica no convite enviado por e-mail.</small>
      </div>
      {step === 'success' ? <div className="commercial-onboarding-success" role="status">
        <CheckCircle2 aria-hidden="true" />
        <div><strong>Pagamento simulado confirmado.</strong><p>O convite foi encaminhado ao servidor de e-mail. Ele pode levar alguns minutos; confira também Spam e Promoções.</p>{resendMessage && <p className="commercial-resend-message" role="status">{resendMessage}</p>}{error && <p className="commercial-resend-error" role="alert">{error}</p>}</div>
        <div className="commercial-success-actions"><button className="button button-outline" type="button" onClick={resendInvitation} disabled={loading}>{loading ? 'Reenviando…' : 'Reenviar convite de teste'}</button><button className="button button-outline" type="button" onClick={() => { setError(''); setResendMessage(''); setTenantId(null); setStep('details') }}>Enviar para outra empresa</button></div>
      </div> : step === 'payment' ? <div className="commercial-payment" aria-live="polite">
        <div className="commercial-payment-head"><div><span className="commercial-payment-badge">PIX de teste</span><h3>Confirme o pagamento simulado</h3><p>Nenhum valor será cobrado. O convite só será enviado após esta confirmação.</p></div><QrCode aria-hidden="true" /></div>
        <div className="commercial-pix-code"><span>BROTHERSCARE-PIX-TESTE-{form.cnpj.replace(/\D/g, '').slice(-4).padStart(4, '0')}</span></div>
        {error && <div className="commercial-onboarding-error" role="alert">{error}</div>}
        <div className="commercial-payment-actions"><button className="button button-outline" type="button" onClick={() => { setError(''); setStep('details') }} disabled={loading}><ChevronLeft /> Voltar</button><button className="button button-dark" type="button" onClick={confirmSimulatedPayment} disabled={loading}>{loading ? 'Confirmando…' : <>Confirmar pagamento simulado <ArrowRight /></>}</button></div>
      </div> : <form className="commercial-onboarding-form" onSubmit={continueToPayment}>
        <div className="field full"><label htmlFor="commercial-company-name">Nome da empresa</label><input id="commercial-company-name" autoComplete="organization" value={form.companyName} onChange={(event) => update('companyName', event.target.value)} maxLength={200} required /></div>
        <div className="field"><label htmlFor="commercial-cnpj">CNPJ</label><input id="commercial-cnpj" inputMode="numeric" autoComplete="off" placeholder="00.000.000/0000-00" value={form.cnpj} onChange={(event) => update('cnpj', event.target.value)} required /></div>
        <div className="field"><label htmlFor="commercial-responsible-name">Seu nome</label><input id="commercial-responsible-name" autoComplete="name" value={form.responsibleName} onChange={(event) => update('responsibleName', event.target.value)} maxLength={200} required /></div>
        <div className="field full"><label htmlFor="commercial-responsible-email">E-mail profissional</label><input id="commercial-responsible-email" type="email" autoComplete="email" placeholder="voce@empresa.com.br" value={form.responsibleEmail} onChange={(event) => update('responsibleEmail', event.target.value)} maxLength={320} required /></div>
        {error && <div className="commercial-onboarding-error" role="alert">{error}</div>}
        <button className="button button-dark" type="submit">Continuar para pagamento <ArrowRight /></button>
      </form>}
    </div>
  </section>
}

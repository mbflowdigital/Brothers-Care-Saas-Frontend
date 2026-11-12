import type { OnboardingApi } from '../types'
import { OnboardingApiError } from '../types'

const wait = () => new Promise((resolve) => window.setTimeout(resolve, 450))

export const mockOnboardingApi: OnboardingApi = {
  async getContext(token, cnpj) {
    await wait()
    const knownErrors = {
      expirado: new OnboardingApiError('expired', 'Este convite expirou. Solicite um novo link.'),
      revogado: new OnboardingApiError('revoked', 'Este convite foi revogado.'),
      utilizado: new OnboardingApiError('used', 'Este convite já foi utilizado.'),
    } as const
    if (token in knownErrors) throw knownErrors[token as keyof typeof knownErrors]
    if (!token || token === 'invalido') throw new OnboardingApiError('invalid', 'Este convite não é válido.')
    if (cnpj.replace(/\D/g, '') !== '11222333000181') throw new OnboardingApiError('cnpj-mismatch', 'O CNPJ não corresponde ao pré-cadastro deste convite.')
    return {
      email: 'mariana@clinicaexemplo.com.br',
      cnpj: '11222333000181',
      companyName: 'Clínica Exemplo',
      requiresExistingPassword: false,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    }
  },
  async complete(payload) {
    await wait()
    if (payload.cnpj.replace(/\D/g, '') !== '11222333000181') throw new OnboardingApiError('cnpj-mismatch', 'O CNPJ não corresponde ao pré-cadastro deste convite.')
    return { status: 'completed', nextAction: 'login', tenantId: '00000000-0000-0000-0000-000000000001' }
  },
}

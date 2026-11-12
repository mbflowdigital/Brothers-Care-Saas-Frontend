export type InvitationState = 'cnpj-required' | 'cnpj-mismatch' | 'ready' | 'invalid' | 'expired' | 'revoked' | 'used' | 'unavailable'

export type OnboardingContext = {
  email: string
  cnpj: string
  companyName?: string
  requiresExistingPassword: boolean
  expiresAt?: string
}

export type AdministratorData = {
  displayName: string
  cpf: string
  password: string
  passwordConfirmation: string
}

export type CompanyData = {
  legalName: string
  tradeName: string
  commercialEmail: string
  phone: string
}

export type ClinicUnitData = {
  name: string
  postalCode: string
  street: string
  number: string
  complement: string
  district: string
  city: string
  state: string
  phone: string
}

export type OnboardingFormData = {
  administrator: AdministratorData
  company: CompanyData
  clinicUnit: ClinicUnitData
}

export type OnboardingCompletion = OnboardingFormData & { token: string; cnpj: string }

export type OnboardingCompletionResult = {
  status: 'completed'
  nextAction: 'login'
  tenantId: string
}

export interface OnboardingApi {
  getContext(token: string, cnpj: string): Promise<OnboardingContext>
  complete(payload: OnboardingCompletion): Promise<OnboardingCompletionResult>
}

export class OnboardingApiError extends Error {
  constructor(public readonly state: Exclude<InvitationState, 'ready'>, message: string) {
    super(message)
    this.name = 'OnboardingApiError'
  }
}

export type FieldErrors<T> = Partial<Record<keyof T, string>>

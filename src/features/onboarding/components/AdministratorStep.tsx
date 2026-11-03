import type { AdministratorData, FieldErrors } from '../types'
import { maskCpf } from '../validation'

type Props = {
  value: AdministratorData
  email: string
  errors: FieldErrors<AdministratorData>
  onChange: (value: AdministratorData) => void
}

export function AdministratorStep({ value, email, errors, onChange }: Props) {
  const update = (field: keyof AdministratorData, nextValue: string) => onChange({ ...value, [field]: nextValue })
  return <fieldset className="onboarding-fields">
    <legend className="sr-only">Dados do administrador</legend>
    <div className={`field full ${errors.displayName ? 'field-invalid' : ''}`}><label htmlFor="onboarding-name">Nome completo</label><input id="onboarding-name" autoComplete="name" value={value.displayName} onChange={(event) => update('displayName', event.target.value)} aria-invalid={Boolean(errors.displayName)} aria-describedby={errors.displayName ? 'onboarding-name-error' : undefined} />{errors.displayName && <small id="onboarding-name-error" className="field-error">{errors.displayName}</small>}</div>
    <div className="field full"><label htmlFor="onboarding-email">E-mail do convite</label><input id="onboarding-email" value={email} readOnly aria-readonly="true" /><small className="field-note">Este e-mail foi validado no pré-cadastro e não pode ser alterado aqui.</small></div>
    <div className={`field full ${errors.cpf ? 'field-invalid' : ''}`}><label htmlFor="onboarding-cpf">CPF</label><input id="onboarding-cpf" inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" value={value.cpf} onChange={(event) => update('cpf', maskCpf(event.target.value))} maxLength={14} aria-invalid={Boolean(errors.cpf)} aria-describedby={errors.cpf ? 'onboarding-cpf-error' : undefined} />{errors.cpf && <small id="onboarding-cpf-error" className="field-error">{errors.cpf}</small>}</div>
    <div className={`field ${errors.password ? 'field-invalid' : ''}`}><label htmlFor="onboarding-password">Senha</label><input id="onboarding-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} value={value.password} onChange={(event) => update('password', event.target.value)} aria-invalid={Boolean(errors.password)} />{errors.password && <small className="field-error">{errors.password}</small>}</div>
    <div className={`field ${errors.passwordConfirmation ? 'field-invalid' : ''}`}><label htmlFor="onboarding-password-confirmation">Confirmar senha</label><input id="onboarding-password-confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={128} value={value.passwordConfirmation} onChange={(event) => update('passwordConfirmation', event.target.value)} aria-invalid={Boolean(errors.passwordConfirmation)} />{errors.passwordConfirmation && <small className="field-error">{errors.passwordConfirmation}</small>}</div>
  </fieldset>
}

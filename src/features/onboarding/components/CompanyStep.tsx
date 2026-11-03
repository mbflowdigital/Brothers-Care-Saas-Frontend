import type { CompanyData, FieldErrors } from '../types'
import { maskCnpj, maskPhone } from '../validation'

type Props = { value: CompanyData; cnpj: string; errors: FieldErrors<CompanyData>; onChange: (value: CompanyData) => void }

export function CompanyStep({ value, cnpj, errors, onChange }: Props) {
  const update = (field: keyof CompanyData, nextValue: string) => onChange({ ...value, [field]: nextValue })
  const field = (name: keyof CompanyData, label: string, options?: { type?: string; placeholder?: string }) => <div className={`field ${name === 'legalName' || name === 'tradeName' ? 'full' : ''} ${errors[name] ? 'field-invalid' : ''}`}><label htmlFor={`company-${name}`}>{label}</label><input id={`company-${name}`} type={options?.type} placeholder={options?.placeholder} value={value[name]} onChange={(event) => update(name, name === 'phone' ? maskPhone(event.target.value) : event.target.value)} aria-invalid={Boolean(errors[name])} />{errors[name] && <small className="field-error">{errors[name]}</small>}</div>
  return <fieldset className="onboarding-fields">
    <legend className="sr-only">Dados da empresa</legend>
    <div className="field full"><label htmlFor="company-cnpj">CNPJ</label><input id="company-cnpj" value={maskCnpj(cnpj)} readOnly aria-readonly="true" /><small className="field-note">CNPJ confirmado no pré-cadastro comercial.</small></div>
    {field('legalName', 'Razão social')}
    {field('tradeName', 'Nome fantasia')}
    {field('commercialEmail', 'E-mail comercial', { type: 'email', placeholder: 'contato@clinica.com.br' })}
    {field('phone', 'Telefone', { placeholder: '(00) 00000-0000' })}
  </fieldset>
}

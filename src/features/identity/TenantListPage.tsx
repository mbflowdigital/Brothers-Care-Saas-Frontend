import { useEffect, useState } from 'react'
import { listTenants, type TenantListItem } from './accountActionApi'

export function TenantListPage() {
  const [items, setItems] = useState<TenantListItem[]>([]); const [error, setError] = useState('')
  useEffect(() => { listTenants().then(setItems).catch((caught) => setError(caught instanceof Error ? caught.message : 'Não foi possível carregar as empresas.')) }, [])
  if (error) return <p className="form-error" role="alert">{error}</p>
  const labels: Record<string, string> = { Invited: 'Aguardando aceite', Active: 'Administrador ativo', Suspended: 'Administrador suspenso', Revoked: 'Convite revogado', WithoutAdministrator: 'Sem administrador' }
  return <section className="card table-card"><div className="table-toolbar"><div><h2 className="section-title">Empresas cadastradas</h2><span style={{ fontSize: 9, color: '#91a0a5' }}>Dados reais da plataforma</span></div></div><div className="table-wrap"><table><thead><tr><th>Empresa</th><th>Status</th><th>Primeiro acesso</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td><span className="status status-ativo">{item.status}</span></td><td>{labels[item.firstAdministratorStatus] ?? item.firstAdministratorStatus}</td></tr>)}</tbody></table>{items.length === 0 && <div className="empty-state"><h3>Nenhuma empresa cadastrada</h3><p>Crie a primeira empresa acima.</p></div>}</div></section>
}

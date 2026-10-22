# Padrões do Projeto Brothers Care

Estas regras se aplicam a pessoas, GitHub Copilot e outros agentes que alterem este repositório.

Leia também `README.md` para executar o projeto e `ARCHITECTURE.md` para o estado atual, o modelo de domínio alvo e as decisões de multi-tenancy.

## Contexto

- Produto: Brothers Care, plataforma de gestão para clínicas de reabilitação e atendimento domiciliar.
- Idioma da interface e da documentação do produto: português brasileiro.
- Stack atual: React 19, TypeScript strict, Vite, React Router, Tailwind CSS 3, Recharts e Lucide.
- O estado atual é uma experiência de demonstração no navegador. Não há backend ou autenticação real.
- Dados clínicos e credenciais existentes são cenográficos. Nunca inserir dados pessoais ou clínicos reais.

## Antes de alterar

1. Leia este arquivo, o README e o código diretamente relacionado à mudança.
2. Identifique o domínio responsável pelo comportamento antes de editar. Evite adicionar novas regras em `App.tsx`, `ExtraViews.tsx` ou `data.ts` quando uma feature puder ser extraída incrementalmente.
3. Preserve a stack, rotas e convenções existentes. Não adicione dependências ou serviços sem necessidade concreta.
4. Declare suposições relevantes. Não faça refatorações amplas junto de uma mudança funcional pequena.

## Organização e domínio

- Mantenha UI, regras de negócio e acesso a dados separados.
- Tipos e funções devem ter nomes de domínio claros; evite objetos genéricos que misturem paciente, clínica e empresa.
- Para código novo, prefira módulos por domínio em `src/features/<domínio>/`; mantenha `src/shared/` para componentes e utilitários realmente compartilhados.
- Faça a extração dos módulos atuais de forma incremental, mantendo os fluxos existentes funcionando.
- Valide entradas em formulários e represente estados de carregamento, erro, vazio e sucesso.
- Prefira componentes acessíveis, labels associados, navegação por teclado e feedback explícito após ações.

## Multi-tenancy e segurança

- Não trate a sessão em `localStorage` nem guardas de React como controles de segurança.
- Não implemente isolamento multi-tenant somente no frontend. Em uma integração futura, a API deve derivar o tenant da identidade autenticada e autorizar cada operação no servidor.
- Qualquer consulta ou mutação futura de dados de tenant deve receber contexto autorizado e ser coberta por testes que tentem acesso cruzado entre empresas.
- Não registrar tokens, senhas, dados de saúde ou identificadores pessoais em logs, analytics ou mensagens de erro.
- Não persistir dados clínicos reais em `localStorage`, `sessionStorage` ou arquivos mockados.
- Anexos, evolução clínica, auditoria e mensagens devem respeitar acesso mínimo, privacidade, retenção e requisitos aplicáveis da LGPD.
- Credenciais fixas só podem existir nos fluxos locais de demonstração já documentados; nunca adicionar credenciais de produção.

## Interface e conteúdo

- Toda interface visível ao usuário deve estar em português brasileiro e usar conteúdo claro, sem lorem ipsum.
- Use os tokens e padrões visuais existentes em `styles.css` e `polish.css`; mantenha responsividade desktop e mobile.
- Use ícones Lucide já presentes no projeto e mantenha estados de hover, foco, disabled e carregamento.
- Não usar dados reais. Marque claramente limites e avisos de demonstração em documentação, não em conteúdo promocional da interface.

## Validação obrigatória

- Rode `npm run build` após mudanças de código.
- Teste manualmente ou automatize os fluxos afetados, incluindo ao menos um viewport móvel para mudanças de interface.
- Confira que o estado vazio, erro de validação e sucesso continuam coerentes.
- Não diga que algo foi validado se o comando ou fluxo não foi executado.
- Não inclua `node_modules`, `dist`, caches, arquivos `.env` ou dados locais no commit.

## Direção para produção

Antes de qualquer uso com clínicas reais, planeje autenticação server-side, autorização por função e tenant, API, banco com migrações, isolamento de tenant, testes de segurança, auditoria protegida, gestão segura de arquivos, observabilidade, backups e revisão de LGPD. Não apresentar o protótipo de frontend como sistema clinicamente seguro ou pronto para produção.
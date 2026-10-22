# GitHub Copilot

Antes de editar o projeto, leia [`AGENTS.md`](../AGENTS.md) e [`ARCHITECTURE.md`](../ARCHITECTURE.md). `AGENTS.md` é a fonte principal de padrões de implementação; `ARCHITECTURE.md` distingue o protótipo atual da arquitetura alvo.

Preserve React + TypeScript + Vite, mantenha mudanças focadas por domínio e não adicione backend, dependências ou abstrações sem necessidade concreta. Nunca trate sessão em `localStorage`, guardas de rota do React ou filtros de UI como segurança ou isolamento multi-tenant. Não use dados clínicos reais.

Após mudanças de código, rode `npm run build` na raiz deste repositório e relate verificações que não conseguiu executar.
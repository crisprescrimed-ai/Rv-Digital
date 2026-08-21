# RV Digital - Gestão de Metas e Ações

Plataforma comercial responsiva com autenticação por perfil, metas, resultados, indicadores, importações, relatórios, comunicação e ações de gestão.

## Ambiente publicado

[https://rvdigital.up.railway.app](https://rvdigital.up.railway.app)

O ambiente usa HTTPS e pode ser acessado por computadores, tablets e celulares conectados à internet. Todos os dispositivos consultam as mesmas informações no PostgreSQL do Railway.

## Executar localmente

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Configure antes:

```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/rv_digital
JWT_SECRET=uma-chave-segura
```

## Publicar no Railway

1. Envie este projeto para um repositório GitHub e conecte-o ao Railway.
2. Adicione um PostgreSQL e referencie a variável `DATABASE_URL` no serviço web.
3. Configure `JWT_SECRET`, `NODE_ENV=production` e, opcionalmente, `APP_URL`.
4. O Railway usa [railway.json](railway.json) para executar build, migração e start, além de validar `/api/health`.
5. Na primeira publicação, execute `railway ssh -s rv-digital-web npm run db:seed` uma única vez. Defina `SEED_PASSWORD` antes do comando e remova a variável depois.

Nunca execute o seed novamente em produção sem intenção explícita: ele atualiza a senha das contas administrativas iniciais.

## Escopo implementado

- RBAC para SuperAdmin, Gerente, Supervisor e Vendedor.
- Metas, resultados, períodos, bloqueio após o dia 10 e autorizações excepcionais.
- Dez indicadores oficiais configuráveis, incluindo regras `LOWER_IS_BETTER`.
- Importação Excel/CSV com prévia, mapeamento, validação e histórico.
- Dashboards, rankings, alertas e exportações CSV, Excel e PDF.
- Conversas, notificações e registro interno de atividades.
- Ações de gestão com criação, direcionamento, distribuição ponderada, progresso, comentários e histórico.
- Layout responsivo validado em desktop e mobile.

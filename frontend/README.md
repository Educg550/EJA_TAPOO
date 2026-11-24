# Frontend da Plataforma EJA

Interface em React (Create React App) com Material UI e React Router. Consome a API descrita em [`docs/openapi.json`](../docs/openapi.json).

## Executar

Pelo Docker Compose, na raiz do repositório (veja [`docs/backend.md`](../docs/backend.md)), o frontend fica em `http://localhost:3000`.

Fora do Docker, com a API rodando em `http://localhost:8000`:

```bash
npm ci
npm start
```

Para apontar para outra API, defina `REACT_APP_API_URL` antes de `npm start` ou `npm run build`. O valor é fixado no build.

## Testar

```bash
npm test
```

Os testes em `src/App.test.js` substituem o cliente HTTP (`src/services/api.js`) por funções simuladas e cobrem navegação, login, cadastro e sessão.

## Organização

- `src/routes.jsx`: tabela única de rotas, papéis permitidos e itens do menu.
- `src/context/AuthContext.jsx`: sessão, login, cadastro e logout.
- `src/services/api.js`: cliente Axios com token `Bearer`; `src/services/erros.js` traduz erros da API.
- `src/components/`: layout e proteção de rotas.
- `src/pages/`: páginas implementadas. Rotas sem `componente` na tabela exibem uma página provisória.
- `src/theme/theme.js`: tema acessível.

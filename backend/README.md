# Backend EJA

Python 3.15.2, FastAPI e PostgreSQL. Execute os comandos na raiz do repositório.

## Rodar

Copie `.env.example` para `.env` e ajuste `POSTGRES_PASSWORD` antes de iniciar:

```sh
cp .env.example .env
```

```sh
docker compose up --build -d
docker compose exec api uv run --no-sync python -m backend.cli importar
docker compose exec api uv run --no-sync python -m backend.cli criar-admin --nome Administrador --email admin@example.com
```

O Compose lê `.env` automaticamente; o arquivo não é versionado. O último comando pede a senha do administrador. API: `http://localhost:8000`; Swagger: `http://localhost:8000/docs`.

## Integrar o frontend

O [contrato OpenAPI](../docs/openapi.json) contém métodos, caminhos, parâmetros, corpos e respostas. A versão em execução está em `/openapi.json`.

- Cadastre em `POST /auth/cadastro` e faça login em `POST /auth/login`, enviando JSON. Use `Authorization: Bearer <access_token>` nas chamadas autenticadas; o token dura 24 horas. `DELETE /auth/sessao` encerra a sessão.
- Catálogos públicos: `GET /cursos` e `GET /vagas`. Localidades: `GET /localidades/ufs` e `GET /localidades/ufs/{uf}/municipios`.
- Estudante: `GET /licenciandos`, `POST /solicitacoes` com `{"licenciando_id": 1}` e `GET /solicitacoes`.
- Responda em `POST /solicitacoes/{id}/{acao}`, com `acao` igual a `aceitar`, `recusar` ou `cancelar`, conforme o papel. Contatos: `GET /solicitacoes/{id}/contatos`, após o aceite.
- Licenciando atualiza o perfil em `PUT /licenciandos/me`. Administrador mantém vagas em `POST /vagas`, `PUT /vagas/{id}` e `DELETE /vagas/{id}`; consulta todas em `GET /admin/vagas`.

Envie `Content-Type: application/json` quando houver corpo. Respostas 204 não têm JSON. Listagens persistidas aceitam `limite` e `inicio`; os filtros estão no contrato. CORS permite `localhost:3000` e `127.0.0.1:3000`; ajuste `CORS_ORIGINS` para outra origem. O frontend atual ainda usa a antiga demonstração `/items/` e precisa ser integrado.

[Execução sem Docker, regras e testes](../docs/backend.md).

Para atualizar o contrato após alterar a API:

```sh
uv run --project backend python -c 'import json; from backend.main import app; print(json.dumps(app.openapi(), ensure_ascii=False, indent=2))' > docs/openapi.json
```

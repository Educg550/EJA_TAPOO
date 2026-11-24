# Plataforma EJA

Sistema da disciplina MAC0413/TAPOO para conectar estudantes da Educação de Jovens e Adultos a cursos externos, oportunidades de trabalho e licenciandos que oferecem orientação por e-mail.

O backend usa Python 3.15.2, FastAPI, SQLAlchemy, PostgreSQL e `uv`. O frontend React usa Material UI e React Router, com cliente Axios autenticado, sessão via `AuthContext` e rotas protegidas por papel; as páginas do domínio ainda estão em construção.

- [Execução, API, decisões e testes do backend](backend.md).
- [Diagramas de classes e casos de uso](uml/README.md).

O código está em `backend/`, os dados iniciais em `backend/data/`, a interface em `frontend/` e a configuração dos serviços em `compose.yaml`.

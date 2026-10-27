# Plataforma EJA

Projeto da disciplina MAC0413/TAPOO: um sistema web para conectar estudantes da Educação de Jovens e Adultos a cursos gratuitos externos, vagas de trabalho e licenciandos que oferecem orientação por e-mail.

Stack prevista: Python 3.15.2, FastAPI, PostgreSQL e Docker Compose, com `uv` no backend e React no frontend.

Estrutura principal:

```text
.
├── backend/
│   ├── main.py               # API inicial em FastAPI
│   └── data/                 # CSV de cursos e JSON de vagas
├── frontend/
│   ├── src/                  # Interface React
│   ├── public/               # Arquivos estáticos
│   ├── package.json          # Dependências e comandos
│   └── package-lock.json     # Versões das dependências
├── docs/
│   └── uml/                  # Classes e casos de uso: PlantUML e SVG
└── README.md
```

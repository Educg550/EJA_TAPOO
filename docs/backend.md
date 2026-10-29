# Backend da plataforma EJA

## Executar com Docker

Requer Docker Compose. Na raiz do repositório, copie o exemplo:

```sh
cp .env.example .env
```

Edite `POSTGRES_PASSWORD` em `.env`, usando uma senha sem caracteres reservados de URL, e inicie os serviços:

```sh
docker compose up --build -d
docker compose exec api uv run --no-sync python -m backend.cli importar
docker compose exec api uv run --no-sync python -m backend.cli criar-admin --nome Administrador --email admin@example.com
```

O Compose lê `.env` automaticamente. Preserve esse arquivo para os próximos reinícios; ele não é versionado. A criação do administrador pede a senha duas vezes no terminal; não há administrador ou senha padrão. Senhas de contas têm entre 12 e 128 caracteres. O cadastro público só aceita estudante ou licenciando.

A API está em `http://localhost:8000`, o Swagger em `http://localhost:8000/docs` e o contrato em `/openapi.json`. O banco tem volume persistente e não expõe porta ao host. `docker compose down` preserva os dados; a opção `--volumes` os apaga.

O [contrato OpenAPI versionado](openapi.json) é exportado diretamente da aplicação. O [README do backend](../backend/README.md) resume a execução e a integração do frontend, incluindo o comando de atualização do contrato. Um teste verifica que o arquivo continua igual ao schema da API.

O Docker instala o Python e as dependências com `uv`, executa a aplicação sem root e espera a disponibilidade do PostgreSQL. O comando `init-db` cria as tabelas ausentes sem apagar registros. Ele não migra tabelas existentes: mudanças futuras no esquema precisam de uma migração antes de atualizar um banco com dados.

## Desenvolvimento sem Docker

Requer PostgreSQL e `uv` 0.13.6 ou mais recente. A versão 0.11.30 disponível inicialmente só conhecia uma prévia do Python 3.15; o catálogo do `uv` 0.13.6 permitiu instalar 3.15.2. Execute a partir da raiz:

```sh
uv python install 3.15.2
uv sync --project backend --locked
export DATABASE_URL='postgresql+psycopg://usuario:senha@localhost/eja'
uv run --project backend python -m backend.cli init-db
uv run --project backend python -m backend.cli importar
uv run --project backend python -m backend.cli criar-admin --nome Administrador --email admin@example.com
uv run --project backend uvicorn backend.main:app --reload
```

`DATABASE_URL` é obrigatória. `CORS_ORIGINS` aceita origens separadas por vírgula; o padrão permite apenas `http://localhost:3000` e `http://127.0.0.1:3000`. O Compose publica a API somente em loopback. Para publicação, configure HTTPS, origens reais e limitação de tentativas de autenticação no proxy. Publicação em servidor não faz parte desta implementação.

## Rotas

| Método e caminho | Acesso e comportamento |
| --- | --- |
| `POST /auth/cadastro` | Cadastro de estudante ou licenciando |
| `POST /auth/login` | E-mail e senha; retorna token Bearer com validade de 24 horas |
| `DELETE /auth/sessao` | Invalida o token atual |
| `GET /usuarios/me` | Dados da própria conta; para licenciandos, também disciplinas e disponibilidade |
| `GET /licenciandos` | Estudante autenticado; nome, disciplinas e disponibilidade, sem e-mail |
| `PUT /licenciandos/me` | Licenciando altera suas disciplinas e disponibilidade |
| `POST /solicitacoes` | Estudante envia `licenciando_id` |
| `GET /solicitacoes` | Apenas solicitações do participante autenticado, com nomes dos dois participantes |
| `POST /solicitacoes/{id}/aceitar` | Licenciando destinatário aceita um pedido pendente |
| `POST /solicitacoes/{id}/recusar` | Licenciando destinatário recusa um pedido pendente |
| `POST /solicitacoes/{id}/cancelar` | Estudante solicitante cancela um pedido pendente |
| `GET /solicitacoes/{id}/contatos` | E-mails dos dois participantes, somente após aceite e somente para eles |
| `GET /cursos` | Público; busca pelo título com `busca` |
| `GET /vagas` | Público; filtros `cidade`, `uf`, `area_trabalho`, `escolaridade`, `escolaridade_desconhecida` |
| `POST /vagas` | Administrador cadastra vaga |
| `PUT /vagas/{id}` | Administrador substitui os dados da vaga |
| `DELETE /vagas/{id}` | Administrador encerra a vaga, preservando o registro |
| `GET /admin/vagas` | Administrador consulta também vagas encerradas e vencidas |
| `GET /localidades/ufs` | Público; consulta IBGE, retorna ID, nome e sigla |
| `GET /localidades/ufs/{uf}/municipios` | Público; consulta IBGE pela sigla da UF |

Listagens persistidas aceitam `limite` de 1 a 100, com padrão 20, e `inicio` a partir de zero. Filtros de cidade, UF e área usam igualdade. Escolaridade é um filtro exato, sem inferir compatibilidade com o perfil. `escolaridade_desconhecida=true` seleciona ausência de informação; `escolaridade=sem_exigencia` seleciona ausência explícita de exigência. Combinar os dois retorna 422.

Exemplo de cadastro de licenciando:

```json
{
  "nome_exibicao": "Maria",
  "email": "maria@example.com",
  "senha": "uma-senha-longa-e-unica",
  "tipo": "licenciando",
  "disciplinas": ["Matemática"],
  "disponibilidade": "Sábados pela manhã"
}
```

No login, envie `email` e `senha` em JSON. Nas chamadas autenticadas, use `Authorization: Bearer <access_token>`. Tokens são aleatórios e armazenados somente como SHA-256; senhas usam Argon2. Os erros de validação não repetem os valores enviados. E-mails são normalizados para minúsculas. Não há foto, aprovação de licenciando, matrícula, candidatura interna, recuperação de senha ou envio automático de e-mails.

`GET /usuarios/me` inclui `disciplinas` e `disponibilidade` somente para o próprio licenciando. As respostas de criação, consulta e transição de solicitações incluem `estudante_nome` e `licenciando_nome`. Esses nomes permitem identificar os participantes antes do aceite; e-mails continuam restritos ao endpoint de contatos após o aceite. As relações são carregadas em lote pelo ORM, sem uma consulta adicional por solicitação e sem mudança no esquema do banco.

Erros: 401 para autenticação ausente ou inválida; 403 para acesso indevido; 404 para registro ausente; 409 para duplicidade ou transição inválida; 422 para entrada inválida; 502 para falha ou resposta inválida do IBGE.

## Domínio e persistência

`domain.py` contém classes de domínio sem dependência do FastAPI ou SQLAlchemy. `Usuario` é abstrata; suas subclasses implementam `permissoes()`, que a autorização consulta por polimorfismo. `SolicitacaoApoio` encapsula o estado e controla atores, transições e acesso aos contatos. Aceita, recusada e cancelada são estados finais. `OportunidadeTrabalho.encerrar()` preserva o histórico.

`database.py` mapeia essas classes diretamente com SQLAlchemy, sem duplicar entidades em modelos de persistência. A hierarquia de usuários usa uma tabela com discriminador. `schemas.py` valida entradas e limita os dados expostos; `security.py` autentica; `main.py` coordena as operações HTTP e transações; `cli.py` inicializa o banco, importa dados e cria administradores.

Uma conexão pendente ou aceita bloqueia novos pedidos entre o mesmo estudante e licenciando por índice único parcial. Recusa e cancelamento permitem novo pedido. Um bloqueio de linha no PostgreSQL serializa as respostas concorrentes para que apenas uma transição vença. Essa política de repetição foi adotada na implementação; não existe encerramento de uma conexão aceita.

`SolicitacaoApoio` usa State: delega transições e liberação de contatos a `Pendente`, `Aceita`, `Recusada` e `Cancelada`. As verificações de participante continuam na solicitação. O enum `EstadoSolicitacao` mantém os valores públicos e persistidos; o objeto de comportamento é escolhido a partir desse valor a cada operação, inclusive após leitura do banco.

`importacao.py` usa Template Method: `Importador.importar()` fixa consulta de chaves, abertura do arquivo, conversão, deduplicação e inclusão. `ImportadorCursos` e `ImportadorVagas` implementam leitura e conversão com as validações existentes. `cli.importar()` coordena ambos e executa o flush; a transação do chamador continua responsável pelo commit ou rollback dos dois catálogos. Não foram acrescentados Repository, Unit of Work ou Factory próprios.

Conforme as [novidades do Python 3.15](https://docs.python.org/3/whatsnew/3.15.html), `lazy import` adia o HTTPX usado pelo IBGE e os módulos específicos dos comandos de importação e criação de administrador. Assim, `init-db` e `--help` não carregam validação HTTP nem hashing de senhas. O mapeamento ORM e o registro das rotas continuam imediatos, pois seus efeitos são necessários à inicialização. Não foi ativado lazy loading global. As permissões já são conjuntos imutáveis (`frozenset`); não há mapa constante que justifique `frozendict` nesta implementação.

## Dados iniciais e integração externa

`importar` lê os arquivos originais sem alterá-los e importa tudo em uma transação. Reexecuções ignoram cursos pelo ID e vagas pelo link de candidatura, preservando alterações administrativas. IDs locais de vagas são gerados pelo banco; não representam IDs do Gupy.

São preservados os 1.029 cursos e as 138 vagas. A API pública de cursos exclui ofertas diferentes de `Curso Aberto` e cargas horárias zero, sem apagar os registros. Isso não representa curadoria pedagógica: a adequação à EJA e demais restrições de público ainda exigem revisão. As URLs de cursos seguem o padrão do provedor e não foram verificadas individualmente.

Vagas importadas ficam com escolaridade desconhecida. A consulta pública exclui vagas encerradas e prazos anteriores à data do servidor. A manutenção continua manual; os anúncios externos não foram verificados individualmente. Importações futuras de vagas cujo link tenha sido alterado administrativamente poderão gerar outro registro; este comando atende à carga inicial, não à sincronização.

A integração de localidades usa a [API oficial do IBGE](https://servicodados.ibge.gov.br/api/docs/localidades), com timeout de cinco segundos e sem credenciais. A UF e o nome do município podem alimentar os filtros textuais; não se atribuem códigos IBGE inventados aos dados importados.

## Testes

Na raiz:

```sh
uv run --project backend pytest backend/tests -q
uv run --project backend ruff check backend
uv run --project backend ruff format --check backend
```

O padrão usa SQLite em memória para verificações rápidas. Para integração real, forneça um PostgreSQL descartável cujo banco se chame obrigatoriamente `eja_test`:

```sh
export TEST_DATABASE_URL='postgresql+psycopg://usuario:senha@localhost/eja_test'
uv run --project backend pytest backend/tests -q --cov=backend --cov-branch --cov-config=backend/pyproject.toml --cov-report=term-missing
```

Os testes apagam e recriam as tabelas desse banco isolado a cada caso. Nunca use um banco com dados úteis. Cobrem a abstração e o polimorfismo dos usuários, autenticação, expiração e revogação de sessão, autorização entre participantes, sigilo dos e-mails, estados finais, pedidos repetidos, manutenção e filtros de vagas, importação idempotente, validação das entradas e falhas do IBGE. A integração do frontend React não é coberta: ele ainda chama a antiga demonstração `/items/`, removida do backend.

Validação em 27/10/2026, com Python 3.15.2: 66 testes passaram no PostgreSQL 17; no SQLite, 64 passaram e os dois testes de concorrência foram ignorados por dependerem de PostgreSQL. A cobertura do backend, excluídos os próprios testes, chegou a 99%, agora incluindo decisões além das linhas. API, schemas, segurança e persistência tiveram 100%. Permanecem sem execução o corpo do método abstrato `Usuario.permissoes()` e a chamada do módulo CLI pelo bloco `__main__`.

Os testes adicionais verificam o perfil completo do licenciando, os nomes dos participantes sem vazamento de e-mails, exigência de autenticação em todas as operações privadas, bloqueio de atualização e encerramento de vagas sem permissão, registros inexistentes, paginação nas cinco listagens persistidas, filtros individuais e combinados, prazo de inscrição igual a hoje, busca com caracteres literais e conteúdo dos municípios. Também cobrem erros HTTP e respostas inválidas do IBGE, comandos da CLI com entrada de senha simulada, rollback de importação inválida e sessões reais por requisição, incluindo sucesso após uma falha de unicidade.

A imagem Docker foi construída e o Compose iniciou banco e API. A importação pela CLI retornou `{"cursos": 1029, "vagas": 138}`; a segunda execução retornou `{"cursos": 0, "vagas": 0}`. Chamadas HTTP reais verificaram cadastro, login, apoio, liberação de contatos, catálogo e os endpoints de UF e municípios do IBGE. Os hashes dos arquivos de dados originais permaneceram iguais. Ruff e a verificação de formatação passaram.

O Starlette instalado emite um aviso de depreciação do uso de HTTPX pelo cliente de testes. A suíte passa; a migração desse cliente fica para uma atualização das ferramentas de teste. A entrada de senha da CLI é simulada nos testes; o terminal interativo não é automatizado. Fluxos pelo navegador continuam fora desta suíte, pois o frontend ainda precisa ser implementado e integrado.

## Revisão final do backend e UML

Revisão repetida em 27/10/2026: os 66 testes passaram novamente no PostgreSQL 17, com 99% de cobertura incluindo decisões. Ruff, formatação, configuração Compose e correspondência do OpenAPI com a aplicação foram conferidos. Os fontes PlantUML foram comparados às classes e aos casos de uso implementados; os dois SVGs foram regenerados e inspecionados visualmente.

A imagem final foi construída e iniciada com Compose em ambiente descartável. Foram verificados por HTTP real cadastro, login dos três papéis, consulta e edição do perfil, nomes nas solicitações, aceite, restrição dos contatos, rejeição de transições finais, gestão de vagas e logout. A criação de administrador também foi testada manualmente no terminal. A importação inicial retornou 1.029 cursos e 138 vagas; a repetição não acrescentou registros. As chamadas reais do IBGE retornaram 27 UFs e os municípios de São Paulo com o formato esperado.

Não foram encontrados bloqueios funcionais no escopo de backend definido. Isso não equivale à conclusão da entrega: integração do frontend e validação pelo navegador, publicação em servidor, curadoria pedagógica dos cursos e os quatro relatórios analíticos continuam pendentes. A configuração de HTTPS e limitação de autenticação no proxy deve acompanhar a publicação; a versão local usa loopback. O inicializador cria tabelas, mas não migra esquemas existentes.

Documentação técnica consultada: [mapeamento de dataclasses no SQLAlchemy](https://docs.sqlalchemy.org/en/20/orm/dataclasses.html), [segurança HTTPBearer no FastAPI](https://fastapi.tiangolo.com/reference/security/) e [uv no Docker](https://docs.astral.sh/uv/guides/integration/docker/).

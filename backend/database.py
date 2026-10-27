import os
from functools import lru_cache

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Table,
    Text,
    create_engine,
)
from sqlalchemy.orm import Session, registry

from backend.domain import (
    Administrador,
    CursoExterno,
    EstudanteEJA,
    Licenciando,
    OportunidadeTrabalho,
    SolicitacaoApoio,
    Usuario,
)

mapper = registry()
metadata = mapper.metadata

usuarios = Table(
    "usuarios",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("tipo", String(20), nullable=False),
    Column("nome_exibicao", String(120), nullable=False),
    Column("email", String(254), nullable=False, unique=True),
    Column("senha_hash", Text, nullable=False),
    Column("disciplinas", JSON),
    Column("disponibilidade", String(500)),
    CheckConstraint("tipo IN ('estudante', 'licenciando', 'administrador')"),
)
mapper.map_imperatively(
    Usuario,
    usuarios,
    polymorphic_on=usuarios.c.tipo,
    polymorphic_abstract=True,
)
for classe, tipo in (
    (EstudanteEJA, "estudante"),
    (Licenciando, "licenciando"),
    (Administrador, "administrador"),
):
    mapper.map_imperatively(classe, inherits=Usuario, polymorphic_identity=tipo)

solicitacoes = Table(
    "solicitacoes",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("estudante_id", ForeignKey("usuarios.id"), nullable=False, index=True),
    Column("licenciando_id", ForeignKey("usuarios.id"), nullable=False, index=True),
    Column("estado", String(12), nullable=False),
    Column("criada_em", DateTime(timezone=True), nullable=False),
    CheckConstraint("estado IN ('pendente', 'aceita', 'recusada', 'cancelada')"),
    CheckConstraint("estudante_id <> licenciando_id"),
)
Index(
    "conexao_unica",
    solicitacoes.c.estudante_id,
    solicitacoes.c.licenciando_id,
    unique=True,
    postgresql_where=solicitacoes.c.estado.in_(["pendente", "aceita"]),
    sqlite_where=solicitacoes.c.estado.in_(["pendente", "aceita"]),
)
mapper.map_imperatively(
    SolicitacaoApoio,
    solicitacoes,
    properties={"_estado": solicitacoes.c.estado},
)

cursos = Table(
    "cursos",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=False),
    Column("titulo", Text, nullable=False),
    Column("carga_horaria_horas", Integer, nullable=False),
    Column("prazo_realizacao_dias", Integer, nullable=False),
    Column("url_oficial", Text, nullable=False),
    Column("tipo_oferta", String(80), nullable=False),
    CheckConstraint("carga_horaria_horas >= 0 AND prazo_realizacao_dias > 0"),
)
mapper.map_imperatively(CursoExterno, cursos)

vagas = Table(
    "vagas",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("titulo", String(300), nullable=False),
    Column("empresa", String(200), nullable=False),
    Column("cidade", String(120), nullable=False, index=True),
    Column("uf", String(2), nullable=False, index=True),
    Column("area_trabalho", String(120), nullable=False, index=True),
    Column("escolaridade_minima", String(40)),
    Column("url_candidatura", Text),
    Column("contato_candidatura", String(500)),
    Column("inscricoes_ate", Date),
    Column("ativa", Boolean, nullable=False),
    CheckConstraint("url_candidatura IS NOT NULL OR contato_candidatura IS NOT NULL"),
)
mapper.map_imperatively(OportunidadeTrabalho, vagas)

sessoes = Table(
    "sessoes",
    metadata,
    Column("token_hash", String(64), primary_key=True),
    Column("usuario_id", ForeignKey("usuarios.id"), nullable=False, index=True),
    Column("expira_em", DateTime(timezone=True), nullable=False),
)


@lru_cache
def engine():
    return create_engine(os.environ["DATABASE_URL"], pool_pre_ping=True)


def session():
    with Session(engine()) as db:
        yield db

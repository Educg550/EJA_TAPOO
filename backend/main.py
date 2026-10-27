import os
from datetime import date
from typing import Annotated, Literal

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import delete, or_, select
from sqlalchemy.exc import IntegrityError
lazy import httpx

from backend.database import sessoes
from backend.domain import (
    CursoExterno,
    Escolaridade,
    EstudanteEJA,
    Licenciando,
    OportunidadeTrabalho,
    SolicitacaoApoio,
    Usuario,
)
from backend.schemas import (
    UF,
    Cadastro,
    ContatosSaida,
    CursoSaida,
    LicenciandoSaida,
    LocalidadeSaida,
    Login,
    PedidoApoio,
    PerfilLicenciando,
    SolicitacaoSaida,
    TokenSaida,
    UFSaida,
    UsuarioSaida,
    VagaEntrada,
    VagaSaida,
)
from backend.security import (
    DB,
    Atual,
    Credenciais,
    dummy_hash,
    emitir_token,
    exigir,
    senhas,
    token_hash,
)

app = FastAPI(title="Plataforma EJA", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(
        ","
    ),
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
Limite = Annotated[int, Query(ge=1, le=100)]
Inicio = Annotated[int, Query(ge=0)]
Busca = Annotated[str | None, Query(min_length=1, max_length=120)]


@app.exception_handler(RequestValidationError)
async def entrada_invalida(request: Request, erro: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "detail": [
                {"loc": item["loc"], "msg": item["msg"], "type": item["type"]}
                for item in erro.errors()
            ],
        },
    )


@app.exception_handler(PermissionError)
async def permissao_negada(request: Request, erro: PermissionError):
    return JSONResponse(status_code=403, content={"detail": str(erro)})


@app.exception_handler(ValueError)
async def conflito_dominio(request: Request, erro: ValueError):
    return JSONResponse(status_code=409, content={"detail": str(erro)})


@app.exception_handler(IntegrityError)
async def conflito_banco(request: Request, erro: IntegrityError):
    return JSONResponse(
        status_code=409, content={"detail": "Registro duplicado ou relação inválida."}
    )


def obter(db, classe, id):
    objeto = db.get(classe, id)
    if objeto is None:
        raise HTTPException(404, "Registro não encontrado.")
    return objeto


@app.get("/")
def read_root():
    return {"nome": "Plataforma EJA"}


@app.post("/auth/cadastro", response_model=UsuarioSaida, status_code=201)
def cadastrar(dados: Cadastro, db: DB):
    atributos = dados.model_dump(exclude={"senha", "tipo", "disciplinas", "disponibilidade"})
    atributos["senha_hash"] = senhas.hash(dados.senha)
    if dados.tipo == "licenciando":
        usuario = Licenciando(
            **atributos,
            disciplinas=dados.disciplinas,
            disponibilidade=dados.disponibilidade,
        )
    else:
        usuario = EstudanteEJA(**atributos)
    db.add(usuario)
    db.commit()
    return usuario


@app.post("/auth/login", response_model=TokenSaida)
def login(dados: Login, db: DB):
    usuario = db.scalar(select(Usuario).where(Usuario.email == dados.email))
    valido = senhas.verify(dados.senha, usuario.senha_hash if usuario else dummy_hash)
    if not usuario or not valido:
        raise HTTPException(
            401, "E-mail ou senha inválidos.", headers={"WWW-Authenticate": "Bearer"}
        )
    return TokenSaida(access_token=emitir_token(db, usuario))


@app.delete("/auth/sessao", status_code=204)
def sair(db: DB, usuario: Atual, credenciais: Credenciais):
    db.execute(delete(sessoes).where(sessoes.c.token_hash == token_hash(credenciais.credentials)))
    db.commit()


@app.get("/usuarios/me", response_model=UsuarioSaida)
def meu_usuario(usuario: Atual):
    return usuario


@app.get("/licenciandos", response_model=list[LicenciandoSaida])
def listar_licenciandos(db: DB, usuario: Atual, limite: Limite = 20, inicio: Inicio = 0):
    exigir(usuario, "solicitar_apoio")
    return db.scalars(
        select(Licenciando).order_by(Licenciando.id).offset(inicio).limit(limite)
    ).all()


@app.put("/licenciandos/me", response_model=LicenciandoSaida)
def atualizar_perfil(dados: PerfilLicenciando, db: DB, usuario: Atual):
    exigir(usuario, "editar_perfil")
    usuario.disciplinas = dados.disciplinas
    usuario.disponibilidade = dados.disponibilidade
    db.commit()
    return usuario


@app.post("/solicitacoes", response_model=SolicitacaoSaida, status_code=201)
def solicitar(dados: PedidoApoio, db: DB, usuario: Atual):
    exigir(usuario, "solicitar_apoio")
    obter(db, Licenciando, dados.licenciando_id)
    solicitacao = SolicitacaoApoio(estudante_id=usuario.id, licenciando_id=dados.licenciando_id)
    db.add(solicitacao)
    db.commit()
    return solicitacao


@app.get("/solicitacoes", response_model=list[SolicitacaoSaida])
def listar_solicitacoes(db: DB, usuario: Atual, limite: Limite = 20, inicio: Inicio = 0):
    exigir(usuario, "consultar_apoio")
    return db.scalars(
        select(SolicitacaoApoio)
        .where(
            or_(
                SolicitacaoApoio.estudante_id == usuario.id,
                SolicitacaoApoio.licenciando_id == usuario.id,
            )
        )
        .order_by(SolicitacaoApoio.id)
        .offset(inicio)
        .limit(limite)
    ).all()


@app.post("/solicitacoes/{id}/{acao}", response_model=SolicitacaoSaida)
def responder(id: int, acao: Literal["aceitar", "recusar", "cancelar"], db: DB, usuario: Atual):
    exigir(usuario, "cancelar_apoio" if acao == "cancelar" else "responder_apoio")
    solicitacao = db.scalar(
        select(SolicitacaoApoio)
        .where(
            SolicitacaoApoio.id == id,
        )
        .with_for_update()
    )
    if solicitacao is None:
        raise HTTPException(404, "Solicitação não encontrada.")
    getattr(solicitacao, acao)(usuario.id)
    db.commit()
    return solicitacao


@app.get("/solicitacoes/{id}/contatos", response_model=ContatosSaida)
def contatos(id: int, db: DB, usuario: Atual):
    solicitacao = obter(db, SolicitacaoApoio, id)
    solicitacao.autorizar_contatos(usuario.id)
    return ContatosSaida(
        estudante_email=obter(db, Usuario, solicitacao.estudante_id).email,
        licenciando_email=obter(db, Usuario, solicitacao.licenciando_id).email,
    )


@app.get("/cursos", response_model=list[CursoSaida])
def listar_cursos(db: DB, busca: Busca = None, limite: Limite = 20, inicio: Inicio = 0):
    consulta = select(CursoExterno).where(
        CursoExterno.tipo_oferta == "Curso Aberto",
        CursoExterno.carga_horaria_horas > 0,
    )
    if busca:
        consulta = consulta.where(CursoExterno.titulo.icontains(busca, autoescape=True))
    return db.scalars(consulta.order_by(CursoExterno.id).offset(inicio).limit(limite)).all()


@app.get("/vagas", response_model=list[VagaSaida])
def listar_vagas(
    db: DB,
    cidade: Busca = None,
    uf: UF | None = None,
    area_trabalho: Busca = None,
    escolaridade: Escolaridade | None = None,
    escolaridade_desconhecida: bool = False,
    limite: Limite = 20,
    inicio: Inicio = 0,
):
    if escolaridade and escolaridade_desconhecida:
        raise HTTPException(422, "Escolha uma escolaridade ou apenas as vagas sem informação.")
    consulta = select(OportunidadeTrabalho).where(
        OportunidadeTrabalho.ativa.is_(True),
        or_(
            OportunidadeTrabalho.inscricoes_ate.is_(None),
            OportunidadeTrabalho.inscricoes_ate >= date.today(),
        ),
    )
    for coluna, valor in (
        (OportunidadeTrabalho.cidade, cidade),
        (OportunidadeTrabalho.uf, uf),
        (OportunidadeTrabalho.area_trabalho, area_trabalho),
        (OportunidadeTrabalho.escolaridade_minima, escolaridade),
    ):
        if valor:
            consulta = consulta.where(coluna == valor)
    if escolaridade_desconhecida:
        consulta = consulta.where(OportunidadeTrabalho.escolaridade_minima.is_(None))
    return db.scalars(consulta.order_by(OportunidadeTrabalho.id).offset(inicio).limit(limite)).all()


@app.post("/vagas", response_model=VagaSaida, status_code=201)
def criar_vaga(dados: VagaEntrada, db: DB, usuario: Atual):
    exigir(usuario, "gerir_vagas")
    vaga = OportunidadeTrabalho(
        **dados.model_dump(mode="json", exclude={"inscricoes_ate"}),
        inscricoes_ate=dados.inscricoes_ate,
    )
    db.add(vaga)
    db.commit()
    return vaga


@app.put("/vagas/{id}", response_model=VagaSaida)
def atualizar_vaga(id: int, dados: VagaEntrada, db: DB, usuario: Atual):
    exigir(usuario, "gerir_vagas")
    vaga = obter(db, OportunidadeTrabalho, id)
    for chave, valor in dados.model_dump(mode="json", exclude={"inscricoes_ate"}).items():
        setattr(vaga, chave, valor)
    vaga.inscricoes_ate = dados.inscricoes_ate
    db.commit()
    return vaga


@app.delete("/vagas/{id}", status_code=204)
def encerrar_vaga(id: int, db: DB, usuario: Atual):
    exigir(usuario, "gerir_vagas")
    obter(db, OportunidadeTrabalho, id).encerrar()
    db.commit()


@app.get("/admin/vagas", response_model=list[VagaSaida])
def listar_vagas_admin(db: DB, usuario: Atual, limite: Limite = 20, inicio: Inicio = 0):
    exigir(usuario, "gerir_vagas")
    return db.scalars(
        select(OportunidadeTrabalho).order_by(OportunidadeTrabalho.id).offset(inicio).limit(limite)
    ).all()


def localidades(caminho: str, modelo):
    try:
        resposta = httpx.get(
            f"https://servicodados.ibge.gov.br/api/v1/localidades/{caminho}",
            timeout=5,
        )
        resposta.raise_for_status()
        dados = resposta.json()
        if not isinstance(dados, list):
            raise TypeError
        return [modelo.model_validate(item) for item in dados]
    except httpx.HTTPError, ValueError, KeyError, TypeError:
        raise HTTPException(502, "O serviço de localidades está indisponível.") from None


@app.get("/localidades/ufs", response_model=list[UFSaida])
def listar_ufs():
    return localidades("estados?orderBy=nome", UFSaida)


@app.get("/localidades/ufs/{uf}/municipios", response_model=list[LocalidadeSaida])
def listar_municipios(uf: UF):
    return localidades(f"estados/{uf}/municipios?orderBy=nome", LocalidadeSaida)

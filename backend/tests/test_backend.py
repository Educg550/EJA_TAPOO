import json
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from threading import Barrier

import httpx
import pytest
from backend import cli, database
from backend.cli import criar_admin, importar
from backend.database import sessoes
from backend.domain import (
    Administrador,
    CursoExterno,
    EstudanteEJA,
    Licenciando,
    OportunidadeTrabalho,
    SolicitacaoApoio,
    Usuario,
)
from backend.main import app
from backend.security import emitir_token, token_hash
from fastapi.testclient import TestClient
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

SENHA = "senha-de-teste-1234"


def test_cli_imports_adiados():
    subprocess.run(
        [
            sys.executable,
            "-c",
            "import sys; import backend.cli; assert 'backend.schemas' not in sys.modules; assert 'backend.security' not in sys.modules",
        ],
        cwd=Path(__file__).parents[2],
        check=True,
        capture_output=True,
    )


def conta(client, nome, tipo="estudante"):
    dados = {"nome_exibicao": nome, "email": f"{nome}@example.com", "senha": SENHA, "tipo": tipo}
    if tipo == "licenciando":
        dados.update(disciplinas=["Matemática"], disponibilidade="Sábados")
    resposta = client.post("/auth/cadastro", json=dados)
    assert resposta.status_code == 201, resposta.text
    login = client.post("/auth/login", json={"email": dados["email"], "senha": SENHA})
    assert login.status_code == 200, login.text
    return resposta.json(), {"Authorization": f"Bearer {login.json()['access_token']}"}


def vaga(**atributos):
    return {
        "titulo": "Auxiliar",
        "empresa": "Empresa",
        "cidade": "São Paulo",
        "uf": "SP",
        "area_trabalho": "Serviços",
        "url_candidatura": "https://example.com/vaga",
        **atributos,
    }


def admin(db):
    usuario = criar_admin(db, "Administrador", "admin@example.com", SENHA)
    db.commit()
    return {"Authorization": f"Bearer {emitir_token(db, usuario)}"}


def test_abstracao_polimorfismo_e_encapsulamento():
    with pytest.raises(TypeError):
        Usuario(nome_exibicao="A", email="a@example.com", senha_hash="hash")
    atributos = {"nome_exibicao": "A", "email": "a@example.com", "senha_hash": "hash"}
    usuarios = [
        EstudanteEJA(**atributos),
        Licenciando(**atributos, disciplinas=["Português"], disponibilidade="Noite"),
        Administrador(**atributos),
    ]
    assert [u.permissoes() for u in usuarios] == [
        {"solicitar_apoio", "cancelar_apoio", "consultar_apoio"},
        {"responder_apoio", "consultar_apoio", "editar_perfil"},
        {"gerir_vagas"},
    ]
    pedido = SolicitacaoApoio(estudante_id=1, licenciando_id=2)
    with pytest.raises(AttributeError):
        pedido.estado = "aceita"


@pytest.mark.parametrize(
    "acao,ator,estado",
    [("aceitar", 2, "aceita"), ("recusar", 2, "recusada"), ("cancelar", 1, "cancelada")],
)
def test_estados_finais_e_atores(acao, ator, estado):
    pedido = SolicitacaoApoio(estudante_id=1, licenciando_id=2)
    with pytest.raises(PermissionError):
        getattr(pedido, acao)(3)
    with pytest.raises(ValueError):
        pedido.autorizar_contatos(1)
    getattr(pedido, acao)(ator)
    assert pedido.estado == estado
    for metodo, responsavel in ((pedido.aceitar, 2), (pedido.recusar, 2), (pedido.cancelar, 1)):
        with pytest.raises(ValueError):
            metodo(responsavel)
    with pytest.raises(PermissionError):
        pedido.autorizar_contatos(3)


def test_cadastro_autenticacao_e_logout(client, db):
    usuario, headers = conta(client, "ana")
    assert set(usuario) == {"id", "nome_exibicao", "email", "tipo"}
    persistido = db.get(Usuario, usuario["id"])
    assert isinstance(persistido, EstudanteEJA)
    assert persistido.senha_hash.startswith("$argon2")
    assert SENHA not in persistido.senha_hash
    assert client.get("/usuarios/me", headers=headers).json() == usuario
    for email in ("ana@example.com", "ausente@example.com"):
        resposta = client.post("/auth/login", json={"email": email, "senha": "senha-incorreta"})
        assert resposta.status_code == 401
    for headers_invalidos in (
        {},
        {"Authorization": "Bearer invalido"},
        {"Authorization": "Basic abc"},
    ):
        assert client.get("/usuarios/me", headers=headers_invalidos).status_code == 401
    assert client.delete("/auth/sessao", headers=headers).status_code == 204
    assert client.get("/usuarios/me", headers=headers).status_code == 401


def test_email_unico_normalizado_e_sessao_expirada(client, db):
    _, headers = conta(client, "ana")
    resposta = client.post(
        "/auth/cadastro",
        json={
            "nome_exibicao": "Outra",
            "email": "ANA@example.com",
            "senha": SENHA,
            "tipo": "estudante",
        },
    )
    assert resposta.status_code == 409
    db.rollback()
    token = headers["Authorization"].split()[1]
    db.execute(
        update(sessoes)
        .where(sessoes.c.token_hash == token_hash(token))
        .values(expira_em=datetime.now(UTC) - timedelta(seconds=1))
    )
    db.commit()
    assert client.get("/usuarios/me", headers=headers).status_code == 401


@pytest.mark.parametrize(
    "alteracao",
    [
        {"tipo": "administrador"},
        {"tipo": "licenciando"},
        {"senha": "curta"},
        {"nome_exibicao": "  "},
        {"email": "invalido"},
        {"foto": "qualquer"},
        {"disciplinas": ["Matemática"]},
        {"disponibilidade": "Noite"},
    ],
)
def test_cadastro_invalido(client, alteracao):
    dados = {
        "nome_exibicao": "Ana",
        "email": "ana@example.com",
        "senha": SENHA,
        "tipo": "estudante",
        **alteracao,
    }
    resposta = client.post("/auth/cadastro", json=dados)
    assert resposta.status_code == 422
    assert all("input" not in erro for erro in resposta.json()["detail"])
    assert SENHA not in resposta.text


def test_fluxo_apoio_privacidade_e_permissoes(client, db):
    estudante, aluno = conta(client, "ana")
    licenciando, tutor = conta(client, "bia", "licenciando")
    _, terceiro = conta(client, "caio")
    _, outro_tutor = conta(client, "davi", "licenciando")
    assert client.get("/licenciandos").status_code == 401
    perfis = client.get("/licenciandos", headers=aluno).json()
    assert set(perfis[0]) == {"id", "nome_exibicao", "disciplinas", "disponibilidade"}
    assert (
        client.put(
            "/licenciandos/me",
            headers=tutor,
            json={"disciplinas": ["Português"], "disponibilidade": "Noite"},
        ).status_code
        == 200
    )
    assert (
        client.put(
            "/licenciandos/me",
            headers=aluno,
            json={"disciplinas": ["Português"], "disponibilidade": "Noite"},
        ).status_code
        == 403
    )
    resposta = client.post(
        "/solicitacoes", headers=aluno, json={"licenciando_id": licenciando["id"]}
    )
    assert resposta.status_code == 201, resposta.text
    pedido = resposta.json()
    assert pedido["estado"] == "pendente"
    assert pedido["estudante_nome"] == estudante["nome_exibicao"]
    assert pedido["licenciando_nome"] == licenciando["nome_exibicao"]
    assert set(pedido) == {
        "id",
        "estudante_id",
        "licenciando_id",
        "estudante_nome",
        "licenciando_nome",
        "estado",
        "criada_em",
    }
    id = pedido["id"]
    assert client.get(f"/solicitacoes/{id}/contatos", headers=aluno).status_code == 409
    assert client.get(f"/solicitacoes/{id}/contatos", headers=terceiro).status_code == 403
    assert client.get("/solicitacoes", headers=terceiro).json() == []
    assert client.get("/solicitacoes", headers=tutor).json() == [pedido]
    assert client.get("/solicitacoes", headers=aluno).json() == [pedido]
    assert client.post(f"/solicitacoes/{id}/aceitar", headers=aluno).status_code == 403
    assert client.post(f"/solicitacoes/{id}/aceitar", headers=outro_tutor).status_code == 403
    assert client.post(f"/solicitacoes/{id}/cancelar", headers=terceiro).status_code == 403
    assert client.post(f"/solicitacoes/{id}/aceitar", headers=tutor).json()["estado"] == "aceita"
    assert client.get("/solicitacoes", headers=tutor).json()[0]["estudante_nome"] == "ana"
    for participante in (aluno, tutor):
        assert client.get(f"/solicitacoes/{id}/contatos", headers=participante).json() == {
            "estudante_email": estudante["email"],
            "licenciando_email": licenciando["email"],
        }
    assert client.get(f"/solicitacoes/{id}/contatos", headers=terceiro).status_code == 403
    assert client.get(f"/solicitacoes/{id}/contatos", headers=admin(db)).status_code == 403
    assert client.post(f"/solicitacoes/{id}/recusar", headers=tutor).status_code == 409
    assert client.post(f"/solicitacoes/{id}/cancelar", headers=aluno).status_code == 409
    assert (
        client.post(
            "/solicitacoes", headers=aluno, json={"licenciando_id": licenciando["id"]}
        ).status_code
        == 409
    )
    db.rollback()


@pytest.mark.parametrize("acao", ["recusar", "cancelar"])
def test_novo_pedido_apos_recusa_ou_cancelamento(client, db, acao):
    estudante, aluno = conta(client, "ana")
    licenciando, tutor = conta(client, "bia", "licenciando")
    dados = {"licenciando_id": licenciando["id"]}
    id = client.post("/solicitacoes", headers=aluno, json=dados).json()["id"]
    assert client.post("/solicitacoes", headers=aluno, json=dados).status_code == 409
    db.rollback()
    assert (
        client.post(
            f"/solicitacoes/{id}/{acao}", headers=tutor if acao == "recusar" else aluno
        ).status_code
        == 200
    )
    assert client.post("/solicitacoes", headers=aluno, json=dados).status_code == 201
    assert (
        client.post(
            "/solicitacoes", headers=aluno, json={"licenciando_id": estudante["id"]}
        ).status_code
        == 404
    )
    assert client.post("/solicitacoes", headers=tutor, json=dados).status_code == 403
    assert client.post("/solicitacoes/9999/aceitar", headers=tutor).status_code == 404
    assert client.get("/solicitacoes/9999/contatos", headers=aluno).status_code == 404


def test_vagas_publicas_filtros_e_gestao(client, db):
    gestor = admin(db)
    _, aluno = conta(client, "ana")
    assert client.post("/vagas", json=vaga()).status_code == 401
    assert client.post("/vagas", headers=aluno, json=vaga()).status_code == 403
    id = client.post("/vagas", headers=gestor, json=vaga()).json()["id"]
    for dados in (
        vaga(escolaridade_minima="sem_exigencia"),
        vaga(inscricoes_ate=(date.today() - timedelta(days=1)).isoformat()),
        vaga(ativa=False),
        vaga(cidade="Campinas", uf="SP", escolaridade_minima="medio_completo"),
    ):
        assert client.post("/vagas", headers=gestor, json=dados).status_code == 201
    assert len(client.get("/vagas").json()) == 3
    assert len(client.get("/vagas?cidade=São Paulo&uf=SP&area_trabalho=Serviços").json()) == 2
    desconhecidas = client.get("/vagas?escolaridade_desconhecida=true").json()
    assert [v["id"] for v in desconhecidas] == [id]
    assert len(client.get("/vagas?escolaridade=sem_exigencia").json()) == 1
    assert (
        client.get("/vagas?escolaridade=sem_exigencia&escolaridade_desconhecida=true").status_code
        == 422
    )
    assert len(client.get("/admin/vagas", headers=gestor).json()) == 5
    assert client.get("/admin/vagas", headers=aluno).status_code == 403
    assert (
        client.put(f"/vagas/{id}", headers=gestor, json=vaga(titulo="Atualizada")).json()["titulo"]
        == "Atualizada"
    )
    assert client.delete(f"/vagas/{id}", headers=gestor).status_code == 204
    assert id not in [v["id"] for v in client.get("/vagas").json()]
    assert db.get(OportunidadeTrabalho, id).ativa is False
    assert client.post("/vagas", headers=gestor, json=vaga(url_candidatura=None)).status_code == 422
    assert (
        client.post(
            "/vagas", headers=gestor, json=vaga(url_candidatura="javascript:alert(1)")
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/vagas",
            headers=gestor,
            json=vaga(url_candidatura=None, contato_candidatura="rh@example.com"),
        ).status_code
        == 201
    )


def test_importacao_idempotente_e_catalogos(client, db):
    assert importar(db) == {"cursos": 1029, "vagas": 138}
    db.commit()
    primeira = db.scalar(select(OportunidadeTrabalho).order_by(OportunidadeTrabalho.id))
    primeira.encerrar()
    db.commit()
    assert importar(db) == {"cursos": 0, "vagas": 0}
    db.commit()
    assert db.scalar(select(func.count()).select_from(CursoExterno)) == 1029
    assert db.scalar(select(func.count()).select_from(OportunidadeTrabalho)) == 138
    assert primeira.ativa is False
    assert (
        db.scalar(
            select(func.count())
            .select_from(OportunidadeTrabalho)
            .where(OportunidadeTrabalho.escolaridade_minima.is_not(None))
        )
        == 0
    )
    cursos = client.get("/cursos?limite=100").json()
    assert all(c["tipo_oferta"] == "Curso Aberto" and c["carga_horaria_horas"] > 0 for c in cursos)
    assert client.get("/cursos?busca=%25").json() == []
    for id in (1583, 1590):
        curso = db.get(CursoExterno, id)
        assert curso is not None
        assert id not in [
            c["id"] for c in client.get("/cursos", params={"busca": curso.titulo}).json()
        ]
    assert client.get("/cursos?limite=101").status_code == 422
    assert client.get("/vagas?inicio=-1").status_code == 422


def test_admin_nao_sobrescreve_conta(db):
    criar_admin(db, "Admin", "admin@example.com", SENHA)
    db.commit()
    with pytest.raises(ValueError):
        criar_admin(db, "Outro", "ADMIN@example.com", SENHA)


def test_localidades_e_falhas_do_provedor(client, monkeypatch):
    def get(url, **kwargs):
        return httpx.Response(
            200,
            request=httpx.Request("GET", url),
            json=[{"id": 35, "nome": "São Paulo", "sigla": "SP", "regiao": {}}],
        )

    monkeypatch.setattr("backend.main.httpx.get", get)
    assert client.get("/localidades/ufs").json() == [{"id": 35, "nome": "São Paulo", "sigla": "SP"}]
    assert client.get("/localidades/ufs/SP/municipios").status_code == 200
    assert client.get("/localidades/ufs/XX/municipios").status_code == 422

    def timeout(*args, **kwargs):
        raise httpx.ReadTimeout("timeout")

    monkeypatch.setattr("backend.main.httpx.get", timeout)
    assert client.get("/localidades/ufs").status_code == 502
    monkeypatch.setattr(
        "backend.main.httpx.get",
        lambda *args, **kwargs: httpx.Response(200, request=httpx.Request("GET", args[0]), json={}),
    )
    assert client.get("/localidades/ufs").status_code == 502


def test_openapi_e_cors(client):
    assert client.get("/").status_code == 200
    contrato = Path(__file__).parents[2] / "docs" / "openapi.json"
    assert json.loads(contrato.read_text(encoding="utf-8")) == app.openapi()
    assert "/solicitacoes/{id}/contatos" in app.openapi()["paths"]
    resposta = client.options(
        "/vagas",
        headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST"},
    )
    assert resposta.headers["access-control-allow-origin"] == "http://localhost:3000"
    resposta = client.options(
        "/vagas",
        headers={"Origin": "https://intruso.example", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in resposta.headers


def test_concorrencia_de_transicoes_no_postgresql(client, db):
    if db.bind.dialect.name != "postgresql":
        pytest.skip("Bloqueios de linha exigem PostgreSQL.")
    _, aluno = conta(client, "ana")
    licenciando, _ = conta(client, "bia", "licenciando")
    id = client.post(
        "/solicitacoes", headers=aluno, json={"licenciando_id": licenciando["id"]}
    ).json()["id"]
    barreira = Barrier(2)

    def transicionar(acao):
        with Session(db.bind) as conexao, conexao.begin():
            barreira.wait(timeout=5)
            pedido = conexao.scalar(
                select(SolicitacaoApoio).where(SolicitacaoApoio.id == id).with_for_update()
            )
            try:
                getattr(pedido, acao)(
                    pedido.licenciando_id if acao == "aceitar" else pedido.estudante_id
                )
                conexao.flush()
                return "alterada"
            except ValueError:
                return "bloqueada"

    with ThreadPoolExecutor(max_workers=2) as executor:
        resultados = list(executor.map(transicionar, ["aceitar", "cancelar"]))
    assert sorted(resultados) == ["alterada", "bloqueada"]
    db.expire_all()
    assert db.get(SolicitacaoApoio, id).estado in {"aceita", "cancelada"}


def test_concorrencia_de_pedidos_duplicados(client, db):
    if db.bind.dialect.name != "postgresql":
        pytest.skip("Concorrência de conexões exige PostgreSQL.")
    estudante, _ = conta(client, "ana")
    licenciando, _ = conta(client, "bia", "licenciando")
    barreira = Barrier(2)

    def solicitar(_):
        try:
            with Session(db.bind) as conexao, conexao.begin():
                barreira.wait(timeout=5)
                conexao.add(
                    SolicitacaoApoio(estudante_id=estudante["id"], licenciando_id=licenciando["id"])
                )
                conexao.flush()
            return "criada"
        except IntegrityError:
            return "duplicada"

    with ThreadPoolExecutor(max_workers=2) as executor:
        assert sorted(executor.map(solicitar, range(2))) == ["criada", "duplicada"]


def test_perfil_completo_do_licenciando(client, db):
    usuario, headers = conta(client, "bia", "licenciando")
    perfil = client.get("/usuarios/me", headers=headers).json()
    assert perfil == {**usuario, "disciplinas": ["Matemática"], "disponibilidade": "Sábados"}
    novos_dados = {"disciplinas": ["Português", "História"], "disponibilidade": "Noite"}
    resposta = client.put("/licenciandos/me", headers=headers, json=novos_dados)
    assert resposta.json() == {"id": usuario["id"], "nome_exibicao": "bia", **novos_dados}
    db.expire_all()
    assert client.get("/usuarios/me", headers=headers).json() == {**usuario, **novos_dados}
    assert set(client.get("/usuarios/me", headers=admin(db)).json()) == {
        "id",
        "nome_exibicao",
        "email",
        "tipo",
    }
    for disciplinas, disponibilidade in (([], "Noite"), ([" "], "Noite"), (["Português"], " ")):
        assert (
            client.put(
                "/licenciandos/me",
                headers=headers,
                json={
                    "disciplinas": disciplinas,
                    "disponibilidade": disponibilidade,
                },
            ).status_code
            == 422
        )
    assert client.get("/usuarios/me", headers=headers).json() == {**usuario, **novos_dados}


@pytest.mark.parametrize("metodo", ["PUT", "DELETE"])
@pytest.mark.parametrize("papel", [None, "estudante", "licenciando"])
def test_gestao_de_vagas_sem_permissao_nao_altera_dados(client, db, metodo, papel):
    gestor = admin(db)
    original = client.post("/vagas", headers=gestor, json=vaga()).json()
    headers = conta(client, "intruso", papel)[1] if papel else {}
    argumentos = {"json": vaga(titulo="Alteração indevida")} if metodo == "PUT" else {}
    resposta = client.request(metodo, f"/vagas/{original['id']}", headers=headers, **argumentos)
    assert resposta.status_code == (403 if papel else 401)
    assert client.get("/admin/vagas", headers=gestor).json() == [original]


@pytest.mark.parametrize("metodo", ["PUT", "DELETE"])
def test_gestao_de_vaga_inexistente(client, db, metodo):
    argumentos = {"json": vaga()} if metodo == "PUT" else {}
    assert client.request(metodo, "/vagas/9999", headers=admin(db), **argumentos).status_code == 404


@pytest.mark.parametrize(
    "metodo,caminho,corpo",
    [
        ("GET", "/usuarios/me", None),
        ("GET", "/licenciandos", None),
        ("PUT", "/licenciandos/me", {"disciplinas": ["Português"], "disponibilidade": "Noite"}),
        ("POST", "/solicitacoes", {"licenciando_id": 1}),
        ("GET", "/solicitacoes", None),
        ("POST", "/solicitacoes/1/aceitar", None),
        ("POST", "/solicitacoes/1/recusar", None),
        ("POST", "/solicitacoes/1/cancelar", None),
        ("GET", "/solicitacoes/1/contatos", None),
        ("POST", "/vagas", vaga()),
        ("PUT", "/vagas/1", vaga()),
        ("DELETE", "/vagas/1", None),
        ("GET", "/admin/vagas", None),
        ("DELETE", "/auth/sessao", None),
    ],
)
def test_todas_as_operacoes_privadas_exigem_autenticacao(client, metodo, caminho, corpo):
    resposta = client.request(metodo, caminho, **({"json": corpo} if corpo else {}))
    assert resposta.status_code == 401
    assert resposta.headers["www-authenticate"] == "Bearer"


def test_paginacao_das_listagens(client, db):
    _, aluno = conta(client, "ana")
    gestor = admin(db)
    for indice in range(3):
        licenciando, _ = conta(client, f"tutor{indice}", "licenciando")
        assert (
            client.post(
                "/solicitacoes",
                headers=aluno,
                json={
                    "licenciando_id": licenciando["id"],
                },
            ).status_code
            == 201
        )
        db.add(
            CursoExterno(
                id=indice + 1,
                titulo=f"Curso {indice}",
                carga_horaria_horas=20,
                prazo_realizacao_dias=30,
                url_oficial=f"https://example.com/curso/{indice}",
                tipo_oferta="Curso Aberto",
            )
        )
        db.add(OportunidadeTrabalho(**vaga(titulo=f"Vaga {indice}")))
        db.commit()
    for caminho, headers in (
        ("/cursos", {}),
        ("/vagas", {}),
        ("/licenciandos", aluno),
        ("/solicitacoes", aluno),
        ("/admin/vagas", gestor),
    ):
        todos = client.get(caminho, headers=headers).json()
        assert len(todos) == 3
        primeira = client.get(caminho, headers=headers, params={"limite": 2}).json()
        segunda = client.get(caminho, headers=headers, params={"limite": 2, "inicio": 2}).json()
        assert len(primeira) == 2
        assert primeira + segunda == todos
        assert client.get(caminho, headers=headers, params={"inicio": 99}).json() == []
        for parametros in ({"limite": 0}, {"limite": 101}, {"inicio": -1}):
            assert client.get(caminho, headers=headers, params=parametros).status_code == 422


def test_busca_de_cursos_e_caracteres_literais(client, db):
    for id, titulo in enumerate(["Matemática básica", "Prática 100%", "Curso_A", "CursoXA"], 1):
        db.add(
            CursoExterno(
                id=id,
                titulo=titulo,
                carga_horaria_horas=10,
                prazo_realizacao_dias=30,
                url_oficial=f"https://example.com/{id}",
                tipo_oferta="Curso Aberto",
            )
        )
    db.commit()
    for busca, esperados in (("MATEM", [1]), ("%", [2]), ("_", [3]), ("ausente", [])):
        assert [
            curso["id"] for curso in client.get("/cursos", params={"busca": busca}).json()
        ] == esperados


def test_filtros_individuais_e_prazo_de_hoje(client, db):
    gestor = admin(db)
    dados = [
        vaga(inscricoes_ate=date.today().isoformat()),
        vaga(cidade="Campinas", area_trabalho="Comércio", escolaridade_minima="sem_exigencia"),
        vaga(cidade="Rio de Janeiro", uf="RJ", escolaridade_minima="medio_completo"),
    ]
    ids = [client.post("/vagas", headers=gestor, json=item).json()["id"] for item in dados]
    for filtros, indices in (
        ({"cidade": "Campinas"}, [1]),
        ({"uf": "RJ"}, [2]),
        ({"area_trabalho": "Serviços"}, [0, 2]),
        ({"escolaridade": "medio_completo"}, [2]),
        ({"escolaridade_desconhecida": True}, [0]),
        (
            {
                "cidade": "Campinas",
                "uf": "SP",
                "area_trabalho": "Comércio",
                "escolaridade": "sem_exigencia",
            },
            [1],
        ),
        ({"cidade": "Ausente"}, []),
    ):
        assert [v["id"] for v in client.get("/vagas", params=filtros).json()] == [
            ids[i] for i in indices
        ]
    assert (
        client.put(f"/vagas/{ids[0]}", headers=gestor, json=vaga(url_candidatura=None)).status_code
        == 422
    )
    assert (
        client.get("/admin/vagas", headers=gestor).json()[0]["inscricoes_ate"]
        == date.today().isoformat()
    )


def test_municipios_valida_corpo_e_uf_enviada(client, monkeypatch):
    urls = []

    def get(url, **kwargs):
        urls.append(url)
        assert kwargs["timeout"] == 5
        return httpx.Response(
            200,
            request=httpx.Request("GET", url),
            json=[
                {"id": 3550308, "nome": "São Paulo", "microrregiao": {}},
                {"id": 3509502, "nome": "Campinas"},
            ],
        )

    monkeypatch.setattr("backend.main.httpx.get", get)
    assert client.get("/localidades/ufs/SP/municipios").json() == [
        {"id": 3550308, "nome": "São Paulo"},
        {"id": 3509502, "nome": "Campinas"},
    ]
    assert urls == [
        "https://servicodados.ibge.gov.br/api/v1/localidades/estados/SP/municipios?orderBy=nome"
    ]
    assert client.get("/localidades/ufs/XX/municipios").status_code == 422
    assert len(urls) == 1


@pytest.mark.parametrize("caminho", ["/localidades/ufs", "/localidades/ufs/SP/municipios"])
@pytest.mark.parametrize(
    "status,conteudo",
    [
        (503, "indisponível"),
        (200, "{"),
        (200, '[{"nome":"São Paulo"}]'),
        (200, '[{"id":0,"nome":"São Paulo","sigla":"SP"}]'),
        (200, '[{"id":35,"nome":null,"sigla":"SP"}]'),
    ],
)
def test_respostas_invalidas_do_ibge(client, monkeypatch, caminho, status, conteudo):
    monkeypatch.setattr(
        "backend.main.httpx.get",
        lambda url, **kwargs: httpx.Response(
            status,
            request=httpx.Request("GET", url),
            text=conteudo,
        ),
    )
    resposta = client.get(caminho)
    assert resposta.status_code == 502
    assert resposta.json() == {"detail": "O serviço de localidades está indisponível."}


def test_cli_inicializacao_importacao_e_administrador(db, monkeypatch, capsys):
    monkeypatch.setattr(cli, "engine", lambda: db.bind)
    for comando in ("init-db", "importar"):
        monkeypatch.setattr(sys, "argv", ["backend.cli", comando])
        cli.main()
    assert json.loads(capsys.readouterr().out) == {"cursos": 1029, "vagas": 138}
    senhas = iter([SENHA, SENHA])
    monkeypatch.setattr(cli, "getpass", lambda prompt: next(senhas))
    monkeypatch.setattr(
        sys,
        "argv",
        ["backend.cli", "criar-admin", "--nome", "Admin", "--email", "admin@example.com"],
    )
    cli.main()
    usuario = db.scalar(select(Usuario).where(Usuario.email == "admin@example.com"))
    assert isinstance(usuario, Administrador)
    assert usuario.senha_hash.startswith("$argon2")
    db.commit()
    monkeypatch.setattr(sys, "argv", ["backend.cli", "init-db"])
    cli.main()
    assert db.get(Usuario, usuario.id) is not None
    assert db.scalar(select(func.count()).select_from(CursoExterno)) == 1029


def test_cli_senhas_diferentes_nao_criam_admin(db, monkeypatch, capsys):
    monkeypatch.setattr(cli, "engine", lambda: db.bind)
    senhas = iter([SENHA, "outra-senha"])
    monkeypatch.setattr(cli, "getpass", lambda prompt: next(senhas))
    monkeypatch.setattr(
        sys,
        "argv",
        ["backend.cli", "criar-admin", "--nome", "Admin", "--email", "admin@example.com"],
    )
    with pytest.raises(SystemExit) as erro:
        cli.main()
    assert erro.value.code == 2
    assert "As senhas não conferem" in capsys.readouterr().err
    assert db.scalar(select(func.count()).select_from(Usuario)) == 0


def test_importacao_invalida_desfaz_transacao(db, tmp_path):
    (tmp_path / "catalogo_evg.csv").write_text(
        "id_curso|nome_curso|carga_horaria|disponibilidade_dias|tipo_oferta\n"
        "1|Válido|10|30|Curso Aberto\n0|Inválido|10|30|Curso Aberto\n",
        encoding="utf-8",
    )
    with (
        pytest.raises(ValueError, match="Curso inválido"),
        Session(db.bind) as transacao,
        transacao.begin(),
    ):
        importar(transacao, tmp_path)
    assert db.scalar(select(func.count()).select_from(CursoExterno)) == 0


def test_sessoes_reais_isolam_erros_e_persistem_contas(monkeypatch, tmp_path):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'requisicoes.db'}")
    database.engine.cache_clear()
    banco = database.engine()
    assert database.engine() is banco
    database.metadata.create_all(banco)
    try:
        with TestClient(app, raise_server_exceptions=False) as api:
            usuario, headers = conta(api, "ana")
            assert (
                api.post(
                    "/auth/cadastro",
                    json={
                        "nome_exibicao": "Outra",
                        "email": "ana@example.com",
                        "senha": SENHA,
                        "tipo": "estudante",
                    },
                ).status_code
                == 409
            )
            conta(api, "bia")
            assert api.get("/usuarios/me", headers=headers).json() == usuario
        with Session(banco) as conexao:
            assert conexao.scalar(select(func.count()).select_from(Usuario)) == 2
    finally:
        banco.dispose()
        database.engine.cache_clear()

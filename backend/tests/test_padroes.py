import json

import pytest
from backend.cli import importar
from backend.domain import CursoExterno, EstudanteEJA, Licenciando, SolicitacaoApoio
from sqlalchemy import func, select
from sqlalchemy.orm import Session


@pytest.mark.parametrize("acao", ["aceitar", "recusar", "cancelar"])
def test_state_reconstituido_do_banco(db, acao):
    estudante = EstudanteEJA(nome_exibicao="A", email="a@example.com", senha_hash="hash")
    licenciando = Licenciando(
        nome_exibicao="B",
        email="b@example.com",
        senha_hash="hash",
        disciplinas=["Português"],
        disponibilidade="Noite",
    )
    db.add_all([estudante, licenciando])
    db.flush()
    pedido = SolicitacaoApoio(estudante_id=estudante.id, licenciando_id=licenciando.id)
    ator = estudante.id if acao == "cancelar" else licenciando.id
    participantes = (estudante.id, licenciando.id)
    intruso = max(participantes) + 1
    getattr(pedido, acao)(ator)
    db.add(pedido)
    db.commit()
    id = pedido.id
    db.expunge_all()
    reconstituido = db.get(SolicitacaoApoio, id)
    for participante in participantes:
        if acao == "aceitar":
            reconstituido.autorizar_contatos(participante)
        else:
            with pytest.raises(ValueError):
                reconstituido.autorizar_contatos(participante)
    with pytest.raises(PermissionError):
        reconstituido.aceitar(intruso)
    with pytest.raises(ValueError):
        reconstituido.aceitar(reconstituido.licenciando_id)


def escrever_catalogos(pasta, vagas):
    (pasta / "catalogo_evg.csv").write_text(
        "id_curso|nome_curso|carga_horaria|disponibilidade_dias|tipo_oferta\n"
        "1|Curso|10|30|Curso Aberto\n1|Curso|10|30|Curso Aberto\n",
        encoding="utf-8",
    )
    (pasta / "vagas_eja.json").write_text(json.dumps({"vagas": vagas}), encoding="utf-8")


def test_template_method_ignora_repeticoes_no_arquivo(db, tmp_path):
    vaga = {
        "titulo": "Auxiliar",
        "empresa": "Empresa",
        "cidade": "São Paulo",
        "uf": "SP",
        "categoria": "Serviços",
        "url": "https://example.com/vaga",
        "inscricoes_ate": None,
    }
    escrever_catalogos(tmp_path, [vaga, vaga])
    assert importar(db, tmp_path) == {"cursos": 1, "vagas": 1}
    assert importar(db, tmp_path) == {"cursos": 0, "vagas": 0}


def test_falha_no_segundo_importador_desfaz_cursos(db, tmp_path):
    escrever_catalogos(tmp_path, [{}])
    with pytest.raises(KeyError), Session(db.bind) as transacao, transacao.begin():
        importar(transacao, tmp_path)
    assert db.scalar(select(func.count()).select_from(CursoExterno)) == 0

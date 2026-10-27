import argparse
from pathlib import Path
lazy import csv
lazy import json
lazy from getpass import getpass

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database import engine, metadata
from backend.domain import Administrador, CursoExterno, OportunidadeTrabalho, Usuario
lazy from backend.schemas import Cadastro, VagaEntrada
lazy from backend.security import senhas

DATA = Path(__file__).parent / "data"


def importar(db: Session, pasta: Path = DATA):
    cursos_existentes = set(db.scalars(select(CursoExterno.id)))
    vagas_existentes = set(db.scalars(select(OportunidadeTrabalho.url_candidatura)))
    total_cursos = total_vagas = 0
    with (pasta / "catalogo_evg.csv").open(encoding="utf-8", newline="") as arquivo:
        for linha in csv.DictReader(arquivo, delimiter="|"):
            id = int(linha["id_curso"])
            horas = int(linha["carga_horaria"])
            dias = int(linha["disponibilidade_dias"])
            if id <= 0 or horas < 0 or dias <= 0 or not linha["nome_curso"].strip():
                raise ValueError("Curso inválido na base inicial.")
            if id not in cursos_existentes:
                db.add(
                    CursoExterno(
                        id=id,
                        titulo=linha["nome_curso"],
                        carga_horaria_horas=horas,
                        prazo_realizacao_dias=dias,
                        tipo_oferta=linha["tipo_oferta"],
                        url_oficial=f"https://www.escolavirtual.gov.br/curso/{id}",
                    )
                )
                cursos_existentes.add(id)
                total_cursos += 1
    with (pasta / "vagas_eja.json").open(encoding="utf-8") as arquivo:
        for linha in json.load(arquivo)["vagas"]:
            dados = VagaEntrada(
                titulo=linha["titulo"],
                empresa=linha["empresa"],
                cidade=linha["cidade"],
                uf=linha["uf"],
                area_trabalho=linha["categoria"],
                url_candidatura=linha["url"],
                inscricoes_ate=linha["inscricoes_ate"],
            )
            atributos = dados.model_dump(mode="json", exclude={"inscricoes_ate"})
            if atributos["url_candidatura"] not in vagas_existentes:
                db.add(OportunidadeTrabalho(**atributos, inscricoes_ate=dados.inscricoes_ate))
                vagas_existentes.add(atributos["url_candidatura"])
                total_vagas += 1
    db.flush()
    return {"cursos": total_cursos, "vagas": total_vagas}


def criar_admin(db: Session, nome: str, email: str, senha: str):
    dados = Cadastro(nome_exibicao=nome, email=email, senha=senha, tipo="estudante")
    if db.scalar(select(Usuario).where(Usuario.email == dados.email)):
        raise ValueError("Já existe uma conta com esse e-mail.")
    admin = Administrador(
        nome_exibicao=dados.nome_exibicao,
        email=dados.email,
        senha_hash=senhas.hash(dados.senha),
    )
    db.add(admin)
    db.flush()
    return admin


def main():
    parser = argparse.ArgumentParser()
    comandos = parser.add_subparsers(dest="comando", required=True)
    comandos.add_parser("init-db")
    comandos.add_parser("importar")
    admin = comandos.add_parser("criar-admin")
    admin.add_argument("--nome", required=True)
    admin.add_argument("--email", required=True)
    args = parser.parse_args()
    if args.comando == "init-db":
        metadata.create_all(engine())
        return
    with Session(engine()) as db, db.begin():
        if args.comando == "importar":
            print(json.dumps(importar(db)))
        else:
            senha = getpass("Senha: ")
            if senha != getpass("Confirme a senha: "):
                parser.error("As senhas não conferem.")
            criar_admin(db, args.nome, args.email, senha)


if __name__ == "__main__":
    main()

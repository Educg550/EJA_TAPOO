import argparse
from pathlib import Path
lazy import json
lazy from getpass import getpass

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database import engine, metadata
from backend.domain import Administrador, Usuario
lazy from backend.importacao import ImportadorCursos, ImportadorVagas
lazy from backend.schemas import Cadastro
lazy from backend.security import senhas

DATA = Path(__file__).parent / "data"


def importar(db: Session, pasta: Path = DATA):
    totais = {
        "cursos": ImportadorCursos().importar(db, pasta),
        "vagas": ImportadorVagas().importar(db, pasta),
    }
    db.flush()
    return totais


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

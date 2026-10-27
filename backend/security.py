import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from sqlalchemy import delete, insert, select
from sqlalchemy.orm import Session

from backend.database import session, sessoes
from backend.domain import Usuario

senhas = PasswordHash.recommended()
dummy_hash = senhas.hash(secrets.token_urlsafe(32))
bearer = HTTPBearer(auto_error=False)
DB = Annotated[Session, Depends(session)]
Credenciais = Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def emitir_token(db: Session, usuario: Usuario) -> str:
    token = secrets.token_urlsafe(32)
    agora = datetime.now(UTC)
    db.execute(delete(sessoes).where(sessoes.c.expira_em <= agora))
    db.execute(
        insert(sessoes).values(
            token_hash=token_hash(token),
            usuario_id=usuario.id,
            expira_em=agora + timedelta(days=1),
        )
    )
    db.commit()
    return token


def usuario_atual(db: DB, credenciais: Credenciais) -> Usuario:
    if credenciais:
        usuario = db.scalar(
            select(Usuario)
            .join(sessoes, sessoes.c.usuario_id == Usuario.id)
            .where(
                sessoes.c.token_hash == token_hash(credenciais.credentials),
                sessoes.c.expira_em > datetime.now(UTC),
            )
        )
        if usuario:
            return usuario
    raise HTTPException(401, "Autenticação necessária.", headers={"WWW-Authenticate": "Bearer"})


Atual = Annotated[Usuario, Depends(usuario_atual)]


def exigir(usuario: Usuario, permissao: str):
    if permissao not in usuario.permissoes():
        raise HTTPException(403, "Seu papel não permite esta operação.")

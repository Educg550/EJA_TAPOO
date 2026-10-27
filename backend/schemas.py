from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    HttpUrl,
    StringConstraints,
    field_validator,
    model_validator,
)

from backend.domain import Escolaridade, EstadoSolicitacao

Nome = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Texto = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]
Senha = Annotated[str, Field(min_length=12, max_length=128)]
UF = Annotated[
    str,
    StringConstraints(
        pattern="^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$"
    ),
]
Disciplinas = Annotated[list[Nome], Field(min_length=1, max_length=30)]


class Entrada(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Login(Entrada):
    email: EmailStr = Field(max_length=254)
    senha: Senha

    @field_validator("email")
    @classmethod
    def normalizar_email(cls, email):
        return email.lower()


class Cadastro(Login):
    nome_exibicao: Nome
    tipo: Literal["estudante", "licenciando"]
    disciplinas: Disciplinas | None = None
    disponibilidade: Texto | None = None

    @model_validator(mode="after")
    def validar_perfil(self):
        if self.tipo == "licenciando" and (not self.disciplinas or not self.disponibilidade):
            raise ValueError("Licenciandos devem informar disciplinas e disponibilidade.")
        if self.tipo == "estudante" and (
            self.disciplinas is not None or self.disponibilidade is not None
        ):
            raise ValueError("Disciplinas e disponibilidade pertencem ao licenciando.")
        return self


class PerfilLicenciando(Entrada):
    disciplinas: Disciplinas
    disponibilidade: Texto


class Saida(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UsuarioSaida(Saida):
    id: int
    nome_exibicao: str
    email: str
    tipo: str


class LicenciandoSaida(Saida):
    id: int
    nome_exibicao: str
    disciplinas: list[str]
    disponibilidade: str


class TokenSaida(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 86400


class PedidoApoio(Entrada):
    licenciando_id: int = Field(gt=0)


class SolicitacaoSaida(Saida):
    id: int
    estudante_id: int
    licenciando_id: int
    estado: EstadoSolicitacao
    criada_em: datetime


class ContatosSaida(BaseModel):
    estudante_email: str
    licenciando_email: str


class LocalidadeSaida(BaseModel):
    id: int = Field(gt=0)
    nome: Nome


class UFSaida(LocalidadeSaida):
    sigla: UF


class CursoSaida(Saida):
    id: int
    titulo: str
    carga_horaria_horas: int
    prazo_realizacao_dias: int
    url_oficial: str
    tipo_oferta: str


class VagaEntrada(Entrada):
    titulo: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=300)]
    empresa: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
    cidade: Nome
    uf: UF
    area_trabalho: Nome
    escolaridade_minima: Escolaridade | None = None
    url_candidatura: HttpUrl | None = None
    contato_candidatura: Texto | None = None
    inscricoes_ate: date | None = None
    ativa: bool = True

    @model_validator(mode="after")
    def validar_candidatura(self):
        if not self.url_candidatura and not self.contato_candidatura:
            raise ValueError("Informe o link ou contato para candidatura.")
        return self


class VagaSaida(Saida):
    id: int
    titulo: str
    empresa: str
    cidade: str
    uf: str
    area_trabalho: str
    escolaridade_minima: Escolaridade | None
    url_candidatura: str | None
    contato_candidatura: str | None
    inscricoes_ate: date | None
    ativa: bool

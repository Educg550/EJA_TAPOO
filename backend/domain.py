from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import UTC, date, datetime
from enum import StrEnum


class EstadoSolicitacao(StrEnum):
    PENDENTE = "pendente"
    ACEITA = "aceita"
    RECUSADA = "recusada"
    CANCELADA = "cancelada"


class Escolaridade(StrEnum):
    SEM_EXIGENCIA = "sem_exigencia"
    FUNDAMENTAL_INCOMPLETO = "fundamental_incompleto"
    FUNDAMENTAL_COMPLETO = "fundamental_completo"
    MEDIO_INCOMPLETO = "medio_incompleto"
    MEDIO_COMPLETO = "medio_completo"
    SUPERIOR_INCOMPLETO = "superior_incompleto"
    SUPERIOR_COMPLETO = "superior_completo"


@dataclass(kw_only=True)
class Usuario(ABC):
    nome_exibicao: str
    email: str
    senha_hash: str = field(repr=False)
    id: int = field(init=False)

    @abstractmethod
    def permissoes(self) -> frozenset[str]:
        raise NotImplementedError


@dataclass(kw_only=True)
class EstudanteEJA(Usuario):
    def permissoes(self) -> frozenset[str]:
        return frozenset({"solicitar_apoio", "cancelar_apoio", "consultar_apoio"})


@dataclass(kw_only=True)
class Licenciando(Usuario):
    disciplinas: list[str]
    disponibilidade: str

    def permissoes(self) -> frozenset[str]:
        return frozenset({"responder_apoio", "consultar_apoio", "editar_perfil"})


@dataclass(kw_only=True)
class Administrador(Usuario):
    def permissoes(self) -> frozenset[str]:
        return frozenset({"gerir_vagas"})


@dataclass(kw_only=True)
class SolicitacaoApoio:
    estudante_id: int
    licenciando_id: int
    id: int = field(init=False)
    _estado: str = field(default_factory=lambda: EstadoSolicitacao.PENDENTE, init=False)
    criada_em: datetime = field(default_factory=lambda: datetime.now(UTC))

    @property
    def estado(self) -> EstadoSolicitacao:
        return EstadoSolicitacao(self._estado)

    def _transicionar(self, ator_id: int, responsavel_id: int, estado: EstadoSolicitacao):
        if ator_id != responsavel_id:
            raise PermissionError("Esta operação pertence ao participante responsável.")
        if self.estado != EstadoSolicitacao.PENDENTE:
            raise ValueError("Somente solicitações pendentes podem ser alteradas.")
        self._estado = estado

    def aceitar(self, ator_id: int):
        self._transicionar(ator_id, self.licenciando_id, EstadoSolicitacao.ACEITA)

    def recusar(self, ator_id: int):
        self._transicionar(ator_id, self.licenciando_id, EstadoSolicitacao.RECUSADA)

    def cancelar(self, ator_id: int):
        self._transicionar(ator_id, self.estudante_id, EstadoSolicitacao.CANCELADA)

    def autorizar_contatos(self, ator_id: int):
        if ator_id not in (self.estudante_id, self.licenciando_id):
            raise PermissionError("Acesso restrito aos participantes.")
        if self.estado != EstadoSolicitacao.ACEITA:
            raise ValueError("Os contatos são liberados somente após o aceite.")


@dataclass(kw_only=True)
class CursoExterno:
    id: int
    titulo: str
    carga_horaria_horas: int
    prazo_realizacao_dias: int
    url_oficial: str
    tipo_oferta: str


@dataclass(kw_only=True)
class OportunidadeTrabalho:
    titulo: str
    empresa: str
    cidade: str
    uf: str
    area_trabalho: str
    id: int = field(init=False)
    escolaridade_minima: str | None = None
    url_candidatura: str | None = None
    contato_candidatura: str | None = None
    inscricoes_ate: date | None = None
    ativa: bool = True

    def encerrar(self):
        self.ativa = False

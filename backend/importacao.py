import csv
import json
from abc import ABC, abstractmethod
from pathlib import Path
from typing import final

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.domain import CursoExterno, OportunidadeTrabalho
lazy from backend.schemas import VagaEntrada


class Importador(ABC):
    @final
    def importar(self, db: Session, pasta: Path) -> int:
        existentes = set(db.scalars(select(getattr(self.entidade, self.chave))))
        total = 0
        with (pasta / self.arquivo).open(encoding="utf-8", newline="") as arquivo:
            for linha in self.registros(arquivo):
                entidade = self.converter(linha)
                chave = getattr(entidade, self.chave)
                if chave not in existentes:
                    db.add(entidade)
                    existentes.add(chave)
                    total += 1
        return total

    @abstractmethod
    def registros(self, arquivo):
        raise NotImplementedError

    @abstractmethod
    def converter(self, linha):
        raise NotImplementedError


class ImportadorCursos(Importador):
    arquivo = "catalogo_evg.csv"
    entidade = CursoExterno
    chave = "id"

    def registros(self, arquivo):
        return csv.DictReader(arquivo, delimiter="|")

    def converter(self, linha):
        id = int(linha["id_curso"])
        horas = int(linha["carga_horaria"])
        dias = int(linha["disponibilidade_dias"])
        if id <= 0 or horas < 0 or dias <= 0 or not linha["nome_curso"].strip():
            raise ValueError("Curso inválido na base inicial.")
        return CursoExterno(
            id=id,
            titulo=linha["nome_curso"],
            carga_horaria_horas=horas,
            prazo_realizacao_dias=dias,
            tipo_oferta=linha["tipo_oferta"],
            url_oficial=f"https://www.escolavirtual.gov.br/curso/{id}",
        )


class ImportadorVagas(Importador):
    arquivo = "vagas_eja.json"
    entidade = OportunidadeTrabalho
    chave = "url_candidatura"

    def registros(self, arquivo):
        return json.load(arquivo)["vagas"]

    def converter(self, linha):
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
        return OportunidadeTrabalho(**atributos, inscricoes_ate=dados.inscricoes_ate)

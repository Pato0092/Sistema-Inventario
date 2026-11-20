from abc import ABC, abstractmethod
from datetime import datetime
from app.domain.entities.registro_actividad import RegistroActividad

class BitacoraRepository(ABC):
    @abstractmethod
    def registrar(self, registro : RegistroActividad) -> None:
        pass

    @abstractmethod
    def listar(
        self,
        id_usuario : int | None,
        entidad : str | None,
        desde : datetime | None,
        hasta : datetime | None,
        limit : int,
        offset : int,
    ) -> tuple[list[RegistroActividad], int]:
        pass

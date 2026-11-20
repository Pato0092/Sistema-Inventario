from abc import ABC, abstractmethod
from app.domain.entities.movimiento import LineaMovimiento

class MovimientoRepository(ABC):
    @abstractmethod
    def registrar(self, id_usuario : int, id_producto : int, tipo : str, cantidad : int, motivo : str) -> None:
        pass

    @abstractmethod
    def listar(self, id_producto : int | None, limit : int, offset : int) -> tuple[list[LineaMovimiento], int]:
        pass

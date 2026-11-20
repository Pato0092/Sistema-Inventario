from abc import ABC, abstractmethod
from datetime import datetime
from app.domain.entities.venta import Venta

class VentaRepository(ABC):
    @abstractmethod
    def guardar_venta(self, venta : Venta) -> Venta:
        pass

    @abstractmethod
    def listar(self, desde : datetime | None, hasta : datetime | None, limit : int | None, offset : int) -> tuple[list[Venta], int]:
        pass

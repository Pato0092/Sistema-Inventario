from abc import ABC, abstractmethod
from app.domain.entities.compra import Compra

class CompraRepository(ABC):
    @abstractmethod
    def guardar_compra(self, compra : Compra) -> Compra:
        pass

    @abstractmethod
    def obtener_todas(self) -> list[Compra]:
        pass

    @abstractmethod
    def ultimo_costo_por_producto(self, ids_producto : list[int]) -> dict[int, float]:
        pass
    
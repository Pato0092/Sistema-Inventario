from abc import ABC, abstractmethod
from datetime import datetime
from app.domain.entities.pedido import Pedido, DetallePedido

class PedidoRepository(ABC):
    @abstractmethod
    def guardar(self, pedido : Pedido) -> Pedido:
        pass

    @abstractmethod
    def buscar_por_id(self, id_pedido : int) -> Pedido | None:
        pass

    @abstractmethod
    def obtener_todos(self) -> list[Pedido]:
        pass

    @abstractmethod
    def reemplazar_detalles(self, id_pedido : int, detalles : list[DetallePedido]) -> None:
        pass

    @abstractmethod
    def transicionar(self, id_pedido : int, desde : str, hacia : str) -> bool:
        pass

    @abstractmethod
    def asociar_compra(self, id_pedido : int, id_compra : int, fecha_entrega : datetime) -> None:
        pass

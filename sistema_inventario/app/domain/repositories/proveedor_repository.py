from abc import ABC, abstractmethod
from app.domain.entities.proveedor import Proveedor

class ProveedorRepository(ABC):
    @abstractmethod
    def guardar(self, proveedor : Proveedor) -> Proveedor:
        pass

    @abstractmethod
    def buscar_por_id(self, id_proveedor : int) -> Proveedor | None:
        pass

    @abstractmethod
    def buscar_por_nombre(self, nombre : str) -> Proveedor | None:
        pass

    @abstractmethod
    def obtener_todos(self) -> list[Proveedor]:
        pass

    @abstractmethod
    def modificar(self, proveedor : Proveedor) -> Proveedor:
        pass

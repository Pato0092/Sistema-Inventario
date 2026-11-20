from abc import ABC, abstractmethod
from app.domain.entities.usuario import Usuario

class UsuarioRepository(ABC):
    @abstractmethod
    def guardar(self, usuario : Usuario) -> Usuario:
        pass

    @abstractmethod
    def buscar_por_correo(self, correo : str) -> Usuario | None:
        pass

    @abstractmethod
    def buscar_por_id(self, id_usuario : int) -> Usuario | None:
        pass

    @abstractmethod
    def listar_todos(self) -> list[Usuario]:
        pass

    @abstractmethod
    def modificar(self, usuario : Usuario) -> Usuario:
        pass

    @abstractmethod
    def reemplazar_permisos(self, id_usuario : int, claves : list[str]) -> None:
        pass

    @abstractmethod
    def contar_administradores_activos(self) -> int:
        pass

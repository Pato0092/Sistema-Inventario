from abc import ABC, abstractmethod


class PasswordHasher(ABC):
    @abstractmethod
    def hashear(self, password : str) -> str:
        pass

    @abstractmethod
    def verificar(self, password : str, password_hash : str) -> bool:
        pass


class TokenProvider(ABC):
    @abstractmethod
    def crear(self, correo : str) -> str:
        pass

    @abstractmethod
    def correo_de(self, token : str) -> str | None:
        pass


class LimitadorIntentos(ABC):
    @abstractmethod
    def segundos_restantes(self, clave : str) -> int:
        pass

    @abstractmethod
    def registrar_fallo(self, clave : str) -> None:
        pass

    @abstractmethod
    def registrar_exito(self, clave : str) -> None:
        pass

from abc import ABC, abstractmethod


class UnidadTrabajo(ABC):
    def __init__(self):
        self._profundidad = 0

    @abstractmethod
    def confirmar(self) -> None:
        pass

    @abstractmethod
    def revertir(self) -> None:
        pass

    def __enter__(self):
        self._profundidad += 1
        return self

    def __exit__(self, tipo, error, traza):
        self._profundidad -= 1
        if tipo is not None:
            self.revertir()
        elif self._profundidad == 0:
            self.confirmar()
        return False

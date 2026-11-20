import threading
import time
from collections import defaultdict
from app.domain.seguridad import LimitadorIntentos


class LimitadorEnMemoria(LimitadorIntentos):
    def __init__(self, maximo : int = 5, ventana : float = 300.0, reloj=time.monotonic):
        self.maximo = maximo
        self.ventana = ventana
        self.reloj = reloj
        self._fallos : dict[str, list[float]] = defaultdict(list)
        self._lock = threading.Lock()

    def _purgar(self, clave : str, ahora : float) -> list[float]:
        vigentes = [t for t in self._fallos[clave] if ahora - t < self.ventana]
        if vigentes:
            self._fallos[clave] = vigentes
        else:
            self._fallos.pop(clave, None)
        return vigentes

    def segundos_restantes(self, clave : str) -> int:
        with self._lock:
            ahora = self.reloj()
            fallos = self._purgar(clave, ahora)
            if len(fallos) < self.maximo:
                return 0
            return max(1, int(fallos[-self.maximo] + self.ventana - ahora) + 1)

    def registrar_fallo(self, clave : str) -> None:
        with self._lock:
            self._fallos[clave].append(self.reloj())

    def registrar_exito(self, clave : str) -> None:
        with self._lock:
            self._fallos.pop(clave, None)

limitador_login = LimitadorEnMemoria()

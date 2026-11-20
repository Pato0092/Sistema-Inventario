from dataclasses import dataclass
from datetime import datetime

ENTRADA = "ENTRADA"
SALIDA = "SALIDA"


@dataclass
class LineaMovimiento:
    id_movimiento : int
    fecha_hora : datetime
    id_usuario : int
    usuario : str | None
    id_producto : int
    producto : str | None
    tipo : str
    cantidad : int
    motivo : str


@dataclass
class ResultadoAjuste:
    id_producto : int
    anterior : int
    nueva : int

    @property
    def diferencia(self) -> int:
        return self.nueva - self.anterior

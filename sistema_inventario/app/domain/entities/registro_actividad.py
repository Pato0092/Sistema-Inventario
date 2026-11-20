from dataclasses import dataclass
from datetime import datetime


@dataclass
class RegistroActividad:
    accion : str
    entidad : str
    id_usuario : int | None = None
    id_entidad : int | None = None
    detalle : str | None = None
    fecha_hora : datetime | None = None
    id_bitacora : int | None = None
    usuario : str | None = None

from datetime import datetime
from pydantic import BaseModel

class RegistroActividadResponse(BaseModel):
    id_bitacora : int
    id_usuario : int | None
    usuario : str | None
    fecha_hora : datetime
    accion : str
    entidad : str
    id_entidad : int | None
    detalle : str | None

    class Config:
        from_attributes = True

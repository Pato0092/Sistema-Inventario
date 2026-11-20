from datetime import datetime
from pydantic import BaseModel

class AjusteInventario(BaseModel):
    id_producto : int
    nueva_cantidad : int
    motivo : str

class LineaMovimientoResponse(BaseModel):
    id_movimiento : int
    fecha_hora : datetime
    id_usuario : int
    usuario : str | None
    id_producto : int
    producto : str | None
    tipo : str
    cantidad : int
    motivo : str

    class Config:
        from_attributes = True

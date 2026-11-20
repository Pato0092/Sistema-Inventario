from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

class DetalleVentaCreate(BaseModel):
    id_producto : int
    cantidad : int

class VentaCreate(BaseModel):
    detalles : List[DetalleVentaCreate]

class DetalleVentaResponse(BaseModel):
    id_producto : int
    cantidad : int
    precio_unitario : float
    costo_unitario : float
    subtotal : Optional[float] = None

    class Config:
        from_attributes = True

class VentaResponse(BaseModel):
    id_venta : int
    id_usuario : int
    nombre_usuario : Optional[str] = None
    total : float
    fecha_hora : datetime
    estado : str
    detalles : List[DetalleVentaResponse]

    class Config:
        from_attributes = True
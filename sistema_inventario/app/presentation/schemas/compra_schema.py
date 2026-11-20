from pydantic import BaseModel
from typing import List
from datetime import datetime

class DetalleCompraCreate(BaseModel):
    id_producto : int
    cantidad :int
    precio_proveedor : float

class CompraCreate(BaseModel):
    id_proveedor : int
    detalles : List[DetalleCompraCreate]

class DetalleCompraResponse(BaseModel):
    id_producto : int
    cantidad : int
    precio_proveedor : float
    subtotal : float

    class Config:
        from_attributes = True

class CompraResponse(BaseModel):
    id_compra : int
    id_proveedor : int
    fecha_hora : datetime
    estado : str
    total : float
    detalles : List[DetalleCompraResponse]

    class Config:
        from_attributes = True
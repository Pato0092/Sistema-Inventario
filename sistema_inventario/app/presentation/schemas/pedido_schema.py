from datetime import datetime
from typing import List
from pydantic import BaseModel

class DetallePedidoIn(BaseModel):
    id_producto : int
    cantidad : int
    precio_proveedor : float

class PedidoCreate(BaseModel):
    id_proveedor : int
    detalles : List[DetallePedidoIn]

class PedidoUpdate(BaseModel):
    detalles : List[DetallePedidoIn]

class DetallePedidoResponse(BaseModel):
    id_producto : int
    cantidad : int
    precio_proveedor : float
    subtotal : float

    class Config:
        from_attributes = True

class PedidoResponse(BaseModel):
    id_pedido : int
    id_usuario : int
    id_proveedor : int
    fecha_hora : datetime
    estado : str
    id_compra : int | None
    fecha_entrega : datetime | None
    total : float
    detalles : List[DetallePedidoResponse]

    class Config:
        from_attributes = True

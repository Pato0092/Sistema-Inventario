from datetime import date
from pydantic import BaseModel

class ProductoCreate(BaseModel):
    codigo_barras : str
    nombre : str
    marca : str | None
    presentacion : str | None
    precio_venta : float
    estado : bool
    id_categoria : int
    stock_minimo : int = 0
    cantidad : int = 0
    fecha_caducidad : date | None = None
    motivo : str | None = None

class ProductoUpdate(ProductoCreate):
    stock_minimo : int | None = None
    cantidad : int | None = None

class ProductoResponse(BaseModel):
    id_producto : int
    codigo_barras : str
    nombre : str
    marca : str | None
    presentacion : str | None
    precio_venta : float
    estado : bool
    id_categoria : int
    fecha_caducidad : date | None = None

    class Config:
        from_attributes = True
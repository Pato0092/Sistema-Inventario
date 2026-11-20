from pydantic import BaseModel

class InventarioMovimiento(BaseModel):
    id_producto : int
    cantidad : int
    motivo : str | None = None

class InventarioResponse(BaseModel):
    id_producto : int
    cantidad : int
    stock_minimo : int

    class Config:
        from_attributes = True
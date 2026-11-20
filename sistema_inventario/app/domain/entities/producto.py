from dataclasses import dataclass
from datetime import date

@dataclass
class Producto:
    id_producto : int | None
    codigo_barras : str
    nombre : str
    marca : str | None
    presentacion: str | None
    precio_venta : float
    id_categoria : int
    estado : bool = True
    fecha_caducidad : date | None = None
from dataclasses import dataclass
from datetime import date
from app.domain.errores import ErrorDeNegocio

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

    def __post_init__(self):
        self.validar()

    def validar(self) -> None:
        if self.precio_venta <= 0:
            raise ErrorDeNegocio("El precio de venta debe ser mayor a 0.")

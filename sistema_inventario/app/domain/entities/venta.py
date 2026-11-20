from datetime import datetime
from app.domain.entities.detalle_venta import DetalleVenta

class Venta:
    def __init__(
        self, 
        id_venta: int | None = None, 
        id_usuario: int | None = None, 
        fecha_hora: datetime | None = None, 
        estado: str = "CONFIRMADA"
    ):
        self.id_venta = id_venta
        self.id_usuario = id_usuario 
        self.fecha_hora = fecha_hora or datetime.now()
        self.estado = estado
        self.detalles: list[DetalleVenta] = []
        self.total: float = 0.0
        self.nombre_usuario: str | None = None

    def agregar_detalle(self, detalle: DetalleVenta):
        existente = next((d for d in self.detalles if d.id_producto == detalle.id_producto), None)
        if existente:
            existente.cantidad += detalle.cantidad
            existente.subtotal = existente.cantidad * existente.precio_unitario
        else:
            self.detalles.append(detalle)
        self.calcular_total()

    def calcular_total(self):
        self.total = sum(detalle.subtotal for detalle in self.detalles)

from datetime import datetime
from app.domain.entities.detalle_compra import DetalleCompra

class Compra:
    def __init__(self, id_usuario : int | None = None, id_compra : int | None = None, id_proveedor : int | None = None, fecha_hora : datetime | None = None, estado : str = "CONFIRMADA"):
        self.id_usuario = id_usuario
        self.id_compra = id_compra
        self.id_proveedor = id_proveedor
        self.fecha_hora = fecha_hora or datetime.now()
        self.estado = estado
        self.detalles : list[DetalleCompra] = []
        self.total : float = 0.0

    def agregar_detalle(self, detalle : DetalleCompra):
        existente = next((d for d in self.detalles if d.id_producto == detalle.id_producto), None)
        if existente:
            existente.subtotal += detalle.subtotal
            existente.cantidad += detalle.cantidad
            existente.precio_proveedor = existente.subtotal / existente.cantidad
        else:
            self.detalles.append(detalle)
        self.calcular_total()

    def calcular_total(self):
        self.total = sum(detalle.subtotal for detalle in self.detalles)
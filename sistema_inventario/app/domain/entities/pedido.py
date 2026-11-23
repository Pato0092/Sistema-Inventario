from app.domain.errores import ErrorDeNegocio
from datetime import datetime

EN_ESPERA = "EN_ESPERA"
ENTREGADO = "ENTREGADO"
CANCELADO = "CANCELADO"


class DetallePedido:
    def __init__(self, id_producto : int, cantidad : int, precio_proveedor : float):
        if cantidad <= 0:
            raise ErrorDeNegocio("La cantidad pedida debe ser mayor a 0.")
        if precio_proveedor <= 0:
            raise ErrorDeNegocio("El precio del proveedor debe ser mayor a 0.")
        self.id_producto = id_producto
        self.cantidad = cantidad
        self.precio_proveedor = precio_proveedor

    @property
    def subtotal(self) -> float:
        return self.cantidad * self.precio_proveedor


class Pedido:
    def __init__(
        self,
        id_usuario : int,
        id_proveedor : int,
        id_pedido : int | None = None,
        fecha_hora : datetime | None = None,
        estado : str = EN_ESPERA,
        id_compra : int | None = None,
        fecha_entrega : datetime | None = None,
    ):
        self.id_pedido = id_pedido
        self.id_usuario = id_usuario
        self.id_proveedor = id_proveedor
        self.fecha_hora = fecha_hora or datetime.now()
        self.estado = estado
        self.id_compra = id_compra
        self.fecha_entrega = fecha_entrega
        self.detalles : list[DetallePedido] = []

    def agregar_detalle(self, detalle : DetallePedido):
        existente = next((d for d in self.detalles if d.id_producto == detalle.id_producto), None)
        if existente:
            total = existente.subtotal + detalle.subtotal
            existente.cantidad += detalle.cantidad
            existente.precio_proveedor = total / existente.cantidad
        else:
            self.detalles.append(detalle)

    @property
    def total(self) -> float:
        return sum(d.subtotal for d in self.detalles)

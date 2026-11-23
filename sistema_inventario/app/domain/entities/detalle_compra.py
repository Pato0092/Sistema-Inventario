from app.domain.errores import ErrorDeNegocio

class DetalleCompra:
    def __init__(self, id_producto : int, cantidad : int, precio_proveedor : float):
        if cantidad <= 0:
            raise ErrorDeNegocio("La cantidad comprada debe ser mayor a 0.")
        if precio_proveedor <= 0:
            raise ErrorDeNegocio("El precio del proveedor debe ser mayor a cero.")
        self.id_producto = id_producto
        self.cantidad = cantidad
        self.precio_proveedor = precio_proveedor
        self.subtotal = self.cantidad * self.precio_proveedor
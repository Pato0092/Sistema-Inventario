class DetalleVenta:
    def __init__(
        self, 
        id_producto: int, 
        cantidad: int, 
        precio_unitario: float, 
        costo_unitario: float | None = 0.0
    ):
        if cantidad <= 0:
            raise ValueError("La cantidad vendida debe ser mayor a cero.")
        if precio_unitario <= 0:
            raise ValueError("El precio unitario debe ser mayor a cero.")
        if costo_unitario is not None and costo_unitario < 0:
            raise ValueError("El costo unitario no puede ser negativo.")
        self.id_producto = id_producto
        self.cantidad = cantidad
        self.precio_unitario = precio_unitario
        self.costo_unitario = costo_unitario if costo_unitario is not None else 0.0
        self.subtotal = self.cantidad * self.precio_unitario
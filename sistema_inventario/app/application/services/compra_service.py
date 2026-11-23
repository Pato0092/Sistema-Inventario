from app.domain.errores import ErrorDeNegocio
from app.domain.entities.compra import Compra
from app.domain.entities.detalle_compra import DetalleCompra
from app.domain.repositories.compra_repository import CompraRepository
from app.domain.repositories.inventario_repository import InventarioRepository
from app.domain.entities.inventario import Inventario
from app.domain.unidad_trabajo import UnidadTrabajo

class CompraService:
    def __init__(self, compra_repo : CompraRepository, inventario_repo : InventarioRepository, unidad : UnidadTrabajo):
        self.compra_repo = compra_repo
        self.inventario_repo = inventario_repo
        self.unidad = unidad

    def registrar_compra_lineas(self, id_usuario : int, id_proveedor : int | None, lineas : list[tuple[int, int, float]]) -> Compra:
        compra = Compra(id_usuario=id_usuario, id_proveedor=id_proveedor)
        for id_producto, cantidad, precio_proveedor in lineas:
            compra.agregar_detalle(DetalleCompra(id_producto, cantidad, precio_proveedor))
        return self.registrar_compra(compra)

    def registrar_compra(self, compra : Compra) -> Compra:
        if not compra.detalles:
            raise ErrorDeNegocio("La compra debe incluir al menos un producto.")
        with self.unidad:
            for detalle in compra.detalles:
                inventario = self.inventario_repo.obtener_por_producto(detalle.id_producto)
                if not inventario:
                    inventario = Inventario(id_producto=detalle.id_producto, cantidad=0, stock_minimo=5)
                inventario.agregar_stock(detalle.cantidad)
                self.inventario_repo.guardar(inventario)
            return self.compra_repo.guardar_compra(compra)

    def listar_compras(self) -> list[Compra]:
        return self.compra_repo.obtener_todas()

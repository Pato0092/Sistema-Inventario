from app.domain.entities.compra import Compra
from app.domain.entities.detalle_compra import DetalleCompra
from app.domain.repositories.compra_repository import CompraRepository
from app.domain.repositories.inventario_repository import InventarioRepository
from app.domain.entities.inventario import Inventario

class CompraService:
    def __init__(self, compra_repo : CompraRepository, inventario_repo : InventarioRepository):
        self.compra_repo = compra_repo
        self.inventario_repo = inventario_repo

    def registrar_compra(self, compra : Compra) -> Compra:
        if not compra.detalles:
            raise ValueError("La compra debe incluir al menos un producto.")
        for detalle in compra.detalles:
            inventario = self.inventario_repo.obtener_por_producto(detalle.id_producto)
            if inventario:
                inventario.cantidad += detalle.cantidad
            else:
                inventario = Inventario(
                    id_producto=detalle.id_producto,
                    cantidad=detalle.cantidad,
                    stock_minimo=5
                )
            self.inventario_repo.guardar(inventario)
        return self.compra_repo.guardar_compra(compra)

    def listar_compras(self) -> list[Compra]:
        return self.compra_repo.obtener_todas()
from sqlalchemy.orm import Session
from app.domain.entities.compra import Compra
from app.domain.entities.detalle_compra import DetalleCompra
from app.domain.repositories.compra_repository import CompraRepository
from app.infrastructure.models.compra_model import CompraModel, DetalleCompraModel

class CompraRepositoryPostgres(CompraRepository):
    def __init__(self, session : Session):
        self.session = session

    def guardar_compra(self, compra : Compra) -> Compra:
        compra_model = CompraModel(
            id_usuario=compra.id_usuario,
            id_proveedor=compra.id_proveedor,
            fecha_hora=compra.fecha_hora,
            total=compra.total,
            estado=compra.estado
        )
        self.session.add(compra_model)
        self.session.flush()
        for detalle in compra.detalles:
            detalle_model = DetalleCompraModel(
                id_compra=compra_model.id_compra,
                id_producto=detalle.id_producto,
                cantidad=detalle.cantidad,
                precio_proveedor=detalle.precio_proveedor
            )
            self.session.add(detalle_model)
        self.session.flush()
        compra.id_compra = compra_model.id_compra
        return compra

    def ultimo_costo_por_producto(self, ids_producto : list[int]) -> dict[int, float]:
        if not ids_producto:
            return {}
        filas = (
            self.session.query(DetalleCompraModel.id_producto, DetalleCompraModel.precio_proveedor)
            .join(CompraModel, CompraModel.id_compra == DetalleCompraModel.id_compra)
            .filter(DetalleCompraModel.id_producto.in_(ids_producto), CompraModel.estado == "CONFIRMADA")
            .order_by(CompraModel.fecha_hora.asc(), CompraModel.id_compra.asc())
            .all()
        )
        costos : dict[int, float] = {}
        for id_producto, precio in filas:
            costos[id_producto] = float(precio)  
        return costos

    def obtener_todas(self) -> list[Compra]:
        compras_db = self.session.query(CompraModel).all()
        lista_compras = []
        for c_db in compras_db:
            compra_dominio = Compra(
                id_compra=c_db.id_compra,
                id_proveedor=c_db.id_proveedor,
                fecha_hora=c_db.fecha_hora,
                estado=c_db.estado
            )
            compra_dominio.total = float(c_db.total)
            for d_db in c_db.detalles:
                d_db : DetalleCompraModel = d_db
                detalle = DetalleCompra(
                    id_producto=d_db.id_producto,
                    cantidad=d_db.cantidad,
                    precio_proveedor=float(d_db.precio_proveedor)
                )
                compra_dominio.detalles.append(detalle)
            lista_compras.append(compra_dominio)
        lista_compras.reverse()
        return lista_compras
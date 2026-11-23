from sqlalchemy import func
from sqlalchemy.orm import Session
from app.domain.entities.proveedor import Proveedor
from app.domain.repositories.proveedor_repository import ProveedorRepository
from app.infrastructure.models.proveedor_model import ProveedorModel

def _a_entidad(m : ProveedorModel) -> Proveedor:
    return Proveedor(id_proveedor=m.id_proveedor, nombre=m.nombre, telefono=m.telefono, correo=m.correo, estado=m.estado)

class ProveedorRepositoryPostgres(ProveedorRepository):
    def __init__(self, session : Session):
        self.session = session

    def guardar(self, proveedor : Proveedor) -> Proveedor:
        modelo = ProveedorModel(
            nombre=proveedor.nombre,
            telefono=proveedor.telefono,
            correo=proveedor.correo,
            estado=proveedor.estado
        )
        self.session.add(modelo)
        self.session.flush()
        self.session.refresh(modelo)
        proveedor.id_proveedor = modelo.id_proveedor
        return proveedor

    def buscar_por_id(self, id_proveedor : int) -> Proveedor | None:
        modelo = self.session.query(ProveedorModel).filter(ProveedorModel.id_proveedor == id_proveedor).first()
        return _a_entidad(modelo) if modelo else None

    def buscar_por_nombre(self, nombre : str) -> Proveedor | None:
        modelo = self.session.query(ProveedorModel).filter(func.lower(ProveedorModel.nombre) == nombre.lower()).first()
        return _a_entidad(modelo) if modelo else None

    def obtener_todos(self) -> list[Proveedor]:
        modelos = self.session.query(ProveedorModel).order_by(ProveedorModel.id_proveedor).all()
        return [_a_entidad(m) for m in modelos]

    def modificar(self, proveedor : Proveedor) -> Proveedor:
        modelo = self.session.query(ProveedorModel).filter(ProveedorModel.id_proveedor == proveedor.id_proveedor).first()
        if modelo:
            modelo.nombre = proveedor.nombre
            modelo.telefono = proveedor.telefono
            modelo.correo = proveedor.correo
            modelo.estado = proveedor.estado
            self.session.flush()
        return proveedor
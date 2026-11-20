from app.domain.entities.proveedor import Proveedor
from app.domain.repositories.proveedor_repository import ProveedorRepository

class ProveedorService:
    def __init__(self, repositorio : ProveedorRepository):
        self.repositorio = repositorio

    def _validar(self, nombre : str, telefono : str | None, correo : str | None, id_proveedor : int | None = None) -> tuple[str, str | None, str | None]:
        nombre = nombre.strip()
        if not nombre:
            raise ValueError("El nombre del proveedor no puede estar vacío.")
        if len(nombre) > 150:
            raise ValueError("El nombre del proveedor no puede superar los 150 caracteres.")
        telefono = telefono.strip() if telefono else None
        if telefono and len(telefono) > 20:
            raise ValueError("El teléfono no puede superar los 20 caracteres.")
        correo = correo.strip() if correo else None
        existente = self.repositorio.buscar_por_nombre(nombre)
        if existente and existente.id_proveedor != id_proveedor:
            raise ValueError(f"El proveedor '{nombre}' ya existe.")
        return nombre, telefono or None, correo or None

    def crear_proveedor(self, nombre : str, telefono : str | None, correo : str | None, estado : bool = True) -> Proveedor:
        nombre, telefono, correo = self._validar(nombre, telefono, correo)
        return self.repositorio.guardar(Proveedor(nombre=nombre, telefono=telefono, correo=correo, estado=estado))

    def actualizar_proveedor(self, id_proveedor : int, nombre : str, telefono : str | None, correo : str | None, estado : bool) -> Proveedor:
        proveedor = self.repositorio.buscar_por_id(id_proveedor)
        if not proveedor:
            raise ValueError("Proveedor no existente.")
        proveedor.nombre, proveedor.telefono, proveedor.correo = self._validar(nombre, telefono, correo, id_proveedor)
        proveedor.estado = estado
        return self.repositorio.modificar(proveedor)

    def obtener_por_id(self, id_proveedor : int) -> Proveedor | None:
        return self.repositorio.buscar_por_id(id_proveedor)

    def obtener_todos(self) -> list[Proveedor]:
        return self.repositorio.obtener_todos()

from app.domain.errores import ErrorDeNegocio
from app.domain.entities.proveedor import Proveedor
from app.domain.repositories.proveedor_repository import ProveedorRepository
from app.domain.unidad_trabajo import UnidadTrabajo
from app.application.services.bitacora_service import BitacoraService

class ProveedorService:
    def __init__(self, repositorio : ProveedorRepository, unidad : UnidadTrabajo, bitacora : BitacoraService):
        self.repositorio = repositorio
        self.unidad = unidad
        self.bitacora = bitacora

    def _validar(self, nombre : str, telefono : str | None, correo : str | None, id_proveedor : int | None = None) -> tuple[str, str | None, str | None]:
        nombre = nombre.strip()
        if not nombre:
            raise ErrorDeNegocio("El nombre del proveedor no puede estar vacío.")
        if len(nombre) > 150:
            raise ErrorDeNegocio("El nombre del proveedor no puede superar los 150 caracteres.")
        telefono = telefono.strip() if telefono else None
        if telefono and len(telefono) > 20:
            raise ErrorDeNegocio("El teléfono no puede superar los 20 caracteres.")
        correo = correo.strip() if correo else None
        existente = self.repositorio.buscar_por_nombre(nombre)
        if existente and existente.id_proveedor != id_proveedor:
            raise ErrorDeNegocio(f"El proveedor '{nombre}' ya existe.")
        return nombre, telefono or None, correo or None

    def crear_proveedor(self, nombre : str, telefono : str | None, correo : str | None, estado : bool = True, id_usuario : int | None = None) -> Proveedor:
        with self.unidad:
            nombre, telefono, correo = self._validar(nombre, telefono, correo)
            nuevo = self.repositorio.guardar(Proveedor(nombre=nombre, telefono=telefono, correo=correo, estado=estado))
        self.bitacora.registrar(id_usuario, "crear", "proveedor", nuevo.id_proveedor, nuevo.nombre)
        return nuevo

    def actualizar_proveedor(self, id_proveedor : int, nombre : str, telefono : str | None, correo : str | None, estado : bool, id_usuario : int | None = None) -> Proveedor:
        with self.unidad:
            proveedor = self.repositorio.buscar_por_id(id_proveedor)
            if not proveedor:
                raise ErrorDeNegocio("Proveedor no existente.")
            estado_anterior = proveedor.estado
            proveedor.nombre, proveedor.telefono, proveedor.correo = self._validar(nombre, telefono, correo, id_proveedor)
            proveedor.estado = estado
            proveedor = self.repositorio.modificar(proveedor)
        accion = "editar"
        if estado_anterior != proveedor.estado:
            accion = "activar" if proveedor.estado else "desactivar"
        self.bitacora.registrar(id_usuario, accion, "proveedor", id_proveedor, proveedor.nombre)
        return proveedor

    def obtener_por_id(self, id_proveedor : int) -> Proveedor | None:
        return self.repositorio.buscar_por_id(id_proveedor)

    def obtener_todos(self) -> list[Proveedor]:
        return self.repositorio.obtener_todos()

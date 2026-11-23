from app.domain.errores import ErrorDeNegocio
from app.domain.entities.categoria import Categoria
from app.domain.repositories.categoria_repository import CategoriaRepository
from app.domain.unidad_trabajo import UnidadTrabajo
from app.application.services.bitacora_service import BitacoraService

class CategoriaService:
    def __init__(self, repositorio : CategoriaRepository, unidad : UnidadTrabajo, bitacora : BitacoraService):
        self.repositorio = repositorio
        self.unidad = unidad
        self.bitacora = bitacora

    def crear_categoria(self, nombre : str, id_usuario : int | None = None) -> Categoria:
        nombre = nombre.strip()
        if not nombre:
            raise ErrorDeNegocio("El nombre de la categoría no puede estar vacío.")
        with self.unidad:
            existente = self.repositorio.buscar_por_nombre(nombre)
            if existente:
                raise ErrorDeNegocio(f"La categoría con el nombre '{nombre}' ya existe.")
            nueva_categoria = self.repositorio.guardar(Categoria(nombre = nombre))
        self.bitacora.registrar(id_usuario, "crear", "categoria", nueva_categoria.id_categoria, nueva_categoria.nombre)
        return nueva_categoria

    def actualizar_categoria(self, id_categoria : int, nombre : str, estado : bool, id_usuario : int | None = None) -> Categoria:
        with self.unidad:
            categoria = self.repositorio.buscar_por_id(id_categoria)
            if not categoria:
                raise ErrorDeNegocio("Categoría no existente.")
            nombre = nombre.strip()
            if not nombre:
                raise ErrorDeNegocio("El nombre de la categoría no puede estar vacío.")
            con_mismo_nombre = self.repositorio.buscar_por_nombre(nombre)
            if con_mismo_nombre and con_mismo_nombre.id_categoria != id_categoria:
                raise ErrorDeNegocio(f"La categoría con el nombre '{nombre}' ya existe.")
            estado_anterior = categoria.estado
            categoria.nombre = nombre
            categoria.estado = estado
            categoria = self.repositorio.modificar(categoria)
        accion = "editar"
        if estado_anterior != categoria.estado:
            accion = "activar" if categoria.estado else "desactivar"
        self.bitacora.registrar(id_usuario, accion, "categoria", id_categoria, categoria.nombre)
        return categoria

    def obtener_todos(self) -> list[Categoria]:
        return self.repositorio.obtener_todos()

    def obtener_por_id(self, id_categoria : int) -> Categoria | None:
        return self.repositorio.buscar_por_id(id_categoria)

    def desactivar_categoria(self, id_categoria : int) -> Categoria | None:
        with self.unidad:
            categoria = self.repositorio.buscar_por_id(id_categoria)
            if not categoria:
                raise ErrorDeNegocio("Categoría no existente.")
            categoria.desactivar()
            return self.repositorio.modificar(categoria)

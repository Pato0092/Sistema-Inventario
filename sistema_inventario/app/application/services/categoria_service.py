from app.domain.entities.categoria import Categoria
from app.domain.repositories.categoria_repository import CategoriaRepository

class CategoriaService:
    def __init__(self, repositorio : CategoriaRepository):
        self.repositorio = repositorio

    def crear_categoria(self, nombre : str) -> Categoria:
        nombre = nombre.strip()
        if not nombre:
            raise ValueError("El nombre de la categoría no puede estar vacío.")
        existente = self.repositorio.buscar_por_nombre(nombre)
        if existente:
            raise ValueError(f"La categoría con el nombre '{nombre}' ya existe.")
        nueva_categoria = Categoria(nombre = nombre)
        return self.repositorio.guardar(nueva_categoria)

    def actualizar_categoria(self, id_categoria : int, nombre : str, estado : bool) -> Categoria:
        categoria = self.repositorio.buscar_por_id(id_categoria)
        if not categoria:
            raise ValueError("Categoría no existente.")
        nombre = nombre.strip()
        if not nombre:
            raise ValueError("El nombre de la categoría no puede estar vacío.")
        con_mismo_nombre = self.repositorio.buscar_por_nombre(nombre)
        if con_mismo_nombre and con_mismo_nombre.id_categoria != id_categoria:
            raise ValueError(f"La categoría con el nombre '{nombre}' ya existe.")
        categoria.nombre = nombre
        categoria.estado = estado
        return self.repositorio.modificar(categoria)

    def obtener_todos(self) -> list[Categoria]:
        return self.repositorio.obtener_todos()

    def obtener_por_id(self, id_categoria : int) -> Categoria | None:
        return self.repositorio.buscar_por_id(id_categoria)

    def desactivar_categoria(self, id_categoria : int) -> Categoria | None:
        categoria = self.repositorio.buscar_por_id(id_categoria)
        if not categoria:
            raise ValueError("Categoría no existente.")
        categoria.desactivar()
        return self.repositorio.modificar(categoria)

    
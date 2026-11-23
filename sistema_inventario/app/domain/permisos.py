from app.domain.errores import ErrorDeNegocio

ROL_ADMIN = "administrador"
ROL_EMPLEADO = "empleado"
ROLES = (ROL_ADMIN, ROL_EMPLEADO)

CATALOGO: list[tuple[str, str, str]] = [
    ("inventario.ver", "Ver el inventario", "Inventario"),
    ("inventario.editar", "Agregar, editar y eliminar productos", "Inventario"),
    ("categorias.ver", "Ver las categorías", "Categorías"),
    ("categorias.editar", "Crear, renombrar y desactivar categorías", "Categorías"),
    ("proveedores.ver", "Ver los proveedores", "Proveedores"),
    ("proveedores.editar", "Crear, editar y desactivar proveedores", "Proveedores"),
    ("pedidos.ver", "Ver los pedidos a proveedores", "Pedidos"),
    ("pedidos.editar", "Crear, editar, cancelar y marcar como entregados los pedidos", "Pedidos"),
    ("estadisticas.ver", "Ver las estadísticas", "Estadísticas"),
    ("ventas.ver", "Ver el historial de ventas", "Ventas"),
    ("ventas.registrar", "Registrar ventas en el punto de venta", "Ventas"),
]

CLAVES = tuple(c for c, _, _ in CATALOGO)

PERMISOS_VER = tuple(c for c in CLAVES if c.endswith(".ver"))


def normalizar(claves: list[str]) -> list[str]:
    desconocidas = [c for c in claves if c not in CLAVES]
    if desconocidas:
        raise ErrorDeNegocio(f"Permiso desconocido: {desconocidas[0]}.")
    resultado = set(claves)
    for c in list(resultado):
        if c.endswith(".editar"):
            resultado.add(c.removesuffix(".editar") + ".ver")
        elif c == "ventas.registrar":
            resultado.add("ventas.ver")
    return [c for c in CLAVES if c in resultado]

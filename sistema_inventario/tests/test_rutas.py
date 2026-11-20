"""Revisa la estructura de la API sin levantar el servidor ni tocar la base.

Se recorren los routers de cada módulo (API pública de FastAPI) y la
documentación OpenAPI; no se usan estructuras internas del framework.
"""
from fastapi.routing import APIRoute

from app.infrastructure.dependencies import get_usuario_actual, requiere_admin
from app.main import app
from app.presentation.routes import (
    auth_routes, bitacora_routes, categoria_routes, compra_routes,
    inventario_routes, movimiento_routes, pedido_routes, producto_routes,
    proveedor_routes, usuario_routes, venta_routes,
)

MODULOS = [
    auth_routes, bitacora_routes, categoria_routes, compra_routes, inventario_routes,
    movimiento_routes, pedido_routes, producto_routes, proveedor_routes,
    usuario_routes, venta_routes,
]
# Única ruta de los módulos abierta a propósito: el inicio de sesión.
PUBLICAS = {"/auth/token"}


def rutas() -> list[APIRoute]:
    return [r for m in MODULOS for r in m.router.routes if isinstance(r, APIRoute)]


def _usa(dependant, funcion) -> bool:
    if dependant.call is funcion:
        return True
    return any(_usa(sub, funcion) for sub in dependant.dependencies)


def test_la_prueba_no_pasa_en_vacio():
    # Si FastAPI cambiara cómo expone los routers, esto fallaría en vez de
    # dar por buenas unas comprobaciones que no revisaron nada.
    assert len(rutas()) >= 30


def test_ninguna_ruta_queda_sin_proteger():
    sin_proteger = [
        f"{sorted(r.methods)} {r.path}"
        for r in rutas()
        if r.path not in PUBLICAS and not _usa(r.dependant, get_usuario_actual)
    ]
    assert sin_proteger == []


def test_openapi_marca_cada_operacion_como_autenticada():
    esquema = app.openapi()
    abiertas = [
        f"{metodo.upper()} {ruta}"
        for ruta, operaciones in esquema["paths"].items()
        for metodo, op in operaciones.items()
        if ruta not in PUBLICAS | {"/"} and "security" not in op
    ]
    assert abiertas == []
    assert len(esquema["paths"]) >= 25


def test_la_documentacion_de_la_api_incluye_lo_nuevo():
    caminos = set(app.openapi()["paths"])
    esperados = {
        "/productos/", "/inventario/ajuste", "/movimientos/", "/ventas/",
        "/pedidos/{id_pedido}/entregar", "/bitacora/", "/usuarios/me",
        "/usuarios/me/password", "/proveedores/",
    }
    assert esperados <= caminos


def test_las_rutas_de_administracion_exigen_ser_administrador():
    exclusivas = {
        ("GET", "/bitacora/"), ("GET", "/usuarios/"), ("POST", "/usuarios/"),
        ("PUT", "/usuarios/{id_usuario}"), ("GET", "/usuarios/permisos"),
        ("POST", "/compras/"),
    }
    encontradas = set()
    for r in rutas():
        for metodo in r.methods:
            if (metodo, r.path) in exclusivas:
                assert _usa(r.dependant, requiere_admin), (metodo, r.path)
                encontradas.add((metodo, r.path))
    assert encontradas == exclusivas


def test_las_ventas_ya_no_reciben_precio_ni_costo_del_cliente():
    esquema = app.openapi()["components"]["schemas"]
    assert set(esquema["DetalleVentaCreate"]["properties"]) == {"id_producto", "cantidad"}

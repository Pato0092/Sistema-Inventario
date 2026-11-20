import pytest

from app.domain.entities.compra import Compra
from app.domain.entities.detalle_compra import DetalleCompra
from app.domain.entities.detalle_venta import DetalleVenta
from app.domain.entities.pedido import DetallePedido, Pedido
from app.domain.entities.venta import Venta
from app.domain.permisos import CATALOGO, CLAVES, PERMISOS_VER, normalizar
from app.infrastructure.rate_limit import LimitadorEnMemoria


# ---------- permisos ----------
def test_editar_implica_ver():
    assert normalizar(["pedidos.editar"]) == ["pedidos.ver", "pedidos.editar"]


def test_registrar_venta_implica_ver_ventas():
    assert normalizar(["ventas.registrar"]) == ["ventas.ver", "ventas.registrar"]


def test_normalizar_ordena_sin_duplicados():
    assert normalizar(["estadisticas.ver", "estadisticas.ver", "inventario.ver"]) == [
        "inventario.ver", "estadisticas.ver",
    ]


def test_permiso_desconocido_se_rechaza():
    with pytest.raises(ValueError, match="desconocido"):
        normalizar(["root.todo"])


def test_catalogo_es_consistente():
    assert len(set(CLAVES)) == len(CLAVES)
    for clave in CLAVES:
        if clave.endswith(".editar"):
            assert clave.removesuffix(".editar") + ".ver" in CLAVES
    assert all(c.endswith(".ver") for c in PERMISOS_VER)
    assert all(etiqueta and grupo for _, etiqueta, grupo in CATALOGO)


# ---------- ventas y compras: líneas repetidas ----------
def test_venta_fusiona_productos_repetidos():
    v = Venta()
    v.agregar_detalle(DetalleVenta(1, 2, 10, 5))
    v.agregar_detalle(DetalleVenta(1, 3, 10, 5))
    v.agregar_detalle(DetalleVenta(2, 1, 7, 3))
    assert [(d.id_producto, d.cantidad) for d in v.detalles] == [(1, 5), (2, 1)]
    assert v.total == 57


def test_compra_fusiona_con_precio_promedio_ponderado():
    c = Compra()
    c.agregar_detalle(DetalleCompra(1, 2, 10))
    c.agregar_detalle(DetalleCompra(1, 2, 20))
    assert len(c.detalles) == 1
    assert c.detalles[0].cantidad == 4
    assert c.detalles[0].precio_proveedor == 15
    assert c.total == 60


@pytest.mark.parametrize("fabrica", [
    lambda: DetalleVenta(1, 0, 10, 5),
    lambda: DetalleVenta(1, 1, 0, 5),
    lambda: DetalleVenta(1, 1, 10, -1),
    lambda: DetalleCompra(1, 0, 10),
    lambda: DetalleCompra(1, 1, 0),
    lambda: DetallePedido(1, 0, 10),
    lambda: DetallePedido(1, 1, 0),
])
def test_detalles_invalidos_se_rechazan(fabrica):
    with pytest.raises(ValueError):
        fabrica()


def test_pedido_fusiona_y_conserva_el_total():
    p = Pedido(id_usuario=1, id_proveedor=1)
    p.agregar_detalle(DetallePedido(1, 10, 4.0))
    p.agregar_detalle(DetallePedido(1, 10, 6.0))
    p.agregar_detalle(DetallePedido(2, 3, 2.5))
    assert len(p.detalles) == 2
    assert p.total == 20 * 5.0 + 7.5


# ---------- límite de intentos de login ----------
class Reloj:
    def __init__(self):
        self.t = 1000.0

    def __call__(self):
        return self.t


def test_el_limitador_bloquea_y_libera_con_el_tiempo():
    reloj = Reloj()
    lim = LimitadorEnMemoria(maximo=3, ventana=60, reloj=reloj)
    for _ in range(2):
        lim.registrar_fallo("a")
    assert lim.segundos_restantes("a") == 0
    lim.registrar_fallo("a")
    assert 0 < lim.segundos_restantes("a") <= 61
    assert lim.segundos_restantes("b") == 0  # otra clave no se afecta
    reloj.t += 61
    assert lim.segundos_restantes("a") == 0  # pasó la ventana


def test_un_acierto_borra_los_fallos():
    lim = LimitadorEnMemoria(maximo=2, ventana=60, reloj=Reloj())
    lim.registrar_fallo("a")
    lim.registrar_exito("a")
    lim.registrar_fallo("a")
    assert lim.segundos_restantes("a") == 0

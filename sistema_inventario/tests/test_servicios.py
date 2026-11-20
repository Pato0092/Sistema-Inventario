import pytest

from app.application.services.compra_service import CompraService
from app.application.services.movimiento_service import MovimientoService
from app.application.services.pedido_service import PedidoService
from app.application.services.producto_service import ProductoService
from app.application.services.proveedor_service import ProveedorService
from app.application.services.usuario_service import UsuarioService
from app.application.services.venta_service import VentaService
from app.domain.entities.inventario import Inventario
from app.domain.entities.producto import Producto

from tests.fakes import (
    FakeCompraRepo, FakeHasher, FakeInventarioRepo, FakeMovimientoRepo, FakePedidoRepo,
    FakeProductoRepo, FakeProveedorRepo, FakeUsuarioRepo, FakeVentaRepo,
)


@pytest.fixture
def mundo():
    class M:
        pass
    m = M()
    m.inv = FakeInventarioRepo()
    m.prod = FakeProductoRepo()
    m.compras = FakeCompraRepo()
    m.mov = FakeMovimientoRepo()
    m.movimientos = MovimientoService(m.inv, m.mov)
    m.productos = ProductoService(m.prod, m.inv, m.movimientos)
    m.ventas = VentaService(FakeVentaRepo(), m.inv, m.prod, m.compras)
    return m


def nuevo_producto(m, nombre="Arroz", precio=20.0, stock=10, minimo=2):
    p = Producto(None, f"COD-{nombre}", nombre, None, None, precio, 1)
    m.productos.crear_producto(p, minimo, stock, id_usuario=1)
    return p


# ---------- ajustes de inventario con trazabilidad ----------
def test_el_stock_inicial_queda_registrado_como_movimiento(mundo):
    p = nuevo_producto(mundo, stock=10)
    assert mundo.inv.obtener_por_producto(p.id_producto).cantidad == 10
    (linea,) = mundo.mov.lineas
    assert (linea.tipo, linea.cantidad, linea.motivo) == ("ENTRADA", 10, "Inventario inicial")


def test_sin_stock_inicial_no_hay_movimiento(mundo):
    nuevo_producto(mundo, stock=0)
    assert mundo.mov.lineas == []


def test_cambiar_la_cantidad_exige_motivo_y_no_deja_cambios_a_medias(mundo):
    p = nuevo_producto(mundo, stock=10)
    p.nombre = "Nombre nuevo"
    with pytest.raises(ValueError, match="motivo"):
        mundo.productos.modificar_producto(p, cantidad=3, id_usuario=1, motivo="  ")
    assert mundo.prod.buscar_por_id(p.id_producto).nombre == "Arroz"  # nada se escribió
    assert mundo.inv.obtener_por_producto(p.id_producto).cantidad == 10


def test_ajuste_registra_salida_o_entrada_segun_la_diferencia(mundo):
    p = nuevo_producto(mundo, stock=10)
    mundo.productos.modificar_producto(p, cantidad=7, id_usuario=1, motivo="Merma")
    mundo.productos.modificar_producto(p, cantidad=9, id_usuario=1, motivo="Conteo físico")
    assert [(l.tipo, l.cantidad, l.motivo) for l in mundo.mov.lineas[1:]] == [
        ("SALIDA", 3, "Merma"), ("ENTRADA", 2, "Conteo físico"),
    ]
    assert mundo.inv.obtener_por_producto(p.id_producto).cantidad == 9


def test_modificar_devuelve_el_ajuste_para_que_quede_en_la_bitacora(mundo):
    p = nuevo_producto(mundo, stock=10)
    ajuste = mundo.productos.modificar_producto(p, cantidad=7, id_usuario=1, motivo="Merma")
    assert (ajuste.anterior, ajuste.nueva, ajuste.diferencia) == (10, 7, -3)
    # sin cambio de cantidad no hay ajuste que registrar
    assert mundo.productos.modificar_producto(p, cantidad=7, id_usuario=1) is None
    assert mundo.productos.modificar_producto(p, stock_minimo=5, id_usuario=1) is None


def test_editar_sin_cambiar_la_cantidad_no_pide_motivo(mundo):
    p = nuevo_producto(mundo, stock=10)
    p.precio_venta = 25.0
    mundo.productos.modificar_producto(p, stock_minimo=4, cantidad=10, id_usuario=1)
    assert len(mundo.mov.lineas) == 1  # solo el inicial
    assert mundo.inv.obtener_por_producto(p.id_producto).stock_minimo == 4


def test_ajuste_a_cantidad_negativa_se_rechaza(mundo):
    p = nuevo_producto(mundo, stock=2)
    with pytest.raises(ValueError, match="negativa"):
        mundo.movimientos.registrar_ajuste(1, p.id_producto, -1, "x")


def test_salida_mayor_al_stock_se_rechaza(mundo):
    p = nuevo_producto(mundo, stock=2)
    with pytest.raises(ValueError):
        mundo.movimientos.registrar_diferencia(1, p.id_producto, -5, "Robo")
    assert mundo.inv.obtener_por_producto(p.id_producto).cantidad == 2


# ---------- ventas: el servidor decide precio y costo ----------
def test_la_venta_toma_precio_del_producto_y_costo_de_la_ultima_compra(mundo):
    p = nuevo_producto(mundo, precio=20.0, stock=10)
    from app.domain.entities.compra import Compra
    from app.domain.entities.detalle_compra import DetalleCompra
    for precio in (8.0, 12.0):  # la última compra (12) es el costo vigente
        c = Compra(id_usuario=1, id_proveedor=1)
        c.agregar_detalle(DetalleCompra(p.id_producto, 1, precio))
        mundo.compras.guardar_compra(c)
    venta = mundo.ventas.registrar_venta_lineas(1, [(p.id_producto, 3)])
    (d,) = venta.detalles
    assert (d.precio_unitario, d.costo_unitario) == (20.0, 12.0)
    assert venta.total == 60.0
    assert mundo.inv.obtener_por_producto(p.id_producto).cantidad == 7


def test_producto_sin_compras_se_vende_con_costo_cero(mundo):
    p = nuevo_producto(mundo)
    venta = mundo.ventas.registrar_venta_lineas(1, [(p.id_producto, 1)])
    assert venta.detalles[0].costo_unitario == 0.0


def test_si_una_linea_no_tiene_stock_no_se_descuenta_nada(mundo):
    a = nuevo_producto(mundo, "A", stock=5)
    b = nuevo_producto(mundo, "B", stock=1)
    with pytest.raises(ValueError, match="Stock insuficiente"):
        mundo.ventas.registrar_venta_lineas(1, [(a.id_producto, 2), (b.id_producto, 3)])
    assert mundo.inv.obtener_por_producto(a.id_producto).cantidad == 5  # A intacto
    assert mundo.inv.obtener_por_producto(b.id_producto).cantidad == 1


def test_no_se_vende_un_producto_inactivo_ni_inexistente(mundo):
    p = nuevo_producto(mundo)
    p.estado = False
    mundo.prod.modificar_producto(p)
    with pytest.raises(ValueError, match="inactivo"):
        mundo.ventas.registrar_venta_lineas(1, [(p.id_producto, 1)])
    with pytest.raises(ValueError, match="No existe"):
        mundo.ventas.registrar_venta_lineas(1, [(999, 1)])
    with pytest.raises(ValueError, match="al menos un producto"):
        mundo.ventas.registrar_venta_lineas(1, [])


def test_lineas_repetidas_en_la_venta_se_suman(mundo):
    p = nuevo_producto(mundo, stock=10)
    venta = mundo.ventas.registrar_venta_lineas(1, [(p.id_producto, 2), (p.id_producto, 3)])
    assert len(venta.detalles) == 1 and venta.detalles[0].cantidad == 5


# ---------- pedidos: ciclo completo ----------
@pytest.fixture
def pedidos(mundo):
    proveedores = FakeProveedorRepo()
    mundo.proveedor = ProveedorService(proveedores).crear_proveedor("Distribuidora", None, None)
    mundo.inactivo = ProveedorService(proveedores).crear_proveedor("Cerrado", None, None, False)
    mundo.pedidos = PedidoService(
        FakePedidoRepo(), proveedores, mundo.prod, CompraService(mundo.compras, mundo.inv),
    )
    return mundo


def test_crear_y_editar_un_pedido_no_mueve_el_inventario(pedidos):
    a = nuevo_producto(pedidos, "A", stock=5)
    b = nuevo_producto(pedidos, "B", stock=5)
    ped = pedidos.pedidos.crear_pedido(1, pedidos.proveedor.id_proveedor, [(a.id_producto, 10, 4.0), (b.id_producto, 3, 2.5)])
    pedidos.pedidos.actualizar_pedido(ped.id_pedido, [(a.id_producto, 20, 5.0)])
    assert pedidos.inv.obtener_por_producto(a.id_producto).cantidad == 5
    assert pedidos.inv.obtener_por_producto(b.id_producto).cantidad == 5


def test_entregar_suma_solo_lo_que_queda_en_el_ticket(pedidos):
    a = nuevo_producto(pedidos, "A", stock=5)
    b = nuevo_producto(pedidos, "B", stock=5)
    ped = pedidos.pedidos.crear_pedido(1, pedidos.proveedor.id_proveedor, [(a.id_producto, 10, 4.0), (b.id_producto, 3, 2.5)])
    pedidos.pedidos.actualizar_pedido(ped.id_pedido, [(a.id_producto, 10, 4.0)])  # B no llegó
    entregado = pedidos.pedidos.marcar_entregado(ped.id_pedido, 1)
    assert entregado.estado == "ENTREGADO" and entregado.id_compra
    assert pedidos.inv.obtener_por_producto(a.id_producto).cantidad == 15
    assert pedidos.inv.obtener_por_producto(b.id_producto).cantidad == 5
    assert len(pedidos.compras.guardadas) == 1


def test_un_pedido_entregado_o_cancelado_ya_no_se_toca(pedidos):
    a = nuevo_producto(pedidos, "A", stock=5)
    p1 = pedidos.pedidos.crear_pedido(1, pedidos.proveedor.id_proveedor, [(a.id_producto, 1, 1.0)])
    pedidos.pedidos.marcar_entregado(p1.id_pedido, 1)
    for accion in (
        lambda: pedidos.pedidos.marcar_entregado(p1.id_pedido, 1),
        lambda: pedidos.pedidos.actualizar_pedido(p1.id_pedido, [(a.id_producto, 1, 1.0)]),
        lambda: pedidos.pedidos.cancelar_pedido(p1.id_pedido),
    ):
        with pytest.raises(ValueError):
            accion()
    assert len(pedidos.compras.guardadas) == 1  # el doble clic no duplica la compra
    p2 = pedidos.pedidos.crear_pedido(1, pedidos.proveedor.id_proveedor, [(a.id_producto, 1, 1.0)])
    pedidos.pedidos.cancelar_pedido(p2.id_pedido)
    with pytest.raises(ValueError):
        pedidos.pedidos.marcar_entregado(p2.id_pedido, 1)


def test_validaciones_al_crear_un_pedido(pedidos):
    a = nuevo_producto(pedidos, "A")
    prov = pedidos.proveedor.id_proveedor
    crear = pedidos.pedidos.crear_pedido
    with pytest.raises(ValueError, match="al menos un producto"):
        crear(1, prov, [])
    with pytest.raises(ValueError, match="inactivo"):
        crear(1, pedidos.inactivo.id_proveedor, [(a.id_producto, 1, 1.0)])
    with pytest.raises(ValueError, match="no existente"):
        crear(1, 999, [(a.id_producto, 1, 1.0)])
    with pytest.raises(ValueError, match="No existe el producto"):
        crear(1, prov, [(999, 1, 1.0)])
    with pytest.raises(ValueError):
        crear(1, prov, [(a.id_producto, 0, 1.0)])


# ---------- usuarios ----------
@pytest.fixture
def usuarios():
    repo = FakeUsuarioRepo()
    svc = UsuarioService(repo, FakeHasher())
    admin = svc.crear_usuario("Admin", "admin@x.com", "contrasena1", "administrador")
    return svc, repo, admin


def test_crear_empleado_normaliza_permisos(usuarios):
    svc, repo, _ = usuarios
    u = svc.crear_usuario("Ana", "ana@x.com", "contrasena1", "empleado", ["pedidos.editar"])
    assert u.permisos == ["pedidos.ver", "pedidos.editar"]
    assert repo.permisos[u.id_usuario] == ["pedidos.ver", "pedidos.editar"]


def test_un_administrador_no_guarda_permisos_individuales(usuarios):
    svc, repo, _ = usuarios
    u = svc.crear_usuario("Jefe", "jefe@x.com", "contrasena1", "administrador", ["inventario.ver"])
    assert u.permisos == [] and repo.permisos[u.id_usuario] == []
    assert len(UsuarioService.permisos_efectivos(u)) > 5


def test_reglas_para_no_quedarse_sin_administradores(usuarios):
    svc, _, admin = usuarios
    with pytest.raises(ValueError, match="tu propia cuenta"):
        svc.actualizar_usuario(admin.id_usuario, admin.id_usuario, "A", "empleado", True, [])
    with pytest.raises(ValueError, match="tu propia cuenta"):
        svc.actualizar_usuario(admin.id_usuario, admin.id_usuario, "A", "administrador", False, [])
    otro = svc.crear_usuario("Otro", "otro@x.com", "contrasena1", "administrador")
    svc.actualizar_usuario(admin.id_usuario, otro.id_usuario, "Admin", "empleado", True, [])  # ya hay otro
    with pytest.raises(ValueError, match="al menos un administrador"):
        svc.actualizar_usuario(otro.id_usuario, 999, "Otro", "empleado", True, [])


@pytest.mark.parametrize("campos, texto", [
    (("X", "admin@x.com", "contrasena1", "empleado"), "ya se encuentra registrado"),
    (("X", "n1@x.com", "corta", "empleado"), "al menos 8"),
    (("X", "n2@x.com", "contrasena1", "jefe"), "rol"),
    (("  ", "n3@x.com", "contrasena1", "empleado"), "nombre"),
    (("X", "n4@x.com", "a" * 73, "empleado"), "72"),
])
def test_validaciones_de_usuario(usuarios, campos, texto):
    svc, _, _ = usuarios
    with pytest.raises(ValueError, match=texto):
        svc.crear_usuario(*campos)


def test_cambiar_la_propia_contrasena(usuarios):
    svc, repo, admin = usuarios
    admin.password_hash = FakeHasher().hashear("contrasena1")
    with pytest.raises(ValueError, match="no es correcta"):
        svc.cambiar_password(admin.id_usuario, "equivocada", "nueva-clave-1")
    with pytest.raises(ValueError, match="al menos 8"):
        svc.cambiar_password(admin.id_usuario, "contrasena1", "corta")
    with pytest.raises(ValueError, match="distinta"):
        svc.cambiar_password(admin.id_usuario, "contrasena1", "contrasena1")
    svc.cambiar_password(admin.id_usuario, "contrasena1", "nueva-clave-1")
    assert FakeHasher().verificar("nueva-clave-1", repo.buscar_por_id(admin.id_usuario).password_hash)

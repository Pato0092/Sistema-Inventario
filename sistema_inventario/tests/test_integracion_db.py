"""Pruebas contra la base real de Postgres.

Cada prueba corre dentro de una transacción externa que SIEMPRE se deshace, así
que no dejan datos. Si no hay base disponible, se omiten.
"""
from datetime import date, datetime, timedelta

import pytest
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

pytestmark = pytest.mark.integracion


@pytest.fixture
def db():
    from app.infrastructure.database import engine
    try:
        conn = engine.connect()
    except Exception as e:  # sin base disponible
        pytest.skip(f"No hay conexión a la base de datos: {e}")
    externa = conn.begin()
    sesion = Session(bind=conn, join_transaction_mode="create_savepoint", autoflush=False)
    try:
        yield sesion
    finally:
        sesion.close()
        externa.rollback()
        conn.close()


@pytest.fixture
def escenario(db):
    from app.domain.entities.producto import Producto
    from app.infrastructure.dependencies import (
        get_categoria_service, get_producto_service, get_proveedor_service,
    )
    from app.infrastructure.models.usuario_model import UsuarioModel

    usuario = UsuarioModel(nombre="Tester", correo="tester@prueba.com", password_hash="x", rol="empleado")
    db.add(usuario)
    db.commit()
    categoria = get_categoria_service(db).crear_categoria("CategoriaPrueba")
    proveedor = get_proveedor_service(db).crear_proveedor("ProveedorPrueba", None, None)
    productos = get_producto_service(db)
    creados = []
    for i, nombre in enumerate(["Arroz", "Frijol"]):
        p = Producto(None, f"INT-{i}-{nombre}", nombre, None, None, 20.0, categoria.id_categoria,
                     fecha_caducidad=date(2030, 1, 31) if i == 0 else None)
        productos.crear_producto(p, 2, 10, usuario.id_usuario)
        creados.append(p)

    class E:
        pass
    e = E()
    e.db, e.usuario, e.proveedor, e.productos = db, usuario, proveedor, creados
    return e


def stock(db, id_producto):
    return db.execute(text("select cantidad from inventario where id_producto=:i"), {"i": id_producto}).scalar()


def test_la_fecha_de_caducidad_se_guarda_y_se_lee(escenario):
    from app.infrastructure.dependencies import get_producto_service
    svc = get_producto_service(escenario.db)
    arroz, frijol = escenario.productos
    assert svc.obtener_por_id(arroz.id_producto).fecha_caducidad == date(2030, 1, 31)
    assert svc.obtener_por_id(frijol.id_producto).fecha_caducidad is None
    arroz.fecha_caducidad = date(2031, 6, 1)
    svc.modificar_producto(arroz, id_usuario=escenario.usuario.id_usuario)
    assert svc.obtener_por_id(arroz.id_producto).fecha_caducidad == date(2031, 6, 1)


def test_ajustes_de_inventario_quedan_en_el_historial(escenario):
    from app.infrastructure.dependencies import get_movimiento_service, get_producto_service
    arroz = escenario.productos[0]
    uid = escenario.usuario.id_usuario
    arroz.nombre = "Arroz"
    get_producto_service(escenario.db).modificar_producto(arroz, cantidad=6, id_usuario=uid, motivo="Merma")
    assert stock(escenario.db, arroz.id_producto) == 6
    lineas, total = get_movimiento_service(escenario.db).listar(arroz.id_producto, 50, 0)
    assert total == 2  # inventario inicial + merma
    merma = lineas[0]
    assert (merma.tipo, merma.cantidad, merma.motivo, merma.producto, merma.usuario) == (
        "SALIDA", 4, "Merma", "Arroz", "Tester")
    assert lineas[1].motivo == "Inventario inicial" and lineas[1].tipo == "ENTRADA"


def test_bitacora_registra_y_filtra_con_paginacion(escenario):
    from app.infrastructure.dependencies import get_bitacora_service
    svc = get_bitacora_service(escenario.db)
    uid = escenario.usuario.id_usuario
    for i in range(5):
        svc.registrar(uid, "crear", "producto", i, f"p{i}")
    svc.registrar(uid, "vender", "venta", 1, "x")
    pagina, total = svc.listar(id_usuario=uid, limit=3, offset=0)
    assert total == 6 and len(pagina) == 3
    assert pagina[0].accion == "vender" and pagina[0].usuario == "Tester"  # lo más reciente primero
    solo, total = svc.listar(id_usuario=uid, entidad="venta")
    assert total == 1 and solo[0].detalle == "x"
    manana = datetime.now() + timedelta(days=1)
    assert svc.listar(id_usuario=uid, desde=manana)[1] == 0
    assert svc.listar(id_usuario=uid, limit=2, offset=4)[0][-1].id_entidad == 0  # la más antigua es la última de la página


def test_venta_con_precio_servidor_costo_de_compra_y_filtros(escenario):
    from app.infrastructure.dependencies import get_pedido_service, get_venta_service
    arroz = escenario.productos[0]
    uid = escenario.usuario.id_usuario
    # Una compra real (vía pedido entregado) fija el costo en 7.50.
    pedidos = get_pedido_service(escenario.db)
    ped = pedidos.crear_pedido(uid, escenario.proveedor.id_proveedor, [(arroz.id_producto, 5, 7.5)])
    pedidos.marcar_entregado(ped.id_pedido, uid)
    assert stock(escenario.db, arroz.id_producto) == 15

    ventas = get_venta_service(escenario.db)
    venta = ventas.registrar_venta_lineas(uid, [(arroz.id_producto, 4)])
    assert venta.detalles[0].precio_unitario == 20.0 and venta.detalles[0].costo_unitario == 7.5
    assert stock(escenario.db, arroz.id_producto) == 11

    todas, total = ventas.listar_ventas()
    assert total >= 1 and todas[0].id_venta == venta.id_venta  # la más reciente primero
    assert todas[0].nombre_usuario == "Tester"
    hoy = datetime.now()
    assert ventas.listar_ventas(desde=hoy - timedelta(days=1))[1] >= 1
    assert ventas.listar_ventas(desde=hoy + timedelta(days=1))[1] == 0
    pagina, total_p = ventas.listar_ventas(limit=1)
    assert len(pagina) == 1 and total_p == total


def test_las_dependencias_de_permiso_leen_la_base(escenario):
    from app.application.services.usuario_service import UsuarioService
    from app.infrastructure.dependencies import requiere_permisos
    from app.infrastructure.repositories.usuario_repository import UsuarioRepositoryPostgres
    from app.infrastructure.security import BcryptPasswordHasher

    repo = UsuarioRepositoryPostgres(escenario.db)
    emp = UsuarioService(repo, BcryptPasswordHasher()).crear_usuario(
        "Emp", "emp@prueba.com", "contrasena1", "empleado", ["ventas.registrar"])
    guardado = repo.buscar_por_id(emp.id_usuario)  # los permisos salen de la base, no del objeto original
    assert sorted(guardado.permisos) == ["ventas.registrar", "ventas.ver"]
    requiere_permisos("ventas.registrar")(usuario=guardado)
    requiere_permisos("estadisticas.ver", "ventas.ver")(usuario=guardado)
    with pytest.raises(HTTPException) as err:
        requiere_permisos("inventario.editar")(usuario=guardado)
    assert err.value.status_code == 403


def test_login_real_con_bcrypt_y_jwt_sobre_la_base(escenario):
    from app.application.services.auth_service import (
        CredencialesInvalidas, SesionInvalida, UsuarioDesactivado,
    )
    from app.application.services.usuario_service import UsuarioService
    from app.infrastructure.dependencies import get_auth_service
    from app.infrastructure.rate_limit import LimitadorEnMemoria
    from app.infrastructure.repositories.usuario_repository import UsuarioRepositoryPostgres
    from app.infrastructure.security import BcryptPasswordHasher

    repo = UsuarioRepositoryPostgres(escenario.db)
    u = UsuarioService(repo, BcryptPasswordHasher()).crear_usuario(
        "Ana", "ana.login@prueba.com", "contrasena1", "empleado", ["inventario.ver"])
    auth = get_auth_service(escenario.db)
    auth.limitador = LimitadorEnMemoria()  # no ensuciar el contador global de la aplicación

    token = auth.iniciar_sesion("ana.login@prueba.com", "contrasena1", "test")
    usuario = auth.usuario_de_token(token)
    assert usuario.id_usuario == u.id_usuario and usuario.permisos == ["inventario.ver"]
    with pytest.raises(CredencialesInvalidas):
        auth.iniciar_sesion("ana.login@prueba.com", "equivocada", "test")
    with pytest.raises(SesionInvalida):
        auth.usuario_de_token(token + "x")  # firma alterada

    UsuarioService(repo, BcryptPasswordHasher()).actualizar_usuario(
        u.id_usuario, 999999, "Ana", "empleado", False, ["inventario.ver"])
    with pytest.raises(UsuarioDesactivado):
        auth.usuario_de_token(token)

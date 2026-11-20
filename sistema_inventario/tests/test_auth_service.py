import pytest

from app.application.services.auth_service import (
    AuthService, CredencialesInvalidas, DemasiadosIntentos, SesionInvalida, UsuarioDesactivado,
)
from app.application.services.movimiento_service import MovimientoService
from app.application.services.proveedor_service import ProveedorService
from app.application.services.usuario_service import UsuarioService
from app.domain.entities.inventario import Inventario
from app.infrastructure.rate_limit import LimitadorEnMemoria

from tests.fakes import (
    FakeHasher, FakeInventarioRepo, FakeMovimientoRepo, FakeProveedorRepo, FakeTokens, FakeUsuarioRepo,
)


@pytest.fixture
def mundo():
    class M:
        pass
    m = M()
    m.repo = FakeUsuarioRepo()
    m.tokens = FakeTokens()
    m.limitador = LimitadorEnMemoria(maximo=3, ventana=60, reloj=lambda: 100.0)
    m.auth = AuthService(m.repo, FakeHasher(), m.tokens, m.limitador)
    m.usuarios = UsuarioService(m.repo, FakeHasher())
    m.ana = m.usuarios.crear_usuario("Ana", "ana@x.com", "contrasena1", "empleado")
    return m


def test_login_correcto_devuelve_un_token_del_usuario(mundo):
    token = mundo.auth.iniciar_sesion("ana@x.com", "contrasena1", "1.1.1.1")
    assert mundo.tokens.correo_de(token) == "ana@x.com"


@pytest.mark.parametrize("correo, password", [("ana@x.com", "mala"), ("nadie@x.com", "contrasena1")])
def test_credenciales_incorrectas(mundo, correo, password):
    with pytest.raises(CredencialesInvalidas):
        mundo.auth.iniciar_sesion(correo, password, "1.1.1.1")


def test_tras_varios_fallos_se_bloquea_aunque_la_clave_sea_correcta(mundo):
    for _ in range(3):
        with pytest.raises(CredencialesInvalidas):
            mundo.auth.iniciar_sesion("ana@x.com", "mala", "1.1.1.1")
    with pytest.raises(DemasiadosIntentos) as bloqueo:
        mundo.auth.iniciar_sesion("ana@x.com", "contrasena1", "1.1.1.1")
    assert bloqueo.value.segundos > 0


def test_el_bloqueo_es_por_origen_y_correo(mundo):
    for _ in range(3):
        with pytest.raises(CredencialesInvalidas):
            mundo.auth.iniciar_sesion("ana@x.com", "mala", "1.1.1.1")
    # otro equipo sí puede entrar: nadie bloquea a una persona desde fuera
    assert mundo.auth.iniciar_sesion("ana@x.com", "contrasena1", "2.2.2.2")


def test_un_acierto_borra_los_fallos_previos(mundo):
    for _ in range(2):
        with pytest.raises(CredencialesInvalidas):
            mundo.auth.iniciar_sesion("ana@x.com", "mala", "1.1.1.1")
    mundo.auth.iniciar_sesion("ana@x.com", "contrasena1", "1.1.1.1")
    for _ in range(2):  # empieza de cero: no llega al límite de 3
        with pytest.raises(CredencialesInvalidas):
            mundo.auth.iniciar_sesion("ana@x.com", "mala", "1.1.1.1")


def test_usuario_desactivado_no_inicia_sesion_ni_conserva_su_token(mundo):
    token = mundo.auth.iniciar_sesion("ana@x.com", "contrasena1", "1.1.1.1")
    mundo.usuarios.actualizar_usuario(mundo.ana.id_usuario, 999, "Ana", "empleado", False, [])
    with pytest.raises(UsuarioDesactivado):
        mundo.auth.iniciar_sesion("ana@x.com", "contrasena1", "1.1.1.1")
    with pytest.raises(UsuarioDesactivado):
        mundo.auth.usuario_de_token(token)


def test_token_valido_devuelve_al_usuario_con_sus_datos(mundo):
    token = mundo.auth.iniciar_sesion("ana@x.com", "contrasena1", "1.1.1.1")
    usuario = mundo.auth.usuario_de_token(token)
    assert (usuario.correo, usuario.rol) == ("ana@x.com", "empleado")


@pytest.mark.parametrize("token", ["", "basura", "token:fantasma@x.com"])
def test_tokens_invalidos_o_de_usuarios_inexistentes(mundo, token):
    with pytest.raises(SesionInvalida):
        mundo.auth.usuario_de_token(token)


def test_token_vencido_o_revocado(mundo):
    token = mundo.auth.iniciar_sesion("ana@x.com", "contrasena1", "1.1.1.1")
    mundo.tokens.invalidos.add(token)
    with pytest.raises(SesionInvalida):
        mundo.auth.usuario_de_token(token)


# ---- reglas que antes vivían en las rutas y ahora son de la aplicación
def test_entradas_y_salidas_manuales_validan_la_cantidad_en_el_servicio():
    inv, mov = FakeInventarioRepo(), FakeMovimientoRepo()
    inv.guardar(Inventario(1, cantidad=5))
    svc = MovimientoService(inv, mov)
    for cantidad in (0, -2):
        with pytest.raises(ValueError, match="mayor a cero"):
            svc.registrar_entrada(1, 1, cantidad)
        with pytest.raises(ValueError, match="mayor a cero"):
            svc.registrar_salida(1, 1, cantidad)
    svc.registrar_entrada(1, 1, 3)
    svc.registrar_salida(1, 1, 2, "Robo")
    assert inv.obtener_por_producto(1).cantidad == 6
    assert [(l.tipo, l.cantidad, l.motivo) for l in mov.lineas] == [("ENTRADA", 3, "Entrada manual"), ("SALIDA", 2, "Robo")]


def test_los_servicios_exponen_consultas_que_las_rutas_usaban_por_dentro(mundo):
    proveedores = ProveedorService(FakeProveedorRepo())
    p = proveedores.crear_proveedor("Distribuidora", None, None)
    assert proveedores.obtener_por_id(p.id_proveedor).nombre == "Distribuidora"
    assert proveedores.obtener_por_id(99) is None
    assert mundo.usuarios.obtener_por_id(mundo.ana.id_usuario).correo == "ana@x.com"

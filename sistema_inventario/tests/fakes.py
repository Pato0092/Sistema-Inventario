"""Repositorios en memoria para probar los servicios sin base de datos."""
from copy import copy
from datetime import datetime

from app.domain.entities.inventario import Inventario
from app.domain.entities.movimiento import LineaMovimiento
from app.domain.entities.producto import Producto
from app.domain.entities.proveedor import Proveedor
from app.domain.repositories.compra_repository import CompraRepository
from app.domain.repositories.inventario_repository import InventarioRepository
from app.domain.repositories.movimiento_repository import MovimientoRepository
from app.domain.repositories.pedido_repository import PedidoRepository
from app.domain.repositories.producto_repository import ProductoRepository
from app.domain.repositories.proveedor_repository import ProveedorRepository
from app.domain.repositories.usuario_repository import UsuarioRepository
from app.domain.repositories.venta_repository import VentaRepository
from app.domain.seguridad import PasswordHasher, TokenProvider


class FakeInventarioRepo(InventarioRepository):
    def __init__(self):
        self.datos: dict[int, Inventario] = {}

    def obtener_por_producto(self, id_producto):
        i = self.datos.get(id_producto)
        return copy(i) if i else None

    def listar_todos(self):
        return [copy(i) for i in self.datos.values()]

    def guardar(self, inventario):
        self.datos[inventario.id_producto] = copy(inventario)
        return inventario


class FakeProductoRepo(ProductoRepository):
    def __init__(self):
        self.datos: dict[int, Producto] = {}
        self._id = 0

    def buscar_por_id(self, id_producto):
        p = self.datos.get(id_producto)
        return copy(p) if p else None

    def buscar_por_codigo_barras(self, codigo):
        return next((copy(p) for p in self.datos.values() if p.codigo_barras == codigo), None)

    def listar_todos(self):
        return [copy(p) for p in self.datos.values()]

    def guardar_producto(self, producto):
        self._id += 1
        producto.id_producto = self._id
        self.datos[self._id] = copy(producto)
        return producto

    def modificar_producto(self, producto):
        self.datos[producto.id_producto] = copy(producto)

    def eliminar_producto(self, id_producto):
        self.datos.pop(id_producto, None)

    def agregar(self, nombre="Arroz", precio=20.0, estado=True, codigo=None) -> Producto:
        p = Producto(None, codigo or f"C{self._id + 1}", nombre, None, None, precio, 1, estado)
        return self.guardar_producto(p)


class FakeCompraRepo(CompraRepository):
    def __init__(self):
        self.guardadas = []

    def guardar_compra(self, compra):
        compra.id_compra = len(self.guardadas) + 1
        self.guardadas.append(compra)
        return compra

    def obtener_todas(self):
        return list(self.guardadas)

    def ultimo_costo_por_producto(self, ids):
        costos = {}
        for c in self.guardadas:  # en orden: la última gana
            for d in c.detalles:
                if d.id_producto in ids:
                    costos[d.id_producto] = d.precio_proveedor
        return costos


class FakeVentaRepo(VentaRepository):
    def __init__(self):
        self.guardadas = []

    def guardar_venta(self, venta):
        venta.id_venta = len(self.guardadas) + 1
        self.guardadas.append(venta)
        return venta

    def listar(self, desde, hasta, limit, offset):
        ventas = list(reversed(self.guardadas))
        total = len(ventas)
        return (ventas[offset:offset + limit] if limit else ventas), total


class FakeMovimientoRepo(MovimientoRepository):
    def __init__(self):
        self.lineas: list[LineaMovimiento] = []

    def registrar(self, id_usuario, id_producto, tipo, cantidad, motivo):
        self.lineas.append(LineaMovimiento(
            id_movimiento=len(self.lineas) + 1, fecha_hora=datetime.now(), id_usuario=id_usuario,
            usuario=None, id_producto=id_producto, producto=None, tipo=tipo, cantidad=cantidad, motivo=motivo,
        ))

    def listar(self, id_producto, limit, offset):
        lineas = [l for l in self.lineas if id_producto in (None, l.id_producto)]
        return lineas[offset:offset + limit], len(lineas)


class FakeProveedorRepo(ProveedorRepository):
    def __init__(self):
        self.datos: dict[int, Proveedor] = {}

    def guardar(self, proveedor):
        proveedor.id_proveedor = len(self.datos) + 1
        self.datos[proveedor.id_proveedor] = proveedor
        return proveedor

    def buscar_por_id(self, id_proveedor):
        return self.datos.get(id_proveedor)

    def buscar_por_nombre(self, nombre):
        return next((p for p in self.datos.values() if p.nombre.lower() == nombre.lower()), None)

    def obtener_todos(self):
        return list(self.datos.values())

    def modificar(self, proveedor):
        return proveedor


class FakePedidoRepo(PedidoRepository):
    def __init__(self):
        self.datos = {}

    def guardar(self, pedido):
        pedido.id_pedido = len(self.datos) + 1
        self.datos[pedido.id_pedido] = pedido
        return pedido

    def buscar_por_id(self, id_pedido):
        return self.datos.get(id_pedido)

    def obtener_todos(self):
        return list(self.datos.values())

    def reemplazar_detalles(self, id_pedido, detalles):
        pedido = self.datos[id_pedido]
        if pedido.estado != "EN_ESPERA":
            raise ValueError("Solo se pueden editar pedidos en espera.")
        pedido.detalles = list(detalles)

    def transicionar(self, id_pedido, desde, hacia):
        pedido = self.datos[id_pedido]
        if pedido.estado != desde:
            return False
        pedido.estado = hacia
        return True

    def asociar_compra(self, id_pedido, id_compra, fecha_entrega):
        self.datos[id_pedido].id_compra = id_compra
        self.datos[id_pedido].fecha_entrega = fecha_entrega


class FakeUsuarioRepo(UsuarioRepository):
    def __init__(self):
        self.datos = {}
        self.permisos: dict[int, list[str]] = {}

    def guardar(self, usuario):
        usuario.id_usuario = len(self.datos) + 1
        self.datos[usuario.id_usuario] = usuario
        return usuario

    def buscar_por_correo(self, correo):
        return next((u for u in self.datos.values() if u.correo == correo), None)

    def buscar_por_id(self, id_usuario):
        return self.datos.get(id_usuario)

    def listar_todos(self):
        return list(self.datos.values())

    def modificar(self, usuario):
        return usuario

    def reemplazar_permisos(self, id_usuario, claves):
        self.permisos[id_usuario] = list(claves)

    def contar_administradores_activos(self):
        return sum(1 for u in self.datos.values() if u.rol == "administrador" and u.estado)


class FakeHasher(PasswordHasher):
    """Sin bcrypt: rápido y determinista, suficiente para probar la lógica."""

    def hashear(self, password):
        return "hash:" + password

    def verificar(self, password, password_hash):
        return password_hash == "hash:" + password


class FakeTokens(TokenProvider):
    def __init__(self):
        self.invalidos = set()

    def crear(self, correo):
        return "token:" + correo

    def correo_de(self, token):
        if token in self.invalidos or not token.startswith("token:"):
            return None
        return token.removeprefix("token:")

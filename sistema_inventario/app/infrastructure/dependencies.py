from fastapi import Depends
from sqlalchemy.orm import Session
from app.infrastructure.database import SessionLocal
from app.infrastructure.security import BcryptPasswordHasher, JwtTokenProvider
from app.infrastructure.rate_limit import limitador_login
from app.application.services.auth_service import AuthService
from app.infrastructure.unidad_trabajo import UnidadTrabajoSqlAlchemy
from app.infrastructure.repositories.producto_repository import ProductoRepositoryPostgres
from app.application.services.producto_service import ProductoService
from app.infrastructure.repositories.categoria_repository import CategoriaRepositoryPostgres
from app.application.services.categoria_service import CategoriaService
from app.infrastructure.repositories.inventario_repository import InventarioRepositoryPostgres
from app.application.services.inventario_service import InventarioService
from app.infrastructure.repositories.venta_repository import VentaRepositoryPostgres
from app.application.services.venta_service import VentaService
from app.application.services.compra_service import CompraService
from app.infrastructure.repositories.compra_repository import CompraRepositoryPostgres
from app.infrastructure.repositories.usuario_repository import UsuarioRepositoryPostgres
from app.application.services.usuario_service import UsuarioService
from app.infrastructure.repositories.proveedor_repository import ProveedorRepositoryPostgres
from app.application.services.proveedor_service import ProveedorService
from app.infrastructure.repositories.pedido_repository import PedidoRepositoryPostgres
from app.application.services.pedido_service import PedidoService
from app.application.services.bitacora_service import BitacoraService
from app.application.services.movimiento_service import MovimientoService
from app.infrastructure.repositories.bitacora_repository import BitacoraRepositoryPostgres
from app.infrastructure.repositories.movimiento_repository import MovimientoRepositoryPostgres

_hasher = BcryptPasswordHasher()
_tokens = JwtTokenProvider()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(UsuarioRepositoryPostgres(session=db), _hasher, _tokens, limitador_login)

def _bitacora(db : Session, unidad : UnidadTrabajoSqlAlchemy) -> BitacoraService:
    return BitacoraService(BitacoraRepositoryPostgres(session=db), unidad)

def _movimientos(db : Session, unidad : UnidadTrabajoSqlAlchemy) -> MovimientoService:
    return MovimientoService(
        InventarioRepositoryPostgres(session=db),
        MovimientoRepositoryPostgres(session=db),
        unidad,
        _bitacora(db, unidad),
    )

def _compras(db : Session, unidad : UnidadTrabajoSqlAlchemy) -> CompraService:
    return CompraService(CompraRepositoryPostgres(db), InventarioRepositoryPostgres(db), unidad)

def get_producto_service(db_session: Session = Depends(get_db)) -> ProductoService:
    unidad = UnidadTrabajoSqlAlchemy(db_session)
    return ProductoService(
        repositorio=ProductoRepositoryPostgres(session=db_session),
        inventario_repo=InventarioRepositoryPostgres(session=db_session),
        movimiento_service=_movimientos(db_session, unidad),
        unidad=unidad,
        bitacora=_bitacora(db_session, unidad),
    )

def get_categoria_service(db_session: Session = Depends(get_db)) -> CategoriaService:
    unidad = UnidadTrabajoSqlAlchemy(db_session)
    return CategoriaService(CategoriaRepositoryPostgres(session=db_session), unidad, _bitacora(db_session, unidad))

def get_inventario_service(db_session: Session = Depends(get_db)) -> InventarioService:
    return InventarioService(InventarioRepositoryPostgres(session=db_session), UnidadTrabajoSqlAlchemy(db_session))

def get_venta_service(db_session: Session = Depends(get_db)) -> VentaService:
    unidad = UnidadTrabajoSqlAlchemy(db_session)
    return VentaService(
        venta_repo=VentaRepositoryPostgres(session=db_session),
        inventario_repo=InventarioRepositoryPostgres(session=db_session),
        producto_repo=ProductoRepositoryPostgres(session=db_session),
        compra_repo=CompraRepositoryPostgres(db_session),
        unidad=unidad,
        bitacora=_bitacora(db_session, unidad),
    )

def get_compra_service(db: Session = Depends(get_db)) -> CompraService:
    return _compras(db, UnidadTrabajoSqlAlchemy(db))

def get_usuario_service(db: Session = Depends(get_db)) -> UsuarioService:
    unidad = UnidadTrabajoSqlAlchemy(db)
    return UsuarioService(
        usuario_repo=UsuarioRepositoryPostgres(session=db),
        hasher=_hasher,
        unidad=unidad,
        bitacora=_bitacora(db, unidad),
    )

def get_proveedor_service(db: Session = Depends(get_db)) -> ProveedorService:
    unidad = UnidadTrabajoSqlAlchemy(db)
    return ProveedorService(ProveedorRepositoryPostgres(session=db), unidad, _bitacora(db, unidad))

def get_pedido_service(db: Session = Depends(get_db)) -> PedidoService:
    unidad = UnidadTrabajoSqlAlchemy(db)
    return PedidoService(
        pedido_repo=PedidoRepositoryPostgres(session=db),
        proveedor_repo=ProveedorRepositoryPostgres(session=db),
        producto_repo=ProductoRepositoryPostgres(session=db),
        compra_service=_compras(db, unidad),
        unidad=unidad,
        bitacora=_bitacora(db, unidad),
    )

def get_bitacora_service(db: Session = Depends(get_db)) -> BitacoraService:
    return _bitacora(db, UnidadTrabajoSqlAlchemy(db))

def get_movimiento_service(db: Session = Depends(get_db)) -> MovimientoService:
    return _movimientos(db, UnidadTrabajoSqlAlchemy(db))

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.infrastructure.database import SessionLocal
from app.infrastructure.security import BcryptPasswordHasher, JwtTokenProvider
from app.infrastructure.rate_limit import limitador_login
from app.domain.entities.usuario import Usuario
from app.domain.permisos import ROL_ADMIN
from app.application.services.auth_service import AuthService, SesionInvalida, UsuarioDesactivado
from app.infrastructure.database import SessionLocal
from app.domain.permisos import ROL_ADMIN
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

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

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

def get_usuario_actual(
    token: str = Depends(oauth2_scheme),
    auth: AuthService = Depends(get_auth_service),
) -> Usuario:
    try:
        return auth.usuario_de_token(token)
    except SesionInvalida:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se pudieron validar las credenciales",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except UsuarioDesactivado:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El usuario está desactivado",
        )

def requiere_permisos(*claves: str):
    def verificador(usuario: Usuario = Depends(get_usuario_actual)) -> Usuario:
        if usuario.rol == ROL_ADMIN or set(claves) & set(usuario.permisos):
            return usuario
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para realizar esta acción.",
        )
    return verificador


def requiere_admin(usuario: Usuario = Depends(get_usuario_actual)) -> Usuario:
    if usuario.rol != ROL_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta acción es exclusiva de los administradores.",
        )
    return usuario

def get_producto_service(db_session: Session = Depends(get_db)) -> ProductoService:
    repositorio = ProductoRepositoryPostgres(session=db_session)
    inventario_repo = InventarioRepositoryPostgres(session=db_session) 
    movimiento_service = MovimientoService(inventario_repo, MovimientoRepositoryPostgres(session=db_session))
    servicio = ProductoService(repositorio=repositorio, inventario_repo=inventario_repo, movimiento_service=movimiento_service)
    return servicio

def get_categoria_service(db_session: Session = Depends(get_db)) -> CategoriaService:
    repositorio = CategoriaRepositoryPostgres(session=db_session)
    servicio = CategoriaService(repositorio=repositorio)
    return servicio

def get_inventario_service(db_session: Session = Depends(get_db)) -> InventarioService:
    repositorio = InventarioRepositoryPostgres(session=db_session)
    return InventarioService(repositorio=repositorio)

def get_venta_service(db_session: Session = Depends(get_db)) -> VentaService:
    venta_repo = VentaRepositoryPostgres(session=db_session)
    inventario_repo = InventarioRepositoryPostgres(session=db_session)
    return VentaService(
        venta_repo=venta_repo,
        inventario_repo=inventario_repo,
        producto_repo=ProductoRepositoryPostgres(session=db_session),
        compra_repo=CompraRepositoryPostgres(db_session),
    )

def get_compra_service(db: Session = Depends(get_db)) -> CompraService:
    compra_repo = CompraRepositoryPostgres(db)
    inventario_repo = InventarioRepositoryPostgres(db)
    return CompraService(compra_repo, inventario_repo)

def get_usuario_service(db: Session = Depends(get_db)) -> UsuarioService:
    usuario_repo = UsuarioRepositoryPostgres(session=db)
    return UsuarioService(usuario_repo=usuario_repo, hasher=_hasher)

def get_proveedor_service(db: Session = Depends(get_db)) -> ProveedorService:
    return ProveedorService(repositorio=ProveedorRepositoryPostgres(session=db))

def get_pedido_service(db: Session = Depends(get_db)) -> PedidoService:
    compra_service = CompraService(CompraRepositoryPostgres(db), InventarioRepositoryPostgres(db))
    return PedidoService(
        pedido_repo=PedidoRepositoryPostgres(session=db),
        proveedor_repo=ProveedorRepositoryPostgres(session=db),
        producto_repo=ProductoRepositoryPostgres(session=db),
        compra_service=compra_service,
    )

def get_bitacora_service(db: Session = Depends(get_db)) -> BitacoraService:
    return BitacoraService(BitacoraRepositoryPostgres(session=db))

def get_movimiento_service(db: Session = Depends(get_db)) -> MovimientoService:
    return MovimientoService(
        InventarioRepositoryPostgres(session=db),
        MovimientoRepositoryPostgres(session=db),
    )

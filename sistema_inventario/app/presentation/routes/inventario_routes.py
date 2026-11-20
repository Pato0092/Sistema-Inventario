from fastapi import APIRouter, Depends, HTTPException
from app.domain.entities.usuario import Usuario
from app.application.services.bitacora_service import BitacoraService
from app.application.services.inventario_service import InventarioService
from app.application.services.movimiento_service import MovimientoService
from app.domain.permisos import PERMISOS_VER
from app.infrastructure.dependencies import (
    get_bitacora_service,
    get_inventario_service,
    get_movimiento_service,
    requiere_permisos,
)
from app.presentation.schemas.inventario_schema import InventarioMovimiento, InventarioResponse
from app.presentation.schemas.movimiento_schema import AjusteInventario

router = APIRouter(prefix="/inventario", tags=["inventario"])

@router.get("/", response_model=list[InventarioResponse], dependencies=[Depends(requiere_permisos(*PERMISOS_VER))])
def listar_inventario(
    servicio : InventarioService = Depends(get_inventario_service)
):
    return servicio.listar_inventario()

def _registrar(
    accion,
    movimiento : InventarioMovimiento,
    usuario : Usuario,
    inventario : InventarioService,
    bitacora : BitacoraService,
    por_defecto : str,
):
    try:
        resultado = accion(usuario.id_usuario, movimiento.id_producto, movimiento.cantidad, movimiento.motivo)
        actual = inventario.obtener_inventario(movimiento.id_producto)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    bitacora.registrar(
        usuario.id_usuario, "ajustar", "inventario", movimiento.id_producto,
        f"{resultado.anterior} → {resultado.nueva} u. ({movimiento.motivo or por_defecto})",
    )
    return actual

@router.post("/entrada", response_model=InventarioResponse)
def entrada_mercancia(
    movimiento : InventarioMovimiento,
    usuario : Usuario = Depends(requiere_permisos("inventario.editar")),
    movimientos : MovimientoService = Depends(get_movimiento_service),
    inventario : InventarioService = Depends(get_inventario_service),
    bitacora : BitacoraService = Depends(get_bitacora_service),
):
    return _registrar(movimientos.registrar_entrada, movimiento, usuario, inventario, bitacora, "Entrada manual")

@router.post("/salida", response_model=InventarioResponse)
def salida_mercancia(
    movimiento : InventarioMovimiento,
    usuario : Usuario = Depends(requiere_permisos("inventario.editar")),
    movimientos : MovimientoService = Depends(get_movimiento_service),
    inventario : InventarioService = Depends(get_inventario_service),
    bitacora : BitacoraService = Depends(get_bitacora_service),
):
    return _registrar(movimientos.registrar_salida, movimiento, usuario, inventario, bitacora, "Salida manual")

@router.post("/ajuste", response_model=InventarioResponse)
def ajustar_inventario(
    ajuste : AjusteInventario,
    usuario : Usuario = Depends(requiere_permisos("inventario.editar")),
    movimientos : MovimientoService = Depends(get_movimiento_service),
    inventario : InventarioService = Depends(get_inventario_service),
    bitacora : BitacoraService = Depends(get_bitacora_service),
):
    try:
        resultado = movimientos.registrar_ajuste(usuario.id_usuario, ajuste.id_producto, ajuste.nueva_cantidad, ajuste.motivo)
        actual = inventario.obtener_inventario(ajuste.id_producto)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if resultado.diferencia != 0:
        bitacora.registrar(
            usuario.id_usuario, "ajustar", "inventario", ajuste.id_producto,
            f"{resultado.anterior} → {resultado.nueva} u. ({ajuste.motivo.strip()})",
        )
    return actual

@router.get("/{id_producto}", response_model=InventarioResponse, dependencies=[Depends(requiere_permisos(*PERMISOS_VER))])
def consultar_stock(
    id_producto : int,
    servicio : InventarioService = Depends(get_inventario_service)
):
    try:
        return servicio.obtener_inventario(id_producto)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
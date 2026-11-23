from fastapi import APIRouter, Depends, HTTPException
from app.domain.entities.usuario import Usuario
from app.domain.errores import ErrorDeNegocio
from app.application.services.inventario_service import InventarioService
from app.application.services.movimiento_service import MovimientoService
from app.domain.permisos import PERMISOS_VER
from app.infrastructure.dependencies import get_inventario_service, get_movimiento_service
from app.presentation.guardias import requiere_permisos
from app.presentation.schemas.inventario_schema import InventarioMovimiento, InventarioResponse
from app.presentation.schemas.movimiento_schema import AjusteInventario

router = APIRouter(prefix="/inventario", tags=["inventario"])

@router.get("/", response_model=list[InventarioResponse], dependencies=[Depends(requiere_permisos(*PERMISOS_VER))])
def listar_inventario(
    servicio : InventarioService = Depends(get_inventario_service)
):
    return servicio.listar_inventario()

@router.post("/entrada", response_model=InventarioResponse)
def entrada_mercancia(
    movimiento : InventarioMovimiento,
    usuario : Usuario = Depends(requiere_permisos("inventario.editar")),
    movimientos : MovimientoService = Depends(get_movimiento_service),
    inventario : InventarioService = Depends(get_inventario_service),
):
    movimientos.registrar_entrada(usuario.id_usuario, movimiento.id_producto, movimiento.cantidad, movimiento.motivo)
    return inventario.obtener_inventario(movimiento.id_producto)

@router.post("/salida", response_model=InventarioResponse)
def salida_mercancia(
    movimiento : InventarioMovimiento,
    usuario : Usuario = Depends(requiere_permisos("inventario.editar")),
    movimientos : MovimientoService = Depends(get_movimiento_service),
    inventario : InventarioService = Depends(get_inventario_service),
):
    movimientos.registrar_salida(usuario.id_usuario, movimiento.id_producto, movimiento.cantidad, movimiento.motivo)
    return inventario.obtener_inventario(movimiento.id_producto)

@router.post("/ajuste", response_model=InventarioResponse)
def ajustar_inventario(
    ajuste : AjusteInventario,
    usuario : Usuario = Depends(requiere_permisos("inventario.editar")),
    movimientos : MovimientoService = Depends(get_movimiento_service),
    inventario : InventarioService = Depends(get_inventario_service),
):
    movimientos.ajustar_inventario(usuario.id_usuario, ajuste.id_producto, ajuste.nueva_cantidad, ajuste.motivo)
    return inventario.obtener_inventario(ajuste.id_producto)

@router.get("/{id_producto}", response_model=InventarioResponse, dependencies=[Depends(requiere_permisos(*PERMISOS_VER))])
def consultar_stock(
    id_producto : int,
    servicio : InventarioService = Depends(get_inventario_service)
):
    try:
        return servicio.obtener_inventario(id_producto)
    except ErrorDeNegocio as e:
        raise HTTPException(status_code=404, detail=str(e))

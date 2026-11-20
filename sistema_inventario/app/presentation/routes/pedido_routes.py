from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.domain.entities.usuario import Usuario
from app.application.services.bitacora_service import BitacoraService
from app.application.services.pedido_service import PedidoService
from app.infrastructure.dependencies import get_bitacora_service, get_pedido_service, requiere_permisos
from app.presentation.schemas.pedido_schema import PedidoCreate, PedidoUpdate, PedidoResponse

router = APIRouter(prefix="/pedidos", tags=["Pedidos a proveedores"])

def _lineas(detalles) -> list[tuple[int, int, float]]:
    return [(d.id_producto, d.cantidad, d.precio_proveedor) for d in detalles]

def _resumen(pedido) -> str:
    return f"{len(pedido.detalles)} producto(s) · total {pedido.total:.2f}"

@router.get("/", response_model=List[PedidoResponse], dependencies=[Depends(requiere_permisos("pedidos.ver", "proveedores.ver"))])
def listar_pedidos(servicio: PedidoService = Depends(get_pedido_service)):
    return servicio.listar_pedidos()

@router.post("/", response_model=PedidoResponse, status_code=status.HTTP_201_CREATED)
def crear_pedido(
    pedido_in: PedidoCreate,
    usuario: Usuario = Depends(requiere_permisos("pedidos.editar")),
    servicio: PedidoService = Depends(get_pedido_service),
    bitacora: BitacoraService = Depends(get_bitacora_service),
):
    try:
        pedido = servicio.crear_pedido(usuario.id_usuario, pedido_in.id_proveedor, _lineas(pedido_in.detalles))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    bitacora.registrar(usuario.id_usuario, "crear", "pedido", pedido.id_pedido, _resumen(pedido))
    return pedido

@router.put("/{id_pedido}", response_model=PedidoResponse)
def actualizar_pedido(
    id_pedido: int,
    pedido_in: PedidoUpdate,
    usuario: Usuario = Depends(requiere_permisos("pedidos.editar")),
    servicio: PedidoService = Depends(get_pedido_service),
    bitacora: BitacoraService = Depends(get_bitacora_service),
):
    try:
        pedido = servicio.actualizar_pedido(id_pedido, _lineas(pedido_in.detalles))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    bitacora.registrar(usuario.id_usuario, "editar", "pedido", id_pedido, _resumen(pedido))
    return pedido

@router.post("/{id_pedido}/entregar", response_model=PedidoResponse)
def marcar_entregado(
    id_pedido: int,
    usuario: Usuario = Depends(requiere_permisos("pedidos.editar")),
    servicio: PedidoService = Depends(get_pedido_service),
    bitacora: BitacoraService = Depends(get_bitacora_service),
):
    try:
        pedido = servicio.marcar_entregado(id_pedido, usuario.id_usuario)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    bitacora.registrar(usuario.id_usuario, "entregar", "pedido", id_pedido, f"{_resumen(pedido)} · compra #{pedido.id_compra}")
    return pedido

@router.post("/{id_pedido}/cancelar", response_model=PedidoResponse)
def cancelar_pedido(
    id_pedido: int,
    usuario: Usuario = Depends(requiere_permisos("pedidos.editar")),
    servicio: PedidoService = Depends(get_pedido_service),
    bitacora: BitacoraService = Depends(get_bitacora_service),
):
    try:
        pedido = servicio.cancelar_pedido(id_pedido)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    bitacora.registrar(usuario.id_usuario, "cancelar", "pedido", id_pedido, _resumen(pedido))
    return pedido
from fastapi import APIRouter, Depends, status
from typing import List
from app.domain.entities.usuario import Usuario
from app.application.services.pedido_service import PedidoService
from app.infrastructure.dependencies import get_pedido_service
from app.presentation.guardias import requiere_permisos
from app.presentation.schemas.pedido_schema import PedidoCreate, PedidoUpdate, PedidoResponse

router = APIRouter(prefix="/pedidos", tags=["Pedidos a proveedores"])

def _lineas(detalles) -> list[tuple[int, int, float]]:
    return [(d.id_producto, d.cantidad, d.precio_proveedor) for d in detalles]

@router.get("/", response_model=List[PedidoResponse], dependencies=[Depends(requiere_permisos("pedidos.ver", "proveedores.ver"))])
def listar_pedidos(servicio: PedidoService = Depends(get_pedido_service)):
    return servicio.listar_pedidos()

@router.post("/", response_model=PedidoResponse, status_code=status.HTTP_201_CREATED)
def crear_pedido(
    pedido_in: PedidoCreate,
    usuario: Usuario = Depends(requiere_permisos("pedidos.editar")),
    servicio: PedidoService = Depends(get_pedido_service),
):
    return servicio.crear_pedido(usuario.id_usuario, pedido_in.id_proveedor, _lineas(pedido_in.detalles))

@router.put("/{id_pedido}", response_model=PedidoResponse)
def actualizar_pedido(
    id_pedido: int,
    pedido_in: PedidoUpdate,
    usuario: Usuario = Depends(requiere_permisos("pedidos.editar")),
    servicio: PedidoService = Depends(get_pedido_service),
):
    return servicio.actualizar_pedido(id_pedido, _lineas(pedido_in.detalles), usuario.id_usuario)

@router.post("/{id_pedido}/entregar", response_model=PedidoResponse)
def marcar_entregado(
    id_pedido: int,
    usuario: Usuario = Depends(requiere_permisos("pedidos.editar")),
    servicio: PedidoService = Depends(get_pedido_service),
):
    return servicio.marcar_entregado(id_pedido, usuario.id_usuario)

@router.post("/{id_pedido}/cancelar", response_model=PedidoResponse)
def cancelar_pedido(
    id_pedido: int,
    usuario: Usuario = Depends(requiere_permisos("pedidos.editar")),
    servicio: PedidoService = Depends(get_pedido_service),
):
    return servicio.cancelar_pedido(id_pedido, usuario.id_usuario)

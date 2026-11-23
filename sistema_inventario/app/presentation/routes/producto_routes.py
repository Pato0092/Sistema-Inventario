from fastapi import APIRouter, Depends
from app.domain.entities.usuario import Usuario
from app.application.services.producto_service import ProductoService
from app.domain.entities.producto import Producto
from app.domain.permisos import PERMISOS_VER
from app.infrastructure.dependencies import get_producto_service
from app.presentation.guardias import requiere_permisos
from app.presentation.schemas.producto_schema import ProductoCreate, ProductoUpdate, ProductoResponse

router = APIRouter(prefix="/productos", tags=["Productos"])

@router.get("/", response_model=list[ProductoResponse], dependencies=[Depends(requiere_permisos(*PERMISOS_VER))])
def listar_productos(
    servicio: ProductoService = Depends(get_producto_service)
):
    return servicio.obtener_todos()

@router.post("/", response_model=dict)
def crear_producto(
    producto_entrada: ProductoCreate,
    usuario: Usuario = Depends(requiere_permisos("inventario.editar")),
    servicio: ProductoService = Depends(get_producto_service),
):
    producto_dominio = Producto(
        id_producto=0,
        codigo_barras=producto_entrada.codigo_barras,
        nombre=producto_entrada.nombre,
        marca=producto_entrada.marca,
        presentacion=producto_entrada.presentacion,
        precio_venta=producto_entrada.precio_venta,
        estado=producto_entrada.estado,
        id_categoria=producto_entrada.id_categoria,
        fecha_caducidad=producto_entrada.fecha_caducidad,
    )
    servicio.crear_producto(
        producto_dominio,
        producto_entrada.stock_minimo,
        producto_entrada.cantidad,
        usuario.id_usuario,
    )
    return {"mensaje": "Producto creado con éxito"}

@router.put("/{id_producto}", response_model=dict)
def modificar_producto(
    id_producto: int,
    producto_entrada: ProductoUpdate,
    usuario: Usuario = Depends(requiere_permisos("inventario.editar")),
    servicio: ProductoService = Depends(get_producto_service),
):
    producto_dominio = Producto(
        id_producto=id_producto,
        codigo_barras=producto_entrada.codigo_barras,
        nombre=producto_entrada.nombre,
        marca=producto_entrada.marca,
        presentacion=producto_entrada.presentacion,
        precio_venta=producto_entrada.precio_venta,
        estado=producto_entrada.estado,
        id_categoria=producto_entrada.id_categoria,
        fecha_caducidad=producto_entrada.fecha_caducidad,
    )
    servicio.modificar_producto(
        producto_dominio,
        producto_entrada.stock_minimo,
        producto_entrada.cantidad,
        usuario.id_usuario,
        producto_entrada.motivo,
    )
    return {"mensaje": "Producto actualizado con éxito"}

@router.delete("/{id_producto}", response_model=dict)
def eliminar_producto(
    id_producto: int,
    usuario: Usuario = Depends(requiere_permisos("inventario.editar")),
    servicio: ProductoService = Depends(get_producto_service),
):
    servicio.eliminar_producto(id_producto, usuario.id_usuario)
    return {"mensaje": "Producto eliminado con éxito"}

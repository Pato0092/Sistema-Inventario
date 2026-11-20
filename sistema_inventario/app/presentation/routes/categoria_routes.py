from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.domain.entities.usuario import Usuario
from app.application.services.bitacora_service import BitacoraService
from app.application.services.categoria_service import CategoriaService
from app.domain.permisos import PERMISOS_VER
from app.infrastructure.dependencies import get_bitacora_service, get_categoria_service, requiere_permisos
from app.presentation.schemas.categoria_schema import CategoriaCreate, CategoriaUpdate, CategoriaResponse

router = APIRouter(prefix="/categorias", tags=["Categorias"])

@router.post("/", response_model=CategoriaResponse)
def crear_categoria(
    categoria_in: CategoriaCreate,
    usuario: Usuario = Depends(requiere_permisos("categorias.editar", "inventario.editar")),
    servicio: CategoriaService = Depends(get_categoria_service),
    bitacora: BitacoraService = Depends(get_bitacora_service),
):
    try:
        nueva = servicio.crear_categoria(nombre=categoria_in.nombre)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    bitacora.registrar(usuario.id_usuario, "crear", "categoria", nueva.id_categoria, nueva.nombre)
    return nueva

@router.get("/", response_model=List[CategoriaResponse], dependencies=[Depends(requiere_permisos(*PERMISOS_VER))])
def listar_categorias(
    servicio: CategoriaService = Depends(get_categoria_service)
):
    return servicio.obtener_todos()

@router.put("/{id_categoria}", response_model=CategoriaResponse)
def actualizar_categoria(
    id_categoria: int,
    categoria_in: CategoriaUpdate,
    usuario: Usuario = Depends(requiere_permisos("categorias.editar")),
    servicio: CategoriaService = Depends(get_categoria_service),
    bitacora: BitacoraService = Depends(get_bitacora_service),
):
    try:
        anterior = servicio.obtener_por_id(id_categoria)
        categoria = servicio.actualizar_categoria(id_categoria, categoria_in.nombre, categoria_in.estado)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    accion = "editar"
    if anterior and anterior.estado != categoria.estado:
        accion = "activar" if categoria.estado else "desactivar"
    bitacora.registrar(usuario.id_usuario, accion, "categoria", id_categoria, categoria.nombre)
    return categoria
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from app.presentation.routes import producto_routes, categoria_routes, inventario_routes
from app.presentation.routes.venta_routes import router as venta_router
from app.presentation.routes.compra_routes import router as compra_router
from app.presentation.routes import usuario_routes, auth_routes, proveedor_routes, pedido_routes, bitacora_routes, movimiento_routes

app = FastAPI(
    title="Sistema de Inventario",
    version="1.0.0"
)
origins = [
    "http://localhost:5173",  
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
    expose_headers=["X-Total-Count"],
)

app.include_router(producto_routes.router)
app.include_router(categoria_routes.router)
app.include_router(inventario_routes.router)
app.include_router(venta_router)
app.include_router(compra_router)
app.include_router(usuario_routes.router)
app.include_router(auth_routes.router)
app.include_router(proveedor_routes.router)
app.include_router(pedido_routes.router)
app.include_router(bitacora_routes.router)
app.include_router(movimiento_routes.router)

@app.get("/")
def inicio():
    return {
        "mensaje": "Sistema de Inventario funcionando"
    }
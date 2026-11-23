# ADR-0002: Fuente de verdad y modelo de datos

- **Estado:** Aceptada
- **Fecha:** 2026-11-23
- **Relacionadas:** [0001](0001-atributos-de-calidad.md), [0005](0005-persistencia-y-almacenamiento.md), [0006](0006-comportamiento-ante-fallos-y-modo-degradado.md)

## Contexto

El sistema maneja datos que deben coincidir siempre: cuántas unidades hay de un producto, qué se vendió, qué se compró y quién lo hizo. Hay tres lugares donde un dato podría "vivir": la base de datos, la lógica de negocio del servidor y la pantalla web. Si no se declara cuál manda, aparecen cifras contradictorias.

## Decisión

### 1. La fuente de verdad es la base PostgreSQL local

Todo el estado del negocio (productos, existencias, ventas, compras, pedidos, usuarios, permisos, movimientos, bitácora) vive **únicamente** en PostgreSQL. La pantalla React no guarda copias persistentes de datos de negocio: consulta la API y vuelve a consultar tras cada cambio. Lo único que persiste en el navegador es el token de sesión (`localStorage`, ver ADR-0007).

### 2. Las reglas de negocio viven en el dominio y se refuerzan en la base

Las invariantes se aplican **dos veces, en dos niveles con roles distintos**:

| Regla | Dominio / aplicación (da el mensaje claro) | PostgreSQL (última barrera) |
|-------|--------------------------------------------|-----------------------------|
| Precio de venta > 0 | `Producto.validar()` | `chk_producto_precio` |
| Código de barras único | `ProductoService.crear_producto` / `modificar_producto` | `producto_codigo_barras_key` (UNIQUE) |
| Stock no negativo | `Inventario.descontar_stock` (lanza `ErrorDeNegocio` si `cantidad - n < 0`) | `chk_inventario_cantidad` (`cantidad >= 0`) |
| Cantidad a mover > 0 | `Inventario.agregar_stock` / `descontar_stock` | `chk_detalle_compra_cantidad`, `chk_detalle_movimiento_cantidad` |
| Estados válidos de venta/compra/pedido | constantes en entidades (`EN_ESPERA`, `ENTREGADO`, `CANCELADO`) | `CHECK` sobre `estado` |
| Rol válido | `UsuarioService._validar_rol` | `chk_usuario_rol` |
| Correo de usuario único | `UsuarioService.crear_usuario` | `usuarios_correo_key` (UNIQUE) |

### 3. El inventario cambia solo por operaciones del dominio

La existencia de un producto (`inventario.cantidad`) es un **dato derivado de eventos de negocio**, no un campo que se edita libremente:

- **Venta** → `VentaService.registrar_venta` valida stock y llama a `Inventario.descontar_stock`.
- **Compra** (y entrega de un pedido) → `CompraService.registrar_compra` llama a `Inventario.agregar_stock`.
- **Entrada, salida o ajuste manual** → `MovimientoService` calcula la diferencia, actualiza el inventario y **registra un movimiento con motivo obligatorio** (`movimientos_manuales` + `detalle_movimiento`).

Un pedido a proveedor (`pedidos`, `detalle_pedido`) **no toca el inventario**: es un ticket en espera. Solo al marcarlo `ENTREGADO` se genera una compra real, y esa compra es la que suma stock.

### 4. Modelo de datos (esquema gestionado por Alembic)

```
categorias 1──* producto 1──1 inventario (cantidad, stock_minimo)
                  │
                  ├──* detalle_venta  *──1 ventas     *──1 usuarios
                  ├──* detalle_compra *──1 compras    *──1 usuarios, proveedores
                  ├──* detalle_pedido *──1 pedidos    *──1 usuarios, proveedores   (pedidos.id_compra → compras)
                  └──* detalle_movimiento *──1 movimientos_manuales *──1 usuarios
usuarios *──* permisos   (tabla puente usuario_permisos)
bitacora  (id_usuario → usuarios, ON DELETE SET NULL)
```

Criterios:

- **Historial inmutable por restricción:** las claves foráneas de ventas, compras y movimientos usan `ON DELETE RESTRICT`; no se puede borrar un producto o usuario con historial. Los productos, categorías y proveedores se **desactivan** (`estado = false`) en lugar de borrarse.
- **Snapshot de precios en los detalles:** `detalle_venta` guarda `precio_unitario` y `costo_unitario` al momento de la venta (el costo se toma del último `precio_proveedor` de compras), de modo que cambiar el precio después no altera el historial ni las estadísticas.
- **Dinero:** columnas `NUMERIC(10,2)` / `NUMERIC(12,2)` en la base.
- **Fechas:** `TIMESTAMP` sin zona horaria, hora local de la computadora donde corre el sistema (coherente con un uso en un solo lugar).
- **Identificadores:** `GENERATED ALWAYS AS IDENTITY`.

### 5. Evolución del esquema

El esquema se versiona con **Alembic** (`0001_esquema_base`, `0002_pedidos`, `0003_bitacora_y_caducidad`), escritas a mano y con `IF NOT EXISTS` para ser idempotentes. `0001` refleja el esquema que ya existía antes de adoptar Alembic. Los modelos SQLAlchemy (`infrastructure/models/`) describen las tablas para consultar, pero **no se usa autogenerate** (`target_metadata = None` en `alembic/env.py`): el esquema real lo define lo que dicen las migraciones.

## Alternativas consideradas

- **Dejar que SQLAlchemy cree las tablas (`Base.metadata.create_all`)**: descartado; no versiona cambios ni migra instalaciones existentes.
- **Validar solo en la base de datos**: descartado; los mensajes serían errores técnicos de integridad en vez de mensajes de negocio ("Stock insuficiente. Stock actual: 3").
- **Validar solo en el servidor**: descartado; cualquier script, consulta manual o error futuro podría dejar datos inválidos. Las dos capas se complementan.
- **Guardar `cantidad` como suma de movimientos (event sourcing)**: descartado por complejidad; se guarda la cantidad actual y se deja rastro en movimientos/ventas/compras.

## Consecuencias

- Cambiar una regla de stock o de precio requiere tocar el **dominio** y, si es una invariante dura, también una migración con el `CHECK` correspondiente.
- El historial financiero es confiable aunque cambien los precios.
- **Compromiso conocido:** la entidad `Producto` usa `float` para `precio_venta` mientras la base usa `NUMERIC`; es suficiente a escala de comercio pequeño, pero si aparecieran errores de redondeo habría que pasar el dominio a `Decimal`.
- El inventario se actualiza con *leer–modificar–guardar*; la protección ante concurrencia se discute en el ADR-0006.

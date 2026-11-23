# ADR-0006: Comportamiento ante fallos y modo degradado

- **Estado:** Aceptada
- **Fecha:** 2026-11-23
- **Relacionadas:** [0001](0001-atributos-de-calidad.md), [0002](0002-fuente-de-verdad-y-modelo-de-datos.md), [0004](0004-estilo-de-comunicacion-entre-componentes.md), [0005](0005-persistencia-y-almacenamiento.md)

## Contexto

Todo corre en una computadora de comercio: se puede apagar, reiniciar o quedarse sin PostgreSQL en medio de una venta. Hay que definir qué garantiza el sistema cuando algo falla y qué hace (o no hace) en modo degradado. Dado el orden de prioridades (ADR-0001), la regla general es: **ante la duda, fallar de forma visible y sin dejar datos a medias.**

## Decisión

### 1. Atomicidad: cada operación de negocio es una transacción

Cada caso de uso que modifica datos se ejecuta dentro de `with self.unidad:` (`UnidadTrabajo`):

- Si todo sale bien, se hace `commit` **una sola vez**, al salir del bloque más externo (los bloques anidados solo incrementan una profundidad, no confirman).
- Si cualquier paso lanza una excepción, se hace `rollback` de toda la operación y la excepción se propaga.

Ejemplos concretos:

- **Venta** (`VentaService.registrar_venta_lineas`): valida productos activos, valida el stock de **todas** las líneas, descuenta cada una con `Inventario.descontar_stock` y guarda la venta. Si la línea 3 no tiene stock, no se descuenta ni guarda nada de las líneas 1 y 2.
- **Entrega de pedido** (`PedidoService.marcar_entregado`): cambio de estado + creación de la compra + suma de stock + asociación pedido↔compra, todo o nada.
- **Ajuste de inventario** (`MovimientoService`): actualización de `inventario` y registro del movimiento en la misma transacción.
- **Usuarios:** no se puede desactivar ni quitar el rol a uno mismo, ni dejar el sistema sin administrador activo.

### 2. Errores esperados: respuesta clara, sin efectos secundarios

| Fallo | Respuesta | Estado de los datos |
|-------|-----------|---------------------|
| Regla de negocio (stock insuficiente, precio ≤ 0, código duplicado…) | HTTP 400 con `detail` en español | Sin cambios (rollback) |
| Violación de `CHECK`/`UNIQUE` en PostgreSQL (última barrera) | La excepción propaga y la sesión se descarta | Sin cambios (rollback) |
| Pedido ya entregado/cancelado | 400 ("El pedido ya no está en espera") por `UPDATE … WHERE estado = …` | Sin doble entrega |
| Token inválido | 401; la pantalla borra el token y recarga | — |

### 3. Dependencia caída: PostgreSQL o la API no responden

- **No hay modo sin conexión ni cola local.** Si PostgreSQL está apagado, las operaciones fallan (error de conexión → la pantalla muestra un mensaje genérico, "No se pudo completar la operación."); no se aceptan ventas "pendientes de sincronizar", porque eso rompería la integridad del inventario.
- `pool_pre_ping=True` descarta conexiones muertas del pool (p. ej. tras reiniciar PostgreSQL), así que **al volver la base, la API se recupera sola** sin reiniciarla.
- Si la API está apagada, la pantalla no puede operar; en el login se distingue con `ServerUnavailableError` ("No se pudo conectar con el servidor. Intenta de nuevo más tarde.").
- Una caída a mitad de una transacción deja la operación sin confirmar: PostgreSQL la revierte, por lo que el comercio verá la venta como no registrada y debe repetirla.

### 4. Modo degradado deliberado: la bitácora es de "mejor esfuerzo"

`BitacoraService.registrar` se ejecuta **después** de confirmar la operación principal, en su propia transacción, y **captura y descarta cualquier excepción**. Consecuencia buscada: si falla el registro de auditoría, la venta, compra o ajuste **no se pierde ni se revierte**. Costo aceptado: puede haber operaciones sin entrada en `bitacora`. Lo que sí es de integridad estricta es el rastro de inventario (`movimientos_manuales`/`detalle_movimiento`), que va **dentro** de la transacción principal.

### 5. Degradaciones de seguridad ante fallos

- El limitador de intentos de login está en memoria: si el proceso se reinicia, los contadores se reinician (ADR-0007).
- Si falta `SECRET_KEY` (o tiene menos de 32 caracteres), la API **se niega a arrancar** (`RuntimeError`) en lugar de firmar tokens con una clave débil: es un *fail-fast* intencional.

### 6. Reintentos y recuperación

El servidor **no reintenta** automáticamente operaciones con efectos (evita duplicar ventas). La recuperación es manual: el usuario ve el error y repite. No hay *timeouts* configurados a nivel de API más allá de los valores por defecto del servidor y del controlador.

## Limitaciones conocidas (riesgos aceptados)

1. **Concurrencia sobre el inventario:** las ventas y compras hacen *leer → modificar → guardar* sin `SELECT … FOR UPDATE` ni versión optimista. Con nivel de aislamiento `READ COMMITTED` (por defecto), dos ventas simultáneas del mismo producto podrían leer el mismo stock; la barrera final es `CHECK (cantidad >= 0)`, que impediría un stock negativo pero devolvería un error técnico en vez de un mensaje de negocio, y, en el caso de actualizaciones concurrentes sobre la misma fila sin chequeo de resultado, una puede pisar a la otra (*lost update*). Con pocas cajas es poco probable; si el comercio crece, el siguiente paso es bloquear la fila de inventario (`with_for_update`) en `InventarioRepositoryPostgres.obtener_por_producto` o actualizar con `UPDATE … SET cantidad = cantidad - :n WHERE cantidad >= :n`.
2. **Sin respaldo automático** (ADR-0005): el fallo del disco es un fallo sin recuperación si no hay copias de `pg_dump`.
3. **Sin monitoreo activo:** no hay *health check* dedicado ni alertas; la ruta `GET /` solo confirma que la API responde (ADR-0008).

## Alternativas consideradas

- **Modo sin conexión con sincronización posterior:** descartado; introduce conflictos de inventario difíciles de resolver y contradice la prioridad de integridad.
- **Reintentos automáticos con *backoff*:** descartados para operaciones de escritura por riesgo de duplicados; no existen claves de idempotencia.
- **Bitácora dentro de la transacción principal:** descartado; hacer fallar una venta por un problema de auditoría perjudica más al comercio que perder una línea de bitácora.

## Consecuencias

- Un comportamiento predecible: **o se guarda completo, o no se guarda**, y el usuario siempre sabe cuál de los dos ocurrió.
- La disponibilidad depende de que PostgreSQL y la API estén encendidos; no se promete tolerancia a fallos de infraestructura.

# ADR-0004: Estilo de comunicación entre componentes

- **Estado:** Aceptada
- **Fecha:** 2026-11-23
- **Relacionadas:** [0003](0003-limites-entre-modulos-y-contratos-internos.md), [0006](0006-comportamiento-ante-fallos-y-modo-degradado.md), [0007](0007-identidad-permisos-y-datos-sensibles.md)

## Contexto

El sistema tiene tres componentes que corren en la misma computadora: la **pantalla web** (React 19 + Vite, `localhost:5173`), la **API** (FastAPI + Uvicorn, `localhost:8000`) y **PostgreSQL** (`localhost:5432`). Hay que decidir cómo se hablan entre sí y cómo se comunican los módulos dentro del servidor.

## Decisión

### 1. Pantalla → API: REST sobre HTTP, síncrono, JSON

- Todas las operaciones son **petición/respuesta síncronas** por HTTP con cuerpo JSON, hechas con Axios (`infrastructure/api/httpClient.ts`, `baseURL: "http://localhost:8000"`).
- Recursos en plural con verbos HTTP estándar, agrupados por *router* de FastAPI: `/productos`, `/categorias`, `/inventario`, `/ventas`, `/compras`, `/proveedores`, `/pedidos`, `/movimientos`, `/usuarios`, `/bitacora`, `/auth`.
- La **autenticación** usa el flujo OAuth2 *password* de FastAPI: `POST /auth/token` (formulario con `username` = correo y `password`) devuelve `{"access_token", "token_type": "bearer"}`; después cada petición lleva `Authorization: Bearer <JWT>` (lo agrega un interceptor de Axios). Ver ADR-0007.
- **Paginación:** los listados grandes (ventas, movimientos, bitácora) aceptan `limit` (1–200) y `offset`, y devuelven el total en la cabecera `X-Total-Count`, que CORS expone explícitamente (`expose_headers`).
- **CORS:** solo se permiten los orígenes `http://localhost:5173` y `http://127.0.0.1:5173`.
- **Documentación del contrato:** FastAPI genera la especificación OpenAPI y la interfaz interactiva (`/docs`) a partir de las rutas y schemas Pydantic.

### 2. Convención de errores (contrato con la pantalla)

| Situación | Código | Cuerpo |
|-----------|--------|--------|
| Regla de negocio violada (`ErrorDeNegocio`) | 400 | `{"detail": "mensaje en español"}` (manejador global en `main.py`) |
| Token ausente/inválido/vencido | 401 | `{"detail": "No se pudieron validar las credenciales"}` + `WWW-Authenticate: Bearer` |
| Usuario desactivado o sin permiso | 403 | `{"detail": "..."}` |
| Recurso no encontrado | 404 | `{"detail": "..."}` |
| Demasiados intentos de login | 429 | `{"detail": "..."}` + `Retry-After` |
| Datos mal formados | 422 | lista de errores de validación de Pydantic |

La pantalla normaliza todo en `traducirError.ts`: si `detail` es texto lo muestra tal cual; si es una lista, muestra "Revisa que todos los datos sean válidos."; en cualquier otro caso, un mensaje genérico. Un `401` fuera del login borra el token y recarga la página.

### 3. Dentro del servidor: llamadas directas entre objetos, sin bus de eventos

- Los módulos se comunican **por llamada de método síncrona** a través de los puertos (ver ADR-0003). No hay colas, *brokers*, eventos de dominio ni tareas en segundo plano.
- La coordinación entre casos de uso es **composición explícita**: `PedidoService.marcar_entregado` llama a `CompraService.registrar_compra`, que llama a `Inventario.agregar_stock`; todo dentro de **la misma transacción** (`UnidadTrabajo`).
- La **bitácora** se escribe también por llamada directa a `BitacoraService.registrar` *después* de confirmar la operación principal, en una transacción propia y sin propagar sus errores (ver ADR-0006).

### 4. API → PostgreSQL: SQLAlchemy 2 con el controlador `psycopg` 3

Conexión TCP al servidor local (`postgresql+psycopg://`), con `pool_pre_ping=True` para detectar conexiones cortadas. Una **sesión por petición HTTP** (`get_db` con `yield` y `close` en `finally`), `autocommit=False`; el *commit* lo decide la unidad de trabajo, no las rutas ni los repositorios.

## Alternativas consideradas

- **GraphQL / gRPC:** descartados; el modelo de recursos es simple y REST se alinea con FastAPI/OpenAPI sin complejidad adicional.
- **WebSockets / SSE para actualizar en tiempo real:** descartados; con pocos usuarios, volver a consultar tras cada acción es suficiente.
- **Mensajería/eventos (cola) entre pedidos, compras e inventario:** descartado; la consistencia inmediata dentro de una transacción es más importante que el desacoplamiento temporal (ADR-0001, integridad primero).
- **Tokens por cookie `HttpOnly`:** valorado; se eligió `Authorization: Bearer` por simplicidad con un cliente SPA (ver riesgos en ADR-0007).

## Consecuencias

- Flujo simple de razonar y depurar: una petición HTTP = una transacción de negocio.
- Si la API cae, la pantalla no puede operar (no hay modo sin conexión; ver ADR-0006).
- La URL del servidor está **fija** en `httpClient.ts` (`localhost:8000`) y los orígenes CORS en `main.py`; cambiar de puerto o servir la pantalla desde otra dirección exige editar ambos sitios.
- El acoplamiento temporal entre `PedidoService` y `CompraService` es intencional: marcar un pedido como entregado y registrar la compra es una sola operación atómica.

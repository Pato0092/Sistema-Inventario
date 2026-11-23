# ADR-0008: Entornos y observabilidad

- **Estado:** Aceptada
- **Fecha:** 2026-11-23
- **Relacionadas:** [0001](0001-atributos-de-calidad.md), [0005](0005-persistencia-y-almacenamiento.md), [0006](0006-comportamiento-ante-fallos-y-modo-degradado.md), [0007](0007-identidad-permisos-y-datos-sensibles.md)

## Contexto

El sistema se distribuye como código que cada comercio instala y ejecuta **en su propia computadora** (Windows en el desarrollo actual). No hay servidores propios, ni *pipeline* de despliegue, ni un equipo que lo opere. Aun así, hace falta una forma repetible de instalar, configurar y, cuando algo falla, entender qué pasó.

## Decisión

### 1. Entornos

Solo existe el concepto de **instalación local**; no hay entornos `staging` o `producción` gestionados.

| Entorno | Para qué | Cómo se levanta |
|---------|----------|-----------------|
| **Desarrollo** | Programar y probar | Misma máquina del desarrollador: `uvicorn app.main:app` (API) y `npm run dev` (Vite, con recarga en caliente) |
| **Instalación del comercio** | Uso real | `python instalar.py`, luego `uvicorn app.main:app` y la pantalla con `npm run dev` (o `npm run build` + `npm run preview`) |

Cada instalación tiene **su propia base de datos** y su propio `.env`; para separar pruebas de datos reales basta con usar otro `DB_NAME` (o un `.env` distinto con `python instalar.py --env <ruta>`).

**Versiones de referencia:** Python 3.14, Node.js 26, PostgreSQL 18; dependencias de Python fijadas con versión exacta en `requirements.txt`; las del front con `package.json` + `package-lock.json`.

### 2. Configuración por variables de entorno (`.env`)

| Variable | Obligatoria | Uso |
|----------|-------------|-----|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Sí (`DB_PORT` por defecto 5432) | Conexión a PostgreSQL |
| `SECRET_KEY` | Sí, ≥ 32 caracteres | Firma de los JWT |
| `ALGORITHM` | No (`HS256`) | Algoritmo del JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No (`1440`) | Vigencia de la sesión |

- El `.env` real **no se versiona**; `.env.example` es la plantilla. Toda configuración se lee de ahí y no hay *flags* en código.
- **Valores fijos en código** (cambiarlos implica editar y recompilar): URL de la API en el front (`httpClient.ts`: `http://localhost:8000`) y orígenes CORS (`main.py`).

### 3. Instalación y actualización: `instalar.py`

Un solo comando e **idempotente** (se puede repetir sin borrar ni duplicar):

1. Crea o completa el `.env` (pregunta datos de PostgreSQL y genera `SECRET_KEY` si falta o es débil).
2. Crea la base de datos si no existe (`CREATE DATABASE`, con nombre validado por expresión regular).
3. Ejecuta `alembic upgrade head`.
4. Crea el primer administrador si no hay ninguno (contraseña pedida sin eco).

**Actualizar** a una versión nueva = traer el código, `pip install -r requirements.txt`, y volver a ejecutar `python instalar.py` (aplica solo las migraciones nuevas). Los errores frecuentes (PostgreSQL apagado, permisos para crear la base) se explican con mensajes en español.

### 4. Observabilidad

La observabilidad es **ligera y orientada al negocio**, no de infraestructura:

| Necesidad | Mecanismo actual |
|-----------|------------------|
| ¿Quién hizo qué y cuándo? | Tabla `bitacora` (acción, entidad, id, detalle, usuario, fecha); consulta paginada y filtrable solo para administradores (`GET /bitacora`, página *Actividad*) |
| ¿Por qué cambió el stock? | `movimientos_manuales` + `detalle_movimiento` (tipo ENTRADA/SALIDA, cantidad, **motivo obligatorio**); página *Movimientos* |
| ¿La API está viva? | `GET /` devuelve `{"mensaje": "Sistema de Inventario funcionando"}` |
| Documentación y prueba manual de la API | `/docs` y `/openapi.json` (generados por FastAPI) |
| Errores del servidor y peticiones | Salida por consola de **Uvicorn** (log de acceso y trazas de excepciones no controladas) |
| Errores de negocio | Respuesta HTTP 400 con mensaje; visible para el usuario en la pantalla |

**Lo que no existe hoy** (aceptado por el contexto): logging estructurado a archivo, correlación de peticiones, métricas, *tracing*, alertas y un *health check* que verifique la conexión a PostgreSQL. Los errores técnicos se diagnostican mirando la consola donde corre `uvicorn` y los registros de PostgreSQL.

### 5. Calidad y pruebas

- `pytest` está declarado en `requirements.txt` y `pytest.ini` define `pythonpath = .`, `testpaths = tests` y el marcador `integracion` (pruebas contra la base real dentro de una transacción que se deshace). **Actualmente el repositorio no incluye la carpeta `tests/`**: es una deuda pendiente. Gracias a la arquitectura (ADR-0003) las reglas de dominio (`Inventario`, `Producto`, `permisos.normalizar`) y los servicios con repositorios simulados se pueden probar sin base de datos.
- Frontend: `npm run lint` (oxlint) y `npm run build` (`tsc -b` + Vite) como verificación estática.
- No hay integración continua configurada.

## Alternativas consideradas

- **Contenerización (Docker/Compose):** valorada para unificar entornos; descartada por ahora porque el usuario final es un comercio con PostgreSQL ya instalado en su Windows y Docker añade una dependencia más pesada que `instalar.py`.
- **Logging estructurado + stack de métricas:** desproporcionado para una sola instancia local; la bitácora de negocio ya responde las preguntas que sí se hacen.
- **Varios entornos con configuración por archivo (`dev`/`prod`):** innecesario; un `.env` por instalación basta.

## Consecuencias

- Instalar y actualizar es simple y repetible, pero **depende de que la persona tenga PostgreSQL, Python y Node instalados**.
- Diagnosticar un fallo técnico exige acceso a la consola de la API; conviene ejecutarla de forma que sus mensajes se conserven si se quiere investigar después.
- Próximos pasos razonables, en orden: (1) crear `tests/` con pruebas del dominio y de `VentaService`/`PedidoService`; (2) añadir un endpoint `/health` que haga `SELECT 1`; (3) configurar `logging` a archivo con rotación; (4) mover la URL de la API a una variable de Vite (`VITE_API_URL`).

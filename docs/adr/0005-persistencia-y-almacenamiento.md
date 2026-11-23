# ADR-0005: Persistencia y almacenamiento

- **Estado:** Aceptada
- **Fecha:** 2026-11-23
- **Relacionadas:** [0002](0002-fuente-de-verdad-y-modelo-de-datos.md), [0003](0003-limites-entre-modulos-y-contratos-internos.md), [0006](0006-comportamiento-ante-fallos-y-modo-degradado.md), [0008](0008-entornos-y-observabilidad.md)

## Contexto

El sistema necesita guardar datos relacionales con integridad fuerte (existencias, ventas con sus detalles, usuarios con permisos) en una computadora de un comercio pequeño. El ejercicio académico original (`entregable.py`) usó primero repositorios en memoria y luego un archivo JSON para demostrar que se puede cambiar el almacenamiento sin tocar el dominio; para el sistema real había que elegir un motor definitivo.

## Decisión

### 1. PostgreSQL 18 instalado localmente como único almacén de datos

- Cada instalación usa **su propia base de datos** en el PostgreSQL de la misma computadora (por defecto `localhost:5432`, base `inventario`); nada se comparte entre instalaciones.
- Razones: transacciones ACID, restricciones `CHECK`/`UNIQUE`/`FOREIGN KEY` (imprescindibles para ADR-0002), columnas `NUMERIC` para dinero, e índices.
- No se usan cachés, colas, almacenes de objetos ni servicios externos de datos.

### 2. Acceso a datos: SQLAlchemy 2 + `psycopg` 3, detrás de repositorios

- Las consultas se hacen con el ORM de SQLAlchemy dentro de las clases `*RepositoryPostgres` (`infrastructure/repositories/`), que implementan los puertos del dominio (ADR-0003). Ninguna otra capa ejecuta SQL.
- **Configuración** por variables de entorno leídas de `.env` (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`) y compuestas con `sqlalchemy.engine.URL.create`, de modo que contraseñas con caracteres especiales no rompen la cadena de conexión.
- **Pool y sesiones:** `create_engine(..., pool_pre_ping=True)`; `sessionmaker(autoflush=False, autocommit=False)`; una sesión por petición (`get_db`).
- **Transacciones:** los repositorios solo hacen `flush()`; el `commit`/`rollback` lo ejecuta `UnidadTrabajoSqlAlchemy` al terminar el bloque `with self.unidad:` más externo.
- **Bloqueo explícito:** hoy solo `PedidoRepositoryPostgres.reemplazar_detalles` usa `SELECT … FOR UPDATE`; las transiciones de estado del pedido (`EN_ESPERA → ENTREGADO/CANCELADO`) se hacen con un `UPDATE … WHERE estado = <anterior>` atómico, que evita entregar dos veces el mismo pedido.

### 3. Esquema y migraciones con Alembic

- Tres revisiones escritas a mano, idempotentes (`IF NOT EXISTS`): `0001_esquema_base`, `0002_pedidos`, `0003_bitacora_y_caducidad` (ver ADR-0002).
- `alembic/env.py` toma la URL de `app.infrastructure.database` (el mismo `.env` que la aplicación), nunca de `alembic.ini`.
- `python instalar.py` ejecuta `alembic upgrade head` (instalaciones nuevas y actualizaciones por igual).
- Las revisiones contienen **solo estructura, nunca datos**; el primer administrador lo crea `instalar.py` mediante `UsuarioService` (así su contraseña se guarda con bcrypt).

### 4. Qué se guarda fuera de la base de datos

| Dato | Dónde | Notas |
|------|-------|-------|
| Credenciales de PostgreSQL y `SECRET_KEY` | archivo `.env` local | excluido de git (`.gitignore`); `.env.example` es la plantilla |
| Token de sesión (JWT) | `localStorage` del navegador (`just_access_token`) | ver ADR-0007 |
| Intentos fallidos de login | memoria del proceso de la API | se pierden al reiniciar (ADR-0007) |
| Archivos subidos por usuarios | **no existen** | el sistema no almacena imágenes ni documentos |
| Exportaciones CSV | se generan en el navegador (`presentation/exportar.ts`, `Blob`) | el servidor no guarda copias |

### 5. Respaldos

La base de datos es el único activo que importa. El sistema **no implementa respaldos automáticos**; se delegan a las herramientas estándar de PostgreSQL (`pg_dump`, pgAdmin) ejecutadas por quien administra la computadora. Para restaurar en otra máquina basta con restaurar el volcado, o con `python instalar.py` + restaurar datos.

## Alternativas consideradas

- **SQLite:** más fácil de instalar, pero con tipos y restricciones más laxas, peor manejo de concurrencia de escritura y sin `NUMERIC` exacto; descartado por la prioridad de integridad (ADR-0001).
- **Archivos JSON / memoria:** válidos para el ejercicio de Clean Architecture, no para datos transaccionales; se conservan solo en `entregable.py`.
- **Base de datos remota/administrada:** descartada; el objetivo del proyecto es que el comercio sea dueño de sus datos y funcione sin depender de Internet.
- **Usar `Base.metadata.create_all` en lugar de Alembic:** descartado (ADR-0002).

## Consecuencias

- Instalar PostgreSQL es un **requisito previo** para el usuario final (documentado en el README).
- Los datos no salen de la computadora; la privacidad es alta, pero **la pérdida del disco sin respaldo implica pérdida de datos**.
- Cambiar de motor (p. ej. otra base relacional) exigiría reescribir las implementaciones `*RepositoryPostgres` y las migraciones, pero no el dominio ni los servicios.
- Algunas migraciones usan SQL específico de PostgreSQL (`GENERATED ALWAYS AS IDENTITY`, `::character varying` en los `CHECK`), por lo que Alembic se usa como "ejecutor de SQL versionado", no como abstracción multi-motor.

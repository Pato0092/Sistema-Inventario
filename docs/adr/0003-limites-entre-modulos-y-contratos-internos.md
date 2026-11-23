# ADR-0003: Límites entre módulos y contratos internos

- **Estado:** Aceptada
- **Fecha:** 2026-11-23
- **Relacionadas:** [0001](0001-atributos-de-calidad.md), [0002](0002-fuente-de-verdad-y-modelo-de-datos.md), [0004](0004-estilo-de-comunicacion-entre-componentes.md)

## Contexto

El proyecto nació como ejercicio de Clean Architecture (`sistema_inventario/README.md`, `entregable.py`, con repositorios en memoria y JSON) y evolucionó a un sistema real con PostgreSQL. Había que decidir cómo organizar el código para que las reglas de negocio no dependan de FastAPI, SQLAlchemy ni de React, y para poder cambiar la persistencia sin tocarlas.

## Decisión

### 1. Clean Architecture en cuatro capas, tanto en el servidor como en la pantalla

La regla de dependencia: **el código fuente solo apunta hacia adentro, hacia el dominio.**

```
presentation ──► application ──► domain ◄── infrastructure
 (rutas, schemas)  (casos de uso)  (entidades, puertos)  (PostgreSQL, JWT, bcrypt)
```

| Capa | Servidor (`sistema_inventario/app/`) | Pantalla (`sistema-inventario-front/src/`) |
|------|--------------------------------------|---------------------------------------------|
| **Domain** | `domain/entities/`, `domain/repositories/` (puertos), `domain/seguridad.py`, `domain/unidad_trabajo.py`, `domain/permisos.py`, `domain/errores.py` | `domain/modelos.ts`, `domain/repositories/` (`AuthRepository`, `InventarioRepository`, `TokenStorage`), `domain/errors/` |
| **Application** | `application/services/*_service.py` (casos de uso) | `application/usecases/` (`LoginUseCase`, `LogoutUseCase`, `IsAuthenticatedUseCase`), `estadisticasVentas.ts` |
| **Presentation** | `presentation/routes/`, `presentation/schemas/` (Pydantic), `presentation/guardias.py` | `presentation/` (páginas, componentes, hooks, contexto de sesión) |
| **Infrastructure** | `infrastructure/repositories/`, `models/`, `database.py`, `security.py`, `rate_limit.py`, `unidad_trabajo.py`, `dependencies.py` | `infrastructure/api/` (Axios), `repositories/`, `storage/`, `container.ts` |

El dominio **no importa** FastAPI, SQLAlchemy, Pydantic ni Axios.

### 2. Los puertos son interfaces abstractas definidas en el dominio

Los casos de uso dependen de **abstracciones** (`ABC`), no de implementaciones:

- **Repositorios** (`domain/repositories/`): `ProductoRepository`, `InventarioRepository`, `VentaRepository`, `CompraRepository`, `PedidoRepository`, `UsuarioRepository`, `MovimientoRepository`, `BitacoraRepository`, `CategoriaRepository`, `ProveedorRepository`. Sus implementaciones llevan el sufijo `Postgres` (`InventarioRepositoryPostgres`, …) y viven en `infrastructure/repositories/`.
- **Seguridad** (`domain/seguridad.py`): `PasswordHasher`, `TokenProvider`, `LimitadorIntentos`. Implementados por `BcryptPasswordHasher`, `JwtTokenProvider` y `LimitadorEnMemoria`.
- **Unidad de trabajo** (`domain/unidad_trabajo.py`): `UnidadTrabajo` (usable con `with`, con *commit* al salir del bloque más externo y *rollback* ante cualquier excepción). La implementa `UnidadTrabajoSqlAlchemy`.

### 3. Las reglas viven en las entidades; la orquestación, en los servicios

- **Entidades** (comportamiento, no solo datos): `Inventario.descontar_stock(n)` y `Inventario.agregar_stock(n)` validan cantidad positiva y stock suficiente y lanzan `ErrorDeNegocio`; `Producto.validar()` exige precio > 0; `domain/permisos.py` define roles, catálogo de permisos y la normalización (un `.editar` implica su `.ver`).
- **Servicios de aplicación** (`VentaService`, `CompraService`, `MovimientoService`, `PedidoService`, `ProductoService`, `UsuarioService`, `AuthService`, `BitacoraService`, …): abren la unidad de trabajo, cargan entidades por los puertos, las hacen ejecutar las reglas y guardan. No contienen SQL.
- **Dependencias entre servicios (permitidas y dirigidas):** `ProductoService → MovimientoService`, `PedidoService → CompraService`, y varios → `BitacoraService`. No hay ciclos.

### 4. La raíz de composición es única

`app/infrastructure/dependencies.py` es el **único** lugar que une servicios con repositorios concretos (inyección vía `Depends` de FastAPI: una sesión de SQLAlchemy por petición, un `UnidadTrabajoSqlAlchemy` compartido por los componentes de esa petición). En la pantalla, esa función la cumple `infrastructure/container.ts`.

### 5. Contratos entre capas

- **Entre presentación y aplicación:** las rutas reciben *schemas* Pydantic (`presentation/schemas/`) y llaman al servicio con tipos simples o entidades; los schemas **no** son las entidades de dominio (esa separación fue lo más difícil de ubicar en el ejercicio original).
- **Entre repositorios y dominio:** los repositorios convierten modelos SQLAlchemy ↔ entidades; los modelos ORM nunca salen de `infrastructure/`.
- **Errores:** el dominio y los servicios lanzan `ErrorDeNegocio` (subclase de `ValueError`); `main.py` lo convierte globalmente en HTTP 400 `{"detail": "..."}`. La autenticación usa excepciones propias (`CredencialesInvalidas`, `UsuarioDesactivado`, `SesionInvalida`, `DemasiadosIntentos`) que las rutas/guardias traducen a 401/403/429.

## Alternativas consideradas

- **Arquitectura en capas clásica** (rutas → servicios → ORM directo): más corta, pero acopla las reglas a SQLAlchemy y complica cambiar la persistencia (que ya se cambió una vez: memoria → JSON → PostgreSQL).
- **Usar modelos ORM como entidades**: descartado para no mezclar reglas de negocio con detalles de mapeo.
- **Contenedor de inyección de dependencias externo**: innecesario; `Depends` + una función por servicio es suficiente y explícito.

## Consecuencias

- **Positivas:** las reglas se pueden probar sin base de datos ni servidor; se puede sustituir un repositorio sin tocar los casos de uso; el código de seguridad (bcrypt/JWT) es intercambiable.
- **Costo:** más archivos y mapeo manual entidad ↔ modelo; hay que mantener sincronizados los puertos y sus implementaciones.
- **Desviación pragmática aceptada:** `presentation/guardias.py` importa `get_auth_service` desde `infrastructure/dependencies.py`, y la raíz de composición vive dentro de `infrastructure/`; es el único punto donde la presentación "conoce" la infraestructura, y es por inyección.
- Ante un nuevo caso de uso: entidad/regla en `domain`, servicio en `application/services`, repositorio abstracto + implementación `Postgres`, ruta y schema en `presentation`, y cableado en `dependencies.py`.

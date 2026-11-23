# ADR-0001: Atributos de calidad priorizados

- **Estado:** Aceptada
- **Fecha:** 2026-11-23
- **Relacionadas:** [0002](0002-fuente-de-verdad-y-modelo-de-datos.md), [0003](0003-limites-entre-modulos-y-contratos-internos.md), [0006](0006-comportamiento-ante-fallos-y-modo-degradado.md), [0007](0007-identidad-permisos-y-datos-sensibles.md)

## Contexto

El Sistema de Inventario es una aplicación web para que un comercio pequeño gestione productos, existencias, ventas, compras, pedidos a proveedores, movimientos de stock y usuarios con permisos. Se instala **en la computadora del propio comercio**: PostgreSQL 18 local, API FastAPI en `localhost:8000` y pantalla React en `localhost:5173` (README, `instalar.py`). Lo usan pocas personas a la vez (cajero, encargado, administrador) y no hay un equipo de operaciones detrás.

Eso fija el terreno: no hay que escalar a miles de usuarios, pero un descuadre de inventario o una venta mal registrada tiene costo económico directo, y quien instala el sistema no es técnico.

## Decisión

Se priorizan los atributos de calidad en este orden, y cada uno se traduce en una decisión concreta ya presente en el código:

| # | Atributo | Qué significa aquí | Cómo se materializa |
|---|----------|--------------------|---------------------|
| 1 | **Integridad de los datos** | El stock nunca es negativo; una venta/compra se guarda completa o no se guarda; los totales cuadran con sus detalles. | `Inventario.descontar_stock` / `agregar_stock` en el dominio; `UnidadTrabajo` (commit/rollback atómico); `CHECK` en PostgreSQL (`cantidad >= 0`, `precio_venta > 0`, `total > 0`, estados válidos); claves foráneas `ON DELETE RESTRICT`. Ver ADR-0002 y ADR-0006. |
| 2 | **Seguridad y control de acceso** | Solo entra quien debe, y cada quien hace solo lo que su rol/permisos permiten. | JWT firmado + bcrypt, permisos granulares (`inventario.editar`, `ventas.registrar`, …), límite de intentos de login, `SECRET_KEY` obligatoria. Ver ADR-0007. |
| 3 | **Mantenibilidad / modificabilidad** | Poder cambiar reglas de negocio, la base de datos o la interfaz sin reescribir todo. | Clean Architecture en servidor y pantalla, repositorios como puertos, migraciones Alembic. Ver ADR-0003. |
| 4 | **Instalabilidad y operación simple** | Una persona sin experiencia de DevOps debe poder dejarlo funcionando. | `python instalar.py` crea `.env`, la base, las tablas (Alembic) y el primer administrador; es idempotente. Ver ADR-0008. |
| 5 | **Trazabilidad / auditabilidad** | Saber quién hizo qué y cuándo con el inventario. | Tabla `bitacora` (acciones de usuarios) y `movimientos_manuales`/`detalle_movimiento` (entradas, salidas y ajustes con motivo obligatorio). |
| 6 | **Usabilidad** | Mensajes de error comprensibles, flujo de venta rápido. | Errores de negocio devueltos como `{"detail": "..."}` en español y mostrados tal cual por la pantalla (`traducirError.ts`). |

Atributos **deliberadamente no priorizados**:

- **Escalabilidad horizontal y alta disponibilidad:** una sola instancia de API y una sola base local. No hay balanceo, réplicas ni caché.
- **Rendimiento extremo:** basta con paginar listados (`limit` máximo 200, cabecera `X-Total-Count`) e índices sobre fechas.
- **Multi-tenencia:** cada instalación tiene su propia base de datos; nada se comparte entre comercios.

## Alternativas consideradas

- **Priorizar disponibilidad/escalabilidad** (varias instancias, caché, colas): descartado; añade complejidad operativa que un comercio con una sola computadora no puede sostener y no resuelve su riesgo principal (descuadres de inventario).
- **Priorizar velocidad de desarrollo sobre mantenibilidad** (un solo módulo, sin capas): descartado; el proyecto nació como ejercicio de Clean Architecture y las reglas de stock/permisos cambian con frecuencia.

## Consecuencias

- Ante un conflicto, **gana la integridad** sobre la comodidad: por ejemplo, una venta con stock insuficiente se rechaza completa (HTTP 400) en lugar de venderse parcialmente.
- Las decisiones de los demás ADR se justifican contra esta lista; si cambia el contexto (p. ej. varios usuarios simultáneos en una red local), este ADR debe revisarse primero.
- **Limitaciones conocidas** que se aceptan hoy: no hay bloqueo de filas en el inventario (ver ADR-0006), el limitador de intentos es en memoria (ADR-0007) y el repositorio no contiene todavía una carpeta `tests/` aunque `pytest.ini` la declara (ADR-0008).

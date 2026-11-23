# ADR-0007: Identidad, permisos y datos sensibles

- **Estado:** Aceptada
- **Fecha:** 2026-11-23
- **Relacionadas:** [0001](0001-atributos-de-calidad.md), [0003](0003-limites-entre-modulos-y-contratos-internos.md), [0004](0004-estilo-de-comunicacion-entre-componentes.md), [0006](0006-comportamiento-ante-fallos-y-modo-degradado.md)

## Contexto

El sistema lo usan varias personas con responsabilidades distintas (administrador, encargado, cajero) y maneja datos con valor económico (ventas, costos, proveedores) y credenciales. Aunque corre en una computadora local, la API escucha por HTTP y la pantalla se ejecuta en un navegador, así que hacen falta identidad, autorización y manejo cuidadoso de secretos.

## Decisión

### 1. Autenticación: JWT firmado + contraseñas con bcrypt

- **Login:** `POST /auth/token` (OAuth2 *password flow*, `username` = correo). `AuthService.iniciar_sesion` verifica la contraseña con el puerto `PasswordHasher` (implementación `BcryptPasswordHasher`, `passlib` + `bcrypt`) y, si es correcta y el usuario está activo, pide al puerto `TokenProvider` (`JwtTokenProvider`, `python-jose`) un JWT.
- **Contenido del token:** solo `sub` (correo) y `exp`. Firmado con `SECRET_KEY` y algoritmo `HS256` (configurable por `ALGORITHM`). Vigencia por defecto: **1440 min (24 h)** (`ACCESS_TOKEN_EXPIRE_MINUTES`). No hay *refresh token*.
- **Validación en cada petición:** `get_usuario_actual` decodifica el token y **recarga el usuario desde la base** (`usuario_de_token`). Así, desactivar a un usuario o cambiar sus permisos **surte efecto de inmediato**, sin esperar a que caduque el token (usuario inexistente → 401; desactivado → 403).
- **Contraseñas:** nunca se guardan en claro; se almacena `password_hash` (bcrypt). Reglas: mínimo 8 y máximo 72 caracteres (límite de bcrypt); el cambio de contraseña exige la actual y que la nueva sea distinta.
- **Anti fuerza bruta:** `LimitadorEnMemoria` — 5 fallos por ventana de 300 s, con clave `IP|correo`; al excederlo, HTTP 429 con `Retry-After`. Un login correcto reinicia el contador.

### 2. Autorización: roles + permisos granulares, verificados en el servidor

- **Roles** (`domain/permisos.py`): `administrador` (todo) y `empleado` (solo lo que tenga concedido).
- **Catálogo de permisos** definido en el dominio: `inventario.ver/editar`, `categorias.ver/editar`, `proveedores.ver/editar`, `pedidos.ver/editar`, `estadisticas.ver`, `ventas.ver`, `ventas.registrar`. Se guardan en `permisos` y se asignan en `usuario_permisos`.
- **Reglas de coherencia** (`normalizar`): conceder `X.editar` concede `X.ver`; conceder `ventas.registrar` concede `ventas.ver`; un permiso desconocido se rechaza. Un administrador no necesita permisos explícitos.
- **Guardias de FastAPI** (`presentation/guardias.py`):
  - `requiere_permisos(*claves)`: pasa si el usuario es administrador **o** tiene **al menos una** de las claves (OR).
  - `requiere_admin`: solo administradores (gestión de usuarios, bitácora, registro directo de compras).
- **Principio:** la autorización se aplica **en el servidor** en cada ruta; la pantalla oculta opciones según los permisos solo por usabilidad, nunca como medida de seguridad.
- **Salvaguardas de administración** (`UsuarioService`): no puedes desactivarte ni quitarte el rol de administrador a ti mismo, y siempre debe quedar al menos un administrador activo.

### 3. Datos sensibles y secretos

| Dato | Tratamiento |
|------|-------------|
| Contraseñas de usuarios | Solo hash bcrypt; el hash no se expone en los schemas de respuesta |
| `SECRET_KEY` | Obligatoria, ≥ 32 caracteres; sin ella la API **no arranca**. `instalar.py` genera una aleatoria (`secrets.token_urlsafe(64)`) |
| Credenciales de PostgreSQL | Solo en `.env` local; `.env` está en `.gitignore`, se versiona únicamente `.env.example` sin valores |
| Contraseña al instalar | Se pide con `getpass` (no se muestra); la opción `--admin-password` existe solo para automatizar |
| Token en el navegador | `localStorage` (`just_access_token`); se borra al cerrar sesión o ante un 401 |
| Datos de negocio (ventas, costos, proveedores) | Solo en la base local; protegidos por permisos (p. ej. estadísticas y bitácora) |
| Datos personales | Mínimos: nombre y correo de usuarios internos y datos de contacto de proveedores; no hay datos de clientes finales |

La **bitácora** registra qué hizo cada usuario; el detalle no incluye contraseñas (solo se anota "contraseña restablecida").

### 4. Transporte y navegador

- CORS restringido a `http://localhost:5173` y `http://127.0.0.1:5173`.
- El tráfico entre pantalla y API va en **HTTP plano sobre `localhost`** (la misma máquina). **No se configura TLS.**

## Riesgos aceptados y siguientes pasos

1. **Token en `localStorage`:** es legible por cualquier script que se ejecute en la página (riesgo XSS). Mitigación actual: React escapa el contenido por defecto y no se carga contenido de terceros; mejora futura: cookie `HttpOnly` + `SameSite`.
2. **Sin revocación de tokens ni *refresh*:** cerrar sesión borra el token del navegador, pero un token copiado seguiría siendo válido hasta su `exp` (24 h) mientras el usuario siga activo.
3. **Limitador en memoria:** se reinicia con el proceso y no se comparte entre varios procesos *workers*; es adecuado para una sola instancia local.
4. **Sin TLS:** si el comercio expusiera la API en su red local o a Internet, habría que poner un proxy con HTTPS y ajustar `CORS`; no es el escenario actual.
5. **`datetime.utcnow()`** en la creación del token (obsoleto desde Python 3.12); funciona, pero conviene migrar a `datetime.now(timezone.utc)`.
6. Cualquier cambio de la `SECRET_KEY` invalida todas las sesiones abiertas.

## Alternativas consideradas

- **Sesiones en servidor (cookie de sesión + tabla):** permitirían revocar al instante; descartadas por añadir estado y complejidad, dado que ya se recarga el usuario por petición (esto cubre la desactivación inmediata).
- **Solo roles (sin permisos granulares):** insuficiente; un comercio necesita, por ejemplo, un cajero que venda pero no edite el inventario.
- **Sin autenticación (por ser local):** descartado; hay varios usuarios y la trazabilidad por persona es un requisito (ADR-0001).
- **Almacenar permisos dentro del JWT:** descartado; los cambios no se verían hasta que el token expirara.

## Consecuencias

- Seguridad suficiente para una instalación local de un comercio, con control de acceso real del lado del servidor y trazabilidad por usuario.
- Cualquier exposición fuera de `localhost` requiere revisar los puntos 1, 3 y 4 antes de hacerla.
- El servicio de autenticación es independiente de bcrypt/JWT (se inyectan los puertos), así que se pueden cambiar sin reescribir el caso de uso.

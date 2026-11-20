# Sistema de Inventario

Aplicación web para llevar el inventario de una tienda: productos y existencias, ventas (punto de
venta), proveedores y pedidos, estadísticas, y usuarios con permisos.

Se instala **en tu propia computadora y con tu propia base de datos**. Cada instalación es
independiente: nada se comparte con otras personas ni con quien te pasó el proyecto.

## Qué necesitas instalar

| Programa | Para qué | Probado con |
|---|---|---|
| [PostgreSQL](https://www.postgresql.org/download/) | la base de datos | 18 |
| [Python](https://www.python.org/downloads/) | el servidor | 3.14 |
| [Node.js](https://nodejs.org/) | la pantalla web | 26 |

Las versiones indicadas son con las que se desarrolló y probó; versiones cercanas deberían
funcionar, pero no se han probado. Al instalar PostgreSQL, **anota la contraseña** que te pide para
el usuario `postgres`: el instalador la va a necesitar.

## Instalación (una sola vez)

**0. Descarga el proyecto**

```powershell
git clone https://github.com/Pato0092/sistema-inventario.git
cd sistema-inventario
```

¿No usas git? En la página del repositorio pulsa **Code → Download ZIP**, descomprímelo y abre una
terminal (PowerShell) dentro de la carpeta resultante.

**1. Servidor y base de datos**

```powershell
cd sistema_inventario
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python instalar.py
```

`instalar.py` te hace unas preguntas (usuario y contraseña de tu PostgreSQL, el nombre que quieres
para tu base de datos, y tu cuenta de administrador) y se encarga de lo demás: crea la base de
datos, todas las tablas y tu primer usuario. Es seguro volver a ejecutarlo.

**2. Pantalla web**

```powershell
cd ..\sistema-inventario-front
npm install
```

## Usarlo cada día

Necesitas **dos terminales** abiertas a la vez:

```powershell
# Terminal 1 — el servidor (dentro de sistema_inventario)
venv\Scripts\activate
uvicorn app.main:app

# Terminal 2 — la pantalla (dentro de sistema-inventario-front)
npm run dev
```

Abre <http://localhost:5173> e inicia sesión con el correo y la contraseña de administrador que
creaste. Desde la sección **Usuarios** puedes crear empleados y elegir a qué secciones tienen acceso.

> Pensado para uso local. Funciona por `http` en tu misma computadora; no lo publiques en internet
> tal cual.

## Si olvidaste la contraseña del administrador

```powershell
cd sistema_inventario
venv\Scripts\activate
python instalar.py --nuevo-admin
```

Crea otro administrador con el que puedes entrar y restablecer las demás contraseñas.

## Compartir el proyecto con otra persona

Pásale la carpeta **sin** estos elementos (se regeneran en su computadora y algunos son privados):

- `sistema_inventario/.env` — **tiene tus contraseñas**; nunca lo compartas.
- `sistema_inventario/venv/`
- `sistema-inventario-front/node_modules/` y `sistema-inventario-front/dist/`

Con git esto ya es automático: `.gitignore` los excluye. Esa persona sigue esta misma guía y obtiene
su propia base de datos, vacía y separada de la tuya.

## Copias de seguridad

Tus datos viven en tu PostgreSQL, no en la carpeta del proyecto. Para respaldarlos:

```powershell
pg_dump -U postgres -d inventario -f respaldo.sql
```

(cambia `inventario` por el nombre que elegiste para tu base de datos).

## Para desarrolladores

```powershell
# Servidor
cd sistema_inventario
venv\Scripts\python.exe -m pytest        # pruebas
venv\Scripts\alembic.exe upgrade head    # aplicar migraciones pendientes

# Pantalla web
cd sistema-inventario-front
npm test                                 # pruebas de la lógica
npm run lint
npm run build
```

La documentación interactiva de la API está en <http://127.0.0.1:8000/docs> con el servidor
encendido. El servidor sigue una arquitectura por capas (`domain`, `application`, `infrastructure`,
`presentation`) y la regla de dependencias entre ellas se verifica automáticamente en
`sistema_inventario/tests/test_arquitectura.py`.

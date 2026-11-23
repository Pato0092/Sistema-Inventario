# Sistema de Inventario
Aplicación web para gestionar el inventario de una tienda: productos y existencias, ventas, compras y pedidos a proveedores, movimientos de stock y usuarios con permisos. Está pensada para pequeños comercios que quieren instalarla en su propia computadora con una base de datos PostgreSQL local.

# Equipo
- Patricio Vaca Olvera — 333325

# Stack
Python 3.14, TypeScript, FastAPI, SQLAlchemy 2, Alembic, React 19, Vite, Tailwind CSS 4, Axios y PostgreSQL 18.

# Arquitectura
Clean Architecture en el servidor (`sistema_inventario/app/`) y en la pantalla web (`sistema-inventario-front/src/`). Las dependencias apuntan siempre hacia el dominio:

- **Domain** (`domain/`): entidades, reglas de negocio y puertos (interfaces de repositorios, unidad de trabajo, hasher y tokens). No depende de ningún framework.
- **Application** (`application/services/` en el servidor, `application/` en la pantalla): casos de uso que orquestan entidades y puertos.
- **Presentation** (`presentation/`): rutas FastAPI y esquemas en el servidor; componentes, hooks y páginas React en la pantalla.
- **Infrastructure** (`infrastructure/`): repositorios PostgreSQL, SQLAlchemy, seguridad (JWT y bcrypt), cliente HTTP y la raíz de composición que conecta todo.

# Cómo correrlo
1. Requisitos: PostgreSQL 18, Python 3.14 y Node.js 26.
2. Configuración (dentro de `sistema_inventario/`):
   ```powershell
   cp .env.example .env
   ```
   Edita `.env` con `DB_NAME`, `DB_USER`, `DB_PASSWORD` y una `SECRET_KEY` (por ejemplo, la salida de `python -c "import secrets; print(secrets.token_urlsafe(64))"`).
3. Instalación y ejecución:
   ```powershell
   # Servidor (dentro de sistema_inventario)
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   python instalar.py  # crea la base, aplica migraciones y crea el administrador
   uvicorn app.main:app

   # Pantalla web (otra terminal, dentro de sistema-inventario-front)
   npm install
   npm run dev
   ```
   La aplicación queda en <http://localhost:5173> y la API en <http:localhost:8000>.

 # Documentación
- ADRs: `docs/adr/`
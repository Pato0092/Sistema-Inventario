"""Esquema base: las tablas que ya existían antes de usar Alembic.

Con esta revisión una base de datos NUEVA queda con la estructura original
completa (`alembic upgrade head` en una base vacía basta para instalar el
sistema). En una base que ya tiene estas tablas no cambia nada: todo es
`IF NOT EXISTS`. Solo contiene estructura, nunca datos.

Revision ID: 0001
Revises:
"""
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

SENTENCIAS = [
    """CREATE TABLE IF NOT EXISTS categorias (
    id_categoria integer GENERATED ALWAYS AS IDENTITY NOT NULL,
    nombre character varying(100) NOT NULL,
    estado boolean DEFAULT true NOT NULL,
    CONSTRAINT categorias_pkey PRIMARY KEY (id_categoria),
    CONSTRAINT categorias_nombre_key UNIQUE (nombre)
)""",
    """CREATE TABLE IF NOT EXISTS proveedores (
    id_proveedor integer GENERATED ALWAYS AS IDENTITY NOT NULL,
    nombre character varying(150) NOT NULL,
    telefono character varying(20),
    correo character varying(150),
    estado boolean DEFAULT true NOT NULL,
    CONSTRAINT proveedores_pkey PRIMARY KEY (id_proveedor)
)""",
    """CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario integer GENERATED ALWAYS AS IDENTITY NOT NULL,
    nombre character varying(100) NOT NULL,
    correo character varying(150) NOT NULL,
    password_hash character varying(255) NOT NULL,
    rol character varying(20) NOT NULL,
    estado boolean DEFAULT true NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT usuarios_pkey PRIMARY KEY (id_usuario),
    CONSTRAINT usuarios_correo_key UNIQUE (correo),
    CONSTRAINT chk_usuario_rol CHECK (((rol)::text = ANY ((ARRAY['administrador'::character varying, 'empleado'::character varying])::text[])))
)""",
    """CREATE TABLE IF NOT EXISTS permisos (
    id_permiso integer GENERATED ALWAYS AS IDENTITY NOT NULL,
    permiso character varying(100) NOT NULL,
    CONSTRAINT permisos_pkey PRIMARY KEY (id_permiso),
    CONSTRAINT permisos_permiso_key UNIQUE (permiso)
)""",
    """CREATE TABLE IF NOT EXISTS producto (
    id_producto integer GENERATED ALWAYS AS IDENTITY NOT NULL,
    codigo_barras character varying(50) NOT NULL,
    nombre character varying(100) NOT NULL,
    marca character varying(100),
    presentacion character varying(100),
    precio_venta numeric(10,2) NOT NULL,
    estado boolean DEFAULT true NOT NULL,
    id_categoria integer NOT NULL,
    CONSTRAINT producto_pkey PRIMARY KEY (id_producto),
    CONSTRAINT producto_codigo_barras_key UNIQUE (codigo_barras),
    CONSTRAINT chk_producto_precio CHECK ((precio_venta > (0)::numeric)),
    CONSTRAINT fk_producto_categoria FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria) ON DELETE RESTRICT
)""",
    """CREATE TABLE IF NOT EXISTS inventario (
    id_producto integer NOT NULL,
    stock_minimo integer DEFAULT 0 NOT NULL,
    cantidad integer DEFAULT 0 NOT NULL,
    CONSTRAINT inventario_pkey PRIMARY KEY (id_producto),
    CONSTRAINT chk_inventario_cantidad CHECK ((cantidad >= 0)),
    CONSTRAINT chk_inventario_stock_minimo CHECK ((stock_minimo >= 0)),
    CONSTRAINT fk_inventario_producto FOREIGN KEY (id_producto) REFERENCES producto(id_producto) ON DELETE RESTRICT
)""",
    """CREATE TABLE IF NOT EXISTS usuario_permisos (
    id_usuario integer NOT NULL,
    id_permiso integer NOT NULL,
    CONSTRAINT pk_usuario_permisos PRIMARY KEY (id_usuario, id_permiso),
    CONSTRAINT fk_usuario_permisos_permiso FOREIGN KEY (id_permiso) REFERENCES permisos(id_permiso) ON DELETE CASCADE,
    CONSTRAINT fk_usuario_permisos_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
)""",
    """CREATE TABLE IF NOT EXISTS ventas (
    id_venta integer GENERATED ALWAYS AS IDENTITY NOT NULL,
    id_usuario integer NOT NULL,
    total numeric(12,2) NOT NULL,
    fecha_hora timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    estado character varying(20) DEFAULT 'CONFIRMADA'::character varying NOT NULL,
    CONSTRAINT ventas_pkey PRIMARY KEY (id_venta),
    CONSTRAINT chk_ventas_estado CHECK (((estado)::text = ANY ((ARRAY['CONFIRMADA'::character varying, 'CANCELADA'::character varying])::text[]))),
    CONSTRAINT chk_ventas_total CHECK ((total > (0)::numeric)),
    CONSTRAINT fk_ventas_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE RESTRICT
)""",
    """CREATE INDEX IF NOT EXISTS idx_ventas_fecha_hora ON ventas USING btree (fecha_hora)""",
    """CREATE TABLE IF NOT EXISTS detalle_venta (
    id_detalle_venta integer GENERATED ALWAYS AS IDENTITY NOT NULL,
    id_venta integer NOT NULL,
    id_producto integer NOT NULL,
    cantidad integer NOT NULL,
    precio_unitario numeric(10,2) NOT NULL,
    costo_unitario numeric(10,2),
    CONSTRAINT detalle_venta_pkey PRIMARY KEY (id_detalle_venta),
    CONSTRAINT uq_detalle_venta_producto UNIQUE (id_venta, id_producto),
    CONSTRAINT chk_detalle_venta_cantidad CHECK ((precio_unitario > (0)::numeric)),
    CONSTRAINT fk_detalle_venta_producto FOREIGN KEY (id_producto) REFERENCES producto(id_producto) ON DELETE RESTRICT,
    CONSTRAINT fk_detalle_venta_venta FOREIGN KEY (id_venta) REFERENCES ventas(id_venta) ON DELETE RESTRICT
)""",
    """CREATE TABLE IF NOT EXISTS compras (
    id_compra integer GENERATED ALWAYS AS IDENTITY NOT NULL,
    id_usuario integer NOT NULL,
    id_proveedor integer NOT NULL,
    total numeric(12,2) NOT NULL,
    fecha_hora timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    estado character varying(20) DEFAULT 'CONFIRMADA'::character varying NOT NULL,
    CONSTRAINT compras_pkey PRIMARY KEY (id_compra),
    CONSTRAINT chk_compras_estado CHECK (((estado)::text = ANY ((ARRAY['CONFIRMADA'::character varying, 'CANCELADA'::character varying])::text[]))),
    CONSTRAINT chk_compras_total CHECK ((total > (0)::numeric)),
    CONSTRAINT fk_compras_proveedor FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor) ON DELETE RESTRICT,
    CONSTRAINT fk_compras_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE RESTRICT
)""",
    """CREATE INDEX IF NOT EXISTS idx_compras_fecha_hora ON compras USING btree (fecha_hora)""",
    """CREATE TABLE IF NOT EXISTS detalle_compra (
    id_detalle_compra integer GENERATED ALWAYS AS IDENTITY NOT NULL,
    id_compra integer NOT NULL,
    id_producto integer NOT NULL,
    cantidad integer NOT NULL,
    precio_proveedor numeric(10,2) NOT NULL,
    CONSTRAINT detalle_compra_pkey PRIMARY KEY (id_detalle_compra),
    CONSTRAINT uq_detalle_compra_producto UNIQUE (id_compra, id_producto),
    CONSTRAINT chk_detalle_compra_cantidad CHECK ((cantidad > 0)),
    CONSTRAINT chk_detalle_compra_precio CHECK ((precio_proveedor > (0)::numeric)),
    CONSTRAINT fk_detalle_compra_compra FOREIGN KEY (id_compra) REFERENCES compras(id_compra) ON DELETE RESTRICT,
    CONSTRAINT fk_detalle_compra_producto FOREIGN KEY (id_producto) REFERENCES producto(id_producto) ON DELETE RESTRICT
)""",
    """CREATE TABLE IF NOT EXISTS movimientos_manuales (
    id_movimiento integer GENERATED ALWAYS AS IDENTITY NOT NULL,
    id_usuario integer NOT NULL,
    fecha_hora timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT movimientos_manuales_pkey PRIMARY KEY (id_movimiento),
    CONSTRAINT fk_movimientos_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE RESTRICT
)""",
    """CREATE TABLE IF NOT EXISTS detalle_movimiento (
    id_detalle_movimiento integer GENERATED ALWAYS AS IDENTITY NOT NULL,
    id_movimiento integer NOT NULL,
    id_producto integer NOT NULL,
    cantidad integer NOT NULL,
    motivo character varying(255) NOT NULL,
    tipo character varying(20) NOT NULL,
    CONSTRAINT detalle_movimiento_pkey PRIMARY KEY (id_detalle_movimiento),
    CONSTRAINT chk_detalle_movimiento_cantidad CHECK ((cantidad > 0)),
    CONSTRAINT chk_detalle_movimiento_tipo CHECK (((tipo)::text = ANY ((ARRAY['ENTRADA'::character varying, 'SALIDA'::character varying])::text[]))),
    CONSTRAINT fk_detalle_movimiento_movimiento FOREIGN KEY (id_movimiento) REFERENCES movimientos_manuales(id_movimiento) ON DELETE RESTRICT,
    CONSTRAINT fk_detalle_movimiento_producto FOREIGN KEY (id_producto) REFERENCES producto(id_producto) ON DELETE RESTRICT
)""",
]


def upgrade() -> None:
    for sentencia in SENTENCIAS:
        op.execute(sentencia)


def downgrade() -> None:
    # Se borran en orden inverso de dependencias.
    for tabla in reversed(['categorias', 'proveedores', 'usuarios', 'permisos', 'producto', 'inventario', 'usuario_permisos', 'ventas', 'detalle_venta', 'compras', 'detalle_compra', 'movimientos_manuales', 'detalle_movimiento']):
        op.execute(f"DROP TABLE IF EXISTS {tabla} CASCADE")

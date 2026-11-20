import React, { useState } from "react";
import type {
  CategoriaDto,
  NuevoProducto,
} from "../../infrastructure/api/inventarioApi";
import type { ItemInventario } from "../hooks/useInventario";

interface ProductoModalProps {
  categorias: CategoriaDto[];
  producto?: ItemInventario;
  onClose: () => void;
  onSubmit: (producto: NuevoProducto, nuevaCategoria?: string) => Promise<void>;
}

const NUEVA = "__nueva__";

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15";

const Campo: React.FC<{
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, htmlFor, children, className = "" }) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    <label htmlFor={htmlFor} className="text-sm font-medium text-stone-700">
      {label}
    </label>
    {children}
  </div>
);

export const ProductoModal: React.FC<ProductoModalProps> = ({
  categorias: todasLasCategorias,
  producto,
  onClose,
  onSubmit,
}) => {
  const categorias = todasLasCategorias.filter(
    (c) => c.estado || c.id_categoria === producto?.id_categoria,
  );
  const editando = producto !== undefined;
  const [codigo, setCodigo] = useState(producto?.codigo_barras ?? "");
  const [nombre, setNombre] = useState(producto?.nombre ?? "");
  const [marca, setMarca] = useState(producto?.marca ?? "");
  const [presentacion, setPresentacion] = useState(producto?.presentacion ?? "");
  const [precio, setPrecio] = useState(
    producto ? String(producto.precio_venta) : "",
  );
  const [stockMinimo, setStockMinimo] = useState(
    producto ? String(producto.stock_minimo) : "0",
  );
  const [cantidad, setCantidad] = useState(
    producto ? String(producto.cantidad) : "",
  );
  const [activo, setActivo] = useState(producto?.estado ?? true);
  const [caducidad, setCaducidad] = useState(producto?.fecha_caducidad ?? "");
  const [motivo, setMotivo] = useState("");
  const [categoria, setCategoria] = useState(
    producto
      ? String(producto.id_categoria)
      : categorias.length === 0
        ? NUEVA
        : String(categorias[0].id_categoria),
  );
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cambiaCantidad =
    editando && cantidad.trim() !== "" && Number(cantidad) !== producto.cantidad;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const precioNum = Number(precio);
    if (!(precioNum > 0)) {
      setError("El precio de venta debe ser mayor a 0.");
      return;
    }
    const stockMinimoNum = Number(stockMinimo);
    if (!Number.isInteger(stockMinimoNum) || stockMinimoNum < 0) {
      setError("El stock mínimo debe ser un número entero de 0 o más.");
      return;
    }
    const cantidadNum = cantidad.trim() === "" ? 0 : Number(cantidad);
    if (!Number.isInteger(cantidadNum) || cantidadNum < 0) {
      setError("La cantidad disponible debe ser un número entero de 0 o más.");
      return;
    }
    if (cambiaCantidad && !motivo.trim()) {
      setError("Indica el motivo del cambio de cantidad (merma, conteo físico, devolución...).");
      return;
    }
    const creandoCategoria = categoria === NUEVA;
    if (creandoCategoria && !nuevaCategoria.trim()) {
      setError("Escribe el nombre de la nueva categoría.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(
        {
          codigo_barras: codigo.trim(),
          nombre: nombre.trim(),
          marca: marca.trim() || null,
          presentacion: presentacion.trim() || null,
          precio_venta: precioNum,
          estado: activo,
          stock_minimo: stockMinimoNum,
          cantidad: cantidadNum,
          fecha_caducidad: caducidad || null,
          motivo: cambiaCantidad ? motivo.trim() : null,
          id_categoria: creandoCategoria ? 0 : Number(categoria),
        },
        creandoCategoria ? nuevaCategoria.trim() : undefined,
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error.");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-auto bg-stone-900/30 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="producto-titulo"
        className="w-full max-w-lg rounded-xl border border-stone-200 bg-stone-50 p-6 shadow-xl shadow-stone-900/10"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2
              id="producto-titulo"
              className="m-0 text-xl font-bold tracking-tight text-stone-900"
            >
              {editando ? "Editar producto" : "Agregar producto"}
            </h2>
            <p className="mb-0 mt-1 text-sm text-stone-500">
              {editando
                ? "Cambiar la cantidad ajusta directamente las existencias."
                : "Si no indicas cantidad, el producto se crea con 0 unidades."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-stone-400 transition hover:bg-stone-200 hover:text-stone-700"
          >
            <svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <Campo label="Código de barras" htmlFor="np-codigo" className="col-span-2 sm:col-span-1">
            <input
              id="np-codigo"
              className={inputClass}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              required
              maxLength={50}
              autoFocus={!editando}
              placeholder="7501234567890"
            />
          </Campo>
          <Campo label="Precio de venta" htmlFor="np-precio" className="col-span-2 sm:col-span-1">
            <input
              id="np-precio"
              className={inputClass}
              type="number"
              min="0.01"
              step="0.01"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              required
              placeholder="0.00"
            />
          </Campo>
          <Campo label="Nombre" htmlFor="np-nombre" className="col-span-2">
            <input
              id="np-nombre"
              className={inputClass}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              maxLength={100}
              placeholder="Arroz blanco"
            />
          </Campo>
          <Campo label="Marca (opcional)" htmlFor="np-marca" className="col-span-2 sm:col-span-1">
            <input
              id="np-marca"
              className={inputClass}
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              maxLength={100}
            />
          </Campo>
          <Campo label="Presentación (opcional)" htmlFor="np-presentacion" className="col-span-2 sm:col-span-1">
            <input
              id="np-presentacion"
              className={inputClass}
              value={presentacion}
              onChange={(e) => setPresentacion(e.target.value)}
              maxLength={100}
              placeholder="1 kg"
            />
          </Campo>
          <Campo
            label={editando ? "Cantidad disponible" : "Cantidad disponible (opcional)"}
            htmlFor="np-cantidad"
            className="col-span-2 sm:col-span-1"
          >
            <input
              id="np-cantidad"
              className={inputClass}
              type="number"
              min="0"
              step="1"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              required={editando}
              placeholder="0"
            />
          </Campo>
          {cambiaCantidad && (
            <Campo
              label={`Motivo del cambio de cantidad (${producto.cantidad} → ${Number(cantidad)})`}
              htmlFor="np-motivo"
              className="col-span-2"
            >
              <input
                id="np-motivo"
                className={inputClass}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={200}
                required
                placeholder="Merma, conteo físico, devolución..."
              />
            </Campo>
          )}
          <Campo label="Stock mínimo" htmlFor="np-stock-minimo" className="col-span-2 sm:col-span-1">
            <input
              id="np-stock-minimo"
              className={inputClass}
              type="number"
              min="0"
              step="1"
              value={stockMinimo}
              onChange={(e) => setStockMinimo(e.target.value)}
              required
            />
          </Campo>
          <Campo label="Próxima caducidad (opcional)" htmlFor="np-caducidad" className="col-span-2 sm:col-span-1">
            <input
              id="np-caducidad"
              className={inputClass}
              type="date"
              value={caducidad}
              onChange={(e) => setCaducidad(e.target.value)}
            />
          </Campo>
          <Campo label="Categoría" htmlFor="np-categoria" className="col-span-2">
            <select
              id="np-categoria"
              className={inputClass}
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              {categorias.map((c) => (
                <option key={c.id_categoria} value={c.id_categoria}>
                  {c.nombre}
                </option>
              ))}
              <option value={NUEVA}>+ Nueva categoría</option>
            </select>
          </Campo>
          {categoria === NUEVA && (
            <Campo label="Nombre de la nueva categoría" htmlFor="np-nueva-categoria" className="col-span-2">
              <input
                id="np-nueva-categoria"
                className={inputClass}
                value={nuevaCategoria}
                onChange={(e) => setNuevaCategoria(e.target.value)}
                maxLength={100}
                placeholder="Abarrotes"
              />
            </Campo>
          )}

          <label className="col-span-2 flex cursor-pointer items-center gap-2.5 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="size-4 accent-brand-800"
            />
            Producto activo
          </label>

          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:border-stone-400"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-brand-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 active:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && (
                <span className="size-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
              )}
              {saving
                ? "Guardando..."
                : editando
                  ? "Guardar cambios"
                  : "Guardar producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
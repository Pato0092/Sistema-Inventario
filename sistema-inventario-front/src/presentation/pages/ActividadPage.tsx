import React, { useCallback, useEffect, useState } from "react";
import type { UsuarioDto } from "../../domain/modelos";
import { container } from "../../infrastructure/container";
import { descargarCsv } from "../exportar";
import { Paginador } from "../components/Paginador";
import { fechaHora } from "../formato";
import { usePaginado } from "../hooks/usePaginado";

const svgProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const entidades: [string, string][] = [
  ["producto", "Productos"],
  ["inventario", "Inventario"],
  ["categoria", "Categorías"],
  ["proveedor", "Proveedores"],
  ["pedido", "Pedidos"],
  ["venta", "Ventas"],
  ["usuario", "Usuarios"],
];
const etiquetaEntidad = Object.fromEntries(entidades);

const campo =
  "rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-800 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15";

export const ActividadPage: React.FC = () => {
  const [usuarios, setUsuarios] = useState<UsuarioDto[]>([]);
  const [idUsuario, setIdUsuario] = useState("");
  const [entidad, setEntidad] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    container.inventario.usuarios().then(setUsuarios).catch(() => setUsuarios([]));
  }, []);

  const traer = useCallback(
    (limit: number, offset: number) =>
      container.inventario.bitacora({
        id_usuario: idUsuario ? Number(idUsuario) : undefined,
        entidad: entidad || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
        limit,
        offset,
      }),
    [idUsuario, entidad, desde, hasta],
  );
  const lista = usePaginado(traer, `${idUsuario}|${entidad}|${desde}|${hasta}`);

  const exportar = async () => {
    setExportando(true);
    try {
      const todo = await lista.traerTodo();
      descargarCsv(
        "actividad",
        [
          { titulo: "Fecha", valor: (r) => fechaHora(r.fecha_hora) },
          { titulo: "Usuario", valor: (r) => r.usuario },
          { titulo: "Acción", valor: (r) => r.accion },
          { titulo: "Sección", valor: (r) => etiquetaEntidad[r.entidad] ?? r.entidad },
          { titulo: "Número", valor: (r) => r.id_entidad },
          { titulo: "Detalle", valor: (r) => r.detalle },
        ],
        todo,
      );
    } finally {
      setExportando(false);
    }
  };

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="m-0 text-3xl font-medium tracking-tight text-stone-900">
            Actividad
          </h1>
          <p className="mb-0 mt-1.5 max-w-xl text-sm text-stone-500">
            Quién hizo qué y cuándo: altas, cambios, ajustes de inventario,
            ventas y pedidos. Solo la ven los administradores.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportar}
            disabled={exportando || lista.total === 0}
            className="cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:border-brand-600 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exportando ? "Exportando..." : "Exportar CSV"}
          </button>
          <button
            onClick={lista.recargar}
            disabled={lista.loading}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:border-brand-600 hover:text-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg {...svgProps} className={lista.loading ? "animate-spin" : ""}>
              <path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" />
            </svg>
            Actualizar
          </button>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={idUsuario} onChange={(e) => setIdUsuario(e.target.value)} aria-label="Filtrar por usuario" className={campo}>
          <option value="">Todos los usuarios</option>
          {usuarios.map((u) => (
            <option key={u.id_usuario} value={u.id_usuario}>
              {u.nombre}
            </option>
          ))}
        </select>
        <select value={entidad} onChange={(e) => setEntidad(e.target.value)} aria-label="Filtrar por sección" className={campo}>
          <option value="">Todas las secciones</option>
          {entidades.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <input type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} aria-label="Desde" className={campo} />
        <span className="text-sm text-stone-400">a</span>
        <input type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} aria-label="Hasta" className={campo} />
        {(idUsuario || entidad || desde || hasta) && (
          <button
            onClick={() => {
              setIdUsuario("");
              setEntidad("");
              setDesde("");
              setHasta("");
            }}
            className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-stone-500 transition hover:text-stone-900"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {lista.error && (
        <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {lista.error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-190 border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Usuario</th>
                <th className="px-5 py-3">Acción</th>
                <th className="px-5 py-3">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {lista.items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-stone-400">
                    {lista.loading ? "Cargando actividad..." : "No hay actividad con estos filtros."}
                  </td>
                </tr>
              ) : (
                lista.items.map((r) => (
                  <tr key={r.id_bitacora} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/70">
                    <td className="whitespace-nowrap px-5 py-3.5 text-stone-500">{fechaHora(r.fecha_hora)}</td>
                    <td className="px-5 py-3.5 font-medium text-stone-900">{r.usuario ?? "Usuario eliminado"}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          r.accion === "eliminar" || r.accion === "cancelar" || r.accion === "desactivar"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-stone-100 text-stone-700"
                        }`}
                      >
                        {r.accion}
                      </span>{" "}
                      <span className="text-stone-600">
                        {etiquetaEntidad[r.entidad] ?? r.entidad}
                        {r.id_entidad !== null && <span className="text-stone-400"> #{r.id_entidad}</span>}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-stone-600">{r.detalle ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Paginador total={lista.total} offset={lista.offset} limit={lista.limit} loading={lista.loading} onChange={lista.irA} />
    </>
  );
};
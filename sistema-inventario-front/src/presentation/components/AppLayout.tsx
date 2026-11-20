import React, { useState } from "react";
import { CambiarPasswordModal } from "./CambiarPasswordModal";
import { useSesion } from "../context/SesionContext";
import { seccionesPermitidas, type Pagina } from "../navegacion";

interface AppLayoutProps {
  pagina: Pagina;
  onNavigate: (pagina: Pagina) => void;
  logout: () => void;
  children: React.ReactNode;
}

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

const etiqueta =
  "whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100";

const Marca: React.FC = () => (
  <div className="relative grid size-9 shrink-0 place-items-center rounded-lg bg-brand-900 text-white">
    <svg {...svgProps} width={18} height={18}>
      <path d="m2 7 4.4-4h11.2L22 7M2 7v13a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V7M2 7h20" />
      <path d="M16 11a4 4 0 0 1-8 0" />
    </svg>
    <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-signal-500 ring-2 ring-white" />
  </div>
);

export const AppLayout: React.FC<AppLayoutProps> = ({
  pagina,
  onNavigate,
  logout,
  children,
}) => {
  const sesion = useSesion();
  const items = seccionesPermitidas(sesion);
  const [cambiandoClave, setCambiandoClave] = useState(false);
  const rol = sesion.esAdmin ? "Administrador" : "Empleado";

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-papel text-left text-stone-800 lg:flex-row">
      {/* Barra superior (móvil) */}
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-stone-200 bg-white px-4 py-3 lg:hidden">
        <nav className="flex min-w-0 gap-1 overflow-x-auto">
          {items.map((it) => (
            <button
              key={it.id}
              onClick={() => onNavigate(it.id)}
              aria-current={pagina === it.id ? "page" : undefined}
              className={`shrink-0 cursor-pointer rounded-lg px-3 py-2 text-sm font-medium transition ${
                pagina === it.id
                  ? "bg-stone-100 text-stone-900"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              {it.label}
            </button>
          ))}
        </nav>
        <div className="flex shrink-0 items-center">
          <button
            onClick={() => setCambiandoClave(true)}
            className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-stone-500 hover:text-stone-900"
          >
            Contraseña
          </button>
          <button
            onClick={logout}
            className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-stone-500 hover:text-stone-900"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Barra lateral izquierda (escritorio). En reposo ocupa 4.5rem; al
          pasar el cursor o enfocarla se despliega hasta 16rem POR ENCIMA de
          un espacio que el contenido principal ya tiene reservado, así que ni
          lo tapa ni lo obliga a reacomodarse. */}
      <div className="relative hidden w-18 shrink-0 lg:block">
        <aside
          className="group absolute inset-y-0 left-0 z-40 flex w-18 flex-col justify-between overflow-hidden border-r border-stone-200 bg-white px-3 py-6 text-stone-600 transition-[width,box-shadow] duration-200 ease-out hover:w-64 hover:shadow-[12px_0_32px_-16px_rgb(0_0_0/0.14)] focus-within:w-64 focus-within:shadow-[12px_0_32px_-16px_rgb(0_0_0/0.14)]"
          aria-label="Navegación principal"
        >
          <div>
            <div className="ml-1.5 flex items-center gap-3">
              <Marca />
              <span
                className={`font-display text-[15px] font-medium leading-tight tracking-tight text-stone-900 ${etiqueta}`}
              >
                Sistema de
                <br />
                Inventario
              </span>
            </div>

            <nav className="mt-10 flex flex-col gap-0.5">
              {items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => onNavigate(it.id)}
                  aria-current={pagina === it.id ? "page" : undefined}
                  title={it.label}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-3.75 py-2.5 text-left text-sm font-medium transition ${
                    pagina === it.id
                      ? "relative bg-stone-100 text-stone-900 before:absolute before:-left-3 before:bottom-2.5 before:top-2.5 before:w-0.5 before:rounded-r-full before:bg-signal-500"
                      : "hover:bg-stone-50 hover:text-stone-900"
                  }`}
                >
                  <svg
                    {...svgProps}
                    className={`shrink-0 ${pagina === it.id ? "text-stone-900" : "text-stone-400"}`}
                  >
                    <path d={it.icon} />
                  </svg>
                  <span className={etiqueta}>{it.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="flex flex-col gap-2">
            <div
              className="ml-1.5 flex items-center gap-3 py-1"
              title={`${sesion.usuario.nombre} · ${rol}`}
            >
              <div className="grid size-9 shrink-0 place-items-center rounded-full bg-stone-100 text-sm font-semibold uppercase text-stone-600">
                {sesion.usuario.nombre.trim().charAt(0) || "?"}
              </div>
              <div className={`min-w-0 ${etiqueta}`}>
                <p className="m-0 truncate text-sm font-semibold text-stone-900">
                  {sesion.usuario.nombre}
                </p>
                <p className="m-0 text-xs text-stone-400">{rol}</p>
              </div>
            </div>
            <button
              onClick={() => setCambiandoClave(true)}
              title="Cambiar mi contraseña"
              className="flex cursor-pointer items-center gap-3 rounded-lg px-3.75 py-2.5 text-sm font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
            >
              <svg {...svgProps} className="shrink-0 text-stone-400">
                <path d="M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              <span className={etiqueta}>Mi contraseña</span>
            </button>
            <button
              onClick={logout}
              title="Cerrar sesión"
              className="flex cursor-pointer items-center gap-3 rounded-lg px-3.75 py-2.5 text-sm font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
            >
              <svg {...svgProps} className="shrink-0 text-stone-400">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              <span className={etiqueta}>Cerrar sesión</span>
            </button>
          </div>
        </aside>
      </div>

      {/* lg:pl-50 (12.5rem) reserva el espacio que la barra desplegada ocupa
          más allá de su ancho en reposo: 16rem - 4.5rem + 1rem de respiro. */}
      <main className="min-w-0 flex-1 overflow-auto p-6 lg:py-10 lg:pl-50 lg:pr-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
      {cambiandoClave && <CambiarPasswordModal onClose={() => setCambiandoClave(false)} />}
    </div>
  );
};

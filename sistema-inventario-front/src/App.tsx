import { useMemo, useState } from "react";
import { LoginPage } from "./presentation/pages/LoginPage";
import { InventarioPage } from "./presentation/pages/InventarioPage";
import { CategoriasPage } from "./presentation/pages/CategoriasPage";
import { ProveedoresPage } from "./presentation/pages/ProveedoresPage";
import { PedidosPage } from "./presentation/pages/PedidosPage";
import { EstadisticasPage } from "./presentation/pages/EstadisticasPage";
import { UsuariosPage } from "./presentation/pages/UsuariosPage";
import { VentasPage } from "./presentation/pages/VentasPage";
import { MovimientosPage } from "./presentation/pages/MovimientosPage";
import { ActividadPage } from "./presentation/pages/ActividadPage";
import { AppLayout } from "./presentation/components/AppLayout";
import { SesionContext, crearSesion } from "./presentation/context/SesionContext";
import { seccionesPermitidas, type Pagina } from "./presentation/navegacion";
import { useAuth } from "./presentation/hooks/useAuth";
import { useSesionActual } from "./presentation/hooks/useSesionActual";

function PantallaMensaje({
  titulo,
  detalle,
  onSalir,
}: {
  titulo: string;
  detalle?: string;
  onSalir?: () => void;
}) {
  return (
    <div className="fixed inset-0 grid place-items-center bg-papel p-6 text-center text-stone-800">
      <div className="max-w-sm">
        <p className="m-0 text-lg font-semibold text-stone-900">{titulo}</p>
        {detalle && <p className="mb-0 mt-2 text-sm text-stone-500">{detalle}</p>}
        {onSalir && (
          <button
            onClick={onSalir}
            className="mt-5 cursor-pointer rounded-lg bg-brand-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Cerrar sesión
          </button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const { isAuthenticated, logout, login, loading, error } = useAuth();
  const { usuario, cargando, error: errorSesion } =
    useSesionActual(isAuthenticated);
  const [pagina, setPagina] = useState<Pagina | null>(null);

  const sesion = useMemo(() => (usuario ? crearSesion(usuario) : null), [usuario]);

  if (!isAuthenticated) {
    return <LoginPage login={login} loading={loading} error={error} />;
  }
  if (cargando || (!usuario && !errorSesion)) {
    return <PantallaMensaje titulo="Cargando tu sesión..." />;
  }
  if (!sesion) {
    return (
      <PantallaMensaje
        titulo="No se pudo iniciar la sesión"
        detalle={errorSesion ?? undefined}
        onSalir={logout}
      />
    );
  }

  const permitidas = seccionesPermitidas(sesion);
  const actual = permitidas.find((s) => s.id === pagina)?.id ?? permitidas[0]?.id;
  if (!actual) {
    return (
      <PantallaMensaje
        titulo="Tu cuenta aún no tiene permisos"
        detalle="Pide a un administrador que te asigne acceso a las secciones que necesitas."
        onSalir={logout}
      />
    );
  }

  return (
    <SesionContext.Provider value={sesion}>
      <AppLayout pagina={actual} onNavigate={setPagina} logout={logout}>
        {actual === "inventario" && <InventarioPage />}
        {actual === "movimientos" && <MovimientosPage />}
        {actual === "ventas" && <VentasPage />}
        {actual === "categorias" && <CategoriasPage />}
        {actual === "proveedores" && <ProveedoresPage />}
        {actual === "pedidos" && <PedidosPage />}
        {actual === "estadisticas" && <EstadisticasPage />}
        {actual === "usuarios" && <UsuariosPage />}
        {actual === "actividad" && <ActividadPage />}
      </AppLayout>
    </SesionContext.Provider>
  );
}
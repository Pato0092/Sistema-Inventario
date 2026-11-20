import React, { useState } from "react";
import { Segmentado } from "../components/charts";
import { useSesion } from "../context/SesionContext";
import { useInventario } from "../hooks/useInventario";
import { HistorialVentas } from "./ventas/HistorialVentas";
import { PuntoDeVenta } from "./ventas/PuntoDeVenta";

type Vista = "nueva" | "historial";

export const VentasPage: React.FC = () => {
  const { tiene } = useSesion();
  const puedeVender = tiene("ventas.registrar");
  const inventario = useInventario();
  const [vista, setVista] = useState<Vista>(puedeVender ? "nueva" : "historial");
  const [version, setVersion] = useState(0);

  const alVender = async () => {
    await inventario.recargar();
    setVersion((v) => v + 1);
  };

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="m-0 text-3xl font-medium tracking-tight text-stone-900">Ventas</h1>
          <p className="mb-0 mt-1.5 text-sm text-stone-500">
            {vista === "nueva"
              ? "Busca o escanea los productos, revisa el total y cobra."
              : "Todas las ventas registradas, de la más reciente a la más antigua."}
          </p>
        </div>
        {puedeVender && (
          <Segmentado
            opciones={[["nueva", "Nueva venta"], ["historial", "Historial"]] as const}
            valor={vista}
            onChange={setVista}
          />
        )}
      </header>

      {inventario.error && (
        <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {inventario.error}
        </div>
      )}

      {vista === "nueva" && puedeVender ? (
        <PuntoDeVenta
          items={inventario.items}
          cargandoInventario={inventario.loading}
          recargarInventario={alVender}
        />
      ) : (
        <HistorialVentas items={inventario.items} version={version} />
      )}
    </>
  );
};
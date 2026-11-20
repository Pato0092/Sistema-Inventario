import React, { useState } from "react";
import { Segmentado } from "../components/charts";
import { PanelInventario } from "./estadisticas/PanelInventario";
import { PanelVentas } from "./estadisticas/PanelVentas";

type Vista = "ventas" | "inventario";

export const EstadisticasPage: React.FC = () => {
  const [vista, setVista] = useState<Vista>("ventas");

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="m-0 text-3xl font-medium tracking-tight text-stone-900">
            Estadísticas
          </h1>
          <p className="mb-0 mt-1.5 text-sm text-stone-500">
            {vista === "ventas"
              ? "Qué se vende, qué deja más ganancia y cómo cambia con el tiempo."
              : "Resumen de los productos activos del inventario."}
          </p>
        </div>
        <Segmentado
          opciones={[["ventas", "Ventas e historial"], ["inventario", "Inventario actual"]] as const}
          valor={vista}
          onChange={setVista}
        />
      </header>

      {vista === "ventas" ? <PanelVentas /> : <PanelInventario />}
    </>
  );
};

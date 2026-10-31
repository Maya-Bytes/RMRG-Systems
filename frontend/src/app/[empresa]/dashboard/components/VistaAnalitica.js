import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend, CartesianGrid
} from "recharts";
import { BarChart3, PieChart as PieIcon, Laptop } from "lucide-react";

const COLORES_AREAS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6"];
const COLORES_EQUIPOS = {
  "Asignado": "#2563eb",
  "Disponible": "#10b981",
  "En Reparación": "#f59e0b"
};

export default function VistaAnalitica({
  listaEmpleados,
  listaTickets,
  listaEquipos,
  colorMarca
}) {
  // 1. Masa salarial agrupada por Rol en Sistema
  const mapaRoles = {};
  listaEmpleados.filter(e => e.isActive).forEach(emp => {
    const rolCorto = emp.rol
      .replace("Admin de ", "Adm. ")
      .replace("Recursos Humanos", "RH")
      .replace("Super Administrador", "Super Admin");
    if (!mapaRoles[rolCorto]) {
      mapaRoles[rolCorto] = { rol: rolCorto, salarioTotal: 0, empleados: 0 };
    }
    mapaRoles[rolCorto].salarioTotal += Number(emp.salarioBase || 0);
    mapaRoles[rolCorto].empleados += 1;
  });
  const dataSalariosPorRol = Object.values(mapaRoles);

  // 2. Tickets agrupados por Área Destino (IT, HR, FINANCE, GENERAL)
  const conteoAreas = { IT: 0, HR: 0, FINANCE: 0, GENERAL: 0 };
  listaTickets.forEach(tk => {
    conteoAreas[tk.targetArea] = (conteoAreas[tk.targetArea] || 0) + 1;
  });
  const dataTicketsArea = [
    { name: "TI / Sistemas", value: conteoAreas.IT },
    { name: "Recursos Humanos", value: conteoAreas.HR },
    { name: "Finanzas", value: conteoAreas.FINANCE },
    { name: "General", value: conteoAreas.GENERAL }
  ].filter(item => item.value > 0);

  // 3. Estado del Inventario de Hardware TI
  const conteoEquipos = { "Asignado": 0, "Disponible": 0, "En Reparación": 0 };
  listaEquipos.forEach(eq => {
    conteoEquipos[eq.status] = (conteoEquipos[eq.status] || 0) + 1;
  });
  const dataEquipos = Object.entries(conteoEquipos).map(([name, cantidad]) => ({
    name,
    cantidad,
    fill: COLORES_EQUIPOS[name] || "#64748b"
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      {/* GRÁFICA 1: MASA SALARIAL POR ROL */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 size={17} style={{ color: colorMarca }} />
              Distribución de Masa Salarial Mensual por Rol (MXN)
            </h4>
            <p className="text-xs text-slate-500">Suma de sueldos base de colaboradores activos</p>
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataSalariosPorRol} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="rol" tick={{ fontSize: 11, fill: "#475569" }} />
              <YAxis
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: "#475569" }}
              />
              <Tooltip
                formatter={(value) => [`$${Number(value).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`, "Masa Salarial"]}
                contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "12px" }}
              />
              <Bar dataKey="salarioTotal" fill={colorMarca} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GRÁFICA 2: DEMANDA DE HELPDESK POR DEPARTAMENTO */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <PieIcon size={17} style={{ color: colorMarca }} />
            Tickets por Departamento
          </h4>
          <p className="text-xs text-slate-500">Distribución de solicitudes en Helpdesk</p>
        </div>

        <div className="h-52 w-full">
          {dataTicketsArea.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Sin tickets registrados
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataTicketsArea}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={70}
                  paddingAngle={4}
                >
                  {dataTicketsArea.map((_, index) => (
                    <Cell key={index} fill={COLORES_AREAS[index % COLORES_AREAS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "10px", fontSize: "12px" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* MINI INDICADOR DE ACTIVOS TI */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-600 flex items-center gap-1.5">
            <Laptop size={14} /> Estado Hardware TI:
          </span>
          <div className="flex gap-2">
            {dataEquipos.map((eq) => (
              <span key={eq.name} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
                {eq.name}: {eq.cantidad}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
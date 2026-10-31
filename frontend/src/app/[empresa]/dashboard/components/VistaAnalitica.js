import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend, CartesianGrid
} from "recharts";
import { BarChart3, PieChart as PieIcon, Laptop, Users, CircleDollarSign } from "lucide-react";

const COLORES_PASTEL = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

export default function VistaAnalitica({
  perfil,
  listaEmpleados = [],
  listaTickets = [],
  listaEquipos = [],
  colorMarca
}) {
  const rol = perfil?.rolSistema || "";
  const esRH = ["Admin de Recursos Humanos", "Analista HR"].includes(rol);
  const esTI = ["Admin de IT", "Soporte IT"].includes(rol);

  const empleadosActivos = listaEmpleados.filter(e => e.isActive);

  // =========================================================
  // CASO 1: ANALÍTICA EXCLUSIVA PARA RECURSOS HUMANOS (Sin Sueldos)
  // =========================================================
  if (esRH) {
    const mapaRolesRH = {};
    empleadosActivos.forEach(emp => {
      const rolCorto = emp.rol
        .replace("Admin de ", "Adm. ")
        .replace("Recursos Humanos", "RH")
        .replace("Super Administrador", "Dirección");
      if (!mapaRolesRH[rolCorto]) mapaRolesRH[rolCorto] = { rol: rolCorto, colaboradores: 0 };
      mapaRolesRH[rolCorto].colaboradores += 1;
    });
    const dataHeadcount = Object.values(mapaRolesRH);

    const conteoContratos = { Indefinido: 0, Temporal: 0, Honorarios: 0 };
    empleadosActivos.forEach(emp => {
      conteoContratos[emp.tipoContrato] = (conteoContratos[emp.tipoContrato] || 0) + 1;
    });
    const dataContratos = Object.entries(conteoContratos)
      .map(([name, value]) => ({ name, value }))
      .filter(i => i.value > 0);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm lg:col-span-2">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Users size={17} style={{ color: colorMarca }} />
            Distribución de Plantilla Activa por Rol (Headcount)
          </h4>
          <p className="text-xs text-slate-500 mb-4">Número de colaboradores activos por puesto y área</p>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataHeadcount}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="rol" tick={{ fontSize: 11, fill: "#475569" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#475569" }} />
                <Tooltip formatter={(val) => [`${val} colaborador(es)`, "Plantilla"]} />
                <Bar dataKey="colaboradores" fill={colorMarca} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <PieIcon size={17} style={{ color: colorMarca }} />
              Modalidad de Contratos RH
            </h4>
            <p className="text-xs text-slate-500">Proporción de contratos vigentes</p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dataContratos} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={72} paddingAngle={4}>
                  {dataContratos.map((_, i) => <Cell key={i} fill={COLORES_PASTEL[i % COLORES_PASTEL.length]} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // CASO 2: ANALÍTICA EXCLUSIVA PARA SISTEMAS / TI
  // =========================================================
  if (esTI) {
    const mapaTipos = {};
    listaEquipos.forEach(eq => {
      if (!mapaTipos[eq.deviceType]) mapaTipos[eq.deviceType] = { tipo: eq.deviceType, cantidad: 0 };
      mapaTipos[eq.deviceType].cantidad += 1;
    });
    const dataTiposHardware = Object.values(mapaTipos);

    const conteoEstados = { Asignado: 0, Disponible: 0, "En Reparación": 0 };
    listaEquipos.forEach(eq => {
      conteoEstados[eq.status] = (conteoEstados[eq.status] || 0) + 1;
    });
    const dataEstadosTI = Object.entries(conteoEstados)
      .map(([name, value]) => ({ name, value }))
      .filter(i => i.value > 0);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm lg:col-span-2">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Laptop size={17} style={{ color: colorMarca }} />
            Inventario Tecnológico por Tipo de Dispositivo
          </h4>
          <p className="text-xs text-slate-500 mb-4">Unidades registradas en el padrón de TI</p>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataTiposHardware}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="tipo" tick={{ fontSize: 11, fill: "#475569" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#475569" }} />
                <Tooltip formatter={(val) => [`${val} unidad(es)`, "Activos TI"]} />
                <Bar dataKey="cantidad" fill={colorMarca} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <PieIcon size={17} style={{ color: colorMarca }} />
              Disponibilidad de Hardware TI
            </h4>
            <p className="text-xs text-slate-500">Asignados vs. Disponibles en almacén</p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dataEstadosTI} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={72} paddingAngle={4}>
                  {dataEstadosTI.map((_, i) => <Cell key={i} fill={COLORES_PASTEL[i % COLORES_PASTEL.length]} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // CASO 3: FINANZAS Y SUPER ADMINISTRADOR (Masa Salarial y Global)
  // =========================================================
  const mapaSalarios = {};
  empleadosActivos.forEach(emp => {
    const rolCorto = emp.rol
      .replace("Admin de ", "Adm. ")
      .replace("Recursos Humanos", "RH")
      .replace("Super Administrador", "Super Admin");
    if (!mapaSalarios[rolCorto]) {
      mapaSalarios[rolCorto] = { rol: rolCorto, salarioTotal: 0 };
    }
    mapaSalarios[rolCorto].salarioTotal += Number(emp.salarioBase || 0);
  });
  const dataSalariosPorRol = Object.values(mapaSalarios);

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <CircleDollarSign size={17} style={{ color: colorMarca }} />
              Distribución de Masa Salarial Mensual por Rol (MXN)
            </h4>
            <p className="text-xs text-slate-500">Suma de sueldos base de colaboradores activos en el tabulador</p>
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

      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <PieIcon size={17} style={{ color: colorMarca }} />
            Tickets por Departamento
          </h4>
          <p className="text-xs text-slate-500">Distribución de solicitudes en Helpdesk</p>
        </div>

        <div className="h-56 w-full">
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
                    <Cell key={index} fill={COLORES_PASTEL[index % COLORES_PASTEL.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "10px", fontSize: "12px" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
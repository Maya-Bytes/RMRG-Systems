import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend, CartesianGrid
} from "recharts";
import {
  PieChart as PieIcon, Laptop, Users, CircleDollarSign,
  Ticket, Bell, ArrowRight
} from "lucide-react";

const COLORES_PASTEL = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

export default function VistaAnalitica({
  perfil,
  listaEmpleados = [],
  listaTickets = [],
  listaEquipos = [],
  listaNotificaciones = [],
  colorMarca,
  cambiarModulo
}) {
  const rol = perfil?.rolSistema || "";
  const esRH = ["Admin de Recursos Humanos", "Analista HR"].includes(rol);
  const esTI = ["Admin de IT", "Soporte IT"].includes(rol);
  const esFinanzas = ["Admin de Finanzas", "Contador"].includes(rol);

  const empleadosActivos = listaEmpleados.filter(e => e.isActive);
  const ticketsRecientes = listaTickets.slice(0, 4);
  const notificacionesRecientes = listaNotificaciones.slice(0, 4);

  const moduloPrincipalRol = esRH
    ? "Recursos Humanos"
    : esTI
      ? "Equipos TI"
      : esFinanzas
        ? "Finanzas"
        : "Recursos Humanos";

  // Renderizado de gráficas según el silo departamental
  const renderGraficas = () => {
    // 1. RECURSOS HUMANOS (Sin sueldos)
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

    // 2. SISTEMAS / TI
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

    // 3. FINANZAS Y SUPER ADMINISTRADOR
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
  };

  return (
    <div className="space-y-6">
      {renderGraficas()}

      {/* PANELES DE ACTIVIDAD RECIENTE Y ACCESO RÁPIDO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ÚLTIMOS TICKETS EN HELPDESK */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Ticket size={16} style={{ color: colorMarca }} />
                  Solicitudes Recientes en Helpdesk
                </h4>
                <p className="text-xs text-slate-500">Últimos reportes registrados en el corporativo</p>
              </div>
              {cambiarModulo && (
                <button
                  onClick={() => cambiarModulo("Helpdesk Tickets")}
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  Ir a Helpdesk <ArrowRight size={13} />
                </button>
              )}
            </div>

            {ticketsRecientes.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">No hay tickets recientes.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {ticketsRecientes.map((tk) => (
                  <div key={tk.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{tk.title}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        Área: <span className="font-semibold">{tk.targetArea}</span> • Por {tk.creator?.firstName} {tk.creator?.lastName}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      tk.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                      tk.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                      tk.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {tk.status === 'REJECTED' ? 'RECHAZADO' : tk.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {cambiarModulo && (
            <div className="pt-4 mt-2 border-t border-slate-100 flex justify-between items-center">
              <span className="text-xs text-slate-500">Acceso directo a tu módulo operativo</span>
              <button
                onClick={() => cambiarModulo(moduloPrincipalRol)}
                style={{ backgroundColor: colorMarca }}
                className="px-3.5 py-1.5 rounded-lg text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                Abrir {moduloPrincipalRol} <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>

        {/* ÚLTIMAS NOTIFICACIONES RECIBIDAS */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Bell size={16} style={{ color: colorMarca }} />
              Mis Avisos y Movimientos Recientes
            </h4>
            <p className="text-xs text-slate-500">Notificaciones directas de nómina, equipos y soporte</p>
          </div>

          {notificacionesRecientes.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">No tienes avisos recientes.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {notificacionesRecientes.map((n) => (
                <div key={n.id} className="py-2.5 flex justify-between items-start gap-3">
                  <p className="text-xs text-slate-700 leading-relaxed">{n.message}</p>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {new Date(n.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
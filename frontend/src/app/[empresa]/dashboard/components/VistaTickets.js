import { useState } from "react";
import { Plus, Clock, CheckCircle2, Lock, UserCheck, Inbox, Send } from "lucide-react";

const MAPA_AREA_POR_ROL = {
  "Admin de Recursos Humanos": "HR",
  "Analista HR": "HR",
  "Admin de IT": "IT",
  "Soporte IT": "IT",
  "Admin de Finanzas": "FINANCE",
  "Contador": "FINANCE"
};

const ETIQUETA_AREA = {
  IT: "Sistemas / TI",
  HR: "Recursos Humanos",
  FINANCE: "Finanzas y Nómina",
  GENERAL: "Servicios Generales"
};

export default function VistaTickets({
  perfil,
  colorMarca,
  listaTickets = [],
  ticketsFiltrados = [],
  filtroAreaTicket,
  setFiltroAreaTicket,
  abrirModalTicket,
  cambiarEstadoTicket
}) {
  const [subTab, setSubTab] = useState("DEPARTAMENTO"); // "DEPARTAMENTO" | "MIS_TICKETS"

  const todosLosTickets = listaTickets.length > 0 ? listaTickets : ticketsFiltrados;
  const esSuperAdmin = perfil.rolSistema === "Super Administrador";
  const esOperativo = perfil.rolSistema === "Operativo";
  const esAdminArea = ["Admin de IT", "Admin de Recursos Humanos", "Admin de Finanzas"].includes(perfil.rolSistema);
  const areaDeMiRol = MAPA_AREA_POR_ROL[perfil.rolSistema] || null;

  // 1. Tickets de la bandeja del departamento correspondiente
  const ticketsDeMiDepartamento = todosLosTickets.filter(tk => {
    if (esSuperAdmin) {
      return filtroAreaTicket === "TODOS" ? true : tk.targetArea === filtroAreaTicket;
    }
    if (areaDeMiRol) {
      return tk.targetArea === areaDeMiRol;
    }
    return tk.creatorId === perfil.userId;
  });

  // 2. Tickets que el propio usuario logueado ha levantado
  const misPropiosTickets = todosLosTickets.filter(tk =>
    tk.creator?.numeroEmpleado === perfil.numeroEmpleado || tk.creatorId === perfil.userId
  );

  const listaAMostrar = (esOperativo || subTab === "MIS_TICKETS")
    ? misPropiosTickets
    : ticketsDeMiDepartamento;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 flex flex-wrap gap-4 justify-between items-center bg-gray-50/50">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            {esSuperAdmin
              ? "Mesa de Ayuda Global (Todos los Departamentos)"
              : areaDeMiRol
                ? `Helpdesk — Bandeja Exclusiva de ${ETIQUETA_AREA[areaDeMiRol]}`
                : "Mis Solicitudes de Soporte"}
          </h3>
          <p className="text-xs text-gray-500">
            {esSuperAdmin
              ? "Supervisión transversal de tickets de TI, Recursos Humanos y Finanzas"
              : areaDeMiRol
                ? `Solo se muestran tickets dirigidos a ${ETIQUETA_AREA[areaDeMiRol]} y tus solicitudes personales`
                : "Seguimiento en tiempo real de tus reportes"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Pestañas para personal de departamento: Bandeja del Área vs Mis Solicitudes */}
          {!esOperativo && (
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
              <button
                onClick={() => setSubTab("DEPARTAMENTO")}
                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  subTab === "DEPARTAMENTO" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Inbox size={14} /> Bandeja del Área ({ticketsDeMiDepartamento.length})
              </button>
              <button
                onClick={() => setSubTab("MIS_TICKETS")}
                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  subTab === "MIS_TICKETS" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Send size={14} /> Mis Tickets Levantados ({misPropiosTickets.length})
              </button>
            </div>
          )}

          {/* Selector de todas las áreas EXCLUSIVO para el Super Administrador */}
          {esSuperAdmin && subTab === "DEPARTAMENTO" && (
            <select
              value={filtroAreaTicket}
              onChange={(e) => setFiltroAreaTicket(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 font-semibold"
            >
              <option value="TODOS">Todas las Áreas</option>
              <option value="IT">Área: TI</option>
              <option value="HR">Área: Recursos Humanos</option>
              <option value="FINANCE">Área: Finanzas</option>
              <option value="GENERAL">Área: General</option>
            </select>
          )}

          <button
            onClick={abrirModalTicket}
            style={{ backgroundColor: colorMarca }}
            className="text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={15} /> Nuevo Ticket
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {listaAMostrar.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">
            No hay tickets registrados en esta bandeja.
          </div>
        ) : (
          listaAMostrar.map((tk) => {
            const esMio = tk.creator?.numeroEmpleado === perfil.numeroEmpleado || tk.creatorId === perfil.userId;
            const tomadoPorOtro = tk.assignedTo && tk.assignedTo.id !== perfil.userId;
            const tomadoPorMi = tk.assignedTo && tk.assignedTo.id === perfil.userId;
            const puedeResolver = esSuperAdmin || esAdminArea || tomadoPorMi || (!tk.assignedTo && !esMio);

            return (
              <div
                key={tk.id}
                className={`p-6 transition-colors flex flex-col md:flex-row justify-between gap-4 ${
                  esMio && !esOperativo && subTab === "DEPARTAMENTO"
                    ? "bg-slate-100/80 opacity-80"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-200 text-slate-800">
                      {tk.targetArea}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      tk.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                      tk.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                      tk.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {tk.status}
                    </span>
                    {esMio && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-300 text-slate-800">
                        Solicitud propia
                      </span>
                    )}
                    <h4 className="text-base font-bold text-gray-900">{tk.title}</h4>
                  </div>
                  <p className="text-sm text-gray-600">{tk.description}</p>
                  <p className="text-xs text-gray-500 pt-1">
                    Reportado por: <span className="font-semibold text-gray-700">{tk.creator?.firstName} {tk.creator?.lastName} ({tk.creator?.numeroEmpleado})</span>
                    {tk.assignedTo && (
                      <span className="ml-2 inline-flex items-center gap-1 text-blue-700 font-semibold">
                        • <UserCheck size={13} /> Atendido por: {tk.assignedTo.firstName} {tk.assignedTo.lastName}
                      </span>
                    )}
                  </p>
                </div>

                {/* ACCIONES DE ATENCIÓN CON CANDADO DE EXCLUSIVIDAD Y ANTI AUTO-ATENCIÓN */}
                {!esOperativo && subTab === "DEPARTAMENTO" && tk.status !== "RESOLVED" && (
                  <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                    {esMio && !esSuperAdmin ? (
                      <span className="px-3 py-1.5 text-xs font-semibold bg-slate-200 text-slate-600 rounded-lg flex items-center gap-1.5">
                        <Lock size={13} /> Sin auto-atención (Debe atender otro compañero)
                      </span>
                    ) : tomadoPorOtro && !esSuperAdmin && !esAdminArea ? (
                      <span className="px-3 py-1.5 text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 rounded-lg flex items-center gap-1.5">
                        <Lock size={13} /> En atención por {tk.assignedTo.firstName}
                      </span>
                    ) : (
                      <>
                        {tk.status === "PENDING" && !tk.assignedTo && (
                          <button
                            onClick={() => cambiarEstadoTicket(tk.id, "IN_PROGRESS")}
                            className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg flex items-center gap-1"
                          >
                            <Clock size={14} /> Tomar Ticket
                          </button>
                        )}
                        {puedeResolver && (
                          <button
                            onClick={() => cambiarEstadoTicket(tk.id, "RESOLVED")}
                            className="px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-100 rounded-lg flex items-center gap-1"
                          >
                            <CheckCircle2 size={14} /> Marcar Resuelto
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
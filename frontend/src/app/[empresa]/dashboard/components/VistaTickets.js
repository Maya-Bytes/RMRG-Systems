import { useState } from "react";
import {
  Plus, Clock, CheckCircle2, XCircle, Lock,
  UserCheck, Inbox, Send, Image as ImageIcon, X, Search
} from "lucide-react";

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
  const [subTab, setSubTab] = useState("DEPARTAMENTO");
  const [busqueda, setBusqueda] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("TODOS");

  // Modales de Resolución, Rechazo y Evidencia
  const [ticketAResolver, setTicketAResolver] = useState(null);
  const [notaResolucion, setNotaResolucion] = useState("");
  const [ticketARechazar, setTicketARechazar] = useState(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [imagenPreview, setImagenPreview] = useState(null);

  const todosLosTickets = listaTickets.length > 0 ? listaTickets : ticketsFiltrados;
  const esSuperAdmin = perfil.rolSistema === "Super Administrador";
  const esOperativo = perfil.rolSistema === "Operativo";
  const esAdminArea = ["Admin de IT", "Admin de Recursos Humanos", "Admin de Finanzas"].includes(perfil.rolSistema);
  const areaDeMiRol = MAPA_AREA_POR_ROL[perfil.rolSistema] || null;

  const ticketsDeMiDepartamento = todosLosTickets.filter(tk => {
    if (esSuperAdmin) {
      return filtroAreaTicket === "TODOS" ? true : tk.targetArea === filtroAreaTicket;
    }
    if (areaDeMiRol) {
      return tk.targetArea === areaDeMiRol;
    }
    return tk.creatorId === perfil.userId;
  });

  const misPropiosTickets = todosLosTickets.filter(tk =>
    tk.creator?.numeroEmpleado === perfil.numeroEmpleado || tk.creatorId === perfil.userId
  );

  const baseLista = (esOperativo || subTab === "MIS_TICKETS")
    ? misPropiosTickets
    : ticketsDeMiDepartamento;

  const listaAMostrar = baseLista.filter(tk => {
    if (filtroStatus !== "TODOS" && tk.status !== filtroStatus) return false;
    const q = busqueda.toLowerCase().trim();
    if (!q) return true;
    const creador = `${tk.creator?.numeroEmpleado || ""} ${tk.creator?.firstName || ""} ${tk.creator?.lastName || ""}`.toLowerCase();
    return (
      tk.title?.toLowerCase().includes(q) ||
      tk.description?.toLowerCase().includes(q) ||
      tk.targetArea?.toLowerCase().includes(q) ||
      creador.includes(q)
    );
  });

  const confirmarResolucion = async (e) => {
    e.preventDefault();
    if (!ticketAResolver) return;
    await cambiarEstadoTicket(ticketAResolver.id, "RESOLVED", "", notaResolucion.trim());
    setTicketAResolver(null);
    setNotaResolucion("");
  };

  const confirmarRechazo = async (e) => {
    e.preventDefault();
    if (!ticketARechazar || !motivoRechazo.trim()) return;
    await cambiarEstadoTicket(ticketARechazar.id, "REJECTED", motivoRechazo.trim(), "");
    setTicketARechazar(null);
    setMotivoRechazo("");
  };

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
              ? "Supervisión transversal, notas de solución y rechazo justificado de tickets"
              : areaDeMiRol
                ? `Solo se muestran tickets dirigidos a ${ETIQUETA_AREA[areaDeMiRol]} y tus solicitudes personales`
                : "Seguimiento en tiempo real de tus reportes"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar asunto, usuario..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white text-slate-900 font-medium border border-slate-300 rounded-lg focus:outline-none focus:border-slate-800 w-44"
            />
          </div>

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-900 font-semibold"
          >
            <option value="TODOS">Todos los estatus</option>
            <option value="PENDING">Pendientes</option>
            <option value="IN_PROGRESS">En Progreso</option>
            <option value="RESOLVED">Resueltos</option>
            <option value="REJECTED">Rechazados</option>
          </select>

          {!esOperativo && (
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
              <button
                onClick={() => setSubTab("DEPARTAMENTO")}
                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  subTab === "DEPARTAMENTO" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Inbox size={14} /> Bandeja ({ticketsDeMiDepartamento.length})
              </button>
              <button
                onClick={() => setSubTab("MIS_TICKETS")}
                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  subTab === "MIS_TICKETS" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Send size={14} /> Mis Tickets ({misPropiosTickets.length})
              </button>
            </div>
          )}

          {esSuperAdmin && subTab === "DEPARTAMENTO" && (
            <select
              value={filtroAreaTicket}
              onChange={(e) => setFiltroAreaTicket(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-900 font-semibold"
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
            className="text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={15} /> Nuevo Ticket
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {listaAMostrar.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">
            No se encontraron tickets en esta bandeja con los filtros actuales.
          </div>
        ) : (
          listaAMostrar.map((tk) => {
            const esMio = tk.creator?.numeroEmpleado === perfil.numeroEmpleado || tk.creatorId === perfil.userId;
            const tomadoPorOtro = tk.assignedTo && tk.assignedTo.id !== perfil.userId;
            const tomadoPorMi = tk.assignedTo && tk.assignedTo.id === perfil.userId;
            const puedeAccionar = esSuperAdmin || esAdminArea || tomadoPorMi || (!tk.assignedTo && !esMio);
            const estaCerrado = tk.status === "RESOLVED" || tk.status === "REJECTED";

            return (
              <div
                key={tk.id}
                className={`p-6 transition-colors flex flex-col md:flex-row justify-between gap-4 ${
                  esMio && !esOperativo && subTab === "DEPARTAMENTO"
                    ? "bg-slate-100/80 opacity-80"
                    : tk.status === "REJECTED"
                      ? "bg-red-50/30"
                      : "hover:bg-gray-50"
                }`}
              >
                <div className="space-y-1.5 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-200 text-slate-800">
                      {tk.targetArea}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      tk.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                      tk.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                      tk.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      {tk.status === 'REJECTED' ? 'RECHAZADO' : tk.status === 'RESOLVED' ? 'RESUELTO' : tk.status}
                    </span>
                    {esMio && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-300 text-slate-800">
                        Solicitud propia
                      </span>
                    )}
                    <h4 className="text-base font-bold text-gray-900">{tk.title}</h4>
                  </div>

                  <p className="text-sm text-gray-700 whitespace-pre-line">{tk.description}</p>

                  {tk.attachmentUrl && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setImagenPreview(tk.attachmentUrl)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200 transition-colors"
                      >
                        <ImageIcon size={14} className="text-blue-600" /> Ver captura de evidencia (.PNG)
                      </button>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 pt-1">
                    Reportado por: <span className="font-semibold text-gray-700">{tk.creator?.firstName} {tk.creator?.lastName} ({tk.creator?.numeroEmpleado})</span>
                    {tk.assignedTo && (
                      <span className={`ml-2 inline-flex items-center gap-1 font-semibold ${tk.status === 'REJECTED' ? 'text-red-700' : 'text-blue-700'}`}>
                        • <UserCheck size={13} /> {tk.status === 'REJECTED' ? 'Rechazado por:' : 'Atendido por:'} {tk.assignedTo.firstName} {tk.assignedTo.lastName}
                      </span>
                    )}
                  </p>
                </div>

                {/* BOTONES DE ACCIÓN: TOMAR, RESOLVER Y RECHAZAR */}
                {!esOperativo && subTab === "DEPARTAMENTO" && !estaCerrado && (
                  <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
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
                            className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition-colors"
                          >
                            <Clock size={14} /> Tomar Ticket
                          </button>
                        )}
                        {puedeAccionar && (
                          <>
                            <button
                              onClick={() => {
                                setTicketAResolver(tk);
                                setNotaResolucion("");
                              }}
                              className="px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg flex items-center gap-1 transition-colors"
                            >
                              <CheckCircle2 size={14} /> Marcar Resuelto
                            </button>
                            <button
                              onClick={() => {
                                setTicketARechazar(tk);
                                setMotivoRechazo("");
                              }}
                              className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg flex items-center gap-1 transition-colors"
                            >
                              <XCircle size={14} /> Rechazar
                            </button>
                          </>
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

      {/* MODAL PARA RESOLVER TICKET CON NOTA DE SOLUCIÓN */}
      {ticketAResolver && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-emerald-100 flex justify-between items-center bg-emerald-50/60">
              <h3 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" /> Cerrar y Resolver Ticket
              </h3>
              <button onClick={() => setTicketAResolver(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={confirmarResolucion} className="p-6 space-y-4">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <p className="font-bold text-slate-800">{ticketAResolver.title}</p>
                <p className="text-slate-500 mt-0.5">
                  Solicitante: {ticketAResolver.creator?.firstName} {ticketAResolver.creator?.lastName} ({ticketAResolver.creator?.numeroEmpleado})
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Acción o Solución Aplicada (Se notificará al colaborador)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ej. Se entregó constancia firmada / Se actualizó configuración del equipo..."
                  value={notaResolucion}
                  onChange={(e) => setNotaResolucion(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 bg-white text-slate-900 font-medium border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTicketAResolver(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  Confirmar Resolución
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA CONFIRMAR RECHAZO DE TICKET CON MOTIVO */}
      {ticketARechazar && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-red-100 flex justify-between items-center bg-red-50/60">
              <h3 className="text-base font-bold text-red-900 flex items-center gap-2">
                <XCircle size={18} className="text-red-600" /> Rechazar Solicitud de Soporte
              </h3>
              <button onClick={() => setTicketARechazar(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={confirmarRechazo} className="p-6 space-y-4">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <p className="font-bold text-slate-800">{ticketARechazar.title}</p>
                <p className="text-slate-500 mt-0.5">
                  Solicitante: {ticketARechazar.creator?.firstName} {ticketARechazar.creator?.lastName} ({ticketARechazar.creator?.numeroEmpleado})
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Motivo del Rechazo (Se notificará al colaborador)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ej. Esta solicitud requiere autorización previa de tu gerencia o no corresponde a soporte..."
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 bg-white text-slate-900 font-medium border border-slate-300 rounded-lg focus:outline-none focus:border-red-600"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTicketARechazar(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm"
                >
                  Confirmar Rechazo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VISOR DE EVIDENCIA ADJUNTA */}
      {imagenPreview && (
        <div
          onClick={() => setImagenPreview(null)}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
        >
          <div className="relative max-w-3xl max-h-[85vh] bg-white p-3 rounded-2xl shadow-2xl">
            <button
              onClick={() => setImagenPreview(null)}
              className="absolute -top-3 -right-3 bg-red-600 text-white p-1.5 rounded-full shadow-lg"
            >
              <X size={16} />
            </button>
            <img src={imagenPreview} alt="Evidencia del ticket" className="max-h-[78vh] w-auto object-contain rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}
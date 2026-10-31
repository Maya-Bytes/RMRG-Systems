import { Plus, Clock, CheckCircle2 } from "lucide-react";

export default function VistaTickets({
  perfil,
  colorMarca,
  ticketsFiltrados,
  filtroAreaTicket,
  setFiltroAreaTicket,
  abrirModalTicket,
  cambiarEstadoTicket
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 flex flex-wrap gap-4 justify-between items-center bg-gray-50/50">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Mesa de Ayuda Transversal (Helpdesk)</h3>
          <p className="text-xs text-gray-500">Solicitudes de soporte para TI, Recursos Humanos y Finanzas</p>
        </div>
        <div className="flex items-center gap-3">
          {perfil.rolSistema !== "Operativo" && (
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
            className="text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <Plus size={16} /> Nuevo Ticket
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {ticketsFiltrados.map((tk) => (
          <div key={tk.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col md:flex-row justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700">
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
                <h4 className="text-base font-bold text-gray-900">{tk.title}</h4>
              </div>
              <p className="text-sm text-gray-600">{tk.description}</p>
              <p className="text-xs text-gray-400 pt-1">
                Reportado por: <span className="font-medium text-gray-600">{tk.creator?.firstName} {tk.creator?.lastName} ({tk.creator?.numeroEmpleado})</span>
                {tk.assignedTo && ` • Atendido por: ${tk.assignedTo.firstName} ${tk.assignedTo.lastName}`}
              </p>
            </div>

            {perfil.rolSistema !== "Operativo" && tk.status !== "RESOLVED" && (
              <div className="flex items-center gap-2 self-start md:self-center">
                {tk.status === "PENDING" && (
                  <button
                    onClick={() => cambiarEstadoTicket(tk.id, "IN_PROGRESS")}
                    className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg flex items-center gap-1"
                  >
                    <Clock size={14} /> Tomar Ticket
                  </button>
                )}
                <button
                  onClick={() => cambiarEstadoTicket(tk.id, "RESOLVED")}
                  className="px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-100 rounded-lg flex items-center gap-1"
                >
                  <CheckCircle2 size={14} /> Marcar Resuelto
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
import { useState } from "react";
import { FileSpreadsheet, Plus, FileText, Search, Edit3 } from "lucide-react";
import { exportarInventarioTIExcel, descargarResponsivaTIPDF } from "../utils/reporteador";

export default function VistaTI({
  perfil,
  tenantInfo,
  colorMarca,
  empresa,
  listaEquipos = [],
  listaEmpleados = [],
  actualizarEquipo,
  abrirModalNuevoEquipo,
  abrirModalEditarEquipo,
  abrirModalEquipo,
  mostrarToast
}) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");

  const puedeGestionarTI = ["Super Administrador", "Admin de IT", "Soporte IT"].includes(perfil.rolSistema);

  const notificarError = (msg) => {
    if (mostrarToast) mostrarToast(msg, "error");
    else alert(msg);
  };

  const handleCambioEmpleado = (eq, nuevoEmpleadoId) => {
    if (!puedeGestionarTI) return;
    if (nuevoEmpleadoId) {
      actualizarEquipo(eq.id, "Asignado", nuevoEmpleadoId);
    } else {
      actualizarEquipo(eq.id, "Disponible", null);
    }
  };

  const handleCambioEstado = (eq, nuevoEstado) => {
    if (!puedeGestionarTI) return;
    if (nuevoEstado === "Disponible" || nuevoEstado === "En Reparación") {
      actualizarEquipo(eq.id, nuevoEstado, null);
    } else if (nuevoEstado === "Asignado") {
      if (!eq.assignedToId) {
        notificarError("Selecciona primero un colaborador en la columna 'Empleado Asignado'");
        return;
      }
      actualizarEquipo(eq.id, "Asignado", eq.assignedToId);
    }
  };

  const equiposFiltrados = listaEquipos.filter(eq => {
    if (filtroEstado !== "TODOS" && eq.status !== filtroEstado) return false;
    const q = busqueda.toLowerCase().trim();
    if (!q) return true;
    const responsable = eq.assignedTo
      ? `${eq.assignedTo.numeroEmpleado} ${eq.assignedTo.firstName} ${eq.assignedTo.lastName}`.toLowerCase()
      : "";
    return (
      eq.serialNumber?.toLowerCase().includes(q) ||
      eq.deviceType?.toLowerCase().includes(q) ||
      eq.model?.toLowerCase().includes(q) ||
      eq.status?.toLowerCase().includes(q) ||
      responsable.includes(q)
    );
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 flex flex-wrap gap-3 justify-between items-center bg-gray-50/50">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Inventario de Hardware y Activos TI</h3>
          <p className="text-xs text-gray-500">Control de laptops, números de serie, asignación validada y cartas responsivas membretadas en PDF</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar serie, modelo, usuario..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs bg-white text-slate-900 font-medium border border-slate-300 rounded-lg focus:outline-none focus:border-slate-800 w-52"
            />
          </div>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 font-semibold"
          >
            <option value="TODOS">Todos los estados ({listaEquipos.length})</option>
            <option value="Asignado">Asignados</option>
            <option value="Disponible">Disponibles en almacén</option>
            <option value="En Reparación">En Reparación</option>
          </select>

          <button
            onClick={() => exportarInventarioTIExcel(listaEquipos, empresa)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <FileSpreadsheet size={15} /> Exportar (.xlsx)
          </button>

          {puedeGestionarTI && (
            <button
              onClick={abrirModalNuevoEquipo || abrirModalEquipo}
              style={{ backgroundColor: colorMarca }}
              className="text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:opacity-95"
            >
              <Plus size={15} /> Registrar Equipo
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
              <th className="px-6 py-4 font-semibold">No. de Serie</th>
              <th className="px-6 py-4 font-semibold">Tipo / Modelo</th>
              <th className="px-6 py-4 font-semibold">Empleado Asignado</th>
              <th className="px-6 py-4 font-semibold">Estado</th>
              <th className="px-6 py-4 font-semibold text-right">Herramientas TI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {equiposFiltrados.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-xs text-slate-400">
                  No se encontraron activos de TI que coincidan con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              equiposFiltrados.map((eq) => (
                <tr key={eq.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono font-bold text-gray-900">{eq.serialNumber}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-bold mr-1.5">
                      {eq.deviceType}
                    </span>
                    <span className="font-semibold text-slate-900">{eq.model}</span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <select
                      disabled={!puedeGestionarTI}
                      value={eq.assignedToId || ""}
                      onChange={(e) => handleCambioEmpleado(eq, e.target.value)}
                      className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 font-medium disabled:bg-slate-100 disabled:text-slate-500"
                    >
                      <option value="">-- Sin asignar (En almacén) --</option>
                      {listaEmpleados.filter(e => e.isActive).map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.numeroEmpleado} - {emp.nombreCompleto}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      disabled={!puedeGestionarTI}
                      value={eq.status}
                      onChange={(e) => handleCambioEstado(eq, e.target.value)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border disabled:opacity-75 ${
                        eq.status === 'Asignado' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        eq.status === 'Disponible' ? 'bg-green-50 text-green-700 border-green-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      <option value="Disponible" className="text-slate-900 bg-white">Disponible (En almacén)</option>
                      <option value="Asignado" className="text-slate-900 bg-white">Asignado</option>
                      <option value="En Reparación" className="text-slate-900 bg-white">En Reparación</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => descargarResponsivaTIPDF(eq, { tenantInfo, colorMarca })}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                    >
                      <FileText size={14} /> Responsiva PDF
                    </button>
                    {puedeGestionarTI && abrirModalEditarEquipo && (
                      <button
                        onClick={() => abrirModalEditarEquipo(eq)}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                      >
                        <Edit3 size={14} /> Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
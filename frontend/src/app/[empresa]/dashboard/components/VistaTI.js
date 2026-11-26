import { useState } from "react";
import {
  FileSpreadsheet, Plus, FileText, Search, Edit3,
  Laptop, Users, KeyRound
} from "lucide-react";
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
  resetearPasswordEmpleado,
  mostrarToast
}) {
  const [subVista, setSubVista] = useState("INVENTARIO"); // "INVENTARIO" | "USUARIOS"
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

  const q = busqueda.toLowerCase().trim();

  const equiposFiltrados = listaEquipos.filter(eq => {
    if (filtroEstado !== "TODOS" && eq.status !== filtroEstado) return false;
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

  const usuariosFiltrados = listaEmpleados.filter(emp => {
    if (!q) return true;
    return (
      emp.numeroEmpleado?.toLowerCase().includes(q) ||
      emp.nombreCompleto?.toLowerCase().includes(q) ||
      emp.email?.toLowerCase().includes(q) ||
      emp.rol?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 flex flex-wrap gap-3 justify-between items-center bg-gray-50/50">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            {subVista === "INVENTARIO"
              ? "Inventario de Hardware y Activos TI"
              : "Gestión de Cuentas y Restablecimiento de Accesos (TI)"}
          </h3>
          <p className="text-xs text-gray-500">
            {subVista === "INVENTARIO"
              ? "Control de equipos, números de serie, asignación validada y cartas responsivas en PDF"
              : "Directorio básico de cuentas corporativas para soporte técnico y reseteo de contraseñas"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={subVista === "INVENTARIO" ? "Buscar serie, modelo, usuario..." : "Buscar ID, nombre, correo..."}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs bg-white text-slate-900 font-medium border border-slate-300 rounded-lg focus:outline-none focus:border-slate-800 w-52"
            />
          </div>

          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
            <button
              onClick={() => setSubVista("INVENTARIO")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors ${
                subVista === "INVENTARIO" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Laptop size={14} /> Hardware ({listaEquipos.length})
            </button>
            <button
              onClick={() => setSubVista("USUARIOS")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors ${
                subVista === "USUARIOS" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users size={14} /> Cuentas y Accesos ({listaEmpleados.length})
            </button>
          </div>

          {subVista === "INVENTARIO" && (
            <>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 font-semibold"
              >
                <option value="TODOS">Todos los estados</option>
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
            </>
          )}
        </div>
      </div>

      {/* SUB-VISTA 1: INVENTARIO DE HARDWARE */}
      {subVista === "INVENTARIO" && (
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
      )}

      {/* SUB-VISTA 2: CUENTAS BÁSICAS DE USUARIOS Y RESET DE CONTRASEÑA (TI) */}
      {subVista === "USUARIOS" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                <th className="px-6 py-4 font-semibold">ID / Usuario</th>
                <th className="px-6 py-4 font-semibold">Correo de Acceso</th>
                <th className="px-6 py-4 font-semibold">Rol de Sistema</th>
                <th className="px-6 py-4 font-semibold">Equipos a Cargo</th>
                <th className="px-6 py-4 font-semibold">Cuenta</th>
                <th className="px-6 py-4 font-semibold text-right">Soporte de Acceso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-xs text-slate-400">
                    No se encontraron usuarios que coincidan con "{busqueda}".
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((emp) => {
                  const equiposUsuario = listaEquipos.filter(eq => eq.assignedToId === emp.id);
                  return (
                    <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-900">
                          <span className="font-mono text-slate-500 mr-1.5">{emp.numeroEmpleado}</span>
                          {emp.nombreCompleto}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-700">{emp.email}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-700">{emp.rol}</td>
                      <td className="px-6 py-4">
                        {equiposUsuario.length === 0 ? (
                          <span className="text-xs text-slate-400">Sin equipo</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {equiposUsuario.map(eq => (
                              <span
                                key={eq.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-mono font-semibold"
                              >
                                {eq.serialNumber}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${emp.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {emp.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {puedeGestionarTI && resetearPasswordEmpleado ? (
                          <button
                            disabled={!emp.isActive}
                            onClick={() => resetearPasswordEmpleado(emp)}
                            title={emp.isActive ? "Restablecer contraseña temporal (Admin123!)" : "Cuenta inactiva"}
                            className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <KeyRound size={13} /> Reset Clave
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Sin permisos</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
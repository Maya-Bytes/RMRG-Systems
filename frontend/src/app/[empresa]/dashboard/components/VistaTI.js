import { FileSpreadsheet, Plus, FileText } from "lucide-react";
import { exportarInventarioTIExcel, descargarResponsivaTIPDF } from "../utils/reporteador";

export default function VistaTI({
  perfil,
  tenantInfo,
  colorMarca,
  empresa,
  listaEquipos,
  listaEmpleados,
  actualizarEquipo,
  abrirModalEquipo
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 flex flex-wrap gap-3 justify-between items-center bg-gray-50/50">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Inventario de Hardware y Activos TI</h3>
          <p className="text-xs text-gray-500">Control de laptops, números de serie, exportación y cartas responsivas en PDF</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportarInventarioTIExcel(listaEquipos, empresa)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5"
          >
            <FileSpreadsheet size={15} /> Exportar Inventario (.xlsx)
          </button>
          {["Super Administrador", "Admin de IT"].includes(perfil.rolSistema) && (
            <button
              onClick={abrirModalEquipo}
              style={{ backgroundColor: colorMarca }}
              className="text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5"
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
              <th className="px-6 py-4 font-semibold text-right">Resguardo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {listaEquipos.map((eq) => (
              <tr key={eq.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-mono font-bold text-gray-900">{eq.serialNumber}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{eq.deviceType} - <span className="font-semibold">{eq.model}</span></td>
                <td className="px-6 py-4 text-sm">
                  <select
                    value={eq.assignedToId || ""}
                    onChange={(e) => actualizarEquipo(eq.id, e.target.value ? "Asignado" : "Disponible", e.target.value || null)}
                    className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-900 font-medium"
                  >
                    <option value="">-- Sin asignar (En almacén) --</option>
                    {listaEmpleados.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.numeroEmpleado} - {emp.nombreCompleto}</option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4">
                  <select
                    value={eq.status}
                    onChange={(e) => actualizarEquipo(eq.id, e.target.value, eq.assignedToId)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      eq.status === 'Asignado' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      eq.status === 'Disponible' ? 'bg-green-50 text-green-700 border-green-200' :
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    <option value="Disponible" className="text-slate-900 bg-white">Disponible</option>
                    <option value="Asignado" className="text-slate-900 bg-white">Asignado</option>
                    <option value="En Reparación" className="text-slate-900 bg-white">En Reparación</option>
                  </select>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => descargarResponsivaTIPDF(eq, { tenantInfo, colorMarca })}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <FileText size={14} /> Responsiva PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
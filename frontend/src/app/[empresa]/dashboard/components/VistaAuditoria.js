import { ShieldAlert, FileSpreadsheet } from "lucide-react";
import { exportarAuditoriaExcel } from "../utils/reporteador";

export default function VistaAuditoria({ listaAuditoria, empresa }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 flex flex-wrap gap-3 justify-between items-center bg-slate-900 text-white">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2"><ShieldAlert size={20} /> Caja Negra de Auditoría (Audit_Log)</h3>
          <p className="text-xs text-slate-400">Registro inmutable de movimientos críticos dentro del corporativo</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportarAuditoriaExcel(listaAuditoria, empresa)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
          >
            <FileSpreadsheet size={14} /> Exportar Bitácora (.xlsx)
          </button>
          <span className="text-xs font-mono bg-slate-800 px-3 py-1 rounded-full text-emerald-400 border border-slate-700">
            {listaAuditoria.length} eventos
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
              <th className="px-6 py-4 font-semibold">Fecha y Hora</th>
              <th className="px-6 py-4 font-semibold">Autor / Usuario</th>
              <th className="px-6 py-4 font-semibold">Acción Ejecutada</th>
              <th className="px-6 py-4 font-semibold">Tabla Afectada</th>
              <th className="px-6 py-4 font-semibold">ID Registro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {listaAuditoria.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-400">
                  Aún no hay eventos registrados en la Caja Negra. Realiza alguna acción para comenzar a auditar.
                </td>
              </tr>
            ) : (
              listaAuditoria.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3.5 text-xs font-mono text-gray-500">
                    {new Date(log.createdAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'medium' })}
                  </td>
                  <td className="px-6 py-3.5">
                    <p className="text-sm font-bold text-gray-900">{log.user?.firstName} {log.user?.lastName}</p>
                    <p className="text-xs text-gray-500">ID: {log.user?.numeroEmpleado}</p>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-800">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-xs font-mono text-blue-700 font-semibold">{log.tableName}</td>
                  <td className="px-6 py-3.5 text-xs font-mono text-gray-500">{log.recordId}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
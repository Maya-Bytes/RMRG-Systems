import { FileSpreadsheet, Plus, Download } from "lucide-react";
import { exportarNominasExcel, descargarReciboNominaPDF } from "../utils/reporteador";

export default function VistaFinanzas({
  listaNominas,
  empresa,
  tenantInfo,
  perfil,
  colorMarca,
  abrirModalNomina
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 flex flex-wrap gap-3 justify-between items-center bg-gray-50/50">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Dispersión, Recibos PDF e Historial de Nómina</h3>
          <p className="text-xs text-gray-500">Emisión de pagos, descarga de recibo interno en PDF y reporte contable en Excel</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportarNominasExcel(listaNominas, empresa)}
            className="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5"
          >
            <FileSpreadsheet size={15} /> Exportar Nómina (.xlsx)
          </button>
          <button
            onClick={abrirModalNomina}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Plus size={15} /> Dispersar Pago de Nómina
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
              <th className="px-6 py-4 font-semibold">Empleado</th>
              <th className="px-6 py-4 font-semibold">Fecha de Pago</th>
              <th className="px-6 py-4 font-semibold">Monto Neto Dispersado</th>
              <th className="px-6 py-4 font-semibold">Estatus</th>
              <th className="px-6 py-4 font-semibold text-right">Comprobante</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {listaNominas.map((nom) => (
              <tr key={nom.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-gray-900">{nom.user?.numeroEmpleado} - {nom.user?.firstName} {nom.user?.lastName}</p>
                  <p className="text-xs text-gray-500">{nom.user?.email}</p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(nom.paymentDate).toLocaleDateString('es-MX', { dateStyle: 'medium' })}
                </td>
                <td className="px-6 py-4 text-sm font-bold text-emerald-700">
                  ${Number(nom.amountNet).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    {nom.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => descargarReciboNominaPDF(nom, { tenantInfo, perfil, colorMarca })}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <Download size={14} /> Recibo PDF
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
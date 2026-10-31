import { useState } from "react";
import { FileSpreadsheet, Plus, Download, DollarSign, Check, Receipt } from "lucide-react";
import { exportarNominasExcel, descargarReciboNominaPDF, exportarEmpleadosExcel } from "../utils/reporteador";

export default function VistaFinanzas({
  listaNominas = [],
  listaEmpleados = [],
  empresa,
  tenantInfo,
  perfil,
  colorMarca,
  abrirModalNomina,
  actualizarSalarioTabulador
}) {
  const [subVista, setSubVista] = useState("NOMINAS"); // "NOMINAS" | "TABULADOR"
  const [editandoId, setEditandoId] = useState(null);
  const [nuevoSueldo, setNuevoSueldo] = useState("");

  const puedeEditarTabulador = ["Super Administrador", "Admin de Finanzas"].includes(perfil.rolSistema);

  const guardarSueldo = async (userId) => {
    if (!nuevoSueldo || isNaN(parseFloat(nuevoSueldo))) return;
    await actualizarSalarioTabulador(userId, parseFloat(nuevoSueldo));
    setEditandoId(null);
    setNuevoSueldo("");
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 flex flex-wrap gap-4 justify-between items-center bg-gray-50/50">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Módulo de Finanzas, Tabulador Salarial y Nómina</h3>
          <p className="text-xs text-gray-500">Control exclusivo de sueldos base, dispersión masiva con bonos/descuentos y recibos PDF</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Selector de Pestaña Financiera */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
            <button
              onClick={() => setSubVista("NOMINAS")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors ${
                subVista === "NOMINAS" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Receipt size={14} /> Pagos Dispersados ({listaNominas.length})
            </button>
            <button
              onClick={() => setSubVista("TABULADOR")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors ${
                subVista === "TABULADOR" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <DollarSign size={14} /> Tabulador Salarial ({listaEmpleados.length})
            </button>
          </div>

          {subVista === "NOMINAS" ? (
            <button
              onClick={() => exportarNominasExcel(listaNominas, empresa)}
              className="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5"
            >
              <FileSpreadsheet size={15} /> Exportar Nómina (.xlsx)
            </button>
          ) : (
            <button
              onClick={() => exportarEmpleadosExcel(listaEmpleados, empresa, true)}
              className="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5"
            >
              <FileSpreadsheet size={15} /> Exportar Tabulador (.xlsx)
            </button>
          )}

          <button
            onClick={abrirModalNomina}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={15} /> Dispersar Nómina (Lote / Individual)
          </button>
        </div>
      </div>

      {/* SUB-VISTA 1: HISTORIAL DE NÓMINAS DISPERSADAS */}
      {subVista === "NOMINAS" && (
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
      )}

      {/* SUB-VISTA 2: TABULADOR SALARIAL (ASIGNACIÓN DE SUELDOS POR FINANZAS) */}
      {subVista === "TABULADOR" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                <th className="px-6 py-4 font-semibold">ID / Colaborador</th>
                <th className="px-6 py-4 font-semibold">Puesto / Rol</th>
                <th className="px-6 py-4 font-semibold">Contrato</th>
                <th className="px-6 py-4 font-semibold">Salario Base Mensual</th>
                <th className="px-6 py-4 font-semibold text-right">Ajuste Salarial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {listaEmpleados.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-gray-900">{emp.numeroEmpleado} - {emp.nombreCompleto}</p>
                    <p className="text-xs text-gray-500">{emp.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-800">{emp.puesto}</p>
                    <p className="text-xs text-gray-500">{emp.rol}</p>
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-slate-600">{emp.tipoContrato}</td>
                  <td className="px-6 py-4">
                    {editandoId === emp.id ? (
                      <input
                        type="number"
                        step="0.01"
                        value={nuevoSueldo}
                        onChange={(e) => setNuevoSueldo(e.target.value)}
                        className="w-36 px-3 py-1.5 text-sm font-bold text-slate-900 bg-white border-2 border-emerald-500 rounded-lg"
                      />
                    ) : (
                      <span className="text-sm font-bold text-emerald-700">
                        ${Number(emp.salarioBase).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {puedeEditarTabulador ? (
                      editandoId === emp.id ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => guardarSueldo(emp.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-1"
                          >
                            <Check size={14} /> Guardar
                          </button>
                          <button
                            onClick={() => setEditandoId(null)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditandoId(emp.id);
                            setNuevoSueldo(String(emp.salarioBase || 0));
                          }}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold"
                        >
                          Asignar / Ajustar Sueldo
                        </button>
                      )
                    ) : (
                      <span className="text-xs text-slate-400">Solo lectura (Contador)</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
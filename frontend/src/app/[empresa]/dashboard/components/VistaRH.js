import { Laptop, CircleDollarSign, FileText, Download, FileSpreadsheet, Plus, Edit3, QrCode } from "lucide-react";
import {
  exportarEmpleadosExcel,
  exportarPlantillaRHPDF,
  descargarConstanciaLaboralPDF,
  descargarReciboNominaPDF,
  descargarResponsivaTIPDF
} from "../utils/reporteador";

export default function VistaRH({
  perfil,
  tenantInfo,
  colorMarca,
  dominioCorporativo,
  empresa,
  metricas,
  listaEmpleados,
  misEquipos,
  misNominas,
  resolverAvatar,
  abrirModalNuevoEmpleado,
  abrirModalEditarEmpleado,
  abrirModalGafete,
  irANuevoTicket
}) {
  const ctxReporte = { listaEmpleados, tenantInfo, perfil, metricas, colorMarca, dominioCorporativo, empresa };

  if (perfil.rolSistema === "Operativo") {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-800">Hola, {perfil.nombre} {perfil.apellido}</h3>
            <p className="text-gray-500 mt-1 text-sm">
              Bienvenido a tu portal de empleado en <span className="font-semibold text-gray-700">{tenantInfo.name}</span>. Descarga tus recibos de nómina en PDF, consulta tus equipos o solicita soporte.
            </p>
          </div>
          <button
            onClick={irANuevoTicket}
            style={{ backgroundColor: colorMarca }}
            className="text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-sm shrink-0"
          >
            + Levantar Ticket de Soporte
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h4 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2"><Laptop size={18} /> Mi Equipo de Cómputo</h4>
            {misEquipos.length === 0 ? (
              <p className="text-xs text-gray-400">No tienes equipos registrados a tu nombre.</p>
            ) : (
              <div className="space-y-3">
                {misEquipos.map(eq => (
                  <div key={eq.id} className="p-3.5 rounded-lg bg-gray-50 border border-gray-100 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-gray-800">{eq.deviceType} {eq.model}</p>
                      <p className="text-xs text-gray-500 font-mono">Serie: {eq.serialNumber}</p>
                    </div>
                    <button
                      onClick={() => descargarResponsivaTIPDF(eq, ctxReporte)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 flex items-center gap-1"
                    >
                      <FileText size={13} /> Responsiva PDF
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h4 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2"><CircleDollarSign size={18} /> Mis Recibos de Nómina</h4>
            {misNominas.length === 0 ? (
              <p className="text-xs text-gray-400">Aún no tienes recibos de nómina timbrados.</p>
            ) : (
              <div className="space-y-3">
                {misNominas.map(nom => (
                  <div key={nom.id} className="p-3.5 rounded-lg bg-gray-50 border border-gray-100 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-emerald-700">${Number(nom.amountNet).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                      <p className="text-xs text-gray-500">{new Date(nom.paymentDate).toLocaleDateString('es-MX', { dateStyle: 'medium' })}</p>
                    </div>
                    <button
                      onClick={() => descargarReciboNominaPDF(nom, ctxReporte)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-sm"
                    >
                      <Download size={13} /> Recibo PDF
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 flex flex-wrap gap-3 justify-between items-center bg-gray-50/50">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Directorio, Gafetes QR y Reporteador de RH</h3>
          <p className="text-xs text-gray-500">Expedientes salariales, credenciales digitales con QR, Excel y Constancias en PDF</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportarEmpleadosExcel(listaEmpleados, empresa)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <FileSpreadsheet size={15} /> Exportar Excel (.xlsx)
          </button>
          <button
            onClick={() => exportarPlantillaRHPDF(ctxReporte)}
            className="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <FileText size={15} /> Reporte Plantilla PDF
          </button>
          {["Super Administrador", "Admin de Recursos Humanos"].includes(perfil.rolSistema) && (
            <button
              onClick={abrirModalNuevoEmpleado}
              style={{ backgroundColor: colorMarca }}
              className="text-white px-4 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90 flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={15} /> Nuevo Empleado
            </button>
          )}
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
              <th className="px-6 py-4 font-semibold">ID / Empleado</th>
              <th className="px-6 py-4 font-semibold">Rol en Sistema</th>
              <th className="px-6 py-4 font-semibold">Puesto / Contrato</th>
              <th className="px-6 py-4 font-semibold">Salario Base</th>
              <th className="px-6 py-4 font-semibold">Estado</th>
              <th className="px-6 py-4 font-semibold text-right">Herramientas RH</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {listaEmpleados.map((empleado) => {
              const avatarSrc = resolverAvatar(empleado.avatarUrl);
              return (
                <tr key={empleado.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      {avatarSrc ? (
                        <img
                          src={avatarSrc}
                          alt={empleado.nombreCompleto}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          className="h-9 w-9 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">{empleado.iniciales}</div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-gray-900">{empleado.numeroEmpleado} - {empleado.nombreCompleto}</p>
                        <p className="text-xs text-gray-500">{empleado.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 font-medium">{empleado.rol}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-800">{empleado.puesto}</p>
                    <p className="text-xs text-gray-500">{empleado.tipoContrato}</p>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                    ${Number(empleado.salarioBase).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${empleado.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {empleado.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-xs font-semibold space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => abrirModalGafete(empleado)}
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 inline-flex items-center gap-1 transition-colors"
                      title="Ver Gafete Digital con Código QR"
                    >
                      <QrCode size={14} /> Gafete QR
                    </button>
                    <button
                      onClick={() => descargarConstanciaLaboralPDF(empleado, ctxReporte)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 inline-flex items-center gap-1 transition-colors"
                      title="Descargar Constancia Laboral en PDF"
                    >
                      <FileText size={14} /> Constancia
                    </button>
                    {["Super Administrador", "Admin de Recursos Humanos", "Analista HR"].includes(perfil.rolSistema) && (
                      <button
                        onClick={() => abrirModalEditarEmpleado(empleado)}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 inline-flex items-center gap-1 transition-colors"
                      >
                        <Edit3 size={14} /> Editar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
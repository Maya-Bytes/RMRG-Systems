import { useState, useEffect } from "react";
import { X, UploadCloud, Sparkles, CheckSquare, Square } from "lucide-react";

const ROLES_SISTEMA = [
  "Super Administrador",
  "Admin de Recursos Humanos",
  "Analista HR",
  "Admin de IT",
  "Soporte IT",
  "Admin de Finanzas",
  "Contador",
  "Operativo"
];

export default function ModalesERP({
  perfil,
  colorMarca,
  dominioCorporativo,
  guardando,
  listaEmpleados = [],
  // Modal Perfil
  showModalPerfil, setShowModalPerfil, guardarMiPerfil, nuevaPassword, setNuevaPassword,
  fotoPerfilPreview, setFotoPerfilFile, setFotoPerfilPreview,
  // Modal Empleado
  showModalEmpleado, setShowModalEmpleado, modoEdicionEmpleado, guardarEmpleado,
  formEmpleado, setFormEmpleado, actualizarNombresOApellidos,
  emailPrefijo, setEmailPrefijo, setEmailUsuarioEditadoManual, generarPrefijoSugerido,
  fotoFile, setFotoFile, fotoPreview, setFotoPreview, handleImageChange,
  // Modal Equipo TI
  showModalEquipo, setShowModalEquipo, formEquipo, setFormEquipo, guardarEquipo,
  // Modal Nómina Masiva
  showModalNomina, setShowModalNomina, guardarNominaLote,
  // Modal Ticket
  showModalTicket, setShowModalTicket, formTicket, setFormTicket, guardarTicket
}) {
  const inputStyle = "w-full text-sm px-3.5 py-2.5 bg-white text-slate-900 font-medium placeholder:text-slate-400 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-slate-800 transition-colors";
  const labelStyle = "block text-xs font-bold text-slate-700 mb-1.5";

  const esSuperAdmin = perfil?.rolSistema === "Super Administrador";
  const puedeDarBaja = ["Super Administrador", "Admin de Recursos Humanos"].includes(perfil?.rolSistema);

  // Estado local para la tabla interactiva de Dispersión Masiva de Nómina
  const [filasNomina, setFilasNomina] = useState([]);

  useEffect(() => {
    if (showModalNomina) {
      const activos = listaEmpleados.filter(e => e.isActive).map(emp => ({
        userId: emp.id,
        numeroEmpleado: emp.numeroEmpleado,
        nombreCompleto: emp.nombreCompleto,
        puesto: emp.puesto,
        salarioBase: Number(emp.salarioBase || 0),
        bono: "",
        descuento: "",
        seleccionado: false
      }));
      setFilasNomina(activos);
    }
  }, [showModalNomina, listaEmpleados]);

  const toggleSeleccionEmpleado = (userId) => {
    setFilasNomina(prev => prev.map(f => f.userId === userId ? { ...f, seleccionado: !f.seleccionado } : f));
  };

  const toggleSeleccionarTodos = () => {
    const todosMarcados = filasNomina.every(f => f.seleccionado);
    setFilasNomina(prev => prev.map(f => ({ ...f, seleccionado: !todosMarcados })));
  };

  const actualizarMontoFila = (userId, campo, valor) => {
    setFilasNomina(prev => prev.map(f => f.userId === userId ? { ...f, [campo]: valor, seleccionado: true } : f));
  };

  const calcularNetoFila = (f) => {
    const base = Number(f.salarioBase || 0);
    const bono = parseFloat(f.bono || 0) || 0;
    const desc = parseFloat(f.descuento || 0) || 0;
    return Math.max(0, +(base + bono - desc).toFixed(2));
  };

  const seleccionados = filasNomina.filter(f => f.seleccionado);
  const granTotalNeto = seleccionados.reduce((acc, f) => acc + calcularNetoFila(f), 0);

  const submitNominaMasiva = (e) => {
    e.preventDefault();
    if (seleccionados.length === 0) {
      alert("Marca al menos un empleado en la tabla para emitir su pago.");
      return;
    }
    const payloadPagos = seleccionados.map(f => ({
      userId: f.userId,
      numeroEmpleado: f.numeroEmpleado,
      salarioBase: f.salarioBase,
      bono: parseFloat(f.bono || 0) || 0,
      descuento: parseFloat(f.descuento || 0) || 0,
      amountNet: calcularNetoFila(f)
    }));
    guardarNominaLote(payloadPagos);
  };

  return (
    <>
      {/* MODAL CONFIGURACIÓN DE MI CUENTA */}
      {showModalPerfil && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-slate-900">Configuración de Mi Cuenta</h3>
              <button onClick={() => setShowModalPerfil(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={guardarMiPerfil} className="p-6 space-y-4">
              <div>
                <label className={labelStyle}>Foto de Perfil (.PNG)</label>
                <div className="relative group w-full h-36 rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-600 bg-slate-50/70 hover:bg-slate-100/60 transition-all flex flex-col items-center justify-center overflow-hidden cursor-pointer">
                  <input
                    type="file"
                    accept="image/png"
                    onChange={(e) => handleImageChange(e, setFotoPerfilFile, setFotoPerfilPreview)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  {fotoPerfilPreview ? (
                    <div className="relative w-full h-full flex items-center justify-center bg-slate-900/5 p-2">
                      <img src={fotoPerfilPreview} alt="Vista previa" className="h-28 w-28 rounded-full object-cover border-2 border-white shadow-md" />
                      <span className="absolute bottom-2 right-3 bg-slate-900/80 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">
                        Clic para cambiar .PNG
                      </span>
                    </div>
                  ) : (
                    <div className="text-center p-4 flex flex-col items-center">
                      <div className="bg-white p-2.5 rounded-full shadow-sm mb-2 border border-slate-200" style={{ color: colorMarca }}>
                        <UploadCloud size={22} />
                      </div>
                      <p className="text-xs font-bold text-slate-700">Haz clic o arrastra una imagen <span className="underline" style={{ color: colorMarca }}>.PNG</span></p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Se guarda de forma permanente en la base de datos</p>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className={labelStyle}>Nueva Contraseña (Opcional)</label>
                <input
                  type="password"
                  placeholder="Dejar en blanco para mantener la actual"
                  value={nuevaPassword}
                  onChange={e => setNuevaPassword(e.target.value)}
                  className={inputStyle}
                />
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setShowModalPerfil(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button type="submit" disabled={guardando} style={{ backgroundColor: colorMarca }} className="px-4 py-2 text-sm font-semibold text-white rounded-lg">
                  {guardando ? 'Guardando...' : 'Actualizar Cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: ALTA / EDICIÓN DE EMPLEADO (RH asigna puesto/contrato; Finanzas asigna salario) */}
      {showModalEmpleado && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-slate-900">{modoEdicionEmpleado ? 'Editar Expediente Laboral (RH)' : 'Alta de Nuevo Empleado (RH)'}</h3>
              <button onClick={() => setShowModalEmpleado(false)} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg"><X size={20} /></button>
            </div>

            <form onSubmit={guardarEmpleado} className="p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelStyle}>Nombres</label>
                  <input
                    required
                    type="text"
                    placeholder="Ej. Carlos Alberto"
                    value={formEmpleado.nombres}
                    onChange={e => actualizarNombresOApellidos('nombres', e.target.value)}
                    className={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelStyle}>Apellidos</label>
                  <input
                    required
                    type="text"
                    placeholder="Ej. Maya López"
                    value={formEmpleado.apellidos}
                    onChange={e => actualizarNombresOApellidos('apellidos', e.target.value)}
                    className={inputStyle}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">Correo Corporativo</label>
                    {!modoEdicionEmpleado && (
                      <button
                        type="button"
                        onClick={() => {
                          setEmailUsuarioEditadoManual(false);
                          setEmailPrefijo(generarPrefijoSugerido(formEmpleado.nombres, formEmpleado.apellidos));
                        }}
                        className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Sparkles size={12} /> Autogenerar
                      </button>
                    )}
                  </div>
                  <div className="flex items-stretch rounded-lg border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-slate-800 bg-white">
                    <input
                      required
                      disabled={modoEdicionEmpleado}
                      type="text"
                      placeholder="nombre.apellido"
                      value={emailPrefijo}
                      onChange={e => {
                        setEmailUsuarioEditadoManual(true);
                        setEmailPrefijo(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''));
                      }}
                      className="w-full text-sm px-3 py-2.5 bg-white text-slate-900 font-semibold placeholder:text-slate-400 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                    />
                    <span className="inline-flex items-center px-3 bg-slate-100 text-slate-700 text-xs font-bold border-l border-slate-300 select-none shrink-0">
                      @{dominioCorporativo}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Dominio oficial fijo <span className="font-semibold text-slate-700">@{dominioCorporativo}</span>.
                  </p>
                </div>

                <div>
                  <label className={labelStyle}>Rol en el Sistema (8 Roles)</label>
                  <select
                    required
                    value={formEmpleado.rol}
                    onChange={e => setFormEmpleado({...formEmpleado, rol: e.target.value})}
                    className={inputStyle}
                  >
                    {ROLES_SISTEMA.map(r => <option key={r} value={r} className="text-slate-900 bg-white">{r}</option>)}
                  </select>
                </div>
              </div>

              <div className={`grid grid-cols-1 ${esSuperAdmin ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
                <div>
                  <label className={labelStyle}>Puesto Interno</label>
                  <input
                    required
                    type="text"
                    placeholder="Ej. Analista de Calidad"
                    value={formEmpleado.puesto}
                    onChange={e => setFormEmpleado({...formEmpleado, puesto: e.target.value})}
                    className={inputStyle}
                  />
                </div>

                {esSuperAdmin && (
                  <div>
                    <label className={labelStyle}>Salario Base Mensual ($)</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={formEmpleado.salarioBase}
                      onChange={e => setFormEmpleado({...formEmpleado, salarioBase: e.target.value})}
                      className={inputStyle}
                    />
                  </div>
                )}

                <div>
                  <label className={labelStyle}>Modalidad de Contrato</label>
                  <select
                    value={formEmpleado.tipoContrato}
                    onChange={e => setFormEmpleado({...formEmpleado, tipoContrato: e.target.value})}
                    className={inputStyle}
                  >
                    <option value="Indefinido" className="text-slate-900 bg-white">Indefinido</option>
                    <option value="Temporal" className="text-slate-900 bg-white">Temporal</option>
                    <option value="Honorarios" className="text-slate-900 bg-white">Honorarios</option>
                  </select>
                </div>
              </div>

              {!esSuperAdmin && (
                <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-blue-800">
                  ℹ️ <strong>Nota de control interno:</strong> La asignación y ajuste del Salario Base Mensual corresponde exclusivamente al departamento de <strong>Finanzas</strong> desde su Tabulador Salarial.
                </div>
              )}

              {modoEdicionEmpleado ? (
                puedeDarBaja && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <label className="inline-flex items-center gap-2.5 text-sm font-bold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formEmpleado.isActive}
                        onChange={e => setFormEmpleado({...formEmpleado, isActive: e.target.checked})}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      Empleado Activo en la Empresa (Desmarcar para aplicar Baja Lógica)
                    </label>
                  </div>
                )
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">Fotografía del Empleado (Formato .PNG opcional)</label>
                    {fotoPreview && (
                      <button
                        type="button"
                        onClick={() => { setFotoFile(null); setFotoPreview(null); }}
                        className="text-xs font-semibold text-red-600 hover:underline"
                      >
                        Quitar imagen
                      </button>
                    )}
                  </div>
                  <div className="relative group w-full h-36 rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-700 bg-slate-50/70 hover:bg-slate-100/70 transition-all flex flex-col items-center justify-center overflow-hidden cursor-pointer">
                    <input
                      type="file"
                      accept="image/png"
                      onChange={(e) => handleImageChange(e, setFotoFile, setFotoPreview)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    {fotoPreview ? (
                      <div className="flex items-center gap-4 px-6">
                        <img src={fotoPreview} alt="Preview" className="w-24 h-24 rounded-full object-cover border-2 border-white shadow-md" />
                        <div className="text-left">
                          <p className="text-xs font-bold text-emerald-700">✓ Imagen .PNG lista para subir</p>
                          <p className="text-xs text-slate-600 truncate max-w-[220px]">{fotoFile?.name}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-4 flex flex-col items-center">
                        <div className="bg-white p-3 rounded-full shadow-sm mb-2 border border-slate-200" style={{ color: colorMarca }}>
                          <UploadCloud size={24} />
                        </div>
                        <p className="text-xs font-bold text-slate-700">
                          Haz clic aquí o arrastra la foto en formato <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-900 font-mono">.PNG</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModalEmpleado(false)} className="px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg">
                  Cancelar
                </button>
                <button type="submit" disabled={guardando} style={{ backgroundColor: colorMarca }} className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg shadow-sm hover:opacity-95">
                  {guardando ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTRAR EQUIPO TI */}
      {showModalEquipo && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-slate-900">Registrar Nuevo Equipo TI</h3>
              <button onClick={() => setShowModalEquipo(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={guardarEquipo} className="p-6 space-y-4">
              <div>
                <label className={labelStyle}>Número de Serie</label>
                <input required type="text" placeholder="Ej. LT-COCA-09" value={formEquipo.serialNumber} onChange={e => setFormEquipo({...formEquipo, serialNumber: e.target.value})} className={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelStyle}>Tipo de Dispositivo</label>
                  <select value={formEquipo.deviceType} onChange={e => setFormEquipo({...formEquipo, deviceType: e.target.value})} className={inputStyle}>
                    <option value="Laptop">Laptop</option>
                    <option value="Monitor">Monitor</option>
                    <option value="Smartphone">Smartphone</option>
                    <option value="Workstation">Workstation</option>
                  </select>
                </div>
                <div>
                  <label className={labelStyle}>Marca / Modelo</label>
                  <input required type="text" placeholder="Ej. Dell Latitude 5420" value={formEquipo.model} onChange={e => setFormEquipo({...formEquipo, model: e.target.value})} className={inputStyle} />
                </div>
              </div>
              <div>
                <label className={labelStyle}>Asignar a Empleado (Opcional)</label>
                <select value={formEquipo.assignedToId} onChange={e => setFormEquipo({...formEquipo, assignedToId: e.target.value})} className={inputStyle}>
                  <option value="">-- Dejar Disponible en Almacén --</option>
                  {listaEmpleados.filter(e => e.isActive).map(emp => <option key={emp.id} value={emp.id}>{emp.numeroEmpleado} - {emp.nombreCompleto}</option>)}
                </select>
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setShowModalEquipo(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button type="submit" disabled={guardando} style={{ backgroundColor: colorMarca }} className="px-4 py-2 text-sm font-semibold text-white rounded-lg">Guardar Equipo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CONSOLA DINÁMICA DE DISPERSIÓN DE NÓMINA (INDIVIDUAL O MASIVA CON BONOS Y DESCUENTOS) */}
      {showModalNomina && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Consola de Dispersión de Nómina (Individual y Masiva)</h3>
                <p className="text-xs text-slate-500">Selecciona uno o varios trabajadores, aplica bonos o descuentos y emite el pago en lote</p>
              </div>
              <button onClick={() => setShowModalNomina(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <form onSubmit={submitNominaMasiva} className="flex flex-col flex-1 overflow-hidden">
              <div className="px-6 py-3 bg-emerald-50/70 border-b border-emerald-100 flex flex-wrap justify-between items-center gap-2">
                <button
                  type="button"
                  onClick={toggleSeleccionarTodos}
                  className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1.5"
                >
                  {filasNomina.length > 0 && filasNomina.every(f => f.seleccionado) ? <CheckSquare size={15} /> : <Square size={15} />}
                  Seleccionar / Desmarcar todos los empleados activos ({filasNomina.length})
                </button>
                <span className="text-xs font-bold text-slate-700">
                  Empleados marcados: <span className="text-emerald-700">{seleccionados.length}</span>   |   Total a dispersar:{" "}
                  <span className="text-emerald-700 font-extrabold">
                    ${granTotalNeto.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                  </span>
                </span>
              </div>

              <div className="overflow-y-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-gray-100 text-slate-600 text-[11px] uppercase border-b border-gray-200 z-10">
                    <tr>
                      <th className="px-4 py-3 text-center">Pagar</th>
                      <th className="px-4 py-3">ID / Empleado</th>
                      <th className="px-4 py-3">Sueldo Base</th>
                      <th className="px-4 py-3">+ Bono / Extra ($)</th>
                      <th className="px-4 py-3">- Descuento ($)</th>
                      <th className="px-4 py-3 text-right">Neto a Depositar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-xs">
                    {filasNomina.map((fila) => {
                      const neto = calcularNetoFila(fila);
                      return (
                        <tr key={fila.userId} className={fila.seleccionado ? "bg-emerald-50/40" : "hover:bg-gray-50"}>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={fila.seleccionado}
                              onChange={() => toggleSeleccionEmpleado(fila.userId)}
                              className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-900">{fila.numeroEmpleado} - {fila.nombreCompleto}</p>
                            <p className="text-[11px] text-slate-500">{fila.puesto}</p>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            ${fila.salarioBase.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={fila.bono}
                              onChange={(e) => actualizarMontoFila(fila.userId, "bono", e.target.value)}
                              className="w-28 px-2.5 py-1.5 bg-white text-emerald-700 font-bold border border-slate-300 rounded-lg"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={fila.descuento}
                              onChange={(e) => actualizarMontoFila(fila.userId, "descuento", e.target.value)}
                              className="w-28 px-2.5 py-1.5 bg-white text-red-600 font-bold border border-slate-300 rounded-lg"
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-extrabold text-slate-900">
                            ${neto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                <span className="text-xs text-slate-500">
                  Se notificará automáticamente a cada trabajador seleccionado.
                </span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowModalNomina(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg">
                    Cancelar
                  </button>
                  <button type="submit" disabled={guardando || seleccionados.length === 0} className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-sm">
                    {guardando ? 'Dispersando...' : `Emitir Pago (${seleccionados.length})`}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CREAR TICKET HELPDESK */}
      {showModalTicket && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-slate-900">Levantar Ticket de Soporte</h3>
              <button onClick={() => setShowModalTicket(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={guardarTicket} className="p-6 space-y-4">
              <div>
                <label className={labelStyle}>Área Destino</label>
                <select value={formTicket.targetArea} onChange={e => setFormTicket({...formTicket, targetArea: e.target.value})} className={inputStyle}>
                  <option value="IT">Sistemas / Soporte TI</option>
                  <option value="HR">Recursos Humanos</option>
                  <option value="FINANCE">Finanzas y Nómina</option>
                  <option value="GENERAL">Servicios Generales</option>
                </select>
              </div>
              <div>
                <label className={labelStyle}>Asunto / Título</label>
                <input required type="text" placeholder="Ej. Solicitud de constancia laboral" value={formTicket.title} onChange={e => setFormTicket({...formTicket, title: e.target.value})} className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Descripción detallada</label>
                <textarea required rows={3} placeholder="Describe el problema o requerimiento..." value={formTicket.description} onChange={e => setFormTicket({...formTicket, description: e.target.value})} className={inputStyle} />
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setShowModalTicket(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button type="submit" disabled={guardando} style={{ backgroundColor: colorMarca }} className="px-4 py-2 text-sm font-semibold text-white rounded-lg">Enviar Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
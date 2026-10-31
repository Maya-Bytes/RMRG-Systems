"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  LayoutDashboard, Users, Laptop, CircleDollarSign, 
  Ticket, LogOut, Bell, Menu, Settings, ChevronDown, 
  X, Plus, Edit3, CheckCircle2, Clock, ShieldAlert, 
  CheckCheck, UploadCloud, Sparkles, FileSpreadsheet, 
  FileText, Download
} from "lucide-react";

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

const DOMINIOS_POR_SLUG = {
  thecocacolacompany: "coca-cola.com",
  cocacola: "coca-cola.com",
  samsungelectronics: "samsung.com",
  samsung: "samsung.com",
  microsoftcorporation: "microsoft.com",
  microsoft: "microsoft.com",
  amazonwebservices: "amazon.com",
  aws: "amazon.com"
};

// Convierte un color HEX (#F40009) a arreglo RGB [244, 0, 9] para jsPDF
const hexToRgb = (hex) => {
  const limpio = (hex || "#2563eb").replace("#", "");
  const bigint = parseInt(limpio.length === 3 ? limpio.split("").map(c => c + c).join("") : limpio, 16);
  if (isNaN(bigint)) return [37, 99, 235];
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
};

export default function DashboardEmpresa() {
  const params = useParams();
  const router = useRouter();
  const empresa = params.empresa;
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  
  const [autorizado, setAutorizado] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false); 
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [moduloActivo, setModuloActivo] = useState("Resumen");

  // Identidad corporativa y datos principales
  const [tenantInfo, setTenantInfo] = useState({ name: "Corporativo", emailDomain: "", themeColor: "#2563eb" });
  const [perfil, setPerfil] = useState({ userId: "", numeroEmpleado: "", email: "", nombre: "Cargando...", apellido: "", puesto: "...", iniciales: "-", avatarUrl: null, rolSistema: "" });
  const [metricas, setMetricas] = useState({ empleados: 0, equipos: 0, tickets: 0 });
  
  const [listaEmpleados, setListaEmpleados] = useState([]); 
  const [listaEquipos, setListaEquipos] = useState([]);
  const [listaNominas, setListaNominas] = useState([]);
  const [listaTickets, setListaTickets] = useState([]);
  const [listaNotificaciones, setListaNotificaciones] = useState([]);
  const [listaAuditoria, setListaAuditoria] = useState([]);
  const [filtroAreaTicket, setFiltroAreaTicket] = useState("TODOS");

  // Estados de Modal Empleado + Generador de Correo + Preview PNG
  const [showModalEmpleado, setShowModalEmpleado] = useState(false);
  const [modoEdicionEmpleado, setModoEdicionEmpleado] = useState(false);
  const [empleadoEditandoId, setEmpleadoEditandoId] = useState(null);
  const [emailUsuarioEditadoManual, setEmailUsuarioEditadoManual] = useState(false);
  const [emailPrefijo, setEmailPrefijo] = useState("");
  const [fotoFile, setFotoFile] = useState(null); 
  const [fotoPreview, setFotoPreview] = useState(null);
  const [formEmpleado, setFormEmpleado] = useState({
    nombres: '', apellidos: '', email: '', puesto: '', rol: 'Operativo', salarioBase: '15000', tipoContrato: 'Indefinido', isActive: true
  });

  // Otros Modales
  const [showModalEquipo, setShowModalEquipo] = useState(false);
  const [formEquipo, setFormEquipo] = useState({
    serialNumber: '', deviceType: 'Laptop', model: '', status: 'Disponible', assignedToId: ''
  });

  const [showModalNomina, setShowModalNomina] = useState(false);
  const [formNomina, setFormNomina] = useState({
    userId: '', amountNet: '', status: 'Pagado'
  });

  const [showModalTicket, setShowModalTicket] = useState(false);
  const [formTicket, setFormTicket] = useState({
    title: '', description: '', targetArea: 'IT'
  });

  const [showModalPerfil, setShowModalPerfil] = useState(false);
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [fotoPerfilFile, setFotoPerfilFile] = useState(null);
  const [fotoPerfilPreview, setFotoPerfilPreview] = useState(null);

  const [guardando, setGuardando] = useState(false);

  const inputStyle = "w-full text-sm px-3.5 py-2.5 bg-white text-slate-900 font-medium placeholder:text-slate-400 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-slate-800 transition-colors";
  const labelStyle = "block text-xs font-bold text-slate-700 mb-1.5";

  const dominioCorporativo = tenantInfo.emailDomain || DOMINIOS_POR_SLUG[empresa] || `${empresa}.com`;
  const colorMarca = tenantInfo.themeColor || "#2563eb";
  const notificacionesNoLeidas = listaNotificaciones.filter(n => !n.isRead).length;

  const limpiarTextoCorreo = (texto) => {
    return (texto || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  };

  const generarPrefijoSugerido = (nombres, apellidos) => {
    const primerNombre = limpiarTextoCorreo(nombres.trim().split(/\s+/)[0]);
    const primerApellido = limpiarTextoCorreo(apellidos.trim().split(/\s+/)[0]);
    if (primerNombre && primerApellido) return `${primerNombre}.${primerApellido}`;
    return primerNombre || primerApellido || "";
  };

  const cargarTodo = async () => {
    const token = localStorage.getItem('rmrg_token');
    if (!token) { router.replace('/'); return; }
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      const resResumen = await fetch(`${API_URL}/api/dashboard/resumen`, { headers });
      if (!resResumen.ok) {
        localStorage.removeItem('rmrg_token');
        router.replace('/');
        return;
      }
      const dataResumen = await resResumen.json();
      if (dataResumen.tenant) setTenantInfo(dataResumen.tenant);
      setPerfil(dataResumen.usuario); 
      setMetricas(dataResumen.metricas); 
      setListaEmpleados(dataResumen.empleados); 
      setAutorizado(true);

      const [resEquipos, resNominas, resTickets, resNotif, resAudit] = await Promise.all([
        fetch(`${API_URL}/api/it/equipos`, { headers }),
        fetch(`${API_URL}/api/finanzas/nominas`, { headers }),
        fetch(`${API_URL}/api/tickets`, { headers }),
        fetch(`${API_URL}/api/notificaciones`, { headers }),
        fetch(`${API_URL}/api/auditoria`, { headers })
      ]);

      if (resEquipos.ok) setListaEquipos(await resEquipos.json());
      if (resNominas.ok) setListaNominas(await resNominas.json());
      if (resTickets.ok) setListaTickets(await resTickets.json());
      if (resNotif.ok) setListaNotificaciones(await resNotif.json());
      if (resAudit.ok) setListaAuditoria(await resAudit.json());
    } catch (error) {
      console.error("Error de conexión:", error);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, [empresa]);

  const cerrarSesion = () => {
    localStorage.removeItem('rmrg_token');
    router.replace('/');
  };

  // ==========================================
  // MOTOR REPORTEADOR: EXCEL (.XLSX) Y PDF
  // ==========================================

  // 1. Exportar Plantilla de RH a Excel
  const exportarEmpleadosExcel = () => {
    const filas = listaEmpleados.map(emp => ({
      "ID Empleado": emp.numeroEmpleado,
      "Nombre Completo": emp.nombreCompleto,
      "Correo Corporativo": emp.email,
      "Rol en Sistema": emp.rol,
      "Puesto Interno": emp.puesto,
      "Tipo de Contrato": emp.tipoContrato,
      "Salario Base Mensual (MXN)": Number(emp.salarioBase),
      "Fecha de Ingreso": new Date(emp.fechaIngreso).toLocaleDateString('es-MX'),
      "Estatus": emp.estado
    }));

    const ws = XLSX.utils.json_to_sheet(filas);
    ws["!cols"] = [{ wch: 14 }, { wch: 28 }, { wch: 30 }, { wch: 24 }, { wch: 24 }, { wch: 16 }, { wch: 24 }, { wch: 16 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla_RH");
    XLSX.writeFile(wb, `Plantilla_RH_${empresa}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // 2. Reporte General de Plantilla RH en PDF
  const exportarPlantillaRHPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const rgb = hexToRgb(colorMarca);

    doc.setFillColor(...rgb);
    doc.rect(0, 0, 297, 26, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text(`${tenantInfo.name.toUpperCase()} — REPORTE EJECUTIVO DE RECURSOS HUMANOS`, 14, 13);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generado por: ${perfil.nombre} ${perfil.apellido} (${perfil.rolSistema})   |   Fecha: ${new Date().toLocaleString('es-MX')}`, 14, 20);

    const masaSalarial = listaEmpleados
      .filter(e => e.isActive)
      .reduce((acc, e) => acc + Number(e.salarioBase || 0), 0);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Total de Empleados Registrados: ${listaEmpleados.length}   |   Activos: ${metricas.empleados}   |   Masa Salarial Mensual Activa: $${masaSalarial.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`, 14, 35);

    autoTable(doc, {
      startY: 40,
      head: [["ID", "Nombre Completo", "Correo Corporativo", "Rol Sistema", "Puesto", "Contrato", "Salario Base", "Estado"]],
      body: listaEmpleados.map(e => [
        e.numeroEmpleado,
        e.nombreCompleto,
        e.email,
        e.rol,
        e.puesto,
        e.tipoContrato,
        `$${Number(e.salarioBase).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        e.estado
      ]),
      headStyles: { fillColor: rgb, textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 8.5, cellPadding: 3 }
    });

    doc.save(`Reporte_Plantilla_RH_${empresa}.pdf`);
  };

  // 3. Constancia Laboral Individual en PDF
  const descargarConstanciaLaboralPDF = (emp) => {
    const doc = new jsPDF();
    const rgb = hexToRgb(colorMarca);
    const fechaHoy = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
    const fechaIngreso = new Date(emp.fechaIngreso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

    // Franja superior institucional
    doc.setFillColor(...rgb);
    doc.rect(0, 0, 210, 32, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(tenantInfo.name.toUpperCase(), 20, 16);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.text(`DIRECCIÓN CORPORATIVA DE RECURSOS HUMANOS  •  DOMINIO OFICIAL @${dominioCorporativo}`, 20, 24);

    // Folio y fecha
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(10);
    doc.text(`Folio: RH-CONST-${emp.numeroEmpleado}-${new Date().getFullYear()}`, 135, 45);
    doc.text(`Fecha de emisión: ${fechaHoy}`, 135, 51);

    // Destinatario
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("A QUIEN CORRESPONDA:", 20, 70);

    // Cuerpo de la constancia
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const parrafo1 = `Por medio de la presente, la Dirección de Recursos Humanos de ${tenantInfo.name} hace constar que el(la) C. ${emp.nombreCompleto.toUpperCase()}, identificado(a) con el Número de Empleado ${emp.numeroEmpleado} y correo institucional ${emp.email}, presta sus servicios profesionales dentro de nuestra organización.`;
    const lineas1 = doc.splitTextToSize(parrafo1, 170);
    doc.text(lineas1, 20, 84);

    // Ficha técnica del expediente
    autoTable(doc, {
      startY: 112,
      margin: { left: 20, right: 20 },
      head: [["Concepto del Expediente Laboral", "Información Oficial Registrada"]],
      body: [
        ["Nombre del Colaborador", emp.nombreCompleto],
        ["Número de Empleado (ID)", emp.numeroEmpleado],
        ["Puesto Desempeñado", emp.puesto],
        ["Rol de Seguridad en Sistema", emp.rol],
        ["Modalidad de Contrato", emp.tipoContrato],
        ["Fecha de Ingreso", fechaIngreso],
        ["Percepción Mensual Bruta", `$${Number(emp.salarioBase).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`],
        ["Estatus Actual en el Corporativo", emp.estado.toUpperCase()]
      ],
      headStyles: { fillColor: rgb, textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 75 } },
      styles: { fontSize: 10, cellPadding: 4 }
    });

    const finalY = (doc.lastAutoTable?.finalY || 185) + 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    const parrafo2 = `Se extiende la presente constancia laboral a petición del interesado(a) para los fines legales, administrativos o financieros que a éste(a) convengan.`;
    doc.text(doc.splitTextToSize(parrafo2, 170), 20, finalY);

    // Firma
    doc.setFont("helvetica", "bold");
    doc.text("ATENTAMENTE", 105, finalY + 26, { align: "center" });
    doc.setDrawColor(148, 163, 184);
    doc.line(65, finalY + 46, 145, finalY + 46);
    doc.text(`${perfil.nombre} ${perfil.apellido}`, 105, finalY + 53, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(`${perfil.rolSistema} — ${tenantInfo.name}`, 105, finalY + 59, { align: "center" });

    // Pie de página
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Documento electrónico generado y validado por RMRG Systems Cloud ERP.", 105, 285, { align: "center" });

    doc.save(`Constancia_Laboral_${emp.numeroEmpleado}_${emp.lastName}.pdf`);
  };

  // 4. Recibo de Nómina en PDF (Para Finanzas y Portal Operativo)
  const descargarReciboNominaPDF = (nom) => {
    const doc = new jsPDF();
    const rgb = hexToRgb(colorMarca);
    const nombreTrabajador = nom.user
      ? `${nom.user.firstName} ${nom.user.lastName}`
      : `${perfil.nombre} ${perfil.apellido}`;
    const numEmp = nom.user?.numeroEmpleado || perfil.numeroEmpleado;
    const correoEmp = nom.user?.email || perfil.email;
    const montoNeto = Number(nom.amountNet || 0);
    const isrEstimado = +(montoNeto * 0.12).toFixed(2);
    const imssEstimado = +(montoNeto * 0.03).toFixed(2);
    const sueldoBruto = +(montoNeto + isrEstimado + imssEstimado).toFixed(2);

    doc.setFillColor(...rgb);
    doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(`${tenantInfo.name.toUpperCase()} — COMPROBANTE DE NÓMINA`, 18, 15);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Folio Fiscal Interno: NOM-${nom.id.slice(0, 8).toUpperCase()}   |   Fecha de Pago: ${new Date(nom.paymentDate).toLocaleDateString('es-MX')}`, 18, 23);

    autoTable(doc, {
      startY: 40,
      margin: { left: 18, right: 18 },
      head: [["Datos del Trabajador", "Detalle de Dispersión"]],
      body: [
        [`Nombre: ${nombreTrabajador}`, `Estatus del Pago: ${nom.status}`],
        [`ID Empleado: ${numEmp}`, `Moneda: MXN (Peso Mexicano)`],
        [`Correo: ${correoEmp}`, `Método: Transferencia Bancaria Dispersada`]
      ],
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
      styles: { fontSize: 9.5, cellPadding: 3.5 }
    });

    autoTable(doc, {
      startY: (doc.lastAutoTable?.finalY || 75) + 10,
      margin: { left: 18, right: 18 },
      head: [["Clave", "Concepto de Nómina", "Percepciones (+)", "Deducciones (-)"]],
      body: [
        ["P-001", "Sueldo Ordinario Quincenal / Mensual", `$${sueldoBruto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, "-"],
        ["D-001", "Retención ISR (Impuesto Sobre la Renta)", "-", `$${isrEstimado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`],
        ["D-002", "Cuota Obrero Seguridad Social (IMSS)", "-", `$${imssEstimado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`],
        ["NETO", "TOTAL NETO DEPOSITADO AL TRABAJADOR", `$${montoNeto.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`, "$0.00"]
      ],
      headStyles: { fillColor: rgb, textColor: [255, 255, 255], fontStyle: "bold" },
      didParseCell: (data) => {
        if (data.row.index === 3) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [236, 253, 245];
        }
      },
      styles: { fontSize: 9.5, cellPadding: 4 }
    });

    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Recibo timbrado y auditado en el módulo Finance_Payroll de RMRG Systems.", 105, 280, { align: "center" });

    doc.save(`Recibo_Nomina_${numEmp}_${nom.id.slice(0, 6)}.pdf`);
  };

  // 5. Exportar Historial de Nóminas a Excel
  const exportarNominasExcel = () => {
    const filas = listaNominas.map(n => ({
      "Folio": n.id.slice(0, 8).toUpperCase(),
      "ID Empleado": n.user?.numeroEmpleado || "N/A",
      "Empleado": `${n.user?.firstName || ""} ${n.user?.lastName || ""}`.trim(),
      "Correo": n.user?.email || "",
      "Fecha de Pago": new Date(n.paymentDate).toLocaleDateString('es-MX'),
      "Monto Neto Dispersado (MXN)": Number(n.amountNet),
      "Estatus": n.status
    }));
    const ws = XLSX.utils.json_to_sheet(filas);
    ws["!cols"] = [{ wch: 12 }, { wch: 14 }, { wch: 26 }, { wch: 28 }, { wch: 16 }, { wch: 24 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Nominas_Dispersadas");
    XLSX.writeFile(wb, `Historial_Nominas_${empresa}.xlsx`);
  };

  // 6. Carta Responsiva de Equipo TI en PDF y Exportación de Inventario Excel
  const descargarResponsivaTIPDF = (eq) => {
    const doc = new jsPDF();
    const rgb = hexToRgb(colorMarca);
    const responsable = eq.assignedTo
      ? `${eq.assignedTo.firstName} ${eq.assignedTo.lastName} (ID: ${eq.assignedTo.numeroEmpleado})`
      : "SIN ASIGNAR (Resguardo en Almacén TI)";

    doc.setFillColor(...rgb);
    doc.rect(0, 0, 210, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`${tenantInfo.name.toUpperCase()} — CARTA RESPONSIVA DE EQUIPO TI`, 18, 16);

    autoTable(doc, {
      startY: 38,
      margin: { left: 18, right: 18 },
      head: [["Especificación del Activo Tecnológico", "Valor Registrado"]],
      body: [
        ["Número de Serie Único", eq.serialNumber],
        ["Tipo de Dispositivo", eq.deviceType],
        ["Marca y Modelo", eq.model],
        ["Estado Operativo", eq.status],
        ["Colaborador Responsable", responsable],
        ["Fecha de Emisión de Resguardo", new Date().toLocaleDateString('es-MX')]
      ],
      headStyles: { fillColor: rgb, textColor: [255, 255, 255] },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 70 } },
      styles: { fontSize: 10, cellPadding: 4 }
    });

    const finalY = (doc.lastAutoTable?.finalY || 110) + 14;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.text(
      doc.splitTextToSize(
        "El colaborador firmante recibe el equipo de cómputo descrito anteriormente como herramienta de trabajo propiedad de la empresa, comprometiéndose a darle un uso exclusivamente laboral y reportar cualquier falla a través del módulo Helpdesk TI.",
        174
      ),
      18,
      finalY
    );

    doc.line(30, finalY + 45, 95, finalY + 45);
    doc.line(115, finalY + 45, 180, finalY + 45);
    doc.setFontSize(9);
    doc.text("Firma del Colaborador Receptor", 62, finalY + 51, { align: "center" });
    doc.text("Autorización Departamento de TI", 147, finalY + 51, { align: "center" });

    doc.save(`Responsiva_TI_${eq.serialNumber}.pdf`);
  };

  const exportarInventarioTIExcel = () => {
    const filas = listaEquipos.map(eq => ({
      "No. de Serie": eq.serialNumber,
      "Tipo Dispositivo": eq.deviceType,
      "Modelo": eq.model,
      "Estado": eq.status,
      "Asignado a": eq.assignedTo ? `${eq.assignedTo.numeroEmpleado} - ${eq.assignedTo.firstName} ${eq.assignedTo.lastName}` : "En Almacén"
    }));
    const ws = XLSX.utils.json_to_sheet(filas);
    ws["!cols"] = [{ wch: 18 }, { wch: 16 }, { wch: 24 }, { wch: 16 }, { wch: 32 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario_TI");
    XLSX.writeFile(wb, `Inventario_TI_${empresa}.xlsx`);
  };

  // 7. Exportar Caja Negra (Audit_Log) a Excel
  const exportarAuditoriaExcel = () => {
    const filas = listaAuditoria.map(log => ({
      "Fecha y Hora": new Date(log.createdAt).toLocaleString('es-MX'),
      "ID Autor": log.user?.numeroEmpleado || "N/A",
      "Usuario": `${log.user?.firstName || ""} ${log.user?.lastName || ""}`.trim(),
      "Acción Ejecutada": log.action,
      "Tabla Afectada": log.tableName,
      "ID Registro": log.recordId
    }));
    const ws = XLSX.utils.json_to_sheet(filas);
    ws["!cols"] = [{ wch: 22 }, { wch: 12 }, { wch: 26 }, { wch: 38 }, { wch: 18 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Audit_Log");
    XLSX.writeFile(wb, `Caja_Negra_Auditoria_${empresa}.xlsx`);
  };

  // ==========================================
  // NOTIFICACIONES Y MI CUENTA
  // ==========================================
  const marcarNotificacionLeida = async (id) => {
    const token = localStorage.getItem('rmrg_token');
    await fetch(`${API_URL}/api/notificaciones/${id}/leer`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    cargarTodo();
  };

  const marcarTodasLeidas = async () => {
    const token = localStorage.getItem('rmrg_token');
    await fetch(`${API_URL}/api/notificaciones/leer-todas`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    cargarTodo();
  };

  const guardarMiPerfil = async (e) => {
    e.preventDefault();
    setGuardando(true);
    const token = localStorage.getItem('rmrg_token');
    const formData = new FormData();
    if (nuevaPassword) formData.append('nuevaPassword', nuevaPassword);
    if (fotoPerfilFile) formData.append('foto', fotoPerfilFile);

    try {
      const res = await fetch(`${API_URL}/api/perfil`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        alert("✅ Tu cuenta se actualizó correctamente.");
        setNuevaPassword("");
        setFotoPerfilFile(null);
        setFotoPerfilPreview(null);
        setShowModalPerfil(false);
        cargarTodo();
      } else {
        alert("No se pudo actualizar el perfil.");
      }
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================
  // FUNCIONES MÓDULO 1: RECURSOS HUMANOS
  // ==========================================
  const abrirModalNuevoEmpleado = () => {
    setModoEdicionEmpleado(false);
    setEmpleadoEditandoId(null);
    setEmailUsuarioEditadoManual(false);
    setEmailPrefijo("");
    setFormEmpleado({ nombres: '', apellidos: '', email: '', puesto: '', rol: 'Operativo', salarioBase: '15000', tipoContrato: 'Indefinido', isActive: true });
    setFotoFile(null);
    setFotoPreview(null);
    setShowModalEmpleado(true);
  };

  const abrirModalEditarEmpleado = (emp) => {
    setModoEdicionEmpleado(true);
    setEmpleadoEditandoId(emp.id);
    const partesCorreo = (emp.email || "").split("@");
    setEmailPrefijo(partesCorreo[0] || "");
    setEmailUsuarioEditadoManual(true);
    setFormEmpleado({
      nombres: emp.firstName,
      apellidos: emp.lastName,
      email: emp.email,
      puesto: emp.puesto,
      rol: emp.rol,
      salarioBase: String(emp.salarioBase || 15000),
      tipoContrato: emp.tipoContrato || 'Indefinido',
      isActive: emp.isActive
    });
    setFotoFile(null);
    setFotoPreview(null);
    setShowModalEmpleado(true);
  };

  const actualizarNombresOApellidos = (campo, valor) => {
    const nuevoForm = { ...formEmpleado, [campo]: valor };
    if (!modoEdicionEmpleado && !emailUsuarioEditadoManual) {
      const sugerido = generarPrefijoSugerido(
        campo === 'nombres' ? valor : nuevoForm.nombres,
        campo === 'apellidos' ? valor : nuevoForm.apellidos
      );
      setEmailPrefijo(sugerido);
    }
    setFormEmpleado(nuevoForm);
  };

  const handleImageChange = (e, fileSetter, previewSetter) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "image/png") {
        alert("Por favor, selecciona únicamente archivos en formato .PNG");
        return;
      }
      fileSetter(file);
      previewSetter(URL.createObjectURL(file));
    }
  };

  const guardarEmpleado = async (e) => {
    e.preventDefault();
    const prefijoLimpio = emailPrefijo.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    if (!prefijoLimpio) {
      alert("Por favor ingresa un usuario válido para el correo corporativo.");
      return;
    }

    const correoCompleto = `${prefijoLimpio}@${dominioCorporativo}`;
    setGuardando(true);
    const token = localStorage.getItem('rmrg_token');

    try {
      let res;
      if (modoEdicionEmpleado) {
        res = await fetch(`${API_URL}/api/hr/empleados/${empleadoEditandoId}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formEmpleado, email: correoCompleto })
        });
      } else {
        const paqueteDatos = new FormData();
        Object.entries({ ...formEmpleado, email: correoCompleto }).forEach(([k, v]) => paqueteDatos.append(k, v));
        if (fotoFile) paqueteDatos.append('foto', fotoFile);

        res = await fetch(`${API_URL}/api/dashboard/empleados`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: paqueteDatos
        });
      }

      if (res.ok) {
        setShowModalEmpleado(false);
        cargarTodo();
      } else {
        const err = await res.json();
        alert("Error: " + err.error);
      }
    } catch (error) {
      alert("Error de conexión al guardar empleado.");
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================
  // FUNCIONES MÓDULO 2, 3 Y 4 (TI, FINANZAS, TICKETS)
  // ==========================================
  const guardarEquipo = async (e) => {
    e.preventDefault();
    setGuardando(true);
    const token = localStorage.getItem('rmrg_token');
    try {
      const res = await fetch(`${API_URL}/api/it/equipos`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(formEquipo)
      });
      if (res.ok) {
        setShowModalEquipo(false);
        setFormEquipo({ serialNumber: '', deviceType: 'Laptop', model: '', status: 'Disponible', assignedToId: '' });
        cargarTodo();
      }
    } finally {
      setGuardando(false);
    }
  };

  const actualizarEquipo = async (id, status, assignedToId) => {
    const token = localStorage.getItem('rmrg_token');
    await fetch(`${API_URL}/api/it/equipos/${id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, assignedToId })
    });
    cargarTodo();
  };

  const seleccionarEmpleadoNomina = (userId) => {
    const emp = listaEmpleados.find(e => e.id === userId);
    setFormNomina({
      ...formNomina,
      userId,
      amountNet: emp ? String(emp.salarioBase) : ''
    });
  };

  const guardarNomina = async (e) => {
    e.preventDefault();
    setGuardando(true);
    const token = localStorage.getItem('rmrg_token');
    try {
      const res = await fetch(`${API_URL}/api/finanzas/nominas`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(formNomina)
      });
      if (res.ok) {
        setShowModalNomina(false);
        setFormNomina({ userId: '', amountNet: '', status: 'Pagado' });
        cargarTodo();
      }
    } finally {
      setGuardando(false);
    }
  };

  const guardarTicket = async (e) => {
    e.preventDefault();
    setGuardando(true);
    const token = localStorage.getItem('rmrg_token');
    try {
      const res = await fetch(`${API_URL}/api/tickets`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(formTicket)
      });
      if (res.ok) {
        setShowModalTicket(false);
        setFormTicket({ title: '', description: '', targetArea: 'IT' });
        cargarTodo();
      }
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstadoTicket = async (id, nuevoStatus) => {
    const token = localStorage.getItem('rmrg_token');
    await fetch(`${API_URL}/api/tickets/${id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nuevoStatus })
    });
    cargarTodo();
  };

  if (!autorizado) return null;

  const menuOptions = [
    { name: "Resumen", icon: <LayoutDashboard size={20} />, show: true },
    { name: "Recursos Humanos", icon: <Users size={20} />, show: ["Super Administrador", "Admin de Recursos Humanos", "Analista HR"].includes(perfil.rolSistema) },
    { name: "Equipos TI", icon: <Laptop size={20} />, show: ["Super Administrador", "Admin de IT", "Soporte IT"].includes(perfil.rolSistema) },
    { name: "Finanzas", icon: <CircleDollarSign size={20} />, show: ["Super Administrador", "Admin de Finanzas", "Contador"].includes(perfil.rolSistema) },
    { name: "Helpdesk Tickets", icon: <Ticket size={20} />, show: true },
    { name: "Auditoría", icon: <ShieldAlert size={20} />, show: perfil.rolSistema === "Super Administrador" },
  ];
  const menusVisibles = menuOptions.filter(item => item.show);

  const misEquipos = listaEquipos.filter(eq => eq.assignedToId === perfil.userId);
  const misNominas = listaNominas.filter(nom => nom.user?.id === perfil.userId || nom.userId === perfil.userId);
  const misTicketsAbiertos = listaTickets.filter(t => t.status !== 'RESOLVED').length;
  const ticketsFiltrados = listaTickets.filter(t => filtroAreaTicket === "TODOS" ? true : t.targetArea === filtroAreaTicket);

  return (
    <div className="flex h-screen bg-gray-50 text-slate-900 overflow-hidden font-sans relative">
      {/* BARRA SUPERIOR DE COLOR CORPORATIVO DINÁMICO */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50" style={{ backgroundColor: colorMarca }} />

      {/* SIDEBAR */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col z-20`}>
        <div className="h-16 flex items-center justify-center border-b border-gray-200 p-4">
          <div className="relative w-full h-10 flex items-center justify-center">
            <Image src={`/assets/images/${empresa}.png`} alt={`Logo ${empresa}`} fill className="object-contain" onError={(e) => { e.currentTarget.srcset = '/assets/images/logo-rmg.png' }} />
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <p className={`text-xs font-bold text-gray-400 mb-4 uppercase tracking-wider ${!sidebarOpen && 'hidden'}`}>
            {tenantInfo.name}
          </p>
          {menusVisibles.map((item, index) => {
            const activo = moduloActivo === item.name;
            return (
              <button
                key={index}
                onClick={() => setModuloActivo(item.name)}
                style={activo ? { backgroundColor: colorMarca, color: '#ffffff' } : {}}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activo ? 'font-semibold shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
              >
                {item.icon}
                {sidebarOpen && <span className="text-sm">{item.name}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-md hover:bg-gray-100 text-gray-500"><Menu size={20} /></button>
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colorMarca }} />
              <h2 className="text-xl font-semibold text-gray-800">{moduloActivo}</h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* CAMPANA DE NOTIFICACIONES */}
            <div className="relative">
              <button
                onClick={() => { setShowNotifMenu(!showNotifMenu); setShowProfileMenu(false); }}
                className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg relative transition-colors"
              >
                <Bell size={20} />
                {notificacionesNoLeidas > 0 && (
                  <span
                    style={{ backgroundColor: colorMarca }}
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white rounded-full flex items-center justify-center border-2 border-white"
                  >
                    {notificacionesNoLeidas}
                  </span>
                )}
              </button>

              {showNotifMenu && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/60">
                    <span className="text-sm font-bold text-gray-800">Notificaciones ({notificacionesNoLeidas} nuevas)</span>
                    {notificacionesNoLeidas > 0 && (
                      <button onClick={marcarTodasLeidas} className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
                        <CheckCheck size={14} /> Leer todas
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                    {listaNotificaciones.length === 0 ? (
                      <p className="p-6 text-center text-xs text-gray-400">No tienes notificaciones registradas.</p>
                    ) : (
                      listaNotificaciones.map(n => (
                        <div
                          key={n.id}
                          onClick={() => !n.isRead && marcarNotificacionLeida(n.id)}
                          className={`p-3.5 text-xs transition-colors cursor-pointer ${n.isRead ? 'bg-white text-gray-500' : 'bg-blue-50/50 text-gray-800 font-medium hover:bg-blue-50'}`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <p className="leading-relaxed">{n.message}</p>
                            {!n.isRead && <span className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ backgroundColor: colorMarca }} />}
                          </div>
                          <span className="text-[10px] text-gray-400 mt-1 block">
                            {new Date(n.createdAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="h-8 w-px bg-gray-300 mx-1"></div>
            
            {/* MENÚ DE PERFIL */}
            <div className="relative">
              <button onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifMenu(false); }} className="flex items-center gap-3 text-left hover:bg-gray-50 p-1.5 rounded-lg transition-colors">
                {perfil.avatarUrl ? (
                  <img
                    src={`${API_URL}${perfil.avatarUrl}`}
                    alt="Avatar"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    className="w-9 h-9 rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  <div style={{ backgroundColor: colorMarca }} className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">
                    {perfil.iniciales}
                  </div>
                )}
                <div className="hidden md:block">
                  <p className="text-sm font-bold text-gray-700 leading-tight">{perfil.nombre} {perfil.apellido}</p>
                  <p className="text-xs text-gray-500">{perfil.rolSistema}</p>
                </div>
                <ChevronDown size={16} className="text-gray-400 hidden md:block" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100 mb-1">
                    <p className="text-xs font-bold text-gray-400">ID: {perfil.numeroEmpleado}</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">{perfil.puesto}</p>
                  </div>
                  <button
                    onClick={() => { setShowModalPerfil(true); setShowProfileMenu(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                  >
                    <Settings size={16} /> Configuración de Cuenta
                  </button>
                  <button onClick={cerrarSesion} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors mt-1">
                    <LogOut size={16} /> Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto relative">
          {/* TARJETAS DE MÉTRICAS */}
          {perfil.rolSistema === 'Operativo' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm font-medium text-gray-500">Mis Equipos Asignados</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{misEquipos.length}</h3>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm font-medium text-gray-500">Mi Último Pago de Nómina</p>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                  {misNominas[0] ? `$${Number(misNominas[0].amountNet).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '$0.00'}
                </h3>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm font-medium text-gray-500">Mis Tickets Activos</p>
                <h3 className="text-2xl font-bold mt-1" style={{ color: colorMarca }}>{misTicketsAbiertos}</h3>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm font-medium text-gray-500">Empleados Activos</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{metricas.empleados}</h3>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm font-medium text-gray-500">Equipos Asignados</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{metricas.equipos}</h3>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm font-medium text-gray-500">Tickets Abiertos</p>
                <h3 className="text-2xl font-bold mt-1" style={{ color: colorMarca }}>{metricas.tickets}</h3>
              </div>
            </div>
          )}

          {/* ==========================================
              VISTA 1 Y 2: RESUMEN Y RECURSOS HUMANOS
             ========================================== */}
          {(moduloActivo === "Resumen" || moduloActivo === "Recursos Humanos") && (
            perfil.rolSistema === 'Operativo' ? (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">Hola, {perfil.nombre} {perfil.apellido}</h3>
                    <p className="text-gray-500 mt-1 text-sm">Bienvenido a tu portal de empleado en <span className="font-semibold text-gray-700">{tenantInfo.name}</span>. Descarga tus recibos de nómina en PDF, consulta tus equipos o solicita soporte.</p>
                  </div>
                  <button
                    onClick={() => { setModuloActivo("Helpdesk Tickets"); setShowModalTicket(true); }}
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
                              onClick={() => descargarResponsivaTIPDF(eq)}
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
                              onClick={() => descargarReciboNominaPDF(nom)}
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
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 flex flex-wrap gap-3 justify-between items-center bg-gray-50/50">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Directorio y Reporteador de Recursos Humanos</h3>
                    <p className="text-xs text-gray-500">Expedientes salariales, exportación a Excel y emisión de Constancias Laborales en PDF</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={exportarEmpleadosExcel}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <FileSpreadsheet size={15} /> Exportar Excel (.xlsx)
                    </button>
                    <button
                      onClick={exportarPlantillaRHPDF}
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
                        <th className="px-6 py-4 font-semibold text-right">Expediente y Reportes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {listaEmpleados.map((empleado) => (
                        <tr key={empleado.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              {empleado.avatarUrl ? (
                                <img
                                  src={`${API_URL}${empleado.avatarUrl}`}
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
                          <td className="px-6 py-4 text-right text-xs font-semibold space-x-2">
                            <button
                              onClick={() => descargarConstanciaLaboralPDF(empleado)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 inline-flex items-center gap-1 transition-colors"
                              title="Descargar Constancia Laboral en PDF"
                            >
                              <FileText size={14} /> Constancia PDF
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* ==========================================
              VISTA 3: MÓDULO DE EQUIPOS TI
             ========================================== */}
          {moduloActivo === "Equipos TI" && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 flex flex-wrap gap-3 justify-between items-center bg-gray-50/50">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Inventario de Hardware y Activos TI</h3>
                  <p className="text-xs text-gray-500">Control de laptops, números de serie, exportación y cartas responsivas en PDF</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportarInventarioTIExcel}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    <FileSpreadsheet size={15} /> Exportar Inventario (.xlsx)
                  </button>
                  {["Super Administrador", "Admin de IT"].includes(perfil.rolSistema) && (
                    <button
                      onClick={() => setShowModalEquipo(true)}
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
                            onClick={() => descargarResponsivaTIPDF(eq)}
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
          )}

          {/* ==========================================
              VISTA 4: MÓDULO DE FINANZAS Y NÓMINA
             ========================================== */}
          {moduloActivo === "Finanzas" && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 flex flex-wrap gap-3 justify-between items-center bg-gray-50/50">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Dispersión, Recibos PDF e Historial de Nómina</h3>
                  <p className="text-xs text-gray-500">Emisión de pagos, descarga de CFDI/Recibo interno en PDF y reporte contable en Excel</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportarNominasExcel}
                    className="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    <FileSpreadsheet size={15} /> Exportar Nómina (.xlsx)
                  </button>
                  <button
                    onClick={() => setShowModalNomina(true)}
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
                            onClick={() => descargarReciboNominaPDF(nom)}
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
          )}

          {/* ==========================================
              VISTA 5: HELPDESK TICKETS
             ========================================== */}
          {moduloActivo === "Helpdesk Tickets" && (
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
                    onClick={() => setShowModalTicket(true)}
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
          )}

          {/* ==========================================
              VISTA 6: CAJA NEGRA DE AUDITORÍA (Audit_Log)
             ========================================== */}
          {moduloActivo === "Auditoría" && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 flex flex-wrap gap-3 justify-between items-center bg-slate-900 text-white">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2"><ShieldAlert size={20} /> Caja Negra de Auditoría (Audit_Log)</h3>
                  <p className="text-xs text-slate-400">Registro inmutable de movimientos críticos dentro del corporativo</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={exportarAuditoriaExcel}
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
          )}
        </main>
      </div>

      {/* ==========================================
          MODAL CONFIGURACIÓN DE MI CUENTA
         ========================================== */}
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
                      <p className="text-[11px] text-slate-500 mt-0.5">Tamaño recomendado: cuadrado (ej. 400x400 px)</p>
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

      {/* ==========================================
          MODAL 1: ALTA / EDICIÓN DE EMPLEADO (HR)
         ========================================== */}
      {showModalEmpleado && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-slate-900">{modoEdicionEmpleado ? 'Editar Expediente de Empleado' : 'Alta de Nuevo Empleado'}</h3>
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelStyle}>Puesto Interno</label>
                  <input
                    required
                    type="text"
                    placeholder="Ej. Gerente de Planta"
                    value={formEmpleado.puesto}
                    onChange={e => setFormEmpleado({...formEmpleado, puesto: e.target.value})}
                    className={inputStyle}
                  />
                </div>
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
                <div>
                  <label className={labelStyle}>Tipo de Contrato</label>
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

              {modoEdicionEmpleado ? (
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
                          <p className="text-[11px] text-slate-400 mt-1">Haz clic sobre el recuadro si deseas cambiarla</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-4 flex flex-col items-center">
                        <div className="bg-white p-3 rounded-full shadow-sm mb-2 border border-slate-200 group-hover:scale-105 transition-transform" style={{ color: colorMarca }}>
                          <UploadCloud size={24} />
                        </div>
                        <p className="text-xs font-bold text-slate-700">
                          Haz clic aquí o arrastra la foto en formato <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-900 font-mono">.PNG</span>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">Si no subes una foto, se asignará un avatar con sus iniciales</p>
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

      {/* ==========================================
          MODAL 2: REGISTRAR EQUIPO TI
         ========================================== */}
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
                  {listaEmpleados.map(emp => <option key={emp.id} value={emp.id}>{emp.numeroEmpleado} - {emp.nombreCompleto}</option>)}
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

      {/* ==========================================
          MODAL 3: DISPERSAR NÓMINA
         ========================================== */}
      {showModalNomina && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-slate-900">Dispersar Pago de Nómina</h3>
              <button onClick={() => setShowModalNomina(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={guardarNomina} className="p-6 space-y-4">
              <div>
                <label className={labelStyle}>Seleccionar Empleado</label>
                <select required value={formNomina.userId} onChange={e => seleccionarEmpleadoNomina(e.target.value)} className={inputStyle}>
                  <option value="">Selecciona un trabajador...</option>
                  {listaEmpleados.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.numeroEmpleado} - {emp.nombreCompleto} (${emp.salarioBase})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelStyle}>Monto Neto a Depositar ($)</label>
                <input required type="number" step="0.01" value={formNomina.amountNet} onChange={e => setFormNomina({...formNomina, amountNet: e.target.value})} className={inputStyle} />
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setShowModalNomina(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button type="submit" disabled={guardando} className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg">Emitir Pago</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 4: CREAR TICKET HELPDESK
         ========================================== */}
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
    </div>
  );
}
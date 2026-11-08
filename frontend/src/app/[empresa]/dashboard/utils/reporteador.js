import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const hexToRgb = (hex) => {
  const limpio = (hex || "#2563eb").replace("#", "");
  const bigint = parseInt(limpio.length === 3 ? limpio.split("").map(c => c + c).join("") : limpio, 16);
  if (isNaN(bigint)) return [37, 99, 235];
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
};

// Estampa el logo .PNG oficial de la empresa en la esquina superior derecha del PDF
const estamparLogoCorporativo = (doc, logoUrl, x = 168, y = 4.5, w = 22, h = 19) => {
  if (logoUrl && logoUrl.startsWith("data:image/png")) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x - 2, y - 1, w + 4, h + 2, 2.5, 2.5, "F");
      doc.addImage(logoUrl, "PNG", x, y, w, h);
    } catch (e) {
      console.warn("No se pudo incrustar el logo en el PDF:", e);
    }
  }
};

// 1. Exportar Plantilla de RH a Excel (Oculta sueldo si quien exporta es de RH)
export const exportarEmpleadosExcel = (listaEmpleados, empresa, incluirSalarios = false) => {
  const filas = listaEmpleados.map(emp => {
    const base = {
      "ID Empleado": emp.numeroEmpleado,
      "Nombre Completo": emp.nombreCompleto,
      "Correo Corporativo": emp.email,
      "Rol en Sistema": emp.rol,
      "Puesto Interno": emp.puesto,
      "Tipo de Contrato": emp.tipoContrato,
    };
    if (incluirSalarios) {
      base["Salario Base Mensual (MXN)"] = Number(emp.salarioBase);
    }
    base["Fecha de Ingreso"] = new Date(emp.fechaIngreso).toLocaleDateString('es-MX');
    base["Estatus"] = emp.estado;
    return base;
  });

  const ws = XLSX.utils.json_to_sheet(filas);
  ws["!cols"] = [{ wch: 14 }, { wch: 28 }, { wch: 30 }, { wch: 24 }, { wch: 24 }, { wch: 16 }, { wch: 22 }, { wch: 16 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Colaboradores");
  XLSX.writeFile(wb, `Plantilla_${empresa}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

// 2. Reporte General de Plantilla en PDF (Con logo oficial .PNG)
export const exportarPlantillaRHPDF = ({ listaEmpleados, tenantInfo, perfil, metricas, colorMarca, empresa, incluirSalarios = false }) => {
  const doc = new jsPDF({ orientation: "landscape" });
  const rgb = hexToRgb(colorMarca);

  doc.setFillColor(...rgb);
  doc.rect(0, 0, 297, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`${tenantInfo.name.toUpperCase()} — REPORTE DE PLANTILLA CORPORATIVA`, 14, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Generado por: ${perfil.nombre} ${perfil.apellido} (${perfil.rolSistema})   |   Fecha: ${new Date().toLocaleString('es-MX')}`, 14, 19.5);

  estamparLogoCorporativo(doc, tenantInfo?.logoUrl, 258, 3.5, 24, 19);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");

  if (incluirSalarios) {
    const masaSalarial = listaEmpleados.filter(e => e.isActive).reduce((acc, e) => acc + Number(e.salarioBase || 0), 0);
    doc.text(`Total Registrados: ${listaEmpleados.length}   |   Activos: ${metricas.empleados}   |   Masa Salarial Mensual: $${masaSalarial.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`, 14, 35);
  } else {
    const indefinidos = listaEmpleados.filter(e => e.isActive && e.tipoContrato === 'Indefinido').length;
    doc.text(`Total Registrados: ${listaEmpleados.length}   |   Colaboradores Activos: ${metricas.empleados}   |   Contratos Indefinidos: ${indefinidos}`, 14, 35);
  }

  const head = incluirSalarios
    ? [["ID", "Nombre Completo", "Correo Corporativo", "Rol Sistema", "Puesto", "Contrato", "Salario Base", "Estado"]]
    : [["ID", "Nombre Completo", "Correo Corporativo", "Rol Sistema", "Puesto", "Tipo Contrato", "Fecha Ingreso", "Estado"]];

  const body = listaEmpleados.map(e => incluirSalarios
    ? [
        e.numeroEmpleado,
        e.nombreCompleto,
        e.email,
        e.rol,
        e.puesto,
        e.tipoContrato,
        `$${Number(e.salarioBase).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        e.estado
      ]
    : [
        e.numeroEmpleado,
        e.nombreCompleto,
        e.email,
        e.rol,
        e.puesto,
        e.tipoContrato,
        new Date(e.fechaIngreso).toLocaleDateString('es-MX'),
        e.estado
      ]
  );

  autoTable(doc, {
    startY: 40,
    head,
    body,
    headStyles: { fillColor: rgb, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 8.5, cellPadding: 3 }
  });

  doc.save(`Reporte_Plantilla_${empresa}.pdf`);
};

// 3. Constancia Laboral Individual en PDF (Membretada y con espaciado optimizado)
export const descargarConstanciaLaboralPDF = (emp, { tenantInfo, perfil, colorMarca, dominioCorporativo, incluirSalarios = false }) => {
  const doc = new jsPDF();
  const rgb = hexToRgb(colorMarca);
  const fechaHoy = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  const fechaIngreso = new Date(emp.fechaIngreso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

  doc.setFillColor(...rgb);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14.5);
  doc.text(tenantInfo.name.toUpperCase(), 20, 14);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text(`DIRECCIÓN CORPORATIVA DE RECURSOS HUMANOS  •  @${dominioCorporativo}`, 20, 22);

  estamparLogoCorporativo(doc, tenantInfo?.logoUrl, 168, 4.5, 22, 19);

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9.5);
  doc.text(`Folio: RH-CONST-${emp.numeroEmpleado}-${new Date().getFullYear()}`, 125, 42);
  doc.text(`Fecha de emisión: ${fechaHoy}`, 125, 48);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.text("A QUIEN CORRESPONDA:", 20, 62);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  const parrafo1 = `Por medio de la presente, la Dirección de Recursos Humanos de ${tenantInfo.name} hace constar que el(la) C. ${emp.nombreCompleto.toUpperCase()}, identificado(a) con el Número de Empleado ${emp.numeroEmpleado} y correo institucional ${emp.email}, presta sus servicios profesionales dentro de nuestra organización.`;
  doc.text(doc.splitTextToSize(parrafo1, 170), 20, 73);

  const filasExpediente = [
    ["Nombre del Colaborador", emp.nombreCompleto],
    ["Número de Empleado (ID)", emp.numeroEmpleado],
    ["Puesto Desempeñado", emp.puesto],
    ["Departamento / Rol", emp.rol],
    ["Modalidad de Contrato", emp.tipoContrato],
    ["Fecha de Ingreso", fechaIngreso],
  ];
  if (incluirSalarios) {
    filasExpediente.push(["Salario Base Mensual", `$${Number(emp.salarioBase).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`]);
  }
  filasExpediente.push(["Estatus Actual en el Corporativo", emp.estado.toUpperCase()]);

  autoTable(doc, {
    startY: 98,
    margin: { left: 20, right: 20 },
    head: [["Concepto del Expediente Laboral", "Información Oficial Registrada"]],
    body: filasExpediente,
    headStyles: { fillColor: rgb, textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 75 } },
    styles: { fontSize: 9.5, cellPadding: 3.2 }
  });

  const finalY = (doc.lastAutoTable?.finalY || 172) + 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const parrafo2 = `Se extiende la presente constancia laboral a petición del interesado(a) para los fines legales o administrativos que a éste(a) convengan.`;
  doc.text(doc.splitTextToSize(parrafo2, 170), 20, finalY);

  doc.setFont("helvetica", "bold");
  doc.text("ATENTAMENTE", 105, finalY + 20, { align: "center" });
  doc.setDrawColor(148, 163, 184);
  doc.line(65, finalY + 36, 145, finalY + 36);
  doc.text(`${perfil.nombre} ${perfil.apellido}`, 105, finalY + 42, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`${perfil.rolSistema} — ${tenantInfo.name}`, 105, finalY + 47.5, { align: "center" });

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("Documento electrónico generado y validado por RMRG Systems Cloud ERP.", 105, 285, { align: "center" });

  doc.save(`Constancia_Laboral_${emp.numeroEmpleado}_${emp.lastName}.pdf`);
};

// 4. Recibo de Nómina en PDF (Encabezado en 2 líneas sin choque con el logo)
export const descargarReciboNominaPDF = (nom, { tenantInfo, perfil, colorMarca }) => {
  const doc = new jsPDF();
  const rgb = hexToRgb(colorMarca);
  const nombreTrabajador = nom.user
    ? `${nom.user.firstName} ${nom.user.lastName}`
    : `${perfil.nombre} ${perfil.apellido}`;
  const numEmp = nom.user?.numeroEmpleado || perfil.numeroEmpleado;
  const correoEmp = nom.user?.email || perfil.email;
  const puestoEmp = nom.user?.hrProfile?.position || perfil.puesto || "Colaborador";

  const montoNeto = Number(nom.amountNet || 0);
  const sueldoBaseTabulador = Number(nom.user?.hrProfile?.baseSalary || 0);
  const sueldoBaseReal = sueldoBaseTabulador > 0 ? sueldoBaseTabulador : montoNeto;
  const diferencia = +(montoNeto - sueldoBaseReal).toFixed(2);

  const bonoAplicado = diferencia > 0 ? diferencia : 0;
  const descuentoAplicado = diferencia < 0 ? Math.abs(diferencia) : 0;

  doc.setFillColor(...rgb);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(tenantInfo.name.toUpperCase(), 18, 13);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`COMPROBANTE DE NÓMINA  •  Folio: NOM-${nom.id.slice(0, 8).toUpperCase()}  |  Fecha: ${new Date(nom.paymentDate).toLocaleDateString('es-MX')}`, 18, 21.5);

  estamparLogoCorporativo(doc, tenantInfo?.logoUrl, 168, 4.5, 22, 19);

  autoTable(doc, {
    startY: 40,
    margin: { left: 18, right: 18 },
    head: [["Datos del Colaborador", "Información de Dispersión Bancaria"]],
    body: [
      [`Nombre: ${nombreTrabajador}`, `Estatus del Pago: ${nom.status}`],
      [`ID Empleado: ${numEmp} (${puestoEmp})`, `Moneda: MXN (Peso Mexicano)`],
      [`Correo: ${correoEmp}`, `Método: Dispersión de Nómina Corporativa`]
    ],
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
    styles: { fontSize: 9.5, cellPadding: 3.5 }
  });

  const filasConceptos = [
    [
      "P-001",
      "Sueldo Base Mensual (Según Tabulador Oficial)",
      `$${sueldoBaseReal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      "-"
    ]
  ];

  if (bonoAplicado > 0) {
    filasConceptos.push([
      "P-002",
      "Bonos / Percepciones Extraordinarias Autorizadas",
      `$${bonoAplicado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      "-"
    ]);
  }

  if (descuentoAplicado > 0) {
    filasConceptos.push([
      "D-001",
      "Descuentos / Deducciones Aplicadas en el Periodo",
      "-",
      `$${descuentoAplicado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
    ]);
  }

  filasConceptos.push([
    "NETO",
    "TOTAL NETO DEPOSITADO AL COLABORADOR",
    `$${montoNeto.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`,
    descuentoAplicado > 0 ? `$${descuentoAplicado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : "$0.00"
  ]);

  autoTable(doc, {
    startY: (doc.lastAutoTable?.finalY || 75) + 10,
    margin: { left: 18, right: 18 },
    head: [["Clave", "Concepto de Nómina", "Percepciones (+)", "Deducciones (-)"]],
    body: filasConceptos,
    headStyles: { fillColor: rgb, textColor: [255, 255, 255], fontStyle: "bold" },
    didParseCell: (data) => {
      if (data.row.index === filasConceptos.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [236, 253, 245];
      }
    },
    styles: { fontSize: 9.5, cellPadding: 4 }
  });

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Recibo conciliado con el Tabulador Salarial y auditado en el módulo Finance_Payroll de RMRG Systems.", 105, 280, { align: "center" });

  doc.save(`Recibo_Nomina_${numEmp}_${nom.id.slice(0, 6)}.pdf`);
};

// 5. Exportar Historial de Nóminas a Excel
export const exportarNominasExcel = (listaNominas, empresa) => {
  const filas = listaNominas.map(n => ({
    "Folio": n.id.slice(0, 8).toUpperCase(),
    "ID Empleado": n.user?.numeroEmpleado || "N/A",
    "Empleado": `${n.user?.firstName || ""} ${n.user?.lastName || ""}`.trim(),
    "Correo": n.user?.email || "",
    "Fecha de Pago": new Date(n.paymentDate).toLocaleDateString('es-MX'),
    "Salario Base Tabulador (MXN)": Number(n.user?.hrProfile?.baseSalary || n.amountNet),
    "Monto Neto Dispersado (MXN)": Number(n.amountNet),
    "Estatus": n.status
  }));
  const ws = XLSX.utils.json_to_sheet(filas);
  ws["!cols"] = [{ wch: 12 }, { wch: 14 }, { wch: 26 }, { wch: 28 }, { wch: 16 }, { wch: 24 }, { wch: 24 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Nominas_Dispersadas");
  XLSX.writeFile(wb, `Historial_Nominas_${empresa}.xlsx`);
};

// 6. Carta Responsiva de Equipo TI en PDF (Encabezado en 2 líneas para no taparse con el logo)
export const descargarResponsivaTIPDF = (eq, { tenantInfo, colorMarca }) => {
  const doc = new jsPDF();
  const rgb = hexToRgb(colorMarca);
  const responsable = eq.assignedTo
    ? `${eq.assignedTo.firstName} ${eq.assignedTo.lastName} (ID: ${eq.assignedTo.numeroEmpleado})`
    : "SIN ASIGNAR (Resguardo en Almacén TI)";

  doc.setFillColor(...rgb);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(tenantInfo.name.toUpperCase(), 18, 13);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.text(`CARTA RESPONSIVA DE RESGUARDO DE HARDWARE TI  •  SERIE: ${eq.serialNumber}`, 18, 21.5);

  estamparLogoCorporativo(doc, tenantInfo?.logoUrl, 168, 4.5, 22, 19);

  autoTable(doc, {
    startY: 40,
    margin: { left: 18, right: 18 },
    head: [["Especificación del Activo Tecnológico", "Valor Oficial Registrado"]],
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

export const exportarInventarioTIExcel = (listaEquipos, empresa) => {
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
export const exportarAuditoriaExcel = (listaAuditoria, empresa) => {
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
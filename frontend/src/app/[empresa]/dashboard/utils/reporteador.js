import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const hexToRgb = (hex) => {
  const limpio = (hex || "#2563eb").replace("#", "");
  const bigint = parseInt(limpio.length === 3 ? limpio.split("").map(c => c + c).join("") : limpio, 16);
  if (isNaN(bigint)) return [37, 99, 235];
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
};

// 1. Exportar Plantilla de RH a Excel
export const exportarEmpleadosExcel = (listaEmpleados, empresa) => {
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
export const exportarPlantillaRHPDF = ({ listaEmpleados, tenantInfo, perfil, metricas, colorMarca, empresa }) => {
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
export const descargarConstanciaLaboralPDF = (emp, { tenantInfo, perfil, colorMarca, dominioCorporativo }) => {
  const doc = new jsPDF();
  const rgb = hexToRgb(colorMarca);
  const fechaHoy = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  const fechaIngreso = new Date(emp.fechaIngreso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

  doc.setFillColor(...rgb);
  doc.rect(0, 0, 210, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(tenantInfo.name.toUpperCase(), 20, 16);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.text(`DIRECCIÓN CORPORATIVA DE RECURSOS HUMANOS  •  DOMINIO OFICIAL @${dominioCorporativo}`, 20, 24);

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(10);
  doc.text(`Folio: RH-CONST-${emp.numeroEmpleado}-${new Date().getFullYear()}`, 135, 45);
  doc.text(`Fecha de emisión: ${fechaHoy}`, 135, 51);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("A QUIEN CORRESPONDA:", 20, 70);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const parrafo1 = `Por medio de la presente, la Dirección de Recursos Humanos de ${tenantInfo.name} hace constar que el(la) C. ${emp.nombreCompleto.toUpperCase()}, identificado(a) con el Número de Empleado ${emp.numeroEmpleado} y correo institucional ${emp.email}, presta sus servicios profesionales dentro de nuestra organización.`;
  doc.text(doc.splitTextToSize(parrafo1, 170), 20, 84);

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

  doc.setFont("helvetica", "bold");
  doc.text("ATENTAMENTE", 105, finalY + 26, { align: "center" });
  doc.setDrawColor(148, 163, 184);
  doc.line(65, finalY + 46, 145, finalY + 46);
  doc.text(`${perfil.nombre} ${perfil.apellido}`, 105, finalY + 53, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(`${perfil.rolSistema} — ${tenantInfo.name}`, 105, finalY + 59, { align: "center" });

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("Documento electrónico generado y validado por RMRG Systems Cloud ERP.", 105, 285, { align: "center" });

  doc.save(`Constancia_Laboral_${emp.numeroEmpleado}_${emp.lastName}.pdf`);
};

// 4. Recibo de Nómina en PDF
export const descargarReciboNominaPDF = (nom, { tenantInfo, perfil, colorMarca }) => {
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
export const exportarNominasExcel = (listaNominas, empresa) => {
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

// 6. Carta Responsiva de Equipo TI en PDF e Inventario Excel
export const descargarResponsivaTIPDF = (eq, { tenantInfo, colorMarca }) => {
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
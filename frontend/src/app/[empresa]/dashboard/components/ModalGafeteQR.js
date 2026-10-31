import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { jsPDF } from "jspdf";
import { X, Download, ShieldCheck, Building2, Mail, BadgeCheck } from "lucide-react";

const hexToRgb = (hex) => {
  const limpio = (hex || "#2563eb").replace("#", "");
  const bigint = parseInt(limpio.length === 3 ? limpio.split("").map(c => c + c).join("") : limpio, 16);
  if (isNaN(bigint)) return [37, 99, 235];
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
};

export default function ModalGafeteQR({
  empleado,
  onClose,
  tenantInfo,
  colorMarca,
  dominioCorporativo,
  resolverAvatar
}) {
  const qrBoxRef = useRef(null);

  if (!empleado) return null;

  // Contenido estructurado que muestra el celular al escanear el código QR
  const qrPayload = [
    `CORPORATIVO: ${tenantInfo.name}`,
    `ID EMPLEADO: ${empleado.numeroEmpleado}`,
    `NOMBRE: ${empleado.nombreCompleto}`,
    `PUESTO: ${empleado.puesto}`,
    `ROL: ${empleado.rol}`,
    `CORREO: ${empleado.email}`,
    `ESTATUS: ${empleado.isActive ? "ACTIVO OFICIAL" : "BAJA / INACTIVO"}`
  ].join("\n");

  const avatarSrc = resolverAvatar(empleado.avatarUrl);

  const descargarGafetePDF = () => {
    // Tamaño tarjeta CR80 vertical (85mm x 135mm)
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [85, 135]
    });
    const rgb = hexToRgb(colorMarca);

    // Encabezado con color de la empresa
    doc.setFillColor(...rgb);
    doc.rect(0, 0, 85, 34, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(tenantInfo.name.toUpperCase(), 42.5, 12, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(`GAFETE DE IDENTIFICACIÓN OFICIAL`, 42.5, 18, { align: "center" });

    // Círculo blanco para foto o iniciales
    doc.setFillColor(255, 255, 255);
    doc.circle(42.5, 34, 13, "F");

    if (avatarSrc && avatarSrc.startsWith("data:image/png")) {
      try {
        doc.addImage(avatarSrc, "PNG", 31.5, 23, 22, 22);
      } catch {
        doc.setTextColor(...rgb);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(empleado.iniciales, 42.5, 36.5, { align: "center" });
      }
    } else {
      doc.setTextColor(...rgb);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(empleado.iniciales, 42.5, 36.5, { align: "center" });
    }

    // Datos del empleado
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(empleado.nombreCompleto, 42.5, 55, { align: "center" });

    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(empleado.puesto.toUpperCase(), 42.5, 61, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(`ID EMPLEADO: ${empleado.numeroEmpleado}  •  ${empleado.tipoContrato}`, 42.5, 66.5, { align: "center" });
    doc.text(empleado.email, 42.5, 71, { align: "center" });

    // Insertar el código QR desde el Canvas renderizado
    const canvas = qrBoxRef.current?.querySelector("canvas");
    if (canvas) {
      const qrDataUrl = canvas.toDataURL("image/png");
      doc.addImage(qrDataUrl, "PNG", 25, 76, 35, 35);
    }

    // Pie de credencial
    doc.setFillColor(...rgb);
    doc.rect(0, 125, 85, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(`ESTATUS: ${empleado.estado.toUpperCase()}  |  @${dominioCorporativo}`, 42.5, 131, { align: "center" });

    doc.save(`Gafete_${empleado.numeroEmpleado}_${empleado.lastName}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 relative">
        {/* BOTÓN CERRAR */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-20 bg-black/25 hover:bg-black/40 text-white p-1.5 rounded-full transition-colors"
        >
          <X size={18} />
        </button>

        {/* CABECERA INSTITUCIONAL DEL GAFETE */}
        <div
          style={{ backgroundColor: colorMarca }}
          className="pt-7 pb-14 px-6 text-center text-white relative"
        >
          <div className="w-10 h-1.5 bg-white/40 rounded-full mx-auto mb-3" />
          <p className="text-[11px] font-bold uppercase tracking-widest opacity-90 flex items-center justify-center gap-1">
            <Building2 size={13} /> {tenantInfo.name}
          </p>
          <h4 className="text-xs font-medium opacity-80 mt-0.5">Credencial Digital Corporativa</h4>
        </div>

        {/* FOTO / AVATAR FLOTANTE */}
        <div className="relative -mt-12 flex justify-center">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={empleado.nombreCompleto}
              className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-lg bg-white"
            />
          ) : (
            <div
              style={{ backgroundColor: colorMarca }}
              className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg flex items-center justify-center text-white text-2xl font-bold"
            >
              {empleado.iniciales}
            </div>
          )}
        </div>

        {/* DATOS DEL COLABORADOR + QR */}
        <div className="px-6 pt-3 pb-6 text-center space-y-3">
          <div>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
              empleado.isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
            }`}>
              <BadgeCheck size={13} /> {empleado.isActive ? "Colaborador Activo" : "Cuenta Inactiva"}
            </span>
            <h3 className="text-lg font-extrabold text-slate-900 mt-1.5">{empleado.nombreCompleto}</h3>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: colorMarca }}>
              {empleado.puesto}
            </p>
            <p className="text-xs text-slate-500 flex items-center justify-center gap-1 mt-1">
              <Mail size={12} /> {empleado.email}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">No. Empleado</p>
              <p className="font-mono font-bold text-slate-900">{empleado.numeroEmpleado}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Rol Seguridad</p>
              <p className="font-semibold text-slate-800 truncate">{empleado.rol}</p>
            </div>
          </div>

          {/* CÓDIGO QR ESCANEABLE */}
          <div ref={qrBoxRef} className="flex flex-col items-center justify-center pt-1">
            <div className="p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-sm">
              <QRCodeCanvas
                value={qrPayload}
                size={136}
                bgColor="#ffffff"
                fgColor="#0f172a"
                level="M"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
              <ShieldCheck size={13} className="text-emerald-600" /> Escanea para validar identidad laboral
            </p>
          </div>

          {/* BOTÓN DESCARGAR GAFETE EN PDF */}
          <div className="pt-2 flex gap-2">
            <button
              onClick={onClose}
              className="w-1/3 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={descargarGafetePDF}
              style={{ backgroundColor: colorMarca }}
              className="w-2/3 py-2.5 text-xs font-bold text-white rounded-xl shadow-md hover:opacity-95 flex items-center justify-center gap-1.5 transition-opacity"
            >
              <Download size={15} /> Descargar Gafete PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Clock, Building2, LifeBuoy, BookOpen, Info, X,
  Mail, Send, Copy, Check, ShieldCheck, Server,
  Database, Lock, ArrowRight, Sparkles, ShieldAlert, KeyRound
} from "lucide-react";

const LOGOS_LOCALES = {
  thecocacolacompany: "/assets/images/thecocacolacompany.png",
  samsungelectronics: "/assets/images/samsungelectronics.png",
  microsoftcorporation: "/assets/images/microsoftcorporation.png",
  amazonwebservices: "/assets/images/amazonwebservices.png"
};

const CORREO_MAESTRO = "juanmaya400@gmail.com";

export default function LoginCorporativo() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  // Estados del Login (Empleados y Modo Dios)
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [masterKey, setMasterKey] = useState("");
  const [nombreArchivoPem, setNombreArchivoPem] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  // Detecta automáticamente si el correo ingresado es el del System Owner (Modo Dios)
  const esModoDios = usuario.trim().toLowerCase() === CORREO_MAESTRO;

  // Reloj limpio combinado con el color del logo RMRG Systems
  const [horaActual, setHoraActual] = useState("--:--:--");
  const [fechaActual, setFechaActual] = useState("");

  // Navegación de las 4 secciones superiores
  const [seccionActiva, setSeccionActiva] = useState(null);
  const [portales, setPortales] = useState([]);
  const [cargandoPortales, setCargandoPortales] = useState(false);

  // Estado del formulario de Soporte TI -> juanmaya400@gmail.com
  const [formSoporte, setFormSoporte] = useState({
    identificador: "",
    categoria: "Restablecimiento de Acceso / Contraseña",
    mensaje: ""
  });
  const [correoCopiado, setCorreoCopiado] = useState(false);

  useEffect(() => {
    const actualizarReloj = () => {
      const ahora = new Date();
      setHoraActual(
        ahora.toLocaleTimeString("es-MX", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false
        })
      );
      setFechaActual(
        ahora.toLocaleDateString("es-MX", {
          weekday: "short",
          day: "2-digit",
          month: "short"
        }).replace(".", "")
      );
    };

    actualizarReloj();
    const timer = setInterval(actualizarReloj, 1000);
    return () => clearInterval(timer);
  }, []);

  const cargarPortalesCorporativos = async () => {
    setCargandoPortales(true);
    try {
      const res = await fetch(`${API_URL}/api/public/portales`);
      if (res.ok) {
        const data = await res.json();
        setPortales(data);
      }
    } catch (err) {
      console.error("Error al consultar portales:", err);
    } finally {
      setCargandoPortales(false);
    }
  };

  const abrirSeccion = (nombre) => {
    setSeccionActiva(nombre);
    if (nombre === "PORTALES") {
      cargarPortalesCorporativos();
    }
  };

  // Lectura del archivo criptográfico .pem para Modo Dios
  const handlePemUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNombreArchivoPem(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setMasterKey(String(ev.target?.result || ""));
    };
    reader.readAsText(file);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setCargando(true);

    try {
      // 1. FLUJO DE AUTENTICACIÓN MAESTRA (MODO DIOS)
      if (esModoDios) {
        if (!masterKey.trim()) {
          setError("Por favor carga tu archivo de Llave Maestra (.pem) para entrar al Modo Dios.");
          setCargando(false);
          return;
        }

        const resMaster = await fetch(`${API_URL}/api/auth/master-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: usuario.trim().toLowerCase(),
            password,
            masterKey
          })
        });

        const dataMaster = await resMaster.json();
        if (!resMaster.ok) {
          setError(dataMaster.error || "Credenciales maestras o llave .pem inválidas.");
          setCargando(false);
          return;
        }

        localStorage.setItem("rmrg_master_token", dataMaster.token);
        router.push("/maya-admin/dashboard");
        return;
      }

      // 2. FLUJO DE AUTENTICACIÓN CORPORATIVA NORMAL (EMPLEADOS / ADMINS)
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, password })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Credenciales incorrectas.");
        setCargando(false);
        return;
      }

      localStorage.setItem("rmrg_token", data.token);
      const slugEmpresa = data.tenant.toLowerCase().replace(/[^a-z0-9]/g, "");
      router.push(`/${slugEmpresa}/dashboard`);
    } catch (err) {
      setError("No se pudo conectar con el servidor de RMRG Systems.");
      setCargando(false);
    }
  };

  const seleccionarPortalEnLogin = (dominio) => {
    setUsuario(`@${dominio}`);
    setSeccionActiva(null);
  };

  const enviarCorreoSoporte = (e) => {
    e.preventDefault();
    const destinatario = "juanmaya400@gmail.com";
    const asunto = encodeURIComponent(`[Soporte RMRG Systems] ${formSoporte.categoria}`);
    const cuerpo = encodeURIComponent(
      `Hola Ing. Carlos Maya,\n\n` +
      `Solicito apoyo técnico en la plataforma RMRG Systems ERP:\n\n` +
      `• Usuario / ID / Empresa: ${formSoporte.identificador || "No especificado"}\n` +
      `• Categoría: ${formSoporte.categoria}\n` +
      `• Detalle de la solicitud:\n${formSoporte.mensaje}\n\n` +
      `Enviado desde el Portal de Acceso Corporativo RMRG Systems.`
    );
    window.location.href = `mailto:${destinatario}?subject=${asunto}&body=${cuerpo}`;
  };

  const copiarCorreoAdmin = () => {
    navigator.clipboard.writeText("juanmaya400@gmail.com");
    setCorreoCopiado(true);
    setTimeout(() => setCorreoCopiado(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] flex flex-col justify-between font-sans text-slate-900">
      {/* BARRA SUPERIOR CORPORATIVA */}
      <header className="h-16 bg-white border-b border-slate-200/90 px-6 lg:px-10 flex items-center justify-between sticky top-0 z-30 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
        <div className="flex items-center gap-8">
          {/* LOGO RMRG SYSTEMS */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center shadow-sm">
              <Image
                src="/assets/images/logo-rmg.png"
                alt="RMRG Systems"
                width={26}
                height={26}
                className="object-contain"
              />
            </div>
            <span className="font-extrabold text-sm tracking-wider text-slate-900">
              RMRG SYSTEMS
            </span>
          </div>

          {/* 4 SECCIONES INTERACTIVAS DE LA BARRA SUPERIOR */}
          <nav className="hidden md:flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => abrirSeccion("PORTALES")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                seccionActiva === "PORTALES"
                  ? "bg-sky-50 text-sky-700 border border-sky-200 shadow-sm"
                  : "text-slate-600 hover:text-sky-700 hover:bg-slate-100"
              }`}
            >
              <Building2 size={14} className="text-sky-600" />
              Portales
            </button>

            <button
              type="button"
              onClick={() => abrirSeccion("SOPORTE")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                seccionActiva === "SOPORTE"
                  ? "bg-sky-50 text-sky-700 border border-sky-200 shadow-sm"
                  : "text-slate-600 hover:text-sky-700 hover:bg-slate-100"
              }`}
            >
              <LifeBuoy size={14} className="text-sky-600" />
              Soporte TI
            </button>

            <button
              type="button"
              onClick={() => abrirSeccion("DIRECTORIO")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                seccionActiva === "DIRECTORIO"
                  ? "bg-sky-50 text-sky-700 border border-sky-200 shadow-sm"
                  : "text-slate-600 hover:text-sky-700 hover:bg-slate-100"
              }`}
            >
              <BookOpen size={14} className="text-sky-600" />
              Directorio
            </button>

            <button
              type="button"
              onClick={() => abrirSeccion("ACERCA")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                seccionActiva === "ACERCA"
                  ? "bg-sky-50 text-sky-700 border border-sky-200 shadow-sm"
                  : "text-slate-600 hover:text-sky-700 hover:bg-slate-100"
              }`}
            >
              <Info size={14} className="text-sky-600" />
              Acerca de
            </button>
          </nav>
        </div>

        {/* RELOJ CORPORATIVO LIMPIO (Sin Cloud Sync) */}
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-sky-50/70 border border-sky-200/80 shadow-sm">
          <div className="p-1 rounded-lg bg-sky-500/10 text-sky-600">
            <Clock size={14} />
          </div>
          <div className="flex items-baseline gap-2">
            {fechaActual && (
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 hidden sm:inline">
                {fechaActual}
              </span>
            )}
            <span className="font-mono text-xs font-bold text-slate-800 tracking-wider bg-white px-2.5 py-0.5 rounded-md border border-sky-100">
              {horaActual}
            </span>
          </div>
        </div>
      </header>

      {/* TARJETA CENTRAL DE LOGIN */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div
          className={`bg-white w-full max-w-[420px] rounded-3xl shadow-[0_12px_40px_rgba(15,23,42,0.06)] border p-8 sm:p-10 transition-all ${
            esModoDios ? "border-red-200 ring-2 ring-red-500/10" : "border-slate-100"
          }`}
        >
          <div className="flex flex-col items-center text-center mb-7">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-sm border ${
                esModoDios
                  ? "bg-red-50 border-red-200 text-red-600"
                  : "bg-slate-50 border-slate-200/80"
              }`}
            >
              {esModoDios ? (
                <ShieldAlert size={34} />
              ) : (
                <Image
                  src="/assets/images/logo-rmg.png"
                  alt="Logo RMRG"
                  width={38}
                  height={38}
                  className="object-contain"
                />
              )}
            </div>

            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {esModoDios ? "Consola Maestra // Modo Dios" : "Acceso Corporativo"}
            </h1>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-xs">
              {esModoDios
                ? "Cuenta Root detectada. Adjunta tu llave criptográfica (.pem) para desbloquear el gobierno global."
                : "Ingresa con tu ID de 6 dígitos o correo. El sistema detectará automáticamente tu empresa."}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="relative">
              <label className="absolute -top-2 left-3.5 bg-white px-1.5 text-[11px] font-bold text-slate-700">
                Usuario o ID Empleado
              </label>
              <input
                required
                type="text"
                placeholder="Ej. 100001 o admin@coca-cola.com"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className="w-full px-4 py-3.5 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15 transition-all"
              />
            </div>

            <div className="relative">
              <label className="absolute -top-2 left-3.5 bg-white px-1.5 text-[11px] font-bold text-slate-700">
                Contraseña
              </label>
              <input
                required
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15 transition-all"
              />
            </div>

            {/* CARGADOR DE LLAVE CRIPTOGRÁFICA (.PEM) EXCLUSIVO PARA MODO DIOS */}
            {esModoDios && (
              <div className="p-4 rounded-2xl bg-red-50/60 border border-red-200 space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-800 flex items-center gap-1.5">
                    <KeyRound size={14} /> Llave Maestra Criptográfica (.pem)
                  </span>
                  {masterKey && (
                    <button
                      type="button"
                      onClick={() => {
                        setMasterKey("");
                        setNombreArchivoPem("");
                      }}
                      className="text-[11px] font-bold text-red-600 hover:underline"
                    >
                      Quitar llave
                    </button>
                  )}
                </div>

                <label className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-red-300 hover:border-red-500 bg-white flex flex-col items-center justify-center cursor-pointer transition-colors text-center">
                  <input
                    type="file"
                    accept=".pem,.key,.txt"
                    onChange={handlePemUpload}
                    className="hidden"
                  />
                  {masterKey ? (
                    <span className="text-xs font-bold text-emerald-700">
                      ✓ Firma cargada: {nombreArchivoPem || "master.pem"}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-600">
                      Haz clic para seleccionar tu archivo <strong className="text-red-700">.pem</strong>
                    </span>
                  )}
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className={`w-full py-3.5 rounded-xl text-white text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-60 cursor-pointer ${
                esModoDios
                  ? "bg-red-600 hover:bg-red-500"
                  : "bg-slate-900 hover:bg-slate-800"
              }`}
            >
              {cargando
                ? "Verificando credenciales..."
                : esModoDios
                  ? "Desbloquear Modo Dios"
                  : "Entrar al sistema"}
            </button>
          </form>
        </div>
      </main>

      {/* MODAL 1: CATÁLOGO LIMPIO DE PORTALES CORPORATIVOS */}
      {seccionActiva === "PORTALES" && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-100 text-sky-700">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Empresas y Portales Corporativos
                  </h3>
                  <p className="text-xs text-slate-500">
                    Selecciona tu organización para autocompletar tu dominio de acceso
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSeccionActiva(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {cargandoPortales ? (
                <div className="py-12 text-center text-xs font-semibold text-slate-400">
                  Cargando empresas registradas...
                </div>
              ) : portales.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No se encontraron empresas registradas.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {portales.map((t) => {
                    const slug = t.name.toLowerCase().replace(/[^a-z0-9]/g, "");
                    const imgFallback = LOGOS_LOCALES[slug] || null;
                    const logoMostrar = t.logoUrl || imgFallback;

                    return (
                      <div
                        key={t.id}
                        className="p-4 rounded-xl border border-slate-200 hover:border-sky-300 bg-white shadow-sm hover:shadow transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {logoMostrar ? (
                            <img
                              src={logoMostrar}
                              alt={t.name}
                              className="w-12 h-12 rounded-xl object-contain bg-slate-50 p-1.5 border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div
                              style={{ backgroundColor: t.themeColor || "#0284c7" }}
                              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shrink-0 shadow-sm"
                            >
                              {t.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-slate-900 truncate">
                              {t.name}
                            </h4>
                            <p className="text-xs font-mono text-slate-500 truncate">
                              @{t.emailDomain}
                            </p>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 ${
                                t.isActive
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-red-50 text-red-700 border border-red-200"
                              }`}
                            >
                              {t.isActive ? "● Operativo" : "● Suspendido"}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={!t.isActive}
                          onClick={() => seleccionarPortalEnLogin(t.emailDomain)}
                          className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-xs font-bold text-sky-700 flex items-center gap-1 shrink-0 disabled:opacity-40 transition-colors"
                        >
                          Usar dominio <ArrowRight size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSeccionActiva(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SOPORTE TI (CONTACTO DIRECTO A juanmaya400@gmail.com) */}
      {seccionActiva === "SOPORTE" && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-100 text-sky-700">
                  <LifeBuoy size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Centro de Soporte TI y Asistencia Cloud
                  </h3>
                  <p className="text-xs text-slate-500">
                    Atención directa del Administrador General del Sistema
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSeccionActiva(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={enviarCorreoSoporte} className="p-6 space-y-4">
              <div className="p-3.5 rounded-xl bg-sky-50/80 border border-sky-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-sky-600 text-white">
                    <Mail size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Ing. Carlos Maya • System Owner
                    </p>
                    <p className="text-xs font-mono text-sky-700 font-semibold">
                      juanmaya400@gmail.com
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={copiarCorreoAdmin}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-sky-200 text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  {correoCopiado ? (
                    <>
                      <Check size={13} className="text-emerald-600" /> Copiado
                    </>
                  ) : (
                    <>
                      <Copy size={13} /> Copiar correo
                    </>
                  )}
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tu ID de Empleado, Correo o Corporativo
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej. 100002 o usuario@coca-cola.com"
                  value={formSoporte.identificador}
                  onChange={(e) =>
                    setFormSoporte({ ...formSoporte, identificador: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tipo de Incidencia
                </label>
                <select
                  value={formSoporte.categoria}
                  onChange={(e) =>
                    setFormSoporte({ ...formSoporte, categoria: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-600 font-semibold"
                >
                  <option value="Restablecimiento de Acceso / Contraseña">
                    Restablecimiento de Acceso / Contraseña
                  </option>
                  <option value="Alta de Nuevo Corporativo (Tenant)">
                    Alta de Nuevo Corporativo (Tenant)
                  </option>
                  <option value="Reporte de Falla Técnica o Bug">
                    Reporte de Falla Técnica o Bug
                  </option>
                  <option value="Permisos de Departamento (RH / TI / Finanzas)">
                    Permisos de Departamento (RH / TI / Finanzas)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descripción del problema o solicitud
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe brevemente en qué podemos ayudarte..."
                  value={formSoporte.mensaje}
                  onChange={(e) =>
                    setFormSoporte({ ...formSoporte, mensaje: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-600 font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSeccionActiva(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1.5 shadow-sm"
                >
                  <Send size={13} /> Redactar Correo a Soporte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DIRECTORIO DE DEPARTAMENTOS Y ACCESOS */}
      {seccionActiva === "DIRECTORIO" && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-100 text-sky-700">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Directorio Organizacional y Estructura de Roles ERP
                  </h3>
                  <p className="text-xs text-slate-500">
                    Distribución de módulos departamentales dentro de cada empresa
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSeccionActiva(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                    Nivel 1 • Dirección
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 mt-2">
                    Dirección General (Super Admin)
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Supervisión transversal de todos los módulos, bitácora de auditoría y métricas globales de la empresa.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    Capital Humano
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 mt-2">
                    Recursos Humanos (Admin RH / Analista)
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Altas de personal, expedientes, modalidades de contrato, emisión de gafetes QR y constancias laborales en PDF.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                    Infraestructura
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 mt-2">
                    Sistemas y Hardware (Admin IT / Soporte)
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Control de inventario tecnológico por número de serie, asignación de equipos, cartas responsivas y Helpdesk TI.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Contabilidad y Nómina
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 mt-2">
                    Finanzas (Admin Finanzas / Contador)
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Administración del Tabulador Salarial, dispersión de nómina con bonos/descuentos y recibos en PDF.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                    Formato de Identificación Estándar
                  </p>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Cada colaborador ingresa con su ID único de 6 dígitos (ej. <span className="font-mono text-white font-bold">100001</span>) o su correo corporativo.
                  </p>
                </div>
                <button
                  onClick={() => setSeccionActiva("SOPORTE")}
                  className="px-3.5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shrink-0"
                >
                  Contactar Soporte
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ACERCA DE RMRG SYSTEMS ERP */}
      {seccionActiva === "ACERCA" && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-100 text-sky-700">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Acerca de RMRG Systems Cloud ERP
                  </h3>
                  <p className="text-xs text-slate-500">
                    Plataforma SaaS Multi-Tenant de Gestión Empresarial
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSeccionActiva(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-600 leading-relaxed">
              <p className="text-slate-800 font-medium text-sm">
                <strong>RMRG Systems</strong> es un ecosistema ERP en la nube diseñado bajo arquitectura <strong>Multi-Tenant con aislamiento por departamentos</strong>, garantizando que cada corporativo opere con su propia identidad visual, dominio y reglas de seguridad.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-2.5">
                  <Server size={16} className="text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900">Stack Cloud-Native</p>
                    <p className="text-[11px] text-slate-500">
                      Next.js + Tailwind CSS en Vercel conectado a API Node.js/Express en Render.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-2.5">
                  <Database size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900">Persistencia Serverless</p>
                    <p className="text-[11px] text-slate-500">
                      PostgreSQL en Neon con Prisma ORM y almacenamiento Base64 inmutable.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-2.5">
                  <ShieldCheck size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900">Caja Negra Audit_Log</p>
                    <p className="text-[11px] text-slate-500">
                      Trazabilidad de inicios de sesión, dispersión de nómina y movimientos.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-2.5">
                  <Lock size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900">Seguridad Criptográfica</p>
                    <p className="text-[11px] text-slate-500">
                      Tokens JWT, cifrado bcrypt y consola maestra protegida con llave .PEM.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                <span>Desarrollado y administrado por <strong>Carlos Maya</strong></span>
                <span className="font-mono font-bold text-slate-700">v2.5 Production Release</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER MINIMALISTA */}
      <footer className="py-4 px-6 text-center text-[11px] text-slate-400">
        RMRG Systems Cloud ERP • Arquitectura Multi-Tenant Segura
      </footer>
    </div>
  );
}
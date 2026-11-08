"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldAlert, Building2, Users, Laptop, Ticket, Plus,
  LogOut, Power, Activity, X, CheckCircle2, UploadCloud,
  Edit3, Search, KeyRound, AlertCircle
} from "lucide-react";

export default function MayaAdminGodDashboard() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const [autorizado, setAutorizado] = useState(false);
  const [admin, setAdmin] = useState({ name: "System Owner", email: "" });
  const [metricas, setMetricas] = useState({
    empresas: 0, empresasActivas: 0, usuariosTotales: 0, equiposTotales: 0, ticketsActivos: 0
  });
  const [tenants, setTenants] = useState([]);
  const [auditoriaGlobal, setAuditoriaGlobal] = useState([]);
  const [busquedaTenant, setBusquedaTenant] = useState("");

  // Notificación Toast profesional (Reemplaza alert nativo)
  const [toast, setToast] = useState(null);
  const mostrarToast = (mensaje, tipo = "ok") => {
    setToast({ mensaje, tipo });
    setTimeout(() => setToast(null), 4000);
  };

  // Estados para Crear o Editar Empresa (Tenant) y su Logo .PNG
  const [showModalTenant, setShowModalTenant] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [tenantEditandoId, setTenantEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [credencialesCreadas, setCredencialesCreadas] = useState(null);
  const [credencialesReseteadas, setCredencialesReseteadas] = useState(null);
  const [formTenant, setFormTenant] = useState({
    name: "",
    subdomain: "",
    emailDomain: "",
    themeColor: "#e11d48",
    logoUrl: ""
  });

  const cargarConsolaMaestra = async () => {
    const token = localStorage.getItem("rmrg_master_token");
    if (!token) {
      router.replace("/");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/master/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        localStorage.removeItem("rmrg_master_token");
        router.replace("/");
        return;
      }

      const data = await res.json();
      setAdmin(data.admin);
      setMetricas(data.metricasGlobales);
      setTenants(data.tenants);
      setAuditoriaGlobal(data.auditoriaGlobal);
      setAutorizado(true);
    } catch (error) {
      console.error("Error de conexión con consola maestra:", error);
    }
  };

  useEffect(() => {
    cargarConsolaMaestra();
  }, []);

  const cerrarSesionDios = () => {
    localStorage.removeItem("rmrg_master_token");
    router.replace("/");
  };

  const abrirModalNuevoCorporativo = () => {
    setModoEdicion(false);
    setTenantEditandoId(null);
    setCredencialesCreadas(null);
    setFormTenant({
      name: "",
      subdomain: "",
      emailDomain: "",
      themeColor: "#e11d48",
      logoUrl: ""
    });
    setShowModalTenant(true);
  };

  const abrirModalEditarCorporativo = (t) => {
    setModoEdicion(true);
    setTenantEditandoId(t.id);
    setCredencialesCreadas(null);
    setFormTenant({
      name: t.name || "",
      subdomain: t.subdomain || "",
      emailDomain: t.emailDomain || "",
      themeColor: t.themeColor || "#2563eb",
      logoUrl: t.logoUrl || ""
    });
    setShowModalTenant(true);
  };

  const handleNombreEmpresaChange = (nombre) => {
    if (modoEdicion) {
      setFormTenant({ ...formTenant, name: nombre });
      return;
    }
    const slug = nombre.toLowerCase().replace(/[^a-z0-9]/g, "");
    setFormTenant({
      ...formTenant,
      name: nombre,
      subdomain: slug,
      emailDomain: slug ? `${slug}.com` : ""
    });
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "image/png") {
      mostrarToast("Selecciona únicamente un archivo en formato .PNG", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormTenant((prev) => ({ ...prev, logoUrl: String(ev.target?.result || "") }));
    };
    reader.readAsDataURL(file);
  };

  const guardarCorporativo = async (e) => {
    e.preventDefault();
    setGuardando(true);
    const token = localStorage.getItem("rmrg_master_token");

    try {
      if (modoEdicion && tenantEditandoId) {
        const res = await fetch(`${API_URL}/api/master/tenants/${tenantEditandoId}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: formTenant.name,
            themeColor: formTenant.themeColor,
            logoUrl: formTenant.logoUrl
          })
        });

        const data = await res.json();
        if (!res.ok) {
          mostrarToast(data.error || "Error al actualizar empresa", "error");
          setGuardando(false);
          return;
        }

        setShowModalTenant(false);
        mostrarToast("Corporativo y logo .PNG actualizados correctamente");
        cargarConsolaMaestra();
        return;
      }

      const res = await fetch(`${API_URL}/api/master/tenants`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formTenant)
      });

      const data = await res.json();
      if (!res.ok) {
        mostrarToast(data.error || "No se pudo crear el corporativo", "error");
        setGuardando(false);
        return;
      }

      setCredencialesCreadas(data.credencialesIniciales);
      setFormTenant({ name: "", subdomain: "", emailDomain: "", themeColor: "#e11d48", logoUrl: "" });
      mostrarToast("Nuevo corporativo desplegado en la nube");
      cargarConsolaMaestra();
    } catch (error) {
      mostrarToast("Error de red al guardar el corporativo", "error");
    } finally {
      setGuardando(false);
    }
  };

  const alternarEstadoEmpresa = async (id) => {
    const token = localStorage.getItem("rmrg_master_token");
    const res = await fetch(`${API_URL}/api/master/tenants/${id}/toggle`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      mostrarToast("Estado operativo del corporativo actualizado");
      cargarConsolaMaestra();
    }
  };

  const resetearSuperAdminEmpresa = async (t) => {
    const token = localStorage.getItem("rmrg_master_token");
    try {
      const res = await fetch(`${API_URL}/api/master/tenants/${t.id}/reset-superadmin`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        mostrarToast(data.error || "No se pudo restablecer la cuenta", "error");
        return;
      }
      setCredencialesReseteadas({ empresa: t.name, ...data.credenciales });
      mostrarToast(`Clave de ${t.name} restablecida con éxito`);
    } catch {
      mostrarToast("Error al conectar con el servidor", "error");
    }
  };

  if (!autorizado) return null;

  const q = busquedaTenant.toLowerCase().trim();
  const tenantsFiltrados = tenants.filter((t) => {
    if (!q) return true;
    return (
      t.name?.toLowerCase().includes(q) ||
      t.emailDomain?.toLowerCase().includes(q) ||
      t.superAdmin?.email?.toLowerCase().includes(q) ||
      t.superAdmin?.numeroEmpleado?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* TOAST FLOTANTE */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-2.5 text-xs font-bold ${
            toast.tipo === "error"
              ? "bg-red-950/95 border-red-500/50 text-red-200"
              : "bg-emerald-950/95 border-emerald-500/50 text-emerald-200"
          }`}
        >
          {toast.tipo === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.mensaje}</span>
        </div>
      )}

      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500">
            <ShieldAlert size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">RMRG SYSTEMS // CONSOLA MODO DIOS</h1>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-bold">
                ROOT ACCESS
              </span>
            </div>
            <p className="text-xs text-slate-400">Gobierno Global Multi-Tenant • {admin.name} ({admin.email})</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={abrirModalNuevoCorporativo}
            className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg shadow-red-600/20 transition-colors"
          >
            <Plus size={16} /> Desplegar Nuevo Corporativo
          </button>
          <button
            onClick={cerrarSesionDios}
            className="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 flex items-center gap-2 transition-colors"
          >
            <LogOut size={16} /> Salir
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
            <div className="flex justify-between items-center text-slate-400 text-xs font-semibold uppercase">
              <span>Corporativos (Tenants)</span>
              <Building2 size={18} className="text-red-400" />
            </div>
            <p className="text-3xl font-bold text-white mt-2">{metricas.empresas}</p>
            <p className="text-xs text-emerald-400 mt-1">{metricas.empresasActivas} activos en producción</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
            <div className="flex justify-between items-center text-slate-400 text-xs font-semibold uppercase">
              <span>Usuarios Globales</span>
              <Users size={18} className="text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-white mt-2">{metricas.usuariosTotales}</p>
            <p className="text-xs text-slate-400 mt-1">En todas las empresas</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
            <div className="flex justify-between items-center text-slate-400 text-xs font-semibold uppercase">
              <span>Activos TI Registrados</span>
              <Laptop size={18} className="text-amber-400" />
            </div>
            <p className="text-3xl font-bold text-white mt-2">{metricas.equiposTotales}</p>
            <p className="text-xs text-slate-400 mt-1">Hardware bajo control ERP</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
            <div className="flex justify-between items-center text-slate-400 text-xs font-semibold uppercase">
              <span>Tickets Abiertos</span>
              <Ticket size={18} className="text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-white mt-2">{metricas.ticketsActivos}</p>
            <p className="text-xs text-slate-400 mt-1">Pendientes o en progreso</p>
          </div>
        </div>

        {/* TABLA DE CORPORATIVOS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 flex flex-wrap justify-between items-center gap-3">
            <div>
              <h2 className="text-base font-bold text-white">Ecosistema de Empresas (Multi-Tenant)</h2>
              <p className="text-xs text-slate-400">Control de instancias, logos personalizados .PNG, dominios corporativos y cuentas Super Admin</p>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar corporativo, dominio o ID..."
                value={busquedaTenant}
                onChange={(e) => setBusquedaTenant(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-950 text-white border border-slate-700 rounded-lg focus:outline-none focus:border-red-500 w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                  <th className="px-6 py-3.5 font-semibold">Corporativo</th>
                  <th className="px-6 py-3.5 font-semibold">Dominio Correo</th>
                  <th className="px-6 py-3.5 font-semibold">Super Admin Inicial</th>
                  <th className="px-6 py-3.5 font-semibold">Métricas</th>
                  <th className="px-6 py-3.5 font-semibold">Estado</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Gobierno</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {tenantsFiltrados.map((t) => {
                  const slug = t.name.toLowerCase().replace(/[^a-z0-9]/g, "");
                  return (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {t.logoUrl ? (
                            <img
                              src={t.logoUrl}
                              alt={t.name}
                              className="w-9 h-9 rounded-lg object-contain bg-white p-1 border border-slate-700 shrink-0"
                            />
                          ) : (
                            <span
                              className="w-4 h-4 rounded-full shrink-0 border border-white/20"
                              style={{ backgroundColor: t.themeColor }}
                              title="Sin logo personalizado (Usando color institucional)"
                            />
                          )}
                          <div>
                            <p className="text-sm font-bold text-white">{t.name}</p>
                            <p className="text-xs font-mono text-slate-400">/{slug}/dashboard</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-300">@{t.emailDomain}</td>
                      <td className="px-6 py-4">
                        {t.superAdmin ? (
                          <div>
                            <p className="text-xs font-mono font-bold text-emerald-400">ID: {t.superAdmin.numeroEmpleado}</p>
                            <p className="text-xs text-slate-400">{t.superAdmin.email}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">Sin asignar</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-300">
                        <span className="font-semibold text-white">{t.usuariosCount}</span> usuarios •{" "}
                        <span className="font-semibold text-white">{t.assetsCount}</span> equipos •{" "}
                        <span className="font-semibold text-white">{t.ticketsCount}</span> tickets
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${t.isActive ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-red-500/15 text-red-400 border border-red-500/30"}`}>
                          {t.isActive ? "Operativo" : "Suspendido"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => abrirModalEditarCorporativo(t)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-colors"
                          title="Subir o cambiar el logo .PNG y color de esta empresa"
                        >
                          <Edit3 size={13} /> Logo / Editar
                        </button>
                        {t.superAdmin && (
                          <button
                            onClick={() => resetearSuperAdminEmpresa(t)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors"
                            title="Restablecer contraseña del Director General a Admin123!"
                          >
                            <KeyRound size={13} /> Reset Admin
                          </button>
                        )}
                        <button
                          onClick={() => alternarEstadoEmpresa(t.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 border transition-colors ${
                            t.isActive
                              ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                              : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                          }`}
                        >
                          <Power size={13} /> {t.isActive ? "Suspender" : "Reactivar"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* AUDITORÍA TRANSVERSAL */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-emerald-400" />
              <h2 className="text-base font-bold text-white">Telemetría y Caja Negra Global (Todos los Corporativos)</h2>
            </div>
            <span className="text-xs font-mono text-slate-400">Últimos {auditoriaGlobal.length} eventos</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                  <th className="px-6 py-3 font-semibold">Hora</th>
                  <th className="px-6 py-3 font-semibold">Empresa</th>
                  <th className="px-6 py-3 font-semibold">Usuario</th>
                  <th className="px-6 py-3 font-semibold">Acción</th>
                  <th className="px-6 py-3 font-semibold">Tabla</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {auditoriaGlobal.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30">
                    <td className="px-6 py-3 font-mono text-slate-400">
                      {new Date(log.createdAt).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "medium" })}
                    </td>
                    <td className="px-6 py-3 font-semibold text-white">
                      {log.user?.tenant?.name || "Global"}
                    </td>
                    <td className="px-6 py-3 text-slate-300">
                      {log.user?.firstName} {log.user?.lastName} ({log.user?.numeroEmpleado})
                    </td>
                    <td className="px-6 py-3 font-mono text-emerald-400">{log.action}</td>
                    <td className="px-6 py-3 font-mono text-blue-400">{log.tableName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL DE CREDENCIALES RESTABLECIDAS DEL SUPER ADMIN */}
      {credencialesReseteadas && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 text-white space-y-4">
            <h3 className="text-base font-bold flex items-center gap-2 text-amber-400">
              <KeyRound size={18} /> Credenciales Restablecidas ({credencialesReseteadas.empresa})
            </h3>
            <p className="text-xs text-slate-300">
              Se ha restaurado el acceso de la cuenta <strong>Super Administrador</strong>:
            </p>
            <div className="bg-slate-950 p-3.5 rounded-xl font-mono text-xs space-y-1.5 border border-slate-800">
              <p>ID Empleado: <span className="text-emerald-400 font-bold">{credencialesReseteadas.numeroEmpleado}</span></p>
              <p>Correo: <span className="text-emerald-400 font-bold">{credencialesReseteadas.email}</span></p>
              <p>Contraseña Temporal: <span className="text-amber-400 font-bold">{credencialesReseteadas.passwordTemporal}</span></p>
            </div>
            <button
              onClick={() => setCredencialesReseteadas(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold"
            >
              Cerrar ventana
            </button>
          </div>
        </div>
      )}

      {/* MODAL PARA CREAR O EDITAR CORPORATIVO Y SUBIR SU LOGO .PNG */}
      {showModalTenant && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-white">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-bold">
                {modoEdicion ? "Editar Imagen (.PNG) y Color del Corporativo" : "Desplegar Nuevo Corporativo SaaS"}
              </h3>
              <button onClick={() => setShowModalTenant(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>

            {credencialesCreadas ? (
              <div className="p-6 space-y-4">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-2">
                  <p className="text-sm font-bold flex items-center gap-2">
                    <CheckCircle2 size={18} /> ¡Corporativo desplegado con éxito!
                  </p>
                  <p className="text-xs text-slate-300">
                    Se creó automáticamente la cuenta del <strong>Director General (Super Administrador)</strong>:
                  </p>
                  <div className="bg-slate-950 p-3 rounded-lg font-mono text-xs space-y-1 text-white border border-slate-800">
                    <p>ID Empleado: <span className="text-emerald-400 font-bold">{credencialesCreadas.numeroEmpleado}</span></p>
                    <p>Correo: <span className="text-emerald-400 font-bold">{credencialesCreadas.email}</span></p>
                    <p>Contraseña: <span className="text-amber-400 font-bold">{credencialesCreadas.passwordTemporal}</span></p>
                  </div>
                </div>
                <button
                  onClick={() => { setCredencialesCreadas(null); setShowModalTenant(false); }}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold"
                >
                  Entendido, cerrar ventana
                </button>
              </div>
            ) : (
              <form onSubmit={guardarCorporativo} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Nombre Oficial de la Empresa</label>
                  <input
                    required
                    type="text"
                    placeholder="Ej. Tesla Motors"
                    value={formTenant.name}
                    onChange={(e) => handleNombreEmpresaChange(e.target.value)}
                    className="w-full text-sm px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Subdominio / Slug</label>
                    <input
                      required
                      disabled={modoEdicion}
                      type="text"
                      placeholder="teslamotors"
                      value={formTenant.subdomain}
                      onChange={(e) => setFormTenant({ ...formTenant, subdomain: e.target.value })}
                      className="w-full text-sm px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Dominio de Correo</label>
                    <input
                      required
                      disabled={modoEdicion}
                      type="text"
                      placeholder="tesla.com"
                      value={formTenant.emailDomain}
                      onChange={(e) => setFormTenant({ ...formTenant, emailDomain: e.target.value })}
                      className="w-full text-sm px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono disabled:opacity-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Color Institucional (Hex)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formTenant.themeColor}
                      onChange={(e) => setFormTenant({ ...formTenant, themeColor: e.target.value })}
                      className="h-10 w-14 rounded bg-slate-950 border border-slate-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formTenant.themeColor}
                      onChange={(e) => setFormTenant({ ...formTenant, themeColor: e.target.value })}
                      className="w-full text-sm px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                    />
                  </div>
                </div>

                {/* ZONA DE CARGA DE LOGO .PNG */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-300">Logo Corporativo (.PNG)</label>
                    {formTenant.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setFormTenant({ ...formTenant, logoUrl: "" })}
                        className="text-[11px] text-red-400 hover:underline"
                      >
                        Quitar logo actual
                      </button>
                    )}
                  </div>
                  <div className="relative w-full h-28 rounded-xl border-2 border-dashed border-slate-700 hover:border-red-500 bg-slate-950/80 flex flex-col items-center justify-center overflow-hidden cursor-pointer transition-colors">
                    <input
                      type="file"
                      accept="image/png"
                      onChange={handleLogoUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    {formTenant.logoUrl ? (
                      <div className="flex items-center gap-3 px-4">
                        <img src={formTenant.logoUrl} alt="Logo preview" className="h-16 w-24 object-contain bg-white rounded-lg p-1.5" />
                        <div className="text-left">
                          <p className="text-xs font-bold text-emerald-400">✓ Logo .PNG listo</p>
                          <p className="text-[11px] text-slate-400">Haz clic aquí si deseas reemplazarlo por otro</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-3 flex flex-col items-center">
                        <UploadCloud size={22} className="text-red-400 mb-1" />
                        <p className="text-xs font-semibold text-slate-300">
                          Haz clic o arrastra el logo en formato <span className="text-white font-mono">.PNG</span>
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Persistente en base de datos (Base64)</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowModalTenant(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">
                    Cancelar
                  </button>
                  <button type="submit" disabled={guardando} className="px-5 py-2 text-sm font-semibold bg-red-600 hover:bg-red-500 text-white rounded-lg">
                    {guardando ? "Guardando..." : modoEdicion ? "Guardar Cambios" : "Crear Corporativo"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
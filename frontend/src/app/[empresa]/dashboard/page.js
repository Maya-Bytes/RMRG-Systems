"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { 
  LayoutDashboard, Users, Laptop, CircleDollarSign, 
  Ticket, LogOut, Bell, Menu, Settings, ChevronDown, 
  ShieldAlert, CheckCheck
} from "lucide-react";

import VistaAnalitica from "./components/VistaAnalitica";
import VistaRH from "./components/VistaRH";
import VistaTI from "./components/VistaTI";
import VistaFinanzas from "./components/VistaFinanzas";
import VistaTickets from "./components/VistaTickets";
import VistaAuditoria from "./components/VistaAuditoria";
import ModalesERP from "./components/ModalesERP";
import ModalGafeteQR from "./components/ModalGafeteQR";

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

  const [empleadoGafete, setEmpleadoGafete] = useState(null);

  // Estados de Modales
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

  const [showModalEquipo, setShowModalEquipo] = useState(false);
  const [formEquipo, setFormEquipo] = useState({
    serialNumber: '', deviceType: 'Laptop', model: '', status: 'Disponible', assignedToId: ''
  });

  const [showModalNomina, setShowModalNomina] = useState(false);

  const [showModalTicket, setShowModalTicket] = useState(false);
  const [formTicket, setFormTicket] = useState({
    title: '', description: '', targetArea: 'IT'
  });

  const [showModalPerfil, setShowModalPerfil] = useState(false);
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [fotoPerfilFile, setFotoPerfilFile] = useState(null);
  const [fotoPerfilPreview, setFotoPerfilPreview] = useState(null);

  const [guardando, setGuardando] = useState(false);

  const dominioCorporativo = tenantInfo.emailDomain || DOMINIOS_POR_SLUG[empresa] || `${empresa}.com`;
  const colorMarca = tenantInfo.themeColor || "#2563eb";
  const notificacionesNoLeidas = listaNotificaciones.filter(n => !n.isRead).length;

  const resolverAvatar = (avatarUrl) => {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith("data:image") || avatarUrl.startsWith("http")) return avatarUrl;
    return `${API_URL}${avatarUrl}`;
  };

  const limpiarTextoCorreo = (texto) =>
    (texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

  const generarPrefijoSugerido = (nombres, apellidos) => {
    const pNombre = limpiarTextoCorreo(nombres.trim().split(/\s+/)[0]);
    const pApellido = limpiarTextoCorreo(apellidos.trim().split(/\s+/)[0]);
    if (pNombre && pApellido) return `${pNombre}.${pApellido}`;
    return pNombre || pApellido || "";
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

  const marcarNotificacionLeida = async (id) => {
    const token = localStorage.getItem('rmrg_token');
    await fetch(`${API_URL}/api/notificaciones/${id}/leer`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
    cargarTodo();
  };

  const marcarTodasLeidas = async () => {
    const token = localStorage.getItem('rmrg_token');
    await fetch(`${API_URL}/api/notificaciones/leer-todas`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
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
      const res = await fetch(`${API_URL}/api/perfil`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
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
    setEmailPrefijo((emp.email || "").split("@")[0] || "");
    setEmailUsuarioEditadoManual(true);
    setFormEmpleado({
      nombres: emp.firstName,
      apellidos: emp.lastName,
      email: emp.email,
      puesto: emp.puesto,
      rol: emp.rol,
      salarioBase: String(emp.salarioBase || 0),
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
      setEmailPrefijo(generarPrefijoSugerido(campo === 'nombres' ? valor : nuevoForm.nombres, campo === 'apellidos' ? valor : nuevoForm.apellidos));
    }
    setFormEmpleado(nuevoForm);
  };

  const handleImageChange = (e, fileSetter, previewSetter) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "image/png") { alert("Por favor, selecciona únicamente archivos en formato .PNG"); return; }
      fileSetter(file);
      previewSetter(URL.createObjectURL(file));
    }
  };

  const guardarEmpleado = async (e) => {
    e.preventDefault();
    const prefijoLimpio = emailPrefijo.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    if (!prefijoLimpio) { alert("Por favor ingresa un usuario válido para el correo corporativo."); return; }

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
        res = await fetch(`${API_URL}/api/dashboard/empleados`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: paqueteDatos });
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

  const actualizarSalarioTabulador = async (userId, salarioBase) => {
    const token = localStorage.getItem('rmrg_token');
    const res = await fetch(`${API_URL}/api/finanzas/salario/${userId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ salarioBase })
    });
    if (!res.ok) {
      const err = await res.json();
      alert("Error: " + err.error);
    }
    cargarTodo();
  };

  const guardarNominaLote = async (pagos) => {
    setGuardando(true);
    const token = localStorage.getItem('rmrg_token');
    try {
      const res = await fetch(`${API_URL}/api/finanzas/nominas/lote`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ pagos })
      });
      if (res.ok) {
        setShowModalNomina(false);
        cargarTodo();
      } else {
        const err = await res.json();
        alert("Error: " + err.error);
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
    const res = await fetch(`${API_URL}/api/tickets/${id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nuevoStatus })
    });
    if (!res.ok) {
      const err = await res.json();
      alert("⚠️ " + err.error);
    }
    cargarTodo();
  };

  if (!autorizado) return null;

  const rol = perfil.rolSistema;
  const esSuperAdmin = rol === "Super Administrador";
  const esRH = ["Admin de Recursos Humanos", "Analista HR"].includes(rol);
  const esTI = ["Admin de IT", "Soporte IT"].includes(rol);
  const esFinanzas = ["Admin de Finanzas", "Contador"].includes(rol);
  const esOperativo = rol === "Operativo";

  const menuOptions = [
    { name: "Resumen", icon: <LayoutDashboard size={20} />, show: true },
    { name: "Recursos Humanos", icon: <Users size={20} />, show: esSuperAdmin || esRH },
    { name: "Equipos TI", icon: <Laptop size={20} />, show: esSuperAdmin || esTI },
    { name: "Finanzas", icon: <CircleDollarSign size={20} />, show: esSuperAdmin || esFinanzas },
    { name: "Helpdesk Tickets", icon: <Ticket size={20} />, show: true },
    { name: "Auditoría", icon: <ShieldAlert size={20} />, show: esSuperAdmin },
  ];
  const menusVisibles = menuOptions.filter(item => item.show);

  // Cálculos específicos por departamento para no cruzar datos
  const misEquipos = listaEquipos.filter(eq => eq.assignedToId === perfil.userId);
  const misNominas = listaNominas.filter(nom => nom.user?.id === perfil.userId || nom.userId === perfil.userId);
  const misTicketsAbiertos = listaTickets.filter(t => t.status !== 'RESOLVED').length;

  const ticketsAbiertosRH = listaTickets.filter(t => t.targetArea === "HR" && t.status !== "RESOLVED").length;
  const ticketsAbiertosTI = listaTickets.filter(t => t.targetArea === "IT" && t.status !== "RESOLVED").length;
  const ticketsAbiertosFin = listaTickets.filter(t => t.targetArea === "FINANCE" && t.status !== "RESOLVED").length;

  const contratosIndefinidos = listaEmpleados.filter(e => e.isActive && e.tipoContrato === "Indefinido").length;
  const equiposDisponibles = listaEquipos.filter(eq => eq.status === "Disponible").length;
  const masaSalarialActiva = listaEmpleados.filter(e => e.isActive).reduce((acc, e) => acc + Number(e.salarioBase || 0), 0);

  const ticketsFiltrados = listaTickets.filter(t => filtroAreaTicket === "TODOS" ? true : t.targetArea === filtroAreaTicket);
  const miAvatarSrc = resolverAvatar(perfil.avatarUrl);

  return (
    <div className="flex h-screen bg-gray-50 text-slate-900 overflow-hidden font-sans relative">
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
                {miAvatarSrc ? (
                  <img
                    src={miAvatarSrc}
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
          {/* TARJETAS DE MÉTRICAS PERSONALIZADAS POR DEPARTAMENTO */}
          {esOperativo && (
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
          )}

          {esRH && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm font-medium text-gray-500">Colaboradores Activos (RH)</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{metricas.empleados}</h3>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm font-medium text-gray-500">Contratos Indefinidos Vigentes</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{contratosIndefinidos}</h3>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm font-medium text-gray-500">Tickets de Recursos Humanos</p>
                <h3 className="text-2xl font-bold mt-1" style={{ color: colorMarca }}>{ticketsAbiertosRH}</h3>
              </div>
            </div>
          )}

          {esTI && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm font-medium text-gray-500">Total Activos Hardware TI</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{listaEquipos.length}</h3>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm font-medium text-gray-500">Asignados / En Almacén</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{metricas.equipos} / {equiposDisponibles}</h3>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm font-medium text-gray-500">Tickets de Soporte TI Abiertos</p>
                <h3 className="text-2xl font-bold mt-1" style={{ color: colorMarca }}>{ticketsAbiertosTI}</h3>
              </div>
            </div>
          )}

          {esFinanzas && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm font-medium text-gray-500">Masa Salarial Mensual Activa</p>
                <h3 className="text-2xl font-bold text-emerald-700 mt-1">
                  ${masaSalarialActiva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm font-medium text-gray-500">Recibos de Nómina Emitidos</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{listaNominas.length}</h3>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm font-medium text-gray-500">Tickets de Finanzas Abiertos</p>
                <h3 className="text-2xl font-bold mt-1" style={{ color: colorMarca }}>{ticketsAbiertosFin}</h3>
              </div>
            </div>
          )}

          {esSuperAdmin && (
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
                <p className="text-sm font-medium text-gray-500">Tickets Abiertos (Global)</p>
                <h3 className="text-2xl font-bold mt-1" style={{ color: colorMarca }}>{metricas.tickets}</h3>
              </div>
            </div>
          )}

          {/* GRÁFICAS INTERACTIVAS EN EL RESUMEN ADAPTADAS AL ROL */}
          {moduloActivo === "Resumen" && !esOperativo && (
            <VistaAnalitica
              perfil={perfil}
              listaEmpleados={listaEmpleados}
              listaTickets={listaTickets}
              listaEquipos={listaEquipos}
              colorMarca={colorMarca}
            />
          )}

          {/* VISTAS MODULARES POR DEPARTAMENTO (Sin cruce de información en Resumen) */}
          {(moduloActivo === "Recursos Humanos" || (moduloActivo === "Resumen" && (esSuperAdmin || esRH || esOperativo))) && (
            <VistaRH
              perfil={perfil}
              tenantInfo={tenantInfo}
              colorMarca={colorMarca}
              dominioCorporativo={dominioCorporativo}
              empresa={empresa}
              metricas={metricas}
              listaEmpleados={listaEmpleados}
              misEquipos={misEquipos}
              misNominas={misNominas}
              resolverAvatar={resolverAvatar}
              abrirModalNuevoEmpleado={abrirModalNuevoEmpleado}
              abrirModalEditarEmpleado={abrirModalEditarEmpleado}
              abrirModalGafete={(emp) => setEmpleadoGafete(emp)}
              irANuevoTicket={() => { setModuloActivo("Helpdesk Tickets"); setShowModalTicket(true); }}
            />
          )}

          {(moduloActivo === "Equipos TI" || (moduloActivo === "Resumen" && esTI)) && (
            <VistaTI
              perfil={perfil}
              tenantInfo={tenantInfo}
              colorMarca={colorMarca}
              empresa={empresa}
              listaEquipos={listaEquipos}
              listaEmpleados={listaEmpleados}
              actualizarEquipo={actualizarEquipo}
              abrirModalEquipo={() => setShowModalEquipo(true)}
            />
          )}

          {(moduloActivo === "Finanzas" || (moduloActivo === "Resumen" && esFinanzas)) && (
            <VistaFinanzas
              listaNominas={listaNominas}
              listaEmpleados={listaEmpleados}
              empresa={empresa}
              tenantInfo={tenantInfo}
              perfil={perfil}
              colorMarca={colorMarca}
              abrirModalNomina={() => setShowModalNomina(true)}
              actualizarSalarioTabulador={actualizarSalarioTabulador}
            />
          )}

          {moduloActivo === "Helpdesk Tickets" && (
            <VistaTickets
              perfil={perfil}
              colorMarca={colorMarca}
              listaTickets={listaTickets}
              ticketsFiltrados={ticketsFiltrados}
              filtroAreaTicket={filtroAreaTicket}
              setFiltroAreaTicket={setFiltroAreaTicket}
              abrirModalTicket={() => setShowModalTicket(true)}
              cambiarEstadoTicket={cambiarEstadoTicket}
            />
          )}

          {moduloActivo === "Auditoría" && (
            <VistaAuditoria listaAuditoria={listaAuditoria} empresa={empresa} />
          )}
        </main>
      </div>

      {/* MODAL DE GAFETE CORPORATIVO CON QR */}
      <ModalGafeteQR
        empleado={empleadoGafete}
        onClose={() => setEmpleadoGafete(null)}
        tenantInfo={tenantInfo}
        colorMarca={colorMarca}
        dominioCorporativo={dominioCorporativo}
        resolverAvatar={resolverAvatar}
      />

      {/* MODALES CENTRALIZADOS */}
      <ModalesERP
        perfil={perfil}
        colorMarca={colorMarca}
        dominioCorporativo={dominioCorporativo}
        guardando={guardando}
        listaEmpleados={listaEmpleados}
        showModalPerfil={showModalPerfil}
        setShowModalPerfil={setShowModalPerfil}
        guardarMiPerfil={guardarMiPerfil}
        nuevaPassword={nuevaPassword}
        setNuevaPassword={setNuevaPassword}
        fotoPerfilPreview={fotoPerfilPreview}
        setFotoPerfilFile={setFotoPerfilFile}
        setFotoPerfilPreview={setFotoPerfilPreview}
        showModalEmpleado={showModalEmpleado}
        setShowModalEmpleado={setShowModalEmpleado}
        modoEdicionEmpleado={modoEdicionEmpleado}
        guardarEmpleado={guardarEmpleado}
        formEmpleado={formEmpleado}
        setFormEmpleado={setFormEmpleado}
        actualizarNombresOApellidos={actualizarNombresOApellidos}
        emailPrefijo={emailPrefijo}
        setEmailPrefijo={setEmailPrefijo}
        setEmailUsuarioEditadoManual={setEmailUsuarioEditadoManual}
        generarPrefijoSugerido={generarPrefijoSugerido}
        fotoFile={fotoFile}
        setFotoFile={setFotoFile}
        fotoPreview={fotoPreview}
        setFotoPreview={setFotoPreview}
        handleImageChange={handleImageChange}
        showModalEquipo={showModalEquipo}
        setShowModalEquipo={setShowModalEquipo}
        formEquipo={formEquipo}
        setFormEquipo={setFormEquipo}
        guardarEquipo={guardarEquipo}
        showModalNomina={showModalNomina}
        setShowModalNomina={setShowModalNomina}
        guardarNominaLote={guardarNominaLote}
        showModalTicket={showModalTicket}
        setShowModalTicket={setShowModalTicket}
        formTicket={formTicket}
        setFormTicket={setFormTicket}
        guardarTicket={guardarTicket}
      />
    </div>
  );
}
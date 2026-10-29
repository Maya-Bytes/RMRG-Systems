"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { 
  LayoutDashboard, Users, Laptop, CircleDollarSign, 
  Ticket, LogOut, Bell, Menu, Settings, ChevronDown, 
  X, Plus, Edit3, CheckCircle2, Clock, ShieldAlert, CheckCheck
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
  const [tenantInfo, setTenantInfo] = useState({ name: "Corporativo", themeColor: "#2563eb" });
  const [perfil, setPerfil] = useState({ userId: "", numeroEmpleado: "", email: "", nombre: "Cargando...", apellido: "", puesto: "...", iniciales: "-", avatarUrl: null, rolSistema: "" });
  const [metricas, setMetricas] = useState({ empleados: 0, equipos: 0, tickets: 0 });
  
  const [listaEmpleados, setListaEmpleados] = useState([]); 
  const [listaEquipos, setListaEquipos] = useState([]);
  const [listaNominas, setListaNominas] = useState([]);
  const [listaTickets, setListaTickets] = useState([]);
  const [listaNotificaciones, setListaNotificaciones] = useState([]);
  const [listaAuditoria, setListaAuditoria] = useState([]);
  const [filtroAreaTicket, setFiltroAreaTicket] = useState("TODOS");

  // Estados de Modales
  const [showModalEmpleado, setShowModalEmpleado] = useState(false);
  const [modoEdicionEmpleado, setModoEdicionEmpleado] = useState(false);
  const [empleadoEditandoId, setEmpleadoEditandoId] = useState(null);
  const [fotoFile, setFotoFile] = useState(null); 
  const [formEmpleado, setFormEmpleado] = useState({
    nombres: '', apellidos: '', email: '', puesto: '', rol: '', salarioBase: '15000', tipoContrato: 'Indefinido', isActive: true
  });

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

  const [guardando, setGuardando] = useState(false);

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

  const colorMarca = tenantInfo.themeColor || "#2563eb";
  const notificacionesNoLeidas = listaNotificaciones.filter(n => !n.isRead).length;

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
    setFormEmpleado({ nombres: '', apellidos: '', email: '', puesto: '', rol: 'Operativo', salarioBase: '15000', tipoContrato: 'Indefinido', isActive: true });
    setFotoFile(null);
    setShowModalEmpleado(true);
  };

  const abrirModalEditarEmpleado = (emp) => {
    setModoEdicionEmpleado(true);
    setEmpleadoEditandoId(emp.id);
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
    setShowModalEmpleado(true);
  };

  const handleImageChange = (e, setter) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "image/png") {
        alert("Por favor, selecciona solo archivos .PNG");
        return;
      }
      setter(file);
    }
  };

  const guardarEmpleado = async (e) => {
    e.preventDefault();
    setGuardando(true);
    const token = localStorage.getItem('rmrg_token');

    try {
      let res;
      if (modoEdicionEmpleado) {
        res = await fetch(`${API_URL}/api/hr/empleados/${empleadoEditandoId}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(formEmpleado)
        });
      } else {
        const paqueteDatos = new FormData();
        Object.entries(formEmpleado).forEach(([k, v]) => paqueteDatos.append(k, v));
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

  // Datos filtrados para Operativo
  const misEquipos = listaEquipos.filter(eq => eq.assignedToId === perfil.userId);
  const misNominas = listaNominas.filter(nom => nom.user?.id === perfil.userId || nom.userId === perfil.userId);
  const misTicketsAbiertos = listaTickets.filter(t => t.status !== 'RESOLVED').length;
  const ticketsFiltrados = listaTickets.filter(t => filtroAreaTicket === "TODOS" ? true : t.targetArea === filtroAreaTicket);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans relative">
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
            {/* CAMPANA DE NOTIFICACIONES INTERACTIVA */}
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
            
            {/* MENÚ DE PERFIL Y CONFIGURACIÓN */}
            <div className="relative">
              <button onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifMenu(false); }} className="flex items-center gap-3 text-left hover:bg-gray-50 p-1.5 rounded-lg transition-colors">
                {perfil.avatarUrl ? (
                  <img src={`${API_URL}${perfil.avatarUrl}`} alt="Avatar" className="w-9 h-9 rounded-full object-cover border border-gray-200" />
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
          {/* TARJETAS DE MÉTRICAS (Adaptadas según si es Operativo o Administrativo) */}
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
                    <p className="text-gray-500 mt-1 text-sm">Bienvenido a tu portal de empleado en <span className="font-semibold text-gray-700">{tenantInfo.name}</span>. Consulta tus recibos, equipos asignados o solicita soporte.</p>
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
                  {/* Mis Equipos Asignados */}
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
                            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">{eq.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Mis Recibos de Nómina */}
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
                            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">{nom.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Directorio y Expedientes de Empleados</h3>
                    <p className="text-xs text-gray-500">Gestión de personal, puestos, contratos y salarios base</p>
                  </div>
                  {["Super Administrador", "Admin de Recursos Humanos"].includes(perfil.rolSistema) && (
                    <button
                      onClick={abrirModalNuevoEmpleado}
                      style={{ backgroundColor: colorMarca }}
                      className="text-white px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 flex items-center gap-2"
                    >
                      <Plus size={16} /> Nuevo Empleado
                    </button>
                  )}
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
                        <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {listaEmpleados.map((empleado) => (
                        <tr key={empleado.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              {empleado.avatarUrl ? (
                                <img src={`${API_URL}${empleado.avatarUrl}`} alt={empleado.nombreCompleto} className="h-9 w-9 rounded-full object-cover border border-gray-200" />
                              ) : (
                                <div className="h-9 w-9 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-xs">{empleado.iniciales}</div>
                              )}
                              <div>
                                <p className="text-sm font-bold text-gray-900">{empleado.numeroEmpleado} - {empleado.nombreCompleto}</p>
                                <p className="text-xs text-gray-500">{empleado.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{empleado.rol}</td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-gray-800">{empleado.puesto}</p>
                            <p className="text-xs text-gray-400">{empleado.tipoContrato}</p>
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                            ${Number(empleado.salarioBase).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${empleado.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {empleado.estado}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-medium">
                            {["Super Administrador", "Admin de Recursos Humanos", "Analista HR"].includes(perfil.rolSistema) && (
                              <button onClick={() => abrirModalEditarEmpleado(empleado)} className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1">
                                <Edit3 size={15} /> Editar
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
              <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Inventario de Hardware y Activos TI</h3>
                  <p className="text-xs text-gray-500">Control de laptops, números de serie y asignación a empleados</p>
                </div>
                {["Super Administrador", "Admin de IT"].includes(perfil.rolSistema) && (
                  <button
                    onClick={() => setShowModalEquipo(true)}
                    style={{ backgroundColor: colorMarca }}
                    className="text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                  >
                    <Plus size={16} /> Registrar Equipo
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                      <th className="px-6 py-4 font-semibold">No. de Serie</th>
                      <th className="px-6 py-4 font-semibold">Tipo / Modelo</th>
                      <th className="px-6 py-4 font-semibold">Empleado Asignado</th>
                      <th className="px-6 py-4 font-semibold">Estado</th>
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
                            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-gray-700"
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
                            <option value="Disponible">Disponible</option>
                            <option value="Asignado">Asignado</option>
                            <option value="En Reparación">En Reparación</option>
                          </select>
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
              <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Dispersión e Historial de Nómina</h3>
                  <p className="text-xs text-gray-500">Emisión de pagos y notificación automática al trabajador</p>
                </div>
                <button onClick={() => setShowModalNomina(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                  <Plus size={16} /> Dispersar Pago de Nómina
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                      <th className="px-6 py-4 font-semibold">Empleado</th>
                      <th className="px-6 py-4 font-semibold">Fecha de Pago</th>
                      <th className="px-6 py-4 font-semibold">Monto Neto Dispersado</th>
                      <th className="px-6 py-4 font-semibold">Estatus</th>
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
                      className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 font-medium"
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
              <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-slate-900 text-white">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2"><ShieldAlert size={20} /> Caja Negra de Auditoría (Audit_Log)</h3>
                  <p className="text-xs text-slate-400">Registro inmutable de movimientos críticos dentro del corporativo</p>
                </div>
                <span className="text-xs font-mono bg-slate-800 px-3 py-1 rounded-full text-emerald-400 border border-slate-700">
                  {listaAuditoria.length} eventos registrados
                </span>
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
              <h3 className="text-lg font-bold text-gray-800">Configuración de Mi Cuenta</h3>
              <button onClick={() => setShowModalPerfil(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={guardarMiPerfil} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Actualizar Foto de Perfil (.PNG)</label>
                <input type="file" accept="image/png" onChange={(e) => handleImageChange(e, setFotoPerfilFile)} className="w-full text-xs text-gray-600" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nueva Contraseña (Opcional)</label>
                <input
                  type="password"
                  placeholder="Dejar en blanco para mantener la actual"
                  value={nuevaPassword}
                  onChange={e => setNuevaPassword(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setShowModalPerfil(false)} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-800">{modoEdicionEmpleado ? 'Editar Expediente de Empleado' : 'Alta de Nuevo Empleado'}</h3>
              <button onClick={() => setShowModalEmpleado(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg"><X size={20} /></button>
            </div>

            <form onSubmit={guardarEmpleado} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nombres</label>
                  <input required type="text" value={formEmpleado.nombres} onChange={e => setFormEmpleado({...formEmpleado, nombres: e.target.value})} className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Apellidos</label>
                  <input required type="text" value={formEmpleado.apellidos} onChange={e => setFormEmpleado({...formEmpleado, apellidos: e.target.value})} className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Correo Corporativo</label>
                  <input required disabled={modoEdicionEmpleado} type="email" value={formEmpleado.email} onChange={e => setFormEmpleado({...formEmpleado, email: e.target.value})} className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg disabled:bg-gray-100" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Rol en el Sistema (8 Roles)</label>
                  <select required value={formEmpleado.rol} onChange={e => setFormEmpleado({...formEmpleado, rol: e.target.value})} className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white">
                    {ROLES_SISTEMA.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Puesto Interno</label>
                  <input required type="text" value={formEmpleado.puesto} onChange={e => setFormEmpleado({...formEmpleado, puesto: e.target.value})} className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Salario Base Mensual ($)</label>
                  <input required type="number" step="0.01" value={formEmpleado.salarioBase} onChange={e => setFormEmpleado({...formEmpleado, salarioBase: e.target.value})} className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo de Contrato</label>
                  <select value={formEmpleado.tipoContrato} onChange={e => setFormEmpleado({...formEmpleado, tipoContrato: e.target.value})} className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white">
                    <option value="Indefinido">Indefinido</option>
                    <option value="Temporal">Temporal</option>
                    <option value="Honorarios">Honorarios</option>
                  </select>
                </div>
              </div>

              {modoEdicionEmpleado ? (
                <div className="pt-2">
                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={formEmpleado.isActive} onChange={e => setFormEmpleado({...formEmpleado, isActive: e.target.checked})} className="rounded text-blue-600" />
                    Empleado Activo en la Empresa (Desmarcar para Baja Lógica)
                  </label>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Foto de Perfil (.PNG opcional)</label>
                  <input type="file" accept="image/png" onChange={(e) => handleImageChange(e, setFotoFile)} className="text-xs text-gray-500" />
                </div>
              )}

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModalEmpleado(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" disabled={guardando} style={{ backgroundColor: colorMarca }} className="px-4 py-2 text-sm font-semibold text-white rounded-lg">
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
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Registrar Nuevo Equipo TI</h3>
              <button onClick={() => setShowModalEquipo(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={guardarEquipo} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Número de Serie</label>
                <input required type="text" placeholder="Ej. LT-COCA-09" value={formEquipo.serialNumber} onChange={e => setFormEquipo({...formEquipo, serialNumber: e.target.value})} className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo de Dispositivo</label>
                  <select value={formEquipo.deviceType} onChange={e => setFormEquipo({...formEquipo, deviceType: e.target.value})} className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white">
                    <option value="Laptop">Laptop</option>
                    <option value="Monitor">Monitor</option>
                    <option value="Smartphone">Smartphone</option>
                    <option value="Workstation">Workstation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Marca / Modelo</label>
                  <input required type="text" placeholder="Ej. Dell Latitude 5420" value={formEquipo.model} onChange={e => setFormEquipo({...formEquipo, model: e.target.value})} className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Asignar a Empleado (Opcional)</label>
                <select value={formEquipo.assignedToId} onChange={e => setFormEquipo({...formEquipo, assignedToId: e.target.value})} className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white">
                  <option value="">-- Dejar Disponible en Almacén --</option>
                  {listaEmpleados.map(emp => <option key={emp.id} value={emp.id}>{emp.numeroEmpleado} - {emp.nombreCompleto}</option>)}
                </select>
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setShowModalEquipo(false)} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
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
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Dispersar Pago de Nómina</h3>
              <button onClick={() => setShowModalNomina(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={guardarNomina} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Seleccionar Empleado</label>
                <select required value={formNomina.userId} onChange={e => seleccionarEmpleadoNomina(e.target.value)} className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white">
                  <option value="">Selecciona un trabajador...</option>
                  {listaEmpleados.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.numeroEmpleado} - {emp.nombreCompleto} (${emp.salarioBase})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Monto Neto a Depositar ($)</label>
                <input required type="number" step="0.01" value={formNomina.amountNet} onChange={e => setFormNomina({...formNomina, amountNet: e.target.value})} className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg" />
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setShowModalNomina(false)} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
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
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Levantar Ticket de Soporte</h3>
              <button onClick={() => setShowModalTicket(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={guardarTicket} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Área Destino</label>
                <select value={formTicket.targetArea} onChange={e => setFormTicket({...formTicket, targetArea: e.target.value})} className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white">
                  <option value="IT">Sistemas / Soporte TI</option>
                  <option value="HR">Recursos Humanos</option>
                  <option value="FINANCE">Finanzas y Nómina</option>
                  <option value="GENERAL">Servicios Generales</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Asunto / Título</label>
                <input required type="text" placeholder="Ej. Solicitud de constancia laboral" value={formTicket.title} onChange={e => setFormTicket({...formTicket, title: e.target.value})} className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción detallada</label>
                <textarea required rows={3} placeholder="Describe el problema o requerimiento..." value={formTicket.description} onChange={e => setFormTicket({...formTicket, description: e.target.value})} className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg" />
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setShowModalTicket(false)} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
                <button type="submit" disabled={guardando} style={{ backgroundColor: colorMarca }} className="px-4 py-2 text-sm font-semibold text-white rounded-lg">Enviar Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
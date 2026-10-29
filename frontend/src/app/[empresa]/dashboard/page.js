"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { 
  LayoutDashboard, Users, Laptop, CircleDollarSign, 
  Ticket, LogOut, Bell, Menu, Settings, ChevronDown, 
  X, UploadCloud 
} from "lucide-react";

export default function DashboardEmpresa() {
  const params = useParams();
  const router = useRouter();
  const empresa = params.empresa;
  
  const [autorizado, setAutorizado] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false); 
  
  const [showModal, setShowModal] = useState(false);
  const [fotoPreview, setFotoPreview] = useState(null);
  
  const [formData, setFormData] = useState({ nombres: '', apellidos: '', email: '', puesto: '', rol: '' });
  const [fotoFile, setFotoFile] = useState(null); 
  const [guardando, setGuardando] = useState(false); 

  const [perfil, setPerfil] = useState({ nombre: "Cargando...", apellido: "", puesto: "...", iniciales: "-", rolSistema: "" });
  const [metricas, setMetricas] = useState({ empleados: 0, equipos: 0, tickets: 0 });
  const [listaEmpleados, setListaEmpleados] = useState([]); 

  const cargarDashboard = async () => {
    const token = localStorage.getItem('rmrg_token');
    if (!token) { router.replace('/'); return; }
    try {
      // El backend ahora obtiene el TenantID directamente del token, ruta genérica.
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/dashboard/resumen`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPerfil(data.usuario); 
        setMetricas(data.metricas); 
        setListaEmpleados(data.empleados); 
        setAutorizado(true);
      } else {
        localStorage.removeItem('rmrg_token');
        router.replace('/');
      }
    } catch (error) {
      console.error("Error de conexión:", error);
    }
  };

  useEffect(() => {
    cargarDashboard();
  }, [empresa, router]);

  const cerrarSesion = () => {
    localStorage.removeItem('rmrg_token');
    router.replace('/');
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "image/png") {
        alert("Por favor, selecciona solo archivos .PNG");
        return;
      }
      setFotoFile(file); 
      setFotoPreview(URL.createObjectURL(file)); 
    }
  };

  const enviarFormulario = async (e) => {
    e.preventDefault();
    setGuardando(true);

    const token = localStorage.getItem('rmrg_token');
    const paqueteDatos = new FormData();
    paqueteDatos.append('nombres', formData.nombres);
    paqueteDatos.append('apellidos', formData.apellidos);
    paqueteDatos.append('email', formData.email);
    paqueteDatos.append('puesto', formData.puesto);
    paqueteDatos.append('rol', formData.rol);
    if (fotoFile) {
      paqueteDatos.append('foto', fotoFile); 
    }

    try {
     // Nueva ruta protegida sin exponer el slug de la empresa
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/dashboard/empleados`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }, 
        body: paqueteDatos
      });

      if (res.ok) {
        setFormData({ nombres: '', apellidos: '', email: '', puesto: '', rol: '' });
        setFotoFile(null);
        setFotoPreview(null);
        setShowModal(false);
        cargarDashboard();
      } else {
        const errorData = await res.json();
        alert("Error: " + errorData.error);
      }
    } catch (error) {
      alert("Error de conexión al guardar el empleado.");
    } finally {
      setGuardando(false);
    }
  };

  if (!autorizado) return null;

  const menuOptions = [
    { name: "Resumen", icon: <LayoutDashboard size={20} />, current: true, show: true },
    { name: "Recursos Humanos", icon: <Users size={20} />, current: false, show: ["Super Administrador", "Admin de Recursos Humanos", "Analista HR"].includes(perfil.rolSistema) },
    { name: "Equipos TI", icon: <Laptop size={20} />, current: false, show: ["Super Administrador", "Admin de IT", "Soporte IT"].includes(perfil.rolSistema) },
    { name: "Finanzas", icon: <CircleDollarSign size={20} />, current: false, show: ["Super Administrador", "Admin de Finanzas", "Contador"].includes(perfil.rolSistema) },
    { name: "Helpdesk Tickets", icon: <Ticket size={20} />, current: false, show: true },
  ];
  const menusVisibles = menuOptions.filter(item => item.show);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans relative">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col z-20`}>
        <div className="h-16 flex items-center justify-center border-b border-gray-200 p-4">
          <div className="relative w-full h-10">
            <Image src={`/assets/images/${empresa}.png`} alt={`Logo ${empresa}`} fill className="object-contain" onError={(e) => { e.currentTarget.srcset = '/assets/images/logo-rmg.png' }} />
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <p className={`text-xs font-bold text-gray-400 mb-4 uppercase tracking-wider ${!sidebarOpen && 'hidden'}`}>Módulos del Sistema</p>
          {menusVisibles.map((item, index) => (
            <button key={index} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${item.current ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
              {item.icon}
              {sidebarOpen && <span className="text-sm">{item.name}</span>}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-md hover:bg-gray-100 text-gray-500"><Menu size={20} /></button>
            <h2 className="text-xl font-semibold text-gray-800 capitalize">Panel Corporativo</h2>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-400 hover:text-gray-600 relative"><Bell size={20} /><span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span></button>
            <div className="h-8 w-px bg-gray-300 mx-2"></div>
            
            <div className="relative">
              <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center gap-3 text-left hover:bg-gray-50 p-1.5 rounded-lg transition-colors">
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">{perfil.iniciales}</div>
                <div className="hidden md:block">
                  <p className="text-sm font-bold text-gray-700 leading-tight">{perfil.nombre} {perfil.apellido}</p>
                  <p className="text-xs text-gray-500">{perfil.rolSistema}</p>
                </div>
                <ChevronDown size={16} className="text-gray-400 hidden md:block" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100 mb-1">
                    <p className="text-sm font-medium text-gray-900">Mi Cuenta</p>
                    <p className="text-xs text-gray-500 truncate">{perfil.puesto}</p>
                  </div>
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 transition-colors"><Settings size={16} /> Configuración</button>
                  <button onClick={cerrarSesion} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors mt-1"><LogOut size={16} /> Cerrar Sesión</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto relative">
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
              <h3 className="text-2xl font-bold text-red-600 mt-1">{metricas.tickets}</h3>
            </div>
          </div>

          {perfil.rolSistema === 'Operativo' ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 flex flex-col items-center justify-center min-h-[400px]">
              <div className="bg-blue-50 p-4 rounded-full text-blue-600 mb-4"><Ticket size={48} strokeWidth={1.5} /></div>
              <h3 className="text-2xl font-bold text-gray-800">Hola, {perfil.nombre}</h3>
              <p className="text-gray-500 mt-2 max-w-md text-center">Bienvenido a tu portal corporativo. Desde aquí puedes levantar tickets de soporte y consultar el estatus de tus reportes con las diferentes áreas.</p>
              <button className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">Crear nuevo Ticket</button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-lg font-semibold text-gray-800">Directorio de Empleados</h3>
                {["Super Administrador", "Admin de Recursos Humanos"].includes(perfil.rolSistema) && (
                  <button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    + Nuevo Empleado
                  </button>
                )}
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                      <th className="px-6 py-4 font-semibold">ID / Nombre</th>
                      <th className="px-6 py-4 font-semibold">Rol en Sistema</th>
                      <th className="px-6 py-4 font-semibold">Puesto Interno</th>
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
                              <img src={`${process.env.NEXT_PUBLIC_BACKEND_URL}${empleado.avatarUrl}`} alt={empleado.nombreCompleto} className="h-8 w-8 rounded-full object-cover border border-gray-200" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">{empleado.iniciales}</div>
                            )}
                            <div>
                              <p className="text-sm font-bold text-gray-900">{empleado.numeroEmpleado} - {empleado.nombreCompleto}</p>
                              <p className="text-xs text-gray-500">{empleado.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{empleado.rol}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{empleado.puesto}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${empleado.estado === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {empleado.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium">
                          <button className="text-blue-600 hover:text-blue-900 mr-3">Editar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-800">Alta de Nuevo Empleado</h3>
              <button onClick={() => { setShowModal(false); setFotoPreview(null); }} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={enviarFormulario} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto">
                <div className="flex flex-col md:flex-row gap-6">
                  
                  <div className="w-full md:w-1/3 flex flex-col items-center">
                    <label className="text-sm font-semibold text-gray-700 mb-2 w-full text-left">Foto de Perfil</label>
                    <div className="relative group w-full aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-500 bg-gray-50 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center overflow-hidden cursor-pointer">
                      <input type="file" accept="image/png" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                      {fotoPreview ? (
                        <img src={fotoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-4 flex flex-col items-center">
                          <div className="bg-white p-3 rounded-full shadow-sm mb-2 text-blue-500 group-hover:scale-110 transition-transform"><UploadCloud size={24} /></div>
                          <p className="text-xs font-medium text-gray-600">Sube un archivo <span className="font-bold text-blue-600">.PNG</span></p>
                          <p className="text-[10px] text-gray-400 mt-1">Opcional</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="w-full md:w-2/3 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Nombres</label>
                        <input required type="text" value={formData.nombres} onChange={e => setFormData({...formData, nombres: e.target.value})} className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="Ej. Carlos" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Apellidos</label>
                        <input required type="text" value={formData.apellidos} onChange={e => setFormData({...formData, apellidos: e.target.value})} className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="Ej. López" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Correo Corporativo</label>
                      <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder={`correo@${empresa}.com`} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Puesto de Trabajo</label>
                        <input required type="text" value={formData.puesto} onChange={e => setFormData({...formData, puesto: e.target.value})} className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="Ej. Analista de Datos" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Rol en Sistema</label>
                        <select required value={formData.rol} onChange={e => setFormData({...formData, rol: e.target.value})} className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
                          <option value="">Selecciona un rol...</option>
                          <option value="Operativo">Operativo (Usuario General)</option>
                          <option value="Admin de Recursos Humanos">Admin de Recursos Humanos</option>
                          <option value="Soporte IT">Soporte IT</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                <button type="button" onClick={() => { setShowModal(false); setFotoPreview(null); }} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={guardando} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50">
                  {guardando ? 'Guardando...' : 'Guardar Empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
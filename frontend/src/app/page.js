"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { Clock } from "lucide-react";

export default function LoginScreen() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [horaActual, setHoraActual] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const actualizarReloj = () => {
      const ahora = new Date();
      setHoraActual(ahora.toLocaleTimeString());
    };
    actualizarReloj();
    const intervalo = setInterval(actualizarReloj, 1000);
    return () => clearInterval(intervalo);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const backendUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login`;

    try {
      const respuesta = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, password }),
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        alert("❌ Acceso denegado: " + data.error);
        setLoading(false);
        return;
      }

      // 1. Guardar el Token de seguridad
      localStorage.setItem('rmrg_token', data.token);

      // 2. Inteligencia de enrutamiento: 
      // El backend nos devuelve el nombre de la empresa (ej. "Coca-Cola" o "Microsoft").
      // Lo limpiamos (minúsculas, sin espacios ni guiones) para usarlo en la URL dinámica de Next.js
      const empresaSlug = data.tenant.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // 3. Redirigir al dashboard correcto automáticamente
      router.push(`/${empresaSlug}/dashboard`);

    } catch (error) {
      console.error(error);
      alert("❌ Error crítico: No se pudo conectar con el servidor.");
      setLoading(false);
    }
  };

  return (
    <>
      {/* NAVBAR SUPERIOR */}
      <nav className={styles.navbar}>
        <div className={styles.navIzquierda}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img src="/assets/images/logo-rmg.png" alt="Logo RMG" style={{ width: "28px", height: "28px", objectFit: "contain" }} />
            <span className={styles.navLogoSistema}>RMRG SYSTEMS</span>
          </div>
          
          <div className={styles.navSecciones}>
            <button className={styles.navItem}>Portales</button>
            <button className={styles.navItem}>Soporte TI</button>
            <button className={styles.navItem}>Directorio</button>
            <button className={styles.navItem}>Acerca de</button>
          </div>
        </div>

<div className={styles.navDerecha}>
  <div className={styles.relojTiempoReal}>
    <Clock size={30} strokeWidth={2.5} />
    <span>{horaActual}</span>
  </div>
</div>
      </nav>
      {/* CONTENIDO PRINCIPAL - FORMULARIO ÚNICO */}
      <div className={styles.contenedorPrincipal}>
        <div className={styles.tarjetaFormulario} style={{ maxWidth: "450px", margin: "0 auto", marginTop: "5vh" }}>
          
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "30px" }}>
            <div className={styles.contenedorLogo} style={{ width: "90px", height: "90px", borderRadius: "22px", margin: "0 0 15px 0", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <img src="/assets/images/logo-rmg.png" alt="Logo RMG" className={styles.logoEmpresa} style={{ width: "50px", height: "50px", objectFit: "contain" }} />
            </div>
            <h2 className={styles.tituloForm} style={{ fontSize: "24px" }}>Acceso Corporativo</h2>
            <p style={{ textAlign: "center", color: "#64748b", fontSize: "14px", marginTop: "10px", lineHeight: "1.5" }}>
              Ingresa con tu ID de 6 dígitos o correo. El sistema detectará automáticamente tu empresa.
            </p>
          </div>

          <form onSubmit={handleLogin}>
            
            <div className={styles.inputContenedorFlotante}>
              <span className={styles.etiquetaFlotante}>Usuario o ID Empleado</span>
              <div className={styles.inputGrupoDominio}>
                <input 
                  type="text" 
                  required
                  placeholder="Ej. 100001 o admin@cocacola.com" 
                  value={usuario} 
                  onChange={(e) => setUsuario(e.target.value)} 
                  className={styles.inputTextoLimpio} 
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            <div className={styles.inputContenedorFlotante}>
              <span className={styles.etiquetaFlotante}>Contraseña</span>
              <input 
                type="password" 
                required
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className={styles.inputFlotante} 
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className={styles.botonSubmitDinamico} 
              style={{ backgroundColor: "#0f172a", width: "100%", marginTop: "10px" }}
            >
              {loading ? 'Verificando credenciales...' : 'Entrar al sistema'}
            </button>
          </form>

        </div>
      </div>
    </>
  );
}
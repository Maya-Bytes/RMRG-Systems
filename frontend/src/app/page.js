"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { Clock, ShieldAlert, KeyRound, Upload } from "lucide-react";

const CORREO_DIOS = "juanmaya400@gmail.com";

export default function LoginScreen() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [masterKey, setMasterKey] = useState("");
  const [pemFileName, setPemFileName] = useState("");
  const [horaActual, setHoraActual] = useState("");
  const [loading, setLoading] = useState(false);

  const esModoDios = usuario.trim().toLowerCase() === CORREO_DIOS;

  useEffect(() => {
    const actualizarReloj = () => {
      const ahora = new Date();
      setHoraActual(ahora.toLocaleTimeString());
    };
    actualizarReloj();
    const intervalo = setInterval(actualizarReloj, 1000);
    return () => clearInterval(intervalo);
  }, []);

  const handlePemUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPemFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setMasterKey(String(event.target?.result || "").trim());
    };
    reader.readAsText(file);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

    try {
      if (esModoDios) {
        const respuesta = await fetch(`${API_URL}/api/auth/master-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: usuario.trim(), password, masterKey }),
        });

        const data = await respuesta.json();
        if (!respuesta.ok) {
          alert("❌ Acceso Maestro Denegado: " + data.error);
          setLoading(false);
          return;
        }

        localStorage.setItem("rmrg_master_token", data.token);
        router.push("/maya-admin/dashboard");
        return;
      }

      // Login Corporativo Normal
      const respuesta = await fetch(`${API_URL}/api/auth/login`, {
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

      localStorage.setItem("rmrg_token", data.token);
      const empresaSlug = data.tenant.toLowerCase().replace(/[^a-z0-9]/g, "");
      router.push(`/${empresaSlug}/dashboard`);
    } catch (error) {
      console.error(error);
      alert("❌ Error crítico: No se pudo conectar con el servidor.");
      setLoading(false);
    }
  };

  return (
    <>
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

      <div className={styles.contenedorPrincipal}>
        <div
          className={styles.tarjetaFormulario}
          style={{
            maxWidth: "460px",
            margin: "0 auto",
            marginTop: "5vh",
            border: esModoDios ? "2px solid #dc2626" : undefined,
            boxShadow: esModoDios ? "0 20px 50px rgba(220, 38, 38, 0.15)" : undefined,
            transition: "all 0.3s ease"
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "28px" }}>
            <div
              className={styles.contenedorLogo}
              style={{
                width: "90px",
                height: "90px",
                borderRadius: "22px",
                margin: "0 0 15px 0",
                backgroundColor: esModoDios ? "#fef2f2" : "#f8fafc",
                border: esModoDios ? "1px solid #fecaca" : "1px solid #e2e8f0"
              }}
            >
              {esModoDios ? (
                <ShieldAlert size={46} color="#dc2626" />
              ) : (
                <img src="/assets/images/logo-rmg.png" alt="Logo RMG" className={styles.logoEmpresa} style={{ width: "50px", height: "50px", objectFit: "contain" }} />
              )}
            </div>

            <h2 className={styles.tituloForm} style={{ fontSize: "24px", color: esModoDios ? "#991b1b" : undefined }}>
              {esModoDios ? "Protocolo Modo Dios" : "Acceso Corporativo"}
            </h2>
            <p style={{ textAlign: "center", color: esModoDios ? "#b91c1c" : "#64748b", fontSize: "14px", marginTop: "8px", lineHeight: "1.5" }}>
              {esModoDios
                ? "Cuenta Maestra detectada. Ingresa tu contraseña y firma criptográfica .PEM para acceder al núcleo SaaS."
                : "Ingresa con tu ID de 6 dígitos o correo. El sistema detectará automáticamente tu empresa."}
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
                  style={{ width: "100%", color: "#0f172a" }}
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
                style={{ color: "#0f172a" }}
              />
            </div>

            {esModoDios && (
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  border: "1px solid #f87171",
                  borderRadius: "14px",
                  padding: "14px",
                  marginBottom: "18px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#991b1b", display: "flex", alignItems: "center", gap: "6px" }}>
                    <KeyRound size={15} /> LLAVE CRIPTOGRÁFICA MAESTRA (.PEM)
                  </span>
                  <label
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "#dc2626",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      backgroundColor: "#ffffff",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      border: "1px solid #fca5a5"
                    }}
                  >
                    <Upload size={12} /> {pemFileName ? "Cambiar .pem" : "Subir .pem"}
                    <input type="file" accept=".pem,.txt,.key" onChange={handlePemUpload} style={{ display: "none" }} />
                  </label>
                </div>

                <textarea
                  required
                  rows={2}
                  placeholder="Pega tu llave RMRG-MASTER-KEY-... o sube tu archivo .pem"
                  value={masterKey}
                  onChange={(e) => setMasterKey(e.target.value)}
                  style={{
                    width: "100%",
                    fontSize: "12px",
                    fontFamily: "monospace",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #fca5a5",
                    backgroundColor: "#ffffff",
                    color: "#0f172a",
                    resize: "none",
                    outline: "none"
                  }}
                />
                {pemFileName && (
                  <p style={{ fontSize: "11px", color: "#15803d", fontWeight: "600", marginTop: "4px" }}>
                    ✓ Archivo cargado: {pemFileName}
                  </p>
                )}
              </div>
            )}
            
            <button 
              type="submit" 
              disabled={loading}
              className={styles.botonSubmitDinamico} 
              style={{
                backgroundColor: esModoDios ? "#dc2626" : "#0f172a",
                width: "100%",
                marginTop: "10px"
              }}
            >
              {loading
                ? "Verificando credenciales..."
                : esModoDios
                  ? "Verificar Llave Maestra"
                  : "Entrar al sistema"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // Usando bcrypt (el mismo del seed)
const multer = require('multer');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

// ==========================================
// CONFIGURACIÓN DE MULTER (Carga de Imágenes)
// ==========================================
const avatarsDir = path.join(__dirname, 'uploads', 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, avatarsDir);
  },
  filename: function (req, file, cb) {
    // Genera: avatar-16987456123-random.png
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + '.png');
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/png') cb(null, true);
    else cb(new Error('Solo se permiten archivos .PNG'));
  }
});

// ==========================================
// MIDDLEWARES
// ==========================================
app.use(cors()); 
app.use(express.json()); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; 
  
  if (!token) return res.status(401).json({ error: "Acceso denegado. No hay token." });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Token inválido o expirado." });
    req.user = user; // Inyecta los datos del token (userId, tenantId, etc.) en la petición
    next();
  });
};

// ==========================================
// RUTAS DE LA API
// ==========================================

// 0. HEALTH CHECK (Para Render)
app.get('/', (req, res) => {
  res.json({ estado: 'Online', mensaje: 'API Cloud-Native de RMG Systems operativa ☁️' });
});

// 1. LOGIN UNIFICADO (Correo o ID de 6 dígitos)
app.post('/api/auth/login', async (req, res) => {
  const { usuario, password } = req.body;
  
  if (!usuario || !password) {
    return res.status(400).json({ error: "Usuario y contraseña son obligatorios." });
  }

  try {
    let user;
    if (usuario.includes('@')) {
      user = await prisma.user.findUnique({ where: { email: usuario }, include: { role: true, tenant: true, hrProfile: true } });
    } else {
      user = await prisma.user.findUnique({ where: { numeroEmpleado: usuario }, include: { role: true, tenant: true, hrProfile: true } });
    }

    if (!user) return res.status(401).json({ error: "Credenciales incorrectas." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Credenciales incorrectas." });

    // Payload del JWT con los datos reestructurados
    const payload = {
      userId: user.id, 
      tenantId: user.tenantId, 
      numeroEmpleado: user.numeroEmpleado,
      rolSistema: user.role.name,
      nombre: user.firstName,
      apellido: user.lastName,
      iniciales: `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`,
      puesto: user.hrProfile ? user.hrProfile.position : 'Sin puesto'
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
    return res.status(200).json({ message: "Login exitoso", token, tenant: user.tenant.name });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

// 2. DASHBOARD (RESUMEN) - Extrae el tenantId directo del Token
app.get('/api/dashboard/resumen', verificarToken, async (req, res) => {
  try {
    // Usamos req.user.tenantId en lugar de buscar por URL
    const totalEmpleados = await prisma.user.count({ where: { tenantId: req.user.tenantId } });
    const totalEquipos = await prisma.iT_Asset.count({ where: { tenantId: req.user.tenantId, status: 'Asignado' } });
    const ticketsAbiertos = await prisma.ticket.count({ where: { tenantId: req.user.tenantId, status: { in: ['PENDING', 'IN_PROGRESS'] } } });

    const listaEmpleados = await prisma.user.findMany({
      where: { tenantId: req.user.tenantId }, 
      include: { hrProfile: true, role: true }, 
      take: 10, 
      orderBy: { createdAt: 'desc' }
    });

    const empleadosFormateados = listaEmpleados.map(emp => ({
      id: emp.id,
      numeroEmpleado: emp.numeroEmpleado,
      nombreCompleto: `${emp.firstName} ${emp.lastName}`,
      email: emp.email, 
      puesto: emp.hrProfile ? emp.hrProfile.position : 'N/A',
      rol: emp.role.name, 
      avatarUrl: emp.avatarUrl,
      iniciales: `${emp.firstName.charAt(0)}${emp.lastName.charAt(0)}`,
      estado: emp.isActive ? 'Activo' : 'Inactivo'
    }));

    res.json({
      usuario: { 
        nombre: req.user.nombre, 
        apellido: req.user.apellido,
        puesto: req.user.puesto, 
        iniciales: req.user.iniciales, 
        rolSistema: req.user.rolSistema 
      }, 
      metricas: { empleados: totalEmpleados, equipos: totalEquipos, tickets: ticketsAbiertos },
      empleados: empleadosFormateados
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno al cargar el dashboard" });
  }
});

// 3. NUEVO EMPLEADO (Protegido por Tenant)
app.post('/api/dashboard/empleados', verificarToken, upload.single('foto'), async (req, res) => {
  const { nombres, apellidos, email, puesto, rol } = req.body;
  
  try {
    // Busca el rol en base a lo que envíe el frontend
    const roleDb = await prisma.role.findFirst({ where: { name: rol } });
    if (!roleDb) return res.status(400).json({ error: "Rol no válido" });

    const defaultPassword = await bcrypt.hash('Password123!', 10);
    const avatarUrlPath = req.file ? `/uploads/avatars/${req.file.filename}` : null;

    // Generar un número de empleado aleatorio de 6 dígitos para pruebas
    const randomEmployeeNumber = String(Math.floor(100000 + Math.random() * 900000));

    // Crear el usuario asegurando que pertenezca al mismo Tenant del usuario que lo crea
    const nuevoUsuario = await prisma.user.create({
      data: {
        numeroEmpleado: randomEmployeeNumber,
        email: email,
        password: defaultPassword,
        firstName: nombres,       // Ahora en User
        lastName: apellidos,      // Ahora en User
        avatarUrl: avatarUrlPath, // Ahora en User
        tenantId: req.user.tenantId,
        roleId: roleDb.id,
        hrProfile: {
          create: {
            position: puesto,
            hireDate: new Date(),
            baseSalary: 15000.00,
            contractType: 'Indefinido',
            tenantId: req.user.tenantId
          }
        }
      }
    });

    res.status(201).json({ message: "Empleado creado con éxito", user: nuevoUsuario });
  } catch (error) {
    console.error("Error al crear empleado:", error);
    res.status(500).json({ error: "No se pudo registrar el empleado" });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor backend corriendo en el puerto ${PORT}`);
});

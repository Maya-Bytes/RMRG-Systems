require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

// ==========================================
// CONFIGURACIÓN DE MULTER (Carga de Imágenes .PNG)
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
// MIDDLEWARES Y HELPER DE AUDITORÍA (Caja Negra)
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
    req.user = user;
    next();
  });
};

// Función auxiliar para registrar eventos en Audit_Log
const registrarAuditoria = async (action, tableName, recordId, userId, tenantId) => {
  try {
    await prisma.audit_Log.create({
      data: { action, tableName, recordId: String(recordId), userId, tenantId }
    });
  } catch (err) {
    console.error("Error al registrar auditoría:", err);
  }
};

// ==========================================
// 0. HEALTH CHECK Y LOGIN
// ==========================================
app.get('/', (req, res) => {
  res.json({ estado: 'Online', mensaje: 'API Cloud-Native de RMRG Systems operativa ☁️' });
});

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
    if (!user.isActive) return res.status(403).json({ error: "Esta cuenta ha sido desactivada por Recursos Humanos." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Credenciales incorrectas." });

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
    await registrarAuditoria('LOGIN_EXITOSO', 'User', user.numeroEmpleado, user.id, user.tenantId);

    return res.status(200).json({
      message: "Login exitoso",
      token,
      tenant: user.tenant.name,
      themeColor: user.tenant.themeColor
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ==========================================
// 1. RESUMEN, TEMA CORPORATIVO Y RECURSOS HUMANOS
// ==========================================
app.get('/api/dashboard/resumen', verificarToken, async (req, res) => {
  try {
    const [tenant, usuarioActual, totalEmpleados, totalEquipos, ticketsAbiertos] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: req.user.tenantId } }),
      prisma.user.findUnique({ where: { id: req.user.userId }, include: { hrProfile: true, role: true } }),
      prisma.user.count({ where: { tenantId: req.user.tenantId, isActive: true } }),
      prisma.iT_Asset.count({ where: { tenantId: req.user.tenantId, status: 'Asignado' } }),
      prisma.ticket.count({ where: { tenantId: req.user.tenantId, status: { in: ['PENDING', 'IN_PROGRESS'] } } })
    ]);

    const listaEmpleados = await prisma.user.findMany({
      where: { tenantId: req.user.tenantId }, 
      include: { hrProfile: true, role: true }, 
      orderBy: { createdAt: 'desc' }
    });

    const empleadosFormateados = listaEmpleados.map(emp => ({
      id: emp.id,
      numeroEmpleado: emp.numeroEmpleado,
      firstName: emp.firstName,
      lastName: emp.lastName,
      nombreCompleto: `${emp.firstName} ${emp.lastName}`,
      email: emp.email, 
      puesto: emp.hrProfile ? emp.hrProfile.position : 'N/A',
      salarioBase: emp.hrProfile ? Number(emp.hrProfile.baseSalary) : 0,
      tipoContrato: emp.hrProfile ? emp.hrProfile.contractType : 'Indefinido',
      fechaIngreso: emp.hrProfile ? emp.hrProfile.hireDate : emp.createdAt,
      rol: emp.role.name, 
      avatarUrl: emp.avatarUrl,
      iniciales: `${emp.firstName.charAt(0)}${emp.lastName.charAt(0)}`,
      isActive: emp.isActive,
      estado: emp.isActive ? 'Activo' : 'Inactivo'
    }));

    res.json({
      tenant: {
        name: tenant?.name || 'Corporativo',
        subdomain: tenant?.subdomain || '',
        emailDomain: tenant?.emailDomain || 'corporativo.com', 
        themeColor: tenant?.themeColor || '#2563eb'
      },
      usuario: { 
        userId: req.user.userId,
        numeroEmpleado: usuarioActual?.numeroEmpleado || req.user.numeroEmpleado,
        email: usuarioActual?.email || '',
        nombre: usuarioActual?.firstName || req.user.nombre, 
        apellido: usuarioActual?.lastName || req.user.apellido,
        puesto: usuarioActual?.hrProfile ? usuarioActual.hrProfile.position : req.user.puesto, 
        iniciales: `${(usuarioActual?.firstName || req.user.nombre).charAt(0)}${(usuarioActual?.lastName || req.user.apellido).charAt(0)}`, 
        avatarUrl: usuarioActual?.avatarUrl || null,
        rolSistema: usuarioActual?.role ? usuarioActual.role.name : req.user.rolSistema 
      }, 
      metricas: { empleados: totalEmpleados, equipos: totalEquipos, tickets: ticketsAbiertos },
      empleados: empleadosFormateados
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno al cargar el dashboard" });
  }
});

// Crear Empleado
app.post('/api/dashboard/empleados', verificarToken, upload.single('foto'), async (req, res) => {
  const { nombres, apellidos, email, puesto, rol, salarioBase, tipoContrato } = req.body;
  
  try {
    const roleDb = await prisma.role.findFirst({ where: { name: rol } });
    if (!roleDb) return res.status(400).json({ error: "Rol no válido" });

    const defaultPassword = await bcrypt.hash('Admin123!', 10);
    const avatarUrlPath = req.file ? `/uploads/avatars/${req.file.filename}` : null;
    const randomEmployeeNumber = String(Math.floor(100000 + Math.random() * 900000));

    const nuevoUsuario = await prisma.user.create({
      data: {
        numeroEmpleado: randomEmployeeNumber,
        email,
        password: defaultPassword,
        firstName: nombres,
        lastName: apellidos,
        avatarUrl: avatarUrlPath,
        tenantId: req.user.tenantId,
        roleId: roleDb.id,
        hrProfile: {
          create: {
            position: puesto,
            hireDate: new Date(),
            baseSalary: salarioBase ? parseFloat(salarioBase) : 15000.00,
            contractType: tipoContrato || 'Indefinido',
            tenantId: req.user.tenantId
          }
        }
      }
    });

    await registrarAuditoria(`ALTA_EMPLEADO (${randomEmployeeNumber} - ${nombres} ${apellidos})`, 'User', nuevoUsuario.numeroEmpleado, req.user.userId, req.user.tenantId);

    res.status(201).json({ message: "Empleado creado con éxito", user: nuevoUsuario });
  } catch (error) {
    console.error("Error al crear empleado:", error);
    res.status(500).json({ error: "No se pudo registrar el empleado (verifica que el correo no esté duplicado)" });
  }
});

// Editar Empleado y Baja Lógica
app.put('/api/hr/empleados/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  const { nombres, apellidos, puesto, rol, salarioBase, tipoContrato, isActive } = req.body;

  try {
    const roleDb = await prisma.role.findFirst({ where: { name: rol } });
    if (!roleDb) return res.status(400).json({ error: "Rol no válido" });

    const empleadoActualizado = await prisma.user.update({
      where: { id },
      data: {
        firstName: nombres,
        lastName: apellidos,
        roleId: roleDb.id,
        isActive: Boolean(isActive),
        hrProfile: {
          upsert: {
            create: {
              position: puesto,
              hireDate: new Date(),
              baseSalary: parseFloat(salarioBase),
              contractType: tipoContrato,
              tenantId: req.user.tenantId
            },
            update: {
              position: puesto,
              baseSalary: parseFloat(salarioBase),
              contractType: tipoContrato
            }
          }
        }
      }
    });

    const tipoAccion = Boolean(isActive) ? `EDICION_EXPEDIENTE (${empleadoActualizado.numeroEmpleado})` : `BAJA_LOGICA_EMPLEADO (${empleadoActualizado.numeroEmpleado})`;
    await registrarAuditoria(tipoAccion, 'HR_Profile', empleadoActualizado.numeroEmpleado, req.user.userId, req.user.tenantId);

    res.json({ message: "Expediente actualizado", empleado: empleadoActualizado });
  } catch (error) {
    console.error("Error al actualizar empleado:", error);
    res.status(500).json({ error: "No se pudo actualizar el expediente" });
  }
});

// ==========================================
// 2. MÓDULO DE EQUIPOS TI (IT_Asset)
// ==========================================
app.get('/api/it/equipos', verificarToken, async (req, res) => {
  try {
    const equipos = await prisma.iT_Asset.findMany({
      where: { tenantId: req.user.tenantId },
      include: { assignedTo: { select: { id: true, firstName: true, lastName: true, numeroEmpleado: true, email: true } } }
    });
    res.json(equipos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener inventario de TI" });
  }
});

app.post('/api/it/equipos', verificarToken, async (req, res) => {
  const { serialNumber, deviceType, model, status, assignedToId } = req.body;
  try {
    const nuevoEquipo = await prisma.iT_Asset.create({
      data: {
        serialNumber,
        deviceType,
        model,
        status: assignedToId ? 'Asignado' : (status || 'Disponible'),
        assignedToId: assignedToId || null,
        tenantId: req.user.tenantId
      }
    });

    await registrarAuditoria(`REGISTRO_ACTIVO_TI (${serialNumber} - ${model})`, 'IT_Asset', serialNumber, req.user.userId, req.user.tenantId);

    if (assignedToId) {
      await prisma.notification.create({
        data: {
          message: `Se te ha asignado el equipo ${deviceType} ${model} (Serie: ${serialNumber}).`,
          userId: assignedToId,
          tenantId: req.user.tenantId
        }
      });
    }

    res.status(201).json(nuevoEquipo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al registrar equipo TI" });
  }
});

app.put('/api/it/equipos/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  const { status, assignedToId } = req.body;
  try {
    const equipo = await prisma.iT_Asset.update({
      where: { id },
      data: {
        status,
        assignedToId: assignedToId || null
      }
    });

    await registrarAuditoria(`ACTUALIZACION_ACTIVO_TI (${equipo.serialNumber} -> ${status})`, 'IT_Asset', equipo.serialNumber, req.user.userId, req.user.tenantId);

    if (assignedToId) {
      await prisma.notification.create({
        data: {
          message: `Actualización de tu equipo ${equipo.deviceType} (${equipo.serialNumber}): Estado ${status}.`,
          userId: assignedToId,
          tenantId: req.user.tenantId
        }
      });
    }

    res.json(equipo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar equipo TI" });
  }
});

// ==========================================
// 3. MÓDULO DE FINANZAS Y NÓMINA (Finance_Payroll)
// ==========================================
app.get('/api/finanzas/nominas', verificarToken, async (req, res) => {
  try {
    const nominas = await prisma.finance_Payroll.findMany({
      where: { tenantId: req.user.tenantId },
      include: { user: { select: { id: true, firstName: true, lastName: true, numeroEmpleado: true, email: true, hrProfile: true } } },
      orderBy: { paymentDate: 'desc' }
    });
    res.json(nominas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar historial de nóminas" });
  }
});

app.post('/api/finanzas/nominas', verificarToken, async (req, res) => {
  const { userId, amountNet, status } = req.body;
  try {
    const nuevaNomina = await prisma.finance_Payroll.create({
      data: {
        userId,
        amountNet: parseFloat(amountNet),
        status: status || 'Pagado',
        paymentDate: new Date(),
        tenantId: req.user.tenantId
      }
    });

    await prisma.notification.create({
      data: {
        message: `💰 Tu recibo de nómina por $${parseFloat(amountNet).toLocaleString('es-MX', { minimumFractionDigits: 2 })} ha sido dispersado (${status || 'Pagado'}).`,
        userId,
        tenantId: req.user.tenantId
      }
    });

    await registrarAuditoria(`DISPERSION_NOMINA ($${parseFloat(amountNet).toFixed(2)})`, 'Finance_Payroll', nuevaNomina.id.slice(0, 8), req.user.userId, req.user.tenantId);

    res.status(201).json(nuevaNomina);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al dispersar la nómina" });
  }
});

// ==========================================
// 4. MÓDULO HELPDESK TRANSVERSAL (Ticket)
// ==========================================
app.get('/api/tickets', verificarToken, async (req, res) => {
  try {
    const filtro = { tenantId: req.user.tenantId };
    if (req.user.rolSistema === 'Operativo') {
      filtro.creatorId = req.user.userId;
    }

    const tickets = await prisma.ticket.findMany({
      where: filtro,
      include: {
        creator: { select: { firstName: true, lastName: true, numeroEmpleado: true, email: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tickets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener los tickets" });
  }
});

app.post('/api/tickets', verificarToken, async (req, res) => {
  const { title, description, targetArea } = req.body;
  try {
    const nuevoTicket = await prisma.ticket.create({
      data: {
        title,
        description,
        targetArea,
        status: 'PENDING',
        creatorId: req.user.userId,
        tenantId: req.user.tenantId
      }
    });

    await registrarAuditoria(`CREACION_TICKET_[${targetArea}] (${title})`, 'Ticket', nuevoTicket.id.slice(0, 8), req.user.userId, req.user.tenantId);

    res.status(201).json(nuevoTicket);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear el ticket" });
  }
});

app.put('/api/tickets/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  const { status, assignedToId } = req.body;
  try {
    const ticketActualizado = await prisma.ticket.update({
      where: { id },
      data: {
        status,
        assignedToId: assignedToId || req.user.userId,
        resolvedAt: status === 'RESOLVED' ? new Date() : null
      }
    });

    await prisma.notification.create({
      data: {
        message: `🛠️ Tu ticket "${ticketActualizado.title}" cambió de estado a ${status}.`,
        userId: ticketActualizado.creatorId,
        tenantId: req.user.tenantId
      }
    });

    await registrarAuditoria(`CAMBIO_ESTADO_TICKET (${ticketActualizado.title} -> ${status})`, 'Ticket', id.slice(0, 8), req.user.userId, req.user.tenantId);

    res.json(ticketActualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar el ticket" });
  }
});

// ==========================================
// 5. CAMPANA DE NOTIFICACIONES (Notification)
// ==========================================
app.get('/api/notificaciones', verificarToken, async (req, res) => {
  try {
    const notificaciones = await prisma.notification.findMany({
      where: { userId: req.user.userId, tenantId: req.user.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json(notificaciones);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener notificaciones" });
  }
});

app.put('/api/notificaciones/leer-todas', verificarToken, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.userId, tenantId: req.user.tenantId, isRead: false },
      data: { isRead: true }
    });
    res.json({ message: "Todas las notificaciones marcadas como leídas" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar notificaciones" });
  }
});

app.put('/api/notificaciones/:id/leer', verificarToken, async (req, res) => {
  try {
    const notif = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true }
    });
    res.json(notif);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al marcar notificación" });
  }
});

// ==========================================
// 6. CAJA NEGRA DE AUDITORÍA (Audit_Log)
// ==========================================
app.get('/api/auditoria', verificarToken, async (req, res) => {
  try {
    const logs = await prisma.audit_Log.findMany({
      where: { tenantId: req.user.tenantId },
      include: {
        user: { select: { firstName: true, lastName: true, numeroEmpleado: true, email: true, role: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener registros de auditoría" });
  }
});

// ==========================================
// 7. CONFIGURACIÓN DE MI CUENTA (Perfil / Password)
// ==========================================
app.put('/api/perfil', verificarToken, upload.single('foto'), async (req, res) => {
  const { nuevaPassword } = req.body;
  try {
    const dataToUpdate = {};
    if (nuevaPassword && nuevaPassword.trim().length >= 6) {
      dataToUpdate.password = await bcrypt.hash(nuevaPassword, 10);
    }
    if (req.file) {
      dataToUpdate.avatarUrl = `/uploads/avatars/${req.file.filename}`;
    }

    const userActualizado = await prisma.user.update({
      where: { id: req.user.userId },
      data: dataToUpdate
    });

    await registrarAuditoria('ACTUALIZACION_PERFIL_PROPIO', 'User', userActualizado.numeroEmpleado, req.user.userId, req.user.tenantId);

    res.json({ message: "Perfil actualizado correctamente", avatarUrl: userActualizado.avatarUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar tu perfil" });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor backend corriendo en el puerto ${PORT}`);
});
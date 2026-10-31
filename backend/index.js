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
// CONFIGURACIÓN DE MULTER EN MEMORIA (Base64 Persistente)
// ==========================================
const avatarsDir = path.join(__dirname, 'uploads', 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/png') cb(null, true);
    else cb(new Error('Solo se permiten archivos .PNG'));
  }
});

// ==========================================
// MIDDLEWARES Y HELPER DE AUDITORÍA
// ==========================================
app.use(cors()); 
app.use(express.json({ limit: '5mb' })); 
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
// 0. HEALTH CHECK Y LOGIN CORPORATIVO
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
      user = await prisma.user.findUnique({
        where: { email: usuario.trim().toLowerCase() },
        include: { role: true, tenant: true, hrProfile: true }
      });
    } else {
      user = await prisma.user.findUnique({
        where: { numeroEmpleado: usuario.trim() },
        include: { role: true, tenant: true, hrProfile: true }
      });
    }

    if (!user) return res.status(401).json({ error: "Credenciales incorrectas." });
    if (!user.isActive) return res.status(403).json({ error: "Esta cuenta ha sido desactivada por Recursos Humanos." });
    if (user.tenant && user.tenant.isActive === false) {
      return res.status(403).json({ error: "El servicio para este corporativo se encuentra suspendido temporalmente." });
    }

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
// 1. RESUMEN Y MÓDULO DE RECURSOS HUMANOS
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

// Alta de Empleado (RH asigna puesto y contrato; el salario lo asigna Finanzas o Super Admin)
app.post('/api/dashboard/empleados', verificarToken, upload.single('foto'), async (req, res) => {
  const { nombres, apellidos, email, puesto, rol, salarioBase, tipoContrato } = req.body;
  
  try {
    const roleDb = await prisma.role.findFirst({ where: { name: rol } });
    if (!roleDb) return res.status(400).json({ error: "Rol no válido" });

    const defaultPassword = await bcrypt.hash('Admin123!', 10);
    const avatarUrlPath = req.file
      ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
      : null;

    const ultimoUsuario = await prisma.user.findFirst({ orderBy: { numeroEmpleado: 'desc' } });
    const nuevoNumeroEmpleado = ultimoUsuario
      ? String(parseInt(ultimoUsuario.numeroEmpleado, 10) + 1)
      : String(Math.floor(100000 + Math.random() * 900000));

    // Si lo crea RH sin especificar salario, inicia en 0 hasta que Finanzas asigne tabulador
    const sueldoInicial = (req.user.rolSistema === 'Super Administrador' && salarioBase)
      ? parseFloat(salarioBase)
      : 0.00;

    const nuevoUsuario = await prisma.user.create({
      data: {
        numeroEmpleado: nuevoNumeroEmpleado,
        email: email.trim().toLowerCase(),
        password: defaultPassword,
        firstName: nombres.trim(),
        lastName: apellidos.trim(),
        avatarUrl: avatarUrlPath,
        tenantId: req.user.tenantId,
        roleId: roleDb.id,
        hrProfile: {
          create: {
            position: puesto.trim(),
            hireDate: new Date(),
            baseSalary: sueldoInicial,
            contractType: tipoContrato || 'Indefinido',
            tenantId: req.user.tenantId
          }
        }
      }
    });

    await registrarAuditoria(`ALTA_EMPLEADO (${nuevoNumeroEmpleado} - ${nombres} ${apellidos})`, 'User', nuevoUsuario.numeroEmpleado, req.user.userId, req.user.tenantId);

    res.status(201).json({ message: "Empleado creado con éxito", user: nuevoUsuario });
  } catch (error) {
    console.error("Error al crear empleado:", error);
    res.status(500).json({ error: "No se pudo registrar el empleado (verifica que el correo no esté duplicado)" });
  }
});

// Edición de Expediente RH (Conserva el salario intacto si edita RH)
app.put('/api/hr/empleados/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  const { nombres, apellidos, puesto, rol, salarioBase, tipoContrato, isActive } = req.body;

  try {
    const roleDb = await prisma.role.findFirst({ where: { name: rol } });
    if (!roleDb) return res.status(400).json({ error: "Rol no válido" });

    const puedeCambiarSalario = ['Super Administrador', 'Admin de Finanzas'].includes(req.user.rolSistema);
    const puedeDarBaja = ['Super Administrador', 'Admin de Recursos Humanos'].includes(req.user.rolSistema);

    const updateHrData = {
      position: puesto.trim(),
      contractType: tipoContrato
    };
    if (puedeCambiarSalario && salarioBase !== undefined) {
      updateHrData.baseSalary = parseFloat(salarioBase);
    }

    const empleadoActualizado = await prisma.user.update({
      where: { id },
      data: {
        firstName: nombres.trim(),
        lastName: apellidos.trim(),
        roleId: roleDb.id,
        ...(puedeDarBaja && isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
        hrProfile: {
          upsert: {
            create: {
              position: puesto.trim(),
              hireDate: new Date(),
              baseSalary: puedeCambiarSalario && salarioBase ? parseFloat(salarioBase) : 0,
              contractType: tipoContrato,
              tenantId: req.user.tenantId
            },
            update: updateHrData
          }
        }
      }
    });

    const tipoAccion = Boolean(empleadoActualizado.isActive)
      ? `EDICION_EXPEDIENTE (${empleadoActualizado.numeroEmpleado})`
      : `BAJA_LOGICA_EMPLEADO (${empleadoActualizado.numeroEmpleado})`;
    await registrarAuditoria(tipoAccion, 'HR_Profile', empleadoActualizado.numeroEmpleado, req.user.userId, req.user.tenantId);

    res.json({ message: "Expediente actualizado", empleado: empleadoActualizado });
  } catch (error) {
    console.error("Error al actualizar empleado:", error);
    res.status(500).json({ error: "No se pudo actualizar el expediente" });
  }
});

// ==========================================
// 2. MÓDULO DE EQUIPOS TI (Validación Doble Empleado ↔ Estado)
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
    const estadoFinal = assignedToId ? 'Asignado' : (status === 'En Reparación' ? 'En Reparación' : 'Disponible');
    const empleadoFinal = estadoFinal === 'Asignado' ? assignedToId : null;

    const nuevoEquipo = await prisma.iT_Asset.create({
      data: {
        serialNumber: serialNumber.trim(),
        deviceType,
        model: model.trim(),
        status: estadoFinal,
        assignedToId: empleadoFinal,
        tenantId: req.user.tenantId
      }
    });

    await registrarAuditoria(`REGISTRO_ACTIVO_TI (${serialNumber} - ${model})`, 'IT_Asset', serialNumber, req.user.userId, req.user.tenantId);

    if (empleadoFinal) {
      await prisma.notification.create({
        data: {
          message: `💻 Se te ha asignado el equipo ${deviceType} ${model} (Serie: ${serialNumber}).`,
          userId: empleadoFinal,
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
    // Validación cruzada estricta:
    // - Si el estado pasa a Disponible o En Reparación, se desvincula el empleado.
    // - Si se asigna un empleado, el estado es Asignado.
    // - Si se quita el empleado y decía Asignado, pasa a Disponible.
    let estadoFinal = status;
    let empleadoFinal = assignedToId || null;

    if (status === 'Disponible' || status === 'En Reparación') {
      empleadoFinal = null;
    } else if (empleadoFinal) {
      estadoFinal = 'Asignado';
    } else {
      estadoFinal = 'Disponible';
    }

    const equipo = await prisma.iT_Asset.update({
      where: { id },
      data: {
        status: estadoFinal,
        assignedToId: empleadoFinal
      }
    });

    await registrarAuditoria(`ACTUALIZACION_ACTIVO_TI (${equipo.serialNumber} -> ${estadoFinal})`, 'IT_Asset', equipo.serialNumber, req.user.userId, req.user.tenantId);

    if (empleadoFinal) {
      await prisma.notification.create({
        data: {
          message: `💻 Se te ha asignado el equipo ${equipo.deviceType} ${equipo.model} (${equipo.serialNumber}).`,
          userId: empleadoFinal,
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
// 3. MÓDULO DE FINANZAS, TABULADOR SALARIAL Y NÓMINA EN LOTE
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

// Actualizar Salario Base desde Finanzas (Tabulador Salarial)
app.put('/api/finanzas/salario/:userId', verificarToken, async (req, res) => {
  const { userId } = req.params;
  const { salarioBase } = req.body;

  if (!['Super Administrador', 'Admin de Finanzas'].includes(req.user.rolSistema)) {
    return res.status(403).json({ error: "Solo Dirección de Finanzas o Super Admin pueden modificar el tabulador salarial." });
  }

  try {
    const emp = await prisma.user.findUnique({ where: { id: userId } });
    if (!emp) return res.status(404).json({ error: "Empleado no encontrado" });

    const perfilActualizado = await prisma.hR_Profile.upsert({
      where: { userId },
      create: {
        userId,
        position: 'Por definir',
        hireDate: new Date(),
        baseSalary: parseFloat(salarioBase),
        contractType: 'Indefinido',
        tenantId: req.user.tenantId
      },
      update: {
        baseSalary: parseFloat(salarioBase)
      }
    });

    await registrarAuditoria(
      `AJUSTE_TABULADOR_SALARIAL (${emp.numeroEmpleado} -> $${parseFloat(salarioBase).toFixed(2)})`,
      'HR_Profile',
      emp.numeroEmpleado,
      req.user.userId,
      req.user.tenantId
    );

    res.json({ message: "Salario base actualizado", hrProfile: perfilActualizado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar el salario base" });
  }
});

// Dispersión Individual
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

// Dispersión Masiva en Lote (Con Bonos y Descuentos)
app.post('/api/finanzas/nominas/lote', verificarToken, async (req, res) => {
  const { pagos } = req.body; // Array de { userId, numeroEmpleado, salarioBase, bono, descuento, amountNet }
  if (!Array.isArray(pagos) || pagos.length === 0) {
    return res.status(400).json({ error: "Selecciona al menos un empleado para dispersar nómina." });
  }

  try {
    const resultados = [];
    for (const p of pagos) {
      const montoFinal = parseFloat(p.amountNet);
      const bonoNum = parseFloat(p.bono || 0);
      const descNum = parseFloat(p.descuento || 0);

      const nomina = await prisma.finance_Payroll.create({
        data: {
          userId: p.userId,
          amountNet: montoFinal,
          status: 'Pagado',
          paymentDate: new Date(),
          tenantId: req.user.tenantId
        }
      });

      let detalleExtra = '';
      if (bonoNum > 0 || descNum > 0) {
        detalleExtra = ` [Base: $${Number(p.salarioBase).toLocaleString('es-MX')}${bonoNum > 0 ? ` + Bono: $${bonoNum}` : ''}${descNum > 0 ? ` - Desc: $${descNum}` : ''}]`;
      }

      await prisma.notification.create({
        data: {
          message: `💰 Tu pago de nómina por $${montoFinal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} ha sido depositado.${detalleExtra}`,
          userId: p.userId,
          tenantId: req.user.tenantId
        }
      });

      resultados.push(nomina);
    }

    const sumaTotal = pagos.reduce((acc, p) => acc + parseFloat(p.amountNet || 0), 0);
    await registrarAuditoria(
      `DISPERSION_NOMINA_LOTE (${resultados.length} empleados - Total: $${sumaTotal.toFixed(2)})`,
      'Finance_Payroll',
      `LOTE-${resultados.length}`,
      req.user.userId,
      req.user.tenantId
    );

    res.status(201).json({ message: `Se dispersaron ${resultados.length} pagos con éxito`, total: resultados.length });
  } catch (error) {
    console.error("Error en dispersión por lote:", error);
    res.status(500).json({ error: "Error al procesar la dispersión masiva de nómina" });
  }
});

// ==========================================
// 4. MÓDULO HELPDESK TRANSVERSAL (Con Candado de Asignación y Anti Auto-Atención)
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
        creator: { select: { id: true, firstName: true, lastName: true, numeroEmpleado: true, email: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, numeroEmpleado: true, email: true } }
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
        title: title.trim(),
        description: description.trim(),
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
  const { status } = req.body;
  try {
    const ticketActual = await prisma.ticket.findUnique({ where: { id } });
    if (!ticketActual) return res.status(404).json({ error: "Ticket no encontrado" });

    const esSuperAdmin = req.user.rolSistema === 'Super Administrador';
    const esAdminArea = ['Admin de IT', 'Admin de Recursos Humanos', 'Admin de Finanzas'].includes(req.user.rolSistema);

    // Regla 1: Nadie (salvo Super Admin) puede tomar ni resolver su propio ticket
    if (ticketActual.creatorId === req.user.userId && !esSuperAdmin) {
      return res.status(403).json({ error: "No puedes tomar ni resolver un ticket que tú mismo levantaste." });
    }

    // Regla 2: Si el ticket ya fue tomado por alguien más, otro compañero no puede quitárselo
    if (
      ticketActual.assignedToId &&
      ticketActual.assignedToId !== req.user.userId &&
      !esSuperAdmin &&
      !esAdminArea
    ) {
      return res.status(403).json({ error: "Este ticket ya está siendo atendido por otro especialista." });
    }

    const ticketActualizado = await prisma.ticket.update({
      where: { id },
      data: {
        status,
        assignedToId: req.user.userId,
        resolvedAt: status === 'RESOLVED' ? new Date() : null
      }
    });

    await prisma.notification.create({
      data: {
        message: `🛠️ Tu ticket "${ticketActualizado.title}" cambió de estado a ${status} (Atendido por ${req.user.nombre} ${req.user.apellido}).`,
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
// 5. CAMPANA DE NOTIFICACIONES
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
// 6. CAJA NEGRA DE AUDITORÍA
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
// 7. CONFIGURACIÓN DE MI CUENTA
// ==========================================
app.put('/api/perfil', verificarToken, upload.single('foto'), async (req, res) => {
  const { nuevaPassword } = req.body;
  try {
    const dataToUpdate = {};
    if (nuevaPassword && nuevaPassword.trim().length >= 6) {
      dataToUpdate.password = await bcrypt.hash(nuevaPassword, 10);
    }
    if (req.file) {
      dataToUpdate.avatarUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
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

// ==========================================
// 8. MODO DIOS (System_Admin)
// ==========================================
const verificarMasterToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Acceso denegado. Se requiere Token Maestro." });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err || !decoded.isGodMode) {
      return res.status(403).json({ error: "Privilegios insuficientes. Exclusivo para Modo Dios." });
    }
    req.master = decoded;
    next();
  });
};

app.post('/api/auth/master-login', async (req, res) => {
  const { email, password, masterKey } = req.body;

  if (!email || !password || !masterKey) {
    return res.status(400).json({ error: "Correo, contraseña y Llave Maestra (.pem) son obligatorios." });
  }

  try {
    const admin = await prisma.system_Admin.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!admin) return res.status(401).json({ error: "Credenciales maestras inválidas." });

    const passValida = await bcrypt.compare(password, admin.password);
    if (!passValida) return res.status(401).json({ error: "Contraseña maestra incorrecta." });

    const llaveLimpia = masterKey
      .replace(/-----BEGIN.*?-----/g, '')
      .replace(/-----END.*?-----/g, '')
      .trim();

    const keyValida = await bcrypt.compare(llaveLimpia, admin.masterKeyHash);
    if (!keyValida) return res.status(403).json({ error: "Firma criptográfica (.pem) rechazada." });

    const token = jwt.sign(
      { masterId: admin.id, email: admin.email, name: admin.name, isGodMode: true },
      process.env.JWT_SECRET,
      { expiresIn: '4h' }
    );

    return res.status(200).json({
      message: "Acceso Modo Dios concedido",
      token,
      admin: { name: admin.name, email: admin.email }
    });
  } catch (error) {
    console.error("Error en master-login:", error);
    return res.status(500).json({ error: "Error interno en autenticación maestra." });
  }
});

app.get('/api/master/overview', verificarMasterToken, async (req, res) => {
  try {
    const [tenants, totalUsuarios, totalEquipos, totalTickets, globalLogs] = await Promise.all([
      prisma.tenant.findMany({
        include: {
          _count: { select: { users: true } },
          users: {
            where: { role: { name: 'Super Administrador' } },
            select: { numeroEmpleado: true, email: true },
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count(),
      prisma.iT_Asset.count(),
      prisma.ticket.count({ where: { status: { in: ['PENDING', 'IN_PROGRESS'] } } }),
      prisma.audit_Log.findMany({
        include: {
          user: { select: { firstName: true, lastName: true, numeroEmpleado: true, tenant: { select: { name: true, themeColor: true } } } }
        },
        orderBy: { createdAt: 'desc' },
        take: 30
      })
    ]);

    const tenantsConMetricas = await Promise.all(
      tenants.map(async (t) => {
        const [ticketsCount, assetsCount] = await Promise.all([
          prisma.ticket.count({ where: { tenantId: t.id } }),
          prisma.iT_Asset.count({ where: { tenantId: t.id } })
        ]);
        return {
          id: t.id,
          name: t.name,
          subdomain: t.subdomain,
          emailDomain: t.emailDomain,
          themeColor: t.themeColor || '#2563eb',
          isActive: t.isActive,
          createdAt: t.createdAt,
          usuariosCount: t._count.users,
          ticketsCount,
          assetsCount,
          superAdmin: t.users[0] || null
        };
      })
    );

    res.json({
      admin: req.master,
      metricasGlobales: {
        empresas: tenants.length,
        empresasActivas: tenants.filter(t => t.isActive).length,
        usuariosTotales: totalUsuarios,
        equiposTotales: totalEquipos,
        ticketsActivos: totalTickets
      },
      tenants: tenantsConMetricas,
      auditoriaGlobal: globalLogs
    });
  } catch (error) {
    console.error("Error en /api/master/overview:", error);
    res.status(500).json({ error: "Error al cargar métricas globales." });
  }
});

app.post('/api/master/tenants', verificarMasterToken, async (req, res) => {
  const { name, subdomain, emailDomain, themeColor } = req.body;

  if (!name || !subdomain || !emailDomain) {
    return res.status(400).json({ error: "Nombre, subdominio y dominio de correo son obligatorios." });
  }

  try {
    const cleanSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');
    const cleanDomain = emailDomain.toLowerCase().replace(/^@/, '').trim();

    let superRole = await prisma.role.findFirst({ where: { name: 'Super Administrador' } });
    if (!superRole) {
      superRole = await prisma.role.create({ data: { name: 'Super Administrador', permissions: { all: true } } });
    }

    const defaultPassword = await bcrypt.hash('Admin123!', 10);

    const ultimoUsuario = await prisma.user.findFirst({ orderBy: { numeroEmpleado: 'desc' } });
    const nuevoNumeroEmpleado = ultimoUsuario
      ? String(parseInt(ultimoUsuario.numeroEmpleado, 10) + 1)
      : '100001';

    const nuevoTenant = await prisma.tenant.create({
      data: {
        name: name.trim(),
        subdomain: cleanSubdomain,
        emailDomain: cleanDomain,
        themeColor: themeColor || '#2563eb',
        isActive: true
      }
    });

    const superAdmin = await prisma.user.create({
      data: {
        numeroEmpleado: nuevoNumeroEmpleado,
        email: `superadmin@${cleanDomain}`,
        password: defaultPassword,
        firstName: 'Director',
        lastName: name.trim().split(' ')[0],
        tenantId: nuevoTenant.id,
        roleId: superRole.id,
        hrProfile: {
          create: {
            position: 'Director General',
            hireDate: new Date(),
            baseSalary: 65000.00,
            contractType: 'Indefinido',
            tenantId: nuevoTenant.id
          }
        }
      }
    });

    res.status(201).json({
      message: "Corporativo desplegado con éxito",
      tenant: nuevoTenant,
      credencialesIniciales: {
        numeroEmpleado: superAdmin.numeroEmpleado,
        email: superAdmin.email,
        passwordTemporal: 'Admin123!'
      }
    });
  } catch (error) {
    console.error("Error al crear corporativo:", error);
    res.status(500).json({ error: "No se pudo crear la empresa (verifica que el subdominio o dominio no existan ya)." });
  }
});

app.put('/api/master/tenants/:id/toggle', verificarMasterToken, async (req, res) => {
  try {
    const tenantActual = await prisma.tenant.findUnique({ where: { id: req.params.id } });
    if (!tenantActual) return res.status(404).json({ error: "Empresa no encontrada" });

    const actualizado = await prisma.tenant.update({
      where: { id: req.params.id },
      data: { isActive: !tenantActual.isActive }
    });

    res.json({ message: "Estado actualizado", tenant: actualizado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cambiar el estado de la empresa" });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor backend corriendo en el puerto ${PORT}`);
});
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

// ==========================================
// CONFIGURACIÓN DE MULTER EN MEMORIA (Base64 Serverless)
// ==========================================
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/png') cb(null, true);
    else cb(new Error('Solo se permiten archivos en formato .PNG'));
  }
});

// ==========================================
// MIDDLEWARES, RBAC Y AUDITORÍA (Caja Negra)
// ==========================================
app.use(cors()); 
app.use(express.json({ limit: '5mb' })); 

const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; 
  
  if (!token) return res.status(401).json({ error: "Acceso denegado. Token no proporcionado." });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Sesión inválida o expirada." });
    req.user = user;
    next();
  });
};

const requiereRol = (rolesPermitidos) => (req, res, next) => {
  if (!req.user || !rolesPermitidos.includes(req.user.rolSistema)) {
    return res.status(403).json({
      error: "No cuentas con los permisos departamentales necesarios para ejecutar esta operación."
    });
  }
  next();
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
// 0. HEALTH CHECK, PORTALES PÚBLICOS Y LOGIN CORPORATIVO
// ==========================================
app.get('/', (req, res) => {
  res.json({ estado: 'Online', mensaje: 'API Cloud-Native de RMRG Systems operativa ☁️' });
});

app.get('/api/public/portales', async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        subdomain: true,
        emailDomain: true,
        themeColor: true,
        logoUrl: true,
        isActive: true
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json(tenants);
  } catch (error) {
    console.error("Error al obtener portales públicos:", error);
    res.status(500).json({ error: "No se pudieron cargar los portales corporativos" });
  }
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
        themeColor: tenant?.themeColor || '#2563eb',
        logoUrl: tenant?.logoUrl || null
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

// Alta de Empleado
app.post(
  '/api/dashboard/empleados',
  verificarToken,
  requiereRol(['Super Administrador', 'Admin de Recursos Humanos']),
  upload.single('foto'),
  async (req, res) => {
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

      await registrarAuditoria(
        `ALTA_EMPLEADO (${nuevoNumeroEmpleado} - ${nombres} ${apellidos})`,
        'User',
        nuevoUsuario.numeroEmpleado,
        req.user.userId,
        req.user.tenantId
      );

      res.status(201).json({ message: "Empleado creado con éxito", user: nuevoUsuario });
    } catch (error) {
      console.error("Error al crear empleado:", error);
      res.status(500).json({ error: "No se pudo registrar el empleado (verifica que el correo no esté duplicado)" });
    }
  }
);

// Edición de Expediente RH (Soporta actualización de foto .PNG y libera equipos TI si pasa a Baja Lógica)
app.put(
  '/api/hr/empleados/:id',
  verificarToken,
  requiereRol(['Super Administrador', 'Admin de Recursos Humanos', 'Analista HR']),
  upload.single('foto'),
  async (req, res) => {
    const { id } = req.params;
    const { nombres, apellidos, puesto, rol, salarioBase, tipoContrato, isActive } = req.body;

    try {
      const roleDb = await prisma.role.findFirst({ where: { name: rol } });
      if (!roleDb) return res.status(400).json({ error: "Rol no válido" });

      const puedeCambiarSalario = ['Super Administrador', 'Admin de Finanzas'].includes(req.user.rolSistema);
      const puedeDarBaja = ['Super Administrador', 'Admin de Recursos Humanos'].includes(req.user.rolSistema);

      const estadoActivoParsed =
        isActive === undefined ? undefined : (isActive === true || isActive === 'true');

      const updateHrData = {
        position: puesto.trim(),
        contractType: tipoContrato
      };
      if (puedeCambiarSalario && salarioBase !== undefined) {
        updateHrData.baseSalary = parseFloat(salarioBase);
      }

      const dataUserUpdate = {
        firstName: nombres.trim(),
        lastName: apellidos.trim(),
        roleId: roleDb.id,
        ...(puedeDarBaja && estadoActivoParsed !== undefined ? { isActive: estadoActivoParsed } : {})
      };

      if (req.file) {
        dataUserUpdate.avatarUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      }

      const empleadoActualizado = await prisma.user.update({
        where: { id },
        data: {
          ...dataUserUpdate,
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

      // Si el empleado fue dado de baja lógica, liberar automáticamente sus equipos TI
      let equiposLiberados = 0;
      if (puedeDarBaja && estadoActivoParsed === false) {
        const liberacion = await prisma.iT_Asset.updateMany({
          where: { assignedToId: id, tenantId: req.user.tenantId },
          data: { status: 'Disponible', assignedToId: null }
        });
        equiposLiberados = liberacion.count;
      }

      const tipoAccion = Boolean(empleadoActualizado.isActive)
        ? `EDICION_EXPEDIENTE (${empleadoActualizado.numeroEmpleado})`
        : `BAJA_LOGICA_EMPLEADO (${empleadoActualizado.numeroEmpleado}${equiposLiberados > 0 ? ` - ${equiposLiberados} equipo(s) liberado(s)` : ''})`;

      await registrarAuditoria(tipoAccion, 'HR_Profile', empleadoActualizado.numeroEmpleado, req.user.userId, req.user.tenantId);

      res.json({
        message: "Expediente actualizado",
        empleado: empleadoActualizado,
        equiposLiberados
      });
    } catch (error) {
      console.error("Error al actualizar empleado:", error);
      res.status(500).json({ error: "No se pudo actualizar el expediente" });
    }
  }
);

// Restablecer contraseña de un colaborador desde RH / Super Admin
app.post(
  '/api/hr/empleados/:id/reset-password',
  verificarToken,
  requiereRol(['Super Administrador', 'Admin de Recursos Humanos']),
  async (req, res) => {
    const { id } = req.params;
    try {
      const emp = await prisma.user.findFirst({
        where: { id, tenantId: req.user.tenantId }
      });
      if (!emp) return res.status(404).json({ error: "Colaborador no encontrado." });

      const passwordTemporal = "Admin123!";
      const passwordHash = await bcrypt.hash(passwordTemporal, 10);

      await prisma.user.update({
        where: { id },
        data: { password: passwordHash }
      });

      await prisma.notification.create({
        data: {
          message: `🔐 Tu contraseña de acceso fue restablecida por ${req.user.nombre} ${req.user.apellido} (${req.user.rolSistema}). Recuerda actualizarla desde Configuración de Cuenta.`,
          userId: id,
          tenantId: req.user.tenantId
        }
      });

      await registrarAuditoria(
        `RESET_PASSWORD_EMPLEADO (${emp.numeroEmpleado})`,
        'User',
        emp.numeroEmpleado,
        req.user.userId,
        req.user.tenantId
      );

      res.json({
        message: "Contraseña restablecida con éxito",
        numeroEmpleado: emp.numeroEmpleado,
        nombreCompleto: `${emp.firstName} ${emp.lastName}`,
        email: emp.email,
        passwordTemporal
      });
    } catch (error) {
      console.error("Error al resetear password:", error);
      res.status(500).json({ error: "No se pudo restablecer la contraseña del colaborador." });
    }
  }
);

// ==========================================
// 2. MÓDULO DE EQUIPOS TI (Validación Doble + Edición Completa)
// ==========================================
app.get('/api/it/equipos', verificarToken, async (req, res) => {
  try {
    const equipos = await prisma.iT_Asset.findMany({
      where: { tenantId: req.user.tenantId },
      include: { assignedTo: { select: { id: true, firstName: true, lastName: true, numeroEmpleado: true, email: true } } },
      orderBy: { serialNumber: 'asc' }
    });
    res.json(equipos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener inventario de TI" });
  }
});

app.post(
  '/api/it/equipos',
  verificarToken,
  requiereRol(['Super Administrador', 'Admin de IT', 'Soporte IT']),
  async (req, res) => {
    const { serialNumber, deviceType, model, status, assignedToId } = req.body;
    try {
      const estadoFinal = assignedToId ? 'Asignado' : (status === 'En Reparación' ? 'En Reparación' : 'Disponible');
      const empleadoFinal = estadoFinal === 'Asignado' ? assignedToId : null;

      const nuevoEquipo = await prisma.iT_Asset.create({
        data: {
          serialNumber: serialNumber.trim().toUpperCase(),
          deviceType,
          model: model.trim(),
          status: estadoFinal,
          assignedToId: empleadoFinal,
          tenantId: req.user.tenantId
        }
      });

      await registrarAuditoria(`REGISTRO_ACTIVO_TI (${nuevoEquipo.serialNumber} - ${model})`, 'IT_Asset', nuevoEquipo.serialNumber, req.user.userId, req.user.tenantId);

      if (empleadoFinal) {
        await prisma.notification.create({
          data: {
            message: `💻 Se te ha asignado el equipo ${deviceType} ${model} (Serie: ${nuevoEquipo.serialNumber}).`,
            userId: empleadoFinal,
            tenantId: req.user.tenantId
          }
        });
      }

      res.status(201).json(nuevoEquipo);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error al registrar equipo TI (verifica que el número de serie no esté duplicado)." });
    }
  }
);

app.put(
  '/api/it/equipos/:id',
  verificarToken,
  requiereRol(['Super Administrador', 'Admin de IT', 'Soporte IT']),
  async (req, res) => {
    const { id } = req.params;
    const { serialNumber, deviceType, model, status, assignedToId } = req.body;
    try {
      const equipoPrevio = await prisma.iT_Asset.findUnique({ where: { id } });
      if (!equipoPrevio) return res.status(404).json({ error: "Equipo no encontrado" });

      let estadoFinal = status || equipoPrevio.status;
      let empleadoFinal = assignedToId !== undefined ? (assignedToId || null) : equipoPrevio.assignedToId;

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
          ...(serialNumber ? { serialNumber: serialNumber.trim().toUpperCase() } : {}),
          ...(deviceType ? { deviceType } : {}),
          ...(model ? { model: model.trim() } : {}),
          status: estadoFinal,
          assignedToId: empleadoFinal
        }
      });

      await registrarAuditoria(`ACTUALIZACION_ACTIVO_TI (${equipo.serialNumber} -> ${estadoFinal})`, 'IT_Asset', equipo.serialNumber, req.user.userId, req.user.tenantId);

      if (empleadoFinal && empleadoFinal !== equipoPrevio.assignedToId) {
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
  }
);

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
app.put(
  '/api/finanzas/salario/:userId',
  verificarToken,
  requiereRol(['Super Administrador', 'Admin de Finanzas']),
  async (req, res) => {
    const { userId } = req.params;
    const { salarioBase } = req.body;

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
  }
);

// Dispersión en Lote o Individual (Con Bonos y Descuentos)
app.post(
  '/api/finanzas/nominas/lote',
  verificarToken,
  requiereRol(['Super Administrador', 'Admin de Finanzas', 'Contador']),
  async (req, res) => {
    const { pagos } = req.body;
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
  }
);

// ==========================================
// 4. MÓDULO HELPDESK TRANSVERSAL (Con Nota de Resolución, Rechazo y Evidencia PNG)
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
  const { title, description, targetArea, attachmentUrl } = req.body;
  try {
    const nuevoTicket = await prisma.ticket.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        targetArea,
        status: 'PENDING',
        attachmentUrl: attachmentUrl || null,
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
  const { status, motivoRechazo, notaResolucion } = req.body;
  try {
    const ticketActual = await prisma.ticket.findUnique({ where: { id } });
    if (!ticketActual) return res.status(404).json({ error: "Ticket no encontrado" });

    const esSuperAdmin = req.user.rolSistema === 'Super Administrador';
    const esAdminArea = ['Admin de IT', 'Admin de Recursos Humanos', 'Admin de Finanzas'].includes(req.user.rolSistema);

    if (ticketActual.creatorId === req.user.userId && !esSuperAdmin) {
      return res.status(403).json({ error: "No puedes tomar, resolver ni rechazar un ticket que tú mismo levantaste." });
    }

    if (
      ticketActual.assignedToId &&
      ticketActual.assignedToId !== req.user.userId &&
      !esSuperAdmin &&
      !esAdminArea
    ) {
      return res.status(403).json({ error: "Este ticket ya está siendo atendido por otro especialista." });
    }

    let descripcionActualizada = ticketActual.description;
    if (status === 'REJECTED' && motivoRechazo) {
      descripcionActualizada = `${ticketActual.description}\n\n❌ [MOTIVO DE RECHAZO]: ${motivoRechazo.trim()}`;
    } else if (status === 'RESOLVED' && notaResolucion) {
      descripcionActualizada = `${ticketActual.description}\n\n✅ [SOLUCIÓN APLICADA]: ${notaResolucion.trim()}`;
    }

    const ticketActualizado = await prisma.ticket.update({
      where: { id },
      data: {
        status,
        description: descripcionActualizada,
        assignedToId: req.user.userId,
        resolvedAt: ['RESOLVED', 'REJECTED'].includes(status) ? new Date() : null
      }
    });

    let mensajeNotif = `🛠️ Tu ticket "${ticketActualizado.title}" está EN PROGRESO (Atendido por ${req.user.nombre} ${req.user.apellido}).`;
    if (status === 'REJECTED') {
      mensajeNotif = `❌ Tu ticket "${ticketActualizado.title}" fue RECHAZADO por ${req.user.nombre} ${req.user.apellido}.${motivoRechazo ? ` Motivo: ${motivoRechazo.trim()}` : ''}`;
    } else if (status === 'RESOLVED') {
      mensajeNotif = `✅ Tu ticket "${ticketActualizado.title}" fue RESUELTO por ${req.user.nombre} ${req.user.apellido}.${notaResolucion ? ` Solución: ${notaResolucion.trim()}` : ''}`;
    }

    await prisma.notification.create({
      data: {
        message: mensajeNotif,
        userId: ticketActualizado.creatorId,
        tenantId: req.user.tenantId
      }
    });

    const accionLog =
      status === 'REJECTED'
        ? `RECHAZO_TICKET (${ticketActualizado.title}${motivoRechazo ? ` - Motivo: ${motivoRechazo.trim()}` : ''})`
        : status === 'RESOLVED'
          ? `RESOLUCION_TICKET (${ticketActualizado.title}${notaResolucion ? ` - Solución: ${notaResolucion.trim()}` : ''})`
          : `TOMA_TICKET (${ticketActualizado.title} -> IN_PROGRESS)`;

    await registrarAuditoria(accionLog, 'Ticket', id.slice(0, 8), req.user.userId, req.user.tenantId);

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
      take: 25
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
      take: 80
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
// 8. MODO DIOS (System_Admin y Gobierno Multi-Tenant)
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
            select: { id: true, numeroEmpleado: true, email: true },
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
        take: 40
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
          logoUrl: t.logoUrl || null,
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
  const { name, subdomain, emailDomain, themeColor, logoUrl } = req.body;

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
        logoUrl: logoUrl || null,
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

// Editar Corporativo Existente (Logo .PNG, Color y Nombre)
app.put('/api/master/tenants/:id', verificarMasterToken, async (req, res) => {
  const { name, themeColor, logoUrl } = req.body;

  try {
    const tenantActualizado = await prisma.tenant.update({
      where: { id: req.params.id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(themeColor ? { themeColor } : {}),
        ...(logoUrl !== undefined ? { logoUrl: logoUrl || null } : {})
      }
    });

    res.json({ message: "Corporativo actualizado con éxito", tenant: tenantActualizado });
  } catch (error) {
    console.error("Error al editar corporativo:", error);
    res.status(500).json({ error: "Error al actualizar la información de la empresa" });
  }
});

// Resetear contraseña del Super Administrador de una empresa desde Modo Dios
app.post('/api/master/tenants/:id/reset-superadmin', verificarMasterToken, async (req, res) => {
  try {
    const superAdmin = await prisma.user.findFirst({
      where: {
        tenantId: req.params.id,
        role: { name: 'Super Administrador' }
      }
    });

    if (!superAdmin) {
      return res.status(404).json({ error: "Este corporativo no tiene una cuenta de Super Administrador asignada." });
    }

    const passwordTemporal = "Admin123!";
    const passwordHash = await bcrypt.hash(passwordTemporal, 10);

    await prisma.user.update({
      where: { id: superAdmin.id },
      data: { password: passwordHash, isActive: true }
    });

    res.json({
      message: "Credenciales del Director General restablecidas",
      credenciales: {
        numeroEmpleado: superAdmin.numeroEmpleado,
        email: superAdmin.email,
        passwordTemporal
      }
    });
  } catch (error) {
    console.error("Error al resetear Super Admin:", error);
    res.status(500).json({ error: "No se pudo restablecer la cuenta del Super Administrador." });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor backend corriendo en el puerto ${PORT}`);
});
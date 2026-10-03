const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt'); // Asegúrate de usar bcrypt, que fue la que instalamos
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Limpiando base de datos (Reseteando sistema)...');
  await prisma.audit_Log.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.finance_Payroll.deleteMany();
  await prisma.iT_Asset.deleteMany();
  await prisma.hR_Profile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.tenant.deleteMany();

  console.log('🌱 Iniciando sembrado OPTIMIZADO de datos...');
  const defaultPassword = await bcrypt.hash('Admin123!', 10);

  const corporativos = [
    { name: 'The Coca-Cola Company', subdomain: 'cocacola', emailDomain: 'coca-cola.com', theme: '#F40009' },
    { name: 'Samsung Electronics', subdomain: 'samsung', emailDomain: 'samsung.com', theme: '#1428A0' },
    { name: 'Microsoft Corporation', subdomain: 'microsoft', emailDomain: 'microsoft.com', theme: '#00A4EF' },
    { name: 'Amazon Web Services', subdomain: 'aws', emailDomain: 'amazon.com', theme: '#FF9900' }
  ];

  // IMPORTANTE: Los Roles se crean UNA SOLA VEZ fuera del ciclo, ya que su nombre es @unique a nivel global
  console.log('🔑 Creando Roles del sistema...');
  const roles = {
    SUPER: await prisma.role.create({ data: { name: 'Super Administrador', permissions: { all: true } } }),
    ADMIN_HR: await prisma.role.create({ data: { name: 'Admin de Recursos Humanos', permissions: { hr: 'write' } } }),
    ADMIN_IT: await prisma.role.create({ data: { name: 'Admin de IT', permissions: { it: 'write' } } }),
    ADMIN_FIN: await prisma.role.create({ data: { name: 'Admin de Finanzas', permissions: { finance: 'write' } } }),
    USER_HR: await prisma.role.create({ data: { name: 'Analista HR', permissions: { hr: 'read_write' } } }),
    USER_IT: await prisma.role.create({ data: { name: 'Soporte IT', permissions: { it: 'read_write' } } }),
    USER_FIN: await prisma.role.create({ data: { name: 'Contador', permissions: { finance: 'read_write' } } }),
    BASIC: await prisma.role.create({ data: { name: 'Operativo', permissions: { basic: 'read_own' } } }),
  };

  // Contador global para asegurar que el ID de 6 dígitos sea único en toda la base de datos
  let globalEmployeeId = 100000;

  for (const corp of corporativos) {
    console.log(`\n🏢 Construyendo corporativo: ${corp.name}...`);

    const tenant = await prisma.tenant.create({
      data: { name: corp.name, subdomain: corp.subdomain, emailDomain: corp.emailDomain, themeColor: corp.theme }
    });

    // Función adaptada al NUEVO esquema
    const createUser = async (email, roleId, firstName, lastName, position) => {
      globalEmployeeId++;
      return await prisma.user.create({
        data: {
          numeroEmpleado: globalEmployeeId.toString(), // ID de 6 dígitos único
          email, 
          password: defaultPassword, 
          firstName, // Ahora viven en User
          lastName,  // Ahora viven en User
          tenantId: tenant.id, 
          roleId,
          hrProfile: {
            create: {
              position, 
              hireDate: new Date(), 
              baseSalary: 10000 + (Math.random() * 20000), 
              contractType: 'Indefinido', 
              tenantId: tenant.id
            }
          }
        }
      });
    };

    // 1. Super Admin (1 por empresa)
    await createUser(`superadmin@${corp.emailDomain}`, roles.SUPER.id, 'Global', 'Admin', 'Director General');
    
    // 2. Admins de Área (1 por departamento)
    const adminHR = await createUser(`admin.rh@${corp.emailDomain}`, roles.ADMIN_HR.id, 'Director', 'Recursos Humanos', 'Gerente de HR');
    const adminIT = await createUser(`admin.it@${corp.emailDomain}`, roles.ADMIN_IT.id, 'Director', 'Sistemas', 'Gerente de IT');
    await createUser(`admin.finanzas@${corp.emailDomain}`, roles.ADMIN_FIN.id, 'Director', 'Finanzas', 'Contralor General');

    // 3. Usuarios de Área (1 por departamento)
    const userHR = await createUser(`user.rh@${corp.emailDomain}`, roles.USER_HR.id, 'Analista', 'HR', 'Especialista HR');
    const userIT = await createUser(`user.it@${corp.emailDomain}`, roles.USER_IT.id, 'Ingeniero', 'Soporte', 'Soporte Técnico');
    await createUser(`user.finanzas@${corp.emailDomain}`, roles.USER_FIN.id, 'Auxiliar', 'Contable', 'Contador Jr');

    // 4. Usuario General / Operativo (1 por empresa)
    const operador = await createUser(`operador@${corp.emailDomain}`, roles.BASIC.id, 'Juan', 'Pérez', 'Operador de Planta');

    // 5. Crear Equipos de IT y Nóminas para pruebas
    await prisma.iT_Asset.create({ data: { serialNumber: `LT-${corp.subdomain}-01`, deviceType: 'Laptop', model: 'Dell Latitude', status: 'Asignado', assignedToId: operador.id, tenantId: tenant.id }});
    await prisma.finance_Payroll.create({ data: { paymentDate: new Date(), amountNet: 12500.50, status: 'Pagado', userId: operador.id, tenantId: tenant.id }});

    // 6. Generar TICKETS de prueba
    await prisma.ticket.create({
      data: { title: 'Falla en el monitor', description: 'La pantalla parpadea constantemente.', targetArea: 'IT', creatorId: operador.id, tenantId: tenant.id }
    });
    
    await prisma.ticket.create({
      data: { title: 'Nueva laptop para reclutamiento', description: 'Necesitamos un equipo para el nuevo ingreso.', status: 'IN_PROGRESS', targetArea: 'IT', creatorId: adminHR.id, assignedToId: userIT.id, tenantId: tenant.id }
    });

    // 7. Generar Notificación de prueba
    await prisma.notification.create({
      data: { message: 'Tu nómina ha sido depositada.', userId: operador.id, tenantId: tenant.id }
    });
  }

  console.log('\n🎉 ¡SEMILLERO EXITOSO! Tienes exactamente 8 empleados clave por empresa listos para probar.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
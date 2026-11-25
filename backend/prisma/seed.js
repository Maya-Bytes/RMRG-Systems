require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ==========================================
// CONFIGURACIÓN DE CREDENCIALES INICIALES
// ==========================================
const MASTER_EMAIL = 'juanmaya400@gmail.com';
const MASTER_NAME = 'Carlos Maya';
const MASTER_PASSWORD = process.env.SEED_MASTER_PASSWORD || 'Admin123!';
const DEFAULT_USER_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'Admin123!';

// Ruta a tu llave .pem existente en la carpeta backend/
const PEM_FILE_PATH = path.join(__dirname, '..', process.env.MASTER_PEM_FILE || 'rmrg-master.pem');

const ROLES_BASE = [
  { name: 'Super Administrador', permissions: { all: true } },
  { name: 'Admin de Recursos Humanos', permissions: { hr: true, tickets: true } },
  { name: 'Analista HR', permissions: { hr: 'read_write', tickets: true } },
  { name: 'Admin de IT', permissions: { it: true, tickets: true } },
  { name: 'Soporte IT', permissions: { it: 'read_write', tickets: true } },
  { name: 'Admin de Finanzas', permissions: { finance: true, tickets: true } },
  { name: 'Contador', permissions: { finance: 'payroll_only', tickets: true } },
  { name: 'Operativo', permissions: { self: true, tickets: true } }
];

const CORPORATIVOS = [
  {
    name: 'The Coca-Cola Company',
    subdomain: 'thecocacolacompany',
    emailDomain: 'coca-cola.com',
    themeColor: '#dc2626',
    rangoBase: 100000,
    prefijoSerie: 'COCACOLA'
  },
  {
    name: 'Samsung Electronics',
    subdomain: 'samsungelectronics',
    emailDomain: 'samsung.com',
    themeColor: '#1d4ed8',
    rangoBase: 200000,
    prefijoSerie: 'SAMSUNG'
  },
  {
    name: 'Microsoft Corporation',
    subdomain: 'microsoftcorporation',
    emailDomain: 'microsoft.com',
    themeColor: '#0284c7',
    rangoBase: 300000,
    prefijoSerie: 'MICROSOFT'
  },
  {
    name: 'Amazon Web Services',
    subdomain: 'amazonwebservices',
    emailDomain: 'amazon.com',
    themeColor: '#f59e0b',
    rangoBase: 400000,
    prefijoSerie: 'AWS'
  }
];

const PLANTILLA_BASE = [
  { offset: 1, firstName: 'Global', lastName: 'Admin', prefijoCorreo: 'superadmin', role: 'Super Administrador', position: 'Director General', baseSalary: 65000, contractType: 'Indefinido' },
  { offset: 2, firstName: 'Director', lastName: 'Recursos Humanos', prefijoCorreo: 'admin.rh', role: 'Admin de Recursos Humanos', position: 'Gerente de HR', baseSalary: 38000, contractType: 'Indefinido' },
  { offset: 3, firstName: 'Director', lastName: 'Sistemas', prefijoCorreo: 'admin.it', role: 'Admin de IT', position: 'Gerente de IT', baseSalary: 38000, contractType: 'Indefinido' },
  { offset: 4, firstName: 'Director', lastName: 'Finanzas', prefijoCorreo: 'admin.finanzas', role: 'Admin de Finanzas', position: 'Contralor General', baseSalary: 38000, contractType: 'Indefinido' },
  { offset: 5, firstName: 'Analista', lastName: 'HR', prefijoCorreo: 'user.rh', role: 'Analista HR', position: 'Especialista HR', baseSalary: 22000, contractType: 'Indefinido' },
  { offset: 6, firstName: 'Ingeniero', lastName: 'Soporte', prefijoCorreo: 'user.it', role: 'Soporte IT', position: 'Soporte Técnico', baseSalary: 22000, contractType: 'Indefinido' },
  { offset: 7, firstName: 'Auxiliar', lastName: 'Contable', prefijoCorreo: 'user.finanzas', role: 'Contador', position: 'Contador Jr', baseSalary: 22000, contractType: 'Temporal' },
  { offset: 8, firstName: 'Juan', lastName: 'Pérez', prefijoCorreo: 'operador', role: 'Operativo', position: 'Operador de Planta', baseSalary: 12500, contractType: 'Indefinido' }
];

function obtenerOLlavePem() {
  if (fs.existsSync(PEM_FILE_PATH)) {
    console.log(`🔑 Usando llave .pem existente: ${PEM_FILE_PATH}`);
    return fs.readFileSync(PEM_FILE_PATH, 'utf8');
  }

  const claveAleatoria = crypto.randomBytes(48).toString('base64');
  const contenidoPem = `-----BEGIN RMRG MASTER KEY-----\n${claveAleatoria}\n-----END RMRG MASTER KEY-----\n`;
  fs.writeFileSync(PEM_FILE_PATH, contenidoPem, 'utf8');
  console.log(`🆕 Se generó una nueva llave .pem en: ${PEM_FILE_PATH}`);
  console.log(`⚠️  GUARDA ESTE ARCHIVO EN UN LUGAR SEGURO Y NO LO SUBAS A GITHUB.`);
  return contenidoPem;
}

async function main() {
  console.log('🚀 Iniciando seed de producción para RMRG Systems...');

  // 1. CREAR ROLES DEL SISTEMA
  const mapaRoles = {};
  for (const r of ROLES_BASE) {
    let roleDb = await prisma.role.findFirst({ where: { name: r.name } });
    if (!roleDb) {
      roleDb = await prisma.role.create({ data: r });
    }
    mapaRoles[r.name] = roleDb.id;
  }
  console.log('✅ 8 Roles corporativos verificados.');

  // 2. CREAR O ACTUALIZAR CUENTA SYSTEM_ADMIN (MODO DIOS)
  const rawPem = obtenerOLlavePem();
  const llaveLimpia = rawPem
    .replace(/-----BEGIN.*?-----/g, '')
    .replace(/-----END.*?-----/g, '')
    .trim();

  const masterPasswordHash = await bcrypt.hash(MASTER_PASSWORD, 10);
  const masterKeyHash = await bcrypt.hash(llaveLimpia, 10);

  await prisma.system_Admin.upsert({
    where: { email: MASTER_EMAIL },
    update: {
      name: MASTER_NAME,
      password: masterPasswordHash,
      masterKeyHash
    },
    create: {
      email: MASTER_EMAIL,
      name: MASTER_NAME,
      password: masterPasswordHash,
      masterKeyHash
    }
  });
  console.log(`🛡️  System_Admin (${MASTER_EMAIL}) listo para Modo Dios.`);

  // 3. CREAR CORPORATIVOS Y USUARIOS POR RANGO NUMÉRICO
  const defaultPasswordHash = await bcrypt.hash(DEFAULT_USER_PASSWORD, 10);

  for (const corp of CORPORATIVOS) {
    let tenant = await prisma.tenant.findFirst({
      where: { subdomain: corp.subdomain }
    });

    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: corp.name,
          subdomain: corp.subdomain,
          emailDomain: corp.emailDomain,
          themeColor: corp.themeColor,
          isActive: true
        }
      });
    }

    let operadorUserId = null;

    for (const emp of PLANTILLA_BASE) {
      const numeroEmpleado = String(corp.rangoBase + emp.offset);
      const email = `${emp.prefijoCorreo}@${corp.emailDomain}`;

      const user = await prisma.user.upsert({
        where: { numeroEmpleado },
        update: {
          firstName: emp.firstName,
          lastName: emp.lastName,
          isActive: true,
          roleId: mapaRoles[emp.role]
        },
        create: {
          numeroEmpleado,
          email,
          password: defaultPasswordHash,
          firstName: emp.firstName,
          lastName: emp.lastName,
          isActive: true,
          tenantId: tenant.id,
          roleId: mapaRoles[emp.role]
        }
      });

      await prisma.hR_Profile.upsert({
        where: { userId: user.id },
        update: {
          position: emp.position,
          baseSalary: emp.baseSalary,
          contractType: emp.contractType
        },
        create: {
          userId: user.id,
          position: emp.position,
          hireDate: new Date(),
          baseSalary: emp.baseSalary,
          contractType: emp.contractType,
          tenantId: tenant.id
        }
      });

      if (emp.role === 'Operativo') {
        operadorUserId = user.id;
      }
    }

    // 4. SEMBRAR 2 EQUIPOS TI BASE POR EMPRESA (1 Asignado y 1 Disponible)
    const serieAsignada = `LT-${corp.prefijoSerie}-01`;
    const existeEq1 = await prisma.iT_Asset.findFirst({ where: { serialNumber: serieAsignada } });
    if (!existeEq1 && operadorUserId) {
      await prisma.iT_Asset.create({
        data: {
          serialNumber: serieAsignada,
          deviceType: 'Laptop',
          model: 'Dell Latitude 5420',
          status: 'Asignado',
          assignedToId: operadorUserId,
          tenantId: tenant.id
        }
      });
    }

    const serieDisponible = `MN-${corp.prefijoSerie}-02`;
    const existeEq2 = await prisma.iT_Asset.findFirst({ where: { serialNumber: serieDisponible } });
    if (!existeEq2) {
      await prisma.iT_Asset.create({
        data: {
          serialNumber: serieDisponible,
          deviceType: 'Monitor',
          model: 'Dell UltraSharp 27"',
          status: 'Disponible',
          assignedToId: null,
          tenantId: tenant.id
        }
      });
    }

    // 5. SEMBRAR 1 RECIBO DE NÓMINA INICIAL PARA EL OPERATIVO (Si no existe)
    if (operadorUserId) {
      const existeNomina = await prisma.finance_Payroll.findFirst({
        where: { userId: operadorUserId, tenantId: tenant.id }
      });
      if (!existeNomina) {
        await prisma.finance_Payroll.create({
          data: {
            userId: operadorUserId,
            amountNet: 12500.00,
            status: 'Pagado',
            paymentDate: new Date(),
            tenantId: tenant.id
          }
        });
      }
    }

    console.log(`🏢 ${corp.name}: IDs ${corp.rangoBase + 1} - ${corp.rangoBase + 8} sembrados.`);
  }

  console.log('🎉 Seed de producción completado exitosamente.');
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
import { PrismaClient } from '../src/generated/prisma/index.js';
const prisma = new PrismaClient();
const emp = await prisma.employee.findFirst({ where: { isManager: false } });
const mgr = await prisma.employee.findFirst({ where: { isManager: true } });
console.log(JSON.stringify({ empId: emp?.id, empName: emp?.name, mgrId: mgr?.id, mgrName: mgr?.name }));
await prisma.$disconnect();

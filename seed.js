const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Database...');

  // 1. Create default admin user
  const passwordHash = await bcrypt.hash('password', 10);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: passwordHash,
      role: 'admin',
    },
  });

  const testUser = await prisma.user.upsert({
    where: { username: 'user' },
    update: {},
    create: {
      username: 'user',
      passwordHash: await bcrypt.hash('password', 10),
      role: 'user',
    },
  });

  console.log('Users created:', { admin: adminUser.username, testUser: testUser.username });

  // 2. Create some initial resources
  await prisma.resourceRequest.createMany({
    data: [
        { type: 'VM', details: JSON.stringify({ name: 'web-server-01', cores: 4, ram: 16, os: 'Ubuntu 22.04' }), status: 'Provisioned' },
        { type: 'Storage', details: JSON.stringify({ size: 500, type: 'SSD' }), status: 'Pending' },
    ]
  });

  console.log('Dummy resource requests created.');

  // 3. Create dummy past test runs for charts
  const now = new Date();
  
  // Helper to subtract dates
  const subtractDays = (date, days) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000);

  await prisma.testRun.createMany({
    data: [
        { name: 'VM Provision Unit Test', type: 'Unit', status: 'Pass', executionTime: 120, log: 'All tests passed.', timestamp: subtractDays(now, 5) },
        { name: 'Auth Validation Test', type: 'Unit', status: 'Pass', executionTime: 45, log: 'Token generated.', timestamp: subtractDays(now, 5) },
        { name: 'Storage Bounds Check', type: 'Unit', status: 'Fail', executionTime: 80, log: 'Expected RAM > 0, got 0.', timestamp: subtractDays(now, 4) },
        { name: 'Full VM Provision Workflow', type: 'Integration', status: 'Pass', executionTime: 2500, log: 'Workflow success.', timestamp: subtractDays(now, 3) },
        { name: 'VM Provision Unit Test', type: 'Unit', status: 'Pass', executionTime: 110, log: 'All tests passed.', timestamp: subtractDays(now, 2) },
        { name: 'Storage Workflow Test', type: 'Integration', status: 'Fail', executionTime: 3100, log: 'Storage API timeout', timestamp: subtractDays(now, 1) },
        { name: 'Full VM Provision Workflow', type: 'Integration', status: 'Pass', executionTime: 1800, log: 'Workflow success.', timestamp: now },
    ]
  });

  console.log('Dummy test runs created.');
  console.log('Database seeding complete!');
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

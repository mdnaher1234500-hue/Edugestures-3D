import { PrismaClient, UserRole, ModelStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial accounts and models...');

  // 1. Seed Master Admin
  const adminPasswordHash = await argon2.hash('password123');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@edugesture.com' },
    update: {},
    create: {
      email: 'admin@edugesture.com',
      name: 'Master Admin',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // 2. Seed Demo Models
  const modelsData = [
    {
      name: 'Human Heart Anatomy',
      description: 'Interactive anatomical model of the human heart showing ventricles and aorta.',
      category: 'Anatomy',
      tags: ['heart', 'cardiology', 'biology'],
      version: 1,
      fileUrl: '/uploads/models/heart.glb',
      status: ModelStatus.PUBLISHED,
      createdById: admin.id,
    },
    {
      name: 'DNA Double Helix',
      description: 'High-fidelity molecular model of the DNA double helix with base pairs.',
      category: 'Biology',
      tags: ['dna', 'genetics', 'molecular'],
      version: 1,
      fileUrl: '/uploads/models/dna.glb',
      status: ModelStatus.PUBLISHED,
      createdById: admin.id,
    },
    {
      name: 'Solar System Motion',
      description: 'Gravitational orbital mechanics model of the inner solar system.',
      category: 'Physics',
      tags: ['space', 'physics', 'astronomy'],
      version: 1,
      fileUrl: '/uploads/models/solar.glb',
      status: ModelStatus.PUBLISHED,
      createdById: admin.id,
    },
  ];

  for (const m of modelsData) {
    const existing = await prisma.threeDModel.findFirst({ where: { name: m.name } });
    if (!existing) {
      await prisma.threeDModel.create({ data: m });
      console.log('✅ Created model:', m.name);
    }
  }

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

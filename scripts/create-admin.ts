import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { AdminUser } from '../src/sa-auth/entities/admin-user.entity';
import { HashingService } from '../src/common/hashing/hashing.service';

async function run() {
  const email = process.argv[2];
  const fullName = process.argv[3] || 'Super Admin';
  const password = process.argv[4];

  if (!email || !password) {
    console.error('Usage: ts-node scripts/create-admin.ts <email> <fullName?> <password>');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  try {
    const dataSource = app.get(DataSource);
    const repo = dataSource.getRepository(AdminUser);
    const hashing = app.get(HashingService);

    let admin = await repo.findOne({ where: { email }, withDeleted: false });
    const passwordHash = await hashing.hashPassword(password);

    if (!admin) {
      admin = repo.create({ email, fullName, passwordHash, active: true });
      admin = await repo.save(admin);
      console.log('Created admin:', { id: admin.id, email: admin.email });
    } else {
      admin.fullName = fullName || admin.fullName;
      (admin as any).passwordHash = passwordHash;
      await repo.save(admin);
      console.log('Updated admin:', { id: admin.id, email: admin.email });
    }

    process.exitCode = 0;
  } catch (err) {
    console.error('Failed:', err);
    process.exitCode = 1;
  } finally {
    await app.close();
    setTimeout(() => process.exit(process.exitCode ?? 0), 100);
  }
}

run();

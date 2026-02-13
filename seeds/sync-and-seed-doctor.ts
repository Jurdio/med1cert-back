/**
 * One-time: sync DB schema from entities (creates tables) and seed default tenant + admin role + doctor for login.
 * Run: npm run seed:sync [email] [password]
 * Default: admin@example.com / strong_password_123
 */
import 'reflect-metadata';
process.env.DB_SYNC = 'true'; // must be set before AppModule is loaded

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Tenant } from '../src/tenants/entities/tenant.entity';
import { Role } from '../src/roles/entities/role.entity';
import { Doctor } from '../src/doctors/entities/doctor.entity';
import { HashingService } from '../src/common/hashing/hashing.service';

const DEFAULT_EMAIL = 'admin@example.com';
const DEFAULT_PASSWORD = 'strong_password_123';

async function run() {
  const email = process.argv[2] || DEFAULT_EMAIL;
  const password = process.argv[3] || DEFAULT_PASSWORD;

  console.log('Bootstrapping app with DB_SYNC=true to create tables...');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });

  try {
    const dataSource = app.get(DataSource);
    const hashing = app.get(HashingService);
    const tenantRepo = dataSource.getRepository(Tenant);
    const roleRepo = dataSource.getRepository(Role);
    const doctorRepo = dataSource.getRepository(Doctor);

    // 1) Default tenant
    let tenant = await tenantRepo.findOne({ where: { slug: 'default-clinic' } });
    if (!tenant) {
      tenant = tenantRepo.create({ name: 'Default Clinic', slug: 'default-clinic', description: 'Default tenant' });
      tenant = await tenantRepo.save(tenant);
      console.log('Created tenant:', tenant.slug);
    } else {
      console.log('Using existing tenant:', tenant.slug);
    }

    // 2) Admin role
    const full = { read: true, save: true };
    const permissions = {
      Users: { doctors: full },
      Documents: {
        settings: full,
        protect: full,
        history: full,
        verify: full,
        roles: full,
        directions: full,
        certificateTypes: full,
      },
    } as Role['permissions'];

    let role = await roleRepo.findOne({ where: { slug: 'admin', tenantId: tenant.id } });
    if (!role) {
      role = roleRepo.create({
        tenantId: tenant.id,
        name: 'Administrator',
        slug: 'admin',
        description: 'Admin role',
        permissions,
      });
      role = await roleRepo.save(role);
      console.log('Created role:', role.slug);
    } else {
      role.permissions = permissions;
      await roleRepo.save(role);
      console.log('Using existing role:', role.slug);
    }

    // 3) Doctor for login (walletAddress must be unique per tenant; use placeholder per email)
    let doctor = await doctorRepo.findOne({ where: { email, tenantId: tenant.id } });
    const passwordHash = await hashing.hashPassword(password);
    const walletPlaceholder = `not-set-${email.replace(/[@.]/g, '-')}`;
    if (!doctor) {
      doctor = doctorRepo.create({
        tenantId: tenant.id,
        fullName: 'Admin Doctor',
        email,
        walletAddress: walletPlaceholder,
        active: true,
        roleId: role.id,
        passwordHash,
      });
      doctor = await doctorRepo.save(doctor);
      console.log('Created doctor:', doctor.email);
    } else {
      (doctor as any).passwordHash = passwordHash;
      doctor.roleId = role.id;
      await doctorRepo.save(doctor);
      console.log('Updated doctor:', doctor.email, '(password and role set)');
    }

    console.log('Done. You can login with:', email, '/', password);
  } catch (err) {
    console.error('Failed:', err);
    process.exitCode = 1;
  } finally {
    await app.close();
    setTimeout(() => process.exit(process.exitCode ?? 0), 100);
  }
}

run();

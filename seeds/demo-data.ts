/**
 * Seed demo data: tenants, directions, certificate types, roles, doctors, history (transactions), reports.
 * Run after sync/schema is ready: npm run seed:demo
 * If you added Report entity recently, run seeds/sync-and-seed-doctor once so the reports table exists.
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Tenant } from '../src/tenants/entities/tenant.entity';
import { Role } from '../src/roles/entities/role.entity';
import { Doctor } from '../src/doctors/entities/doctor.entity';
import { Direction } from '../src/directions/entities/direction.entity';
import { CertificateType } from '../src/certificate-types/entities/certificate-type.entity';
import { History } from '../src/history/entities/history.entity';
import { Report } from '../src/reports/entities/report.entity';
import { Patient } from '../src/patients/entities/patient.entity';
import { HashingService } from '../src/common/hashing/hashing.service';

const DEMO_PASSWORD = 'Password1!';

function fakeSolanaId(prefix: string, n: number): string {
  const base58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let s = prefix;
  for (let i = 0; i < 40; i++) s += base58[(n + i * 7) % base58.length];
  return s;
}

function daysAgo(days: number, hour = 10, minute = 30): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  try {
    const ds = app.get(DataSource);
    const hashing = app.get(HashingService);
    const tenantRepo = ds.getRepository(Tenant);
    const roleRepo = ds.getRepository(Role);
    const doctorRepo = ds.getRepository(Doctor);
    const directionRepo = ds.getRepository(Direction);
    const certTypeRepo = ds.getRepository(CertificateType);
    const historyRepo = ds.getRepository(History);
    const reportRepo = ds.getRepository(Report);
    const patientRepo = ds.getRepository(Patient);

    // --- 1) Tenant ---
    let tenant = await tenantRepo.findOne({ where: { slug: 'default-clinic' } });
    if (!tenant) {
      tenant = tenantRepo.create({
        name: "Клініка «Здоров'я»",
        slug: 'default-clinic',
        description: 'Головна клініка для демо-даних',
      });
      tenant = await tenantRepo.save(tenant);
      console.log('Created tenant:', tenant.slug);
    } else {
      console.log('Using tenant:', tenant.slug);
    }

    // --- 2) Roles ---
    const full = { read: true, save: true };
    const readOnly = { read: true, save: false };
    const adminPermissions: Role['permissions'] = {
      Users: { doctors: full },
      Documents: {
        settings: full,
        protect: full,
        history: full,
        verify: full,
        roles: full,
        directions: full,
        certificateTypes: full,
        patients: full,
      },
    };
    const doctorPermissions: Role['permissions'] = {
      Documents: {
        protect: full,
        history: full,
        verify: readOnly,
        directions: readOnly,
        certificateTypes: readOnly,
        patients: full,
      },
    };

    let adminRole = await roleRepo.findOne({ where: { tenantId: tenant.id, slug: 'admin' } });
    if (!adminRole) {
      adminRole = roleRepo.create({
        tenantId: tenant.id,
        name: 'Адміністратор',
        slug: 'admin',
        description: 'Повний доступ',
        permissions: adminPermissions,
      });
      adminRole = await roleRepo.save(adminRole);
      console.log('Created role: admin');
    }

    let doctorRole = await roleRepo.findOne({ where: { tenantId: tenant.id, slug: 'doctor' } });
    if (!doctorRole) {
      doctorRole = roleRepo.create({
        tenantId: tenant.id,
        name: 'Лікар',
        slug: 'doctor',
        description: 'Видача сертифікатів та перегляд історії',
        permissions: doctorPermissions,
      });
      doctorRole = await roleRepo.save(doctorRole);
      console.log('Created role: doctor');
    } else {
      adminRole.permissions = adminPermissions;
      await roleRepo.save(adminRole);
      doctorRole.permissions = doctorPermissions;
      await roleRepo.save(doctorRole);
    }

    // --- 3) Directions (напрямки) ---
    const directionData = [
      { name: 'Терапія', slug: 'therapy', description: 'Загальна терапія' },
      { name: 'Хірургія', slug: 'surgery', description: 'Хірургічний напрямок' },
      { name: 'Педіатрія', slug: 'pediatrics', description: 'Дитяча медицина' },
      { name: 'Неврологія', slug: 'neurology', description: 'Нервова система' },
      { name: 'Кардіологія', slug: 'cardiology', description: 'Серце та судини' },
      { name: 'Дерматологія', slug: 'dermatology', description: 'Шкіра та придаткова' },
    ];
    for (const d of directionData) {
      let dir = await directionRepo.findOne({ where: { tenantId: tenant.id, slug: d.slug } });
      if (!dir) {
        dir = directionRepo.create({ tenantId: tenant.id, ...d });
        await directionRepo.save(dir);
      }
    }
    console.log('Directions: upserted', directionData.length);

    // --- 4) Certificate types + link to directions ---
    const certTypeData = [
      { name: 'Медична довідка', slug: 'medical-cert', dirSlugs: ['therapy', 'pediatrics'] },
      { name: 'Довідка для басейну', slug: 'pool-cert', dirSlugs: ['therapy', 'dermatology'] },
      { name: 'Довідка для дороги', slug: 'travel-cert', dirSlugs: ['therapy'] },
      { name: 'Висновок після операції', slug: 'post-surgery', dirSlugs: ['surgery'] },
      { name: 'Неврологічний висновок', slug: 'neuro-conclusion', dirSlugs: ['neurology'] },
      { name: 'Кардіологічний висновок', slug: 'cardio-conclusion', dirSlugs: ['cardiology'] },
    ];
    for (const ct of certTypeData) {
      let cert = await certTypeRepo.findOne({ where: { tenantId: tenant.id, slug: ct.slug }, relations: { directions: true } });
      const toLink: Direction[] = [];
      for (const slug of ct.dirSlugs) {
        const dir = await directionRepo.findOne({ where: { tenantId: tenant.id, slug } });
        if (dir) toLink.push(dir);
      }
      if (!cert) {
        cert = certTypeRepo.create({
          tenantId: tenant.id,
          name: ct.name,
          slug: ct.slug,
          description: `Тип сертифіката: ${ct.name}`,
        });
        cert = await certTypeRepo.save(cert);
      }
      if (toLink.length && (!cert.directions || cert.directions.length === 0)) {
        cert.directions = toLink;
        await certTypeRepo.save(cert);
      }
    }
    console.log('Certificate types: upserted', certTypeData.length);

    // --- 5) Doctors ---
    const doctorData = [
      { fullName: 'Петренко Олена Іванівна', email: 'petrenko@clinic.demo', specialization: 'Терапевт', roleSlug: 'admin' },
      { fullName: 'Коваленко Андрій Миколайович', email: 'kovalenko@clinic.demo', specialization: 'Хірург', roleSlug: 'doctor' },
      { fullName: 'Шевченко Марія Василівна', email: 'shevchenko@clinic.demo', specialization: 'Педіатр', roleSlug: 'doctor' },
      { fullName: 'Бондаренко Дмитро Олегович', email: 'bondarenko@clinic.demo', specialization: 'Невролог', roleSlug: 'doctor' },
      { fullName: 'Ткаченко Ірина Сергіївна', email: 'tkachenko@clinic.demo', specialization: 'Кардіолог', roleSlug: 'doctor' },
    ];
    const passwordHash = await hashing.hashPassword(DEMO_PASSWORD);
    const doctors: Doctor[] = [];
    for (let i = 0; i < doctorData.length; i++) {
      const d = doctorData[i];
      const wallet = `seed-wallet-${d.email.replace(/[@.]/g, '-')}`;
      let doc = await doctorRepo.findOne({ where: { tenantId: tenant.id, email: d.email } });
      const role = d.roleSlug === 'admin' ? adminRole : doctorRole;
      if (!doc) {
        doc = doctorRepo.create({
          tenantId: tenant.id,
          fullName: d.fullName,
          email: d.email,
          walletAddress: wallet,
          active: true,
          roleId: role!.id,
          specialization: d.specialization,
          phone: `+380${50 + i}${1000000 + i * 11111}`,
          passwordHash,
        });
        doc = await doctorRepo.save(doc);
        doctors.push(doc);
      } else {
        doc.roleId = role!.id;
        (doc as any).passwordHash = passwordHash;
        await doctorRepo.save(doc);
        doctors.push(doc);
      }
    }
    console.log('Doctors:', doctors.length, '| Login with any email above, password:', DEMO_PASSWORD);

    // --- 5b) Patients (пацієнти) ---
    const patientWallets = [
      '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9Z',
      '2zV7AuJTPXNfHVt3jqG5F8LmNrH6pQwRsKuYcBxCeD1v',
      '5YNmS1R4n2o3p4q5r6s7t8u9v0w1x2y3z4A5B6C7D8E',
      'HaF1n2o3p4q5r6s7t8u9v0w1x2y3z4A5B6C7D8E9F0G',
    ];
    const patientData = [
      { fullName: 'Сидоренко Іван Петрович', email: 'sydorenko@patient.demo', wallet: patientWallets[0], phone: '+380501112233', dateOfBirth: '1985-03-12', notes: 'Алергія на пеніцилін.' },
      { fullName: 'Мельник Оксана Василівна', email: 'melnyk@patient.demo', wallet: patientWallets[1], phone: '+380502223344', dateOfBirth: '1992-07-08', notes: null },
      { fullName: 'Кравченко Михайло Олегович', email: 'kravchenko@patient.demo', wallet: patientWallets[2], phone: '+380503334455', dateOfBirth: '1978-11-20', notes: 'Діабет 2 типу, контроль щорічно.' },
      { fullName: 'Білик Анна Сергіївна', email: 'bilyk@patient.demo', wallet: patientWallets[3], phone: '+380504445566', dateOfBirth: '2001-01-05', notes: null },
      { fullName: 'Гончаренко Юрій Іванович', email: 'goncharenko@patient.demo', wallet: patientWallets[4], phone: '+380505556677', dateOfBirth: '1965-09-30', notes: 'Гіпертонія.' },
      { fullName: 'Лисенко Катерина Дмитрівна', email: 'lysenko@patient.demo', wallet: null, phone: '+380506667788', dateOfBirth: '1995-04-18', notes: 'Гаманець ще не прив\'язано.' },
      { fullName: 'Павленко Олег Андрійович', email: 'pavlenko@patient.demo', wallet: null, phone: null, dateOfBirth: null, notes: null },
    ];
    let patientCount = 0;
    for (const p of patientData) {
      const existing = await patientRepo.findOne({ where: { tenantId: tenant.id, email: p.email } });
      if (!existing) {
        const patient = patientRepo.create({
          tenantId: tenant.id,
          fullName: p.fullName,
          email: p.email,
          walletAddress: p.wallet,
          phone: p.phone ?? null,
          dateOfBirth: p.dateOfBirth ?? null,
          notes: p.notes ?? null,
        });
        await patientRepo.save(patient);
        patientCount++;
      }
    }
    console.log('Patients: added', patientCount, 'patients');

    // --- 6) History (транзакції видачі сертифікатів) ---
    let historyCount = 0;
    for (let i = 0; i < 15; i++) {
      const doc = doctors[i % doctors.length];
      const sig = fakeSolanaId('sig', i + 100);
      const mint = fakeSolanaId('mint', i + 200);
      const patient = patientWallets[i % patientWallets.length];
      const existing = await historyRepo.findOne({
        where: { transactionSignature: sig, tenantId: tenant.id },
      });
      if (!existing) {
        const h = historyRepo.create({
          tenantId: tenant.id,
          transactionSignature: sig,
          nftMintAddress: mint,
          doctorWalletAddress: doc.walletAddress,
          patientWalletAddress: patient,
        });
        await historyRepo.save(h);
        historyCount++;
      }
    }
    // Історія з минулими датами (для звітів SA: activity14d, графіки)
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      for (let j = 0; j < 3; j++) {
        const i = 500 + dayOffset * 10 + j;
        const doc = doctors[i % doctors.length];
        const sig = fakeSolanaId('past', i);
        const mint = fakeSolanaId('mint', i + 300);
        const patient = patientWallets[(i + j) % patientWallets.length];
        const existing = await historyRepo.findOne({ where: { transactionSignature: sig, tenantId: tenant.id } });
        if (!existing) {
          const h = historyRepo.create({
            tenantId: tenant.id,
            transactionSignature: sig,
            nftMintAddress: mint,
            doctorWalletAddress: doc.walletAddress,
            patientWalletAddress: patient,
          });
          (h as any).createdAt = daysAgo(dayOffset, 9 + (j % 6), 15 * j);
          await historyRepo.save(h);
          historyCount++;
        }
      }
    }
    // Історія для лікарів з walletAddress = 'not-set' (placeholder до прив'язки гаманця)
    const notSetWallet = 'not-set';
    for (let i = 0; i < 15; i++) {
      const sig = fakeSolanaId('notset', i + 1000);
      const mint = fakeSolanaId('mint', i + 2000);
      const patient = patientWallets[i % patientWallets.length];
      const existing = await historyRepo.findOne({ where: { transactionSignature: sig, tenantId: tenant.id } });
      if (!existing) {
        const h = historyRepo.create({
          tenantId: tenant.id,
          transactionSignature: sig,
          nftMintAddress: mint,
          doctorWalletAddress: notSetWallet,
          patientWalletAddress: patient,
        });
        (h as any).createdAt = daysAgo(i % 14, 10 + (i % 4), 5 * i);
        await historyRepo.save(h);
        historyCount++;
      }
    }
    console.log('History: added', historyCount, 'transaction records (incl. backdated + not-set)');

    // --- 7) Reports (звіти / інформаційні документи) ---
    const reportData: { title: string; reportType: string; body: string }[] = [
      {
        title: 'Щомісячний звіт за січень 2026',
        reportType: 'monthly',
        body: `Звіт по клініці «Здоров'я» за січень 2026.

Видано сертифікатів: 42.
Активних лікарів: 5.
Найпопулярніші типи: медична довідка (18), довідка для басейну (12), висновок після операції (8).

Рекомендації: продовжити навчання з видачі NFT-сертифікатів для нових лікарів.`,
      },
      {
        title: 'Щомісячний звіт за лютий 2026',
        reportType: 'monthly',
        body: `Звіт за лютий 2026.

Видано сертифікатів: 38.
Унікальних пацієнтів: 12.
Найактивніший лікар: Шевченко М.В. (педіатр) — 14 видач.

Тренд: збільшення запитів на довідки для басейну та дороги.`,
      },
      {
        title: 'Щомісячний звіт за грудень 2025',
        reportType: 'monthly',
        body: `Підсумки грудня 2025.

Сертифікатів: 51. Пацієнтів: 18.
Кардіологічних висновків: 9, неврологічних: 7.

Святковий спад у другій половині місяця.`,
      },
      {
        title: 'Активність лікарів за останні 14 днів',
        reportType: 'activity',
        body: `Підсумок видачі сертифікатів по лікарях (останні 14 днів):

• Петренко О.І. (терапевт) — 12 видач
• Коваленко А.М. (хірург) — 8 видач
• Шевченко М.В. (педіатр) — 15 видач
• Бондаренко Д.О. (невролог) — 6 видач
• Ткаченко І.С. (кардіолог) — 9 видач

Середня кількість видач на день: 3–4. Піки активності: вівторок, четвер.`,
      },
      {
        title: 'Тижневий звіт (тиждень 1–7 лютого)',
        reportType: 'activity',
        body: `Тиждень 1–7 лютого 2026.

Видачі по днях: Пн 5, Вт 8, Ср 4, Чт 7, Пт 6, Сб 2, Нд 1.
Всього: 33 сертифікати. Унікальних пацієнтів: 14.`,
      },
      {
        title: 'Статистика по напрямках та типах сертифікатів',
        reportType: 'directions',
        body: `Напрямки: Терапія, Хірургія, Педіатрія, Неврологія, Кардіологія, Дерматологія.

Типи сертифікатів та прив'язка до напрямків:
- Медична довідка: терапія, педіатрія
- Довідка для басейну: терапія, дерматологія
- Довідка для дороги: терапія
- Висновок після операції: хірургія
- Неврологічний висновок: неврологія
- Кардіологічний висновок: кардіологія

Усі типи активні, скасованих сертифікатів за період немає.`,
      },
      {
        title: 'Інформація про пацієнтів та унікальні гаманці',
        reportType: 'patients',
        body: `За демо-період зафіксовано видачі для унікальних гаманців пацієнтів.

Рекомендації безпеки: перевіряти підпис транзакції через /verify/transaction перед підтвердженням. Всі сертифікати зберігаються як NFT на Solana.`,
      },
      {
        title: 'Реєстр пацієнтів — короткий огляд',
        reportType: 'patients',
        body: `Станом на поточну дату в системі зареєстровано пацієнтів з прив'язаними гаманцями та без.

Рекомендація: заповнювати контактні дані та дату народження для кращої ідентифікації при верифікації.`,
      },
      {
        title: 'Загальний огляд системи для адміністратора',
        reportType: 'overview',
        body: `Короткий огляд для адміністратора клініки.

Модулі: лікарі, ролі, напрямки, типи сертифікатів, історія видач, верифікація транзакцій, пацієнти, звіти.
API документація: /api-docs.
Супер-адмін: ендпоінти /sa/* та логін /sa/auth/login.`,
      },
      {
        title: 'Інструкція з роботи зі звітами',
        reportType: 'overview',
        body: `Сторінка /reports показує звіти по тенанту.

Типи: monthly (щомісячні), activity (активність), directions (напрямки), patients (пацієнти), overview (огляд).
Фільтр по reportType доступний в API: GET /reports?reportType=monthly`,
      },
      {
        title: 'Аудит видач за III квартал 2025',
        reportType: 'monthly',
        body: `Аудит видачі сертифікатів, липень–вересень 2025.

Всього видач: 127. Жодних скарг на некоректні видачі. Всі транзакції підтверджені в блокчейні.
Рекомендація: зберегти поточний темп та контроль якості.`,
      },
      {
        title: 'Підсумок по педіатрії',
        reportType: 'directions',
        body: `Напрямок «Педіатрія».

Видано за період: медичні довідки — 24, довідки для басейну — 11.
Основний лікар: Шевченко М.В. Дитячих кардіологічних висновків: 3.`,
      },
    ];
    let reportCount = 0;
    for (const r of reportData) {
      const existing = await reportRepo.findOne({
        where: { tenantId: tenant.id, title: r.title },
      });
      if (!existing) {
        const report = reportRepo.create({
          tenantId: tenant.id,
          title: r.title,
          reportType: r.reportType,
          body: r.body,
        });
        await reportRepo.save(report);
        reportCount++;
      }
    }
    console.log('Reports: added', reportCount, 'report documents');

    console.log('\nSeed demo data completed.');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await app.close();
    setTimeout(() => process.exit(process.exitCode ?? 0), 100);
  }
}

run();

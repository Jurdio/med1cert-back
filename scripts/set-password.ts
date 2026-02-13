import 'dotenv/config';
import AppDataSource from '../typeorm.config';
import * as bcrypt from 'bcryptjs';

function parseArgs(): { email: string; password: string } {
  const args = process.argv.slice(2);
  let email = '';
  let password = '';
  for (const arg of args) {
    if (arg.startsWith('--email=')) email = arg.substring('--email='.length);
    else if (arg.startsWith('--password=')) password = arg.substring('--password='.length);
  }
  if (!email || !password) {
    console.error('Usage: ts-node scripts/set-password.ts --email=<email> --password=<password>');
    process.exit(1);
  }
  return { email, password };
}

async function main() {
  const { email, password } = parseArgs();
  const configured = process.env.BCRYPT_SALT_ROUNDS;
  const parsed = configured ? parseInt(configured, 10) : NaN;
  const saltRounds = Number.isFinite(parsed) && parsed > 0 ? parsed : 10;

  const salt = await bcrypt.genSalt(saltRounds);
  const passwordHash = await bcrypt.hash(password, salt);

  await AppDataSource.initialize();
  try {
    const res = await AppDataSource.query(
      'UPDATE "doctors" SET "passwordHash" = $1 WHERE "email" = $2 RETURNING id, email, "tenantId"',
      [passwordHash, email],
    );
    if (!Array.isArray(res) || res.length === 0) {
      console.error(`No doctor found with email: ${email}`);
      process.exit(2);
    }
    console.log(`Updated password for ${res.length} doctor(s).`);
    for (const row of res) {
      console.log(`- id=${row.id} tenantId=${row.tenantId} email=${row.email}`);
    }
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

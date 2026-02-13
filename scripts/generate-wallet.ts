import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

const keypair = Keypair.generate();

const publicKey = keypair.publicKey.toBase58();
const secretKey = Buffer.from(keypair.secretKey).toString('hex');

const envFilePath = path.join(__dirname, '../.env');

let envFileContent = '';
if (fs.existsSync(envFilePath)) {
  envFileContent = fs.readFileSync(envFilePath, 'utf-8');
}

const newEnvVariables = {
  WALLET_PUBLIC_KEY: publicKey,
  WALLET_SECRET_KEY: secretKey,
};

for (const key in newEnvVariables) {
  const value = newEnvVariables[key];
  const regex = new RegExp(`^${key}=.*`, 'm');
  if (regex.test(envFileContent)) {
    envFileContent = envFileContent.replace(regex, `${key}=${value}`);
  } else {
    envFileContent += `\n${key}=${value}`;
  }
}

fs.writeFileSync(envFilePath, envFileContent.trim());

console.log('Wallet generated and .env file updated successfully!');
console.log('Public Key:', publicKey);
console.log(
  'Please fund this wallet with devnet SOL. You can use a faucet like https://solfaucet.com/',
);

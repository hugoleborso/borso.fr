import { hashOperatorPassword } from '../src/auth/auth.service';

const PASSWORD_VARIABLE = 'OPERATOR_PASSWORD';

const password = process.env[PASSWORD_VARIABLE];
if (password === undefined || password.length === 0) {
  throw new Error(`${PASSWORD_VARIABLE} must hold the password to hash`);
}

process.stdout.write(`${await hashOperatorPassword(password)}\n`);

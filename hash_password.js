const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;

async function hashPassword(password) {
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  console.log(`Hashed password for "${password}":`);
  console.log(hash);
}

const passwordToHash = process.argv[2];

if (!passwordToHash) {
  console.error('Please provide a password as the first argument');
  process.exit(1);
}

hashPassword(passwordToHash);

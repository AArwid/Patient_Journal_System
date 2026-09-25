const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

function hashPassword(plainText) {
  return bcrypt.hashSync(plainText, SALT_ROUNDS);
}

function verifyPassword(plainText, hash) {
  return bcrypt.compareSync(plainText, hash);
}

module.exports = { hashPassword, verifyPassword };

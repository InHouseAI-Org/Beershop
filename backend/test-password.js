const bcrypt = require('bcryptjs');

const password = '1234';
const hash = '$2a$10$FVSa8/LIbfhjX5J2Av0E1.4/v0tWkVHGbE9fhbQ38XF0g3gaMmIbS';

const isMatch = bcrypt.compareSync(password, hash);

console.log(`Password: ${password}`);
console.log(`Hash: ${hash}`);
console.log(`Match: ${isMatch}`);

if (isMatch) {
  console.log('\n✓ YES - The password is "1234"');
} else {
  console.log('\n✗ NO - The password is NOT "1234"');
}

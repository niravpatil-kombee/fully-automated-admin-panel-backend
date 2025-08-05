// hash-password.js
import bcrypt from "bcryptjs"

// --- 1. CHOOSE YOUR PASSWORD HERE ---
const myPassword = 'Admin@123';

// --- 2. GENERATE THE HASH ---
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(myPassword, salt);

// --- 3. DISPLAY THE RESULTS ---
console.log('====================================================');
console.log('Your Login Password Is:', myPassword);
console.log('====================================================');
console.log('');
console.log('COPY THE HASH BELOW and paste it into MongoDB Compass:');
console.log(hash);
console.log('');
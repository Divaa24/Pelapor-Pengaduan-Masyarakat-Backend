import bcrypt from "bcrypt";

const hash = await bcrypt.hash("password123", 10);
console.log(hash);

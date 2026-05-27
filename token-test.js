const { generateToken } = require('./src/utils/tokenUtils');

const token = generateToken("app1", "uploader");

console.log("TOKEN:");
console.log(token);
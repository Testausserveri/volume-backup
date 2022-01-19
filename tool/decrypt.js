require("dotenv").config()
const { existsSync, statSync } = require("fs")
const decrypt = require("../src/decrypt")

const path = process.argv[2]
console.log("Decrypting", path)
if (!existsSync(path) || statSync(path).isDirectory()) console.error("Invalid input file.")
else decrypt(path).then((filename) => console.log(" ->", filename))

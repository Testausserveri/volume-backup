require("dotenv").config()
const { existsSync, statSync } = require("fs")
const encrypt = require("../src/encrypt")

const path = process.argv[2]
console.log("Encrypting", path)
if (!existsSync(path) || statSync(path).isDirectory()) console.error("Invalid input file.")
else encrypt(path).then((filename) => console.log(" ->", filename))

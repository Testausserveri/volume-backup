const { createReadStream, createWriteStream } = require("fs")
const { createCipheriv, createHash, randomBytes } = require("crypto")

/**
 * Encrypt a file
 * @param {string} filepath
 * @returns {Promise<string>} Encrypted output file path
 */
module.exports = (filepath) => new Promise((resolve) => {
    const input = createReadStream(filepath)
    const output = createWriteStream(`${filepath}.encrypted`)
    const iv = randomBytes(16)
    const cipher = createHash("sha256").update(process.env.ENCRYPTION_KEY).digest("base64").substr(0, 32)
    output.write(iv) // The initialization vector is the first 16 bytes
    input.pipe(createCipheriv("aes-256-cbc", cipher, iv)).pipe(output)
    output.on("finish", resolve(`${filepath}.encrypted`))
})

const { createReadStream, createWriteStream } = require("fs")
const { createDecipheriv, createHash } = require("crypto")

/**
 * Decrypt a file
 * @param {string} filepath
 * @returns {Promise<string>} Encrypted output file path
 */
module.exports = (filepath) => new Promise((resolve) => {
    const input = createReadStream(filepath)
    let newPath = filepath.replace("encrypted", "decrypted")
    if (newPath === filepath) newPath += ".decrypted"
    const output = createWriteStream(`${newPath}`)
    let iv
    const cipher = createHash("sha256").update(process.env.ENCRYPTION_KEY).digest("base64").substr(0, 32)
    let decryptStream
    input.on("data", (chunk) => {
        if (iv === undefined) {
            iv = chunk.slice(0, 16)
            decryptStream = createDecipheriv("aes-256-cbc", cipher, iv)
            decryptStream.pipe(output)
            decryptStream.write(chunk.slice(16))
        } else decryptStream.write(chunk)
    })
    output.on("finish", resolve(`${filepath}.decrypted`))
})

const { createReadStream, createWriteStream } = require("fs")
const { createCipheriv, createHash, randomBytes } = require("crypto")

/**
 * Encrypt a file
 * @param {string} filepath
 * @returns {Promise<{path: string, error: Error }>} Encrypted output file path
 */
module.exports = (filepath) => new Promise((resolve) => {
    let fileCreated = null
    try {
        const input = createReadStream(filepath)
        const newName = filepath.split("/").reverse()[0].split(".")
        newName.unshift("encrypted")
        const newPath = filepath.replace(filepath.split("/").reverse()[0], newName.join("."))
        const output = createWriteStream(newPath)
        fileCreated = output
        const iv = randomBytes(16)
        const cipher = createHash("sha256").update(process.env.ENCRYPTION_KEY).digest("base64").substr(0, 32)
        output.write(iv) // The initialization vector is the first 16 bytes
        input.pipe(createCipheriv("aes-256-cbc", cipher, iv)).pipe(output)
        output.on("finish", () => resolve({ path: newPath, error: null }))
        output.on("error", (e) => { throw e })
    } catch (e) {
        if (fileCreated !== null) resolve({ path: fileCreated, error: e })
    }
})

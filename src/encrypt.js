const { createReadStream, createWriteStream } = require("fs")
const { createCipheriv } = require("crypto")

/**
 * Encrypt a file
 * @param {string} filepath
 * @returns {tring} Encrypted output file path
 */
module.exports = (filepath) => new Promise((resolve) => {
    const input = createReadStream(filepath)
    const output = createWriteStream(`${filepath}.encrypted`)
    input.pipe(createCipheriv("aes-256-cbc", process.env.ENCRYPTION_KEY)).pipe(output)
    output.on("finish", resolve(`${filepath}.encrypted`))
})

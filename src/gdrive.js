const { google: { auth, drive } } = require("googleapis")

const token = require("../.token.json")

/**
 * Upload a file to a specific shared drive
 * @param {string} name The file name
 * @param {string} mimeType The file mime type
 * @param {string} driveId The drive id
 * @param {ReadableStream} body A readable stream that provides the file data
 * @returns {Promise<string>}
 */
async function uploadFile(name, mimeType, driveId, body) {
    const client = new auth.JWT(
        token.client_email,
        null,
        token.private_key,
        ["https://www.googleapis.com/auth/drive.file"],
        null
    )
    client.authorize((err) => { throw err })
    const driveInstance = drive({ version: "v3", auth: client })
    const resource = { name, mimeType, driveId }
    const media = { mimeType, body }
    const creation = await driveInstance.files.create({
        resource, media, fields: "id", supportsTeamDrives: true
    })
    if (creation?.data?.id) return creation.data.id
    throw new Error(creation)
}

module.exports = {
    uploadFile
}

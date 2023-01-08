/* eslint-disable no-throw-literal */
/* eslint-disable no-restricted-syntax */
require("dotenv").config()
const { randomBytes } = require("crypto")
const { create } = require("tar")
const {
    existsSync,
    mkdirSync,
    statSync,
    writeFileSync,
    createReadStream,
    rmSync
} = require("fs")
const docker = require("./docker")
const encrypt = require("./encrypt")
const { uploadFile } = require("./gdrive")

/**
 * Create a backup archive
 * @returns {Promise<{ path: string, error: Error | null }>}
 */
async function createBackupArchive() {
    const containers = docker.getContainers()
    const cacheDirectory = randomBytes(16).toString("hex")
    if (!existsSync("./cache") || !statSync("./cache").isDirectory()) mkdirSync("./cache")
    if (existsSync(`./cache/${cacheDirectory}`)) throw "Cache already exists."
    mkdirSync(`./cache/${cacheDirectory}`)
    try {
        // Create archives in cache
        for await (const container of containers) {
            if (!process.env.BLACKLIST.split(";").includes(container.name)) {
                console.log(
                    "Processing", container.name, `(${container.id})`
                )
                container.archives = []
                for await (const mount of docker.getMount(container.id)) {
                    console.log(" ->", mount.mountpoint)
                    const file = `${mount.type}-${container.id}-${randomBytes(3).toString("hex")}.tar.gz`
                    await create({
                        file: `./cache/${cacheDirectory}/${file}`,
                        gzip: true
                    },
                    [`${mount.mountpoint}/`])
                    container.archives.push({ mountpoint: mount.mountpoint, archive: file })
                }
            }
        }
        // Create the final directory
        writeFileSync(`./cache/${cacheDirectory}/info.json`, JSON.stringify({
            timestamp: new Date().getTime(),
            containers
        }))
        // Convert the final directory to .tar.gz
        await create({
            file: `./cache/${cacheDirectory}.tar.gz`,
            cwd: "./cache/",
            gzip: true
        },
        [`${cacheDirectory}/`])
        return { path: `./cache/${cacheDirectory}.tar.gz`, error: null }
    } catch (e) {
        console.error("Volume collection error", e)
        return { path: `./cache/${cacheDirectory}.tar.gz`, error: e }
    }
}

/**
 * Create a backup & upload it to Google Drive
 */
module.exports = async function doBackup() {
    console.log("Running Docker volume discovery...")

    // Declare vars for paths
    let archive
    let cacheDirectory
    let backupPath
    let error = null

    // eslint-disable-next-line no-async-promise-executor
    await new Promise(async (resolve) => {
        try {
            // Create archive
            const archiveCreate = await createBackupArchive()
            if (archiveCreate.error !== null) throw archiveCreate.error
            archive = archiveCreate.path
            cacheDirectory = archive.replace(".tar.gz", "")
            console.log(`Archive created (${archive})`)

            // Encrypt the backup
            const doEncrypt = await encrypt(archive)
            if (doEncrypt.error !== null) throw doEncrypt.error
            backupPath = doEncrypt.path
            console.log(`Archive encrypted (${backupPath})`)

            // Upload the encrypted backup
            console.log("Uploading...")
            const fileId = await uploadFile(
                backupPath.split("/").reverse()[0], "application/tar+gzip", process.env.DRIVE_ID, createReadStream(backupPath)
            )
            console.log(`-> Uploaded (${fileId})`)
            resolve()
        } catch (e) {
            error = e
            resolve()
        }
    })

    // Clear cache
    try {
        console.log("Cleaning up...")
        if (cacheDirectory) rmSync(cacheDirectory, { recursive: true, force: true })
        if (archive) rmSync(archive)
        if (backupPath) rmSync(backupPath)
        console.log("Done.")
    } catch (e) {
        console.error("Critical cleanup error", e)
    }

    // Throw if needed
    if (error !== null) throw error
}

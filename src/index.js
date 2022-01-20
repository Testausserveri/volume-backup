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
 * @returns {string} The backup relative file path
 */
async function createBackupArchive() {
    const containers = docker.getContainers()
    const cacheDirectory = randomBytes(16).toString("hex")
    if (!existsSync("./cache") || !statSync("./cache").isDirectory()) mkdirSync("./cache")
    if (existsSync(`./cache/${cacheDirectory}`)) throw "Cache already exists."
    mkdirSync(`./cache/${cacheDirectory}`)
    // Create archives in cache
    for await (const container of containers) {
        if (!process.env.BLACKLIST.split(";").includes(container.name)) {
            console.log("Processing", container.name, `(${container.id})`)
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
    return `./cache/${cacheDirectory}.tar.gz`
}

/**
 * Create a backup & upload it to Google Drive
 */
module.exports = async function doBackup() {
    console.log("Running Docker volume discovery...")
    // Create archive & upload
    const archive = await createBackupArchive()
    const cacheDirectory = archive.replace(".tar.gz", "")
    console.log(`Archive created (${archive})`)
    const backupPath = await encrypt(archive)
    console.log(`Archive encrypted (${backupPath})`)
    console.log("Uploading...")
    const fileId = await uploadFile(backupPath.split("/").reverse()[0], "application/tar+gzip", process.env.DRIVE_ID, createReadStream(backupPath))
    console.log(`-> Uploaded (${fileId})`)
    // Clear cache
    console.log("Cleaning up...")
    rmSync(cacheDirectory, { recursive: true, force: true })
    rmSync(archive)
    rmSync(backupPath)
    console.log("Done.")
}

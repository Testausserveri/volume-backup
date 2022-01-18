/* eslint-disable no-throw-literal */
/* eslint-disable no-restricted-syntax */
require("dotenv").config()
const { randomBytes } = require("crypto")

const {
    existsSync,
    mkdirSync,
    statSync,
    writeFileSync
} = require("fs")
const { create } = require("tar")

const docker = require("./docker")
const encrypt = require("./encrypt")

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
        console.log("Processing", container.name, `(${container.id})`)
        for await (const mount of docker.getMount(container.id)) {
            console.log("   Archiving", mount.mountpoint)
            const file = `${mount.type}-${container.id}-${randomBytes(3).toString("hex")}.tar.gz`
            await create({
                file: `./cache/${cacheDirectory}/${file}`,
                gzip: true
            },
            [`${mount.mountpoint}/`])
            container.archive = file
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
        gzip: true
    },
    [`./cache/${cacheDirectory}/`])
    return `./cache/${cacheDirectory}.tar.gz`
}

async function doBackup() {
    const backupPath = await encrypt(await createBackupArchive())
    console.log("Backup ", backupPath, "created.")
}

console.log("Creating a backup...")
doBackup()

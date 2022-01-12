/* eslint-disable no-throw-literal */
/* eslint-disable no-restricted-syntax */
require("dotenv").config()
let { randomUUID } = require("crypto")

if (!randomUUID) randomUUID = crypto.randomBytes(16).toString("hex")

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
    const volumes = docker.getVolumes()
    const cacheDirectory = randomUUID().replace(/-/g, "")
    if (!existsSync("./cache") && statSync("./cache").isDirectory()) mkdirSync("./cache")
    if (existsSync(`./cache/${cacheDirectory}`)) throw "Cache already exists."
    mkdirSync(`./cache/${cacheDirectory}`)
    // Create archives in cache
    for await (const volume of volumes) {
        await create({
            file: `./cache/${cacheDirectory}/${volume.driver}_${volume.name}.tar.gz`,
            gzip: true
        },
        [volume.mountpoint])
    }
    // Create the final directory
    writeFileSync(`./cache/${cacheDirectory}/info.json`, JSON.stringify({
        timestamp: new Date().getTime(),
        volumes
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
    console.log("Backup ", backupPath, "crated.")
}

console.log("Creating a backup...")
doBackup()

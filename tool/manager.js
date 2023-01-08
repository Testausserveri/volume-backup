require("dotenv").config()
const { WebhookClient } = require("discord.js")
const { existsSync, writeFileSync, readFileSync } = require("fs")
const backup = require("../src/index")

const Package = require("../package.json")

console.log(`Package: ${Package.name}@${Package.version}`)
console.log(`Runtime: ${process.version}`)
console.log(`CWD: ${process.cwd()}`)

require("../src/console")

const webhookClient = new WebhookClient({ url: process.env.DISCORD_WEBHOOK })

webhookClient.send(`Volume-backup service version \`${Package.name}@${Package.version}\` started!`)

const timeToBackup = "00:05:00"

let tryAgain = false
let tries = 0
let tryAgainTime = null
let didBackup = false

// Last backup time reading
if (!existsSync("./.lastBackup")) {
    // We need to backup now
    console.warn("Backup timestamp file does not exist. Taking a backup now.")
    tryAgain = true
    writeFileSync("./.lastBackup", new Date().getTime().toString())
} else {
    const backupDate = new Date(parseInt(readFileSync("./.lastBackup").toString(), 10))
    if (backupDate.toDateString() !== new Date().toDateString()) {
        console.warn("Backup timestamp file indicates there has been more than one day since the last backup. Taking a backup now.")
        tryAgain = true
    }
}

function getTimeString() {
    const currentDate = new Date()
    return `${currentDate.getHours().toString().padStart(2, "0")}:${currentDate.getMinutes().toString().padStart(2, "0")}:${currentDate.getSeconds().toString().padStart(2, "0")}`
}

// Run backup task ever night
setInterval(async () => {
    // Check every if it's the time to backup
    const currentTime = getTimeString()
    const currentUnix = new Date().getTime()

    // Have we failed to take a backup and an hour has passed
    if (tryAgainTime !== null && tryAgainTime < new Date().getTime() && didBackup === false) {
        await webhookClient.send("An hour has passed. Trying to take a backup again.")
        tryAgainTime = null
        tryAgain = true
        tries = 0
    }

    // Do we take a backup?
    if ((currentTime === timeToBackup || tryAgain) && tryAgainTime === null && didBackup === false) {
        tryAgain = false
        console.log("Creating backup...")
        if (tries >= 5) {
            await webhookClient.send(`Failed to create backup ${tries} times. Trying again in 1 hour.`)
            tryAgainTime = new Date().getTime() + 60 * 60 * 1000
            return
        }
        try {
            await backup()
            didBackup = true
            tries = 0
            tryAgain = false
            await webhookClient.send(`Volume backup created (took \`${((new Date().getTime() - currentUnix) / 1000).toPrecision(2)} min\`)`)
            console.log("Backup created.")
        } catch (e) {
            console.log("Backup failed", e)
            tries += 1
            tryAgain = true
            await webhookClient.send(`Backup creation failed (\`${tries}\`, \`${e?.name ?? "Unknown"}\`).`)
        }
    }

    // Reset didBackup
    if (didBackup && currentTime !== timeToBackup) didBackup = false
}, 1000)
console.log(`Backups configured for ${timeToBackup}`)

require("dotenv").config()
const { WebhookClient } = require("discord.js")
const backup = require("../src/index")

const webhookClient = new WebhookClient({ url: process.env.DISCORD_WEBHOOK })

const Package = require("../package.json")

console.log(`Package: ${Package.name}@${Package.version}`)
console.log(`Runtime: ${process.version}`)

// https://discord.com/api/webhooks/933691691775451136/sU4zIQTPSuR_AImUAhMVUVG96vJLGOs_A2oPYrta3opnaIcrv9jszrpZlHWucmigCNI5

require("../src/console")

const timeToBackup = "14:13:50"

let tryAgain = false
let tries = 0

// Run backup task ever night
setInterval(async () => {
    // Check every if it's the time to backup
    console.debug("Tick")
    const currentDate = new Date()
    const currentTime = `${currentDate.getHours().toString().padStart(2, "0")}:${currentDate.getMinutes().toString().padStart(2, "0")}:${currentDate.getSeconds().toString().padStart(2, "0")}`
    if (currentTime === timeToBackup || tryAgain) {
        console.log("Creating backup...")
        if (tries >= 5) {
            await webhookClient.send(`Failed to create backup ${tries} times. Exiting...`)
            process.exit()
        }
        try {
            await backup()
            tries = 0
            tryAgain = false
            await webhookClient.send(`Volume backup created (\`${currentTime}\`).`)
        } catch (e) {
            console.log(e)
            if (tryAgain) tries += 1
            tryAgain = true
            await webhookClient.send(`Backup creation failed (\`${tries}\`).`)
        }
    }
}, 1000)
console.log(`Backups configured for ${timeToBackup}`)

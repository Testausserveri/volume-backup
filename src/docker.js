const { execSync, spawnSync } = require("child_process")

/**
 * @typedef {{ type: string, mountpoint: string}} DockerMount
 */
/**
 * @typedef {{ id: string, name: string, image: string, created: string, status: string, ports: string|null }} DockerContainer Docker container object
 */
/**
 * @typedef {{ name: string, driver: string, mountpoint: string, containers: Array<DockerContainer>}} DockerVolume Docker volume object
 */

/**
 * Execute command with unsafe input, urlEncode args to maintain spaces
 * @param {string} command
 * @returns {Array<T | null>}
 */
function execSyncUnsafe(command) {
    const executableName = command.split(" ")[0]
    // TODO: This could be done better. Argument parsing breaks when we have spaces in fields
    const args = command.replace(`${executableName} `, "").split(" ").map((arg) => decodeURIComponent(arg))
    const executable = execSync(`whereis ${executableName}`).toString().split(" ")[1]
    const proc = spawnSync(executable, args)
    if (proc.error) throw proc.error
    return spawnSync(executable, args).output
}

/**
 * Get data field positions
 * @param {string} fields
 * @param {string} line
 * @returns {{}}
 */
function getFieldPositions(fields, line) {
    const keyTable = {
        CONTAINER_ID: "id",
        IMAGE: "image",
        COMMAND: "command",
        CREATED: "created",
        STATUS: "status",
        PORTS: "ports",
        NAMES: "name"
    }
    const positions = []
    positions.push(fields.split("").reduce((prev, cur, index, ar) => {
        if (cur !== " ") return typeof prev === "string" ? `${prev}${cur}` : (() => { positions.push(prev); return cur })()
        if (ar[index + 1] !== " " && typeof prev !== "number") return typeof prev === "string" ? `${prev}${cur}` : () => { positions.push(prev); return cur }
        if (typeof prev !== "number") return (() => { positions.push(prev); return 1 })()
        return prev + 1
    }))
    const data = line.split("")
    const values = positions
        .map((position, index, ar) => (typeof position === "string" ? data.splice(0, ar[index + 1] !== undefined ? ar[index + 1] + position.length : Infinity).join("").trim() : null))
        .filter((val) => val !== null)
    const keys = positions
        .filter((position) => typeof position === "string")
        .map((key) => keyTable[key.replace(/ /g, "_")])
    return Object.fromEntries(new Array(keys.length).fill(0).map((_, index) => [keys[index], values[index]]))
}

/**
 * List all Docker containers
 * @returns {Array<DockerContainer>}
 */
function getContainers() {
    return execSync("docker container list")
        .toString()
        .trim()
        .split("\n")
        .map((line, index, ar) => (index !== 0 ? getFieldPositions(ar[0], line) : line))
        .splice(1)
}

/**
 * Get the mounts of a Docker container
 * @returns {Array<DockerMount>}
 */
function getMount(id) {
    return JSON.parse(
        execSyncUnsafe(`docker inspect --format='{{json%20.Mounts}}' ${id}`)[1]
            .toString()
            .trim()
            .replace(/'/g, "") ?? "[]"
    ).map((mount) => ({
        type: mount.Type,
        mountpoint: mount.Source
    }))
}

module.exports = {
    getMount,
    getContainers
}

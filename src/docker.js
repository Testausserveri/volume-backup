const { execSync, spawnSync } = require("child_process")

/**
 * @typedef {{ type: string, mountpoint: string}} DockerMount
 */
/**
 * @typedef {{ id: string, name: string, image: string, created: string, status: string, ports: string|null, mounts: Array<DockerMount>|null }} DockerContainer Docker container object
 */
/**
 * @typedef {{ name: string, driver: string, mountpoint: string, containers: Array<DockerContainer>}} DockerVolume Docker volume object
 */

/**
 * Execute command with unsafe input
 * @param {string} command
 * @returns {Array<T | null>}
 */
function execSyncUnsafe(command) {
    const executableName = command.split(" ")[0]
    // TODO: This could be done better. Argument parsing breaks when we have spaces in fields
    const args = command.replace(`${executableName} `, "").split(" ")
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
        .map((key) => key.replace(/ /g, "_"))
    return Object.fromEntries(new Array(keys.length).fill(0).map((entry, index) => [keys[index], values[index]]))
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
 * Get all Docker mounts
 * @returns {Array<DockerMount>}
 */
function getMounts() {
    return getContainers()
        .map((container) => ({
            name: container.name,
            id: container.id,
            mounts:
                JSON.parse(
                    execSyncUnsafe(`docker inspect --format='{{json .Mounts}}' ${container.id}`)[1]
                        .toString()
                        .trim() ?? []
                ).map((mount) => ({
                    type: mount.Type,
                    mountpoint: mount.Source
                }))
        }))
}

module.exports = {
    getMounts,
    getContainers,
    getFieldPositions
}

const { execSync, spawnSync } = require("child_process")

/**
 * @typedef {{ id: string, name: string, image: string, created: string, status: string}} DockerContainer Docker container object
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
 * Get the containers that are using a specific volume
 * @param {string} volume
 * @returns {Array<>}
 */
function getVolumeContainers(volume) {
    return execSyncUnsafe(`docker ps -a --filter volume=${volume}`)[1]
        .toString()
        .trim()
        .split("\n")
        .splice(1)
        .map((line) => line.split("   "))
        .map((line) => ({
            id: line[0],
            name: line.slice(0).reverse()[0].trim(),
            image: line[1],
            created: line[3],
            status: line[4]
        }))
}

/**
 * Get a volume's mountpoint
 * @param {string} volume
 * @returns {string}
 */
function getVolumeMountPoint(volume) {
    return JSON.parse(
        execSyncUnsafe(`docker volume inspect ${volume}`)[1]
    )[0].Mountpoint
}

/**
 * Get all Docker volumes
 * @returns {Array<DockerVolume>}
 */
function getVolumes() {
    return execSync("docker volume ls --filter dangling=false")
        .toString()
        .trim()
        .split("\n")
        .splice(1)
        .map((line) => line.split("     "))
        .map((line) => ({
            name: line[1],
            driver: line[0],
            mountpoint: getVolumeMountPoint(line[1]),
            containers: getVolumeContainers(line[1])
        }))
}

module.exports = {
    getVolumes,
    getVolumeContainers,
    getVolumeMountPoint
}

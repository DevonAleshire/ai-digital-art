import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { once } from "events";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FILE_KEYS = {
  SYSTEM_ROLE: "systemRole",
  USER_ROLE: "userRole",
  PROMPTS: "prompts",
  DAILY_ART: "dailyArt",
  ARCHIVE: "archive",
};

const FILE_PATHS = {
  [FILE_KEYS.SYSTEM_ROLE]: path.resolve(__dirname, "../prompts/role_system.txt"),
  [FILE_KEYS.USER_ROLE]: path.resolve(__dirname, "../prompts/role_user.txt"),
  [FILE_KEYS.PROMPTS]: path.resolve(__dirname, "../prompts/prompts.txt"),
  [FILE_KEYS.DAILY_ART]: path.resolve(__dirname, "../daily_art.png"),
  [FILE_KEYS.ARCHIVE]: path.resolve(__dirname, "../archive"),
};

// Lazy-load content on demand instead of at import time
let sysRoleContent = null;
let userRoleContent = null;
let userGenPrompts = null;

function _initializeContent() {
  if (!sysRoleContent) {
    sysRoleContent = readFileToArray(FILE_PATHS[FILE_KEYS.SYSTEM_ROLE]);
    userRoleContent = readFileToArray(FILE_PATHS[FILE_KEYS.USER_ROLE]);
    userGenPrompts = readFileToArray(FILE_PATHS[FILE_KEYS.PROMPTS]);
  }
}

/**
 * Reads the content of a file and converts it into an array of non-empty lines.
 * @param {string} filePath - The path to the file to read.
 * @returns {string[]} An array of non-empty lines from the file.
 */
function readFileToArray(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at path: ${filePath}`);
    return [];
  }

  try {
    const data = fs.readFileSync(filePath, "utf8");
    return data
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch (error) {
    console.error(`Error reading file at ${filePath}:`, error);
    return [];
  }
}

/**
 * Ensures that a directory exists. If it doesn't, create it.
 * @param {string} dirPath - The path of the directory to check or create.
 */
function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

/**
 * Saves a streamed image to a file and waits for completion.
 * @param {WritableStream} writer - The writable stream to save the image.
 * @param {string} filePath - The path where the image should be saved.
 * @returns {Promise<string>} Resolves to the file path when complete.
 * @throws {Error} If saving fails.
 */
async function saveImageToFile(writer, filePath) {
  try {
    await once(writer, "finish");
    console.log(`Image successfully saved to ${filePath}`);
    return filePath;
  } catch (error) {
    console.error("Error saving the image:", error);
    throw error;
  }
}

/**
 * Pipes data to multiple writable streams and saves the files.
 * @param {Stream} dataStream - The readable stream to pipe from (e.g., Axios response data).
 * @param {Array<{ filePath: string }>} destinations - Array of destination file paths.
 * @returns {Promise<void>} Resolves when all writes are complete.
 */
async function saveToMultipleDestinations(dataStream, destinations) {
  const writePromises = destinations.map(({ filePath }) => {
    const writer = fs.createWriteStream(filePath);
    dataStream.pipe(writer);
    return saveImageToFile(writer, filePath);
  });

  await Promise.all(writePromises);
}

/**
 * Generates the file path for the next image in a directory based on the date.
 * @param {string} dirPath - The directory where images are stored.
 * @param {string} dateStr - The date string in YYYYMMDD format.
 * @returns {{ imgFileName: string, imgFilePath: string }} File name and full path.
 */
function getNextImageFilePath(dirPath, dateStr) {
  const existingFiles = fs
    .readdirSync(dirPath)
    .filter((file) => file.startsWith(dateStr));
  const nextImageNumber = existingFiles.length + 1;
  const imgFileName = `${dateStr}_image_${nextImageNumber}.png`;
  return { imgFileName, imgFilePath: path.join(dirPath, imgFileName) };
}

/**
 * Creates or retrieves today's directory for storing images.
 * @returns {{ dirPath: string, dateStr: string }} Directory path and date string (YYYYMMDD).
 */
function getTodayDirectory() {
  const baseDirPath = path.resolve(FILE_PATHS[FILE_KEYS.ARCHIVE]);
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
  const dirName = `${dateStr}_digital-art`;
  const dirPath = path.join(baseDirPath, dirName);

  ensureDirExists(dirPath);
  return { dirPath, dateStr };
}

/**
 * Writes execution time to a log file.
 * @param {number} startTime - Start time from performance.now().
 * @param {number} endTime - End time from performance.now().
 */
function writeToExecutionLog(startTime, endTime) {
  const executionTime = `Execution Time: ${(endTime - startTime).toFixed(2)}ms\n`;
  fs.appendFileSync("execution_time.log", executionTime, "utf8");
}

/**
 * Get a random value from an array.
 * @param {any[]} array - The array to pick from.
 * @returns {any|null} A random element or null if array is empty.
 */
function getRandomValue(array) {
  if (!Array.isArray(array) || array.length === 0) {
    console.warn("Warning: Attempted to get a random value from an empty array.");
    return null;
  }
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

/**
 * Get a random user-generated prompt.
 * @returns {string|null} A random prompt or null if none available.
 */
function getRandomUserGeneratedPrompt() {
  _initializeContent();
  const randomPrompt = getRandomValue(userGenPrompts);
  return randomPrompt;
}

/**
 * Get a random system role content.
 * @returns {string|null} A random system content or null.
 */
function getRandomSystemContent() {
  _initializeContent();
  return getRandomValue(sysRoleContent);
}

/**
 * Get a random user role content.
 * @returns {string|null} A random user content or null.
 */
function getRandomUserContent() {
  _initializeContent();
  return getRandomValue(userRoleContent);
}

export default {
  readFileToArray,
  ensureDirExists,
  saveImageToFile,
  saveToMultipleDestinations,
  getNextImageFilePath,
  getTodayDirectory,
  writeToExecutionLog,
  getRandomValue,
  getRandomUserGeneratedPrompt,
  getRandomSystemContent,
  getRandomUserContent,
};

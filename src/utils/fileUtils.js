import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { once } from "events";

// Derive __filename and __dirname for module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FILE_KEYS = {
  SYSTEM_ROLE: "systemRole",
  USER_ROLE: "userRole",
  PROMPTS: "prompts",
  DAILY_ART: "dailyArt",
  ARCHIVE: "archive",
};

const FILE_PATHS = {
  [FILE_KEYS.SYSTEM_ROLE]: path.resolve("src/prompts/role_system.txt"),
  [FILE_KEYS.USER_ROLE]: path.resolve("src/prompts/role_user.txt"),
  [FILE_KEYS.PROMPTS]: path.resolve("src/prompts/prompts.txt"),
  [FILE_KEYS.DAILY_ART]: path.resolve("src/daily_art.png"),
  [FILE_KEYS.ARCHIVE]: path.resolve("src/archive"),
};

const sysRoleContent = readFileToArray(FILE_PATHS.systemRole);
const userRoleContent = readFileToArray(FILE_PATHS.userRole);
const userGenPrompts = readFileToArray(FILE_PATHS.prompts);

/**
 * Reads the content of a file and converts it into an array of non-empty lines.
 *
 * @param {string} filePath - The path to the file to read.
 * @returns {string[]} An array of non-empty lines from the file.
 */
function readFileToArray(relativePath) {
  const filePath = path.resolve(__dirname, relativePath);

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at path: ${filePath}`);
    return [];
  }

  try {
    const data = fs.readFileSync(filePath, "utf8");
    return data
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0); // Exclude empty lines
  } catch (error) {
    console.error(`Error reading file at ${filePath}:`, error);
    return [];
  }
}

/**
 * Ensures that a directory exists. If it doesn't, the directory is created.
 *
 * @param {string} dirPath - The path of the directory to check or create.
 */
function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

/**
 * Saves a streamed image to a file and waits for the operation to finish.
 *
 * @param {WritableStream} writer - The writable stream to save the image.
 * @param {string} filePath - The path where the image should be saved.
 * @returns {Promise<string>} A promise that resolves to the file path when the save is complete.
 * @throws Will throw an error if saving fails.
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
 *
 * @param {Stream} dataStream - The readable stream to pipe from (e.g., Axios response data).
 * @param {Array<{ filePath: string }>} destinations - Array of destination file paths.
 * @returns {Promise<void>} A promise that resolves when all writes are complete.
 */
async function saveToMultipleDestinations(dataStream, destinations) {
  const writePromises = destinations.map(({ filePath }) => {
    const writer = fs.createWriteStream(filePath);
    dataStream.pipe(writer);
    return saveImageToFile(writer, filePath);
  });

  // Wait for all writes to complete
  await Promise.all(writePromises);
}

/**
 * Generates the file path for the next image in a directory based on the date.
 *
 * @param {string} dirPath - The directory where images are stored.
 * @param {string} dateStr - The date string in YYYYMMDD format.
 * @returns {string} The file path for the next image.
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
 * Creates or retrieves today's directory for storing images, based on the current date.
 *
 * @param {string} [baseDir=path.resolve("src/archive")] - The base directory where today's directory will be created.
 * @returns {{ dirPath: string, dateStr: string }} An object containing the directory path and the date string.
 */
function getTodayDirectory() {
  const baseDirPath = path.resolve(FILE_PATHS.archive);
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0].replace(/-/g, ""); // YYYYMMDD
  const dirName = `${dateStr}_digital-art`;
  const dirPath = path.join(baseDirPath, dirName);

  ensureDirExists(dirPath);

  return { dirPath, dateStr };
}

function writeToExecutionLog(startTime, endTime) {
  const executionTime = `Execution Time: ${(endTime - startTime).toFixed(
    2
  )}ms\n`;

  // Log to file
  fs.appendFileSync(`execution_time.log`, executionTime, "utf8");
}

function getRandomUserGeneratedPrompt() {
  const randomPrompt = getRandomValue(userGenPrompts);
  console.log(`Random Prompt: ${randomPrompt}\n`);

  return randomPrompt;
}

function getRandomSystemContent() {
  return getRandomValue(sysRoleContent);
}
function getRandomUserContent() {
  return getRandomValue(userRoleContent);
}
// Get a random value from an array
function getRandomValue(array) {
  if (!Array.isArray(array) || array.length === 0) {
    console.warn(
      "Warning: Attempted to get a random value from an empty array."
    );
    return null;
  }
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

export default {
  readFileToArray,
  ensureDirExists,
  saveImageToFile,
  saveToMultipleDestinations,
  getNextImageFilePath,
  getTodayDirectory,
  getRandomUserGeneratedPrompt,
  getRandomSystemContent,
  getRandomUserContent,
};

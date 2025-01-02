import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { once } from "events";

// Derive __filename and __dirname for module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
function getTodayDirectory(baseDir = path.resolve("src/archive")) {
  const baseDirPath = path.resolve(baseDir);
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0].replace(/-/g, ""); // YYYYMMDD
  const dirName = `${dateStr}_digital-art`;
  const dirPath = path.join(baseDirPath, dirName);

  ensureDirExists(dirPath);

  return { dirPath, dateStr };
}

export default {
  readFileToArray,
  ensureDirExists,
  saveImageToFile,
  saveToMultipleDestinations,
  getNextImageFilePath,
  getTodayDirectory,
};

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
  getRandomValue,
};

# AI Digital Art: Generate Stunning Digital Art with OpenAI and Raspberry Pi Display

## Overview

The **AI Digital Art** repository is a Node.js-based application that leverages the **OpenAI API** to create visually stunning digital artwork using the DALL-E 3 model. The generated art is saved locally and can be displayed on a **Raspberry Pi** using the `displayImage.sh` script, making it ideal for creating dynamic digital art displays.

### Key Features
- **Randomized Prompts**: Combines static prompts from files with dynamically generated prompts for variety and creativity.
- **Image Generation**: Produces high-quality images using DALL-E 3, ensuring natural and distortion-free depictions of people and animals.
- **Raspberry Pi Display**: Displays the generated image in fullscreen mode on a monitor connected to a Raspberry Pi.
- **Customizable Inputs**: Users can define system roles, user roles, and prompts via text files.

---

## Prerequisites

### Required Software
- **Node.js**: Install the latest version from [Node.js Downloads](https://nodejs.org/).
- **npm**: Included with Node.js.
- **feh**: A lightweight image viewer for Linux (used for displaying images on Raspberry Pi).
  - Install on your Raspberry Pi:
    ```bash
    sudo apt-get install feh
    ```

---

## Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/ai-digital-art.git
   cd ai-digital-art
   ```

2. **Install Dependencies**:
   Run the following command to install Node.js dependencies:
   ```bash
   npm install
   ```

3. **Set Up Environment Variables**:
   Create a `.env` file in the root directory and add your OpenAI API key:
   ```plaintext
   API_KEY=your_openai_api_key_here
   ```

4. **Ensure Input Files Are Populated**:
   - The following files must be in the root directory and populated with content:
     - `role_system.txt`: Contains possible system role descriptions, one per line.
     - `role_user.txt`: Contains possible user prompts, one per line.
     - `prompts.txt`: Contains static prompts, one per line.
   - Example `prompts.txt`:
     ```plaintext
     A serene mountain landscape during sunset
     A futuristic city skyline at night
     Abstract art inspired by famous abstract artists
     ```

---

## Usage

### Generate and Save an Image
To generate an image and save it as `daily_art.png`, run:
```bash
node updateImage.js
```

### Display the Image on a Raspberry Pi
1. Ensure the `daily_art.png` file is generated in the repository root.
2. Use the `displayImage.sh` script to display the image:
   ```bash
   ./displayImage.sh
   ```
   This script uses the `feh` image viewer to display the image in fullscreen mode.

---

## Folder Structure

Here’s the structure of the repository:

```
ai-digital-art/
├── node_modules/       # Installed dependencies
├── .env                # Environment variables (API key)
├── .gitignore          # Git ignore file for excluding unnecessary files
├── displayImage.sh     # Bash script to display images on Raspberry Pi
├── LICENSE             # Project license (MIT License)
├── package.json        # Node.js project metadata
├── package-lock.json   # Dependency lock file
├── prompts.txt         # Predefined prompts for image generation
├── README.md           # Documentation for the project
├── role_system.txt     # System role descriptions for prompt generation
├── role_user.txt       # User role descriptions for prompt generation
├── updateImage.js      # Main script for generating and saving images
└── daily_art.png       # Generated digital artwork
```

### Key Files
- **`updateImage.js`**: Main Node.js script for generating images.
- **`displayImage.sh`**: Bash script to display the generated image on a Raspberry Pi.
- **`daily_art.png`**: The most recently generated image.

---

## Raspberry Pi Configuration

### Setting Up Automatic Display
To display the image automatically on a Raspberry Pi:
1. **Make the Script Executable**:
   ```bash
   chmod +x displayImage.sh
   ```

2. **Add to Cron Job**:
   To display the image every time the Raspberry Pi starts:
   ```bash
   crontab -e
   ```
   Add the following line:
   ```bash
   @reboot /path/to/ai-digital-art/displayImage.sh
   ```

### Customize the Display
You can modify the `displayImage.sh` script to adjust display behavior:
- `--fullscreen`: Displays the image in fullscreen mode.
- `--auto-zoom`: Automatically resizes the image to fit the screen.
- `--hide-pointer`: Hides the mouse pointer during the display.

---

## Example Output

### Console Logs
```plaintext
System Content: You are an assistant generating highly creative art prompts.
User Content: Generate a whimsical and imaginative prompt.
Random Prompt: A tranquil forest with glowing blue trees.

Using Random Prompt: A tranquil forest with glowing blue trees
Image URL: https://example.com/path-to-image
Image successfully saved to ./daily_art.png
```

### Display on Raspberry Pi
The image is displayed fullscreen on the connected monitor using `displayImage.sh`.

---

## Troubleshooting

### Common Errors
1. **Missing API Key**:
   - Error: `Error: API key is missing.`
   - Solution: Ensure `.env` contains a valid `API_KEY`.

2. **File Not Found**:
   - Error: `Error: File not found at path: ./role_system.txt`
   - Solution: Verify that all required text files exist and are populated.

3. **`feh` Not Installed**:
   - Error: `command not found: feh`
   - Solution: Install `feh` on your Raspberry Pi:
     ```bash
     sudo apt-get install feh
     ```

4. **Permission Denied**:
   - Error: `Permission denied ./displayImage.sh`
   - Solution: Make the script executable:
     ```bash
     chmod +x displayImage.sh
     ```

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Acknowledgments

- **OpenAI**: For providing the API and DALL-E 3 model used in this project.
- **Raspberry Pi**: For enabling a creative and accessible hardware display solution.

---

Feel free to adapt the repository to your needs and share your generated artwork! Let me know if you have further questions or need additional support.
# AI Digital Art: Generate Stunning Digital Art with OpenAI and Raspberry Pi Display

## Overview

The **AI Digital Art** repository is a Node.js-based application that leverages the **OpenAI API** to create visually stunning digital artwork using the DALL-E 3 model. The generated art is saved locally and can be displayed on a **Raspberry Pi** using the `displayImage.sh` script, making it ideal for creating dynamic digital art displays.

### Key Features
- **Randomized Prompts**: Combines static prompts from files with dynamically generated prompts for variety and creativity.
- **Image Generation**: Produces high-quality images using DALL-E 3, ensuring natural and distortion-free depictions of people and animals.
- **Raspberry Pi Display**: Displays the generated image in fullscreen mode on a monitor connected to a Raspberry Pi.
- **Customizable Inputs**: Users can define system roles, user roles, and prompts via text files in `src/prompts/`.
- **SMS Override**: Send a text message to your Twilio number to immediately trigger a new image using your message as the prompt.

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
   Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```
   ```plaintext
   OPENAI_API_KEY=your_openai_api_key_here

   # Twilio (from twilio.com/console)
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_twilio_auth_token

   # Public URL for the SMS webhook (see SMS Override section below)
   WEBHOOK_BASE_URL=https://your-tunnel-url-here

   PORT=3000
   ```

4. **Ensure Input Files Are Populated**:
   - The following files in `src/prompts/` must be populated with content:
     - `src/prompts/role_system.txt`: System role descriptions, one per line.
     - `src/prompts/role_user.txt`: User prompt instructions, one per line.
     - `src/prompts/prompts.txt`: Static pre-written prompts, one per line.
   - Example `prompts.txt`:
     ```plaintext
     A serene mountain landscape during sunset
     A futuristic city skyline at night
     Abstract art inspired by famous abstract artists
     ```

---

## Usage

### Start the Application
To start the scheduler and SMS webhook server, run:
```bash
npm start
```
The app will begin generating images on its cron schedule and listen for incoming SMS overrides.

### Display the Image on a Raspberry Pi
1. Ensure the `daily_art.png` file is generated in the repository root.
2. Use the `displayImage.sh` script to display the image:
   ```bash
   ./displayImage.sh
   ```
   This script uses the `feh` image viewer to display the image in fullscreen mode.

### SMS Override
Send a text message to your Twilio number and the app will immediately generate a new image using your message as the prompt, bypassing the scheduled cron.

See the **SMS Override Setup** section below for full configuration steps.

---

## Folder Structure

Here’s the structure of the repository:

```
ai-digital-art/
├── node_modules/           # Installed dependencies
├── src/
│   ├── main.js             # Entry point: starts scheduler and SMS webhook server
│   ├── api/
│   │   └── openai.js       # OpenAI client initialisation
│   ├── archive/            # Past generated images, organised by date
│   ├── prompts/
│   │   ├── prompts.txt     # Predefined static prompts
│   │   ├── role_system.txt # System role descriptions for prompt generation
│   │   └── role_user.txt   # User role descriptions for prompt generation
│   ├── services/
│   │   ├── imageService.js # Image generation logic (DALL-E 3)
│   │   └── promptService.js# AI prompt generation (GPT-4o)
│   └── utils/
│       ├── fileUtils.js    # File I/O helpers
│       ├── generalUtils.js # General utilities
│       └── scheduler.js    # node-cron scheduled job
├── .env                    # Environment variables (not committed)
├── .env.example            # Environment variable template
├── .gitignore
├── displayImage.sh         # Bash script to display image on Raspberry Pi
├── LICENSE
├── package.json
└── daily_art.png           # Most recently generated image
```

### Key Files
- **`src/main.js`**: Entry point — starts the cron scheduler and Express SMS webhook server.
- **`src/services/imageService.js`**: Handles DALL-E 3 image generation; accepts an optional SMS override prompt.
- **`displayImage.sh`**: Bash script to display the generated image on a Raspberry Pi.
- **`daily_art.png`**: The most recently generated image.

---

## SMS Override Setup

The app exposes a `POST /sms` webhook that Twilio calls when you send a text to your Twilio number. The message body is used directly as the image prompt.

### 1. Create a Twilio Account
1. Sign up at [twilio.com](https://www.twilio.com) and buy a phone number (~$1/mo).
2. Copy your **Account SID** and **Auth Token** from the Twilio Console into `.env`.

### 2. Expose Your Server

**Mac (testing) — ngrok:**
```bash
brew install ngrok
ngrok http 3000
```
Copy the HTTPS URL ngrok gives you (e.g. `https://abc123.ngrok-free.app`) and set it in `.env`:
```plaintext
WEBHOOK_BASE_URL=https://abc123.ngrok-free.app
```
Restart `npm start` after updating `.env`. Note: the ngrok URL changes every restart on the free tier.

**Raspberry Pi (production) — Cloudflare Tunnel:**
```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o cloudflared
chmod +x cloudflared && sudo mv cloudflared /usr/local/bin

# Authenticate and create a named tunnel
cloudflared tunnel login
cloudflared tunnel create ai-digital-art
cloudflared tunnel route dns ai-digital-art your-subdomain.your-domain.com
```
Cloudflare Tunnel gives you a **stable URL that never changes**, so you only need to configure Twilio once. Run it as a `systemd` service so it starts on boot.

### 3. Configure Twilio Webhook
1. In the Twilio Console, go to your phone number's settings.
2. Under **Messaging → A Message Comes In**, set the webhook URL to:
   ```
   https://your-tunnel-url/sms
   ```
3. Set the method to **HTTP POST**.

### 4. Test It
Text your Twilio number any prompt (e.g. *"a cyberpunk fox in neon rain"*) and a new image will generate immediately.

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
   - Error: `Error: OPENAI_API_KEY environment variable is not set`
   - Solution: Ensure `.env` contains a valid `OPENAI_API_KEY`.

2. **Invalid Twilio Signature**:
   - Error: `⚠️  Rejected request with invalid Twilio signature`
   - Solution: Verify `TWILIO_AUTH_TOKEN` in `.env` matches the Twilio Console, and that `WEBHOOK_BASE_URL` exactly matches the URL configured in Twilio (no trailing slash).

3. **File Not Found**:
   - Error: `Error: File not found at path: ./role_system.txt`
   - Solution: Verify that all required text files exist and are populated.

4. **`feh` Not Installed**:
   - Error: `command not found: feh`
   - Solution: Install `feh` on your Raspberry Pi:
     ```bash
     sudo apt-get install feh
     ```

5. **Permission Denied**:
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
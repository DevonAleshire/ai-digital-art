# AI Digital Art: Generate Stunning Digital Art with OpenAI and Raspberry Pi Display

## Overview

The **AI Digital Art** repository is a Node.js-based application that leverages the **OpenAI API** to create visually stunning digital artwork using the DALL-E 3 model. The generated art is saved locally and can be displayed on a **Raspberry Pi** using the `displayImage.sh` script, making it ideal for creating dynamic digital art displays.

### Key Features
- **AI Prompt Generation**: Uses GPT-4o with weighted art categories (75% fine art/photography, 20% surreal/creative, 5% whimsical) to generate gallery-quality prompts.
- **Queue Override**: Add prompts to `src/prompts/prompts.txt` to queue them for use instead of AI-generated ones.
- **Image Generation**: Produces high-quality 1792×1024 images using DALL-E 3, ensuring natural and distortion-free depictions of people and animals.
- **Raspberry Pi Display**: Displays the generated image in fullscreen mode on a monitor connected to a Raspberry Pi.
- **SMS Override**: Send a text message to your Twilio number to immediately trigger a new image using your message as the prompt, bypassing the cron schedule.
- **Supabase Storage**: Generated images and metadata are automatically uploaded to Supabase for the companion web gallery.

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
   NODE_ENV=production

   # OpenAI
   OPENAI_API_KEY=your_openai_api_key_here

   # Twilio (from console.twilio.com)
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_twilio_auth_token

   # Public URL for SMS webhook — Cloudflare Tunnel URL (no trailing slash)
   WEBHOOK_BASE_URL=https://your-subdomain.your-domain.com

   PORT=3000

   # Supabase (service role key — server-side only)
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # Cron schedule (node-cron syntax)
   # 3x/day at 8am, 12pm, 6pm:  0 8,12,18 * * *
   # 1x/day at 9am:              0 9 * * *
   CRON_SCHEDULE=0 8,12,18 * * *
   ```

4. **(Optional) Pre-queue prompts**:
   Add prompts to `src/prompts/prompts.txt`, one per line. When the file has content, there is a 50% chance a queued prompt is used instead of an AI-generated one. Queued prompts are consumed in order and removed after use.

---

## Usage

### Start the Application
To start the scheduler and SMS webhook server, run:
```bash
npm start
```
The app will begin generating images on its cron schedule and listen for incoming SMS overrides.

### Run with PM2 (Recommended for Production)
PM2 keeps the app running in the background and restarts it automatically on crashes or reboots:
```bash
sudo npm install -g pm2
pm2 start npm --name "digital-art" -- start
pm2 save
pm2 startup   # follow the printed command to register with systemd
```

Common PM2 commands:
```bash
pm2 logs digital-art       # view live logs
pm2 restart digital-art    # restart the app
pm2 stop digital-art       # stop (use before running npm start manually)
pm2 status                 # check running processes
```

### Display the Image on a Raspberry Pi
1. The generated image is saved to `src/daily_art.png`.
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
│   ├── daily_art.png       # Most recently generated image (auto-created)
│   ├── api/
│   │   └── openai.js       # OpenAI client initialisation
│   ├── archive/            # Past generated images, organised by date
│   ├── prompts/
│   │   └── prompts.txt     # Optional queue of pre-written prompts (one per line)
│   ├── services/
│   │   ├── imageService.js # Image generation logic (DALL-E 3) + Supabase upload
│   │   └── promptService.js# AI prompt generation (GPT-4o) with weighted categories
│   └── utils/
│       ├── fileUtils.js    # File I/O helpers
│       ├── generalUtils.js # General utilities
│       └── scheduler.js    # node-cron scheduled job
├── .env                    # Environment variables (not committed)
├── .env.example            # Environment variable template
├── .gitignore
├── displayImage.sh         # Bash script to display image on Raspberry Pi (uses absolute path)
├── LICENSE
└── package.json
```

### Key Files
- **`src/main.js`**: Entry point — starts the cron scheduler and Express SMS webhook server.
- **`src/services/imageService.js`**: Handles DALL-E 3 image generation and Supabase upload; accepts an optional SMS override prompt.
- **`src/services/promptService.js`**: Generates prompts via GPT-4o using weighted art categories. Optionally dequeues from `prompts.txt`.
- **`displayImage.sh`**: Bash script to display `src/daily_art.png` on a Raspberry Pi using an absolute path.
- **`src/daily_art.png`**: The most recently generated image.

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

**Raspberry Pi (production) — Cloudflare Tunnel (named, permanent):**

Install `cloudflared` as a system service using the token from the Cloudflare Zero Trust dashboard (Zero Trust → Networks → Tunnels → your tunnel → Configure):
```bash
# Debian/Ubuntu (Raspberry Pi OS)
curl -L https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg > /dev/null
# (follow the full install command shown in the Cloudflare dashboard for Debian)
sudo cloudflared service install <your-token>
```

Then in the Cloudflare dashboard, add a **Public Hostname** route:
- Subdomain + Domain → your permanent public URL (e.g. `https://sms.yourdomain.com`)
- Service: `http://localhost:3000`

Set in `.env`:
```plaintext
WEBHOOK_BASE_URL=https://sms.yourdomain.com
```

Manage the tunnel service on the Pi:
```bash
sudo systemctl status cloudflared
sudo systemctl restart cloudflared
```

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
SMS webhook listening on port 3000
Application running...

⏱️  [4/18/2026, 8:00:00 AM] Starting image fetch...
[promptService] Generating via AI (category: oil painting landscape)
Description: A sweeping coastal cliff at golden hour, rendered in warm impasto oils.
Saved daily_art.png
✅ Completed in 12340.00ms

📱 SMS override received: "a lone lighthouse on a rocky cliff at dusk"
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

5. **Port Already in Use (`EADDRINUSE :3000`)**:
   - A previous instance (often PM2) is still running on port 3000.
   - Solution:
     ```bash
     pm2 stop digital-art      # if using PM2
     sudo fuser -k 3000/tcp    # force-kill whatever is on the port
     npm start
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
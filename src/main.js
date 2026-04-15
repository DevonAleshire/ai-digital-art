import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import twilio from "twilio";
import imageService from "./services/imageService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

await import("./utils/scheduler.js");

// --- SMS webhook server ---
const app = express();
app.use(express.urlencoded({ extended: false }));

const { TWILIO_AUTH_TOKEN, WEBHOOK_BASE_URL, PORT = 3000 } = process.env;

app.post("/sms", (req, res) => {
  // Validate the request actually came from Twilio
  const signature = req.headers["x-twilio-signature"] ?? "";
  const webhookUrl = `${WEBHOOK_BASE_URL}/sms`;
  const isValid = twilio.validateRequest(TWILIO_AUTH_TOKEN, signature, webhookUrl, req.body);

  if (!isValid) {
    console.warn("⚠️  Rejected request with invalid Twilio signature");
    return res.status(403).send("Forbidden");
  }

  const overridePrompt = req.body.Body?.trim();
  if (!overridePrompt) {
    return res.type("text/xml").send("<Response/>");
  }

  console.log(`\n📱 SMS override received: "${overridePrompt}"`);

  // Fire-and-forget — respond to Twilio immediately, generate in background
  imageService.fetchImage(overridePrompt).catch((err) =>
    console.error("Error processing SMS override:", err)
  );

  res.type("text/xml").send("<Response/>");
});

app.listen(PORT, () => {
  console.log(`SMS webhook listening on port ${PORT}`);
});

console.log("Application running...\n");
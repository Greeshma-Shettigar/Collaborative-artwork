// server/styleTransferRoute.js
import express from 'express';
const router = express.Router();
import axios from 'axios';


// Load environment variables (only needed if this file is run directly, but good practice)
// In server.js, dotenv.config() covers the whole app.
// require('dotenv').config(); 

const HUGGING_FACE_API_URL = "https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix";
const HUGGING_FACE_TOKEN = process.env.HUGGING_FACE_API_TOKEN;

if (!HUGGING_FACE_TOKEN) {
    console.warn("HUGGING_FACE_API_TOKEN is not set in .env. Style transfer might fail or be heavily rate-limited.");
}

router.post('/apply-style', async (req, res) => {
    const { imageBase64, prompt } = req.body;

    if (!imageBase64 || !prompt) {
        return res.status(400).json({ error: "Missing imageBase64 or prompt" });
    }

    // The toDataURL from canvas might include a prefix like "data:image/png;base64,"
    // Hugging Face API expects just the base64 string.
    const cleanedImageBase64 = imageBase64.split(',')[1]; 

    try {
        const response = await axios.post(
            HUGGING_FACE_API_URL,
            {
                inputs: {
                    image: cleanedImageBase64,
                    prompt: prompt,
                },
                // Optional parameters for InstructPix2Pix:
                parameters: {
                    num_inference_steps: 50, 
                    guidance_scale: 7.5,
                    image_guidance_scale: 1.5,
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${HUGGING_FACE_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                responseType: 'arraybuffer' // Important for receiving image bytes
            }
        );

        // Send the image bytes directly back to the frontend
        res.setHeader('Content-Type', response.headers['content-type']);
        res.send(response.data);

    } catch (error) {
        console.error("Error calling Hugging Face API:", error.response ? error.response.data.toString() : error.message);
        let errorMessage = "Failed to apply style. An unknown error occurred.";
        if (error.response) {
            try {
                const errorData = JSON.parse(error.response.data.toString('utf8'));
                errorMessage = errorData.error || errorData.detail || errorMessage;
            } catch (e) {
                errorMessage = error.response.data.toString('utf8') || errorMessage;
            }
        }
        res.status(error.response ? error.response.status : 500).json({ error: errorMessage });
    }
});

module.exports = router;
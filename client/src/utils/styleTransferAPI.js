// client/src/utils/styleTransferAPI.js

// Important: Use your deployed Render backend URL for production
// For local development, it might be 'http://localhost:5000'
const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
const STYLE_TRANSFER_ENDPOINT = `https://collaborative-artwork-gf2e.onrender.com/api/style-transfer/apply-style`;

export async function applyStyle(imageBase64, prompt) {
  try {
    const response = await fetch(STYLE_TRANSFER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'image/jpeg, image/png, image/webp' // Expect an image back
      },
      body: JSON.stringify({
        imageBase64: imageBase64,
        prompt: prompt || "turn into anime style", 
      }),
    });

    if (!response.ok) {
      const errorText = await response.text(); 
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.error || "Failed to apply style (backend error)");
      } catch {
        throw new Error(`Failed to apply style: ${errorText || response.statusText}`);
      }
    }

    const result = await response.blob(); 
    return URL.createObjectURL(result); 
  } catch (error) {
    console.error("Error in frontend style application:", error);
    throw error; 
  }
}
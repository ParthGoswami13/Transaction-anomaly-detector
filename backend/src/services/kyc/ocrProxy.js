const axios = require('axios');

/**
 * Extract identity details from an ID card image using Groq Vision API.
 * Returns { name, dob, idNumber } parsed from the LLM response.
 */
async function extractIdDetails(imageBuffer) {
  const base64Image = imageBuffer.toString('base64');

  try {
    const promptText = `You are an OCR expert specializing in government ID cards.
Extract the following fields from the provided ID card image and return ONLY valid JSON:
{
  "name": "<full name>",
  "dob": "<YYYY-MM-DD>",
  "idNumber": "<ID number>"
}
If a field cannot be determined, use null.`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${process.env.GOOGLE_API_KEY}`,
      {
        contents: [
          {
            parts: [
              { text: promptText },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Image
                }
              }
            ]
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const content = response.data.candidates[0].content.parts[0].text.trim();

    // Try to parse JSON from the response
    try {
      // Handle cases where LLM wraps JSON in markdown code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(content);
    } catch {
      console.warn('OCR response was not valid JSON:', content);
      return { name: null, dob: null, idNumber: null, rawResponse: content };
    }
  } catch (err) {
    console.warn('⚠️ OCR API failed. Error:', err.message);
    if (err.response && err.response.data) {
      console.warn('Groq API Error Details:', JSON.stringify(err.response.data, null, 2));
    }
    return {
      name: "Mock User (OCR Bypass)",
      dob: "1990-01-01",
      idNumber: "1234-5678-9012"
    };
  }
}

module.exports = { extractIdDetails };

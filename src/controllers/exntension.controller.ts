import axios from "axios";
import { Request, Response } from "express";
import dotenv from "dotenv";

dotenv.config();

const CF_API_URL = `https://api.cloudflare.com/client/v4/accounts/3d3c88711ee120eb983a8e8bf60aa025/ai/run/@cf/meta/llama-3.1-8b-instruct-fast`;
const MODEL_URL = `https://api.cloudflare.com/client/v4/accounts/3d3c88711ee120eb983a8e8bf60aa025/ai/run/@cf/black-forest-labs/flux-1-schnell`;

export const generateMeaningController = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      word,
      context,
      width = 1024,
      height = 1024,
      num_steps = 20,
      guidance = 7.5,
    } = req.body;

    const prompt = `I will provide a word and a sentence using that word. Give me only the precise meaning of the word as used in the sentence. Your definition should be 2-3 lines that clearly explain the meaning. No explanations or phrases like "in this context" - just the definition itself
    Do not include any special characters in your response like \n or \t.
                    Word: ${word}
                    Sentence: ${context}`;

    const response = await axios.post(
      CF_API_URL,
      {
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer JhQOVMSca3UG2jaM1cRmbd6mojsfdJk098P4hmd8`,
          "Content-Type": "application/json",
        },
      }
    );

    const definition =
      response?.data?.result?.response ?? "Error generating the meaning";

    if (!definition) {
      return res.status(400).json({
        success: true,
        message: "Error generating the meaning.",
      });
    }

    const imagePrompt = `cyberpunk cat`;

    const imageResponse = await axios.post(
      MODEL_URL,
      { prompt: imagePrompt, width, height, num_steps, guidance },
      {
        headers: {
          Authorization: `Bearer JhQOVMSca3UG2jaM1cRmbd6mojsfdJk098P4hmd8`,
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer", // Important to get binary
      }
    );

    // 3. Convert image to base64
    const base64Image = Buffer.from(imageResponse.data, "binary").toString(
      "base64"
    );

    // 4. Send both meaning and image
    res.status(200).json({
      success: true,
      definition,
      image: `data:image/png;base64,${base64Image}`,
    });
  } catch (err: any) {
    console.error("Error with Cloudflare Workers AI API:", err.message);
    if (err.response) {
      console.error("API Response Error:", err.response.data); // Log the response data if available
    }
    res.status(500).json({
      error: "An error occurred while making the API request.",
      message: err.message, // Return the error message for debugging
    });
  }
};

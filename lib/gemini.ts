export const MODEL = "gemini-3.5-flash";
export const IMAGE_MODEL = "gemini-3.1-flash-image-preview";

const GENERATE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string };
};

type GeminiImageResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: { mimeType?: string; data?: string };
      }>;
    };
  }>;
  error?: { message?: string };
};

async function generateText(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch(
    `${GENERATE_URL}/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    },
  );

  const payload = (await response.json()) as GeminiResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Gemini request failed (${response.status})`);
  }

  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }
  return text.trim();
}

export async function generateStory(prompt: string, apiKey: string): Promise<string> {
  return generateText(
    `Write a short story from this prompt. Keep it under 400 words.\n\n${prompt}`,
    apiKey,
  );
}

export async function generateTitle(story: string, apiKey: string): Promise<string> {
  const title = await generateText(
    `Generate a short and catchy title for the following story. Provide only one title and do not suggest.\n\n${story}`,
    apiKey,
  );
  return title.replace(/^["'#\s]+|["'#\s]+$/g, "");
}

export async function generateCover(story: string, apiKey: string): Promise<string> {
  const response = await fetch(
    `${GENERATE_URL}/${IMAGE_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${story} in the style of modern animated films. Characters should look cute, but not too childish`,
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      }),
    },
  );

  const payload = (await response.json()) as GeminiImageResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Gemini image request failed (${response.status})`);
  }

  const bytes = payload.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!bytes) {
    throw new Error("Gemini returned an empty image");
  }
  return `data:image/png;base64,${bytes}`;
}

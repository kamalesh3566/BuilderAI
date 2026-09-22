import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

interface VisionModelResult {
  visionModel: any;
  modelName: string;
}

const getVisionModel = (customVisionApiKey?: string | null): VisionModelResult => {
  const key = (typeof customVisionApiKey === 'string' && customVisionApiKey.trim()) || '';

  // Direct Google Gemini API Key from Google AI Studio (starts with AIzaSy)
  if (key.startsWith('AIzaSy')) {
    const geminiClient = createOpenAI({
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      apiKey: key,
    } as any);
    return { visionModel: geminiClient('gemini-2.0-flash'), modelName: 'Google Gemini 2.0 Flash (Direct BYOK)' };
  }

  // Custom OpenRouter Key or System Default
  const apiKey = key || process.env.OPENROUTER_API_KEY;
  const modelName = key
    ? (process.env.OPENROUTER_VISION_MODEL || 'google/gemini-2.0-flash-001')
    : (process.env.OPENROUTER_VISION_MODEL || 'openrouter/free');
  const openrouter = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
  } as any);
  return { visionModel: openrouter(modelName), modelName: key ? `${modelName} (Custom BYOK)` : `${modelName} (Shared Default)` };
};

const VISION_INSPECTION_SYSTEM = `You are a Principal UI/UX Architect and Design System Reverse-Engineer.
Your task is to thoroughly analyze the provided UI design screenshot(s) / reference image(s) and produce an exhaustive, pixel-level UI/UX Design Specification & Component Blueprint that a code generation LLM can use to build an exact React + Tailwind CSS replica.

Extract and document every detail:

### 1. COLOR SYSTEM & THEME
- Background color(s): exact hex / Tailwind class (e.g., #09090b, #ffffff, #fafafa)
- Surface/Card colors: exact shades, border colors (e.g., border-zinc-200, bg-zinc-50)
- Primary & Secondary Accent colors (e.g., Indigo-600 #4f46e5, Violet-500, Emerald-500)
- Text colors: Primary text, Secondary/Muted text, Badge text
- Gradients: Exact start, middle, and end colors and direction

### 2. TYPOGRAPHY
- Font style personality: (e.g., Geometric Sans like Plus Jakarta Sans, Clean Tech like Inter, Serif)
- Hierarchy:
  * Hero H1: Estimated size (e.g. text-5xl/6xl), weight (font-extrabold/black), letter tracking
  * Section Titles H2: Size, weight, alignment
  * Card Titles H3: Size, weight
  * Body & Paragraphs: Size, color, line-height
  * Badges/Chips: Uppercase tracking, font size

### 3. COMPONENT & DOM ANATOMY (Top to Bottom)
Break down the page section-by-section:
- **Navigation/Header**: Logo alignment, nav link labels, action buttons, sticky/glassmorphic properties.
- **Hero Section**: Headline layout, subtext width, CTA button group (primary + secondary), floating visual cards, badges, product preview mockup.
- **Feature Sections / Bento Grid**: Number of columns, card layouts, icon styles, border-radius, hover effects.
- **Interactive Elements & Buttons**: Border radius (e.g. rounded-full vs rounded-xl), icon positions, padding, shadows.
- **Image & Media Blocks**: Aspect ratios (16:9, 1:1, 4:3), positioning, mockups, image placeholders.
- **Footer**: Column organization, copyright, social icons, newsletter signup.

### 4. SPACING, GEOMETRY & POLISH
- Container widths (e.g. max-w-7xl mx-auto px-6)
- Vertical section spacing (e.g. py-24 md:py-32)
- Border radius style across the UI (rounded-xl, rounded-2xl, rounded-3xl)
- Card borders, divider lines, shadows, and subtle blur effects

Format your output as a structured, precise Markdown Blueprint.`;

export async function analyzeReferenceImages(
  images?: string[] | null,
  userPrompt?: string,
  customApiKey: string | null = null
): Promise<string | null> {
  if (!images || !Array.isArray(images) || images.length === 0) return null;

  const validImages = images.filter((img) => typeof img === 'string' && img.startsWith('data:image/'));
  if (validImages.length === 0) return null;

  const { visionModel, modelName } = getVisionModel(customApiKey);
  console.log(`[Vision AI] Analyzing ${validImages.length} reference image(s) using ${modelName}...`);

  const content: any[] = [
    {
      type: 'text',
      text: `Here are ${validImages.length} reference screenshot(s)/design image(s). User prompt: "${userPrompt || ''}".\n\nPerform a complete visual breakdown and generate the UI/UX Blueprint.`,
    },
  ];

  for (const imgBase64 of validImages.slice(0, 10)) {
    const mimeMatch = imgBase64.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,/);
    const mediaType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    content.push({
      type: 'file',
      data: imgBase64,
      mediaType: mediaType,
    });
  }

  try {
    const { text: designSpec } = await generateText({
      model: visionModel,
      system: VISION_INSPECTION_SYSTEM,
      messages: [{ role: 'user', content }],
      maxRetries: 2,
    });

    console.log(`[Vision AI] Generated Design Blueprint (${designSpec.length} chars)`);
    return designSpec;
  } catch (error: any) {
    console.error(`[Vision AI Error] Failed to analyze images:`, error?.message || error);
    return null;
  }
}

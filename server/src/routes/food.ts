import express from 'express';
import multer from 'multer';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

/** 支持视觉的轻量模型，用于食物图片识别与文本营养估算 */
const VISION_MODEL = 'doubao-seed-2-0-lite-260215';

const ANALYZE_SYSTEM_PROMPT = `你是一位专业的营养师和食物识别专家。请分析用户上传的食物照片，识别出主要食物名称并估算可见分量的营养成分。
请只返回一个 JSON 对象，不要包含任何 Markdown 代码块或解释，字段如下：
{
  "name": "食物名称（中文）",
  "amountGram": 可见分量的重量（整数克）,
  "calories": 总热量（整数 kcal）,
  "protein": 蛋白质（整数克）,
  "carbs": 碳水化合物（整数克）,
  "fat": 脂肪（整数克）,
  "confidence": 置信度（0 到 1 之间的小数）
}`;

const ESTIMATE_SYSTEM_PROMPT = `你是一位专业的营养师。根据用户给出的食物名称和重量，估算该分量的营养成分。
请只返回一个 JSON 对象，不要包含任何 Markdown 代码块或解释，字段如下：
{
  "name": "食物名称（中文）",
  "amountGram": 重量（整数克）,
  "calories": 总热量（整数 kcal）,
  "protein": 蛋白质（整数克）,
  "carbs": 碳水化合物（整数克）,
  "fat": 脂肪（整数克）,
  "confidence": 置信度（0 到 1 之间的小数）
}`;

/** 兼容 LLM 可能包裹在 Markdown 代码块里的 JSON */
function parseJsonFromLLM(content: string): unknown {
  const blockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const raw = blockMatch ? blockMatch[1] : content;
  try {
    return JSON.parse(raw);
  } catch {
    const loose = raw.match(/\{[\s\S]*\}/);
    return loose ? JSON.parse(loose[0]) : null;
  }
}

function validateNutrition(data: unknown): data is {
  name: string;
  amountGram: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence?: number;
} {
  return (
    typeof data === 'object' &&
    data !== null &&
    'name' in data &&
    typeof (data as Record<string, unknown>).name === 'string' &&
    'calories' in data &&
    typeof (data as Record<string, unknown>).calories === 'number'
  );
}

function normalizeResult(data: unknown) {
  if (!validateNutrition(data)) {
    throw new Error('LLM response missing required nutrition fields');
  }
  return {
    name: data.name,
    amountGram: Math.max(0, Math.round(data.amountGram || 0)),
    calories: Math.max(0, Math.round(data.calories || 0)),
    protein: Math.max(0, Math.round(data.protein || 0)),
    carbs: Math.max(0, Math.round(data.carbs || 0)),
    fat: Math.max(0, Math.round(data.fat || 0)),
    confidence: Math.min(Math.max(Number(data.confidence ?? 0.8), 0), 1),
  };
}

/** 从 Express headers 中提取需要透传给 LLM SDK 的请求头 */
function extractForwardHeaders(req: express.Request): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    normalized[key] = Array.isArray(value) ? value.join(',') : value;
  }
  return HeaderUtils.extractForwardHeaders(normalized);
}

/**
 * POST /api/v1/food/analyze
 * 上传食物照片，由多模态 LLM 返回估算的营养成分
 */
router.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: '请上传食物照片' });
      return;
    }

    const base64 = req.file.buffer.toString('base64');
    const mime = req.file.mimetype || 'image/jpeg';
    const dataUri = `data:${mime};base64,${base64}`;

    const client = new LLMClient(new Config(), extractForwardHeaders(req));
    const response = await client.invoke(
      [
        { role: 'system', content: ANALYZE_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '请识别这张照片中的食物，并估算其营养成分。',
            },
            {
              type: 'image_url',
              image_url: { url: dataUri, detail: 'high' },
            },
          ],
        },
      ],
      { model: VISION_MODEL, temperature: 0.2 }
    );

    const data = parseJsonFromLLM(response.content);
    const result = normalizeResult(data);
    res.json(result);
  } catch (err) {
    console.error('[/food/analyze] error:', err);
    res.status(500).json({
      error: 'AI 识别失败，请稍后重试或改用「手动输入」',
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});

/**
 * POST /api/v1/food/estimate
 * 根据食物名称与重量，由 LLM 估算营养成分
 */
router.post('/estimate', express.json(), async (req, res) => {
  try {
    const { name, amountGram } = req.body;
    if (!name || typeof amountGram !== 'number' || amountGram <= 0) {
      res.status(400).json({ error: '请提供食物名称和重量（克）' });
      return;
    }

    const client = new LLMClient(new Config(), extractForwardHeaders(req));
    const response = await client.invoke(
      [
        { role: 'system', content: ESTIMATE_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `食物名称：${name}\n重量：${Math.round(amountGram)}g\n请估算营养成分。`,
        },
      ],
      { model: VISION_MODEL, temperature: 0.2 }
    );

    const data = parseJsonFromLLM(response.content);
    const result = normalizeResult(data);
    res.json(result);
  } catch (err) {
    console.error('[/food/estimate] error:', err);
    res.status(500).json({
      error: 'AI 估算失败，请稍后重试',
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;

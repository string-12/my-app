import { createFormDataFile } from '@/utils';

/**
 * AI 食物识别结果。
 * 后端 /api/v1/food/analyze 与 /api/v1/food/estimate 均返回此结构。
 */
export interface RecognizedFood {
  name: string;
  amountGram: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
}

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

/**
 * 通过多模态 LLM 识别图片中的食物并估算营养成分。
 * 真实调用后端 /api/v1/food/analyze（multer 接收 image 字段）。
 */
export async function analyzeFoodImage(imageUri: string): Promise<RecognizedFood> {
  if (!API_BASE) {
    throw new Error('未配置后端地址（EXPO_PUBLIC_BACKEND_BASE_URL）');
  }

  const file = await createFormDataFile(imageUri, 'food.jpg', 'image/jpeg');
  const formData = new FormData();
  formData.append('image', file as unknown as Blob);

  const response = await fetch(`${API_BASE}/api/v1/food/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `识别失败 (${response.status})`);
  }

  return response.json();
}

/**
 * 根据食物名称与重量，由 LLM 估算营养成分。
 * 真实调用后端 /api/v1/food/estimate。
 */
export async function estimateFoodNutrition(
  name: string,
  amountGram: number
): Promise<RecognizedFood> {
  if (!API_BASE) {
    throw new Error('未配置后端地址（EXPO_PUBLIC_BACKEND_BASE_URL）');
  }

  const response = await fetch(`${API_BASE}/api/v1/food/estimate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, amountGram }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `估算失败 (${response.status})`);
  }

  return response.json();
}

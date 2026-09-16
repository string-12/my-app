import { createFormDataFile } from '@/utils';
import { getAISettings, type AISettings } from '@/utils/storage';

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

/** 读取用户自定义模型与 API Key，以请求头形式透传给后端 */
async function getAIHeaders(): Promise<Record<string, string>> {
  const settings = await getAISettings();
  const headers: Record<string, string> = {};
  if (settings.model) headers['x-model'] = settings.model;
  if (settings.apiKey) headers['x-api-key'] = settings.apiKey;
  return headers;
}

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
    headers: await getAIHeaders(),
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
    headers: { 'Content-Type': 'application/json', ...(await getAIHeaders()) },
    body: JSON.stringify({ name, amountGram }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `估算失败 (${response.status})`);
  }

  return response.json();
}

/**
 * 饮水识别结果。
 * 后端 /api/v1/water/analyze 返回此结构。
 */
export interface RecognizedWater {
  amountMl: number;
  drinkType: string;
  confidence: number;
}

/**
 * 通过多模态 LLM 识别饮品照片并估算毫升数。
 * 真实调用后端 /api/v1/water/analyze（multer 接收 image 字段）。
 */
export async function analyzeWaterImage(imageUri: string): Promise<RecognizedWater> {
  if (!API_BASE) {
    throw new Error('未配置后端地址（EXPO_PUBLIC_BACKEND_BASE_URL）');
  }

  const file = await createFormDataFile(imageUri, 'water.jpg', 'image/jpeg');
  const formData = new FormData();
  formData.append('image', file as unknown as Blob);

  const response = await fetch(`${API_BASE}/api/v1/water/analyze`, {
    method: 'POST',
    headers: await getAIHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `识别失败 (${response.status})`);
  }

  return response.json();
}

/**
 * AI 食物识别模块（模拟实现版）
 *
 * ⚠️ 当前为占位逻辑：随机从内置食物库中挑出一个"识别结果"，用于串联完整交互闭环。
 *
 * ─────────────────────────────────────────────────────────────
 * 🔌 真实模型接入点（替换 analyze 函数内部即可）
 * 1. 将 imageUri 通过 FormData 上传到后端：
 *    - 前端：new FormData() → { uri, name, type } → fetch(`/api/v1/food/analyze`, POST)
 *    - 后端：multer 接收 buffer → 调用视觉大模型（如豆包/DeepSeek-VL）
 *      → 返回结构化营养数据：{ name, amountGram, calories, protein, carbs, fat, confidence }
 * 2. 将下方 `MOCK_RESULT` 及随机逻辑整体替换为真实接口响应即可。
 *    - 接口文档参考：《第八部分 集成服务使用协议》
 * ─────────────────────────────────────────────────────────────
 */

export interface RecognizedFood {
  name: string;
  amountGram: number;
  calories: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  confidence: number; // 0-1
}

/** 内置示例食物库（仅用于演示占位） */
const MOCK_DB: Omit<RecognizedFood, 'confidence'>[] = [
  { name: '香煎鸡胸肉', amountGram: 150, calories: 198, protein: 31, carbs: 0, fat: 7 },
  { name: '糙米饭', amountGram: 200, calories: 222, protein: 5, carbs: 46, fat: 2 },
  { name: '牛油果沙拉', amountGram: 220, calories: 265, protein: 4, carbs: 18, fat: 21 },
  { name: '全麦吐司', amountGram: 60, calories: 159, protein: 6, carbs: 27, fat: 3 },
  { name: '拿铁咖啡', amountGram: 350, calories: 148, protein: 8, carbs: 12, fat: 8 },
  { name: '三文鱼刺身', amountGram: 120, calories: 208, protein: 24, carbs: 0, fat: 12 },
  { name: '希腊酸奶', amountGram: 150, calories: 99, protein: 14, carbs: 8, fat: 1 },
  { name: '清炒西兰花', amountGram: 180, calories: 66, protein: 4, carbs: 11, fat: 1 },
];

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 识别食物照片，返回营养成分估算结果。
 * @param imageUri 本地图片 uri（真实版：传给后端用于视觉识别）
 */
export async function analyzeFoodImage(imageUri: string): Promise<RecognizedFood> {
  // 模拟网络/识别延迟，给用户以"AI 分析中"的反馈节奏
  await delay(1400);

  // ➡️ 替换点：realResult = await realVisionApi(imageUri)
  const random = MOCK_DB[Math.floor(Math.random() * MOCK_DB.length)];
  return {
    ...random,
    confidence: Number((0.72 + Math.random() * 0.25).toFixed(2)),
  };
}
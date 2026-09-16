/**
 * 每日热量与三大营养素目标计算
 * 公式来源：Mifflin-St Jeor 基础代谢率 (BMR) + 活动系数 + 目标调整
 */

export type Goal = 'lose' | 'maintain' | 'gain';
export type Gender = 'male' | 'female';
export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'veryActive';

export interface ActivityOption {
  value: ActivityLevel;
  label: string;
  desc: string;
  factor: number;
}

export const ACTIVITY_LEVELS: ActivityOption[] = [
  { value: 'sedentary', label: '久坐少动', desc: '几乎不运动', factor: 1.2 },
  { value: 'light', label: '轻度活动', desc: '每周运动 1-3 次', factor: 1.375 },
  { value: 'moderate', label: '中度活动', desc: '每周运动 3-5 次', factor: 1.55 },
  { value: 'active', label: '高度活动', desc: '每周运动 6-7 次', factor: 1.725 },
  { value: 'veryActive', label: '极大活动', desc: '体力工作/高强度训练', factor: 1.9 },
];

export const GOALS: { value: Goal; label: string; desc: string; adjust: number }[] = [
  { value: 'lose', label: '减脂', desc: '制造热量缺口', adjust: -450 },
  { value: 'maintain', label: '保持', desc: '维持当前体重', adjust: 0 },
  { value: 'gain', label: '增重', desc: '创造热量盈余', adjust: 300 },
];

export interface Targets {
  calories: number;
  protein: number; // 克
  carbs: number; // 克
  fat: number; // 克
}

/**
 * 依据身体数据 + 目标，计算每日推荐摄入热量与三大营养素目标。
 * @param params.body.gender 'male' | 'female'
 * @param params.body.heightCm 身高(cm)
 * @param params.body.weightKg 体重(kg)
 * @param params.body.age 年龄
 * @param params.activityFactor 活动系数
 * @param params.goal 'lose' | 'maintain' | 'gain'
 */
export function calcTargets(params: {
  gender: Gender;
  heightCm: number;
  weightKg: number;
  age: number;
  activityFactor: number;
  goal: Goal;
}): Targets {
  const { gender, heightCm, weightKg, age, activityFactor, goal } = params;

  // 1. 基础代谢率 BMR（Mifflin-St Jeor）
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (gender === 'male' ? 5 : -161);

  // 2. 每日总消耗 TDEE
  const tdee = bmr * activityFactor;

  // 3. 按目标调整热量
  const adjust = GOALS.find((g) => g.value === goal)?.adjust ?? 0;
  const calories = Math.max(1200, Math.round((tdee + adjust) / 10) * 10);

  // 4. 三大营养素供能比例
  let pPct = 0.25;
  let cPct = 0.45;
  let fPct = 0.3;
  if (goal === 'lose') {
    pPct = 0.3; cPct = 0.35; fPct = 0.35;
  } else if (goal === 'gain') {
    pPct = 0.2; cPct = 0.55; fPct = 0.25;
  }

  const round = (n: number) => Math.round(n);
  return {
    calories,
    protein: round((calories * pPct) / 4),
    carbs: round((calories * cPct) / 4),
    fat: round((calories * fPct) / 9),
  };
}
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

export interface CalcResult extends Targets {
  bmr: number;
  tdee: number;
  weeklyRateKg: number; // 有符号：减脂为负，增重为正
  dailyAdjustment: number; // 有符号：负数为缺口，正数为盈余
}

export interface CalcTargetsParams {
  gender: Gender;
  heightCm: number;
  weightKg: number;
  age: number;
  activityFactor: number;
  goal: Goal;
  /** 目标体重（kg）。不填则使用默认周速率 */
  targetWeightKg?: number;
  /** 达成目标预期周数。不填则使用默认周速率 */
  planWeeks?: number;
}

const KCAL_PER_KG_FAT = 7700;

function getDefaultWeeklyRate(goal: Goal): number {
  if (goal === 'lose') return -0.5; // 每周减 0.5 kg
  if (goal === 'gain') return 0.3; // 每周增 0.3 kg
  return 0;
}

/**
 * 依据身体数据 + 目标（含目标体重/预期周期）计算每日推荐摄入。
 * 减脂/增重的热量差基于 1kg 体脂 ≈ 7700 kcal 推导。
 */
export function calcTargets(params: CalcTargetsParams): CalcResult {
  const { gender, heightCm, weightKg, age, activityFactor, goal, targetWeightKg, planWeeks } = params;

  // 1. 基础代谢率 BMR（Mifflin-St Jeor）
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (gender === 'male' ? 5 : -161);

  // 2. 每日总消耗 TDEE
  const tdee = bmr * activityFactor;

  // 3. 计算每周目标变化速率
  let weeklyRateKg = getDefaultWeeklyRate(goal);
  if (goal !== 'maintain' && targetWeightKg != null && planWeeks && planWeeks > 0) {
    const diff = targetWeightKg - weightKg;
    weeklyRateKg = diff / planWeeks;
    // 避免用户把减脂填成增重或速率过激
    if (goal === 'lose' && weeklyRateKg > 0) weeklyRateKg = -Math.abs(weeklyRateKg);
    if (goal === 'gain' && weeklyRateKg < 0) weeklyRateKg = Math.abs(weeklyRateKg);
  }

  // 4. 按目标调整热量
  let calories = Math.round(tdee / 10) * 10;
  let dailyAdjustment = 0;
  if (goal !== 'maintain') {
    dailyAdjustment = (weeklyRateKg * KCAL_PER_KG_FAT) / 7;
    calories = Math.round((tdee + dailyAdjustment) / 10) * 10;
    // 安全边界：不低于 BMR×0.9 且不低于 1200/1500 kcal；增重不超过 TDEE+1000
    const minCalories = Math.max(Math.round(bmr * 0.9), gender === 'female' ? 1200 : 1500);
    if (goal === 'lose') {
      calories = Math.max(minCalories, Math.min(calories, Math.round(tdee) - 100));
    } else {
      calories = Math.min(Math.round(tdee) + 1000, Math.max(calories, Math.round(tdee) + 100));
    }
  }

  // 5. 三大营养素供能比例
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
    bmr,
    tdee: Math.round(tdee),
    weeklyRateKg,
    dailyAdjustment: Math.round(dailyAdjustment),
    calories,
    protein: round((calories * pPct) / 4),
    carbs: round((calories * cPct) / 4),
    fat: round((calories * fPct) / 9),
  };
}
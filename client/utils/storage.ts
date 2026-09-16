/**
 * 本地数据层 —— 基于 AsyncStorage 的轻量持久化（无需后端）
 * 存储用户目标 (profile) 与每日饮食记录 (records)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import dayjs from 'dayjs';

const PROFILE_KEY = '@nutrilog/profile';
const RECORDS_KEY = '@nutrilog/records';
const SETTINGS_KEY = '@nutrilog/settings';

export const dayKey = (d: Date | number = new Date()) => dayjs(d).format('YYYY-MM-DD');

export function makeId(): string {
  return Crypto.randomUUID();
}

/* ---------------- 用户目标 ---------------- */

export interface Profile {
  goal: 'lose' | 'maintain' | 'gain';
  goalLabel: string;
  gender: 'male' | 'female';
  heightCm: number;
  weightKg: number;
  age: number;
  activityLabel: string;
  /** 目标体重（kg），保持目标可不填 */
  targetWeightKg?: number;
  /** 预期达成周数，保持目标可不填 */
  planWeeks?: number;
  /** 每周体重变化（kg），正为增，负为减 */
  weeklyRateKg: number;
  /** 每日热量调整值（kcal） */
  dailyAdjustment: number;
  calorieGoal: number;
  targets: { calories: number; protein: number; carbs: number; fat: number };
  updatedAt: number;
}

export async function getProfile(): Promise<Profile | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export async function saveProfile(profile: Profile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

/* ---------------- 饮食记录 ---------------- */

export type FoodSource = 'photo-ai' | 'manual';

export interface FoodRecord {
  id: string;
  day: string; // YYYY-MM-DD
  createdAt: number; // 时间戳
  name: string;
  amountGram: number;
  source: FoodSource;
  imageUri?: string;
  calories: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
}

async function readRecords(): Promise<FoodRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(RECORDS_KEY);
    return raw ? (JSON.parse(raw) as FoodRecord[]) : [];
  } catch {
    return [];
  }
}

async function writeRecords(records: FoodRecord[]): Promise<void> {
  await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

/** 获取某天的所有记录（默认今天），按添加时间倒序 */
export async function getRecords(day: string = dayKey()): Promise<FoodRecord[]> {
  const all = await readRecords();
  return all.filter((r) => r.day === day).sort((a, b) => b.createdAt - a.createdAt);
}

export async function addRecord(record: Omit<FoodRecord, 'id' | 'createdAt'>): Promise<FoodRecord> {
  const all = await readRecords();
  const full: FoodRecord = { ...record, id: makeId(), createdAt: Date.now() };
  all.push(full);
  await writeRecords(all);
  return full;
}

export async function deleteRecord(id: string): Promise<void> {
  const all = await readRecords();
  await writeRecords(all.filter((r) => r.id !== id));
}

/** 聚合某天的营养素总和 */
export interface DayTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function sumDayTotals(records: FoodRecord[]): DayTotals {
  return records.reduce<DayTotals>(
    (acc, r) => {
      acc.calories += r.calories;
      acc.protein += r.protein;
      acc.carbs += r.carbs;
      acc.fat += r.fat;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export async function getDayTotals(day: string = dayKey()): Promise<DayTotals> {
  const records = await getRecords(day);
  return sumDayTotals(records);
}

/** 历史：获取所有有记录的日期（倒序） */
export async function getRecordDays(): Promise<string[]> {
  const all = await readRecords();
  const days = Array.from(new Set(all.map((r) => r.day)));
  return days.sort((a, b) => b.localeCompare(a));
}

/** 历史：获取某天的记录与汇总 */
export async function getHistoryDay(day: string): Promise<{ records: FoodRecord[]; totals: DayTotals }> {
  const records = await getRecords(day);
  return { records, totals: sumDayTotals(records) };
}

/* ---------------- AI 模型设置 ---------------- */

export interface AISettings {
  /** 用户自定义 API Key，空字符串表示使用系统默认 */
  apiKey: string;
  /** 模型 ID */
  model: string;
}

/** 后端可用模型列表（按技能环境实际列表维护） */
export const AVAILABLE_MODELS = [
  { id: 'doubao-seed-2-0-lite-260215', name: 'Doubao Seed 2.0 Lite', vision: true },
  { id: 'doubao-seed-2-0-pro-260215', name: 'Doubao Seed 2.0 Pro', vision: true },
  { id: 'doubao-seed-2-0-mini-260215', name: 'Doubao Seed 2.0 Mini', vision: true },
  { id: 'qwen-3-5-plus-260215', name: 'Qwen 3.5 Plus', vision: true },
  { id: 'glm-4-7-251222', name: 'GLM-4.7', vision: false },
  { id: 'glm-5-0-260211', name: 'GLM-5', vision: false },
  { id: 'glm-5-turbo-260316', name: 'GLM-5 Turbo', vision: false },
  { id: 'minimax-m2-5-260212', name: 'MiniMax M2.5', vision: false },
  { id: 'minimax-m2-7-260318', name: 'MiniMax M2.7', vision: false },
] as const;

export const DEFAULT_AI_SETTINGS: AISettings = {
  apiKey: '',
  model: AVAILABLE_MODELS[0].id,
};

export async function getAISettings(): Promise<AISettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AISettings>;
    return {
      apiKey: parsed.apiKey ?? DEFAULT_AI_SETTINGS.apiKey,
      model: parsed.model || DEFAULT_AI_SETTINGS.model,
    };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export async function saveAISettings(settings: AISettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
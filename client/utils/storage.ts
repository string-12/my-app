/**
 * 本地数据层 —— 基于 AsyncStorage 的轻量持久化（无需后端）
 * 存储用户目标 (profile) 与每日饮食记录 (records)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import dayjs from 'dayjs';

const PROFILE_KEY = '@nutrilog/profile';
const RECORDS_KEY = '@nutrilog/records';

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

export async function getDayTotals(day: string = dayKey()): Promise<DayTotals> {
  const records = await getRecords(day);
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
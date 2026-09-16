import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { C } from '@/constants/colors';
import { Screen } from '@/components/Screen';
import {
  GOALS,
  ACTIVITY_LEVELS,
  calcTargets,
  Goal,
  Gender,
  ActivityLevel,
} from '@/utils/calc';
import { saveProfile, Profile } from '@/utils/storage';
import { useSafeRouter } from '@/hooks/useSafeRouter';

const inputBase =
  'flex-1 rounded-2xl px-4 py-3 text-base';
const inputStyle = { backgroundColor: C.field, color: C.text } as const;

export default function OnboardingPage() {
  const router = useSafeRouter();

  const [goal, setGoal] = useState<Goal>('lose');
  const [gender, setGender] = useState<Gender>('male');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [activity, setActivity] = useState<ActivityLevel>('light');
  const [targetWeight, setTargetWeight] = useState('');
  const [planWeeks, setPlanWeeks] = useState('');
  const [saving, setSaving] = useState(false);

  // 实时预览计算结果
  const preview = useMemo(() => {
    const h = Number(height);
    const w = Number(weight);
    const a = Number(age);
    if (!h || !w || !a) return null;
    const factor = ACTIVITY_LEVELS.find((x) => x.value === activity)?.factor ?? 1.375;
    const tw = targetWeight ? Number(targetWeight) : undefined;
    const pw = planWeeks ? Number(planWeeks) : undefined;
    return calcTargets({
      gender,
      heightCm: h,
      weightKg: w,
      age: a,
      activityFactor: factor,
      goal,
      targetWeightKg: tw,
      planWeeks: pw,
    });
  }, [height, weight, age, activity, goal, gender, targetWeight, planWeeks]);

  const goalMeta = GOALS.find((g) => g.value === goal)!;
  const activityMeta = ACTIVITY_LEVELS.find((x) => x.value === activity)!;

  const handleSave = async () => {
    const h = Number(height);
    const w = Number(weight);
    const a = Number(age);
    if (!h || !w || !a) {
      Toast.show({ type: 'error', text1: '请完整填写身高、体重与年龄' });
      return;
    }
    if (h < 100 || h > 250 || w < 30 || w > 300 || a < 10 || a > 100) {
      Toast.show({ type: 'error', text1: '请输入合理的身体数据范围' });
      return;
    }
    const tw = targetWeight ? Number(targetWeight) : undefined;
    const pw = planWeeks ? Number(planWeeks) : undefined;
    if (goal !== 'maintain') {
      if (!tw || !pw) {
        Toast.show({ type: 'error', text1: '请填写目标体重与预期周数' });
        return;
      }
      if ((goal === 'lose' && tw >= w) || (goal === 'gain' && tw <= w)) {
        Toast.show({ type: 'error', text1: '目标体重方向与所选目标不一致' });
        return;
      }
      if (pw < 1 || pw > 104) {
        Toast.show({ type: 'error', text1: '预期周数请填写 1-104 周' });
        return;
      }
    }
    setSaving(true);
    const targets = calcTargets({
      gender,
      heightCm: h,
      weightKg: w,
      age: a,
      activityFactor: activityMeta.factor,
      goal,
      targetWeightKg: tw,
      planWeeks: pw,
    });
    const profile: Profile = {
      goal,
      goalLabel: goalMeta.label,
      gender,
      heightCm: h,
      weightKg: w,
      age: a,
      activityLabel: activityMeta.label,
      targetWeightKg: tw,
      planWeeks: pw,
      weeklyRateKg: targets.weeklyRateKg,
      dailyAdjustment: targets.dailyAdjustment,
      calorieGoal: targets.calories,
      targets,
      dailyWaterGoalMl: 2000,
      updatedAt: Date.now(),
    };
    await saveProfile(profile);
    setSaving(false);
    Toast.show({ type: 'success', text1: '目标已保存' });
    router.replace('/');
  };

  return (
    <Screen statusBarStyle="dark" safeAreaEdges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            className="text-2xl px-1"
            style={{ color: C.primaryDark }}
            allowFontScaling={false}
          >
            设定你的健康目标
          </Text>
          <Text className="mt-2 text-sm leading-5" style={{ color: C.muted }}>
            告诉我们一些基本信息，我们将为你计算出每日热量与三大营养素推荐摄入。
          </Text>

          {/* 目标选择 */}
          <SectionTitle>选择目标</SectionTitle>
          <View className="flex-row gap-3">
            {GOALS.map((g) => {
              const active = goal === g.value;
              return (
                <TouchableOpacity
                  key={g.value}
                  className="flex-1 rounded-2xl px-3 py-4 items-center"
                  style={{
                    backgroundColor: active ? C.primary : C.surface,
                    ...shadow(),
                  }}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setGoal(g.value);
                  }}
                >
                  <Text
                    className="text-base px-1"
                    style={{ color: active ? '#fff' : C.text }}
                    allowFontScaling={false}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {g.label}
                  </Text>
                  <Text
                    className="mt-1 text-[11px] text-center px-1"
                    style={{ color: active ? 'rgba(255,255,255,0.85)' : C.muted }}
                    allowFontScaling={false}
                  >
                    {g.desc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 性别 */}
          <SectionTitle>性别</SectionTitle>
          <View className="flex-row gap-3">
            {(
              [
                { v: 'male', l: '男' },
                { v: 'female', l: '女' },
              ] as { v: Gender; l: string }[]
            ).map((g) => {
              const active = gender === g.v;
              return (
                <TouchableOpacity
                  key={g.v}
                  className="flex-1 rounded-2xl py-3.5 items-center"
                  style={{
                    backgroundColor: active ? C.primary : C.surface,
                    ...shadow(),
                  }}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setGender(g.v);
                  }}
                >
                  <Text
                    className="text-base px-1"
                    style={{ color: active ? '#fff' : C.text }}
                    allowFontScaling={false}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {g.l}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 身体数据 */}
          <SectionTitle>身体数据</SectionTitle>
          <View className="flex-row gap-3">
            <NumberField label="身高 (cm)" value={height} onChange={setHeight} />
            <NumberField label="体重 (kg)" value={weight} onChange={setWeight} />
            <NumberField label="年龄" value={age} onChange={setAge} />
          </View>

          {/* 目标体重与周期 */}
          {goal !== 'maintain' ? (
            <>
              <SectionTitle>目标规划</SectionTitle>
              <View className="flex-row gap-3">
                <NumberField
                  label={goal === 'lose' ? '目标体重 (kg)' : '目标体重 (kg)'}
                  value={targetWeight}
                  onChange={setTargetWeight}
                />
                <NumberField label="预期周数" value={planWeeks} onChange={setPlanWeeks} />
              </View>
              <Text className="mt-2 text-xs leading-5" style={{ color: C.muted }}>
                系统将基于「当前体重 → 目标体重」和「预期周数」自动计算每日热量缺口/盈余。
                不填则使用默认推荐速率（减脂每周 0.5kg，增重每周 0.3kg）。
              </Text>
            </>
          ) : null}

          {/* 活动量 */}
          <SectionTitle>日常活动量</SectionTitle>
          <View className="gap-2">
            {ACTIVITY_LEVELS.map((a) => {
              const active = activity === a.value;
              return (
                <TouchableOpacity
                  key={a.value}
                  className="flex-row items-center rounded-2xl px-4 py-3.5"
                  style={{ backgroundColor: active ? C.primary : C.surface, ...shadow() }}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setActivity(a.value);
                  }}
                >
                  <View
                    className="w-5 h-5 rounded-full mr-3 items-center justify-center"
                    style={{ borderWidth: 2, borderColor: active ? '#fff' : C.muted }}
                  >
                    {active ? (
                      <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#fff' }} />
                    ) : null}
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold" style={{ color: active ? '#fff' : C.text }}>
                      {a.label}
                    </Text>
                    <Text
                      className="text-[11px]"
                      style={{ color: active ? 'rgba(255,255,255,0.85)' : C.muted }}
                    >
                      {a.desc}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 实时预览 */}
          {preview ? (
            <View
              className="mt-6 rounded-3xl p-5"
              style={{ backgroundColor: C.primary, ...shadow() }}
            >
              <Text className="text-sm px-1" style={{ color: 'rgba(255,255,255,0.8)' }} allowFontScaling={false}>每日推荐摄入</Text>
              <View className="flex-row items-end mt-1">
                <Text className="text-4xl font-semibold text-white" allowFontScaling={false}>
                  {preview.calories}
                </Text>
                <Text className="text-sm mb-1.5 ml-2" style={{ color: 'rgba(255,255,255,0.8)' }}>kcal / 天</Text>
              </View>
              {goal !== 'maintain' ? (
                <View className="mt-3 flex-row flex-wrap gap-x-4">
                  <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    每周{preview.weeklyRateKg > 0 ? '增' : '减'} {Math.abs(preview.weeklyRateKg).toFixed(2)} kg
                  </Text>
                  <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    每日{preview.dailyAdjustment > 0 ? '盈余' : '缺口'} {Math.abs(preview.dailyAdjustment)} kcal
                  </Text>
                </View>
              ) : null}
              <View className="flex-row justify-between mt-4">
                {[
                  { k: '蛋白质', v: preview.protein },
                  { k: '碳水', v: preview.carbs },
                  { k: '脂肪', v: preview.fat },
                ].map((m) => (
                  <View key={m.k} className="items-center">
                    <Text className="text-lg font-semibold text-white">{m.v}g</Text>
                    <Text className="text-[11px]" style={{ color: 'rgba(255,255,255,0.8)' }}>{m.k}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* 提交 */}
          <TouchableOpacity
            className="mt-8 w-full rounded-2xl px-6 py-4 items-center justify-center"
            style={{ backgroundColor: C.primaryDark, ...shadow() }}
            onPress={handleSave}
            disabled={saving}
          >
            <Text
              className="text-base text-white px-2"
              allowFontScaling={false}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {saving ? '保存中…' : '开始我的健康之旅 →'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function shadow() {
  return {
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  };
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mt-6 mb-3 text-sm px-1" style={{ color: C.muted }} allowFontScaling={false}>
      {children}
    </Text>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View className="flex-1">
      <Text className="mb-2 text-xs px-1" style={{ color: C.muted }} allowFontScaling={false}>
        {label}
      </Text>
      <TextInput
        className={inputBase}
        style={inputStyle}
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^0-9.]/g, ''))}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor="#9FABA5"
      />
    </View>
  );
}
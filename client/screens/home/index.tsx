import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { C } from '@/constants/colors';
import { Screen } from '@/components/Screen';
import ProgressRing from '@/components/ProgressRing';
import MacroBar from '@/components/MacroBar';
import {
  getProfile,
  getDayTotals,
  getRecords,
  deleteRecord,
  Profile,
  FoodRecord,
  DayTotals,
  dayKey,
} from '@/utils/storage';
import { useSafeRouter } from '@/hooks/useSafeRouter';

export default function HomePage() {
  const router = useSafeRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [today, setToday] = useState(dayKey());
  const [totals, setTotals] = useState<DayTotals>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const [records, setRecords] = useState<FoodRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [p, t, r] = await Promise.all([
          getProfile(),
          getDayTotals(),
          getRecords(),
        ]);
        if (!active) return;
        setProfile(p);
        setTotals(t);
        setRecords(r);
        setToday(dayKey());
        setLoaded(true);
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  const handleDelete = (id: string, name: string) => {
    Alert.alert('删除记录', `确定删除「${name}」这条记录吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteRecord(id);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const [t, r] = await Promise.all([getDayTotals(), getRecords()]);
          setTotals(t);
          setRecords(r);
        },
      },
    ]);
  };

  if (!loaded) {
    return (
      <Screen statusBarStyle="dark">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </Screen>
    );
  }

  // 首次使用：引导设置目标
  if (!profile) {
    return (
      <Screen statusBarStyle="dark" safeAreaEdges={['top', 'left', 'right']}>
        <View className="flex-1 px-8 items-center justify-center">
          <View className="w-20 h-20 rounded-3xl items-center justify-center mb-6" style={{ backgroundColor: `${C.primary}22` }}>
            <Ionicons name="leaf" size={40} color={C.primary} />
          </View>
          <Text className="text-2xl font-extrabold text-center" style={{ color: C.primaryDark }}>
            欢迎来到每日营养打卡
          </Text>
          <Text className="mt-3 text-sm text-center leading-6" style={{ color: C.muted }}>
            花一分钟设定你的减脂或增重目标，我们将为你计算每日热量与营养素摄入目标，陪你逐步达成。
          </Text>
          <TouchableOpacity
            className="mt-8 rounded-2xl px-10 py-4 items-center"
            style={{ backgroundColor: C.primary, ...shadow() }}
            onPress={() => router.navigate('/onboarding')}
          >
            <Text className="text-base font-bold text-white">开始设置目标 →</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  const pct = profile.calorieGoal > 0 ? Math.min(totals.calories / profile.calorieGoal, 1) : 0;

  return (
    <Screen statusBarStyle="dark" safeAreaEdges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        {/* 顶部标题栏 */}
        <View className="flex-row items-center justify-between mb-5">
          <View>
            <Text className="text-sm" style={{ color: C.muted }}>
              {today}
            </Text>
            <Text className="text-xl font-extrabold mt-0.5" style={{ color: C.text }}>
              今日摄入 · {profile.goalLabel}
            </Text>
          </View>
          <TouchableOpacity
            className="w-11 h-11 rounded-full items-center justify-center"
            style={{ backgroundColor: C.surface, ...shadow() }}
            onPress={() => router.navigate('/onboarding')}
          >
            <Ionicons name="settings-outline" size={20} color={C.primaryDark} />
          </TouchableOpacity>
        </View>

        {/* 能量环 Hero */}
        <View
          className="rounded-[28px] items-center py-7"
          style={{ backgroundColor: C.surface, ...shadow() }}
        >
          <ProgressRing
            value={totals.calories}
            target={profile.calorieGoal}
            label="今日热量"
            sublabel={pct >= 1 ? '已达标，干劲十足!' : '继续加油，向目标冲刺'}
          />
        </View>

        {/* 三大营养素进度 */}
        <Text className="text-sm font-bold mt-6 mb-3" style={{ color: C.muted }}>
          三大营养素
        </Text>
        <View className="rounded-[24px] p-5" style={{ backgroundColor: C.surface, ...shadow() }}>
          <MacroBar label="蛋白质" color={C.protein} value={totals.protein} target={profile.targets.protein} />
          <MacroBar label="碳水" color={C.carbs} value={totals.carbs} target={profile.targets.carbs} />
          <MacroBar label="脂肪" color={C.fat} value={totals.fat} target={profile.targets.fat} />
        </View>

        {/* 今日记录 */}
        <View className="flex-row items-center justify-between mt-6 mb-3">
          <Text className="text-sm font-bold" style={{ color: C.muted }}>
            今日记录
          </Text>
          <Text className="text-xs" style={{ color: C.muted }}>
            {records.length} 条
          </Text>
        </View>

        {records.length === 0 ? (
          <View
            className="rounded-[24px] p-8 items-center"
            style={{ backgroundColor: C.surface, ...shadow() }}
          >
            <Ionicons name="restaurant-outline" size={36} color={C.muted} />
            <Text className="mt-3 text-sm font-semibold" style={{ color: C.text }}>
              今天还没有记录
            </Text>
            <Text className="mt-1 text-xs" style={{ color: C.muted }}>
              点击下方按钮，记录第一餐吧
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {records.map((r) => (
              <View
                key={r.id}
                className="flex-row items-center rounded-[20px] p-3.5"
                style={{ backgroundColor: C.surface, ...shadow() }}
              >
                {r.imageUri ? (
                  <Image
                    className="w-14 h-14 rounded-2xl"
                    style={{ backgroundColor: C.field }}
                    source={r.imageUri}
                    contentFit="cover"
                  />
                ) : (
                  <View className="w-14 h-14 rounded-2xl items-center justify-center" style={{ backgroundColor: `${C.primary}18` }}>
                    <Ionicons name="fast-food-outline" size={24} color={C.primary} />
                  </View>
                )}
                <View className="flex-1 ml-3">
                  <View className="flex-row items-center">
                    <Text className="text-base font-bold flex-1" style={{ color: C.text }} numberOfLines={1}>
                      {r.name}
                    </Text>
                    {r.source === 'photo-ai' ? (
                      <Text className="text-[10px] font-bold px-1.5 py-0.5 rounded-full mr-1" style={{ color: C.primary, backgroundColor: `${C.primary}1c` }}>
                        AI
                      </Text>
                    ) : null}
                  </View>
                  <Text className="text-xs mt-0.5" style={{ color: C.muted }}>
                    {r.amountGram ? `${r.amountGram}g · ` : ''}
                    {Math.round(r.calories)} kcal · 蛋{Math.round(r.protein)}/碳{Math.round(r.carbs)}/脂{Math.round(r.fat)}
                  </Text>
                </View>
                <TouchableOpacity
                  className="w-9 h-9 rounded-full items-center justify-center"
                  style={{ backgroundColor: `${C.danger}14` }}
                  onPress={() => handleDelete(r.id, r.name)}
                >
                  <Ionicons name="trash-outline" size={17} color={C.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* 悬浮添加按钮 */}
      <TouchableOpacity
        className="absolute bottom-8 right-6 w-16 h-16 rounded-full items-center justify-center"
        style={{ backgroundColor: C.primary, ...shadow() }}
        onPress={() => router.navigate('/add-food')}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
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
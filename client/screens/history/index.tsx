import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import dayjs from 'dayjs';
import { C } from '@/constants/colors';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import {
  getRecordDays,
  getHistoryDay,
  FoodRecord,
  DayTotals,
  deleteRecord,
  getProfile,
} from '@/utils/storage';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function formatDayLabel(day: string) {
  const d = dayjs(day);
  const today = dayjs();
  if (d.isSame(today, 'day')) return '今天';
  if (d.isSame(today.subtract(1, 'day'), 'day')) return '昨天';
  return d.format('MM月DD日');
}

function totalText(totals: DayTotals, goal: number) {
  const percent = Math.min(Math.round((totals.calories / Math.max(goal, 1)) * 100), 999);
  return `热量 ${totals.calories}/${goal} kcal · 蛋白质 ${totals.protein}g · 碳水 ${totals.carbs}g · 脂肪 ${totals.fat}g`;
}

export default function HistoryPage() {
  const router = useSafeRouter();
  const [days, setDays] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, { records: FoodRecord[]; totals: DayTotals }>>({});
  const [calorieGoal, setCalorieGoal] = useState(2000);

  const load = useCallback(async () => {
    const d = await getRecordDays();
    setDays(d);
    const profileRaw = await getProfile();
    if (profileRaw) setCalorieGoal(profileRaw.calorieGoal);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggle = async (day: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (expanded === day) {
      setExpanded(null);
      return;
    }
    if (!details[day]) {
      const data = await getHistoryDay(day);
      setDetails((prev) => ({ ...prev, [day]: data }));
    }
    setExpanded(day);
  };

  const handleDelete = async (id: string, day: string) => {
    await deleteRecord(id);
    const data = await getHistoryDay(day);
    setDetails((prev) => ({ ...prev, [day]: data }));
    if (data.records.length === 0) {
      setDays((prev) => prev.filter((d) => d !== day));
      setExpanded(null);
    }
    load();
  };

  return (
    <Screen statusBarStyle="dark" safeAreaEdges={['top', 'left', 'right']}>
      <View className="flex-row items-center px-5 pt-4 pb-2">
        <TouchableOpacity
          onPress={router.back}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: C.surface }}
        >
          <Ionicons name="arrow-back" size={22} color={C.primary} />
        </TouchableOpacity>
        <Text
          className="flex-1 text-center text-xl font-bold"
          style={{ color: C.text }}
          allowFontScaling={false}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          历史记录
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {days.length === 0 ? (
          <View className="items-center justify-center py-20">
            <View
              className="w-16 h-16 rounded-2xl items-center justify-center mb-4"
              style={{ backgroundColor: C.surface }}
            >
              <Ionicons name="calendar-outline" size={28} color={C.muted} />
            </View>
            <Text className="text-base font-semibold" style={{ color: C.text }}>
              暂无历史记录
            </Text>
            <Text className="mt-2 text-sm text-center" style={{ color: C.muted }}>
              记录第一餐之后，这里会显示每日饮食回顾。
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {days.map((day) => {
              const isExpanded = expanded === day;
              const data = details[day];
              return (
                <View
                  key={day}
                  className="rounded-3xl overflow-hidden"
                  style={{ backgroundColor: C.surface, ...shadow() }}
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    className="px-5 py-4"
                    onPress={() => toggle(day)}
                  >
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text
                          className="text-lg font-bold"
                          style={{ color: C.text }}
                          allowFontScaling={false}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                        >
                          {formatDayLabel(day)}
                        </Text>
                        <Text className="mt-1 text-xs" style={{ color: C.muted }}>
                          {data ? totalText(data.totals, calorieGoal) : '点击展开详情'}
                        </Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={C.muted}
                      />
                    </View>
                  </TouchableOpacity>

                  {isExpanded && data ? (
                    <View className="px-5 pb-5">
                      <View
                        className="mb-3 rounded-2xl p-4"
                        style={{ backgroundColor: C.primaryLight }}
                      >
                        <Text className="text-xs mb-2" style={{ color: C.muted }}>
                          当日汇总
                        </Text>
                        <View className="flex-row justify-between">
                          {[
                            { k: '热量', v: `${data.totals.calories} kcal` },
                            { k: '蛋白质', v: `${data.totals.protein}g` },
                            { k: '碳水', v: `${data.totals.carbs}g` },
                            { k: '脂肪', v: `${data.totals.fat}g` },
                          ].map((m) => (
                            <View key={m.k} className="items-center">
                              <Text className="text-sm font-bold" style={{ color: C.text }}>
                                {m.v}
                              </Text>
                              <Text className="text-[10px]" style={{ color: C.muted }}>
                                {m.k}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>

                      {data.records.length === 0 ? (
                        <Text className="text-sm" style={{ color: C.muted }}>
                          当日无记录
                        </Text>
                      ) : (
                        <View className="gap-3">
                          {data.records.map((record) => (
                            <View
                              key={record.id}
                              className="flex-row items-center rounded-2xl p-3"
                              style={{ backgroundColor: C.field }}
                            >
                              <View className="flex-1">
                                <Text
                                  className="text-sm font-semibold"
                                  style={{ color: C.text }}
                                  numberOfLines={1}
                                >
                                  {record.name}
                                </Text>
                                <Text className="text-[11px] mt-0.5" style={{ color: C.muted }}>
                                  {record.amountGram}g · {record.calories} kcal
                                </Text>
                              </View>
                              <TouchableOpacity
                                onPress={() => handleDelete(record.id, day)}
                                className="w-8 h-8 rounded-full items-center justify-center"
                                style={{ backgroundColor: 'rgba(244,63,94,0.1)' }}
                              >
                                <Ionicons name="trash-outline" size={16} color="#F43F5E" />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function shadow() {
  return {
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  };
}

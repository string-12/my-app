import React from 'react';
import { View, Text } from 'react-native';
import { C } from '@/constants/colors';

interface Props {
  label: string;
  color: string;
  value: number;
  target: number;
  emoji?: string;
}

/** 单一营养素横向进度条（游戏化"能量槽"） */
export default function MacroBar({ label, color, value, target, emoji }: Props) {
  const ratio = target > 0 ? Math.min(value / target, 1) : 0;
  const pct = target > 0 ? Math.round((value / target) * 100) : 0;

  return (
    <View className="mb-5">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          {emoji ? <Text className="mr-1.5 text-sm">{emoji}</Text> : null}
          <Text className="text-sm font-semibold" style={{ color: C.text }}>
            {label}
          </Text>
        </View>
        <Text className="text-sm font-bold" style={{ color: C.text }}>
          {Math.round(value)} <Text style={{ color: C.muted, fontWeight: '400' }}>/ {Math.round(target)} g</Text>
        </Text>
      </View>
      <View className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: C.track }}>
        <View
          className="h-full rounded-full"
          style={{ width: `${ratio * 100}%`, backgroundColor: color }}
        />
      </View>
      <Text className="mt-1 text-xs self-end" style={{ color: pct >= 100 ? color : C.muted }}>
        {pct >= 100 ? '已完成 ✓' : `${pct}%`}
      </Text>
    </View>
  );
}
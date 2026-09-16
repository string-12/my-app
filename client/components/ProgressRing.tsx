import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { C } from '@/constants/colors';

interface Props {
  /** 已完成量 */
  value: number;
  /** 目标量 */
  target: number;
  /** 主标题 */
  label: string;
  /** 副标题 */
  sublabel?: string;
  /** 单位 */
  unit?: string;
  /** 环尺寸 */
  size?: number;
  strokeWidth?: number;
  color?: string;
}

/** 环形热量进度仪表盘（游戏化"能量环"） */
export default function ProgressRing({
  value,
  target,
  label,
  sublabel,
  unit = 'kcal',
  size = 176,
  strokeWidth = 16,
  color = C.primary,
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = target > 0 ? Math.min(value / target, 1) : 0;
  const offset = circumference * (1 - ratio);

  return (
    <View style={{ width: size + 24, alignItems: 'center' }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {/* 轨道 */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={C.track}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* 进度 */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        {/* 环中数字 */}
        <View
          className="absolute inset-0 items-center justify-center"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <Text className="text-5xl font-bold" style={{ color: C.primaryDark }} allowFontScaling={false}>
            {Math.round(value)}
          </Text>
          <Text className="mt-1 text-xs" style={{ color: C.muted }}>
            / {Math.round(target)} {unit}
          </Text>
        </View>
      </View>
      <Text className="mt-4 text-base font-bold" style={{ color: C.text }}>
        {label}
      </Text>
      {sublabel ? (
        <Text className="mt-1 text-xs text-center" style={{ color: C.muted }}>
          {sublabel}
        </Text>
      ) : null}
    </View>
  );
}
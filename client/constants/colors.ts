/**
 * 共享色板 —— 健康翡翠系设计 tokens
 * 供 SVG / 进度环 / 直写样式的组件使用（tailwind class 无法覆盖 SVG 内部描边）
 */
export const C = {
  /** 主色 · 鲜嫩翠叶 */
  primary: '#0EA569',
  /** 深绿主文字 */
  primaryDark: '#065F46',
  /** 根背景 · 冷瓷白 */
  background: '#F6F8F7',
  /** 卡片表面 · 白色微透 */
  surface: 'rgba(255,255,255,0.94)',
  /** 主文字 */
  text: '#12312A',
  /** 弱化文字（带绿意的灰） */
  muted: '#7C8B84',
  /** 三级背景（输入框 / 占位块） */
  field: '#EFF4F1',

  /* 营养素识别色 */
  carbs: '#F59E0B',
  protein: '#10B981',
  fat: '#38BDF8',

  /* 进度轨道 */
  track: '#E7EFEA',
  /* 卡片阴影（翡翠色相、低透明） */
  shadow: 'rgba(16,185,129,0.10)',

  /* 语义色 */
  danger: '#E5484D',
  success: '#059669',
  white: '#FFFFFF',

  /* 表单与卡片 */
  inputBg: '#F0F6F3',
  inputBorder: '#DCE8E2',
  placeholder: '#9CA8A2',
  cardIconBg: 'rgba(14,165,105,0.12)',
  primaryLight: 'rgba(14,165,105,0.10)',
};

/** 营养素元数据 */
export const MACROS = [
  { key: 'protein', label: '蛋白质', unit: 'g', color: C.protein },
  { key: 'carbs', label: '碳水', unit: 'g', color: C.carbs },
  { key: 'fat', label: '脂肪', unit: 'g', color: C.fat },
] as const;

export type MacroKey = (typeof MACROS)[number]['key'];
# Expo App + Express.js

## 目录结构规范（严格遵循）

当前仓库是一个 monorepo（基于 pnpm 的 workspace）

- Expo 代码在 client 目录，Express.js 代码在 server 目录
- 本模板默认无 Tab Bar，可按需改造

├── client/                     # React Native 前端代码
│   ├── app/                    # Expo Router 路由目录（仅路由配置）
│   │   ├── _layout.tsx         # 根布局文件（必需，务必阅读）
│   │   └── index.tsx           # 首页
│   ├── screens/                # 页面实现目录（与 app/ 路由对应）
│   │   └── demo/               # 示例页面
│   │       └── index.tsx
│   ├── components/             # 可复用组件
│   │   └── Screen.tsx          # 页面容器组件（必用）
│   ├── hooks/                  # 自定义 Hooks
│   ├── contexts/               # React Context 代码
│   ├── utils/                  # 工具函数
│   ├── assets/                 # 静态资源
|   └── package.json            # Expo 应用 package.json
├── server/                     # 服务端代码根目录 (Express.js)
|   ├── src/
│   │   └── index.ts            # 服务端入口文件
|   └── package.json            # 服务端 package.json
├── package.json
├── .cozeproj                   # 预置脚手架脚本（禁止修改）
└── .coze                       # 配置文件（禁止修改）

## 样式方案

基于 tailwindcss 进行样式开发（底层基于 Uniwind）

写法示例：

```tsx
<View className="flex-1 bg-white dark:bg-gray-900 p-4"></View>
```

```tsx
<Text
  className="text-lg font-bold text-gray-900 dark:text-white"
  selectionColorClassName="accent-blue-500"
>
  Hello World
</Text>
```

Uniwind 官方文档：https://docs.uniwind.dev/llms.txt

## 如何进行静态校验（TSC + ESLint）

```bash
# 对 client 和 server 目录同时进行校验
pnpm -w lint:all

# 对 client 目录进行校验
pnpm -w lint:client

# 对 server 目录进行校验
pnpm -w lint:server
```

## 如何修改主题模式（跟随系统、固定暗色、固定亮色）

默认为跟随系统，如果用户明确指定为“暗色”或“亮色”，需要修改 `client/components/ColorSchemeUpdater.tsx` 的 `DEFAULT_THEME` 变量为合适的值

## 如何定制主题 design tokens

当前项目的**设计系统**基于 tailwindcss 实现，核心入口文件为 `client/global.css`，如果需要定制主题，应该**阅读并修改 `client/global.css` 文件**

## 路由及 Tab Bar 实现规范

### 方案一：无 Tab Bar（Stack 导航）

适用于线性流程应用，采用简化的目录结构：

```
client/app/
├── _layout.tsx         # 根布局（Stack 导航配置）
├── index.tsx           # 应用入口
├── detail.tsx          # 详情页（通过 params 传递数据）
└── +not-found.tsx      # 404 页面
```

**根布局配置** `client/app/_layout.tsx`：

以下仅为代码片段供写法参考

```tsx
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Screen name="index" />
  <Stack.Screen name="detail" />
</Stack>
```

**应用入口** `client/app/index.tsx`：
```tsx
export { default } from "@/screens/home";
```
> **禁止事项**：无 Tab Bar 场景下，不得创建 `(tabs)` 目录。

### 方案二：有 Tab Bar（Tabs 导航）

采用路由分组实现底部导航栏：
```
client/app/
├── _layout.tsx              # 根布局
├── (tabs)/
│   ├── _layout.tsx          # Tab 导航配置
│   ├── index.tsx            # 默认 Tab（必须存在）
│   ├── discover.tsx         # 发现页
│   └── profile.tsx          # 个人中心
├── detail.tsx               # Tab 外的独立页面（通过 params 传递数据）
└── +not-found.tsx
```
> **⚠️ [CRITICAL]**： `app/index.tsx` 优先级高于 `(tabs)/index.tsx`，会导致首页无 Tab Bar。**当有(tabs)/index.tsx时必须删除 `app/index.tsx`**。

**根布局配置** `client/app/_layout.tsx`：

以下仅为代码片段供写法参考

```tsx
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Screen name="(tabs)" />
  <Stack.Screen name="detail" />
</Stack>
```

**应用入口** `client/app/(tabs)/index.tsx`：
```tsx
export { default } from "@/screens/home";
```

**Tab 布局配置** `client/app/(tabs)/_layout.tsx`：

```tsx
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { useCSSVariable } from 'uniwind';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const [background, muted, accent, border] = useCSSVariable([
    '--color-background',
    '--color-muted',
    '--color-accent',
    '--color-border',
  ]) as string[];

  let tabBarStyle = {
    backgroundColor: background,
    borderTopWidth: 1,
    borderTopColor: border,
  };

  // 用于修复 Web 上高度异常的问题（这个 if 逻辑必须添加）
  if (Platform.OS === 'web') {
    tabBarStyle = {
      ...tabBarStyle,
      height: 'auto',
    }
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: muted,
      }}
    >
      {/* name 必须与文件名完全一致 */}
      <Tabs.Screen
        name="index"
        options={{
          title: '首页',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="house" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: '发现',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="compass" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="user" size={20} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

**Tab 页面文件** `client/app/(tabs)/index.tsx`：
```tsx
export { default } from "@/screens/home";
```

### 注意事项

在改动 `client/app/_layout.tsx` 前，必须先阅读该文件，再进行修改操作

以下是需要保留的重要逻辑

- 保留 global.css 引入（tailwindcss 生效的关键）
- 保留 Provider 的使用

## 依赖管理与模块导入规范

### 依赖安装
**禁止**使用 `npm` 或 `yarn`，按目录区分安装命令：

| 目录 | 安装命令 | 说明 |
|------|----------|------|
| `client/` | `npx expo install <package>` | Expo 会自动选择与 SDK 兼容的版本 |
| `server/` | `pnpm add <package>` | 使用 pnpm 管理后端依赖 |

```bash
# client 目录（Expo 项目）
cd client && npx expo install expo-camera expo-image-picker

# server 目录（Express 项目）
cd server && pnpm add axios cors
```

**网络问题处理**：`npx expo install` 可能因网络原因失败，失败时重试 2 次，仍失败则改用 `pnpm add` 安装

## Expo 开发规范

### 路径别名

Expo 配置了 `@/` 路径别名指向 `client/` 目录：

```tsx
// 正确
import { Screen } from '@/components/Screen';

// 避免相对路径
import { Screen } from '../../../components/Screen';
```

## 本地开发

`coze-dev dev`：用来首次启动前后端服务，也可以用来重启前后端服务（该命令会先尝试杀掉占用端口的进程，再启动服务）

---

## 每日摄入营养素游戏化记录工具（本仓库当前应用）

一款安卓端营养记录 App：设定目标 → 拍照 AI 识别或手动录入食物 → 以游戏化仪表盘查看每日热量与三大营养素进度。

### 功能一览

- **目标设定（onboarding）**：选择「减脂 / 保持 / 增重」目标，填写性别、身高、体重、年龄、活动量，实时预览并保存每日热量与三大营养素推荐摄入（Mifflin-St Jeor 公式）。
- **饮食记录（add-food）**：
  - **拍照识别**：拍摄或从相册选择食物照片 → 点击「AI 识别营养成分」→ 后端视觉大模型返回食物名称、分量与营养成分，可在保存前微调。
  - **手动输入**：填写食物名称与分量后，AI 会自动估算热量与三大营养素；也支持手动修改任意数值。
- **每日进度仪表盘（home）**：环形热量仪表盘 + 三大营养素进度条，展示今日完成度；下方展示今日记录列表，支持删除单条。
- **AI 设置（settings）**：首页点击右上角设置图标，可自主选择 AI 模型并填写自己的 API Key；不填则使用系统默认模型。设置同样保存在 AsyncStorage。
- **本地持久化**：用户目标、AI 设置与饮食记录均存入 AsyncStorage，无需后端数据库，重启不丢失。

### 技术说明

- **AI 识别已接入真实多模态大模型**：后端 `server/src/routes/food.ts` 提供 `/api/v1/food/analyze`（图片识别）与 `/api/v1/food/estimate`（名称+重量估算）两个接口，分别调用支持图像输入的 LLM，返回结构化营养数据。
- **前端接入点**：`client/screens/add-food/aiFoodRecognition.ts` 负责图片 FormData 上传与文本估算请求。后续若需切换模型或增加缓存，只需修改后端路由与此前端文件。
- **依赖技术栈**：React Native / Expo 54、Expo Router（Stack 导航）、AsyncStorage、react-native-svg、expo-image-picker、expo-haptics、tailwindcss(uniwind)、coze-coding-dev-sdk（后端 LLM SDK）。

### 本地预览（Expo Go）

> AI 识别需要后端服务在线；用户数据仍保存在本地 AsyncStorage。

1. 安装依赖（根目录已配置 pnpm workspace，一次安装即可）：
   ```bash
   pnpm install
   ```
2. 启动前后端开发服务：
   ```bash
   cd /workspace/projects && coze dev
   # 或分别启动：
   # cd server && pnpm run dev
   # cd client && npx expo start
   ```
3. 手机安装 **Expo Go**（Android / iOS 应用商店均可下载），确保手机与电脑在同一局域网。
4. 用 Expo Go 扫描终端显示的 **QR 码**，即可在手机上打开并体验 App。
   - 也支持 Web 预览：按终端提示按 `w`，或访问 `http://localhost:5000`。
5. 首次进入会引导设定目标；之后可在首页右下角「＋」按钮记录一餐。

### 目录结构（核心）

```
client/
├── app/                    # 路由配置（仅 re-export）
│   ├── _layout.tsx         # Stack 根布局
│   ├── index.tsx           # 首页 = 每日进度仪表盘
│   ├── add-food.tsx        # 记录一餐
│   ├── onboarding.tsx      # 目标设定
│   └── settings.tsx        # AI 设置
├── screens/
│   ├── home/               # 仪表盘页面
│   ├── add-food/           # 记录页面 + aiFoodRecognition.ts（AI 识别接入点）
│   ├── onboarding/         # 目标设定页面
│   └── settings/           # AI 设置页面
├── components/             # Screen / ProgressRing / MacroBar
├── utils/                  # calc.ts(热量计算) / storage.ts(AsyncStorage)
└── constants/colors.ts     # 健康翡翠配色 tokens
```

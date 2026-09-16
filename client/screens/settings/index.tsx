import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import {
  getAISettings,
  saveAISettings,
  AVAILABLE_MODELS,
  DEFAULT_AI_SETTINGS,
  type AISettings,
} from '@/utils/storage';
import { C } from '@/constants/colors';

export default function SettingsScreen() {
  const router = useSafeRouter();
  const [settings, setSettings] = useState<AISettings>(DEFAULT_AI_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    getAISettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await saveAISettings(settings);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setSavedMessage('设置已保存');
    setSaving(false);
    setTimeout(() => setSavedMessage(''), 2000);
  };

  const updateKey = (apiKey: string) => setSettings((s) => ({ ...s, apiKey }));
  const updateModel = (model: string) => {
    setSettings((s) => ({ ...s, model }));
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
  };

  if (loading) {
    return (
      <Screen className="flex-1 bg-slate-50 px-5 pt-4">
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: C.muted }}>加载中…</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen className="flex-1 bg-slate-50 px-5 pt-4">
      {/* Header */}
      <View className="mb-6 flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-white"
          style={{ shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 }}
          activeOpacity={0.8}
        >
          <FontAwesome6 name="arrow-left" size={18} color={C.text} />
        </TouchableOpacity>
        <Text
          className="flex-1 text-center text-2xl font-semibold"
          style={{ color: C.text }}
          allowFontScaling={false}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          AI 设置
        </Text>
        <View className="h-10 w-10" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          <Text className="mb-6 text-sm" style={{ color: C.muted }}>
            默认使用系统内置模型；你也可以填入自己的 API Key 并选择模型，所有调用都会携带你的凭据。
          </Text>

          {/* Model selection */}
          <View
            className="mb-5 rounded-3xl bg-white p-5"
            style={{ shadowColor: C.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 }}
          >
            <View className="mb-4 flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: C.cardIconBg }}>
                <FontAwesome6 name="robot" size={18} color={C.primary} />
              </View>
              <Text className="text-lg font-semibold" style={{ color: C.text }}>
                选择模型
              </Text>
            </View>

            {AVAILABLE_MODELS.map((m) => {
              const selected = settings.model === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  activeOpacity={0.8}
                  onPress={() => updateModel(m.id)}
                  className="mb-3 flex-row items-center justify-between rounded-2xl border-2 p-4"
                  style={{
                    borderColor: selected ? C.primary : C.inputBorder,
                    backgroundColor: selected ? C.primaryLight : C.inputBg,
                  }}
                >
                  <View className="flex-1">
                    <Text className="text-base font-semibold" style={{ color: selected ? C.primaryDark : C.text }}>
                      {m.name}
                    </Text>
                    <Text className="mt-1 text-xs" style={{ color: C.muted }}>
                      {m.vision ? '支持图片识别' : '仅文本估算'}
                    </Text>
                  </View>
                  <View
                    className="h-6 w-6 items-center justify-center rounded-full border-2"
                    style={{ borderColor: selected ? C.primary : C.inputBorder, backgroundColor: selected ? C.primary : 'transparent' }}
                  >
                    {selected && <FontAwesome6 name="check" size={12} color="#FFFFFF" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* API Key input */}
          <View
            className="mb-5 rounded-3xl bg-white p-5"
            style={{ shadowColor: C.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 }}
          >
            <View className="mb-4 flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: C.cardIconBg }}>
                <FontAwesome6 name="key" size={18} color={C.primary} />
              </View>
              <Text className="text-lg font-semibold" style={{ color: C.text }}>
                API Key
              </Text>
            </View>

            <View className="flex-row items-center rounded-2xl border-2 px-4 py-1" style={{ backgroundColor: C.inputBg, borderColor: C.inputBorder }}>
              <TextInput
                value={settings.apiKey}
                onChangeText={updateKey}
                placeholder="留空则使用系统默认 API Key"
                placeholderTextColor={C.placeholder}
                secureTextEntry={!showKey}
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1 py-3.5 text-base"
                style={{ color: C.text }}
              />
              <TouchableOpacity onPress={() => setShowKey((v) => !v)} className="ml-2 p-2">
                <FontAwesome6 name={showKey ? 'eye-slash' : 'eye'} size={18} color={C.muted} />
              </TouchableOpacity>
            </View>

            <Text className="mt-3 text-xs leading-5" style={{ color: C.muted }}>
              你的 API Key 只会保存在本机 AsyncStorage 中，不会上传到除 AI 服务以外的任何服务器。
            </Text>
          </View>

          {/* Goal edit shortcut */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.navigate('/onboarding')}
            className="mb-5 flex-row items-center justify-between rounded-3xl bg-white p-5"
            style={{ shadowColor: C.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 }}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: C.cardIconBg }}>
                <FontAwesome6 name="sliders" size={18} color={C.primary} />
              </View>
              <View>
                <Text className="text-base font-semibold" style={{ color: C.text }}>
                  修改目标与身体数据
                </Text>
                <Text className="mt-0.5 text-xs" style={{ color: C.muted }}>
                  调整减脂/增重目标和基础信息
                </Text>
              </View>
            </View>
            <FontAwesome6 name="chevron-right" size={16} color={C.muted} />
          </TouchableOpacity>

          {/* Save button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={saving}
            className="w-full rounded-2xl px-6 py-4 items-center justify-center"
            style={{
              backgroundColor: saving ? C.primaryLight : C.primary,
              shadowColor: C.shadow,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.12,
              shadowRadius: 16,
            }}
          >
            <Text
              className="text-base font-semibold"
              style={{ color: saving ? C.primary : '#FFFFFF' }}
              allowFontScaling={false}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {saving ? '保存中…' : '保存设置'}
            </Text>
          </TouchableOpacity>

          {savedMessage ? (
            <View className="mt-4 items-center">
              <Text className="text-sm font-medium" style={{ color: C.success }}>
                {savedMessage}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

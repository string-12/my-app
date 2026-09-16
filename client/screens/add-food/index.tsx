import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { C } from '@/constants/colors';
import { Screen } from '@/components/Screen';
import {
  analyzeFoodImage,
  estimateFoodNutrition,
  RecognizedFood,
} from '@/screens/add-food/aiFoodRecognition';
import { addRecord, dayKey, FoodSource } from '@/utils/storage';
import { useSafeRouter } from '@/hooks/useSafeRouter';

type Tab = 'photo' | 'manual';

const inputClass = 'rounded-2xl px-4 py-3 text-base';
const inputStyle = { backgroundColor: C.field, color: C.text } as const;

export default function AddFoodPage() {
  const router = useSafeRouter();
  const [tab, setTab] = useState<Tab>('photo');

  // 拍照识别状态
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [bio, setBio] = useState<RecognizedFood | null>(null);

  // 手动输入状态
  const [mName, setMName] = useState('');
  const [mAmount, setMAmount] = useState('');
  const [mCal, setMCal] = useState('');
  const [mProtein, setMProtein] = useState('');
  const [mCarbs, setMCarbs] = useState('');
  const [mFat, setMFat] = useState('');
  const [manualEstimating, setManualEstimating] = useState(false);

  const [saving, setSaving] = useState(false);

  // 手动输入：输入名称和重量后自动调用 AI 估算营养成分
  useEffect(() => {
    const name = mName.trim();
    const grams = Number(mAmount);
    if (!name || !grams || grams <= 0) return;
    if (mCal || mProtein || mCarbs || mFat) return;

    const timer = setTimeout(async () => {
      try {
        setManualEstimating(true);
        const res = await estimateFoodNutrition(name, grams);
        setMCal(String(res.calories));
        setMProtein(String(res.protein));
        setMCarbs(String(res.carbs));
        setMFat(String(res.fat));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // 估算失败时保持空白，由用户手动填写
      } finally {
        setManualEstimating(false);
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [mName, mAmount, mCal, mProtein, mCarbs, mFat]);

  /** 选择图片来源（拍照 / 相册） */
  const pickImage = async (fromCamera: boolean) => {
    setBio(null);
    setImageUri(null);
    try {
      let result: ImagePicker.ImagePickerResult;
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Toast.show({ type: 'error', text1: '需要相机权限才能拍摄' });
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.8,
        });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Toast.show({ type: 'error', text1: '需要相册权限才能选择' });
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.8,
        });
      }
      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: '选择图片失败，请重试' });
    }
  };

  /** 触发 AI 识别 */
  const runAnalyze = async () => {
    if (!imageUri) return;
    setAnalyzing(true);
    setBio(null);
    try {
      // 🔌 接入点：真实模型 API（见 aiFoodRecognition.ts）
      const res = await analyzeFoodImage(imageUri);
      setBio(res);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Toast.show({ type: 'error', text1: '识别失败，请重试或手动输入' });
    } finally {
      setAnalyzing(false);
    }
  };

  const saveRecord = async (payload: {
    name: string;
    amountGram: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    source: FoodSource;
  }) => {
    const { name, calories } = payload;
    if (!name.trim() || !calories || calories <= 0) {
      Toast.show({ type: 'error', text1: '请至少填写食物名称与热量' });
      return false;
    }
    setSaving(true);
    await addRecord({ ...payload, day: dayKey(), imageUri: imageUri ?? undefined });
    setSaving(false);
    Toast.show({ type: 'success', text1: '记录已保存' });
    router.back();
    return true;
  };

  /** 手动输入保存 */
  const handleManualSave = () => {
    saveRecord({
      name: mName,
      amountGram: Number(mAmount) || 0,
      calories: Number(mCal) || 0,
      protein: Number(mProtein) || 0,
      carbs: Number(mCarbs) || 0,
      fat: Number(mFat) || 0,
      source: 'manual',
    });
  };

  /** AI 结果保存（使用编辑后的字段） */
  const handleBioSave = (fields: {
    name: string;
    amountGram: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }) => {
    saveRecord({ ...fields, source: 'photo-ai' });
  };

  return (
    <Screen statusBarStyle="dark" safeAreaEdges={['top', 'left', 'right']}>
      {/* 顶部标题 */}
      <View className="px-5 pt-2 pb-3">
        <Text
          className="text-2xl px-1"
          style={{ color: C.primaryDark }}
          allowFontScaling={false}
        >
          记录一餐
        </Text>
      </View>

      {/* 分段切换 */}
      <View className="mx-5 mb-4 rounded-2xl p-1 flex-row" style={{ backgroundColor: C.field }}>
        {(
          [
            { k: 'photo' as Tab, l: '拍照识别' },
            { k: 'manual' as Tab, l: '手动输入' },
          ] as { k: Tab; l: string }[]
        ).map((t) => {
          const active = tab === t.k;
          return (
            <TouchableOpacity
              key={t.k}
              className="flex-1 py-2.5 rounded-xl items-center"
              style={{ backgroundColor: active ? '#fff' : 'transparent', ...shadow() }}
              onPress={() => setTab(t.k)}
            >
              <Text className="text-sm px-1" style={{ color: active ? C.primaryDark : C.muted }} allowFontScaling={false}>
                {t.l}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {tab === 'photo' ? (
          <View>
            {/* 图片选择区 */}
            {imageUri ? (
              <Image
                className="w-full h-52 rounded-3xl mb-4"
                style={{ backgroundColor: C.field }}
                source={imageUri}
                contentFit="cover"
              />
            ) : (
              <View className="w-full h-52 rounded-3xl overflow-hidden">
                <TouchableOpacity
                  className="flex-1 items-center justify-center"
                  style={{ backgroundColor: C.field }}
                  onPress={() => pickImage(false)}
                >
                  <Ionicons name="camera-outline" size={40} color={C.muted} />
                  <Text className="mt-2 text-sm px-1" style={{ color: C.text }} allowFontScaling={false}>
                    点击选择食物照片
                  </Text>
                  <Text className="mt-1 text-xs px-1" style={{ color: C.muted }} allowFontScaling={false}>
                    从相册选择或拍摄
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 操作按钮 */}
            <View className="flex-row gap-3 mb-5">
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center rounded-2xl py-3.5"
                style={{ backgroundColor: C.surface, ...shadow() }}
                onPress={() => pickImage(false)}
              >
                <Ionicons name="images-outline" size={18} color={C.primaryDark} />
                <Text className="ml-2 text-sm px-1" style={{ color: C.primaryDark }} allowFontScaling={false}>
                  相册
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center rounded-2xl py-3.5"
                style={{ backgroundColor: C.surface, ...shadow() }}
                onPress={() => pickImage(true)}
              >
                <Ionicons name="camera" size={18} color={C.primaryDark} />
                <Text className="ml-2 text-sm px-1" style={{ color: C.primaryDark }} allowFontScaling={false}>
                  拍照
                </Text>
              </TouchableOpacity>
            </View>

            {/* AI 识别按钮 */}
            {imageUri && !bio ? (
              <TouchableOpacity
                className="w-full rounded-2xl px-6 py-4 items-center flex-row justify-center"
                style={{ backgroundColor: C.primary, ...shadow() }}
                onPress={runAnalyze}
                disabled={analyzing}
              >
                {analyzing ? (
                  <>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text
                      className="ml-2.5 text-base text-white px-2"
                      allowFontScaling={false}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      AI 正在识别营养成分…
                    </Text>
                  </>
                ) : (
                  <Text
                    className="text-base text-white px-2"
                    allowFontScaling={false}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    AI 识别营养成分
                  </Text>
                )}
              </TouchableOpacity>
            ) : null}

            {/* 识别结果（可编辑） */}
            {bio ? <ResultForm bio={bio} imageUri={imageUri ?? undefined} saving={saving} onSave={handleBioSave} /> : null}
          </View>
        ) : (
          <View>
            <Field label="食物名称 *" value={mName} onChange={setMName} placeholder="如：香煎鸡胸肉" />
            <Field label="分量 (克)" value={mAmount} onChange={(t) => setMAmount(num(t))} placeholder="150" />

            {manualEstimating ? (
              <View className="flex-row items-center mb-4">
                <ActivityIndicator size="small" color={C.primary} />
                <Text className="ml-2 text-sm" style={{ color: C.muted }}>
                  AI 正在根据名称和重量估算营养…
                </Text>
              </View>
            ) : (
              <Text className="mb-4 text-xs" style={{ color: C.muted }}>
                输入食物名称和重量后，AI 会自动估算热量与三大营养素，你也可手动修改。
              </Text>
            )}

            <Field label="热量 (kcal) *" value={mCal} onChange={(t) => setMCal(num(t))} placeholder="200" />
            <Field label="蛋白质 (g)" value={mProtein} onChange={(t) => setMProtein(num(t))} placeholder="20" />
            <Field label="碳水化合物 (g)" value={mCarbs} onChange={(t) => setMCarbs(num(t))} placeholder="30" />
            <Field label="脂肪 (g)" value={mFat} onChange={(t) => setMFat(num(t))} placeholder="8" />

            <TouchableOpacity
              className="w-full mt-6 rounded-2xl px-6 py-4 items-center justify-center"
              style={{ backgroundColor: C.primaryDark, ...shadow() }}
              onPress={handleManualSave}
              disabled={saving}
            >
              <Text
                className="text-base text-white px-2"
                allowFontScaling={false}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                保存记录
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const num = (t: string) => t.replace(/[^0-9.]/g, '');

/** AI 识别结果编辑表单 */
function ResultForm({
  bio,
  imageUri,
  saving,
  onSave,
}: {
  bio: RecognizedFood;
  imageUri?: string;
  saving: boolean;
  onSave: (fields: {
    name: string;
    amountGram: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }) => void;
}) {
  const [name, setName] = useState(bio.name);
  const [amount, setAmount] = useState(String(bio.amountGram));
  const [cal, setCal] = useState(String(bio.calories));
  const [protein, setProtein] = useState(String(bio.protein));
  const [carbs, setCarbs] = useState(String(bio.carbs));
  const [fat, setFat] = useState(String(bio.fat));

  // 用户是否手动修改过三大营养素/热量字段
  const [macrosManuallyEdited, setMacrosManuallyEdited] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [amountTouched, setAmountTouched] = useState(false);
  const [autoEstimating, setAutoEstimating] = useState(false);

  // AI 识别结果：修改食物名称或重量后自动重新估算营养成分
  useEffect(() => {
    const n = name.trim();
    const grams = Number(amount);
    if (!n || !grams || grams <= 0) return;
    if (!nameTouched && !amountTouched) return;
    if (macrosManuallyEdited) return;

    const timer = setTimeout(async () => {
      try {
        setAutoEstimating(true);
        const res = await estimateFoodNutrition(n, grams);
        setCal(String(res.calories));
        setProtein(String(res.protein));
        setCarbs(String(res.carbs));
        setFat(String(res.fat));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // 估算失败时保留当前值，不覆盖
      } finally {
        setAutoEstimating(false);
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [name, amount, nameTouched, amountTouched, macrosManuallyEdited]);

  return (
    <View className="mt-5 rounded-3xl p-5" style={{ backgroundColor: C.surface, ...shadow() }}>
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center flex-1">
          {imageUri ? (
            <Image
              className="w-12 h-12 rounded-xl mr-3"
              source={imageUri}
              contentFit="cover"
            />
          ) : null}
          <View className="flex-1">
            <Text className="text-base pr-2" style={{ color: C.primaryDark }} allowFontScaling={false}>
              识别结果
            </Text>
            <Text className="text-xs pr-2" style={{ color: C.muted }} allowFontScaling={false}>
              可修改名称或重量，AI 会自动重算营养
            </Text>
          </View>
        </View>
        <Text className="text-xs px-2 py-1 rounded-full" style={{ color: C.primary, backgroundColor: `${C.primary}22` }} allowFontScaling={false}>
          可信度 {(bio.confidence * 100).toFixed(0)}%
        </Text>
      </View>

      <Field label="食物名称 *" value={name} onChange={(t) => { setName(t); setNameTouched(true); }} />
      <RowFields
        left={{ label: '分量 (克)', value: amount, onChange: (t) => { setAmount(num(t)); setAmountTouched(true); } }}
        right={{ label: '热量 (kcal) *', value: cal, onChange: (t) => { setCal(num(t)); setMacrosManuallyEdited(true); } }}
      />
      <RowFields
        left={{ label: '蛋白质 (g)', value: protein, onChange: (t) => { setProtein(num(t)); setMacrosManuallyEdited(true); } }}
        right={{ label: '碳水 (g)', value: carbs, onChange: (t) => { setCarbs(num(t)); setMacrosManuallyEdited(true); } }}
      />
      <Field label="脂肪 (g)" value={fat} onChange={(t) => { setFat(num(t)); setMacrosManuallyEdited(true); }} />

      {autoEstimating ? (
        <View className="flex-row items-center mb-3">
          <ActivityIndicator size="small" color={C.primary} />
          <Text className="ml-2 text-sm" style={{ color: C.muted }}>
            AI 正在根据新的名称/重量重新估算营养…
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        className="w-full mt-4 rounded-2xl px-6 py-4 items-center justify-center"
        style={{ backgroundColor: C.primary, ...shadow() }}
        onPress={() =>
          onSave({
            name,
            amountGram: Number(amount) || 0,
            calories: Number(cal) || 0,
            protein: Number(protein) || 0,
            carbs: Number(carbs) || 0,
            fat: Number(fat) || 0,
          })
        }
        disabled={saving}
      >
        <Text
          className="text-base text-white px-2"
          allowFontScaling={false}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          保存这条识别
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  placeholder?: string;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-xs px-1" style={{ color: C.muted }} allowFontScaling={false}>
        {label}
      </Text>
      <TextInput
        className={inputClass}
        style={inputStyle}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9FABA5"
      />
    </View>
  );
}

function RowFields({
  left,
  right,
}: {
  left: { label: string; value: string; onChange: (t: string) => void };
  right: { label: string; value: string; onChange: (t: string) => void };
}) {
  return (
    <View className="flex-row gap-3 mb-4">
      <View className="flex-1">
        <Text className="mb-2 text-xs px-1" style={{ color: C.muted }} allowFontScaling={false}>
          {left.label}
        </Text>
        <TextInput className={inputClass} style={inputStyle} value={left.value} onChangeText={left.onChange} />
      </View>
      <View className="flex-1">
        <Text className="mb-2 text-xs px-1" style={{ color: C.muted }} allowFontScaling={false}>
          {right.label}
        </Text>
        <TextInput className={inputClass} style={inputStyle} value={right.value} onChangeText={right.onChange} />
      </View>
    </View>
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
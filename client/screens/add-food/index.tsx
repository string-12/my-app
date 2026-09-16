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
  type RecognizedFood,
  type RecognizedMeal,
} from '@/screens/add-food/aiFoodRecognition';
import { addRecord, dayKey, type FoodSource } from '@/utils/storage';
import { useSafeRouter } from '@/hooks/useSafeRouter';

type Tab = 'photo' | 'manual';
type EditableItem = RecognizedFood & { id: string };

const inputClass = 'rounded-2xl px-4 py-3 text-base';
const inputStyle = { backgroundColor: C.field, color: C.text } as const;

export default function AddFoodPage() {
  const router = useSafeRouter();
  const [tab, setTab] = useState<Tab>('photo');

  // 拍照识别状态
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [items, setItems] = useState<EditableItem[] | null>(null);

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
    setItems(null);
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
    setItems(null);
    try {
      // 🔌 接入点：真实模型 API（见 aiFoodRecognition.ts）
      const res: RecognizedMeal = await analyzeFoodImage(imageUri);
      setItems(
        res.items.map((it, idx) => ({
          ...it,
          id: `${Date.now()}-${idx}`,
        }))
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Toast.show({ type: 'error', text1: '识别失败，请重试或手动输入' });
    } finally {
      setAnalyzing(false);
    }
  };

  const updateItem = (id: string, patch: Partial<RecognizedFood>) => {
    setItems((prev) =>
      prev
        ? prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
        : prev
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => (prev ? prev.filter((it) => it.id !== id) : prev));
  };

  const total = items
    ? {
        calories: items.reduce((s, it) => s + (it.calories || 0), 0),
        protein: items.reduce((s, it) => s + (it.protein || 0), 0),
        carbs: items.reduce((s, it) => s + (it.carbs || 0), 0),
        fat: items.reduce((s, it) => s + (it.fat || 0), 0),
      }
    : null;

  /** 保存所有识别出的食物记录 */
  const handleSaveAll = async () => {
    if (!items || items.length === 0) return;
    if (items.some((it) => !it.name.trim())) {
      Toast.show({ type: 'error', text1: '请为每份食物填写名称' });
      return;
    }
    setSaving(true);
    try {
      const day = dayKey();
      await Promise.all(
        items.map((it) =>
          addRecord({
            name: it.name,
            amountGram: it.amountGram,
            calories: it.calories,
            protein: it.protein,
            carbs: it.carbs,
            fat: it.fat,
            source: 'photo-ai' as FoodSource,
            day,
            imageUri: imageUri ?? undefined,
          })
        )
      );
      Toast.show({ type: 'success', text1: `已保存 ${items.length} 条记录` });
      router.back();
    } catch {
      Toast.show({ type: 'error', text1: '保存失败，请重试' });
    } finally {
      setSaving(false);
    }
  };

  /** 手动输入保存 */
  const handleManualSave = () => {
    const name = mName.trim();
    const calories = Number(mCal) || 0;
    if (!name || !calories || calories <= 0) {
      Toast.show({ type: 'error', text1: '请至少填写食物名称与热量' });
      return;
    }
    setSaving(true);
    addRecord({
      name,
      amountGram: Number(mAmount) || 0,
      calories,
      protein: Number(mProtein) || 0,
      carbs: Number(mCarbs) || 0,
      fat: Number(mFat) || 0,
      source: 'manual',
      day: dayKey(),
      imageUri: undefined,
    })
      .then(() => {
        Toast.show({ type: 'success', text1: '记录已保存' });
        router.back();
      })
      .catch(() => {
        Toast.show({ type: 'error', text1: '保存失败，请重试' });
      })
      .finally(() => setSaving(false));
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
              <Text
                className="text-sm px-1"
                style={{ color: active ? C.primaryDark : C.muted }}
                allowFontScaling={false}
              >
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
            {imageUri && !items ? (
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

            {/* 识别结果：每份食物独立编辑 */}
            {items && items.length > 0 ? (
              <View className="mt-2">
                <Text className="mb-3 text-base px-1" style={{ color: C.text }} allowFontScaling={false}>
                  识别到 {items.length} 份食物，可单独修改名称和重量
                </Text>

                {items.map((it, idx) => (
                  <EditableItemCard
                    key={it.id}
                    index={idx}
                    item={it}
                    imageUri={imageUri ?? undefined}
                    onUpdate={updateItem}
                    onRemove={removeItem}
                  />
                ))}

                {/* 汇总 */}
                {total ? (
                  <View
                    className="rounded-3xl p-5 mb-5"
                    style={{ backgroundColor: C.surface, ...shadow() }}
                  >
                    <Text
                      className="text-base mb-3 px-1"
                      style={{ color: C.text }}
                      allowFontScaling={false}
                    >
                      这餐汇总
                    </Text>
                    <View className="flex-row justify-between mb-2">
                      <Text className="text-sm px-1" style={{ color: C.muted }} allowFontScaling={false}>
                        总热量
                      </Text>
                      <Text className="text-base px-1" style={{ color: C.primaryDark }} allowFontScaling={false}>
                        {total.calories} kcal
                      </Text>
                    </View>
                    <View className="flex-row justify-between mb-2">
                      <Text className="text-sm px-1" style={{ color: C.muted }} allowFontScaling={false}>
                        蛋白质
                      </Text>
                      <Text className="text-base px-1" style={{ color: C.primaryDark }} allowFontScaling={false}>
                        {total.protein} g
                      </Text>
                    </View>
                    <View className="flex-row justify-between mb-2">
                      <Text className="text-sm px-1" style={{ color: C.muted }} allowFontScaling={false}>
                        碳水
                      </Text>
                      <Text className="text-base px-1" style={{ color: C.primaryDark }} allowFontScaling={false}>
                        {total.carbs} g
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-sm px-1" style={{ color: C.muted }} allowFontScaling={false}>
                        脂肪
                      </Text>
                      <Text className="text-base px-1" style={{ color: C.primaryDark }} allowFontScaling={false}>
                        {total.fat} g
                      </Text>
                    </View>
                  </View>
                ) : null}

                <TouchableOpacity
                  className="w-full rounded-2xl px-6 py-4 items-center justify-center"
                  style={{ backgroundColor: C.primaryDark, ...shadow() }}
                  onPress={handleSaveAll}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text
                      className="text-base text-white px-2"
                      allowFontScaling={false}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      保存这餐记录
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
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

/** 可单独编辑的每份食物卡片 */
function EditableItemCard({
  index,
  item,
  imageUri,
  onUpdate,
  onRemove,
}: {
  index: number;
  item: EditableItem;
  imageUri?: string;
  onUpdate: (id: string, patch: Partial<RecognizedFood>) => void;
  onRemove: (id: string) => void;
}) {
  const [name, setName] = useState(item.name);
  const [amount, setAmount] = useState(String(item.amountGram));
  const [macrosManual, setMacrosManual] = useState(false);
  const [estimating, setEstimating] = useState(false);

  // 当名称或重量改变时，若用户未手动修改过营养素，则自动重新估算
  useEffect(() => {
    const grams = Number(amount);
    if (!name.trim() || !grams || grams <= 0) return;
    if (macrosManual) return;

    const timer = setTimeout(async () => {
      try {
        setEstimating(true);
        const res = await estimateFoodNutrition(name.trim(), grams);
        onUpdate(item.id, {
          name: name.trim(),
          amountGram: grams,
          calories: res.calories,
          protein: res.protein,
          carbs: res.carbs,
          fat: res.fat,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // 估算失败时不覆盖，保持当前值
      } finally {
        setEstimating(false);
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [name, amount, macrosManual, item.id]);

  const handleMacroChange = (field: keyof RecognizedFood, value: string) => {
    setMacrosManual(true);
    const numValue = Number(value) || 0;
    onUpdate(item.id, { [field]: numValue } as Partial<RecognizedFood>);
  };

  return (
    <View className="rounded-3xl p-5 mb-4" style={{ backgroundColor: C.surface, ...shadow() }}>
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-sm px-1" style={{ color: C.muted }} allowFontScaling={false}>
          食物 {index + 1}
        </Text>
        <TouchableOpacity onPress={() => onRemove(item.id)} className="px-2 py-1">
          <Text className="text-sm px-1" style={{ color: C.danger }} allowFontScaling={false}>
            删除
          </Text>
        </TouchableOpacity>
      </View>

      {imageUri ? (
        <Image
          className="w-full h-28 rounded-2xl mb-4"
          source={imageUri}
          contentFit="cover"
          style={{ backgroundColor: C.field }}
        />
      ) : null}

      <View className="mb-3">
        <Text className="text-sm mb-1.5 px-1" style={{ color: C.text }} allowFontScaling={false}>
          名称
        </Text>
        <TextInput
          className={inputClass}
          style={inputStyle}
          value={name}
          onChangeText={(t) => {
            setName(t);
            onUpdate(item.id, { name: t.trim() });
          }}
          placeholder="如：米饭"
          placeholderTextColor={C.placeholder}
          allowFontScaling={false}
        />
      </View>

      <View className="mb-3">
        <Text className="text-sm mb-1.5 px-1" style={{ color: C.text }} allowFontScaling={false}>
          重量 (克)
        </Text>
        <TextInput
          className={inputClass}
          style={inputStyle}
          value={amount}
          onChangeText={(t) => {
            const v = num(t);
            setAmount(v);
            onUpdate(item.id, { amountGram: Number(v) || 0 });
          }}
          placeholder="150"
          keyboardType="numeric"
          placeholderTextColor={C.placeholder}
          allowFontScaling={false}
        />
      </View>

      {estimating ? (
        <View className="flex-row items-center mb-3">
          <ActivityIndicator size="small" color={C.primary} />
          <Text className="ml-2 text-sm" style={{ color: C.muted }}>
            AI 正在根据新的名称/重量重新估算…
          </Text>
        </View>
      ) : null}

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Text className="text-xs mb-1 px-1" style={{ color: C.muted }} allowFontScaling={false}>
            热量
          </Text>
          <TextInput
            className={`${inputClass} text-center`}
            style={inputStyle}
            value={String(item.calories || 0)}
            onChangeText={(t) => handleMacroChange('calories', num(t))}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={C.placeholder}
            allowFontScaling={false}
          />
        </View>
        <View className="flex-1">
          <Text className="text-xs mb-1 px-1" style={{ color: C.muted }} allowFontScaling={false}>
            蛋白质
          </Text>
          <TextInput
            className={`${inputClass} text-center`}
            style={inputStyle}
            value={String(item.protein || 0)}
            onChangeText={(t) => handleMacroChange('protein', num(t))}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={C.placeholder}
            allowFontScaling={false}
          />
        </View>
        <View className="flex-1">
          <Text className="text-xs mb-1 px-1" style={{ color: C.muted }} allowFontScaling={false}>
            碳水
          </Text>
          <TextInput
            className={`${inputClass} text-center`}
            style={inputStyle}
            value={String(item.carbs || 0)}
            onChangeText={(t) => handleMacroChange('carbs', num(t))}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={C.placeholder}
            allowFontScaling={false}
          />
        </View>
        <View className="flex-1">
          <Text className="text-xs mb-1 px-1" style={{ color: C.muted }} allowFontScaling={false}>
            脂肪
          </Text>
          <TextInput
            className={`${inputClass} text-center`}
            style={inputStyle}
            value={String(item.fat || 0)}
            onChangeText={(t) => handleMacroChange('fat', num(t))}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={C.placeholder}
            allowFontScaling={false}
          />
        </View>
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
}) {
  return (
    <View className="mb-4">
      <Text className="text-sm mb-1.5 px-1" style={{ color: C.text }} allowFontScaling={false}>
        {label}
      </Text>
      <TextInput
        className={inputClass}
        style={inputStyle}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.placeholder}
        keyboardType={keyboardType}
        allowFontScaling={false}
      />
    </View>
  );
}

function shadow() {
  return {
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  };
}

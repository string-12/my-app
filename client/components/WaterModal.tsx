import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { C } from '@/constants/colors';
import { addWaterRecord } from '@/utils/storage';
import { analyzeWaterImage } from '@/screens/add-food/aiFoodRecognition';

interface WaterModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const QUICK_AMOUNTS = [100, 200, 500];

export default function WaterModal({ visible, onClose, onSaved }: WaterModalProps) {
  const [amount, setAmount] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = useCallback(() => {
    setAmount('');
    setImageUri(null);
    setAnalyzing(false);
    setSaving(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const pickImage = async (source: 'camera' | 'library') => {
    try {
      Haptics.selectionAsync();
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              allowsEditing: false,
              quality: 0.8,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: false,
              quality: 0.8,
            });

      if (!result.canceled && result.assets[0]?.uri) {
        const uri = result.assets[0].uri;
        setImageUri(uri);
        setAnalyzing(true);
        try {
          const recognized = await analyzeWaterImage(uri);
          setAmount(String(recognized.amountMl));
        } catch (err) {
          // 识别失败保留图片，让用户手动输入
        } finally {
          setAnalyzing(false);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleSave = async () => {
    const ml = Math.max(0, Math.round(parseInt(amount, 10) || 0));
    if (ml <= 0) return;
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addWaterRecord({
      day: new Date().toISOString().slice(0, 10),
      amountMl: ml,
      source: imageUri ? 'photo-ai' : 'manual',
      imageUri: imageUri || undefined,
    });
    setSaving(false);
    reset();
    onSaved();
  };

  const amountNum = parseInt(amount, 10) || 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={Platform.OS === 'web' ? undefined : Keyboard.dismiss}>
        <KeyboardAvoidingView
          className="flex-1 justify-end"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
        >
          <TouchableWithoutFeedback>
            <View
              className="rounded-t-[28px] bg-white px-5 pt-4 pb-8"
              style={{ backgroundColor: C.background }}
            >
              {/* Header */}
              <View className="mb-5 flex-row items-center justify-between">
                <Text className="text-xl px-1" style={{ color: C.text }} allowFontScaling={false}>
                  记录饮水
                </Text>
                <TouchableOpacity
                  onPress={handleClose}
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: C.cardIconBg }}
                >
                  <Ionicons name="close" size={20} color={C.muted} />
                </TouchableOpacity>
              </View>

              {/* Image preview */}
              {imageUri ? (
                <View className="mb-4 items-center">
                  <Image
                    source={{ uri: imageUri }}
                    className="h-36 w-full rounded-2xl"
                    resizeMode="cover"
                  />
                  {analyzing && (
                    <View className="absolute inset-0 items-center justify-center rounded-2xl bg-black/30">
                      <ActivityIndicator color="white" />
                      <Text className="mt-2 text-sm text-white" allowFontScaling={false}>
                        AI 正在估算水量…
                      </Text>
                    </View>
                  )}
                </View>
              ) : null}

              {/* Amount input */}
              <View className="mb-4">
                <Text className="mb-2 text-sm px-1" style={{ color: C.muted }} allowFontScaling={false}>
                  饮水量（ml）
                </Text>
                <View
                  className="flex-row items-center rounded-2xl px-4"
                  style={{ backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.inputBorder }}
                >
                  <Ionicons name="water" size={20} color={C.primary} />
                  <TextInput
                    className="ml-3 flex-1 py-3.5 text-lg"
                    style={{ color: C.text }}
                    placeholder="例如 250"
                    placeholderTextColor={C.placeholder}
                    keyboardType="number-pad"
                    value={amount}
                    onChangeText={setAmount}
                    allowFontScaling={false}
                  />
                  <Text className="text-sm" style={{ color: C.muted }} allowFontScaling={false}>
                    ml
                  </Text>
                </View>
              </View>

              {/* Quick add buttons */}
              <View className="mb-5 flex-row justify-between gap-3">
                {QUICK_AMOUNTS.map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setAmount(String((parseInt(amount, 10) || 0) + amt));
                    }}
                    className="flex-1 items-center rounded-2xl py-3"
                    style={{ backgroundColor: C.primaryLight }}
                  >
                    <Text className="text-sm px-1" style={{ color: C.primary }} allowFontScaling={false}>
                      +{amt}ml
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Photo buttons */}
              <View className="mb-5 flex-row justify-between gap-3">
                <TouchableOpacity
                  onPress={() => pickImage('camera')}
                  className="flex-1 flex-row items-center justify-center rounded-2xl py-3"
                  style={{ backgroundColor: C.cardIconBg }}
                >
                  <Ionicons name="camera" size={18} color={C.primary} />
                  <Text className="ml-2 text-sm px-1" style={{ color: C.primary }} allowFontScaling={false}>
                    拍照估算
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => pickImage('library')}
                  className="flex-1 flex-row items-center justify-center rounded-2xl py-3"
                  style={{ backgroundColor: C.cardIconBg }}
                >
                  <Ionicons name="image" size={18} color={C.primary} />
                  <Text className="ml-2 text-sm px-1" style={{ color: C.primary }} allowFontScaling={false}>
                    相册选图
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Footer */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={handleClose}
                  className="flex-1 items-center rounded-2xl border py-3.5 px-4"
                  style={{ borderColor: C.inputBorder }}
                >
                  <Text className="text-base px-1" style={{ color: C.muted }} allowFontScaling={false}>
                    取消
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={amountNum <= 0 || saving}
                  className="flex-1 items-center rounded-2xl py-3.5 px-4"
                  style={{ backgroundColor: amountNum > 0 ? C.primary : C.disabled }}
                >
                  {saving ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-base text-white px-1" allowFontScaling={false}>
                      保存
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

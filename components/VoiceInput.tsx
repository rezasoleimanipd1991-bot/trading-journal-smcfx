import { Feather } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";

interface VoiceInputProps extends TextInputProps {
  onVoiceResult?: (text: string) => void;
  containerStyle?: object;
  multiline?: boolean;
  minHeight?: number;
}

export function VoiceInput({
  onVoiceResult,
  containerStyle,
  multiline,
  minHeight,
  style,
  value,
  onChangeText,
  ...props
}: VoiceInputProps) {
  const colors = useColors();
  const { settings } = useApp();
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleVoice = async () => {
    if (Platform.OS === "web") {
      const win = window as unknown as {
        SpeechRecognition?: new () => SpeechRecognition;
        webkitSpeechRecognition?: new () => SpeechRecognition;
      };
      const SR = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (SR) {
        const recognition = new SR();
        recognition.lang = settings.language === "fa" ? "fa-IR" : "en-US";
        recognition.interimResults = false;
        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);
        recognition.onresult = (e: SpeechRecognitionEvent) => {
          const transcript = e.results[0][0].transcript;
          if (onVoiceResult) {
            onVoiceResult(transcript);
          } else if (onChangeText) {
            onChangeText((value ?? "") + transcript);
          }
        };
        recognition.start();
      } else {
        Alert.alert(
          settings.language === "fa"
            ? "تایپ صوتی پشتیبانی نمی‌شود"
            : "Voice typing not supported"
        );
      }
    } else {
      inputRef.current?.focus();
      Alert.alert(
        settings.language === "fa" ? "تایپ صوتی" : "Voice Input",
        settings.language === "fa"
          ? "پس از باز شدن صفحه‌کلید، روی آیکون میکروفون ضربه بزنید"
          : "After the keyboard opens, tap the microphone icon"
      );
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.input,
          borderColor: colors.border,
          minHeight: multiline ? minHeight ?? 80 : 44,
        },
        containerStyle,
      ]}
    >
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        style={[
          styles.input,
          {
            color: colors.text,
            textAlign: settings.language === "fa" ? "right" : "left",
            writingDirection: settings.language === "fa" ? "rtl" : "ltr",
            minHeight: multiline ? (minHeight ?? 80) - 8 : undefined,
          },
          style,
        ]}
        placeholderTextColor={colors.textTertiary}
        {...props}
      />
      <TouchableOpacity
        style={[
          styles.micBtn,
          {
            backgroundColor: isListening
              ? colors.red + "30"
              : colors.surface2,
          },
        ]}
        onPress={handleVoice}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather
          name="mic"
          size={16}
          color={isListening ? colors.red : colors.textTertiary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 8,
    fontFamily: "Inter_400Regular",
  },
  micBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 7,
    marginLeft: 6,
    flexShrink: 0,
  },
});

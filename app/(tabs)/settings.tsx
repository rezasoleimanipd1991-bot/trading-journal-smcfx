import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useApp, useT } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const BG_COLORS = [
  { label: "نیلی تیره", value: "#080e1c" },
  { label: "مشکی", value: "#0a0a0a" },
  { label: "خاکستری", value: "#12151c" },
  { label: "سبز تیره", value: "#070f0a" },
];

const FONT_SCALES = [
  { label: "کوچک", labelEn: "Small", value: 0.85 },
  { label: "متوسط", labelEn: "Medium", value: 1 },
  { label: "بزرگ", labelEn: "Large", value: 1.2 },
];

const ALL_TABS = [
  { key: "checklist", labelFa: "چک‌لیست", labelEn: "Checklist", icon: "check-square" as const, required: true },
  { key: "journal",   labelFa: "ژورنال",    labelEn: "Journal",   icon: "book-open" as const,   required: false },
  { key: "strategies",labelFa: "استراتژی",  labelEn: "Strategy",  icon: "layers" as const,      required: false },
  { key: "stats",     labelFa: "آمار",       labelEn: "Stats",     icon: "bar-chart-2" as const, required: false },
  { key: "academy",   labelFa: "آکادمی",     labelEn: "Academy",   icon: "book" as const,        required: false },
  { key: "settings",  labelFa: "تنظیمات",   labelEn: "Settings",  icon: "settings" as const,    required: true },
];

export default function SettingsScreen() {
  const colors = useColors();
  const t = useT();
  const { settings, updateSettings } = useApp();
  const isFa = settings.language === "fa";
  const hiddenTabs = settings.hiddenTabs ?? [];

  const topPad = Platform.OS === "web" ? 67 : 0;
  const bottomPad = Platform.OS === "web" ? 84 + 34 : 84;

  const clearData = () => {
    Alert.alert(t("clearData"), t("clearConfirm"), [
      { text: t("no"), style: "cancel" },
      {
        text: t("yes"),
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.clear();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert(t("dataCleared"));
        },
      },
    ]);
  };

  const toggleTab = (key: string, required: boolean) => {
    if (required) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const isHidden = hiddenTabs.includes(key);
    const next = isHidden
      ? hiddenTabs.filter((t) => t !== key)
      : [...hiddenTabs, key];
    updateSettings({ hiddenTabs: next });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 10, paddingBottom: bottomPad, paddingHorizontal: 14 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Language */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardTitle}>
            <Feather name="globe" size={13} color={colors.blue} />
            <Text style={[styles.cardTitleText, { color: colors.blue }]}>{t("language")}</Text>
          </View>
          <View style={styles.optionRow}>
            {(["fa", "en"] as const).map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.optionBtn,
                  {
                    backgroundColor: settings.language === lang ? colors.blue + "22" : colors.surface2,
                    borderColor: settings.language === lang ? colors.blue + "60" : colors.border,
                    flex: 1,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateSettings({ language: lang });
                  if (lang !== settings.language) {
                    setTimeout(() => {
                      Alert.alert(
                        lang === "fa" ? "تغییر زبان" : "Language Changed",
                        lang === "fa" ? t("restartRequired") : "Restart the app to apply changes"
                      );
                    }, 300);
                  }
                }}
              >
                <Text style={[styles.optionText, { color: settings.language === lang ? colors.blue : colors.textSecondary }]}>
                  {lang === "fa" ? "🇮🇷  فارسی" : "🇬🇧  English"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Background Color */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardTitle}>
            <Feather name="droplet" size={13} color={colors.purple} />
            <Text style={[styles.cardTitleText, { color: colors.purple }]}>{t("backgroundColor")}</Text>
          </View>
          <View style={styles.colorRow}>
            {BG_COLORS.map((c) => (
              <TouchableOpacity
                key={c.value}
                style={[
                  styles.colorSwatch,
                  {
                    backgroundColor: c.value,
                    borderColor: settings.bgColor === c.value ? colors.gold : colors.border,
                    borderWidth: settings.bgColor === c.value ? 2 : 1,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateSettings({ bgColor: c.value });
                }}
              >
                {settings.bgColor === c.value && <Feather name="check" size={16} color={colors.gold} />}
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.colorLabels}>
            {BG_COLORS.map((c) => (
              <Text key={c.value} style={[styles.colorLabel, { color: colors.textTertiary, flex: 1 }]}>
                {c.label}
              </Text>
            ))}
          </View>
        </View>

        {/* Font Scale */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardTitle}>
            <Feather name="type" size={13} color={colors.teal} />
            <Text style={[styles.cardTitleText, { color: colors.teal }]}>{t("fontScale")}</Text>
          </View>
          <View style={styles.optionRow}>
            {FONT_SCALES.map((fs) => (
              <TouchableOpacity
                key={fs.value}
                style={[
                  styles.optionBtn,
                  {
                    backgroundColor: settings.fontScale === fs.value ? colors.teal + "22" : colors.surface2,
                    borderColor: settings.fontScale === fs.value ? colors.teal + "60" : colors.border,
                    flex: 1,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateSettings({ fontScale: fs.value });
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: settings.fontScale === fs.value ? colors.teal : colors.textSecondary, fontSize: 11 * fs.value },
                  ]}
                >
                  {isFa ? fs.label : fs.labelEn}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tab Visibility */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardTitle}>
            <Feather name="layout" size={13} color={colors.orange} />
            <Text style={[styles.cardTitleText, { color: colors.orange }]}>{t("tabVisibility")}</Text>
          </View>
          <Text style={[styles.hintText, { color: colors.textTertiary }]}>{t("tabVisibilityHint")}</Text>
          {ALL_TABS.map((tab, idx) => {
            const isVisible = !hiddenTabs.includes(tab.key);
            const isLast = idx === ALL_TABS.length - 1;
            return (
              <View
                key={tab.key}
                style={[
                  styles.tabRow,
                  { borderBottomColor: colors.border, borderBottomWidth: isLast ? 0 : 1 },
                ]}
              >
                <View style={[styles.tabIconWrap, { backgroundColor: isVisible ? colors.orange + "18" : colors.surface2 }]}>
                  <Feather name={tab.icon} size={14} color={isVisible ? colors.orange : colors.textTertiary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tabLabel, { color: isVisible ? colors.text : colors.textTertiary }]}>
                    {isFa ? tab.labelFa : tab.labelEn}
                  </Text>
                  {tab.required && (
                    <Text style={[styles.tabRequired, { color: colors.textTertiary }]}>
                      {isFa ? "اجباری" : "Required"}
                    </Text>
                  )}
                </View>
                <Switch
                  value={isVisible}
                  onValueChange={() => toggleTab(tab.key, tab.required)}
                  disabled={tab.required}
                  trackColor={{ false: colors.surface2, true: colors.orange + "60" }}
                  thumbColor={isVisible ? colors.orange : colors.textTertiary}
                  ios_backgroundColor={colors.surface2}
                />
              </View>
            );
          })}
        </View>

        {/* About */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardTitle}>
            <Feather name="info" size={13} color={colors.textSecondary} />
            <Text style={[styles.cardTitleText, { color: colors.textSecondary }]}>
              {isFa ? "درباره" : "About"}
            </Text>
          </View>
          {[
            { key: isFa ? "نسخه" : "Version", val: "1.0.0", color: colors.textSecondary },
            { key: isFa ? "تایپ صوتی" : "Voice Typing", val: isFa ? "فعال" : "Active", color: colors.green },
            { key: isFa ? "خروجی" : "Export", val: "PDF + Excel", color: colors.blue },
            { key: isFa ? "باکس معاملاتی" : "Trading Box", val: isFa ? "فعال" : "Active", color: colors.gold },
            { key: isFa ? "آکادمی" : "Academy", val: isFa ? "فعال" : "Active", color: colors.teal },
          ].map((row, idx, arr) => (
            <View key={row.key} style={[styles.infoRow, { borderBottomColor: colors.border, borderBottomWidth: idx === arr.length - 1 ? 0 : 1 }]}>
              <Text style={[styles.infoKey, { color: colors.textTertiary }]}>{row.key}</Text>
              <Text style={[styles.infoVal, { color: row.color }]}>{row.val}</Text>
            </View>
          ))}
        </View>

        {/* Clear Data */}
        <TouchableOpacity
          style={[styles.dangerBtn, { backgroundColor: colors.red + "15", borderColor: colors.red + "40" }]}
          onPress={clearData}
        >
          <Feather name="trash-2" size={16} color={colors.red} />
          <Text style={[styles.dangerText, { color: colors.red }]}>{t("clearData")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {},
  card: { borderRadius: 14, padding: 14, marginBottom: 13, borderWidth: 1 },
  cardTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(100,180,255,0.12)",
  },
  cardTitleText: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  hintText: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 12, lineHeight: 16 },
  optionRow: { flexDirection: "row", gap: 8 },
  optionBtn: { alignItems: "center", paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  optionText: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  colorRow: { flexDirection: "row", gap: 10, marginBottom: 6 },
  colorSwatch: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  colorLabels: { flexDirection: "row" },
  colorLabel: { fontSize: 10, textAlign: "center", fontFamily: "Inter_400Regular" },
  tabRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  tabIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  tabRequired: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  infoKey: { fontSize: 12, fontFamily: "Inter_400Regular" },
  infoVal: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  dangerText: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
});

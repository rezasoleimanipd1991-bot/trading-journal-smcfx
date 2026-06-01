import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { VoiceInput } from "@/components/VoiceInput";
import { Trade, useApp, useT } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const PAIRS = ["XAU/USD", "EUR/USD", "GBP/USD", "BTC/USD", "NAS100"];
const ERRORS_FA = ["ورود زود","ورود دیر","FOMO","خلاف پلن","SL کوچک","انتقام","بدون تریگر","اورتریدینگ"];
const ERRORS_EN = ["Early Entry","Late Entry","FOMO","Against Plan","Small SL","Revenge","No Trigger","Overtrading"];
const EMOTIONS_FA = ["آرام","عصبی","ترسیده","هیجان‌زده","ناامید","مطمئن"];
const EMOTIONS_EN = ["Calm","Nervous","Fearful","Excited","Disappointed","Confident"];

function getPipMultiplier(pair: string): number {
  const p = pair.toUpperCase();
  if (p.includes("JPY")) return 100;
  if (p.includes("XAU") || p.includes("GOLD")) return 10;
  if (p.includes("BTC") || p.includes("ETH") || p.includes("NAS")) return 1;
  return 10000;
}

// ─── Helper: pick video on web using hidden file input ───────────────────────
function pickVideoWeb(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const url = URL.createObjectURL(file);
      resolve(url);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

export default function TradeFormScreen() {
  const colors = useColors();
  const t = useT();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { trades, strategies, settings, addTrade, updateTrade, updateSettings } = useApp();

  const existing = trades.find((tr) => tr.id === id);
  const isEdit = !!existing;

  const [pair, setPair] = useState(existing?.pair ?? "XAU/USD");
  const [customPair, setCustomPair] = useState("");
  const [direction, setDirection] = useState<"BUY" | "SELL">(existing?.direction ?? "BUY");
  const [strategyId, setStrategyId] = useState(existing?.strategyId ?? strategies[0]?.id ?? "");
  const [triggerId, setTriggerId] = useState(existing?.triggerId ?? "");
  const [entry, setEntry] = useState(existing?.entry ?? "");
  const [exit, setExit] = useState(existing?.exit ?? "");
  const [sl, setSl] = useState(existing?.sl ?? "");
  const [tp, setTp] = useState(existing?.tp ?? "");
  const [lot, setLot] = useState(existing?.lot ?? "");
  const [rr, setRr] = useState(existing?.rr ?? "");
  const [pnl, setPnl] = useState(existing?.pnl ?? "");
  const [result, setResult] = useState<"WIN" | "LOSS" | "BE">(existing?.result ?? "WIN");
  const [errors, setErrors] = useState<string[]>(existing?.errors ?? []);
  const [emotion, setEmotion] = useState(existing?.emotion ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [imageUrls, setImageUrls] = useState<string[]>(existing?.imageUrls ?? []);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [videoUris, setVideoUris] = useState<string[]>(existing?.videoUris ?? []);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const [pickingVideo, setPickingVideo] = useState(false);

  const selectedStrategy = strategies.find((s) => s.id === strategyId);
  const isFa = settings.language === "fa";
  const errorList = isFa ? ERRORS_FA : ERRORS_EN;
  const emotionList = isFa ? EMOTIONS_FA : EMOTIONS_EN;

  const activePair = pair === "custom" ? customPair : pair;

  const calc = useMemo(() => {
    const entryNum = parseFloat(entry);
    const exitNum = parseFloat(exit);
    const slNum = parseFloat(sl);
    if (isNaN(entryNum) || isNaN(exitNum) || entryNum === 0) return null;

    const mult = getPipMultiplier(activePair);
    const isBuy = direction === "BUY";
    const profitDist = isBuy ? exitNum - entryNum : entryNum - exitNum;
    const pips = profitDist * mult;
    const priceDiff = Math.abs(exitNum - entryNum);

    let rrCalc: number | null = null;
    if (!isNaN(slNum) && slNum !== 0) {
      const slDist = isBuy ? entryNum - slNum : slNum - entryNum;
      if (slDist > 0) rrCalc = profitDist / slDist;
    }

    return {
      priceDiff: priceDiff.toFixed(activePair.includes("JPY") ? 3 : activePair.includes("BTC") ? 0 : 5),
      pips: pips.toFixed(1),
      rr: rrCalc !== null ? rrCalc.toFixed(2) : null,
      isPositive: profitDist > 0,
    };
  }, [entry, exit, sl, direction, activePair]);

  const toggleError = (err: string) =>
    setErrors((prev) => prev.includes(err) ? prev.filter((e) => e !== err) : [...prev, err]);

  const addImageUrl = () => {
    if (newImageUrl.trim()) { setImageUrls((prev) => [...prev, newImageUrl.trim()]); setNewImageUrl(""); }
  };

  // ─── pickVideo: supports both web and native ─────────────────────────────
  const pickVideo = async () => {
    setPickingVideo(true);
    try {
      if (Platform.OS === "web") {
        const uri = await pickVideoWeb();
        if (uri) setVideoUris((prev) => [...prev, uri]);
      } else {
        const ImagePicker = await import("expo-image-picker");
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            isFa ? "دسترسی لازم است" : "Permission Required",
            isFa ? "برای آپلود ویدیو دسترسی گالری نیاز است" : "Media library permission required"
          );
          return;
        }
        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["video"] as any,
          allowsEditing: false,
          quality: 1,
        });
        if (!res.canceled && res.assets?.[0]) setVideoUris((prev) => [...prev, res.assets[0].uri]);
      }
    } catch {
      Alert.alert(isFa ? "خطا در انتخاب ویدیو" : "Could not pick video");
    } finally {
      setPickingVideo(false);
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, boolean> = {};
    if (!activePair.trim()) errs.pair = true;
    if (!entry.trim() || isNaN(parseFloat(entry))) errs.entry = true;
    if (!exit.trim() || isNaN(parseFloat(exit))) errs.exit = true;
    if (!sl.trim() || isNaN(parseFloat(sl))) errs.sl = true;
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = isFa
        ? "لطفاً فیلدهای ضروری را پر کنید:\n• قیمت ورود\n• قیمت خروج\n• حد ضرر"
        : "Please fill required fields:\n• Entry Price\n• Exit Price\n• Stop Loss";
      Alert.alert(isFa ? "فیلدهای ناقص" : "Missing Fields", msg);
      return false;
    }
    return true;
  };

  const save = () => {
    if (!validate()) return;
    const finalRR = rr.trim() || (calc?.rr ?? "");
    const data: Omit<Trade, "id" | "date"> = {
      pair: activePair,
      direction,
      strategyId,
      triggerId,
      entry,
      exit,
      sl,
      tp,
      lot,
      rr: finalRR,
      pnl,
      result,
      errors,
      emotion,
      notes,
      imageUrls,
      videoUris,
      boxId: settings.activeBoxId || undefined,
    };
    if (isEdit && id) {
      updateTrade(id, data);
    } else {
      addTrade(data);
      updateSettings({ selectedTriggerId: "", checklistNeedsReset: true });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const rtl = isFa;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="x" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isEdit ? t("editTrade") : t("newTrade")}
        </Text>
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.gold }]} onPress={save}>
          <Feather name="save" size={14} color={colors.primaryForeground} />
          <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>{t("save")}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: 40 }]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
        showsVerticalScrollIndicator={false}
      >
        {/* نماد */}
        <Section title={t("pair")} color={colors.gold} icon="trending-up" colors={colors} required={fieldErrors.pair}>
          <View style={styles.tags}>
            {[...PAIRS, isFa ? "سایر" : "Other"].map((p) => {
              const isOther = p === (isFa ? "سایر" : "Other");
              const active = isOther ? pair === "custom" : pair === p;
              return (
                <TouchableOpacity
                  key={p}
                  style={[styles.tag, {
                    backgroundColor: active ? colors.gold + "22" : colors.surface2,
                    borderColor: active ? colors.gold + "60" : colors.border,
                  }]}
                  onPress={() => setPair(isOther ? "custom" : p)}
                >
                  <Text style={[styles.tagText, { color: active ? colors.gold : colors.textSecondary }]}>{p}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {pair === "custom" && (
            <VoiceInput value={customPair} onChangeText={setCustomPair}
              placeholder={isFa ? "نام نماد" : "Symbol name"} containerStyle={{ marginTop: 8 }} />
          )}
        </Section>

        {/* جهت */}
        <Section title={t("direction")} color={colors.blue} icon="arrow-up-right" colors={colors}>
          <View style={styles.tags}>
            {(["BUY", "SELL"] as const).map((dir) => {
              const c = dir === "BUY" ? colors.green : colors.red;
              return (
                <TouchableOpacity key={dir} style={[styles.tag, { flex: 1,
                  backgroundColor: direction === dir ? c + "22" : colors.surface2,
                  borderColor: direction === dir ? c + "60" : colors.border,
                }]} onPress={() => setDirection(dir)}>
                  <Text style={[styles.tagText, { color: direction === dir ? c : colors.textSecondary, textAlign: "center" }]}>
                    {dir === "BUY" ? "📈 " + t("buy") : "📉 " + t("sell")}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        {/* استراتژی */}
        <Section title={t("strategy")} color={colors.purple} icon="layers" colors={colors}>
          <View style={styles.tags}>
            {strategies.map((s) => (
              <TouchableOpacity key={s.id} style={[styles.tag, {
                backgroundColor: strategyId === s.id ? colors.purple + "22" : colors.surface2,
                borderColor: strategyId === s.id ? colors.purple + "60" : colors.border,
              }]} onPress={() => { setStrategyId(s.id); setTriggerId(""); }}>
                <Text style={[styles.tagText, { color: strategyId === s.id ? colors.purple : colors.textSecondary }]}>
                  {s.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* تریگر */}
        {selectedStrategy && selectedStrategy.triggers.length > 0 && (
          <Section title={t("trigger")} color={colors.teal} icon="zap" colors={colors}>
            <View style={styles.tags}>
              {selectedStrategy.triggers.map((tr) => (
                <TouchableOpacity key={tr.id} style={[styles.tag, {
                  backgroundColor: triggerId === tr.id ? colors.teal + "22" : colors.surface2,
                  borderColor: triggerId === tr.id ? colors.teal + "60" : colors.border,
                }]} onPress={() => setTriggerId(tr.id)}>
                  <Text style={[styles.tagText, { color: triggerId === tr.id ? colors.teal : colors.textSecondary }]}>
                    {isFa ? `P${tr.priority} ` : `P${tr.priority} `}{tr.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Section>
        )}

        {/* قیمت‌ها */}
        <Section title={isFa ? "قیمت‌ها" : "Prices"} color={colors.blue} icon="activity" colors={colors}>
          <View style={styles.priceGrid}>
            <NumField label={t("entryPrice")} value={entry} onChange={setEntry} colors={colors} rtl={rtl} error={fieldErrors.entry} required />
            <NumField label={t("exitPrice")} value={exit} onChange={setExit} colors={colors} rtl={rtl} error={fieldErrors.exit} required />
            <NumField label={t("stopLoss")} value={sl} onChange={setSl} colors={colors} rtl={rtl} error={fieldErrors.sl} required />
            <NumField label={t("takeProfit")} value={tp} onChange={setTp} colors={colors} rtl={rtl} />
            <NumField label={t("lotSize")} value={lot} onChange={setLot} colors={colors} rtl={rtl} />
            <NumField label={t("rrRatio") + (calc?.rr ? ` (${calc.rr})` : "")} value={rr} onChange={setRr} colors={colors} rtl={rtl} />
          </View>

          {calc && (
            <View style={[styles.calcCard, {
              backgroundColor: calc.isPositive ? colors.green + "12" : colors.red + "12",
              borderColor: calc.isPositive ? colors.green + "40" : colors.red + "40",
            }]}>
              <View style={styles.calcRow}>
                <Feather name={calc.isPositive ? "trending-up" : "trending-down"} size={14}
                  color={calc.isPositive ? colors.green : colors.red} />
                <Text style={[styles.calcTitle, { color: calc.isPositive ? colors.green : colors.red }]}>
                  {isFa ? (calc.isPositive ? "سود محاسبه‌شده" : "زیان محاسبه‌شده") : (calc.isPositive ? "Profit" : "Loss")}
                </Text>
              </View>
              <View style={styles.calcStats}>
                <View style={styles.calcItem}>
                  <Text style={[styles.calcLabel, { color: colors.textTertiary }]}>{isFa ? "فاصله قیمت" : "Price Dist."}</Text>
                  <Text style={[styles.calcValue, { color: calc.isPositive ? colors.green : colors.red }]}>
                    {calc.priceDiff}
                  </Text>
                </View>
                <View style={[styles.calcDivider, { backgroundColor: colors.border }]} />
                <View style={styles.calcItem}>
                  <Text style={[styles.calcLabel, { color: colors.textTertiary }]}>{isFa ? "پیپ" : "Pips"}</Text>
                  <Text style={[styles.calcValue, { color: calc.isPositive ? colors.green : colors.red }]}>
                    {parseFloat(calc.pips) >= 0 ? "+" : ""}{calc.pips}
                  </Text>
                </View>
                {calc.rr !== null && (
                  <>
                    <View style={[styles.calcDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.calcItem}>
                      <Text style={[styles.calcLabel, { color: colors.textTertiary }]}>R:R</Text>
                      <Text style={[styles.calcValue, { color: colors.purple }]}>{calc.rr}</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          )}

          <Text style={[styles.label, { color: colors.textSecondary, textAlign: rtl ? "right" : "left", marginTop: 10 }]}>
            {t("pnlAmount")}
          </Text>
          <VoiceInput value={pnl} onChangeText={setPnl} keyboardType="numbers-and-punctuation"
            placeholder={isFa ? "مثبت یا منفی" : "Positive or negative"} />
        </Section>

        {/* نتیجه */}
        <Section title={t("result")} color={colors.green} icon="check-circle" colors={colors}>
          <View style={styles.tags}>
            {(["WIN", "LOSS", "BE"] as const).map((r) => {
              const c = r === "WIN" ? colors.green : r === "LOSS" ? colors.red : colors.mutedForeground;
              return (
                <TouchableOpacity key={r} style={[styles.tag, { flex: 1,
                  backgroundColor: result === r ? c + "22" : colors.surface2,
                  borderColor: result === r ? c + "60" : colors.border,
                }]} onPress={() => setResult(r)}>
                  <Text style={[styles.tagText, { textAlign: "center", color: result === r ? c : colors.textSecondary }]}>
                    {r === "WIN" ? t("win") : r === "LOSS" ? t("loss") : t("breakeven")}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        {/* خطاها */}
        <Section title={t("errors")} color={colors.red} icon="alert-triangle" colors={colors}>
          <View style={styles.tags}>
            {errorList.map((err) => (
              <TouchableOpacity key={err} style={[styles.tag, {
                backgroundColor: errors.includes(err) ? colors.red + "22" : colors.surface2,
                borderColor: errors.includes(err) ? colors.red + "60" : colors.border,
              }]} onPress={() => toggleError(err)}>
                <Text style={[styles.tagText, { color: errors.includes(err) ? colors.red : colors.textSecondary }]}>{err}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* احساس */}
        <Section title={t("emotion")} color={colors.orange} icon="heart" colors={colors}>
          <View style={styles.tags}>
            {emotionList.map((em) => (
              <TouchableOpacity key={em} style={[styles.tag, {
                backgroundColor: emotion === em ? colors.orange + "22" : colors.surface2,
                borderColor: emotion === em ? colors.orange + "60" : colors.border,
              }]} onPress={() => setEmotion(emotion === em ? "" : em)}>
                <Text style={[styles.tagText, { color: emotion === em ? colors.orange : colors.textSecondary }]}>{em}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* یادداشت */}
        <Section title={t("notes")} color={colors.textSecondary} icon="file-text" colors={colors}>
          <VoiceInput value={notes} onChangeText={setNotes} multiline minHeight={100} placeholder={t("notesPlaceholder")} />
        </Section>

        {/* تصاویر چارت */}
        <Section title={t("chartImages")} color={colors.blue} icon="image" colors={colors}>
          <View style={styles.urlRow}>
            <TextInput value={newImageUrl} onChangeText={setNewImageUrl} placeholder={t("imageUrlPlaceholder")}
              placeholderTextColor={colors.textTertiary}
              style={[styles.urlInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text, textAlign: rtl ? "right" : "left" }]} />
            <TouchableOpacity style={[styles.addUrlBtn, { backgroundColor: colors.blue }]} onPress={addImageUrl}>
              <Feather name="plus" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          {imageUrls.map((url, idx) => (
            <View key={idx} style={styles.imageItem}>
              <Image source={{ uri: url }} style={styles.chartThumb} resizeMode="cover" />
              <TouchableOpacity style={[styles.removeImg, { backgroundColor: colors.red + "22" }]}
                onPress={() => setImageUrls((prev) => prev.filter((_, i) => i !== idx))}>
                <Feather name="x" size={12} color={colors.red} />
              </TouchableOpacity>
            </View>
          ))}
        </Section>

        {/* ویدیوها — FIX: now works on web too */}
        <Section title={t("videoAttachments")} color={colors.purple} icon="video" colors={colors}>
          <TouchableOpacity
            style={[styles.videoPickBtn, { backgroundColor: colors.purple + "15", borderColor: colors.purple + "40",
              opacity: pickingVideo ? 0.6 : 1 }]}
            onPress={pickVideo}
            disabled={pickingVideo}
          >
            <Feather name="video" size={18} color={colors.purple} />
            <Text style={[styles.videoPickText, { color: colors.purple }]}>
              {pickingVideo
                ? (isFa ? "در حال انتخاب..." : "Selecting...")
                : (isFa ? "انتخاب ویدیو" : "Add Video")}
            </Text>
          </TouchableOpacity>
          {videoUris.map((uri, idx) => (
            <View key={idx} style={[styles.videoItem, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <Feather name="film" size={14} color={colors.purple} />
              <Text style={[styles.videoName, { color: colors.textSecondary }]} numberOfLines={1}>
                {uri.split("/").pop() ?? uri}
              </Text>
              <TouchableOpacity onPress={() => setVideoUris((prev) => prev.filter((_, i) => i !== idx))}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={14} color={colors.red} />
              </TouchableOpacity>
            </View>
          ))}
        </Section>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

function Section({ title, color, icon, colors, children, required }: {
  title: string; color: string; icon: React.ComponentProps<typeof Feather>["name"];
  colors: ReturnType<typeof useColors>; children: React.ReactNode; required?: boolean;
}) {
  return (
    <View style={[sStyles.card, { backgroundColor: colors.card, borderColor: required ? colors.red + "60" : colors.border }]}>
      <View style={sStyles.cardTitle}>
        <Feather name={icon} size={13} color={color} />
        <Text style={[sStyles.cardTitleText, { color }]}>{title}</Text>
        {required && <View style={[sStyles.reqDot, { backgroundColor: colors.red }]} />}
      </View>
      {children}
    </View>
  );
}

function NumField({ label, value, onChange, colors, rtl, error, required }: {
  label: string; value: string; onChange: (v: string) => void;
  colors: ReturnType<typeof useColors>; rtl: boolean; error?: boolean; required?: boolean;
}) {
  return (
    <View style={sStyles.numField}>
      <Text style={[sStyles.numLabel, { color: error ? colors.red : colors.textSecondary, textAlign: rtl ? "right" : "left" }]}>
        {label}{required ? " *" : ""}
      </Text>
      <TextInput value={value} onChangeText={onChange} keyboardType="decimal-pad" placeholder="0.00"
        placeholderTextColor={colors.textTertiary}
        style={[sStyles.numInput, {
          backgroundColor: error ? colors.red + "12" : colors.input,
          borderColor: error ? colors.red + "60" : colors.border,
          color: colors.text,
          textAlign: rtl ? "right" : "left",
        }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
    paddingTop: Platform.OS === "web" ? 80 : 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: "800", fontFamily: "Inter_700Bold" },
  saveBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  content: { paddingHorizontal: 14, paddingTop: 14 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  tagText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  label: { fontSize: 12, fontWeight: "500", marginBottom: 5, fontFamily: "Inter_500Medium" },
  priceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  calcCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginVertical: 4 },
  calcRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  calcTitle: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold" },
  calcStats: { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  calcItem: { alignItems: "center", flex: 1 },
  calcLabel: { fontSize: 10, fontFamily: "Inter_400Regular", marginBottom: 3 },
  calcValue: { fontSize: 16, fontWeight: "800", fontFamily: "Inter_700Bold" },
  calcDivider: { width: 1, height: 36, opacity: 0.4 },
  urlRow: { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 8 },
  urlInput: { flex: 1, height: 42, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 12, fontFamily: "Inter_400Regular" },
  addUrlBtn: { width: 42, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  imageItem: { position: "relative", marginBottom: 8 },
  chartThumb: { width: "100%", height: 160, borderRadius: 8 },
  removeImg: { position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  videoPickBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 13, borderRadius: 10, borderWidth: 1, marginBottom: 8,
  },
  videoPickText: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  videoItem: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, marginTop: 6 },
  videoName: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
});

const sStyles = StyleSheet.create({
  card: { borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1 },
  cardTitle: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 12 },
  cardTitleText: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  reqDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 2 },
  numField: { width: "47%", minWidth: 140 },
  numLabel: { fontSize: 11, fontWeight: "500", marginBottom: 5, fontFamily: "Inter_500Medium" },
  numInput: {
    height: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10,
    fontSize: 14, fontFamily: "Inter_700Bold", fontWeight: "700",
  },
});

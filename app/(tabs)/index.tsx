import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useApp, useT } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function ChecklistScreen() {
  const colors = useColors();
  const t = useT();
  const {
    strategies,
    settings,
    checkState,
    toggleCheck,
    resetChecklist,
    updateSettings,
  } = useApp();

  // وقتی کاربر به این تب برمی‌گرده و پرچم ریست ست شده، چک‌لیست پاک میشه
  useFocusEffect(
    useCallback(() => {
      if (settings.checklistNeedsReset) {
        resetChecklist();
        updateSettings({ checklistNeedsReset: false });
      }
    }, [settings.checklistNeedsReset])
  );

  const strategy =
    strategies.find((s) => s.id === settings.selectedStrategyId) ??
    strategies[0];

  const selectedTrigger = strategy?.triggers.find(
    (tr) => tr.id === settings.selectedTriggerId
  );

  // All strategy phases complete?
  const allPhasesComplete = useMemo(() => {
    if (!strategy) return false;
    return strategy.phases.every((p) =>
      p.items.every((i) => checkState[i.id])
    );
  }, [strategy, checkState]);

  // All trigger steps complete?
  const allTriggerComplete = useMemo(() => {
    if (!selectedTrigger) return false;
    return selectedTrigger.steps.every(
      (_, idx) => checkState[`trig_${selectedTrigger.id}_${idx}`]
    );
  }, [selectedTrigger, checkState]);

  const allDone = allPhasesComplete && (!selectedTrigger || allTriggerComplete);

  // Progress calculation includes trigger steps
  const progress = useMemo(() => {
    if (!strategy) return { total: 0, done: 0, pct: 0 };
    const phaseItems = strategy.phases.flatMap((p) => p.items);
    const triggerStepCount = selectedTrigger?.steps.length ?? 0;
    const total = phaseItems.length + triggerStepCount;
    const phaseDone = phaseItems.filter((i) => checkState[i.id]).length;
    const trigDone = selectedTrigger
      ? selectedTrigger.steps.filter(
          (_, idx) => checkState[`trig_${selectedTrigger.id}_${idx}`]
        ).length
      : 0;
    const done = phaseDone + trigDone;
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [strategy, selectedTrigger, checkState]);

  // Phase unlock logic
  const isPhaseUnlocked = (phaseIdx: number) => {
    if (phaseIdx === 0) return true;
    for (let pi = 0; pi < phaseIdx; pi++) {
      const phase = strategy?.phases[pi];
      if (!phase) return false;
      if (!phase.items.every((item) => checkState[item.id])) return false;
    }
    return true;
  };

  // Item unlock logic (previous item in same phase must be checked)
  const isItemUnlocked = (phaseIdx: number, itemIdx: number) => {
    if (!isPhaseUnlocked(phaseIdx)) return false;
    if (itemIdx === 0) return true;
    const prevItem = strategy?.phases[phaseIdx].items[itemIdx - 1];
    return prevItem ? !!checkState[prevItem.id] : false;
  };

  // Only show items up to the first unchecked one (+ that one)
  const getVisibleItems = (phaseIdx: number) => {
    if (!strategy) return [];
    const phase = strategy.phases[phaseIdx];
    const visible: typeof phase.items = [];
    for (let i = 0; i < phase.items.length; i++) {
      visible.push(phase.items[i]);
      if (!checkState[phase.items[i].id]) break;
    }
    return visible;
  };

  // Trigger step unlock: step N only after step N-1 checked
  const isTrigStepUnlocked = (idx: number) => {
    if (idx === 0) return true;
    return !!checkState[`trig_${selectedTrigger!.id}_${idx - 1}`];
  };

  // Visible trigger steps (sequential)
  const visibleTrigSteps = useMemo(() => {
    if (!selectedTrigger) return [];
    const visible: number[] = [];
    for (let i = 0; i < selectedTrigger.steps.length; i++) {
      visible.push(i);
      if (!checkState[`trig_${selectedTrigger.id}_${i}`]) break;
    }
    return visible;
  }, [selectedTrigger, checkState]);

  const topPad = Platform.OS === "web" ? 67 : 0;
  const bottomPad = Platform.OS === "web" ? 84 + 34 : 84;

  if (!strategy) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>{t("noStrategies")}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 10, paddingBottom: bottomPad },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Setup Card ── */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.cardTitle}>
            <Feather name="target" size={14} color={colors.gold} />
            <Text style={[styles.cardTitleText, { color: colors.gold }]}>
              {t("selectStrategy")}
            </Text>
          </View>

          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t("todayStrategy")}
          </Text>
          <View style={styles.tags}>
            {strategies.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.tag,
                  {
                    backgroundColor:
                      settings.selectedStrategyId === s.id
                        ? colors.blue + "22"
                        : colors.surface2,
                    borderColor:
                      settings.selectedStrategyId === s.id
                        ? colors.blue + "80"
                        : colors.border,
                  },
                ]}
                onPress={() =>
                  updateSettings({
                    selectedStrategyId: s.id,
                    selectedTriggerId: "",
                  })
                }
              >
                <Text
                  style={[
                    styles.tagText,
                    {
                      color:
                        settings.selectedStrategyId === s.id
                          ? colors.blue
                          : colors.textSecondary,
                    },
                  ]}
                >
                  {s.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text
            style={[
              styles.label,
              { color: colors.textSecondary, marginTop: 10 },
            ]}
          >
            {t("tradeDirection")}
          </Text>
          <View style={styles.tags}>
            {(["BUY", "SELL"] as const).map((dir) => (
              <TouchableOpacity
                key={dir}
                style={[
                  styles.tag,
                  {
                    backgroundColor:
                      settings.tradeDirection === dir
                        ? dir === "BUY"
                          ? colors.green + "22"
                          : colors.red + "22"
                        : colors.surface2,
                    borderColor:
                      settings.tradeDirection === dir
                        ? dir === "BUY"
                          ? colors.green + "80"
                          : colors.red + "80"
                        : colors.border,
                  },
                ]}
                onPress={() => updateSettings({ tradeDirection: dir })}
              >
                <Text
                  style={[
                    styles.tagText,
                    {
                      color:
                        settings.tradeDirection === dir
                          ? dir === "BUY"
                            ? colors.green
                            : colors.red
                          : colors.textSecondary,
                    },
                  ]}
                >
                  {dir === "BUY" ? t("buy") : t("sell")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Progress bar */}
          <View style={styles.progressWrap}>
            <View style={styles.progressHdr}>
              <Text
                style={[
                  styles.progressLabel,
                  { color: colors.textSecondary },
                ]}
              >
                {t("overallProgress")}
              </Text>
              <Text
                style={[styles.progressPct, { color: colors.gold }]}
              >
                {progress.done}/{progress.total}
              </Text>
            </View>
            <View
              style={[
                styles.progressBar,
                { backgroundColor: colors.surface2 },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress.pct}%` as any,
                    backgroundColor: allDone ? colors.green : colors.gold,
                  },
                ]}
              />
            </View>
          </View>

          {allDone && (
            <View
              style={[
                styles.readyBadge,
                {
                  backgroundColor: colors.green + "15",
                  borderColor: colors.green + "40",
                },
              ]}
            >
              <Feather name="check-circle" size={14} color={colors.green} />
              <Text style={[styles.readyText, { color: colors.green }]}>
                {t("ready")}
              </Text>
            </View>
          )}
        </View>

        {/* ── Strategy Phases ── */}
        {strategy.phases.map((phase, phaseIdx) => {
          if (!isPhaseUnlocked(phaseIdx)) return null;
          const phaseComplete = phase.items.every((i) => checkState[i.id]);
          const visibleItems = getVisibleItems(phaseIdx);

          return (
            <View
              key={phase.id}
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.phaseHeader}>
                <View
                  style={[styles.phaseNum, { backgroundColor: phase.color }]}
                >
                  <Text style={styles.phaseNumText}>{phaseIdx + 1}</Text>
                </View>
                <Text style={[styles.phaseName, { color: colors.text }]}>
                  {phase.name}
                </Text>
                {phaseComplete && (
                  <Feather
                    name="check-circle"
                    size={16}
                    color={colors.green}
                    style={{ marginLeft: "auto" as any }}
                  />
                )}
              </View>

              {visibleItems.map((item, itemIdx) => {
                const locked = !isItemUnlocked(phaseIdx, itemIdx);
                const checked = !!checkState[item.id];

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.checkItem,
                      { borderBottomColor: colors.border },
                      locked && styles.lockedItem,
                    ]}
                    onPress={() => {
                      if (!locked) {
                        Haptics.impactAsync(
                          Haptics.ImpactFeedbackStyle.Light
                        );
                        toggleCheck(item.id);
                      }
                    }}
                    activeOpacity={locked ? 1 : 0.75}
                    disabled={locked}
                  >
                    <View
                      style={[
                        styles.numBadge,
                        { backgroundColor: colors.surface2 },
                      ]}
                    >
                      <Text
                        style={[styles.numText, { color: colors.gold }]}
                      >
                        {itemIdx + 1}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: checked
                            ? colors.green
                            : colors.border,
                          backgroundColor: checked
                            ? colors.green
                            : "transparent",
                        },
                      ]}
                    >
                      {checked && (
                        <Feather name="check" size={13} color="#fff" />
                      )}
                    </View>
                    <View style={styles.itemText}>
                      <Text
                        style={[
                          styles.itemLabel,
                          {
                            color: checked
                              ? colors.textTertiary
                              : colors.text,
                            textDecorationLine: checked
                              ? "line-through"
                              : "none",
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                      {item.desc ? (
                        <Text
                          style={[
                            styles.itemDesc,
                            { color: colors.textTertiary },
                          ]}
                        >
                          {item.desc}
                        </Text>
                      ) : null}
                    </View>
                    {locked && (
                      <Feather
                        name="lock"
                        size={14}
                        color={colors.textTertiary}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}

        {/* ── Trigger Selector (only after all phases complete) ── */}
        {allPhasesComplete && strategy.triggers.length > 0 && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.teal + "50",
                borderWidth: 1.5,
              },
            ]}
          >
            <View style={styles.phaseHeader}>
              <View
                style={[
                  styles.phaseNum,
                  { backgroundColor: colors.teal },
                ]}
              >
                <Feather name="zap" size={13} color="#fff" />
              </View>
              <Text style={[styles.phaseName, { color: colors.teal }]}>
                {settings.language === "fa"
                  ? "انتخاب تریگر تایم پایین"
                  : "Select Entry Trigger"}
              </Text>
              {selectedTrigger && (
                <Feather
                  name="check-circle"
                  size={16}
                  color={colors.teal}
                  style={{ marginLeft: "auto" as any }}
                />
              )}
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {settings.language === "fa"
                ? "کدام تریگر در حال شکل‌گیری است؟"
                : "Which trigger is forming?"}
            </Text>
            <View style={styles.tags}>
              {strategy.triggers
                .sort((a, b) => a.priority - b.priority)
                .map((tr) => (
                  <TouchableOpacity
                    key={tr.id}
                    style={[
                      styles.trigTag,
                      {
                        backgroundColor:
                          settings.selectedTriggerId === tr.id
                            ? colors.teal + "22"
                            : colors.surface2,
                        borderColor:
                          settings.selectedTriggerId === tr.id
                            ? colors.teal + "80"
                            : colors.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      updateSettings({ selectedTriggerId: tr.id });
                    }}
                  >
                    <View
                      style={[
                        styles.trigPrioBadge,
                        {
                          backgroundColor:
                            settings.selectedTriggerId === tr.id
                              ? colors.teal
                              : colors.textTertiary + "40",
                        },
                      ]}
                    >
                      <Text style={styles.trigPrioText}>{tr.priority}</Text>
                    </View>
                    <Text
                      style={[
                        styles.tagText,
                        {
                          color:
                            settings.selectedTriggerId === tr.id
                              ? colors.teal
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {tr.name}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>

            {selectedTrigger && (
              <View
                style={[
                  styles.trigDescBox,
                  {
                    backgroundColor: colors.teal + "10",
                    borderColor: colors.teal + "30",
                  },
                ]}
              >
                <Text
                  style={[styles.trigDesc, { color: colors.textSecondary }]}
                >
                  {selectedTrigger.description}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Trigger Steps (sequential, only after trigger selected) ── */}
        {allPhasesComplete && selectedTrigger && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.teal + "50",
                borderWidth: 1.5,
              },
            ]}
          >
            <View style={styles.phaseHeader}>
              <View
                style={[
                  styles.phaseNum,
                  { backgroundColor: colors.teal },
                ]}
              >
                <Text style={styles.phaseNumText}>
                  {(strategy.phases.length + 1).toString()}
                </Text>
              </View>
              <Text style={[styles.phaseName, { color: colors.teal }]}>
                {settings.language === "fa"
                  ? `مراحل اجرا — ${selectedTrigger.name}`
                  : `Execution — ${selectedTrigger.name}`}
              </Text>
              {allTriggerComplete && (
                <Feather
                  name="check-circle"
                  size={16}
                  color={colors.teal}
                  style={{ marginLeft: "auto" as any }}
                />
              )}
            </View>

            {visibleTrigSteps.map((stepIdx) => {
              const key = `trig_${selectedTrigger.id}_${stepIdx}`;
              const checked = !!checkState[key];
              const locked = !isTrigStepUnlocked(stepIdx);

              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.checkItem,
                    { borderBottomColor: colors.border },
                    locked && styles.lockedItem,
                  ]}
                  onPress={() => {
                    if (!locked) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      toggleCheck(key);
                    }
                  }}
                  activeOpacity={locked ? 1 : 0.75}
                  disabled={locked}
                >
                  <View
                    style={[
                      styles.numBadge,
                      { backgroundColor: colors.teal + "22" },
                    ]}
                  >
                    <Text style={[styles.numText, { color: colors.teal }]}>
                      {stepIdx + 1}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: checked ? colors.teal : colors.border,
                        backgroundColor: checked
                          ? colors.teal
                          : "transparent",
                      },
                    ]}
                  >
                    {checked && (
                      <Feather name="check" size={13} color="#fff" />
                    )}
                  </View>
                  <View style={styles.itemText}>
                    <Text
                      style={[
                        styles.itemLabel,
                        {
                          color: checked ? colors.textTertiary : colors.text,
                          textDecorationLine: checked
                            ? "line-through"
                            : "none",
                        },
                      ]}
                    >
                      {selectedTrigger.steps[stepIdx]}
                    </Text>
                  </View>
                  {locked && (
                    <Feather
                      name="lock"
                      size={14}
                      color={colors.textTertiary}
                    />
                  )}
                </TouchableOpacity>
              );
            })}

            {!allTriggerComplete && (
              <View
                style={[
                  styles.trigHint,
                  {
                    backgroundColor: colors.orange + "10",
                    borderColor: colors.orange + "30",
                  },
                ]}
              >
                <Feather name="alert-circle" size={13} color={colors.orange} />
                <Text style={[styles.trigHintText, { color: colors.orange }]}>
                  {settings.language === "fa"
                    ? "تا تکمیل نشدن همه مراحل، وارد معامله نشو"
                    : "Complete all steps before entering the trade"}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Action Row ── */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              {
                backgroundColor: colors.gold,
                opacity: allDone ? 1 : 0.6,
              },
            ]}
            onPress={() => router.push("/trade-form")}
          >
            <Feather
              name="briefcase"
              size={16}
              color={colors.primaryForeground}
            />
            <Text
              style={[
                styles.primaryBtnText,
                { color: colors.primaryForeground },
              ]}
            >
              {t("registerTrade")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.resetBtn,
              {
                backgroundColor: colors.surface2,
                borderColor: colors.border,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              resetChecklist();
              updateSettings({ selectedTriggerId: "" });
            }}
          >
            <Feather name="refresh-cw" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 14 },
  card: { borderRadius: 14, padding: 14, marginBottom: 13, borderWidth: 1 },
  cardTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(100,180,255,0.12)",
  },
  cardTitleText: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 7,
    fontFamily: "Inter_500Medium",
  },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  trigTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  trigPrioBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  trigPrioText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
    fontFamily: "Inter_700Bold",
  },
  progressWrap: { marginTop: 12 },
  progressHdr: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  progressLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  progressPct: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  progressBar: { height: 7, borderRadius: 10, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 10 },
  readyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  readyText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  phaseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(100,180,255,0.12)",
  },
  phaseNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  phaseNumText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fff",
    fontFamily: "Inter_700Bold",
  },
  phaseName: {
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
    fontFamily: "Inter_700Bold",
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  lockedItem: { opacity: 0.4 },
  numBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  numText: { fontSize: 10, fontWeight: "800", fontFamily: "Inter_700Bold" },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  itemText: { flex: 1 },
  itemLabel: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  itemDesc: {
    fontSize: 11,
    marginTop: 3,
    lineHeight: 16,
    fontFamily: "Inter_400Regular",
  },
  trigDescBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  trigDesc: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
  },
  trigHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  trigHintText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "Inter_400Regular",
  },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 13,
    borderRadius: 10,
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  resetBtn: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
  },
});

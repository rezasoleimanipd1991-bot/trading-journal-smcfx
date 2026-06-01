import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useApp, useT, Strategy } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function StrategiesScreen() {
  const colors = useColors();
  const t = useT();
  const { strategies, deleteStrategy } = useApp();
  const [expandedId, setExpandedId] = useState<string | null>(strategies[0]?.id ?? null);
  const [activeTab, setActiveTab] = useState<"phases" | "triggers" | "reference" | "rules">("phases");

  const topPad = Platform.OS === "web" ? 67 : 0;
  const bottomPad = Platform.OS === "web" ? 84 + 34 : 84;

  const confirmDelete = (id: string, name: string) => {
    Alert.alert(`${t("confirmDelete")} "${name}"?`, "", [
      { text: t("no"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          deleteStrategy(id);
        },
      },
    ]);
  };

  const expanded = strategies.find((s) => s.id === expandedId);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 10, paddingBottom: bottomPad, paddingHorizontal: 14 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
            {t("strategies")}
          </Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.gold }]}
            onPress={() => router.push("/strategy-edit")}
          >
            <Feather name="plus" size={14} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>

        {strategies.map((s) => (
          <View key={s.id} style={[styles.stratCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={styles.stratHeader}
              onPress={() => setExpandedId(expandedId === s.id ? null : s.id)}
            >
              <View style={styles.stratInfo}>
                <Text style={[styles.stratName, { color: colors.text }]}>{s.name}</Text>
                <Text style={[styles.stratDesc, { color: colors.textTertiary }]} numberOfLines={2}>
                  {s.description}
                </Text>
              </View>
              <View style={styles.stratActions}>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: "/strategy-edit", params: { id: s.id } })}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.actionIcon}
                >
                  <Feather name="edit-2" size={14} color={colors.blue} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => confirmDelete(s.id, s.name)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.actionIcon}
                >
                  <Feather name="trash-2" size={14} color={colors.red} />
                </TouchableOpacity>
                <Feather
                  name={expandedId === s.id ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={colors.textTertiary}
                />
              </View>
            </TouchableOpacity>

            {expandedId === s.id && expanded && (
              <View style={styles.expandedBody}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.tabsRow}
                  contentContainerStyle={{ gap: 6 }}
                >
                  {([
                    { key: "phases", label: t("phases") },
                    { key: "triggers", label: t("triggers") },
                    { key: "reference", label: t("reference") },
                    { key: "rules", label: t("goldenRules") },
                  ] as const).map((tab) => (
                    <TouchableOpacity
                      key={tab.key}
                      style={[
                        styles.tabBtn,
                        {
                          backgroundColor:
                            activeTab === tab.key
                              ? colors.blue + "22"
                              : colors.surface2,
                          borderColor:
                            activeTab === tab.key
                              ? colors.blue + "60"
                              : colors.border,
                        },
                      ]}
                      onPress={() => setActiveTab(tab.key)}
                    >
                      <Text
                        style={[
                          styles.tabText,
                          {
                            color:
                              activeTab === tab.key
                                ? colors.blue
                                : colors.textSecondary,
                          },
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {activeTab === "phases" && (
                  <View>
                    {expanded.phases.map((phase, pi) => (
                      <View key={phase.id} style={styles.phaseBlock}>
                        <View style={styles.phaseBlockHeader}>
                          <View style={[styles.phaseCircle, { backgroundColor: phase.color }]}>
                            <Text style={styles.phaseCircleText}>{pi + 1}</Text>
                          </View>
                          <Text style={[styles.phaseBlockName, { color: colors.text }]}>
                            {phase.name}
                          </Text>
                        </View>
                        {phase.items.map((item, ii) => (
                          <View key={item.id} style={[styles.stepRow, { borderBottomColor: colors.border }]}>
                            <View style={[styles.stepDot, { backgroundColor: colors.blue }]} />
                            <View style={styles.stepContent}>
                              <Text style={[styles.stepLabel, { color: colors.textSecondary }]}>
                                {ii + 1}. {item.label}
                              </Text>
                              {item.desc ? (
                                <Text style={[styles.stepDesc, { color: colors.textTertiary }]}>
                                  {item.desc}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                )}

                {activeTab === "triggers" && (
                  <View>
                    {expanded.triggers.map((trigger) => (
                      <View
                        key={trigger.id}
                        style={[styles.triggerCard, { backgroundColor: colors.surface2, borderColor: colors.border }]}
                      >
                        <View style={styles.triggerHeader}>
                          <View style={[styles.priorityBadge, { backgroundColor: colors.gold + "22" }]}>
                            <Text style={[styles.priorityText, { color: colors.gold }]}>
                              {t("priority")} {trigger.priority}
                            </Text>
                          </View>
                          <Text style={[styles.triggerName, { color: colors.blue }]}>
                            {trigger.name}
                          </Text>
                        </View>
                        <Text style={[styles.triggerDesc, { color: colors.textSecondary }]}>
                          {trigger.description}
                        </Text>
                        {trigger.steps.map((step, si) => (
                          <View key={si} style={styles.triggerStep}>
                            <View style={[styles.stepNum, { backgroundColor: colors.blue + "22" }]}>
                              <Text style={[styles.stepNumText, { color: colors.blue }]}>{si + 1}</Text>
                            </View>
                            <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                              {step}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                )}

                {activeTab === "reference" && (
                  <View>
                    {expanded.reference.map((sec, ri) => (
                      <View key={ri} style={[styles.refSection, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                        <Text style={[styles.refTitle, { color: colors.gold }]}>{sec.title}</Text>
                        {sec.items.map((item, ii) => (
                          <View key={ii} style={[styles.refItem, { borderBottomColor: colors.border }]}>
                            <View style={[styles.refDot, { backgroundColor: colors.blue }]} />
                            <Text style={[styles.refText, { color: colors.textSecondary }]}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                )}

                {activeTab === "rules" && (
                  <View style={[styles.rulesCard, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                    {expanded.goldenRules.map((rule, ri) => (
                      <View key={ri} style={[styles.ruleRow, { borderBottomColor: colors.border }]}>
                        <View style={[styles.ruleNum, { backgroundColor: colors.gold + "22" }]}>
                          <Text style={[styles.ruleNumText, { color: colors.gold }]}>{ri + 1}</Text>
                        </View>
                        <Text style={[styles.ruleText, { color: colors.textSecondary }]}>{rule}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        ))}

        {strategies.length === 0 && (
          <View style={styles.empty}>
            <Feather name="layers" size={36} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textTertiary }]}>{t("noStrategies")}</Text>
            <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>{t("noStrategiesHint")}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {},
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontFamily: "Inter_600SemiBold",
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  stratCard: {
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  stratHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 14,
  },
  stratInfo: { flex: 1, marginRight: 10 },
  stratName: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold", marginBottom: 4 },
  stratDesc: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular" },
  stratActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionIcon: { padding: 4 },
  expandedBody: { paddingHorizontal: 14, paddingBottom: 14 },
  tabsRow: { marginBottom: 12 },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  phaseBlock: { marginBottom: 12 },
  phaseBlockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  phaseCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  phaseCircleText: { fontSize: 11, fontWeight: "800", color: "#fff", fontFamily: "Inter_700Bold" },
  phaseBlockName: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    paddingVertical: 7,
    paddingLeft: 8,
    borderBottomWidth: 1,
  },
  stepDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5, flexShrink: 0 },
  stepContent: { flex: 1 },
  stepLabel: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  stepDesc: { fontSize: 11, marginTop: 2, lineHeight: 16, fontFamily: "Inter_400Regular" },
  triggerCard: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  triggerHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  priorityText: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  triggerName: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  triggerDesc: { fontSize: 12, lineHeight: 17, marginBottom: 8, fontFamily: "Inter_400Regular" },
  triggerStep: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 5 },
  stepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepNumText: { fontSize: 10, fontWeight: "700", fontFamily: "Inter_700Bold" },
  stepText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular" },
  refSection: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  refTitle: { fontSize: 13, fontWeight: "700", marginBottom: 8, fontFamily: "Inter_700Bold" },
  refItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
  refDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5, flexShrink: 0 },
  refText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular" },
  rulesCard: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  ruleNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  ruleNumText: { fontSize: 11, fontWeight: "800", fontFamily: "Inter_700Bold" },
  ruleText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular" },
  empty: { alignItems: "center", paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  emptyHint: { fontSize: 12, fontFamily: "Inter_400Regular" },
});

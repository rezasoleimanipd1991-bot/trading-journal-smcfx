import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { VoiceInput } from "@/components/VoiceInput";
import {
  ChecklistItem,
  Strategy,
  StrategyPhase,
  TriggerInfo,
  useApp,
  useT,
} from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export default function StrategyEditScreen() {
  const colors = useColors();
  const t = useT();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { strategies, addStrategy, updateStrategy } = useApp();

  const existing = strategies.find((s) => s.id === id);
  const isEdit = !!existing;

  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [phases, setPhases] = useState<StrategyPhase[]>(
    existing?.phases ?? [
      {
        id: genId(),
        name: "مرحله ۱",
        icon: "check",
        color: "#5ba8e8",
        items: [],
      },
    ]
  );
  const [triggers, setTriggers] = useState<TriggerInfo[]>(existing?.triggers ?? []);
  const [goldenRules, setGoldenRules] = useState<string[]>(existing?.goldenRules ?? []);

  const isFa = useApp().settings.language === "fa";

  const addPhase = () => {
    const newPhase: StrategyPhase = {
      id: genId(),
      name: isFa ? `مرحله ${phases.length + 1}` : `Phase ${phases.length + 1}`,
      icon: "check",
      color: ["#5ba8e8", "#9b7fe8", "#f5c518", "#3ecf6e"][phases.length % 4],
      items: [],
    };
    setPhases((prev) => [...prev, newPhase]);
  };

  const updatePhase = (phaseId: string, data: Partial<StrategyPhase>) => {
    setPhases((prev) =>
      prev.map((p) => (p.id === phaseId ? { ...p, ...data } : p))
    );
  };

  const removePhase = (phaseId: string) => {
    setPhases((prev) => prev.filter((p) => p.id !== phaseId));
  };

  const addItem = (phaseId: string) => {
    const newItem: ChecklistItem = {
      id: genId(),
      label: "",
      desc: "",
      order: (phases.find((p) => p.id === phaseId)?.items.length ?? 0),
    };
    updatePhase(phaseId, {
      items: [...(phases.find((p) => p.id === phaseId)?.items ?? []), newItem],
    });
  };

  const updateItem = (phaseId: string, itemId: string, data: Partial<ChecklistItem>) => {
    setPhases((prev) =>
      prev.map((p) =>
        p.id === phaseId
          ? { ...p, items: p.items.map((i) => (i.id === itemId ? { ...i, ...data } : i)) }
          : p
      )
    );
  };

  const removeItem = (phaseId: string, itemId: string) => {
    setPhases((prev) =>
      prev.map((p) =>
        p.id === phaseId
          ? { ...p, items: p.items.filter((i) => i.id !== itemId) }
          : p
      )
    );
  };

  const moveItem = (phaseId: string, itemId: string, dir: "up" | "down") => {
    setPhases((prev) =>
      prev.map((p) => {
        if (p.id !== phaseId) return p;
        const idx = p.items.findIndex((i) => i.id === itemId);
        if (idx === -1) return p;
        const newItems = [...p.items];
        const swap = dir === "up" ? idx - 1 : idx + 1;
        if (swap < 0 || swap >= newItems.length) return p;
        [newItems[idx], newItems[swap]] = [newItems[swap], newItems[idx]];
        return { ...p, items: newItems };
      })
    );
  };

  const addTrigger = () => {
    const newTrigger: TriggerInfo = {
      id: genId(),
      name: "",
      priority: triggers.length + 1,
      description: "",
      steps: [],
    };
    setTriggers((prev) => [...prev, newTrigger]);
  };

  const updateTrigger = (triggerId: string, data: Partial<TriggerInfo>) => {
    setTriggers((prev) =>
      prev.map((tr) => (tr.id === triggerId ? { ...tr, ...data } : tr))
    );
  };

  const removeTrigger = (triggerId: string) => {
    setTriggers((prev) => prev.filter((tr) => tr.id !== triggerId));
  };

  const addTriggerStep = (triggerId: string) => {
    setTriggers((prev) =>
      prev.map((tr) =>
        tr.id === triggerId ? { ...tr, steps: [...tr.steps, ""] } : tr
      )
    );
  };

  const updateTriggerStep = (triggerId: string, stepIdx: number, value: string) => {
    setTriggers((prev) =>
      prev.map((tr) => {
        if (tr.id !== triggerId) return tr;
        const steps = [...tr.steps];
        steps[stepIdx] = value;
        return { ...tr, steps };
      })
    );
  };

  const removeTriggerStep = (triggerId: string, stepIdx: number) => {
    setTriggers((prev) =>
      prev.map((tr) => {
        if (tr.id !== triggerId) return tr;
        return { ...tr, steps: tr.steps.filter((_, i) => i !== stepIdx) };
      })
    );
  };

  const addRule = () => setGoldenRules((prev) => [...prev, ""]);
  const updateRule = (idx: number, val: string) => {
    setGoldenRules((prev) => prev.map((r, i) => (i === idx ? val : r)));
  };
  const removeRule = (idx: number) => {
    setGoldenRules((prev) => prev.filter((_, i) => i !== idx));
  };

  const save = () => {
    if (!name.trim()) {
      Alert.alert(
        isFa ? "لطفاً نام استراتژی را وارد کنید" : "Please enter strategy name"
      );
      return;
    }
    const data: Omit<Strategy, "id"> = {
      name: name.trim(),
      description: description.trim(),
      phases,
      triggers,
      reference: existing?.reference ?? [],
      goldenRules: goldenRules.filter((r) => r.trim()),
    };
    if (isEdit && id) {
      updateStrategy(id, data);
    } else {
      addStrategy(data);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const topPad = Platform.OS === "web" ? 80 : 14;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: topPad },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="x" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isEdit ? t("editStrategy") : t("newStrategy")}
        </Text>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.gold }]}
          onPress={save}
        >
          <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>{t("save")}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Card title={t("strategyName")} color={colors.gold} icon="bookmark" colors={colors}>
          <VoiceInput
            value={name}
            onChangeText={setName}
            placeholder={isFa ? "نام استراتژی..." : "Strategy name..."}
          />
          <Text style={[styles.label, { color: colors.textSecondary, marginTop: 10 }]}>
            {t("strategyDesc")}
          </Text>
          <VoiceInput
            value={description}
            onChangeText={setDescription}
            multiline
            minHeight={70}
            placeholder={isFa ? "توضیحات..." : "Description..."}
          />
        </Card>

        <Card title={t("phases")} color={colors.blue} icon="list" colors={colors}>
          {phases.map((phase, pi) => (
            <View
              key={phase.id}
              style={[styles.phaseBlock, { borderColor: colors.border }]}
            >
              <View style={styles.phaseHeader}>
                <View style={[styles.phaseCircle, { backgroundColor: phase.color }]}>
                  <Text style={styles.phaseCircleText}>{pi + 1}</Text>
                </View>
                <TextInput
                  value={phase.name}
                  onChangeText={(v) => updatePhase(phase.id, { name: v })}
                  style={[
                    styles.phaseNameInput,
                    { color: colors.text, borderBottomColor: colors.border },
                  ]}
                  placeholderTextColor={colors.textTertiary}
                  placeholder={isFa ? "نام مرحله" : "Phase name"}
                />
                <TouchableOpacity
                  onPress={() => removePhase(phase.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="trash-2" size={14} color={colors.red} />
                </TouchableOpacity>
              </View>

              {phase.items.map((item, ii) => (
                <View key={item.id} style={[styles.itemBlock, { borderColor: colors.border }]}>
                  <View style={styles.itemHeader}>
                    <Text style={[styles.itemNum, { color: colors.textTertiary }]}>{ii + 1}</Text>
                    <View style={styles.itemFields}>
                      <VoiceInput
                        value={item.label}
                        onChangeText={(v) => updateItem(phase.id, item.id, { label: v })}
                        placeholder={isFa ? "عنوان مرحله" : "Step label"}
                        containerStyle={{ marginBottom: 5 }}
                      />
                      <VoiceInput
                        value={item.desc}
                        onChangeText={(v) => updateItem(phase.id, item.id, { desc: v })}
                        placeholder={isFa ? "توضیحات (اختیاری)" : "Description (optional)"}
                      />
                    </View>
                    <View style={styles.itemControls}>
                      <TouchableOpacity
                        onPress={() => moveItem(phase.id, item.id, "up")}
                        disabled={ii === 0}
                        style={{ opacity: ii === 0 ? 0.3 : 1 }}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Feather name="chevron-up" size={16} color={colors.blue} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => moveItem(phase.id, item.id, "down")}
                        disabled={ii === phase.items.length - 1}
                        style={{ opacity: ii === phase.items.length - 1 ? 0.3 : 1 }}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Feather name="chevron-down" size={16} color={colors.blue} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => removeItem(phase.id, item.id)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Feather name="x" size={14} color={colors.red} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={[styles.addItemBtn, { borderColor: colors.border }]}
                onPress={() => addItem(phase.id)}
              >
                <Feather name="plus" size={14} color={colors.blue} />
                <Text style={[styles.addItemText, { color: colors.blue }]}>
                  {t("addStep")}
                </Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.addPhaseBtn, { backgroundColor: colors.blue + "15", borderColor: colors.blue + "40" }]}
            onPress={addPhase}
          >
            <Feather name="plus" size={15} color={colors.blue} />
            <Text style={[styles.addPhaseBtnText, { color: colors.blue }]}>{t("addPhase")}</Text>
          </TouchableOpacity>
        </Card>

        <Card title={t("triggers")} color={colors.teal} icon="zap" colors={colors}>
          {triggers.map((trigger, ti) => (
            <View
              key={trigger.id}
              style={[styles.triggerBlock, { borderColor: colors.border }]}
            >
              <View style={styles.triggerHeader}>
                <View style={[styles.prioBadge, { backgroundColor: colors.teal + "22" }]}>
                  <Text style={[styles.prioText, { color: colors.teal }]}>{ti + 1}</Text>
                </View>
                <TextInput
                  value={trigger.name}
                  onChangeText={(v) => updateTrigger(trigger.id, { name: v })}
                  style={[
                    styles.triggerNameInput,
                    { color: colors.text, borderBottomColor: colors.border },
                  ]}
                  placeholder={isFa ? "نام تریگر" : "Trigger name"}
                  placeholderTextColor={colors.textTertiary}
                />
                <TouchableOpacity onPress={() => removeTrigger(trigger.id)}>
                  <Feather name="trash-2" size={14} color={colors.red} />
                </TouchableOpacity>
              </View>
              <VoiceInput
                value={trigger.description}
                onChangeText={(v) => updateTrigger(trigger.id, { description: v })}
                multiline
                minHeight={60}
                placeholder={isFa ? "توضیحات تریگر..." : "Trigger description..."}
                containerStyle={{ marginTop: 8 }}
              />
              <Text style={[styles.label, { color: colors.textTertiary, marginTop: 8 }]}>
                {t("triggerSteps")}
              </Text>
              {trigger.steps.map((step, si) => (
                <View key={si} style={styles.triggerStepRow}>
                  <Text style={[styles.stepNum, { color: colors.teal }]}>{si + 1}.</Text>
                  <VoiceInput
                    value={step}
                    onChangeText={(v) => updateTriggerStep(trigger.id, si, v)}
                    placeholder={isFa ? "مرحله اجرا..." : "Execution step..."}
                    containerStyle={{ flex: 1 }}
                  />
                  <TouchableOpacity onPress={() => removeTriggerStep(trigger.id, si)}>
                    <Feather name="x" size={14} color={colors.red} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={[styles.addItemBtn, { borderColor: colors.border, marginTop: 6 }]}
                onPress={() => addTriggerStep(trigger.id)}
              >
                <Feather name="plus" size={13} color={colors.teal} />
                <Text style={[styles.addItemText, { color: colors.teal }]}>{t("addTriggerStep")}</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            style={[styles.addPhaseBtn, { backgroundColor: colors.teal + "15", borderColor: colors.teal + "40" }]}
            onPress={addTrigger}
          >
            <Feather name="plus" size={15} color={colors.teal} />
            <Text style={[styles.addPhaseBtnText, { color: colors.teal }]}>{t("addTrigger")}</Text>
          </TouchableOpacity>
        </Card>

        <Card title={t("goldenRules")} color={colors.gold} icon="star" colors={colors}>
          {goldenRules.map((rule, ri) => (
            <View key={ri} style={[styles.ruleRow]}>
              <Text style={[styles.ruleNum, { color: colors.gold }]}>{ri + 1}.</Text>
              <VoiceInput
                value={rule}
                onChangeText={(v) => updateRule(ri, v)}
                placeholder={isFa ? "قانون طلایی..." : "Golden rule..."}
                containerStyle={{ flex: 1 }}
              />
              <TouchableOpacity onPress={() => removeRule(ri)}>
                <Feather name="x" size={14} color={colors.red} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            style={[styles.addItemBtn, { borderColor: colors.border, marginTop: 4 }]}
            onPress={addRule}
          >
            <Feather name="plus" size={13} color={colors.gold} />
            <Text style={[styles.addItemText, { color: colors.gold }]}>
              {isFa ? "+ افزودن قانون" : "+ Add Rule"}
            </Text>
          </TouchableOpacity>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function Card({
  title, color, icon, colors, children,
}: {
  title: string;
  color: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  colors: ReturnType<typeof useColors>;
  children: React.ReactNode;
}) {
  return (
    <View style={[cStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={cStyles.cardTitle}>
        <Feather name={icon} size={13} color={color} />
        <Text style={[cStyles.cardTitleText, { color }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: "800", fontFamily: "Inter_700Bold" },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  content: { paddingHorizontal: 14, paddingTop: 14 },
  label: { fontSize: 11, fontWeight: "500", marginBottom: 5, fontFamily: "Inter_500Medium" },
  phaseBlock: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  phaseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  phaseCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  phaseCircleText: { fontSize: 11, fontWeight: "800", color: "#fff", fontFamily: "Inter_700Bold" },
  phaseNameInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    paddingBottom: 4,
    borderBottomWidth: 1,
    fontFamily: "Inter_700Bold",
  },
  itemBlock: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginBottom: 7,
  },
  itemHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  itemNum: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    marginTop: 10,
    flexShrink: 0,
  },
  itemFields: { flex: 1 },
  itemControls: {
    flexDirection: "column",
    gap: 6,
    alignItems: "center",
    paddingTop: 4,
  },
  addItemBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    alignSelf: "flex-start",
    marginTop: 4,
  },
  addItemText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  addPhaseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  addPhaseBtnText: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  triggerBlock: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  triggerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  prioBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  prioText: { fontSize: 11, fontWeight: "800", fontFamily: "Inter_700Bold" },
  triggerNameInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    paddingBottom: 4,
    borderBottomWidth: 1,
    fontFamily: "Inter_700Bold",
  },
  triggerStepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  stepNum: { fontSize: 12, fontWeight: "700", flexShrink: 0, fontFamily: "Inter_700Bold" },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  ruleNum: { fontSize: 12, fontWeight: "700", flexShrink: 0, fontFamily: "Inter_700Bold" },
});

const cStyles = StyleSheet.create({
  card: { borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1 },
  cardTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(100,180,255,0.12)",
  },
  cardTitleText: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold" },
});

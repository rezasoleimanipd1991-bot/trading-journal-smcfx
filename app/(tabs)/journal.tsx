import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { TradeCard } from "@/components/TradeCard";
import { Trade, useApp, useT } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type FilterType = "all" | "WIN" | "LOSS" | "BE";

export default function JournalScreen() {
  const colors = useColors();
  const t = useT();
  const { trades, deleteTrade, settings } = useApp();
  const isFa = settings.language === "fa";
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return trades;
    return trades.filter((tr) => tr.result === filter);
  }, [trades, filter]);

  const stats = useMemo(() => {
    const wins = trades.filter((t) => t.result === "WIN").length;
    const losses = trades.filter((t) => t.result === "LOSS").length;
    const be = trades.filter((t) => t.result === "BE").length;
    const total = trades.length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    const pnl = trades.reduce((s, tr) => s + (parseFloat(tr.pnl) || 0), 0);
    const avgRR = trades.filter(tr => tr.rr && !isNaN(parseFloat(tr.rr)));
    const meanRR = avgRR.length > 0
      ? avgRR.reduce((s, tr) => s + parseFloat(tr.rr), 0) / avgRR.length
      : null;
    return { wins, losses, be, winRate, pnl, total, meanRR };
  }, [trades]);

  const topPad = Platform.OS === "web" ? 67 : 0;
  const bottomPad = Platform.OS === "web" ? 84 + 34 : 84;

  const confirmDelete = (id: string) => {
    Alert.alert(t("confirmDelete"), "", [
      { text: t("no"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          deleteTrade(id);
        },
      },
    ]);
  };

  const filters: { key: FilterType; label: string; color: string; count: number }[] = [
    { key: "all",  label: t("all"),    color: colors.blue,           count: stats.total  },
    { key: "WIN",  label: t("wins"),   color: colors.green,          count: stats.wins   },
    { key: "LOSS", label: t("losses"), color: colors.red,            count: stats.losses },
    { key: "BE",   label: "BE",        color: colors.mutedForeground, count: stats.be    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList<Trade>
        data={filtered}
        keyExtractor={(item) => item.id}
        scrollEnabled={!!filtered.length}
        ListHeaderComponent={
          <View style={{ paddingTop: topPad + 10 }}>
            {/* هدر */}
            <View style={styles.topRow}>
              <View>
                <Text style={[styles.screenLabel, { color: colors.textTertiary }]}>
                  {isFa ? "ژورنال معاملاتی" : "Trade Journal"}
                </Text>
                <Text style={[styles.tradeCount, { color: colors.textSecondary }]}>
                  {stats.total} {isFa ? "معامله" : "trades"}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.gold }]}
                onPress={() => router.push("/trade-form")}
              >
                <Feather name="plus" size={14} color={colors.primaryForeground} />
                <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>
                  {isFa ? "ثبت معامله" : "New Trade"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* کارت آماری */}
            <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <StatBlock
                value={`${stats.winRate}%`}
                label={isFa ? "وین ریت" : "Win Rate"}
                color={stats.winRate >= 50 ? colors.green : colors.red}
                large
                colors={colors}
              />
              <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
              <StatBlock value={stats.wins.toString()} label={isFa ? "برد" : "Win"} color={colors.green} colors={colors} />
              <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
              <StatBlock value={stats.losses.toString()} label={isFa ? "باخت" : "Loss"} color={colors.red} colors={colors} />
              <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
              <StatBlock
                value={`${stats.pnl >= 0 ? "+" : ""}${stats.pnl.toFixed(1)}$`}
                label="P&L"
                color={stats.pnl >= 0 ? colors.green : colors.red}
                colors={colors}
              />
              {stats.meanRR !== null && (
                <>
                  <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
                  <StatBlock value={stats.meanRR.toFixed(2)} label="R:R" color={colors.purple} colors={colors} />
                </>
              )}
            </View>

            {/* فیلترها */}
            <View style={styles.filterRow}>
              {filters.map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterBtn, {
                    backgroundColor: filter === f.key ? f.color + "20" : colors.surface2,
                    borderColor: filter === f.key ? f.color + "60" : colors.border,
                    borderBottomWidth: filter === f.key ? 2 : 1,
                    borderBottomColor: filter === f.key ? f.color : colors.border,
                  }]}
                  onPress={() => setFilter(f.key)}
                >
                  <Text style={[styles.filterText, { color: filter === f.key ? f.color : colors.textSecondary }]}>
                    {f.label}
                  </Text>
                  {f.count > 0 && (
                    <View style={[styles.filterCount, { backgroundColor: filter === f.key ? f.color + "30" : colors.surface2 }]}>
                      <Text style={[styles.filterCountText, { color: filter === f.key ? f.color : colors.textTertiary }]}>
                        {f.count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TradeCard
            trade={item}
            onPress={() => router.push({ pathname: "/trade-form", params: { id: item.id } })}
            onDelete={() => confirmDelete(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.surface2 }]}>
              <Feather name="book-open" size={32} color={colors.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {t("noTrades")}
            </Text>
            <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>
              {t("noTradesHint")}
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.gold }]}
              onPress={() => router.push("/trade-form")}
            >
              <Feather name="plus" size={14} color={colors.primaryForeground} />
              <Text style={[styles.emptyBtnText, { color: colors.primaryForeground }]}>
                {isFa ? "اولین معامله" : "First Trade"}
              </Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad, paddingHorizontal: 14 }]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function StatBlock({ value, label, color, large, colors }: {
  value: string; label: string; color: string; large?: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.statBlock}>
      <Text style={[styles.statVal, { color, fontSize: large ? 22 : 17 }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { flexGrow: 1 },
  topRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14,
  },
  screenLabel: {
    fontSize: 10, fontWeight: "600", textTransform: "uppercase",
    letterSpacing: 1.2, fontFamily: "Inter_600SemiBold",
  },
  tradeCount: { fontSize: 13, fontWeight: "500", fontFamily: "Inter_500Medium", marginTop: 2 },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  addBtnText: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  statsCard: {
    flexDirection: "row", alignItems: "center", borderRadius: 16,
    borderWidth: 1, marginBottom: 14, overflow: "hidden",
  },
  statBlock: { flex: 1, alignItems: "center", paddingVertical: 14, paddingHorizontal: 4 },
  statVal: { fontWeight: "800", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 9, marginTop: 3, fontFamily: "Inter_400Regular", textTransform: "uppercase", letterSpacing: 0.5 },
  statsDivider: { width: 1, height: 40 },
  filterRow: { flexDirection: "row", gap: 6, marginBottom: 12 },
  filterBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 4, paddingVertical: 8, paddingHorizontal: 6,
    borderRadius: 12, borderWidth: 1,
  },
  filterText: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },
  filterCount: {
    minWidth: 18, height: 18, borderRadius: 9,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
  },
  filterCountText: { fontSize: 9, fontWeight: "700", fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", paddingVertical: 56, gap: 10 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  emptyHint: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 6,
  },
  emptyBtnText: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
});

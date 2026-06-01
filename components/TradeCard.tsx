import { Feather } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Trade, useApp, useT } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface TradeCardProps {
  trade: Trade;
  onPress: () => void;
  onDelete: () => void;
}

export function TradeCard({ trade, onPress, onDelete }: TradeCardProps) {
  const colors = useColors();
  const { strategies, settings } = useApp();
  const t = useT();
  const isFa = settings.language === "fa";

  const strategy = strategies.find((s) => s.id === trade.strategyId);
  const trigger = strategy?.triggers.find((tr) => tr.id === trade.triggerId);

  const resultColor =
    trade.result === "WIN" ? colors.green : trade.result === "LOSS" ? colors.red : colors.mutedForeground;
  const resultBg =
    trade.result === "WIN" ? colors.green + "18" : trade.result === "LOSS" ? colors.red + "18" : colors.mutedForeground + "18";
  const directionColor = trade.direction === "BUY" ? colors.green : colors.red;

  const pnlNum = parseFloat(trade.pnl);
  const pnlColor = pnlNum > 0 ? colors.green : pnlNum < 0 ? colors.red : colors.mutedForeground;
  const hasPnl = !isNaN(pnlNum) && trade.pnl !== "";

  const dateStr = new Date(trade.date).toLocaleDateString("fa-IR", {
    month: "short", day: "numeric",
  });
  const timeStr = new Date(trade.date).toLocaleTimeString("fa-IR", {
    hour: "2-digit", minute: "2-digit",
  });

  const rrNum = parseFloat(trade.rr);
  const hasRR = !isNaN(rrNum) && trade.rr !== "";

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {/* نوار رنگی سمت چپ */}
      <View style={[styles.colorStripe, { backgroundColor: resultColor }]} />

      <View style={styles.inner}>
        {/* ردیف بالا: نماد + جهت + PnL + حذف */}
        <View style={styles.topRow}>
          <View style={styles.topLeft}>
            <Text style={[styles.pair, { color: colors.text }]}>{trade.pair}</Text>
            <View style={[styles.dirPill, { backgroundColor: directionColor + "20", borderColor: directionColor + "50" }]}>
              <Feather name={trade.direction === "BUY" ? "trending-up" : "trending-down"} size={10} color={directionColor} />
              <Text style={[styles.dirText, { color: directionColor }]}>{trade.direction}</Text>
            </View>
          </View>
          <View style={styles.topRight}>
            {hasPnl && (
              <Text style={[styles.pnl, { color: pnlColor }]}>
                {pnlNum > 0 ? "+" : ""}{pnlNum.toFixed(2)}$
              </Text>
            )}
            <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={[styles.deleteBtn, { backgroundColor: colors.surface2 }]}>
              <Feather name="trash-2" size={13} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ردیف اطلاعات قیمت */}
        {(trade.entry || trade.exit || trade.sl) ? (
          <View style={[styles.priceRow, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
            {trade.entry ? <PriceChip label={isFa ? "ورود" : "Entry"} value={trade.entry} color={colors.blue} colors={colors} /> : null}
            {trade.exit ? (
              <>
                <View style={[styles.priceSep, { backgroundColor: colors.border }]} />
                <PriceChip label={isFa ? "خروج" : "Exit"} value={trade.exit} color={resultColor} colors={colors} />
              </>
            ) : null}
            {trade.sl ? (
              <>
                <View style={[styles.priceSep, { backgroundColor: colors.border }]} />
                <PriceChip label="SL" value={trade.sl} color={colors.red} colors={colors} />
              </>
            ) : null}
            {trade.tp ? (
              <>
                <View style={[styles.priceSep, { backgroundColor: colors.border }]} />
                <PriceChip label="TP" value={trade.tp} color={colors.gold} colors={colors} />
              </>
            ) : null}
          </View>
        ) : null}

        {/* بج‌ها: استراتژی، تریگر، نتیجه، R:R */}
        <View style={styles.badgeRow}>
          <View style={[styles.resultBadge, { backgroundColor: resultBg, borderColor: resultColor + "50" }]}>
            <Feather name={trade.result === "WIN" ? "check-circle" : trade.result === "LOSS" ? "x-circle" : "minus-circle"} size={11} color={resultColor} />
            <Text style={[styles.resultText, { color: resultColor }]}>
              {trade.result === "WIN" ? t("win") : trade.result === "LOSS" ? t("loss") : t("breakeven")}
            </Text>
          </View>
          {hasRR && (
            <View style={[styles.badge, { backgroundColor: colors.purple + "15", borderColor: colors.purple + "40" }]}>
              <Text style={[styles.badgeText, { color: colors.purple }]}>R:R {rrNum.toFixed(2)}</Text>
            </View>
          )}
          {trade.lot ? (
            <View style={[styles.badge, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                {isFa ? "حجم " : "Lot "}{trade.lot}
              </Text>
            </View>
          ) : null}
          {strategy && (
            <View style={[styles.badge, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <Text style={[styles.badgeText, { color: colors.textSecondary }]} numberOfLines={1}>{strategy.name}</Text>
            </View>
          )}
          {trigger && (
            <View style={[styles.badge, { backgroundColor: colors.teal + "15", borderColor: colors.teal + "40" }]}>
              <Feather name="zap" size={9} color={colors.teal} />
              <Text style={[styles.badgeText, { color: colors.teal }]} numberOfLines={1}>{trigger.name}</Text>
            </View>
          )}
        </View>

        {/* ردیف پایین: احساس + تاریخ */}
        <View style={styles.bottomRow}>
          <View style={styles.bottomLeft}>
            {trade.emotion ? (
              <View style={[styles.emotionPill, { backgroundColor: colors.orange + "15", borderColor: colors.orange + "30" }]}>
                <Feather name="heart" size={9} color={colors.orange} />
                <Text style={[styles.emotionText, { color: colors.orange }]}>{trade.emotion}</Text>
              </View>
            ) : null}
            {trade.errors.length > 0 && (
              <View style={[styles.errorPill, { backgroundColor: colors.red + "12", borderColor: colors.red + "30" }]}>
                <Feather name="alert-triangle" size={9} color={colors.red} />
                <Text style={[styles.errorText, { color: colors.red }]}>{trade.errors.length}</Text>
              </View>
            )}
            {trade.videoUris?.length > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.purple + "12", borderColor: colors.purple + "30" }]}>
                <Feather name="video" size={9} color={colors.purple} />
                <Text style={[styles.badgeText, { color: colors.purple }]}>{trade.videoUris.length}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.date, { color: colors.textTertiary }]}>{dateStr} · {timeStr}</Text>
        </View>

        {/* یادداشت */}
        {trade.notes ? (
          <Text style={[styles.notes, { color: colors.textSecondary, borderTopColor: colors.border }]} numberOfLines={2}>
            {trade.notes}
          </Text>
        ) : null}

        {/* تصویر چارت */}
        {trade.imageUrls?.length > 0 && (
          <Image source={{ uri: trade.imageUrls[0] }} style={styles.chartImage} resizeMode="cover" />
        )}
      </View>
    </TouchableOpacity>
  );
}

function PriceChip({ label, value, color, colors }: {
  label: string; value: string; color: string; colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.priceChip}>
      <Text style={[styles.priceChipLabel, { color: colors.textTertiary }]}>{label}</Text>
      <Text style={[styles.priceChipValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
  },
  colorStripe: { width: 3.5 },
  inner: { flex: 1, padding: 13, gap: 9 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  topLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  topRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  pair: { fontSize: 16, fontWeight: "800", fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  dirPill: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, borderWidth: 1,
  },
  dirText: { fontSize: 10, fontWeight: "700", fontFamily: "Inter_700Bold" },
  pnl: { fontSize: 16, fontWeight: "800", fontFamily: "Inter_700Bold" },
  deleteBtn: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  priceRow: {
    flexDirection: "row", alignItems: "center", borderRadius: 10,
    borderWidth: 1, overflow: "hidden",
  },
  priceChip: { flex: 1, alignItems: "center", paddingVertical: 7 },
  priceChipLabel: { fontSize: 9, fontFamily: "Inter_400Regular", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  priceChipValue: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold" },
  priceSep: { width: 1, height: 36 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  resultBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1,
  },
  resultText: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bottomLeft: { flexDirection: "row", alignItems: "center", gap: 5 },
  emotionPill: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, borderWidth: 1,
  },
  emotionText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  errorPill: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, borderWidth: 1,
  },
  errorText: { fontSize: 10, fontWeight: "700", fontFamily: "Inter_700Bold" },
  date: { fontSize: 10, fontFamily: "Inter_400Regular" },
  notes: {
    fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular",
    paddingTop: 8, borderTopWidth: 1, color: "#888",
  },
  chartImage: { width: "100%", height: 160, borderRadius: 10, marginTop: 2 },
});

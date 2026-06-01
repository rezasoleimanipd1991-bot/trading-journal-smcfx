import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useApp, useT } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function StatsScreen() {
  const colors = useColors();
  const t = useT();
  const { trades, strategies, tradingBoxes, settings, addTradingBox, deleteTradingBox, updateSettings } = useApp();
  const isFa = settings.language === "fa";
  const [exporting, setExporting] = useState(false);
  const [boxModalVisible, setBoxModalVisible] = useState(false);
  const [newBoxName, setNewBoxName] = useState("");
  const [newBoxSize, setNewBoxSize] = useState("50");
  const [analysisTab, setAnalysisTab] = useState<"emotion" | "strategy" | "trigger">("emotion");

  const activeBox = tradingBoxes.find((b) => b.id === settings.activeBoxId);
  const boxTrades = activeBox
    ? trades.filter((t) => t.boxId === activeBox.id)
    : [];

  const stats = useMemo(() => {
    const total = trades.length;
    const wins = trades.filter((t) => t.result === "WIN").length;
    const losses = trades.filter((t) => t.result === "LOSS").length;
    const be = trades.filter((t) => t.result === "BE").length;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : "0";
    const pnl = trades.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0);
    const avgPnl = total > 0 ? pnl / total : 0;
    const rrs = trades.filter((t) => parseFloat(t.rr) > 0).map((t) => parseFloat(t.rr));
    const avgRR = rrs.length > 0 ? (rrs.reduce((a, b) => a + b, 0) / rrs.length).toFixed(2) : "0";

    let bestStreak = 0, curStreak = 0, worstStreak = 0, curLoss = 0;
    for (const tr of [...trades].reverse()) {
      if (tr.result === "WIN") {
        curStreak++; curLoss = 0;
        bestStreak = Math.max(bestStreak, curStreak);
      } else if (tr.result === "LOSS") {
        curLoss++; curStreak = 0;
        worstStreak = Math.max(worstStreak, curLoss);
      } else { curStreak = 0; curLoss = 0; }
    }

    const errorCounts: Record<string, number> = {};
    for (const tr of trades) {
      for (const err of tr.errors) {
        errorCounts[err] = (errorCounts[err] || 0) + 1;
      }
    }
    const topErrors = Object.entries(errorCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const stratStats = strategies.map((s) => {
      const sTrades = trades.filter((t) => t.strategyId === s.id);
      const sWins = sTrades.filter((t) => t.result === "WIN").length;
      const sTotal = sTrades.length;
      const sWR = sTotal > 0 ? ((sWins / sTotal) * 100).toFixed(0) : "0";
      const sPnL = sTrades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0);
      return { id: s.id, name: s.name, total: sTotal, wins: sWins, wr: sWR, pnl: sPnL };
    });

    return { total, wins, losses, be, winRate, pnl, avgPnl, avgRR, bestStreak, worstStreak, topErrors, stratStats };
  }, [trades, strategies]);

  // Box analysis
  const boxStats = useMemo(() => {
    if (!activeBox || boxTrades.length === 0) return null;
    const total = boxTrades.length;
    const wins = boxTrades.filter((t) => t.result === "WIN").length;
    const losses = boxTrades.filter((t) => t.result === "LOSS").length;
    const winRate = ((wins / total) * 100).toFixed(1);
    const pnl = boxTrades.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0);

    // By emotion
    const emotionMap: Record<string, { total: number; wins: number }> = {};
    for (const tr of boxTrades) {
      if (!tr.emotion) continue;
      if (!emotionMap[tr.emotion]) emotionMap[tr.emotion] = { total: 0, wins: 0 };
      emotionMap[tr.emotion].total++;
      if (tr.result === "WIN") emotionMap[tr.emotion].wins++;
    }
    const byEmotion = Object.entries(emotionMap)
      .map(([em, d]) => ({ label: em, total: d.total, wins: d.wins, wr: d.total > 0 ? ((d.wins / d.total) * 100).toFixed(0) : "0" }))
      .sort((a, b) => b.total - a.total);

    // By strategy
    const stratMap: Record<string, { total: number; wins: number; name: string }> = {};
    for (const tr of boxTrades) {
      if (!stratMap[tr.strategyId]) {
        const s = strategies.find((s) => s.id === tr.strategyId);
        stratMap[tr.strategyId] = { total: 0, wins: 0, name: s?.name ?? tr.strategyId };
      }
      stratMap[tr.strategyId].total++;
      if (tr.result === "WIN") stratMap[tr.strategyId].wins++;
    }
    const byStrategy = Object.values(stratMap)
      .map((d) => ({ label: d.name, total: d.total, wins: d.wins, wr: d.total > 0 ? ((d.wins / d.total) * 100).toFixed(0) : "0" }))
      .sort((a, b) => b.total - a.total);

    // By trigger
    const trigMap: Record<string, { total: number; wins: number }> = {};
    for (const tr of boxTrades) {
      if (!tr.triggerId) continue;
      if (!trigMap[tr.triggerId]) trigMap[tr.triggerId] = { total: 0, wins: 0 };
      trigMap[tr.triggerId].total++;
      if (tr.result === "WIN") trigMap[tr.triggerId].wins++;
    }
    const allTriggers = strategies.flatMap((s) => s.triggers);
    const byTrigger = Object.entries(trigMap)
      .map(([tid, d]) => {
        const trInfo = allTriggers.find((tr) => tr.id === tid);
        return { label: trInfo?.name ?? tid, total: d.total, wins: d.wins, wr: d.total > 0 ? ((d.wins / d.total) * 100).toFixed(0) : "0" };
      })
      .sort((a, b) => b.total - a.total);

    return { total, wins, losses, winRate, pnl, byEmotion, byStrategy, byTrigger };
  }, [activeBox, boxTrades, strategies]);

  const createBox = () => {
    const name = newBoxName.trim();
    const size = parseInt(newBoxSize, 10);
    if (!name) { Alert.alert(isFa ? "نام باکس را وارد کنید" : "Enter box name"); return; }
    if (!size || size < 1) { Alert.alert(isFa ? "تعداد هدف باید عدد مثبت باشد" : "Target must be positive"); return; }
    addTradingBox({ name, size });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setBoxModalVisible(false);
    setNewBoxName("");
    setNewBoxSize("50");
  };

  const confirmDeleteBox = (id: string) => {
    Alert.alert(isFa ? "باکس حذف شود؟" : "Delete box?", "", [
      { text: t("no"), style: "cancel" },
      { text: t("delete"), style: "destructive", onPress: () => { deleteTradingBox(id); if (settings.activeBoxId === id) updateSettings({ activeBoxId: "" }); } },
    ]);
  };

  const exportPDF = async () => {
    if (trades.length === 0) { Alert.alert(t("noTradesToExport")); return; }
    setExporting(true);
    try {
      const { default: Print } = await import("expo-print");
      const { default: Sharing } = await import("expo-sharing");
      const html = buildPDFHtml();
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
    } catch (e: unknown) {
      Alert.alert("Export Error", e instanceof Error ? e.message : String(e));
    } finally { setExporting(false); }
  };

  const exportExcel = async () => {
    if (trades.length === 0) { Alert.alert(t("noTradesToExport")); return; }
    setExporting(true);
    try {
      const XLSX = await import("xlsx");
      const { default: FileSystem } = await import("expo-file-system");
      const { default: Sharing } = await import("expo-sharing");
      const data = trades.map((tr) => ({
        Date: tr.date, Pair: tr.pair, Direction: tr.direction,
        Strategy: strategies.find((s) => s.id === tr.strategyId)?.name ?? tr.strategyId,
        Trigger: tr.triggerId, Entry: tr.entry, Exit: tr.exit, SL: tr.sl, TP: tr.tp,
        Lot: tr.lot, "R:R": tr.rr, "P&L": tr.pnl, Result: tr.result,
        Errors: tr.errors.join(", "), Emotion: tr.emotion, Notes: tr.notes,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Trades");
      const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
      const uri = (FileSystem.documentDirectory ?? "") + "smcfx_journal_trades.xlsx";
      await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
      await Sharing.shareAsync(uri, { mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    } catch (e: unknown) {
      Alert.alert("Export Error", e instanceof Error ? e.message : String(e));
    } finally { setExporting(false); }
  };

  const buildPDFHtml = () => {
    const rows = trades.map((tr) => `
      <tr>
        <td>${tr.date.slice(0, 10)}</td>
        <td>${tr.pair}</td>
        <td>${tr.direction}</td>
        <td>${strategies.find((s) => s.id === tr.strategyId)?.name ?? tr.strategyId}</td>
        <td>${tr.pnl}</td>
        <td style="color:${tr.result === "WIN" ? "green" : tr.result === "LOSS" ? "red" : "gray"}">${tr.result}</td>
        <td>${tr.rr}</td>
        <td>${tr.notes?.slice(0, 60) ?? ""}</td>
      </tr>`).join("");
    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>body{font-family:Arial,sans-serif;padding:20px;direction:rtl}h1{color:#f5c518}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th{background:#0d1528;color:#deeaff;padding:8px;text-align:center}
      td{padding:6px 8px;border-bottom:1px solid #eee;text-align:center}
      .stats{display:flex;gap:16px;margin-bottom:20px}.stat{text-align:center;padding:12px;border:1px solid #ccc;border-radius:8px}
      .stat-val{font-size:24px;font-weight:bold}</style>
    </head><body>
      <h1>smcfx.journal — Trade Report</h1>
      <div class="stats">
        <div class="stat"><div class="stat-val">${stats.total}</div><div>Total Trades</div></div>
        <div class="stat"><div class="stat-val" style="color:green">${stats.winRate}%</div><div>Win Rate</div></div>
        <div class="stat"><div class="stat-val">${stats.pnl.toFixed(2)}$</div><div>Total P&L</div></div>
        <div class="stat"><div class="stat-val">${stats.avgRR}</div><div>Avg R:R</div></div>
      </div>
      <table>
        <tr><th>Date</th><th>Pair</th><th>Dir</th><th>Strategy</th><th>P&L</th><th>Result</th><th>R:R</th><th>Notes</th></tr>
        ${rows}
      </table>
    </body></html>`;
  };

  const topPad = Platform.OS === "web" ? 67 : 0;
  const bottomPad = Platform.OS === "web" ? 84 + 34 : 84;

  const analysisTabs = [
    { key: "emotion" as const, label: isFa ? "احساس" : "Emotion", color: colors.orange },
    { key: "strategy" as const, label: isFa ? "استراتژی" : "Strategy", color: colors.purple },
    { key: "trigger" as const, label: isFa ? "تریگر" : "Trigger", color: colors.teal },
  ];

  const currentAnalysisData =
    analysisTab === "emotion" ? boxStats?.byEmotion :
    analysisTab === "strategy" ? boxStats?.byStrategy :
    boxStats?.byTrigger;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPad + 10, paddingBottom: bottomPad, paddingHorizontal: 14 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Overall Metrics */}
        <View style={styles.grid}>
          {[
            { val: `${stats.winRate}%`, label: t("winRate"), color: colors.gold },
            { val: `${stats.pnl >= 0 ? "+" : ""}${stats.pnl.toFixed(1)}$`, label: t("totalPnL"), color: stats.pnl >= 0 ? colors.green : colors.red },
            { val: stats.avgRR, label: t("avgRR"), color: colors.blue },
            { val: stats.bestStreak.toString(), label: t("bestStreak"), color: colors.purple },
          ].map((item) => (
            <View key={item.label} style={[styles.metricCell, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <Text style={[styles.metricVal, { color: item.color }]}>{item.val}</Text>
              <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Trading Box Section */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardTitleRow}>
            <View style={styles.cardTitle}>
              <Feather name="box" size={13} color={colors.gold} />
              <Text style={[styles.cardTitleText, { color: colors.gold }]}>{t("tradingBox")}</Text>
            </View>
            <TouchableOpacity
              style={[styles.smallBtn, { backgroundColor: colors.gold + "22", borderColor: colors.gold + "40" }]}
              onPress={() => setBoxModalVisible(true)}
            >
              <Text style={[styles.smallBtnText, { color: colors.gold }]}>{t("addBox")}</Text>
            </TouchableOpacity>
          </View>

          {tradingBoxes.length === 0 ? (
            <View style={styles.emptySmall}>
              <Text style={[styles.emptySmallText, { color: colors.textTertiary }]}>{t("noBoxes")}</Text>
            </View>
          ) : (
            tradingBoxes.map((box) => {
              const bTrades = trades.filter((t) => t.boxId === box.id);
              const bWins = bTrades.filter((t) => t.result === "WIN").length;
              const bWR = bTrades.length > 0 ? ((bWins / bTrades.length) * 100).toFixed(0) : "0";
              const pct = Math.min(100, (bTrades.length / box.size) * 100);
              const isActive = settings.activeBoxId === box.id;
              return (
                <View key={box.id} style={[styles.boxRow, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      {isActive && (
                        <View style={[styles.activeDot, { backgroundColor: colors.green }]} />
                      )}
                      <Text style={[styles.boxName, { color: isActive ? colors.gold : colors.text }]}>{box.name}</Text>
                      <Text style={[styles.boxCount, { color: colors.textTertiary }]}>
                        {bTrades.length}/{box.size} · {bWR}%
                      </Text>
                    </View>
                    <View style={[styles.miniBar, { backgroundColor: colors.surface2 }]}>
                      <View style={[styles.miniBarFill, { width: `${pct}%` as any, backgroundColor: pct >= 100 ? colors.green : colors.gold }]} />
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {!isActive && (
                      <TouchableOpacity
                        style={[styles.boxBtn, { backgroundColor: colors.teal + "22", borderColor: colors.teal + "40" }]}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); updateSettings({ activeBoxId: box.id }); }}
                      >
                        <Text style={[styles.boxBtnText, { color: colors.teal }]}>{t("setActive")}</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.boxBtn, { backgroundColor: colors.red + "15", borderColor: colors.red + "30" }]}
                      onPress={() => confirmDeleteBox(box.id)}
                    >
                      <Feather name="trash-2" size={12} color={colors.red} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Box Analysis */}
        {activeBox && boxStats && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardTitle}>
              <Feather name="pie-chart" size={13} color={colors.purple} />
              <Text style={[styles.cardTitleText, { color: colors.purple }]}>
                {t("boxAnalysis")} — {activeBox.name}
              </Text>
            </View>

            {/* Box Summary */}
            <View style={styles.boxSumGrid}>
              {[
                { val: boxStats.total.toString(), label: isFa ? "معاملات" : "Trades", color: colors.text },
                { val: `${boxStats.winRate}%`, label: t("winRate"), color: parseFloat(boxStats.winRate) >= 50 ? colors.green : colors.red },
                { val: `${boxStats.wins}W / ${boxStats.losses}L`, label: isFa ? "برد/باخت" : "W/L", color: colors.gold },
                { val: `${boxStats.pnl >= 0 ? "+" : ""}${boxStats.pnl.toFixed(1)}$`, label: t("pnl"), color: boxStats.pnl >= 0 ? colors.green : colors.red },
              ].map((item) => (
                <View key={item.label} style={[styles.boxSumCell, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                  <Text style={[styles.boxSumVal, { color: item.color }]}>{item.val}</Text>
                  <Text style={[styles.boxSumLabel, { color: colors.textTertiary }]}>{item.label}</Text>
                </View>
              ))}
            </View>

            {/* Analysis Sub-tabs */}
            <View style={styles.analysisTabs}>
              {analysisTabs.map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.analysisTab,
                    {
                      backgroundColor: analysisTab === tab.key ? tab.color + "22" : colors.surface2,
                      borderColor: analysisTab === tab.key ? tab.color + "60" : colors.border,
                    },
                  ]}
                  onPress={() => setAnalysisTab(tab.key)}
                >
                  <Text style={[styles.analysisTabText, { color: analysisTab === tab.key ? tab.color : colors.textSecondary }]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {currentAnalysisData && currentAnalysisData.length > 0 ? (
              currentAnalysisData.map((item) => {
                const wr = parseInt(item.wr, 10);
                const barColor = wr >= 60 ? colors.green : wr >= 40 ? colors.gold : colors.red;
                return (
                  <View key={item.label} style={[styles.analysisRow, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                        <Text style={[styles.analysisLabel, { color: colors.text }]}>{item.label}</Text>
                        <Text style={[styles.analysisWR, { color: barColor }]}>{item.wr}%</Text>
                      </View>
                      <View style={[styles.miniBar, { backgroundColor: colors.surface2 }]}>
                        <View style={[styles.miniBarFill, { width: `${wr}%` as any, backgroundColor: barColor }]} />
                      </View>
                      <Text style={[styles.analysisSub, { color: colors.textTertiary }]}>
                        {item.total} {isFa ? "معامله" : "trades"} · {item.wins} {isFa ? "برد" : "wins"}
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={[styles.noData, { color: colors.textTertiary }]}>
                {isFa ? "داده‌ای برای نمایش نیست" : "No data to display"}
              </Text>
            )}
          </View>
        )}

        {/* 100 Trade Progress */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardTitle}>
            <Feather name="target" size={13} color={colors.gold} />
            <Text style={[styles.cardTitleText, { color: colors.gold }]}>{t("progress100")}</Text>
          </View>
          <View style={styles.progressWrap}>
            <View style={styles.progressHdr}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>{t("target100")}</Text>
              <Text style={[styles.progressPct, { color: colors.gold }]}>{Math.min(100, stats.total)}/100</Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.surface2 }]}>
              <View style={[styles.progressFill, { width: `${Math.min(100, (stats.total / 100) * 100)}%` as any, backgroundColor: colors.green }]} />
            </View>
          </View>
          <View style={[styles.infoBox, { backgroundColor: colors.orange + "12", borderColor: colors.orange + "40" }]}>
            <Text style={[styles.infoText, { color: colors.orange }]}>
              با یک استراتژی حداقل ۱۰۰ معامله بدون تغییر بزن، سپس آمارگیری کن
            </Text>
          </View>
        </View>

        {/* Strategy Stats */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardTitle}>
            <Feather name="bar-chart-2" size={13} color={colors.blue} />
            <Text style={[styles.cardTitleText, { color: colors.blue }]}>{t("strategyStats")}</Text>
          </View>
          {stats.stratStats.filter((s) => s.total > 0).map((s) => (
            <View key={s.id} style={[styles.stratRow, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stratName, { color: colors.text }]}>{s.name}</Text>
                <Text style={[styles.stratSub, { color: colors.textTertiary }]}>
                  {s.total} {t("totalTrades")} · {s.wins} {t("wins")}
                </Text>
              </View>
              <View style={styles.stratMeta}>
                <Text style={[styles.stratWR, { color: parseFloat(s.wr) >= 50 ? colors.green : colors.red }]}>{s.wr}%</Text>
                <Text style={[styles.stratPnL, { color: s.pnl >= 0 ? colors.green : colors.red }]}>
                  {s.pnl >= 0 ? "+" : ""}{s.pnl.toFixed(1)}$
                </Text>
              </View>
            </View>
          ))}
          {stats.stratStats.every((s) => s.total === 0) && (
            <Text style={[styles.noData, { color: colors.textTertiary }]}>{t("noTrades")}</Text>
          )}
        </View>

        {/* Error Analysis */}
        {stats.topErrors.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardTitle}>
              <Feather name="alert-triangle" size={13} color={colors.red} />
              <Text style={[styles.cardTitleText, { color: colors.red }]}>{t("errorAnalysis")}</Text>
            </View>
            {stats.topErrors.map(([err, count]) => (
              <View key={err} style={[styles.errRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.errName, { color: colors.textSecondary }]}>{err}</Text>
                <View style={[styles.errBadge, { backgroundColor: colors.red + "15", borderColor: colors.red + "40" }]}>
                  <Text style={[styles.errCount, { color: colors.red }]}>{count}x</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Export */}
        <View style={styles.exportRow}>
          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: colors.blue + "22", borderColor: colors.blue + "40" }]}
            onPress={exportPDF} disabled={exporting}
          >
            <Feather name="file-text" size={16} color={colors.blue} />
            <Text style={[styles.exportText, { color: colors.blue }]}>{t("exportPDF")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: colors.green + "22", borderColor: colors.green + "40" }]}
            onPress={exportExcel} disabled={exporting}
          >
            <Feather name="download" size={16} color={colors.green} />
            <Text style={[styles.exportText, { color: colors.green }]}>{t("exportExcel")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* New Box Modal */}
      <Modal visible={boxModalVisible} animationType="slide" transparent onRequestClose={() => setBoxModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t("addBox")}</Text>
              <TouchableOpacity onPress={() => setBoxModalVisible(false)}>
                <Feather name="x" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t("boxName")}</Text>
            <TextInput
              value={newBoxName}
              onChangeText={setNewBoxName}
              placeholder={isFa ? "مثال: باکس اول ۱۴۰۴" : "e.g. Box Q1 2025"}
              placeholderTextColor={colors.textTertiary}
              style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
            />
            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 12 }]}>{t("boxSize")}</Text>
            <TextInput
              value={newBoxSize}
              onChangeText={setNewBoxSize}
              keyboardType="numeric"
              placeholder="50"
              placeholderTextColor={colors.textTertiary}
              style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}
                onPress={() => setBoxModalVisible(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>{t("cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.gold }]} onPress={createBox}>
                <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>{t("save")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {},
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 13 },
  metricCell: { flex: 1, minWidth: "45%", alignItems: "center", paddingVertical: 14, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1 },
  metricVal: { fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold" },
  metricLabel: { fontSize: 10, marginTop: 3, fontFamily: "Inter_400Regular" },
  card: { borderRadius: 14, padding: 14, marginBottom: 13, borderWidth: 1 },
  cardTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "rgba(100,180,255,0.12)" },
  cardTitle: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "rgba(100,180,255,0.12)" },
  cardTitleText: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  smallBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1 },
  smallBtnText: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  emptySmall: { paddingVertical: 16, alignItems: "center" },
  emptySmallText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  boxRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 1 },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  boxName: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  boxCount: { fontSize: 11, fontFamily: "Inter_400Regular" },
  miniBar: { height: 5, borderRadius: 3, overflow: "hidden", marginTop: 4 },
  miniBarFill: { height: "100%", borderRadius: 3 },
  boxBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  boxBtnText: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  boxSumGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  boxSumCell: { flex: 1, minWidth: "44%", alignItems: "center", paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  boxSumVal: { fontSize: 14, fontWeight: "800", fontFamily: "Inter_700Bold" },
  boxSumLabel: { fontSize: 10, marginTop: 2, fontFamily: "Inter_400Regular" },
  analysisTabs: { flexDirection: "row", gap: 6, marginBottom: 12 },
  analysisTab: { flex: 1, paddingVertical: 7, alignItems: "center", borderRadius: 20, borderWidth: 1 },
  analysisTabText: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  analysisRow: { paddingVertical: 10, borderBottomWidth: 1 },
  analysisLabel: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  analysisWR: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold" },
  analysisSub: { fontSize: 10, marginTop: 4, fontFamily: "Inter_400Regular" },
  progressWrap: { marginBottom: 10 },
  progressHdr: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  progressLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  progressPct: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },
  progressBar: { height: 7, borderRadius: 10, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 10 },
  infoBox: { padding: 10, borderRadius: 10, borderWidth: 1 },
  infoText: { fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular" },
  stratRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1 },
  stratName: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  stratSub: { fontSize: 11, marginTop: 2, fontFamily: "Inter_400Regular" },
  stratMeta: { alignItems: "flex-end", gap: 2 },
  stratWR: { fontSize: 15, fontWeight: "800", fontFamily: "Inter_700Bold" },
  stratPnL: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  errRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1 },
  errName: { fontSize: 12, fontFamily: "Inter_400Regular" },
  errBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  errCount: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },
  exportRow: { flexDirection: "row", gap: 10 },
  exportBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 13, borderRadius: 10, borderWidth: 1 },
  exportText: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  noData: { fontSize: 12, textAlign: "center", paddingVertical: 16, fontFamily: "Inter_400Regular" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalBox: { borderRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: 20, borderWidth: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: "800", fontFamily: "Inter_700Bold" },
  fieldLabel: { fontSize: 12, fontWeight: "500", marginBottom: 6, fontFamily: "Inter_500Medium" },
  input: { height: 46, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 13, fontFamily: "Inter_400Regular" },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center", borderWidth: 1 },
  cancelBtnText: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  saveBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center" },
  saveBtnText: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
});

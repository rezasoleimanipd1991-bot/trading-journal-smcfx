import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
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
import { VoiceInput } from "@/components/VoiceInput";
import { EducationalNote, useApp, useT } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type NoteType = EducationalNote["type"];
type Category = "all" | NoteType;

const TYPE_META: Record<NoteType, { icon: React.ComponentProps<typeof Feather>["name"]; colorKey: string }> = {
  tip:   { icon: "star",      colorKey: "gold"  },
  video: { icon: "play",      colorKey: "red"   },
  rule:  { icon: "shield",    colorKey: "blue"  },
  note:  { icon: "file-text", colorKey: "teal"  },
};

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

export default function AcademyScreen() {
  const colors = useColors();
  const t = useT();
  const { educationalNotes, addEducationalNote, updateEducationalNote, deleteEducationalNote, settings } = useApp();

  const isFa = settings.language === "fa";
  const [category, setCategory] = useState<Category>("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [link, setLink] = useState("");
  const [videoUri, setVideoUri] = useState("");
  const [noteType, setNoteType] = useState<NoteType>("tip");
  const [pickingVideo, setPickingVideo] = useState(false);

  const filtered = useMemo(() => {
    if (category === "all") return educationalNotes;
    return educationalNotes.filter((n) => n.type === category);
  }, [educationalNotes, category]);

  const openAdd = () => {
    setEditingId(null);
    setTitle("");
    setContent("");
    setLink("");
    setVideoUri("");
    setNoteType("tip");
    setModalVisible(true);
  };

  const openEdit = (note: EducationalNote) => {
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setLink(note.link ?? "");
    setVideoUri(note.videoUri ?? "");
    setNoteType(note.type);
    setModalVisible(true);
  };

  const saveNote = () => {
    if (!title.trim()) {
      Alert.alert(isFa ? "عنوان را وارد کنید" : "Enter a title");
      return;
    }
    const payload = {
      title: title.trim(),
      content: content.trim(),
      link: link.trim(),
      videoUri: videoUri.trim(),
      type: noteType,
    };
    if (editingId) {
      updateEducationalNote(editingId, payload);
    } else {
      addEducationalNote(payload);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setModalVisible(false);
  };

  // ─── pickVideo: supports both web and native ─────────────────────────────
  const pickVideo = async () => {
    setPickingVideo(true);
    try {
      if (Platform.OS === "web") {
        const uri = await pickVideoWeb();
        if (uri) {
          setVideoUri(uri);
          if (noteType !== "video") setNoteType("video");
        }
      } else {
        const ImagePicker = await import("expo-image-picker");
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            isFa ? "دسترسی لازم است" : "Permission Required",
            isFa ? "برای انتخاب ویدیو دسترسی گالری لازم است" : "Media library permission is required"
          );
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["video"] as any,
          allowsEditing: false,
          quality: 1,
        });
        if (!result.canceled && result.assets && result.assets[0]) {
          setVideoUri(result.assets[0].uri);
          if (noteType !== "video") setNoteType("video");
        }
      }
    } catch {
      Alert.alert(isFa ? "خطا در انتخاب ویدیو" : "Could not pick video");
    } finally {
      setPickingVideo(false);
    }
  };

  const confirmDelete = (id: string) => {
    Alert.alert(t("confirmDelete"), "", [
      { text: t("no"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          deleteEducationalNote(id);
        },
      },
    ]);
  };

  const openLink = async (url: string) => {
    if (!url) return;
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    try {
      await Linking.openURL(fullUrl);
    } catch {
      Alert.alert(isFa ? "خطا در باز کردن لینک" : "Cannot open link");
    }
  };

  const noteTypeColor = (type: NoteType): string => ({
    tip: colors.gold, video: colors.red, rule: colors.blue, note: colors.teal,
  }[type]);

  const noteTypeLabel = (type: NoteType): string => isFa
    ? { tip: "نکته", video: "ویدیو", rule: "قانون", note: "یادداشت" }[type]
    : { tip: "Tip", video: "Video", rule: "Rule", note: "Note" }[type];

  const topPad = Platform.OS === "web" ? 67 : 0;
  const bottomPad = Platform.OS === "web" ? 84 + 34 : 84;

  const categories: { key: Category; label: string; color: string }[] = [
    { key: "all",   label: t("allNotes"),          color: colors.textSecondary },
    { key: "tip",   label: t("teacherNotes"),      color: colors.gold          },
    { key: "video", label: t("educationalVideos"), color: colors.red           },
    { key: "rule",  label: t("rules"),             color: colors.blue          },
    { key: "note",  label: t("noteTypeNote"),      color: colors.teal          },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 10, paddingBottom: bottomPad, paddingHorizontal: 14 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textTertiary }]}>
            {isFa ? "آکادمی آموزشی" : "Learning Academy"}
          </Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.gold }]}
            onPress={openAdd}
          >
            <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>
              {t("addNote")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 14 }}
          contentContainerStyle={{ gap: 6, paddingHorizontal: 2 }}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.catBtn,
                {
                  backgroundColor: category === cat.key ? cat.color + "22" : colors.surface2,
                  borderColor: category === cat.key ? cat.color + "70" : colors.border,
                },
              ]}
              onPress={() => setCategory(cat.key)}
            >
              <Text style={[styles.catText, { color: category === cat.key ? cat.color : colors.textSecondary }]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Notes List */}
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="book" size={36} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textTertiary }]}>{t("noNotes")}</Text>
            <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>{t("noNotesHint")}</Text>
          </View>
        ) : (
          filtered.map((note) => {
            const meta = TYPE_META[note.type];
            const typeColor = noteTypeColor(note.type);
            const hasVideo = !!note.videoUri;
            const hasLink = !!note.link;
            return (
              <View
                key={note.id}
                style={[
                  styles.noteCard,
                  { backgroundColor: colors.card, borderColor: typeColor + "40", borderLeftColor: typeColor, borderLeftWidth: 3 },
                ]}
              >
                <View style={styles.noteHeader}>
                  <View style={[styles.typeBadge, { backgroundColor: typeColor + "18" }]}>
                    <Feather name={meta.icon} size={12} color={typeColor} />
                    <Text style={[styles.typeLabel, { color: typeColor }]}>
                      {noteTypeLabel(note.type)}
                    </Text>
                  </View>
                  <View style={styles.noteActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.surface2 }]}
                      onPress={() => openEdit(note)}
                    >
                      <Feather name="edit-2" size={13} color={colors.blue} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.surface2 }]}
                      onPress={() => confirmDelete(note.id)}
                    >
                      <Feather name="trash-2" size={13} color={colors.red} />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={[styles.noteTitle, { color: colors.text }]}>{note.title}</Text>
                {!!note.content && (
                  <Text style={[styles.noteContent, { color: colors.textSecondary }]}>
                    {note.content}
                  </Text>
                )}

                {hasVideo && (
                  <View style={[styles.videoIndicator, { backgroundColor: colors.red + "15", borderColor: colors.red + "40" }]}>
                    <Feather name="video" size={13} color={colors.red} />
                    <Text style={[styles.videoIndicatorText, { color: colors.red }]} numberOfLines={1}>
                      {note.videoUri.split("/").pop() ?? "video"}
                    </Text>
                    <Feather name="check-circle" size={12} color={colors.green} />
                  </View>
                )}

                {hasLink && (
                  <TouchableOpacity
                    style={[styles.linkBtn, { backgroundColor: typeColor + "15", borderColor: typeColor + "40" }]}
                    onPress={() => openLink(note.link)}
                  >
                    <Feather name="external-link" size={12} color={typeColor} />
                    <Text style={[styles.linkText, { color: typeColor }]} numberOfLines={1}>
                      {note.link}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingId ? t("edit") : t("addNote")}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Type Selector */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t("noteType")}</Text>
              <View style={styles.typeRow}>
                {(["tip", "video", "rule", "note"] as NoteType[]).map((tp) => {
                  const c = noteTypeColor(tp);
                  return (
                    <TouchableOpacity
                      key={tp}
                      style={[
                        styles.typeBtn,
                        {
                          backgroundColor: noteType === tp ? c + "22" : colors.surface2,
                          borderColor: noteType === tp ? c + "70" : colors.border,
                        },
                      ]}
                      onPress={() => setNoteType(tp)}
                    >
                      <Feather name={TYPE_META[tp].icon} size={13} color={noteType === tp ? c : colors.textTertiary} />
                      <Text style={[styles.typeBtnText, { color: noteType === tp ? c : colors.textSecondary }]}>
                        {noteTypeLabel(tp)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t("noteTitle")}</Text>
              <VoiceInput
                value={title}
                onChangeText={setTitle}
                placeholder={isFa ? "عنوان یادداشت..." : "Note title..."}
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 10 }]}>{t("noteContent")}</Text>
              <VoiceInput
                value={content}
                onChangeText={setContent}
                multiline
                minHeight={80}
                placeholder={isFa ? "توضیحات، نکات، آموزش‌ها..." : "Details, tips, lessons..."}
              />

              {/* Video Upload — FIX: now works on web too */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 10 }]}>
                {isFa ? "ویدیو (فایل)" : "Video (File)"}
              </Text>
              <TouchableOpacity
                style={[
                  styles.videoPickBtn,
                  { backgroundColor: colors.red + "15", borderColor: colors.red + "40",
                    opacity: pickingVideo ? 0.6 : 1 },
                ]}
                onPress={pickVideo}
                disabled={pickingVideo}
              >
                <Feather name="video" size={16} color={colors.red} />
                <Text style={[styles.videoPickText, { color: colors.red }]}>
                  {pickingVideo
                    ? (isFa ? "در حال انتخاب..." : "Selecting...")
                    : videoUri
                    ? (isFa ? "ویدیو انتخاب شد ✓" : "Video selected ✓")
                    : (isFa ? "انتخاب ویدیو از گالری" : "Pick video from gallery")}
                </Text>
                {!!videoUri && (
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation?.(); setVideoUri(""); }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Feather name="x-circle" size={16} color={colors.red} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {/* External Link */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 10 }]}>{t("noteLink")}</Text>
              <TextInput
                value={link}
                onChangeText={setLink}
                placeholder={isFa ? "لینک یوتیوب، تلگرام یا سایت..." : "YouTube, Telegram, or website link..."}
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                keyboardType="url"
                style={[
                  styles.linkInput,
                  { backgroundColor: colors.input, borderColor: colors.border, color: colors.text },
                ]}
              />

              <View style={styles.modalBtns}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>{t("cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.gold }]}
                  onPress={saveNote}
                >
                  <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>{t("save")}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {},
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  headerTitle: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, fontFamily: "Inter_600SemiBold" },
  addBtn: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20 },
  addBtnText: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold" },
  catBtn: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  catText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  empty: { alignItems: "center", paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  emptyHint: { fontSize: 12, fontFamily: "Inter_400Regular" },
  noteCard: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  noteHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  typeBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  typeLabel: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  noteActions: { flexDirection: "row", gap: 6 },
  actionBtn: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  noteTitle: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold", marginBottom: 6 },
  noteContent: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular", marginBottom: 8 },
  videoIndicator: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, marginBottom: 6,
  },
  videoIndicatorText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular" },
  linkBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  linkText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalBox: { borderRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: 20, borderWidth: 1, maxHeight: "88%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: "800", fontFamily: "Inter_700Bold" },
  fieldLabel: { fontSize: 12, fontWeight: "500", marginBottom: 6, fontFamily: "Inter_500Medium" },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  typeBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  typeBtnText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  videoPickBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 13, borderRadius: 10, borderWidth: 1,
  },
  videoPickText: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "center" },
  linkInput: { height: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 12, fontFamily: "Inter_400Regular" },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 16, marginBottom: 8 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center", borderWidth: 1 },
  cancelBtnText: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  saveBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center" },
  saveBtnText: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
});

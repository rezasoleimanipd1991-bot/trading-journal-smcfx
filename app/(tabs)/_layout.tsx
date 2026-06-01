import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";

export default function TabLayout() {
  const colors = useColors();
  const { settings } = useApp();
  const isFa = settings.language === "fa";
  const hidden = settings.hiddenTabs ?? [];

  const label = (fa: string, en: string) => (isFa ? fa : en);

  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: isWeb ? 84 : 60,
          paddingBottom: isWeb ? 34 : 0,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface }]} />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 9,
          fontFamily: "Inter_500Medium",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: label("چک‌لیست", "Checklist"),
          href: hidden.includes("checklist") ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Feather name="check-square" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: label("ژورنال", "Journal"),
          href: hidden.includes("journal") ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Feather name="book-open" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="strategies"
        options={{
          title: label("استراتژی", "Strategy"),
          href: hidden.includes("strategies") ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Feather name="layers" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: label("آمار", "Stats"),
          href: hidden.includes("stats") ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Feather name="bar-chart-2" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="academy"
        options={{
          title: label("آکادمی", "Academy"),
          href: hidden.includes("academy") ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Feather name="book" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: label("تنظیمات", "Settings"),
          href: hidden.includes("settings") ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Feather name="settings" size={size - 2} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

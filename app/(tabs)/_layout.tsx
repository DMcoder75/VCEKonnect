import React, { useState, useEffect } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, View, Animated } from 'react-native';
import { colors } from '@/constants/theme';
import { QuickAccessDrawer, FloatingMenuButton } from '@/components/ui';
import { useStudyTimer } from '@/hooks/useStudyTimer';

// Animated Study Tab Icon that blinks red when timer is running
function StudyTabIcon({ color, size, isRunning }: { color: string; size: number; isRunning: boolean }) {
  const [blinkAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (isRunning) {
      const blink = Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      blink.start();
      return () => blink.stop();
    } else {
      blinkAnim.setValue(1);
    }
  }, [isRunning]);

  const iconColor = isRunning ? colors.error : color;

  return (
    <Animated.View style={{ opacity: blinkAnim }}>
      <MaterialIcons name="timer" size={size} color={iconColor} />
    </Animated.View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { isRunning } = useStudyTimer();

  const tabBarStyle = {
    height: Platform.select({
      ios: insets.bottom + 60,
      android: insets.bottom + 60,
      default: 70,
    }),
    paddingTop: 8,
    paddingBottom: Platform.select({
      ios: insets.bottom + 8,
      android: insets.bottom + 8,
      default: 8,
    }),
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  };

  return (
    <View style={{ flex: 1 }}>
      <FloatingMenuButton onPress={() => setIsDrawerOpen(true)} />
      <QuickAccessDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="dashboard" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="atar"
        options={{
          title: 'ATAR',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="assessment" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="study"
        options={{
          title: 'Study',
          tabBarIcon: ({ color, size }) => (
            <StudyTabIcon color={color} size={size} isRunning={isRunning} />
          ),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: 'Notes',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="note" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pathway"
        options={{
          title: 'Pathway',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="school" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="event" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
    </View>
  );
}

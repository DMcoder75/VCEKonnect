import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

interface FloatingMenuButtonProps {
  onPress: () => void;
}

export default function FloatingMenuButton({ onPress }: FloatingMenuButtonProps) {
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      style={[styles.button, { top: insets.top + spacing.md }]}
      onPress={onPress}
    >
      <LinearGradient
        colors={['#9b6fff', '#7b4fff', '#6b3fff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.iconContainer}>
          <View style={styles.line} />
          <View style={styles.line} />
          <View style={styles.line} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: spacing.md,
    zIndex: 998,
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  gradient: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    gap: 5,
  },
  line: {
    width: 24,
    height: 3,
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
});

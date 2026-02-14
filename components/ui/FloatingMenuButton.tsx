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
        colors={['rgba(155, 111, 255, 0.5)', 'rgba(123, 79, 255, 0.5)', 'rgba(107, 63, 255, 0.5)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.iconContainer}>
          <View style={styles.lineTop} />
          <View style={styles.lineMiddle} />
          <View style={styles.lineBottom} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: spacing.md,
    zIndex: 10,
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
    alignItems: 'flex-start',
  },
  lineTop: {
    width: 16,
    height: 3,
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  lineMiddle: {
    width: 20,
    height: 3,
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  lineBottom: {
    width: 24,
    height: 3,
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
});

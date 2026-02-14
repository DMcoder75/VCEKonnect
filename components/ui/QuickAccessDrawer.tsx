import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Dimensions, PanResponder } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DRAWER_WIDTH = 280;
const DRAG_HANDLE_WIDTH = 4;
const SWIPE_THRESHOLD = 50;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface QuickAccessDrawerProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export default function QuickAccessDrawer({ isOpen, onOpen, onClose }: QuickAccessDrawerProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const pan = useRef(new Animated.ValueXY()).current;

  React.useEffect(() => {
    Animated.timing(translateX, {
      toValue: isOpen ? 0 : -DRAWER_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOpen]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const { dx, dy } = gestureState;
        // Only respond to horizontal swipes
        return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x._value,
          y: 0,
        });
      },
      onPanResponderMove: (evt, gestureState) => {
        // Allow dragging from -DRAWER_WIDTH to 0
        const newX = Math.max(-DRAWER_WIDTH, Math.min(0, gestureState.dx + (isOpen ? 0 : -DRAWER_WIDTH)));
        translateX.setValue(newX);
      },
      onPanResponderRelease: (evt, gestureState) => {
        pan.flattenOffset();
        const { dx } = gestureState;
        
        // If swiped right more than threshold, open
        if (dx > SWIPE_THRESHOLD && !isOpen) {
          onOpen();
        }
        // If swiped left more than threshold, close
        else if (dx < -SWIPE_THRESHOLD && isOpen) {
          onClose();
        }
        // Otherwise, snap to current state
        else {
          Animated.timing(translateX, {
            toValue: isOpen ? 0 : -DRAWER_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const menuItems = [
    {
      icon: 'privacy-tip' as const,
      label: 'Privacy Policy',
      route: '/privacy',
      color: colors.primary,
    },
    {
      icon: 'help-outline' as const,
      label: 'FAQ',
      route: '/faq',
      color: colors.success,
    },
    {
      icon: 'settings' as const,
      label: 'Settings',
      route: '/settings',
      color: colors.textSecondary,
    },
  ];

  function handleNavigate(route: string) {
    onClose();
    router.push(route as any);
  }

  return (
    <>
      {/* Backdrop - only show when open */}
      {isOpen && (
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
        />
      )}

      {/* Drag Handle - always visible */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.dragHandle,
          {
            top: insets.top + spacing.md,
            transform: [{ translateX: Animated.add(translateX, DRAWER_WIDTH - DRAG_HANDLE_WIDTH) }],
          },
        ]}
      >
        <View style={styles.dragLine} />
      </Animated.View>

      {/* Drawer */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.drawer,
          {
            transform: [{ translateX }],
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.md,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Quick Access</Text>
            <Text style={styles.subtitle}>FairPrep by Dalsi Academy</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Menu Items */}
        <View style={styles.menuList}>
          {menuItems.map((item, index) => (
            <Pressable
              key={index}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.menuItemPressed,
              ]}
              onPress={() => handleNavigate(item.route)}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
                <MaterialIcons name={item.icon} size={24} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textTertiary} />
            </Pressable>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Version 1.0.0</Text>
          <Text style={styles.footerText}>© 2026 Dalsi Firm</Text>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  dragHandle: {
    position: 'absolute',
    left: 0,
    width: 40,
    height: 80,
    zIndex: 1001,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragLine: {
    width: DRAG_HANDLE_WIDTH,
    height: 50,
    backgroundColor: colors.primary,
    borderTopRightRadius: borderRadius.sm,
    borderBottomRightRadius: borderRadius.sm,
    opacity: 0.6,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: colors.surface,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  closeButton: {
    padding: spacing.xs,
  },
  menuList: {
    flex: 1,
    paddingTop: spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  menuItemPressed: {
    backgroundColor: colors.surfaceElevated,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: typography.body,
    fontWeight: typography.medium,
    color: colors.textPrimary,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  footerText: {
    fontSize: typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
});

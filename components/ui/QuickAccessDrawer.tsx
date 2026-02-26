import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';

const DRAWER_WIDTH = 280;

interface QuickAccessDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickAccessDrawer({ isOpen, onClose }: QuickAccessDrawerProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  // Helper function to capitalize first letter
  function capitalizeFirstLetter(name: string): string {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }

  // Get state display name
  function getStateDisplayName(stateId: string | undefined): string {
    if (!stateId) return 'VIC';
    return stateId.toUpperCase();
  }

  React.useEffect(() => {
    Animated.timing(translateX, {
      toValue: isOpen ? 0 : -DRAWER_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOpen]);

  const menuItems = [
    {
      icon: 'auto-awesome' as const,
      label: 'AI Study Plan',
      route: '/ai-study-plan',
      color: colors.primary,
      premium: true,
    },
    {
      icon: 'lightbulb' as const,
      label: 'AI Recommends',
      route: '/ai-recommendations',
      color: colors.success,
      premium: true,
    },
    {
      icon: 'quiz' as const,
      label: 'AI Questions',
      route: '/ai-questions',
      color: colors.warning,
      premium: true,
    },
    {
      icon: 'file-download' as const,
      label: 'Export Data',
      route: '/export-data',
      color: colors.premium,
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

  async function handleLogout() {
    onClose();
    await logout();
    router.replace('/auth/login');
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

      {/* Drawer */}
      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [{ translateX }],
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.md,
          },
        ]}
      >
        {/* Background Image */}
        <Image
          source={require('@/assets/panel-background-v3.png')}
          style={styles.backgroundImage}
          contentFit="cover"
          transition={200}
        />
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* User Profile Section */}
        {user && (
          <View style={styles.profileSection}>
            <View style={styles.profileAvatar}>
              <MaterialIcons name="person" size={32} color={colors.primary} />
            </View>
            <Text style={styles.profileName}>{capitalizeFirstLetter(user.name)}</Text>
            <Text style={styles.profileMeta}>
              Year {user.yearLevel} · {getStateDisplayName(user.stateId)}
            </Text>
          </View>
        )}

        {/* Menu Items */}
        <ScrollView 
          style={styles.menuList}
          contentContainerStyle={styles.menuListContent}
          showsVerticalScrollIndicator={false}
        >
          {/* AI Features Section */}
          <Text style={styles.sectionTitle}>AI Features (Premium)</Text>
          {menuItems.filter(item => item.premium).map((item, index) => (
            <Pressable
              key={`premium-${index}`}
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
          
          {/* Divider */}
          <View style={styles.divider} />
          
          {/* General Section */}
          <Text style={styles.sectionTitle}>General</Text>
          {menuItems.filter(item => !item.premium).map((item, index) => (
            <Pressable
              key={`general-${index}`}
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

          {/* Logout Option */}
          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              pressed && styles.menuItemPressed,
            ]}
            onPress={handleLogout}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${colors.error}20` }]}>
              <MaterialIcons name="logout" size={24} color={colors.error} />
            </View>
            <Text style={[styles.menuLabel, styles.logoutLabel]}>Logout</Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.textTertiary} />
          </Pressable>
        </ScrollView>

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
    backgroundColor: '#000000',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
  },
  closeButton: {
    padding: spacing.xs,
    backgroundColor: colors.surface + '80',
    borderRadius: borderRadius.full,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.sm,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  profileName: {
    fontSize: 16,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  profileMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: typography.medium,
  },
  menuList: {
    flex: 1,
  },
  menuListContent: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: typography.semibold,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 6,
    marginHorizontal: spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  menuItemPressed: {
    backgroundColor: colors.surfaceElevated,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
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
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    height: '100%',
    opacity: 0.3,
  },
  logoutLabel: {
    color: colors.error,
  },
});

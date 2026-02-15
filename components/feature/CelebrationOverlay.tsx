import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { colors } from '@/constants/theme';

interface CelebrationOverlayProps {
  show: boolean;
  onComplete?: () => void;
}

interface Confetti {
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  color: string;
}

const { width, height } = Dimensions.get('window');
const CONFETTI_COUNT = 30;
const COLORS = [colors.primary, colors.success, colors.warning, colors.premium, '#FF6B6B', '#4ECDC4', '#FFE66D'];

export function CelebrationOverlay({ show, onComplete }: CelebrationOverlayProps) {
  const confettiArray = useRef<Confetti[]>([]);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initialize confetti particles
    if (confettiArray.current.length === 0) {
      confettiArray.current = Array.from({ length: CONFETTI_COUNT }, () => ({
        x: new Animated.Value(Math.random() * width),
        y: new Animated.Value(-20),
        rotate: new Animated.Value(0),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }));
    }

    if (show) {
      // Fade in
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Animate confetti
      const animations = confettiArray.current.map((confetti) => {
        return Animated.parallel([
          Animated.timing(confetti.y, {
            toValue: height + 50,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
          Animated.timing(confetti.x, {
            toValue: confetti.x._value + (Math.random() - 0.5) * 100,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
          Animated.timing(confetti.rotate, {
            toValue: 360 * (2 + Math.random() * 3),
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
        ]);
      });

      Animated.parallel(animations).start(() => {
        // Fade out
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          // Reset positions
          confettiArray.current.forEach((confetti) => {
            confetti.x.setValue(Math.random() * width);
            confetti.y.setValue(-20);
            confetti.rotate.setValue(0);
          });
          onComplete?.();
        });
      });
    }
  }, [show]);

  if (!show) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity }]} pointerEvents="none">
      {confettiArray.current.map((confetti, index) => (
        <Animated.View
          key={index}
          style={[
            styles.confetti,
            {
              backgroundColor: confetti.color,
              transform: [
                { translateX: confetti.x },
                { translateY: confetti.y },
                {
                  rotate: confetti.rotate.interpolate({
                    inputRange: [0, 360],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    pointerEvents: 'none',
  },
  confetti: {
    position: 'absolute',
    width: 8,
    height: 12,
    borderRadius: 2,
  },
});

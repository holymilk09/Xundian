import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, FontSize, BorderRadius } from '../theme';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  colorFrom?: string;
  colorTo?: string;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function GradientButton({
  title,
  onPress,
  colorFrom = Colors.primary,
  colorTo = Colors.primaryDark,
  disabled = false,
  style,
  textStyle,
}: GradientButtonProps) {
  // React Native doesn't have native linear gradients without react-native-linear-gradient.
  // Using the "from" color as a solid background; in production, wrap with LinearGradient.
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        styles.button,
        { backgroundColor: colorFrom, opacity: disabled ? 0.5 : 1 },
        style,
      ]}
    >
      <Text style={[styles.text, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: FontSize.md + 1,
    fontWeight: '600',
  },
});

import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useHaptics } from '@/hooks/useHaptics';
import { alpha, motion, palette, radius, spacing } from '@/constants/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  /** Places the icon after the label — used for outbound links. */
  iconTrailing?: boolean;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

const HEIGHTS: Record<ButtonSize, number> = { sm: 38, md: 50, lg: 56 };

/**
 * The button.
 *
 * `primary` is a solid ultramarine plate — the loudest thing on any screen, so there
 * is never more than one in view. Everything else is a white plate with a hairline.
 * Press darkens rather than fading, which reads as ink rather than as a web link.
 */
export function Button({
  label,
  onPress,
  variant = 'secondary',
  size = 'md',
  icon,
  iconTrailing = false,
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  accessibilityHint,
}: ButtonProps) {
  const { tap } = useHaptics();
  const [pressed, setPressed] = useState(false);
  const wash = useSharedValue(0);
  const isDisabled = disabled || loading;

  // Press state drives the wash through an effect rather than being written from the
  // handlers directly: the animation stays declarative and always settles, even if a
  // press-out is swallowed by a gesture being cancelled.
  useEffect(() => {
    wash.value = withTiming(pressed ? 1 : 0, {
      duration: pressed ? motion.instant : motion.fast,
    });
  }, [pressed, wash]);

  const washStyle = useAnimatedStyle(() => ({ opacity: wash.value }));

  const handlePress = useCallback(() => {
    if (isDisabled) return;
    tap();
    onPress?.();
  }, [isDisabled, onPress, tap]);

  const height = HEIGHTS[size];
  const contentColor = resolveContentColor(variant, isDisabled);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={handlePress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={isDisabled}
      style={[
        styles.base,
        { height, paddingHorizontal: size === 'sm' ? spacing.base : spacing.xl },
        fullWidth && styles.fullWidth,
        variantStyle(variant, isDisabled),
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: variant === 'primary' ? palette.accentDeep : alpha.press },
          washStyle,
        ]}
      />

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={contentColor} />
        ) : (
          <>
            {icon && !iconTrailing && (
              <Icon name={icon} size={16} color={contentColor} strokeWidth={1.7} />
            )}
            <Text
              variant="label"
              style={{ color: contentColor }}
              uppercase
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {label}
            </Text>
            {icon && iconTrailing && (
              <Icon name={icon} size={16} color={contentColor} strokeWidth={1.7} />
            )}
          </>
        )}
      </View>
    </Pressable>
  );
}

function resolveContentColor(variant: ButtonVariant, disabled: boolean): string {
  if (disabled) return palette.faint;
  switch (variant) {
    case 'primary':
      return palette.onAccent;
    case 'danger':
      return palette.danger;
    case 'ghost':
      return palette.accent;
    default:
      return palette.ink;
  }
}

function variantStyle(variant: ButtonVariant, disabled: boolean): ViewStyle {
  if (disabled) {
    return {
      backgroundColor: palette.paperSunk,
      borderColor: palette.rule,
      borderWidth: StyleSheet.hairlineWidth,
    };
  }
  switch (variant) {
    case 'primary':
      return { backgroundColor: palette.accent };
    case 'danger':
      return {
        backgroundColor: palette.card,
        borderColor: palette.danger,
        borderWidth: StyleSheet.hairlineWidth,
      };
    case 'ghost':
      return { backgroundColor: 'transparent' };
    default:
      return {
        backgroundColor: palette.card,
        borderColor: palette.ruleStrong,
        borderWidth: StyleSheet.hairlineWidth,
      };
  }
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});

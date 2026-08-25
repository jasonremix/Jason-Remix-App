import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { alpha, gradients, motion, palette, radius, spacing } from '@/constants/theme';

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

const HEIGHTS: Record<ButtonSize, number> = { sm: 38, md: 48, lg: 56 };

/**
 * The metallic button.
 *
 * `primary` is a brushed-chrome plate with dark type — the only bright element on most
 * screens, so there is never more than one per view. Press lifts a faint sheen rather
 * than changing colour, which is what makes it read as metal instead of plastic.
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
  const sheen = useRef(new Animated.Value(0)).current;
  const isDisabled = disabled || loading;

  const animate = useCallback(
    (toValue: number) => {
      Animated.timing(sheen, {
        toValue,
        duration: toValue === 1 ? motion.instant : motion.fast,
        useNativeDriver: true,
      }).start();
    },
    [sheen],
  );

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
      onPressIn={() => animate(1)}
      onPressOut={() => animate(0)}
      disabled={isDisabled}
      style={[
        styles.base,
        { height, paddingHorizontal: size === 'sm' ? spacing.base : spacing.xl },
        fullWidth && styles.fullWidth,
        variantStyle(variant, isDisabled),
        style,
      ]}
    >
      {variant === 'primary' && !isDisabled && (
        <LinearGradient
          colors={[...gradients.chrome.colors]}
          locations={[...gradients.chrome.locations]}
          start={gradients.chrome.start}
          end={gradients.chrome.end}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Press feedback: a soft light wash over the whole plate. */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: variant === 'primary' ? 'rgba(255,255,255,0.35)' : alpha.press,
            opacity: sheen,
          },
        ]}
      />

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={contentColor} />
        ) : (
          <>
            {icon && !iconTrailing && <Icon name={icon} size={16} color={contentColor} strokeWidth={1.4} />}
            <Text
              variant="label"
              style={{ color: contentColor }}
              uppercase
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {label}
            </Text>
            {icon && iconTrailing && <Icon name={icon} size={16} color={contentColor} strokeWidth={1.4} />}
          </>
        )}
      </View>
    </Pressable>
  );
}

function resolveContentColor(variant: ButtonVariant, disabled: boolean): string {
  if (disabled) return palette.titanium;
  switch (variant) {
    case 'primary':
      return palette.obsidian;
    case 'danger':
      return palette.danger;
    case 'ghost':
      return palette.silver;
    default:
      return palette.chrome;
  }
}

function variantStyle(variant: ButtonVariant, disabled: boolean): ViewStyle {
  if (disabled) {
    return { backgroundColor: palette.gunmetal, borderColor: alpha.hairline, borderWidth: StyleSheet.hairlineWidth };
  }
  switch (variant) {
    case 'primary':
      return { backgroundColor: palette.chrome };
    case 'danger':
      return {
        backgroundColor: 'transparent',
        borderColor: 'rgba(194,84,79,0.45)',
        borderWidth: StyleSheet.hairlineWidth,
      };
    case 'ghost':
      return { backgroundColor: 'transparent' };
    default:
      return {
        backgroundColor: palette.gunmetal,
        borderColor: alpha.edge,
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
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});

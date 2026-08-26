import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { palette, radius, spacing, type as typeScale } from '@/constants/theme';

import { Icon } from './Icon';
import { Label, Text } from './Text';

export type InputProps = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string | null;
  hint?: string;
  containerStyle?: StyleProp<ViewStyle>;
  /** Adds a reveal toggle for password fields. */
  secure?: boolean;
};

/**
 * Text field: an inset well with a tracked-out label above it. Focus is shown by the
 * border brightening — no coloured focus rings.
 */
export function Input({
  label,
  error,
  hint,
  containerStyle,
  secure = false,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      <Label tone={error ? 'danger' : 'muted'} style={styles.label}>
        {label}
      </Label>

      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          Boolean(error) && styles.fieldError,
        ]}
      >
        <TextInput
          style={styles.input}
          placeholderTextColor={palette.faint}
          selectionColor={palette.accent}
          cursorColor={palette.accent}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={secure && !revealed}
          onFocus={(event) => {
            setFocused(true);
            rest.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            rest.onBlur?.(event);
          }}
          accessibilityLabel={label}
          {...rest}
        />

        {secure && (
          <Pressable
            onPress={() => setRevealed((value) => !value)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            style={styles.reveal}
          >
            <Icon name={revealed ? 'eye-off' : 'eye'} size={17} color={palette.muted} />
          </Pressable>
        )}
      </View>

      {(error || hint) && (
        <Text variant="caption" tone={error ? 'danger' : 'muted'} style={styles.helper}>
          {error ?? hint}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  label: { marginLeft: spacing.xxs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: palette.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.ruleStrong,
    paddingHorizontal: spacing.base,
  },
  // Focus is shown by the accent taking the border, not by a glow.
  fieldFocused: { borderColor: palette.accent, borderWidth: 1.5 },
  fieldError: { borderColor: palette.danger },
  input: {
    flex: 1,
    color: palette.ink,
    fontFamily: typeScale.body.fontFamily,
    fontSize: typeScale.body.fontSize,
    letterSpacing: 0.2,
    paddingVertical: spacing.md,
  },
  reveal: { paddingLeft: spacing.md },
  helper: { marginLeft: spacing.xxs },
});

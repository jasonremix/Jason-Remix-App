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

import { alpha, palette, radius, spacing, type as typeScale } from '@/constants/theme';

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
          placeholderTextColor={palette.titanium}
          selectionColor={palette.chrome}
          cursorColor={palette.chrome}
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
            <Icon name={revealed ? 'lock' : 'search'} size={16} color={palette.titanium} />
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
    minHeight: 50,
    borderRadius: radius.md,
    backgroundColor: palette.well,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: alpha.edgeSoft,
    paddingHorizontal: spacing.base,
  },
  fieldFocused: { borderColor: alpha.edgeStrong },
  fieldError: { borderColor: 'rgba(194,84,79,0.5)' },
  input: {
    flex: 1,
    color: palette.offWhite,
    fontFamily: typeScale.body.fontFamily,
    fontSize: typeScale.body.fontSize,
    letterSpacing: 0.2,
    paddingVertical: spacing.md,
  },
  reveal: { paddingLeft: spacing.md },
  helper: { marginLeft: spacing.xxs },
});

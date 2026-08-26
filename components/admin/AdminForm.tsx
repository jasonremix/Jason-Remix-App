import { type ReactNode, useCallback, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { palette, spacing } from '@/constants/theme';
import { toAppError } from '@/lib/errors';
import { useUiStore } from '@/store/uiStore';

/**
 * A small declarative form used by every admin screen.
 *
 * Admin screens are tools, not showpieces: one shared form keeps them consistent and
 * keeps each screen down to a field list plus a submit handler.
 */

export type FieldType = 'text' | 'multiline' | 'number' | 'switch';

export type FieldDefinition = {
  name: string;
  label: string;
  type?: FieldType;
  placeholder?: string;
  hint?: string;
  initialValue?: string | boolean;
  required?: boolean;
};

export type FormValues = Record<string, string | boolean>;

export function AdminForm({
  title,
  description,
  fields,
  submitLabel,
  onSubmit,
  footer,
}: {
  title: string;
  description?: string;
  fields: FieldDefinition[];
  submitLabel: string;
  onSubmit: (values: FormValues) => Promise<void>;
  footer?: ReactNode;
}) {
  const showToast = useUiStore((state) => state.showToast);

  const [values, setValues] = useState<FormValues>(() =>
    Object.fromEntries(
      fields.map((field) => [field.name, field.initialValue ?? (field.type === 'switch' ? false : '')]),
    ),
  );
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = useCallback(async () => {
    const missing: Record<string, string> = {};
    for (const field of fields) {
      if (field.required && !String(values[field.name] ?? '').trim()) {
        missing[field.name] = 'Required.';
      }
    }
    if (Object.keys(missing).length > 0) {
      setErrors(missing);
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      await onSubmit(values);
      showToast(`${title} — SAVED`, 'positive');
    } catch (error) {
      const appError = toAppError(error);
      setErrors(appError.details ?? {});
      showToast(appError.message, 'negative');
    } finally {
      setSubmitting(false);
    }
  }, [fields, onSubmit, showToast, title, values]);

  return (
    <Surface style={styles.card}>
      <View style={styles.header}>
        <Text variant="label" tone="chrome" uppercase>
          {title}
        </Text>
        {description && (
          <Text variant="caption" tone="muted">
            {description}
          </Text>
        )}
      </View>

      {fields.map((field) =>
        field.type === 'switch' ? (
          <View key={field.name} style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text variant="bodySmall" tone="secondary">
                {field.label}
              </Text>
              {field.hint && (
                <Text variant="caption" tone="muted">
                  {field.hint}
                </Text>
              )}
            </View>
            <Switch
              value={Boolean(values[field.name])}
              onValueChange={(next) => setValues((current) => ({ ...current, [field.name]: next }))}
              trackColor={{ false: palette.steel, true: palette.brushed }}
              thumbColor={values[field.name] ? palette.offWhite : palette.titanium}
              ios_backgroundColor={palette.steel}
            />
          </View>
        ) : (
          <Input
            key={field.name}
            label={field.label}
            value={String(values[field.name] ?? '')}
            onChangeText={(text) => setValues((current) => ({ ...current, [field.name]: text }))}
            error={errors[field.name]}
            hint={field.hint}
            placeholder={field.placeholder}
            multiline={field.type === 'multiline'}
            numberOfLines={field.type === 'multiline' ? 4 : 1}
            keyboardType={field.type === 'number' ? 'number-pad' : 'default'}
            autoCapitalize={field.type === 'multiline' ? 'sentences' : 'none'}
          />
        ),
      )}

      {footer}

      <Button label={submitLabel} variant="secondary" loading={submitting} onPress={() => void submit()} />
    </Surface>
  );
}

/** Parses a numeric field, returning null for an empty value rather than NaN. */
export function toNumber(value: string | boolean | undefined): number | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const parsed = Number(raw.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, gap: spacing.lg },
  header: { gap: spacing.xs },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  switchText: { flex: 1, gap: 2 },
});

import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { AdminForm } from '@/components/admin/AdminForm';
import { Row } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Hairline } from '@/components/ui/Surface';
import { EmptyState } from '@/components/ui/States';
import { spacing } from '@/constants/theme';
import { useCatalog } from '@/hooks/useCatalog';
import { formatDateTime } from '@/lib/format';
import { adminService } from '@/services/admin.service';
import type { NewsCategory } from '@/types/models';

const CATEGORIES: NewsCategory[] = ['RELEASE', 'TOUR', 'REWARD', 'ANNOUNCEMENT'];

/** Meldungen für die Startseite anlegen und nachschlagen. */
export default function AdminNews() {
  const catalog = useCatalog();

  const publish = useCallback(
    async (values: Record<string, string | boolean>) => {
      const raw = String(values.category ?? '').trim().toUpperCase();
      const category = (CATEGORIES as string[]).includes(raw)
        ? (raw as NewsCategory)
        : 'ANNOUNCEMENT';

      await adminService.upsertNews({
        title: String(values.title).trim(),
        body: String(values.body).trim(),
        category,
        imageUrl: String(values.imageUrl ?? '').trim() || null,
        linkUrl: String(values.linkUrl ?? '').trim() || null,
      });
      await catalog.refetch();
    },
    [catalog],
  );

  return (
    <Screen header={<ScreenHeader title="AKTUELLES" />} contentStyle={styles.content}>
      <AdminForm
        title="MELDUNG VERÖFFENTLICHEN"
        description="Erscheint für jedes Mitglied oben auf der Startseite."
        submitLabel="VERÖFFENTLICHEN"
        onSubmit={publish}
        fields={[
          { name: 'title', label: 'ÜBERSCHRIFT', required: true, placeholder: 'ZEITGEIST ist da' },
          {
            name: 'body',
            label: 'TEXT',
            type: 'multiline',
            required: true,
            placeholder: 'Die neue Single ist auf allen großen Plattformen verfügbar.',
          },
          {
            name: 'category',
            label: 'KATEGORIE',
            initialValue: 'ANNOUNCEMENT',
            hint: CATEGORIES.join(' · '),
          },
          { name: 'imageUrl', label: 'BILD-URL', placeholder: 'https://…' },
          { name: 'linkUrl', label: 'LINK-URL', placeholder: 'https://…' },
        ]}
      />

      <View style={styles.section}>
        <SectionHeader title="VERÖFFENTLICHT" meta={`${catalog.data?.news.length ?? 0}`} />
        {(catalog.data?.news ?? []).length === 0 ? (
          <EmptyState icon="document" title="Noch nichts veröffentlicht." />
        ) : (
          <View>
            {(catalog.data?.news ?? []).map((item, index, all) => (
              <View key={item.id}>
                <Row
                  title={item.title}
                  subtitle={`${item.category} · ${formatDateTime(item.publishedAt)}`}
                  icon="document"
                  showChevron={false}
                />
                {index < all.length - 1 && <Hairline />}
              </View>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xxl, paddingTop: spacing.lg },
  section: { gap: spacing.base },
});

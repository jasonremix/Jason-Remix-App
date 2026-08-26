import { LegalDocument } from '@/components/legal/LegalDocument';
import { brand } from '@/constants/brand';

/**
 * Impressum — required under § 5 DDG (formerly § 5 TMG) for a commercially operated
 * German app. The operator's real details must be filled in before release; placeholders
 * are marked so they cannot be shipped unnoticed.
 */
export default function Imprint() {
  return (
    <LegalDocument
      title="IMPRESSUM"
      placeholderNotice="Vollständigen Namen, Anschrift, Kontaktdaten und ggf. USt-IdNr. des Betreibers eintragen, bevor die App veröffentlicht wird. Ein unvollständiges Impressum ist abmahnfähig."
      intro="Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG)."
      updatedAt="—"
      sections={[
        {
          heading: 'DIENSTEANBIETER',
          paragraphs: [
            '[Vollständiger Name bzw. Firmierung]\n[Straße und Hausnummer]\n14770 Brandenburg an der Havel\nDeutschland',
          ],
        },
        {
          heading: 'KONTAKT',
          paragraphs: [
            `E-Mail: ${brand.supportEmail}\nTelefon: [Telefonnummer]\nWeb: ${brand.website}`,
          ],
        },
        {
          heading: 'VERTRETUNGSBERECHTIGT',
          paragraphs: ['[Name der vertretungsberechtigten Person]'],
        },
        {
          heading: 'UMSATZSTEUER',
          paragraphs: [
            'Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz: [USt-IdNr., falls vorhanden]',
          ],
        },
        {
          heading: 'VERANTWORTLICH FÜR DEN INHALT',
          paragraphs: [
            'Verantwortlich im Sinne des § 18 Abs. 2 Medienstaatsvertrag (MStV):\n[Name]\n[Anschrift]',
          ],
        },
        {
          heading: 'STREITBEILEGUNG',
          paragraphs: [
            'Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung bereit: https://ec.europa.eu/consumers/odr',
            'Wir sind nicht verpflichtet und nicht bereit, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.',
          ],
        },
        {
          heading: 'MARKEN UND INHALTE',
          paragraphs: [
            `„${brand.name}" sowie sämtliche in der App gezeigten Titel, Cover, Logos und Fotografien sind urheber- bzw. markenrechtlich geschützt. Eine Nutzung außerhalb der App bedarf der vorherigen schriftlichen Zustimmung.`,
            'Spotify, das Spotify-Logo, Apple Music und YouTube sind Marken der jeweiligen Rechteinhaber. Diese App steht in keiner offiziellen Verbindung zu diesen Unternehmen.',
          ],
        },
      ]}
    />
  );
}

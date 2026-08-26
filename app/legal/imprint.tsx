import { LegalDocument } from '@/components/legal/LegalDocument';
import { brand } from '@/constants/brand';
import { operator, orPlaceholder, postalAddress } from '@/constants/operator';

/**
 * Impressum — required under § 5 DDG for a commercially operated German app.
 *
 * Every value comes from `constants/operator.ts`. Anything not filled in there is
 * rendered as a visible `[placeholder]` and triggers the warning banner, so an
 * incomplete Impressum cannot ship unnoticed.
 */
export default function Imprint() {
  return (
    <LegalDocument
      title="IMPRESSUM"
      intro="Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG)."
      sections={[
        {
          heading: 'DIENSTEANBIETER',
          paragraphs: [postalAddress()],
        },
        {
          heading: 'KONTAKT',
          paragraphs: [
            `E-Mail: ${brand.supportEmail}\nTelefon: ${orPlaceholder(operator.phone, 'Telefonnummer')}\nWeb: ${brand.website}`,
          ],
        },
        ...(operator.representative
          ? [
              {
                heading: 'VERTRETUNGSBERECHTIGT',
                paragraphs: [operator.representative],
              },
            ]
          : []),
        ...(operator.vatId
          ? [
              {
                heading: 'UMSATZSTEUER',
                paragraphs: [
                  `Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz:\n${operator.vatId}`,
                ],
              },
            ]
          : []),
        {
          heading: 'VERANTWORTLICH FÜR DEN INHALT',
          paragraphs: [
            `Verantwortlich im Sinne des § 18 Abs. 2 Medienstaatsvertrag (MStV):\n${orPlaceholder(
              operator.contentResponsibleName || operator.legalName,
              'Name',
            )}\n${orPlaceholder(
              operator.contentResponsibleAddress || operator.street,
              'Anschrift',
            )}`,
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

import { LegalDocument } from '@/components/legal/LegalDocument';
import { brand } from '@/constants/brand';

export default function Terms() {
  return (
    <LegalDocument
      title="NUTZUNGSBEDINGUNGEN"
      placeholderNotice="Betreiberangaben, Gerichtsstand und ggf. Widerrufsbelehrung durch eine juristische Prüfung ergänzen lassen, bevor die App veröffentlicht wird."
      intro={`Diese Bedingungen regeln die Nutzung der ${brand.name} App und des darin enthaltenen Mitglieds- und Credits-Systems.`}
      updatedAt="—"
      sections={[
        {
          heading: '1 · GELTUNGSBEREICH',
          paragraphs: [
            'Diese Bedingungen gelten für alle Personen, die ein Mitgliedskonto in der App anlegen und nutzen. Mit der Registrierung erkennen Sie sie an.',
          ],
        },
        {
          heading: '2 · MITGLIEDSKONTO',
          paragraphs: [
            'Für die Nutzung ist ein Konto erforderlich. Die Zugangsdaten sind vertraulich zu behandeln und nicht an Dritte weiterzugeben. Pro Person ist ein Konto zulässig.',
            'Bei begründetem Verdacht auf Missbrauch, Mehrfachkonten oder automatisierte Zugriffe kann ein Konto gesperrt werden.',
          ],
        },
        {
          heading: '3 · JASON CREDITS',
          paragraphs: [
            'Credits sind ein rein digitales Treueguthaben innerhalb der App.',
          ],
          bullets: [
            'Credits haben keinen Geldwert und können nicht ausgezahlt werden.',
            'Credits können nicht gekauft, verkauft, getauscht oder übertragen werden.',
            'Credits werden ausschließlich serverseitig gutgeschrieben und verbucht.',
            'Bei Manipulationsversuchen können Credits korrigiert oder entzogen werden.',
            'Mit Löschung des Kontos verfallen bestehende Credits ersatzlos.',
          ],
        },
        {
          heading: '4 · MISSIONEN',
          paragraphs: [
            'Missionen können jederzeit ergänzt, geändert oder beendet werden. Ein Anspruch auf eine bestimmte Mission oder eine bestimmte Gutschrift besteht nicht.',
            'Die Erfüllung einer Mission wird serverseitig geprüft. Automatisierte oder vorgetäuschte Erfüllungen führen zur Rückbuchung.',
          ],
        },
        {
          heading: '5 · BELOHNUNGEN',
          paragraphs: [
            'Belohnungen werden nur eingelöst, solange der Vorrat reicht und die genannten Voraussetzungen erfüllt sind. Nach der Einlösung werden die Credits verbindlich abgebucht.',
            'Ein Umtausch einer eingelösten Belohnung in Credits oder Geld ist ausgeschlossen. Versandbedingungen und -gebiete werden bei der jeweiligen Belohnung angegeben.',
          ],
        },
        {
          heading: '6 · INHALTE UND STREAMING',
          paragraphs: [
            'Die App stellt Links zu offiziellen Streaming-Plattformen bereit. Die Wiedergabe erfolgt ausschließlich auf diesen Plattformen und unterliegt deren Bedingungen.',
            'Die App speichert, kopiert oder verbreitet keine Audioinhalte und ermöglicht keinen Download von Musik.',
          ],
        },
        {
          heading: '7 · VERFÜGBARKEIT',
          paragraphs: [
            'Ein ununterbrochener Betrieb wird nicht geschuldet. Wartungsarbeiten, technische Störungen sowie Änderungen an Schnittstellen Dritter können die Verfügbarkeit einschränken.',
          ],
        },
        {
          heading: '8 · KÜNDIGUNG UND LÖSCHUNG',
          paragraphs: [
            'Sie können Ihr Konto jederzeit in der App löschen. Die Löschung ist endgültig; Credits, Belohnungsanfragen und offene Gewinnspielteilnahmen verfallen dabei.',
          ],
        },
        {
          heading: '9 · HAFTUNG',
          paragraphs: [
            'Für Vorsatz und grobe Fahrlässigkeit wird uneingeschränkt gehaftet. Bei einfacher Fahrlässigkeit besteht eine Haftung nur bei Verletzung wesentlicher Vertragspflichten und begrenzt auf den vertragstypischen, vorhersehbaren Schaden.',
            'Die Haftung nach dem Produkthaftungsgesetz sowie bei Verletzung von Leben, Körper oder Gesundheit bleibt unberührt.',
          ],
        },
        {
          heading: '10 · ÄNDERUNGEN',
          paragraphs: [
            'Änderungen dieser Bedingungen werden in der App angekündigt. Wird der Nutzung nach der Ankündigung fortgesetzt widersprochen, kann das Konto gelöscht werden.',
          ],
        },
      ]}
    />
  );
}

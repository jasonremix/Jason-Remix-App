import { LegalDocument } from '@/components/legal/LegalDocument';

/**
 * Teilnahmebedingungen for the giveaways.
 *
 * Describes the mechanism the server actually implements — a seeded, logged draw over
 * the recorded entries — rather than a vague "winners will be chosen" clause.
 */
export default function GiveawayTerms() {
  return (
    <LegalDocument
      title="GEWINNSPIEL­BEDINGUNGEN"
      placeholderNotice="Veranstalterangaben, Altersgrenze und Teilnahmegebiet je Gewinnspiel prüfen; bei Gewinnspielen mit Reise- oder Veranstaltungsbezug gesonderte Bedingungen ergänzen."
      intro="Diese Bedingungen gelten für alle in der App durchgeführten Gewinnspiele. Bei einzelnen Gewinnspielen können ergänzende Bedingungen angegeben sein; diese gehen im Zweifel vor."
      updatedAt="—"
      sections={[
        {
          heading: '1 · VERANSTALTER',
          paragraphs: ['[Name und Anschrift des Veranstalters]'],
        },
        {
          heading: '2 · TEILNAHMEBERECHTIGUNG',
          bullets: [
            'Teilnahmeberechtigt sind natürliche Personen mit Wohnsitz in der EU.',
            'Mindestalter ist 18 Jahre, sofern beim Gewinnspiel nichts anderes angegeben ist.',
            'Ein aktives Mitgliedskonto in der App ist erforderlich.',
            'Mitwirkende an der Durchführung sowie deren Angehörige sind ausgeschlossen.',
          ],
        },
        {
          heading: '3 · TEILNAHME',
          paragraphs: [
            'Die Teilnahme erfolgt durch Einsatz der beim jeweiligen Gewinnspiel angegebenen Credits. Vor dem Einsatz wird der genaue Betrag in einem Bestätigungsdialog angezeigt.',
            'Die maximale Anzahl an Teilnahmen pro Person ist beim jeweiligen Gewinnspiel angegeben und wird serverseitig durchgesetzt.',
            'Ein Kauf ist nicht erforderlich und nicht möglich: Credits können ausschließlich durch Missionen in der App verdient werden.',
          ],
        },
        {
          heading: '4 · EINSATZ UND ERSTATTUNG',
          paragraphs: [
            'Eingesetzte Credits werden bei der Teilnahme sofort verbucht. Bis zur Ziehung kann eine Teilnahme in begründeten Fällen storniert und erstattet werden; nach der Ziehung ist eine Erstattung ausgeschlossen.',
            'Wird ein Gewinnspiel abgesagt, werden alle eingesetzten Credits vollständig zurückgebucht.',
          ],
        },
        {
          heading: '5 · ZIEHUNG',
          paragraphs: [
            'Die Ziehung erfolgt nach Ablauf des Teilnahmezeitraums ausschließlich auf dem Server, per Zufallsauswahl über alle gültigen Teilnahmen.',
            'Jede Ziehung wird mit Zeitpunkt, Zufallsquelle und Ergebnis protokolliert, sodass sie nachträglich überprüfbar bleibt. Eine Auswahl durch die App auf dem Gerät findet nicht statt.',
            'Der Rechtsweg ist ausgeschlossen.',
          ],
        },
        {
          heading: '6 · BENACHRICHTIGUNG UND GEWINNÜBERGABE',
          paragraphs: [
            'Gewinnerinnen und Gewinner werden in der App und per E-Mail benachrichtigt. Meldet sich eine gezogene Person nicht innerhalb von 14 Tagen, kann neu gezogen werden.',
            'Gewinne sind nicht übertragbar und werden nicht in bar ausgezahlt. Anfallende Reise- und Nebenkosten trägt die gewinnende Person, sofern nicht ausdrücklich anders angegeben.',
          ],
        },
        {
          heading: '7 · AUSSCHLUSS',
          paragraphs: [
            'Bei Manipulation, Mehrfachkonten, automatisierten Teilnahmen oder Verstößen gegen diese Bedingungen können Teilnahmen für ungültig erklärt und das Konto gesperrt werden. Bereits zugeteilte Gewinne können in diesem Fall aberkannt werden.',
          ],
        },
        {
          heading: '8 · DATENSCHUTZ',
          paragraphs: [
            'Zur Durchführung werden Kontokennung, Zeitpunkt der Teilnahme und eingesetzte Credits gespeichert. Im Gewinnfall werden zusätzlich die zur Übergabe erforderlichen Angaben erhoben. Weitere Informationen enthält die Datenschutzerklärung.',
          ],
        },
        {
          heading: '9 · VORZEITIGE BEENDIGUNG',
          paragraphs: [
            'Der Veranstalter behält sich vor, ein Gewinnspiel bei technischen Störungen, Manipulation oder aus rechtlichen Gründen abzubrechen. Eingesetzte Credits werden in diesem Fall erstattet.',
          ],
        },
      ]}
    />
  );
}

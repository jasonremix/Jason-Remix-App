import { LegalDocument } from '@/components/legal/LegalDocument';
import { brand } from '@/constants/brand';

/**
 * Datenschutzerklärung.
 *
 * Written against what the app actually does — the categories below match the data the
 * client and server genuinely process, not a generic template. Anything the app does not
 * collect is stated as not collected.
 */
export default function Privacy() {
  return (
    <LegalDocument
      title="DATENSCHUTZ"
      placeholderNotice="Verantwortliche Stelle, Kontaktdaten, ggf. Datenschutzbeauftragte:r sowie Auftragsverarbeiter (Hosting, Push-Dienst) ergänzen und die Angaben mit der tatsächlichen Serverkonfiguration abgleichen."
      intro="Diese Erklärung beschreibt, welche personenbezogenen Daten die Jason-Remix-App verarbeitet, zu welchem Zweck und auf welcher Rechtsgrundlage. Grundlage ist die Datenschutz-Grundverordnung (DSGVO)."
      updatedAt="—"
      sections={[
        {
          heading: '1 · VERANTWORTLICHE STELLE',
          paragraphs: [
            `[Name des Betreibers]\n[Anschrift]\n14770 Brandenburg an der Havel\n\nE-Mail: ${brand.privacyEmail}`,
          ],
        },
        {
          heading: '2 · GRUNDSATZ DER DATENMINIMIERUNG',
          paragraphs: [
            'Die App erhebt ausschließlich Daten, die für den Betrieb des Mitgliedskontos, des Credits-Systems, der Belohnungen und der Gewinnspiele erforderlich sind.',
            'Nicht erhoben werden: Standortdaten, Kontakte, Fotos, Werbe-IDs, Geräte-Fingerprints sowie Tracking über Drittanbieter zu Werbezwecken.',
          ],
        },
        {
          heading: '3 · KONTODATEN',
          paragraphs: [
            'Bei der Registrierung werden E-Mail-Adresse, Benutzername und ein Passwort-Hash gespeichert. Das Passwort selbst wird nie im Klartext gespeichert oder protokolliert.',
            'Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).',
          ],
          bullets: [
            'E-Mail-Adresse — Anmeldung und notwendige Systemnachrichten',
            'Benutzername — Darstellung des Mitgliedskontos',
            'Passwort-Hash — Authentifizierung',
            'Zeitpunkt der Registrierung — Nachvollziehbarkeit des Kontos',
          ],
        },
        {
          heading: '4 · CREDITS, MISSIONEN UND GEWINNSPIELE',
          paragraphs: [
            'Jede Credit-Bewegung wird serverseitig protokolliert (Betrag, Art, Beschreibung, Zeitstempel, Kontostand danach). Diese Aufzeichnung ist notwendig, um Guthaben nachvollziehbar und manipulationssicher zu führen.',
            'Teilnahmen an Gewinnspielen werden mit Zeitpunkt und eingesetzten Credits gespeichert. Die Ziehung erfolgt serverseitig und wird protokolliert, damit sie überprüfbar bleibt.',
            'Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO sowie Art. 6 Abs. 1 lit. f DSGVO (Missbrauchsvermeidung).',
          ],
        },
        {
          heading: '5 · SPOTIFY-VERBINDUNG',
          paragraphs: [
            'Eine Verbindung zu Spotify wird nur hergestellt, wenn Sie sie ausdrücklich starten. Die Anmeldung erfolgt über den Authorization-Code-Flow mit PKCE; Zugangs- und Refresh-Token werden ausschließlich auf dem Server gespeichert, nicht auf dem Gerät.',
            'Abgerufen werden ausschließlich lesende Daten: Profilangaben, aktuell gespielter Titel, zuletzt gehörte Titel und Top-Titel. Es werden keine Audioinhalte heruntergeladen, kopiert oder gespeichert.',
            'Die Verbindung kann jederzeit in den Einstellungen getrennt werden. Dabei werden die gespeicherten Token gelöscht.',
            'Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung), jederzeit widerrufbar.',
          ],
        },
        {
          heading: '6 · PUSH-NACHRICHTEN',
          paragraphs: [
            'Push-Nachrichten sind standardmäßig deaktiviert. Wird die Funktion aktiviert, wird ein Gerätetoken gespeichert, um Nachrichten zustellen zu können. Beim Deaktivieren wird der Token gelöscht.',
            'Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung).',
          ],
        },
        {
          heading: '7 · SERVER-LOGS UND SICHERHEIT',
          paragraphs: [
            'Der API-Server protokolliert technische Zugriffsdaten zur Abwehr von Missbrauch (u. a. Zeitpunkt, Endpunkt, Statuscode). Zugangsdaten, Token und Passwörter werden in Protokollen ausdrücklich maskiert.',
            'Administrative Eingriffe (z. B. Credit-Korrekturen, Sperrungen, Ziehungen) werden in einem Audit-Log festgehalten.',
            'Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an sicherem Betrieb).',
          ],
        },
        {
          heading: '8 · SPEICHERDAUER',
          paragraphs: [
            'Kontodaten werden bis zur Löschung des Kontos gespeichert. Credit- und Teilnahmeprotokolle werden so lange aufbewahrt, wie es zur Abwicklung von Gewinnspielen und zur Erfüllung handels- und steuerrechtlicher Pflichten erforderlich ist.',
          ],
        },
        {
          heading: '9 · IHRE RECHTE',
          bullets: [
            'Auskunft über die verarbeiteten Daten (Art. 15 DSGVO)',
            'Berichtigung unrichtiger Daten (Art. 16 DSGVO)',
            'Löschung (Art. 17 DSGVO) — direkt in der App unter Einstellungen › Konto',
            'Einschränkung der Verarbeitung (Art. 18 DSGVO)',
            'Datenübertragbarkeit (Art. 20 DSGVO) — Export direkt in der App verfügbar',
            'Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)',
            'Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft',
            'Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO)',
          ],
        },
        {
          heading: '10 · KONTAKT',
          paragraphs: [
            `Anfragen zum Datenschutz richten Sie bitte an ${brand.privacyEmail}.`,
          ],
        },
      ]}
    />
  );
}

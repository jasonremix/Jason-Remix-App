import { LegalDocument } from '@/components/legal/LegalDocument';
import { brand } from '@/constants/brand';

/**
 * Spotify notice.
 *
 * States the boundaries the app operates within — read-only access, no audio handling,
 * and explicitly no incentivised or artificial streaming.
 */
export default function SpotifyNotice() {
  return (
    <LegalDocument
      title="SPOTIFY"
      intro={`${brand.name} ist eine unabhängige App und steht in keiner offiziellen Verbindung zu Spotify AB. Spotify und das Spotify-Logo sind Marken von Spotify AB.`}
      updatedAt="—"
      sections={[
        {
          heading: 'WAS DIE APP TUT',
          bullets: [
            'Anmeldung über den offiziellen Spotify-Login (Authorization Code Flow mit PKCE).',
            'Lesender Abruf von Profil, aktuell gespieltem Titel, zuletzt gehörten und Top-Titeln.',
            'Anzeige dieser Informationen ausschließlich innerhalb der App.',
            'Verlinkung von Titeln zur Wiedergabe in der Spotify-App bzw. im Web-Player.',
          ],
        },
        {
          heading: 'WAS DIE APP AUSDRÜCKLICH NICHT TUT',
          bullets: [
            'Keine Speicherung, Vervielfältigung oder Weitergabe von Audioinhalten.',
            'Kein Download und keine Extraktion von Musik aus Spotify.',
            'Keine Synchronisation von Spotify-Audio mit eigenen Videos oder Animationen.',
            'Keine Steuerung der Wiedergabe und keine Änderungen an Ihrer Bibliothek.',
            'Keine Erzeugung künstlicher Streams und keine Aufforderung dazu.',
          ],
        },
        {
          heading: 'CREDITS UND STREAMING',
          paragraphs: [
            'Credits werden für das Verbinden des Spotify-Kontos einmalig gutgeschrieben. Für einzelne Streams werden keine Credits vergeben.',
            'Ein Belohnungsmodul, das bestimmte Hörvorgänge berücksichtigt, ist technisch vorbereitet, bleibt jedoch deaktiviert, solange keine Methode existiert, die mit den Plattformregeln von Spotify vereinbar ist. Anreize zum Erzeugen künstlicher Streams wird es in dieser App nicht geben.',
          ],
        },
        {
          heading: 'TOKENS UND SICHERHEIT',
          paragraphs: [
            'Die App enthält kein Spotify-Client-Secret. Der Token-Austausch erfolgt auf dem Server; Access- und Refresh-Token werden serverseitig gespeichert und niemals im Klartext protokolliert.',
            'Die Verbindung kann jederzeit in den Einstellungen getrennt werden. Dabei werden die gespeicherten Token gelöscht. Zusätzlich kann der Zugriff jederzeit im Spotify-Konto unter „Apps" entzogen werden.',
          ],
        },
      ]}
    />
  );
}

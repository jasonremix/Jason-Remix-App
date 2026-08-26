/**
 * Ergänzt `app.json` um das, was von der Umgebung abhängt.
 *
 * Alles Statische steht weiterhin in `app.json`. Hier steht nur, was sich zwischen
 * „auf dem Handy ansehen" und „im Store veröffentlichen" unterscheidet — und das ist
 * genau ein Wert: die runtimeVersion.
 *
 * ## Warum das nicht fest in app.json steht
 *
 * Die runtimeVersion entscheidet, welches Binary ein Update annehmen darf.
 *
 *   sdkVersion  → `exposdk:57.0.0`. Das ist die Laufzeit von Expo Go, also kann
 *                 Expo Go ein so veröffentlichtes Update öffnen. Genau das will man,
 *                 solange man die App nur herzeigen und ausprobieren will.
 *
 *   appVersion  → `1.0.0`, die `version` aus app.json. Kein Expo Go passt darauf,
 *                 dafür kann ein Update nie in einem Binary landen, dessen nativer
 *                 Teil sich inzwischen geändert hat. Das ist die richtige Wahl,
 *                 sobald es echte Builds im Umlauf gibt.
 *
 * Fest verdrahtet wäre einer der beiden Fälle immer falsch — und der Fehler fiele erst
 * auf, wenn ein Update nicht ankommt. Deshalb entscheidet `EAS_RUNTIME_POLICY`:
 * standardmäßig `sdkVersion`, und `eas.json` setzt für das production-Profil
 * `appVersion`.
 */
module.exports = ({ config }) => {
  const policy = process.env.EAS_RUNTIME_POLICY ?? 'sdkVersion';

  if (!['sdkVersion', 'appVersion', 'nativeVersion', 'fingerprint'].includes(policy)) {
    throw new Error(
      `EAS_RUNTIME_POLICY="${policy}" ist keine gültige Policy. ` +
        'Erlaubt: sdkVersion, appVersion, nativeVersion, fingerprint.',
    );
  }

  return {
    ...config,
    runtimeVersion: { policy },
  };
};

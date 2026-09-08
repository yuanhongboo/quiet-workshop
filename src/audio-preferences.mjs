export const AUDIO_PREFERENCES_KEY = 'quiet-workshop:audio:1';
const defaults = () => ({ enabled: true, musicEnabled: true });
export function readAudioPreferences(storage) {
  try {
    const raw = storage.getItem(AUDIO_PREFERENCES_KEY);
    if (!raw || raw.length > 1000) return defaults();
    const value = JSON.parse(raw);
    if (value?.version !== 1) return defaults();
    return {
      enabled: typeof value.enabled === 'boolean' ? value.enabled : true,
      musicEnabled: typeof value.musicEnabled === 'boolean' ? value.musicEnabled : true,
    };
  } catch { return defaults(); }
}
export function saveAudioPreferences(storage, preferences) {
  try {
    storage.setItem(AUDIO_PREFERENCES_KEY, JSON.stringify({ version: 1, enabled: !!preferences.enabled, musicEnabled: !!preferences.musicEnabled }));
    return true;
  } catch { return false; }
}

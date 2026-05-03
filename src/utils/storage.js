// storage.js — persistence layer for studied-daf history
// Uses React Native AsyncStorage (key-value, stored on device)

import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = '@daf_yomi_history_v1';

/**
 * Returns the full history array, newest-first.
 * Each entry: { ref, display: { en, he }, date, studiedAt (ISO string) }
 */
export async function getStudyHistory() {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('[storage] getStudyHistory failed:', err);
    return [];
  }
}

/**
 * Checks whether a specific daf ref has been marked as studied.
 */
export async function isDafStudied(ref) {
  const history = await getStudyHistory();
  return history.some(entry => entry.ref === ref);
}

/**
 * Marks a daf as studied. Ignores duplicate refs (idempotent).
 * Returns the updated history array.
 */
export async function markStudied(dafInfo) {
  try {
    const history = await getStudyHistory();

    // Remove any existing entry for the same ref (so we don't duplicate)
    const filtered = history.filter(e => e.ref !== dafInfo.ref);

    const newEntry = {
      ref:       dafInfo.ref,
      display:   dafInfo.display,
      date:      dafInfo.date,
      studiedAt: new Date().toISOString(),
    };

    // Newest first
    const updated = [newEntry, ...filtered];
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('[storage] markStudied failed:', err);
    throw err;
  }
}

/**
 * Removes a daf entry from history.
 * Returns the updated history array.
 */
export async function removeStudied(ref) {
  try {
    const history = await getStudyHistory();
    const updated = history.filter(e => e.ref !== ref);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('[storage] removeStudied failed:', err);
    throw err;
  }
}

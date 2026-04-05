import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = {
  threads:   'nestli_threads_v3',
  answers:   'nestli_answers_v3',
  seen:      'nestli_seen_ids',
  hint:      'nestli_swipe_hint',
  userName:  'nestli_user_name',
};

async function get(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw != null ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

async function set(key, value) {
  try { await AsyncStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export const storage = {
  loadThreads:  () => get(KEY.threads, null),
  saveThreads:  (v) => set(KEY.threads, v),
  loadAnswers:  () => get(KEY.answers, null),
  saveAnswers:  (v) => set(KEY.answers, v),
  loadSeen:     () => get(KEY.seen, []),
  saveSeen:     (v) => set(KEY.seen, v),
  loadHint:     () => get(KEY.hint, false),
  saveHint:     (v) => set(KEY.hint, v),
  loadUserName: () => get(KEY.userName, 'Du'),
  saveUserName: (v) => set(KEY.userName, v),
};

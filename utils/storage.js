import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = {
  threads:      'nestli_threads_v3',
  answers:      'nestli_answers_v3',
  seen:         'nestli_seen_ids',
  hint:         'nestli_swipe_hint',
  userName:     'nestli_user_name',
  notfaelle:    'nestli_notfaelle_v1',
  inserate:     'nestli_inserate_v1',
  draussen:     'nestli_draussen_v1',
  events:       'nestli_events_v1',
  kinderMap:    'nestli_kinder_v1',
  bookmarks:    'nestli_bookmarks_v1',
  pinnedIds:    'nestli_pinned_v1',
  groupCode:    'nestli_group_code_v1',
  profileEmoji: 'nestli_emoji_v1',
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
  loadThreads:      () => get(KEY.threads,      null),
  saveThreads:      (v) => set(KEY.threads,     v),
  loadAnswers:      () => get(KEY.answers,      null),
  saveAnswers:      (v) => set(KEY.answers,     v),
  loadSeen:         () => get(KEY.seen,         []),
  saveSeen:         (v) => set(KEY.seen,        v),
  loadHint:         () => get(KEY.hint,         false),
  saveHint:         (v) => set(KEY.hint,        v),
  loadUserName:     () => get(KEY.userName,     'Du'),
  saveUserName:     (v) => set(KEY.userName,    v),
  loadNotfaelle:    () => get(KEY.notfaelle,    null),
  saveNotfaelle:    (v) => set(KEY.notfaelle,   v),
  loadInserate:     () => get(KEY.inserate,     null),
  saveInserate:     (v) => set(KEY.inserate,    v),
  loadDraussen:     () => get(KEY.draussen,     null),
  saveDraussen:     (v) => set(KEY.draussen,    v),
  loadEvents:       () => get(KEY.events,       null),
  saveEvents:       (v) => set(KEY.events,      v),
  loadKinderMap:    () => get(KEY.kinderMap,    {}),
  saveKinderMap:    (v) => set(KEY.kinderMap,   v),
  loadBookmarks:    () => get(KEY.bookmarks,    []),
  saveBookmarks:    (v) => set(KEY.bookmarks,   v),
  loadPinnedIds:    () => get(KEY.pinnedIds,    []),
  savePinnedIds:    (v) => set(KEY.pinnedIds,   v),
  loadGroupCode:    () => get(KEY.groupCode,    null),
  saveGroupCode:    (v) => set(KEY.groupCode,   v),
  loadProfileEmoji: () => get(KEY.profileEmoji, '🌸'),
  saveProfileEmoji: (v) => set(KEY.profileEmoji, v),
};
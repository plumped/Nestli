import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage } from '../utils/storage';

// ─── Seed data (used only on first launch) ───────────────────────────────────
const NOW = Date.now();

const SEED_THREADS = [
  { id: 's1', autor: 'Sarah', titel: 'Guter Kinderarzt in Bern?', text: 'Suche dringend einen Kinderarzt der noch Patienten nimmt...', ts: NOW - 2 * 60000 },
  { id: 's2', autor: 'Anna',  titel: 'Turnverein für 4-Jährige',  text: 'Wer hat Erfahrungen mit Turnvereinen für kleine Kinder?',  ts: NOW - 60 * 60000 },
  { id: 's3', autor: 'Julia', titel: 'Empfehlung Logopädin',      text: 'Mein Sohn braucht Logopädie – kennt jemand jemanden?',    ts: NOW - 3 * 3600000 },
];

const SEED_ANSWERS = {
  s1: [
    { id: 'a1', autor: 'Julia', text: 'Wir waren super zufrieden mit Dr. Müller!',           ts: NOW - 60000,      replyTo: null, reactions: {} },
    { id: 'a2', autor: 'Petra', text: 'Schreib mal Dr. Meier an, der hat noch Plätze.',        ts: NOW - 30 * 60000, replyTo: null, reactions: {} },
  ],
  s2: [],
  s3: [
    { id: 'a3', autor: 'Monika', text: 'Frau Schneider in Köniz ist super – sehr geduldig!', ts: NOW - 2 * 3600000, replyTo: null, reactions: {} },
  ],
};

// ─── Context ─────────────────────────────────────────────────────────────────
const TratschContext = createContext(null);

export function TratschProvider({ children }) {
  const [currentUser, setCurrentUser] = useState('Du');
  const [threads,     setThreads]     = useState([]);
  const [answersMap,  setAnswersMap]   = useState({});
  const [seenIds,     setSeenIds]      = useState(new Set());
  const [hintShown,   setHintShown]    = useState(false);
  const [loaded,      setLoaded]       = useState(false);

  // ── Load from storage on mount ────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [savedThreads, savedAnswers, savedSeen, savedHint, savedName] = await Promise.all([
        storage.loadThreads(),
        storage.loadAnswers(),
        storage.loadSeen(),
        storage.loadHint(),
        storage.loadUserName(),
      ]);

      const isFirstRun = savedThreads === null;
      setThreads(isFirstRun ? SEED_THREADS : savedThreads);
      setAnswersMap(isFirstRun || savedAnswers === null ? SEED_ANSWERS : savedAnswers);
      // On first run, mark seed threads as seen so no fake unread badge
      setSeenIds(isFirstRun ? new Set(SEED_THREADS.map(t => t.id)) : new Set(savedSeen));
      setHintShown(savedHint);
      setCurrentUser(savedName ?? 'Du');
      setLoaded(true);
    })();
  }, []);

  // ── Persist whenever data changes ─────────────────────────────────────────
  useEffect(() => { if (loaded) storage.saveThreads(threads);   }, [threads,    loaded]);
  useEffect(() => { if (loaded) storage.saveAnswers(answersMap); }, [answersMap, loaded]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const addThread = useCallback((titel, text) => {
    const t = {
      id:    Date.now().toString(),
      autor: currentUser,
      titel: titel.trim(),
      text:  text.trim(),
      ts:    Date.now(),
    };
    setThreads(prev => [t, ...prev]);
    setAnswersMap(prev => ({ ...prev, [t.id]: [] }));
    // Own threads are immediately "seen"
    setSeenIds(prev => {
      const next = new Set(prev);
      next.add(t.id);
      storage.saveSeen([...next]);
      return next;
    });
  }, [currentUser]);

  const deleteThread = useCallback((id) => {
    setThreads(prev => prev.filter(t => t.id !== id));
    setAnswersMap(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const addAnswer = useCallback((threadId, text, replyTo) => {
    const a = {
      id:      Date.now().toString(),
      autor:   currentUser,
      text:    text.trim(),
      ts:      Date.now(),
      replyTo: replyTo ? { autor: replyTo.autor, text: replyTo.text } : null,
      reactions: {},
    };
    setAnswersMap(prev => ({
      ...prev,
      [threadId]: [...(prev[threadId] ?? []), a],
    }));
  }, [currentUser]);

  const toggleReaction = useCallback((threadId, answerId, emoji) => {
    setAnswersMap(prev => {
      const answers = prev[threadId] ?? [];
      return {
        ...prev,
        [threadId]: answers.map(a => {
          if (a.id !== answerId) return a;
          const users   = a.reactions[emoji] ?? [];
          const already = users.includes(currentUser);
          return {
            ...a,
            reactions: {
              ...a.reactions,
              [emoji]: already ? users.filter(u => u !== currentUser) : [...users, currentUser],
            },
          };
        }),
      };
    });
  }, [currentUser]);

  const markSeen = useCallback((threadId) => {
    setSeenIds(prev => {
      if (prev.has(threadId)) return prev;
      const next = new Set(prev);
      next.add(threadId);
      storage.saveSeen([...next]);
      return next;
    });
  }, []);

  const markHintShown = useCallback(() => {
    setHintShown(true);
    storage.saveHint(true);
  }, []);

  const updateUserName = useCallback((name) => {
    setCurrentUser(name);
    storage.saveUserName(name);
  }, []);

  const unreadCount = threads.filter(t => !seenIds.has(t.id)).length;

  return (
    <TratschContext.Provider value={{
      currentUser, threads, answersMap, seenIds, hintShown,
      unreadCount, loaded,
      addThread, deleteThread, addAnswer,
      toggleReaction, markSeen, markHintShown, updateUserName,
    }}>
      {children}
    </TratschContext.Provider>
  );
}

export const useTratsch = () => useContext(TratschContext);

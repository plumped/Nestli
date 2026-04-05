import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { storage } from '../utils/storage';

// ─── Seed data ────────────────────────────────────────────────────────────────
const NOW = Date.now();

const SEED_THREADS = [
  {
    id: 's1', autor: 'Sarah', titel: 'Guter Kinderarzt in Bern?',
    text: 'Suche dringend einen Kinderarzt der noch Patienten nimmt...',
    ts: NOW - 2 * 60000, tag: 'gesundheit', solved: false, imageUri: null, poll: null,
  },
  {
    id: 's2', autor: 'Anna', titel: 'Turnverein für 4-Jährige',
    text: 'Wer hat Erfahrungen mit Turnvereinen für kleine Kinder?',
    ts: NOW - 60 * 60000, tag: 'frage', solved: false, imageUri: null, poll: null,
  },
  {
    id: 's3', autor: 'Julia', titel: 'Empfehlung Logopädin',
    text: 'Mein Sohn braucht Logopädie – kennt jemand jemanden?',
    ts: NOW - 3 * 3600000, tag: 'gesundheit', solved: false, imageUri: null, poll: null,
  },
  {
    id: 's4', autor: 'Monika', titel: 'Spielnachmittag – wann passt euch?',
    text: 'Wir würden gerne einen Spielnachmittag für die Kinder organisieren.',
    ts: NOW - 5 * 3600000, tag: 'termine', solved: false, imageUri: null,
    poll: {
      question: 'Welcher Tag passt euch?',
      options: [
        { text: 'Dienstag Nachmittag', voters: ['Monika', 'Sarah'] },
        { text: 'Donnerstag Nachmittag', voters: ['Anna'] },
        { text: 'Samstag Vormittag', voters: [] },
      ],
    },
  },
];

const SEED_ANSWERS = {
  s1: [
    { id: 'a1', autor: 'Julia',  text: 'Wir waren super zufrieden mit Dr. Müller!',          ts: NOW - 60000,        replyTo: null, reactions: {}, imageUri: null },
    { id: 'a2', autor: 'Petra',  text: '@Sarah schreib mal Dr. Meier an, der hat noch Plätze.', ts: NOW - 30 * 60000,   replyTo: null, reactions: {}, imageUri: null },
  ],
  s2: [],
  s3: [
    { id: 'a3', autor: 'Monika', text: 'Frau Schneider in Köniz ist super – sehr geduldig!',  ts: NOW - 2 * 3600000,  replyTo: null, reactions: {}, imageUri: null },
  ],
  s4: [],
};

// ─── Context ──────────────────────────────────────────────────────────────────
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

      // Migrate old thread data – add new fields with defaults if missing
      const rawThreads = isFirstRun
        ? SEED_THREADS
        : savedThreads.map(t => ({
            tag: null, solved: false, imageUri: null, poll: null, ...t,
          }));

      // Migrate old answer data
      const rawAnswers = isFirstRun || savedAnswers === null
        ? SEED_ANSWERS
        : Object.fromEntries(
            Object.entries(savedAnswers).map(([k, v]) => [
              k,
              v.map(a => ({ imageUri: null, ...a })),
            ])
          );

      setThreads(rawThreads);
      setAnswersMap(rawAnswers);
      setSeenIds(isFirstRun ? new Set(SEED_THREADS.map(t => t.id)) : new Set(savedSeen));
      setHintShown(savedHint);
      setCurrentUser(savedName ?? 'Du');
      setLoaded(true);
    })();
  }, []);

  // ── Persist whenever data changes ────────────────────────────────────────
  useEffect(() => { if (loaded) storage.saveThreads(threads);   }, [threads,    loaded]);
  useEffect(() => { if (loaded) storage.saveAnswers(answersMap); }, [answersMap, loaded]);

  // ── Derived: all known members (for @-mentions) ───────────────────────────
  const members = useMemo(() => {
    const set = new Set();
    threads.forEach(t => set.add(t.autor));
    Object.values(answersMap).forEach(answers => answers.forEach(a => set.add(a.autor)));
    return [...set];
  }, [threads, answersMap]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const addThread = useCallback((titel, text, tag, imageUri, poll) => {
    const t = {
      id:       Date.now().toString(),
      autor:    currentUser,
      titel:    titel.trim(),
      text:     (text ?? '').trim(),
      ts:       Date.now(),
      tag:      tag ?? null,
      solved:   false,
      imageUri: imageUri ?? null,
      poll:     poll ?? null,
    };
    setThreads(prev => [t, ...prev]);
    setAnswersMap(prev => ({ ...prev, [t.id]: [] }));
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

  const markSolved = useCallback((threadId) => {
    setThreads(prev => prev.map(t =>
      t.id === threadId ? { ...t, solved: !t.solved } : t
    ));
  }, []);

  // Single-choice poll voting – removes vote from other options automatically
  const votePoll = useCallback((threadId, optionIndex) => {
    setThreads(prev => prev.map(t => {
      if (t.id !== threadId || !t.poll) return t;
      const newOptions = t.poll.options.map((opt, i) => {
        if (i === optionIndex) {
          const alreadyVoted = opt.voters.includes(currentUser);
          return {
            ...opt,
            voters: alreadyVoted
              ? opt.voters.filter(u => u !== currentUser)
              : [...opt.voters, currentUser],
          };
        }
        // Remove vote from all other options (single choice)
        return { ...opt, voters: opt.voters.filter(u => u !== currentUser) };
      });
      return { ...t, poll: { ...t.poll, options: newOptions } };
    }));
  }, [currentUser]);

  const addAnswer = useCallback((threadId, text, replyTo, imageUri) => {
    const a = {
      id:        Date.now().toString(),
      autor:     currentUser,
      text:      text.trim(),
      ts:        Date.now(),
      replyTo:   replyTo ? { autor: replyTo.autor, text: replyTo.text } : null,
      reactions: {},
      imageUri:  imageUri ?? null,
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
      unreadCount, loaded, members,
      addThread, deleteThread, addAnswer,
      toggleReaction, markSeen, markHintShown, updateUserName,
      markSolved, votePoll,
    }}>
      {children}
    </TratschContext.Provider>
  );
}

export const useTratsch = () => useContext(TratschContext);

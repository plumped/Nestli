import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { storage } from '../utils/storage';

// ─── Seed data: Tratsch ───────────────────────────────────────────────────────
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
    { id: 'a1', autor: 'Julia',  text: 'Wir waren super zufrieden mit Dr. Müller!',            ts: NOW - 60000,       replyTo: null, reactions: {}, imageUri: null },
    { id: 'a2', autor: 'Petra',  text: '@Sarah schreib mal Dr. Meier an, der hat noch Plätze.', ts: NOW - 30 * 60000,  replyTo: null, reactions: {}, imageUri: null },
  ],
  s2: [],
  s3: [
    { id: 'a3', autor: 'Monika', text: 'Frau Schneider in Köniz ist super – sehr geduldig!',   ts: NOW - 2 * 3600000, replyTo: null, reactions: {}, imageUri: null },
  ],
  s4: [],
};

// ─── Seed data: Notfall ───────────────────────────────────────────────────────
const SEED_NOTFAELLE = [
  {
    id: 'n1', autor: 'Sarah', type: 'abholen',
    titel: 'Lena heute um 15:30 von der Schule abholen?',
    text: 'Laengasse, 2. Klasse. Muss unerwartet laenger arbeiten.',
    ts: NOW - 10 * 60000, wann: new Date(NOW + 3 * 3600000).toISOString(),
    helfer: ['Anna'], gedeckt: false,
  },
  {
    id: 'n2', autor: 'Julia', type: 'krank',
    titel: 'Luca hat Fieber - kann jemand von 13-17h schauen?',
    text: '38.5 Grad, liegt im Bett. Wir muessen beide arbeiten.',
    ts: NOW - 45 * 60000, wann: new Date(NOW + 1.5 * 3600000).toISOString(),
    helfer: ['Monika', 'Petra'], gedeckt: true,
  },
  {
    id: 'n3', autor: 'Monika', type: 'betreuung',
    titel: 'Elias (5) - spontan Samstag ab 14h?',
    text: 'Arzttermin kurzfristig verschoben.',
    ts: NOW - 3 * 3600000,
    wann: (() => { const d = new Date(); d.setDate(d.getDate() + 2); d.setHours(14, 0); return d.toISOString(); })(),
    helfer: [], gedeckt: false,
  },
];

// ─── Seed data: Kleider ───────────────────────────────────────────────────────
const SEED_INSERATE = [
  {
    id: 'k1', autor: 'Sarah', modus: 'biete', kategorie: 'jacke',
    titel: 'Winterjacke Gr. 110, kaum getragen',
    text: 'Dunkelblau, Marke Reima. Nur eine Saison getragen. Sehr guter Zustand, keine Flecken.',
    groesse: '110', ts: NOW - 20 * 60000,
    bilder: [], interessenten: [], vergeben: false,
  },
  {
    id: 'k2', autor: 'Anna', modus: 'suche', kategorie: 'schuhe',
    titel: 'Turnschuhe Gr. 32 gesucht',
    text: 'Fuer den Sommer, gerne bunt. Hauptsache guter Zustand.',
    groesse: '32', ts: NOW - 2 * 3600000,
    bilder: [], interessenten: ['Julia'], vergeben: false,
  },
  {
    id: 'k3', autor: 'Julia', modus: 'tausch', kategorie: 'hose',
    titel: 'Jeans Gr. 104 gegen Gr. 110',
    text: 'Slim fit, hellblau. Biete 104, suche 110.',
    groesse: '104', ts: NOW - 5 * 3600000,
    bilder: [], interessenten: [], vergeben: false,
  },
  {
    id: 'k4', autor: 'Monika', modus: 'biete', kategorie: 'kleid',
    titel: 'Sommerkleid Gr. 116, wie neu',
    text: 'Geblumtes Kleid, nur zweimal getragen.',
    groesse: '116', ts: NOW - 1 * 3600000,
    bilder: [], interessenten: ['Sarah', 'Petra'], vergeben: false,
  },
];

// ─── Context ──────────────────────────────────────────────────────────────────
const AppContext = createContext(null);

export function TratschProvider({ children }) {
  // ── Tratsch state ──────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState('Du');
  const [threads,     setThreads]     = useState([]);
  const [answersMap,  setAnswersMap]   = useState({});
  const [seenIds,     setSeenIds]      = useState(new Set());
  const [hintShown,   setHintShown]    = useState(false);

  // ── Notfall state ──────────────────────────────────────────────────────────
  const [notfaelle,   setNotfaelle]    = useState([]);

  // ── Kleider state ──────────────────────────────────────────────────────────
  const [inserate,    setInserate]     = useState([]);

  const [loaded, setLoaded] = useState(false);

  // ── Load from storage on mount ────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [
        savedThreads, savedAnswers, savedSeen, savedHint, savedName,
        savedNotfaelle, savedInserate,
      ] = await Promise.all([
        storage.loadThreads(),
        storage.loadAnswers(),
        storage.loadSeen(),
        storage.loadHint(),
        storage.loadUserName(),
        storage.loadNotfaelle(),
        storage.loadInserate(),
      ]);

      const isFirstRun = savedThreads === null;

      const rawThreads = isFirstRun
        ? SEED_THREADS
        : savedThreads.map(t => ({ tag: null, solved: false, imageUri: null, poll: null, ...t }));

      const rawAnswers = isFirstRun || savedAnswers === null
        ? SEED_ANSWERS
        : Object.fromEntries(
            Object.entries(savedAnswers).map(([k, v]) => [
              k, v.map(a => ({ imageUri: null, ...a })),
            ])
          );

      setThreads(rawThreads);
      setAnswersMap(rawAnswers);
      setSeenIds(isFirstRun ? new Set(SEED_THREADS.map(t => t.id)) : new Set(savedSeen));
      setHintShown(savedHint);
      setCurrentUser(savedName ?? 'Du');

      setNotfaelle(savedNotfaelle ?? SEED_NOTFAELLE);
      setInserate(savedInserate  ?? SEED_INSERATE);

      setLoaded(true);
    })();
  }, []);

  // ── Persist on change ─────────────────────────────────────────────────────
  useEffect(() => { if (loaded) storage.saveThreads(threads);     }, [threads,    loaded]);
  useEffect(() => { if (loaded) storage.saveAnswers(answersMap);   }, [answersMap, loaded]);
  useEffect(() => { if (loaded) storage.saveNotfaelle(notfaelle);  }, [notfaelle,  loaded]);
  useEffect(() => { if (loaded) storage.saveInserate(inserate);    }, [inserate,   loaded]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const members = useMemo(() => {
    const set = new Set();
    threads.forEach(t => set.add(t.autor));
    Object.values(answersMap).forEach(ans => ans.forEach(a => set.add(a.autor)));
    return [...set];
  }, [threads, answersMap]);

  // ═══════════════════════════════════════════════════════════════════════════
  // TRATSCH ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const addThread = useCallback((titel, text, tag, imageUri, poll) => {
    const t = {
      id: Date.now().toString(), autor: currentUser,
      titel: titel.trim(), text: (text ?? '').trim(),
      ts: Date.now(), tag: tag ?? null, solved: false,
      imageUri: imageUri ?? null, poll: poll ?? null,
    };
    setThreads(prev => [t, ...prev]);
    setAnswersMap(prev => ({ ...prev, [t.id]: [] }));
    setSeenIds(prev => {
      const next = new Set(prev); next.add(t.id);
      storage.saveSeen([...next]);
      return next;
    });
  }, [currentUser]);

  const deleteThread = useCallback((id) => {
    setThreads(prev => prev.filter(t => t.id !== id));
    setAnswersMap(prev => { const next = { ...prev }; delete next[id]; return next; });
  }, []);

  const markSolved = useCallback((threadId) => {
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, solved: !t.solved } : t));
  }, []);

  const votePoll = useCallback((threadId, optionIndex) => {
    setThreads(prev => prev.map(t => {
      if (t.id !== threadId || !t.poll) return t;
      const newOptions = t.poll.options.map((opt, i) => {
        if (i === optionIndex) {
          const alreadyVoted = opt.voters.includes(currentUser);
          return { ...opt, voters: alreadyVoted ? opt.voters.filter(u => u !== currentUser) : [...opt.voters, currentUser] };
        }
        return { ...opt, voters: opt.voters.filter(u => u !== currentUser) };
      });
      return { ...t, poll: { ...t.poll, options: newOptions } };
    }));
  }, [currentUser]);

  const addAnswer = useCallback((threadId, text, replyTo, imageUri) => {
    const a = {
      id: Date.now().toString(), autor: currentUser,
      text: text.trim(), ts: Date.now(),
      replyTo: replyTo ? { autor: replyTo.autor, text: replyTo.text } : null,
      reactions: {}, imageUri: imageUri ?? null,
    };
    setAnswersMap(prev => ({ ...prev, [threadId]: [...(prev[threadId] ?? []), a] }));
  }, [currentUser]);

  const toggleReaction = useCallback((threadId, answerId, emoji) => {
    setAnswersMap(prev => {
      const answers = prev[threadId] ?? [];
      return {
        ...prev,
        [threadId]: answers.map(a => {
          if (a.id !== answerId) return a;
          const users = a.reactions[emoji] ?? [];
          const already = users.includes(currentUser);
          return { ...a, reactions: { ...a.reactions, [emoji]: already ? users.filter(u => u !== currentUser) : [...users, currentUser] } };
        }),
      };
    });
  }, [currentUser]);

  const markSeen = useCallback((threadId) => {
    setSeenIds(prev => {
      if (prev.has(threadId)) return prev;
      const next = new Set(prev); next.add(threadId);
      storage.saveSeen([...next]);
      return next;
    });
  }, []);

  const markHintShown = useCallback(() => {
    setHintShown(true); storage.saveHint(true);
  }, []);

  const updateUserName = useCallback((name) => {
    setCurrentUser(name); storage.saveUserName(name);
  }, []);

  const unreadCount = threads.filter(t => !seenIds.has(t.id)).length;

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTFALL ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const addNotfall = useCallback(({ type, titel, text, wann }) => {
    setNotfaelle(prev => [{
      id: Date.now().toString(), autor: currentUser,
      type, titel, text, ts: Date.now(),
      wann: wann ? wann.toISOString() : null,
      helfer: [], gedeckt: false,
    }, ...prev]);
  }, [currentUser]);

  const toggleHelfer = useCallback((id) => {
    setNotfaelle(prev => prev.map(n => {
      if (n.id !== id || n.autor === currentUser) return n;
      const already = n.helfer.includes(currentUser);
      return { ...n, helfer: already ? n.helfer.filter(h => h !== currentUser) : [...n.helfer, currentUser] };
    }));
  }, [currentUser]);

  const toggleGedeckt = useCallback((id) => {
    setNotfaelle(prev => prev.map(n => n.id === id ? { ...n, gedeckt: !n.gedeckt } : n));
  }, []);

  const deleteNotfall = useCallback((id) => {
    setNotfaelle(prev => prev.filter(n => n.id !== id));
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // KLEIDER ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const addInserat = useCallback(({ modus, kategorie, titel, text, groesse, bilder }) => {
    setInserate(prev => [{
      id: Date.now().toString(), autor: currentUser,
      modus, kategorie, titel, text, groesse, bilder,
      ts: Date.now(), interessenten: [], vergeben: false,
    }, ...prev]);
  }, [currentUser]);

  const updateInserat = useCallback((id, updates) => {
    setInserate(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  }, []);

  const toggleInteresse = useCallback((id) => {
    setInserate(prev => prev.map(i => {
      if (i.id !== id || i.autor === currentUser) return i;
      const already = i.interessenten.includes(currentUser);
      return { ...i, interessenten: already ? i.interessenten.filter(h => h !== currentUser) : [...i.interessenten, currentUser] };
    }));
  }, [currentUser]);

  const toggleVergeben = useCallback((id) => {
    setInserate(prev => prev.map(i => i.id === id ? { ...i, vergeben: !i.vergeben } : i));
  }, []);

  return (
    <AppContext.Provider value={{
      // shared
      currentUser, loaded, members, updateUserName,
      // tratsch
      threads, answersMap, seenIds, hintShown, unreadCount,
      addThread, deleteThread, addAnswer,
      toggleReaction, markSeen, markHintShown,
      markSolved, votePoll,
      // notfall
      notfaelle, addNotfall, toggleHelfer, toggleGedeckt, deleteNotfall,
      // kleider
      inserate, addInserat, updateInserat, toggleInteresse, toggleVergeben,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useTratsch = () => useContext(AppContext);
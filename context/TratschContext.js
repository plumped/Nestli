import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { storage } from '../utils/storage';

const NOW = Date.now();

// ─── Seed: Tratsch ────────────────────────────────────────────────────────────
const SEED_THREADS = [
  {
    id: 's1', autor: 'Sarah', titel: 'Guter Kinderarzt in Bern?',
    text: 'Suche dringend einen Kinderarzt der noch Patienten nimmt...',
    ts: NOW - 2 * 60000, tag: 'gesundheit', solved: false, imageUri: null, poll: null, pinned: true,
  },
  {
    id: 's2', autor: 'Anna', titel: 'Turnverein für 4-Jährige',
    text: 'Wer hat Erfahrungen mit Turnvereinen für kleine Kinder?',
    ts: NOW - 60 * 60000, tag: 'frage', solved: false, imageUri: null, poll: null, pinned: false,
  },
  {
    id: 's3', autor: 'Julia', titel: 'Empfehlung Logopädin',
    text: 'Mein Sohn braucht Logopädie – kennt jemand jemanden?',
    ts: NOW - 3 * 3600000, tag: 'gesundheit', solved: false, imageUri: null, poll: null, pinned: false,
  },
  {
    id: 's4', autor: 'Monika', titel: 'Spielnachmittag – wann passt euch?',
    text: 'Wir würden gerne einen Spielnachmittag für die Kinder organisieren.',
    ts: NOW - 5 * 3600000, tag: 'termine', solved: false, imageUri: null, pinned: false,
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

// ─── Seed: Notfall ────────────────────────────────────────────────────────────
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

// ─── Seed: Kleider ────────────────────────────────────────────────────────────
const SEED_INSERATE = [
  {
    id: 'k1', autor: 'Sarah', modus: 'biete', kategorie: 'jacke',
    titel: 'Winterjacke Gr. 110, kaum getragen',
    text: 'Dunkelblau, Marke Reima. Nur eine Saison getragen.',
    groesse: '110', ts: NOW - 20 * 60000,
    bilder: [], interessenten: [], vergeben: false,
  },
  {
    id: 'k2', autor: 'Anna', modus: 'suche', kategorie: 'schuhe',
    titel: 'Turnschuhe Gr. 32 gesucht',
    text: 'Fuer den Sommer, gerne bunt.',
    groesse: '32', ts: NOW - 2 * 3600000,
    bilder: [], interessenten: ['Julia'], vergeben: false,
  },
  {
    id: 'k3', autor: 'Julia', modus: 'tausch', kategorie: 'hose',
    titel: 'Jeans Gr. 104 gegen Gr. 110',
    text: 'Slim fit, hellblau.',
    groesse: '104', ts: NOW - 5 * 3600000,
    bilder: [], interessenten: [], vergeben: false,
  },
];

// ─── Seed: Draussen ───────────────────────────────────────────────────────────
const SEED_DRAUSSEN = [
  { id: 'd1', autor: 'Anna',  ort: 'Spielplatz Birkenweg', seit: NOW - 25 * 60000, kind: 'Max',  spaetestens: '17:30' },
  { id: 'd2', autor: 'Anna',  ort: 'Sandkasten',           seit: NOW - 15 * 60000, kind: 'Mia',  spaetestens: '17:00' },
  { id: 'd3', autor: 'Julia', ort: 'Garten (Block A)',     seit: NOW - 10 * 60000, kind: 'Luca', spaetestens: '18:00' },
];

// ─── Seed: Events ─────────────────────────────────────────────────────────────
const SEED_EVENTS = [
  {
    id: 'ev1', autor: 'Monika',
    titel: 'Grillabend im Innenhof',
    beschreibung: 'Getränke sind vorhanden. Jeder bringt etwas zum Grillen mit.',
    datum: new Date(NOW + 2 * 24 * 3600000).toISOString(),
    uhrzeit: '18:00', ort: 'Innenhof Block B',
    kategorie: 'grillabend',
    ganztag: false,
    maxTeilnehmer: 15,
    teilnehmer: ['Monika', 'Sarah', 'Anna'],
    kommentare: [
      { id: 'k1', autor: 'Sarah', text: 'Ich bringe einen Salat mit! 🥗', ts: NOW - 1200000 },
    ],
    ts: NOW - 3600000,
  },
  {
    id: 'ev2', autor: 'Sarah',
    titel: 'Spielnachmittag bei Sarah',
    beschreibung: 'Für Kinder 3–8 Jahre. Snacks vorhanden.',
    datum: new Date(NOW + 5 * 24 * 3600000).toISOString(),
    uhrzeit: '14:30', ort: 'Wohnung 14, 2. OG',
    kategorie: 'spielnachmittag',
    ganztag: false,
    maxTeilnehmer: 8,
    teilnehmer: ['Sarah'],
    kommentare: [],
    ts: NOW - 1800000,
  },
  {
    id: 'ev3', autor: 'Anna',
    titel: 'Sommerferien Familie Müller',
    beschreibung: '',
    datum: new Date(NOW + 14 * 24 * 3600000).toISOString(),
    uhrzeit: null, ort: null,
    kategorie: 'ferien',
    ganztag: true,
    maxTeilnehmer: null,
    teilnehmer: ['Anna'],
    kommentare: [],
    ts: NOW - 7200000,
  },
];

// ─── Seed: Kinder ─────────────────────────────────────────────────────────────
const SEED_KINDER = {
  'Sarah':  [{ name: 'Lena',   alter: 7 }],
  'Anna':   [{ name: 'Max',    alter: 5 }, { name: 'Mia',    alter: 3 }],
  'Julia':  [{ name: 'Luca',   alter: 6 }],
  'Monika': [{ name: 'Elias',  alter: 5 }],
  'Petra':  [{ name: 'Sophie', alter: 8 }],
};

// ─── Context ──────────────────────────────────────────────────────────────────
const AppContext = createContext(null);

export function TratschProvider({ children }) {
  // ── Tratsch ────────────────────────────────────────────────────────────────
  const [currentUser,  setCurrentUser]  = useState('Du');
  const [threads,      setThreads]      = useState([]);
  const [answersMap,   setAnswersMap]   = useState({});
  const [seenIds,      setSeenIds]      = useState(new Set());
  const [hintShown,    setHintShown]    = useState(false);
  const [bookmarks,    setBookmarks]    = useState(new Set());
  const [pinnedIds,    setPinnedIds]    = useState(new Set());

  // ── Notfall ────────────────────────────────────────────────────────────────
  const [notfaelle, setNotfaelle] = useState([]);

  // ── Kleider ────────────────────────────────────────────────────────────────
  const [inserate, setInserate] = useState([]);

  // ── Draussen ──────────────────────────────────────────────────────────────
  const [draussenList, setDraussenList] = useState([]);

  // ── Kalender ──────────────────────────────────────────────────────────────
  const [events, setEvents] = useState([]);

  // ── Profile ────────────────────────────────────────────────────────────────
  const [kinderMap,    setKinderMap]    = useState({});
  const [groupCode,    setGroupCode]    = useState('NEST-7K3M');
  const [profileEmoji, setProfileEmoji] = useState('🌸');
  const [profilePhoto, setProfilePhoto] = useState(null);

  const [loaded, setLoaded] = useState(false);

  // ── Load from storage ─────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [
        savedThreads, savedAnswers, savedSeen, savedHint, savedName,
        savedNotfaelle, savedInserate,
        savedDraussen, savedEvents, savedKinder,
        savedBookmarks, savedPinned, savedCode, savedEmoji,
        savedPhoto,
      ] = await Promise.all([
        storage.loadThreads(),
        storage.loadAnswers(),
        storage.loadSeen(),
        storage.loadHint(),
        storage.loadUserName(),
        storage.loadNotfaelle(),
        storage.loadInserate(),
        storage.loadDraussen(),
        storage.loadEvents(),
        storage.loadKinderMap(),
        storage.loadBookmarks(),
        storage.loadPinnedIds(),
        storage.loadGroupCode(),
        storage.loadProfileEmoji(),
        storage.loadProfilePhoto(),
      ]);

      const isFirstRun = savedThreads === null;

      const rawThreads = isFirstRun
        ? SEED_THREADS
        : savedThreads.map(t => ({ tag: null, solved: false, imageUri: null, poll: null, pinned: false, ...t }));

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
      setInserate(savedInserate ?? SEED_INSERATE);

      // Filter expired draussen entries (>3h)
      const now = Date.now();
      const rawDraussen = savedDraussen ?? SEED_DRAUSSEN;
      setDraussenList(rawDraussen.filter(d => now - d.seit < 3 * 3600000));

      setEvents(savedEvents ?? SEED_EVENTS);
      setKinderMap(savedKinder ?? SEED_KINDER);
      setBookmarks(new Set(savedBookmarks ?? []));
      setPinnedIds(new Set(savedPinned ?? SEED_THREADS.filter(t => t.pinned).map(t => t.id)));
      setGroupCode(savedCode ?? 'NEST-7K3M');
      setProfileEmoji(savedEmoji ?? '🌸');
      setProfilePhoto(savedPhoto ?? null);

      setLoaded(true);
    })();
  }, []);

  // ── Persist ───────────────────────────────────────────────────────────────
  useEffect(() => { if (loaded) storage.saveThreads(threads);        }, [threads,      loaded]);
  useEffect(() => { if (loaded) storage.saveAnswers(answersMap);      }, [answersMap,   loaded]);
  useEffect(() => { if (loaded) storage.saveNotfaelle(notfaelle);     }, [notfaelle,    loaded]);
  useEffect(() => { if (loaded) storage.saveInserate(inserate);       }, [inserate,     loaded]);
  useEffect(() => { if (loaded) storage.saveDraussen(draussenList);   }, [draussenList, loaded]);
  useEffect(() => { if (loaded) storage.saveEvents(events);           }, [events,       loaded]);
  useEffect(() => { if (loaded) storage.saveKinderMap(kinderMap);     }, [kinderMap,    loaded]);
  useEffect(() => { if (loaded) storage.saveBookmarks([...bookmarks]); }, [bookmarks,   loaded]);
  useEffect(() => { if (loaded) storage.savePinnedIds([...pinnedIds]); }, [pinnedIds,   loaded]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const members = useMemo(() => {
    const set = new Set();
    threads.forEach(t => set.add(t.autor));
    Object.values(answersMap).forEach(ans => ans.forEach(a => set.add(a.autor)));
    return [...set];
  }, [threads, answersMap]);

  const sortedThreads = useMemo(() => {
    return [...threads].sort((a, b) => {
      const aPin = pinnedIds.has(a.id) ? 1 : 0;
      const bPin = pinnedIds.has(b.id) ? 1 : 0;
      if (aPin !== bPin) return bPin - aPin;
      return b.ts - a.ts;
    });
  }, [threads, pinnedIds]);

  const activeDraussen = useMemo(() => {
    const now = Date.now();
    return draussenList.filter(d => now - d.seit < 3 * 3600000);
  }, [draussenList]);

  // ═══════════════════════════════════════════════════════════════════════════
  // TRATSCH ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const addThread = useCallback((titel, text, tag, imageUri, poll) => {
    const t = {
      id: Date.now().toString(), autor: currentUser,
      titel: titel.trim(), text: (text ?? '').trim(),
      ts: Date.now(), tag: tag ?? null, solved: false, pinned: false,
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
    setBookmarks(prev => { const next = new Set(prev); next.delete(id); return next; });
    setPinnedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
  }, []);

  const markSolved = useCallback((threadId) => {
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, solved: !t.solved } : t));
  }, []);

  const togglePin = useCallback((threadId) => {
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(threadId)) next.delete(threadId);
      else next.add(threadId);
      storage.savePinnedIds([...next]);
      return next;
    });
  }, []);

  const toggleBookmark = useCallback((threadId) => {
    setBookmarks(prev => {
      const next = new Set(prev);
      if (next.has(threadId)) next.delete(threadId);
      else next.add(threadId);
      storage.saveBookmarks([...next]);
      return next;
    });
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

  // ═══════════════════════════════════════════════════════════════════════════
  // DRAUSSEN ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  // Adds a new entry — multiple entries per user are allowed (one per child)
  const geheDraus = useCallback((ort, kind, spaetestens) => {
    setDraussenList(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        autor: currentUser,
        ort,
        seit: Date.now(),
        kind: kind ?? null,
        spaetestens: spaetestens ?? null,
      },
    ]);
  }, [currentUser]);

  // Removes a specific entry by id (not by autor)
  const geheRein = useCallback((id) => {
    setDraussenList(prev => prev.filter(d => d.id !== id));
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // KALENDER ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════
 
  const addEvent = useCallback(({ titel, beschreibung, datum, uhrzeit, ort, kategorie, ganztag, maxTeilnehmer }) => {
    const ev = {
      id:           Date.now().toString(),
      autor:        currentUser,
      titel:        titel.trim(),
      beschreibung: (beschreibung ?? '').trim(),
      datum,
      uhrzeit:      uhrzeit ?? null,
      ort:          (ort ?? '').trim() || null,
      kategorie:    kategorie ?? 'sonstiges',
      ganztag:      ganztag ?? false,
      maxTeilnehmer: maxTeilnehmer ?? null,
      teilnehmer:   [currentUser],
      kommentare:   [],
      ts:           Date.now(),
    };
    setEvents(prev => [...prev, ev].sort((a, b) => new Date(a.datum) - new Date(b.datum)));
  }, [currentUser]);
 
  const updateEvent = useCallback(({ id, titel, beschreibung, datum, uhrzeit, ort, kategorie, ganztag, maxTeilnehmer }) => {
    setEvents(prev => prev
      .map(ev => ev.id !== id ? ev : {
        ...ev,
        titel:        titel.trim(),
        beschreibung: (beschreibung ?? '').trim(),
        datum,
        uhrzeit:      uhrzeit ?? null,
        ort:          (ort ?? '').trim() || null,
        kategorie:    kategorie ?? ev.kategorie,
        ganztag:      ganztag ?? false,
        maxTeilnehmer: maxTeilnehmer ?? null,
      })
      .sort((a, b) => new Date(a.datum) - new Date(b.datum))
    );
  }, []);
 
  const deleteEvent = useCallback((id) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);
 
  const toggleEventTeilnehmer = useCallback((id) => {
    setEvents(prev => prev.map(ev => {
      if (ev.id !== id) return ev;
      const already = ev.teilnehmer.includes(currentUser);
      // Respect maxTeilnehmer when joining
      if (!already && ev.maxTeilnehmer && ev.teilnehmer.length >= ev.maxTeilnehmer) return ev;
      return {
        ...ev,
        teilnehmer: already
          ? ev.teilnehmer.filter(u => u !== currentUser)
          : [...ev.teilnehmer, currentUser],
      };
    }));
  }, [currentUser]);
 
  const addEventComment = useCallback((eventId, text) => {
    setEvents(prev => prev.map(ev => {
      if (ev.id !== eventId) return ev;
      const comment = {
        id:    Date.now().toString(),
        autor: currentUser,
        text:  text.trim(),
        ts:    Date.now(),
      };
      return { ...ev, kommentare: [...(ev.kommentare ?? []), comment] };
    }));
  }, [currentUser]);

  // ═══════════════════════════════════════════════════════════════════════════
  // PROFIL ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const updateKinder = useCallback((kinder) => {
    setKinderMap(prev => {
      const next = { ...prev, [currentUser]: kinder };
      storage.saveKinderMap(next);
      return next;
    });
  }, [currentUser]);

  const updateGroupCode = useCallback((code) => {
    setGroupCode(code);
    storage.saveGroupCode(code);
  }, []);

  const updateProfileEmoji = useCallback((emoji) => {
    setProfileEmoji(emoji);
    storage.saveProfileEmoji(emoji);
  }, []);

  const updateProfilePhoto = useCallback((uri) => {
    setProfilePhoto(uri);
    storage.saveProfilePhoto(uri);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <AppContext.Provider value={{
      // shared
      currentUser, loaded, members, updateUserName,
      // tratsch
      threads: sortedThreads, answersMap, seenIds, hintShown, unreadCount,
      bookmarks, pinnedIds,
      addThread, deleteThread, addAnswer,
      toggleReaction, markSeen, markHintShown,
      markSolved, votePoll, togglePin, toggleBookmark,
      // notfall
      notfaelle, addNotfall, toggleHelfer, toggleGedeckt, deleteNotfall,
      // kleider
      inserate, addInserat, updateInserat, toggleInteresse, toggleVergeben,
      // draussen
      draussenList: activeDraussen, geheDraus, geheRein,
      // kalender
      events, addEvent, updateEvent, deleteEvent,
      toggleEventTeilnehmer, addEventComment,
      // profil
      kinderMap, updateKinder,
      groupCode, updateGroupCode,
      profileEmoji, updateProfileEmoji,
      profilePhoto, updateProfilePhoto,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useTratsch = () => useContext(AppContext);
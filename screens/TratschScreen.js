import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, Animated, PanResponder, Keyboard,
} from 'react-native';
import { useState, useRef, useCallback } from 'react';

const INITIAL_THREADS = [
  { id: '1', autor: 'Sarah', titel: 'Guter Kinderarzt in Bern?', text: 'Suche dringend einen Kinderarzt der noch Patienten nimmt...', antworten: 3, zeit: 'vor 2 Min' },
  { id: '2', autor: 'Anna', titel: 'Turnverein für 4-Jährige', text: 'Wer hat Erfahrungen mit Turnvereinen für kleine Kinder?', antworten: 1, zeit: 'vor 1 Std' },
  { id: '3', autor: 'Julia', titel: 'Empfehlung Logopädin', text: 'Mein Sohn braucht Logopädie – kennt jemand jemanden?', antworten: 5, zeit: 'vor 3 Std' },
];

const INITIAL_ANTWORTEN = [
  { id: '1', autor: 'Julia', text: 'Wir waren super zufrieden mit Dr. Müller!', zeit: 'vor 1 Min', replyTo: null },
  { id: '2', autor: 'Petra', text: 'Schreib mal Dr. Meier an, der hat noch Plätze.', zeit: 'vor 30 Min', replyTo: null },
];

const SWIPE_THRESHOLD = 60;

// ─── SwipeableMessage ────────────────────────────────────────────────────────
function SwipeableMessage({ item, onSwipe, onScrollLock }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const triggered = useRef(false);
  const isSwiping = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      // Capture phase: claim the gesture before FlatList can scroll
      onMoveShouldSetPanResponderCapture: (_, g) => {
        const isHorizontal = Math.abs(g.dx) > Math.abs(g.dy) * 1.5;
        return g.dx > 5 && isHorizontal;
      },
      onPanResponderGrant: () => {
        triggered.current = false;
        isSwiping.current = true;
        onScrollLock(true);
      },
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) return;
        const clamped = Math.min(g.dx, SWIPE_THRESHOLD + 20);
        translateX.setValue(clamped);
        iconOpacity.setValue(Math.min(clamped / SWIPE_THRESHOLD, 1));

        if (!triggered.current && g.dx >= SWIPE_THRESHOLD) {
          triggered.current = true;
          onSwipe(item);
        }
      },
      onPanResponderRelease: () => {
        isSwiping.current = false;
        onScrollLock(false);
        Animated.parallel([
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 6 }),
          Animated.timing(iconOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        ]).start();
      },
      onPanResponderTerminate: () => {
        isSwiping.current = false;
        onScrollLock(false);
        Animated.parallel([
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 6 }),
          Animated.timing(iconOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        ]).start();
      },
    })
  ).current;

  return (
    <View style={styles.swipeRow}>
      <Animated.View style={[styles.replyIcon, { opacity: iconOpacity }]}>
        <Text style={{ fontSize: 18 }}>↩️</Text>
      </Animated.View>

      <Animated.View
        style={{ flex: 1, transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        <View style={styles.antwort}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.autor[0]}</Text>
          </View>
          <View style={styles.antwortBody}>
            <View style={styles.antwortHeader}>
              <Text style={styles.autor}>{item.autor}</Text>
              <Text style={styles.zeit}>{item.zeit}</Text>
            </View>

            {/* Quote block if this message is a reply */}
            {item.replyTo && (
              <View style={styles.quoteBlock}>
                <View style={styles.quoteLine} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.quoteAutor}>{item.replyTo.autor}</Text>
                  <Text style={styles.quoteText} numberOfLines={2}>{item.replyTo.text}</Text>
                </View>
              </View>
            )}

            <Text style={styles.antwortText}>{item.text}</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── ThreadDetail ────────────────────────────────────────────────────────────
function ThreadDetail({ thread, onBack }) {
  const [antworten, setAntworten] = useState(INITIAL_ANTWORTEN);
  const [text, setText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const flatListRef = useRef(null);

  const handleSwipe = useCallback((item) => {
    setReplyingTo(item);
  }, []);

  const handleScrollLock = useCallback((locked) => {
    setScrollEnabled(!locked);
  }, []);

  function sendeAntwort() {
    if (!text.trim()) return;
    const neu = {
      id: Date.now().toString(),
      autor: 'Du',
      text: text.trim(),
      zeit: 'gerade eben',
      replyTo: replyingTo ? { autor: replyingTo.autor, text: replyingTo.text } : null,
    };
    setAntworten(prev => [...prev, neu]);
    setText('');
    setReplyingTo(null);
    Keyboard.dismiss();
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backText}>← Zurück</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={antworten}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={scrollEnabled}
        ListHeaderComponent={
          <View style={styles.threadHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{thread.autor[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.threadTitel}>{thread.titel}</Text>
              <Text style={styles.threadAutor}>{thread.autor} · {thread.zeit}</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <SwipeableMessage item={item} onSwipe={handleSwipe} onScrollLock={handleScrollLock} />
        )}
      />

      {/* Reply banner */}
      {replyingTo && (
        <View style={styles.replyBanner}>
          <View style={styles.replyBannerLine} />
          <View style={{ flex: 1 }}>
            <Text style={styles.replyBannerAutor}>{replyingTo.autor}</Text>
            <Text style={styles.replyBannerText} numberOfLines={1}>{replyingTo.text}</Text>
          </View>
          <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.replyClose}>
            <Text style={styles.replyCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputBox}>
        <TextInput
          style={styles.input}
          placeholder="Antworten..."
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity
          style={[styles.button, !text.trim() && styles.buttonDisabled]}
          onPress={sendeAntwort}
          disabled={!text.trim()}
        >
          <Text style={styles.buttonText}>Senden</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── TratschScreen ───────────────────────────────────────────────────────────
export default function TratschScreen() {
  const [threads, setThreads] = useState(INITIAL_THREADS);
  const [selected, setSelected] = useState(null);
  const [neuerTitel, setNeuerTitel] = useState('');
  const [neuerText, setNeuerText] = useState('');
  const [showForm, setShowForm] = useState(false);

  function threadErstellen() {
    if (!neuerTitel.trim()) return;
    setThreads([{
      id: Date.now().toString(),
      autor: 'Du',
      titel: neuerTitel.trim(),
      text: neuerText.trim(),
      antworten: 0,
      zeit: 'gerade eben',
    }, ...threads]);
    setNeuerTitel('');
    setNeuerText('');
    setShowForm(false);
  }

  if (selected) {
    return <ThreadDetail thread={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={threads}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.threadCard} onPress={() => setSelected(item)}>
            <View style={styles.threadRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.autor[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.threadTitel}>{item.titel}</Text>
                <Text style={styles.threadMeta}>{item.autor} · {item.zeit}</Text>
              </View>
            </View>
            <Text style={styles.threadPreview} numberOfLines={2}>{item.text}</Text>
            <Text style={styles.antwortCount}>💬 {item.antworten} Antworten</Text>
          </TouchableOpacity>
        )}
      />

      {showForm && (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Titel deines Themas" value={neuerTitel} onChangeText={setNeuerTitel} />
          <TextInput style={[styles.input, { marginTop: 8, minHeight: 60 }]} placeholder="Beschreibe dein Anliegen..." value={neuerText} onChangeText={setNeuerText} multiline />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: '#eee' }]} onPress={() => setShowForm(false)}>
              <Text style={[styles.buttonText, { color: '#888' }]}>Abbrechen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { flex: 1 }, !neuerTitel.trim() && styles.buttonDisabled]} onPress={threadErstellen} disabled={!neuerTitel.trim()}>
              <Text style={styles.buttonText}>Posten</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!showForm && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)}>
          <Text style={styles.fabText}>+ Neues Thema</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  list: { padding: 16, gap: 12, paddingBottom: 80 },

  // Thread list
  threadCard: { backgroundColor: '#fafafa', borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: '#eee', gap: 8 },
  threadRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  threadTitel: { fontSize: 14, fontWeight: '500', color: '#222' },
  threadMeta: { fontSize: 11, color: '#aaa', marginTop: 2 },
  threadPreview: { fontSize: 13, color: '#666', lineHeight: 19 },
  antwortCount: { fontSize: 12, color: '#aaa' },

  // Thread detail header
  threadHeader: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#FBEAF0', borderRadius: 14, padding: 14, marginBottom: 16 },
  threadAutor: { fontSize: 12, color: '#aaa', marginTop: 4 },

  // Avatar
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FBEAF0', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#993556', fontWeight: '500', fontSize: 15 },

  // Swipe row
  swipeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  replyIcon: { position: 'absolute', left: 4, zIndex: 0 },

  // Message
  antwort: { flexDirection: 'row', gap: 10, flex: 1 },
  antwortBody: { flex: 1, backgroundColor: '#fafafa', borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: '#eee' },
  antwortHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  autor: { fontSize: 13, fontWeight: '500', color: '#333' },
  zeit: { fontSize: 11, color: '#aaa' },
  antwortText: { fontSize: 14, color: '#444', lineHeight: 20 },

  // Quote block (inside message)
  quoteBlock: { flexDirection: 'row', gap: 8, backgroundColor: '#F3E0E6', borderRadius: 8, padding: 8, marginBottom: 8 },
  quoteLine: { width: 3, backgroundColor: '#993556', borderRadius: 2 },
  quoteAutor: { fontSize: 12, fontWeight: '600', color: '#993556', marginBottom: 2 },
  quoteText: { fontSize: 12, color: '#666', lineHeight: 17 },

  // Reply banner (above input)
  replyBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: '#eee', backgroundColor: '#fafafa' },
  replyBannerLine: { width: 3, height: '100%', backgroundColor: '#993556', borderRadius: 2 },
  replyBannerAutor: { fontSize: 12, fontWeight: '600', color: '#993556' },
  replyBannerText: { fontSize: 12, color: '#888' },
  replyClose: { padding: 4 },
  replyCloseText: { color: '#aaa', fontSize: 14 },

  // Input bar
  inputBox: { flexDirection: 'row', padding: 12, gap: 10, borderTopWidth: 0.5, borderTopColor: '#eee', backgroundColor: '#fff', alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#fafafa', borderRadius: 12, borderWidth: 0.5, borderColor: '#eee', padding: 10, fontSize: 14 },
  button: { backgroundColor: '#993556', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#eee' },
  buttonText: { color: '#fff', fontWeight: '500', fontSize: 14 },

  // Nav / form
  backBtn: { padding: 16, paddingBottom: 8 },
  backText: { color: '#993556', fontSize: 14 },
  form: { padding: 16, borderTopWidth: 0.5, borderTopColor: '#eee', backgroundColor: '#fff' },
  fab: { position: 'absolute', bottom: 16, right: 16, left: 16, backgroundColor: '#993556', borderRadius: 14, padding: 14, alignItems: 'center' },
  fabText: { color: '#fff', fontWeight: '500', fontSize: 15 },
});
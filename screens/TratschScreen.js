import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useState } from 'react';

const INITIAL_THREADS = [
  {
    id: '1',
    autor: 'Sarah',
    titel: 'Guter Kinderarzt in Bern?',
    text: 'Suche dringend einen Kinderarzt der noch Patienten nimmt...',
    antworten: 3,
    zeit: 'vor 2 Min',
  },
  {
    id: '2',
    autor: 'Anna',
    titel: 'Turnverein für 4-Jährige',
    text: 'Wer hat Erfahrungen mit Turnvereinen für kleine Kinder?',
    antworten: 1,
    zeit: 'vor 1 Std',
  },
  {
    id: '3',
    autor: 'Julia',
    titel: 'Empfehlung Logopädin',
    text: 'Mein Sohn braucht Logopädie – kennt jemand jemanden?',
    antworten: 5,
    zeit: 'vor 3 Std',
  },
];

function ThreadDetail({ thread, onBack }) {
  const [antworten, setAntworten] = useState([
    { id: '1', autor: 'Julia', text: 'Wir waren super zufrieden mit Dr. Müller!', zeit: 'vor 1 Min' },
    { id: '2', autor: 'Petra', text: 'Schreib mal Dr. Meier an, der hat noch Plätze.', zeit: 'vor 30 Min' },
  ]);
  const [text, setText] = useState('');

  function antworten_senden() {
    if (!text.trim()) return;
    setAntworten([...antworten, {
      id: Date.now().toString(),
      autor: 'Du',
      text: text.trim(),
      zeit: 'gerade eben',
    }]);
    setText('');
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backText}>← Zurück</Text>
      </TouchableOpacity>

      <FlatList
        data={antworten}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
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
          <View style={styles.antwort}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.autor[0]}</Text>
            </View>
            <View style={styles.antwortBody}>
              <View style={styles.antwortHeader}>
                <Text style={styles.autor}>{item.autor}</Text>
                <Text style={styles.zeit}>{item.zeit}</Text>
              </View>
              <Text style={styles.antwortText}>{item.text}</Text>
            </View>
          </View>
        )}
      />

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
          onPress={antworten_senden}
          disabled={!text.trim()}
        >
          <Text style={styles.buttonText}>Senden</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

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
          <TextInput
            style={styles.input}
            placeholder="Titel deines Themas"
            value={neuerTitel}
            onChangeText={setNeuerTitel}
          />
          <TextInput
            style={[styles.input, { marginTop: 8, minHeight: 60 }]}
            placeholder="Beschreibe dein Anliegen..."
            value={neuerText}
            onChangeText={setNeuerText}
            multiline
          />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: '#eee' }]} onPress={() => setShowForm(false)}>
              <Text style={[styles.buttonText, { color: '#888' }]}>Abbrechen</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { flex: 1 }, !neuerTitel.trim() && styles.buttonDisabled]}
              onPress={threadErstellen}
              disabled={!neuerTitel.trim()}
            >
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  list: { padding: 16, gap: 12, paddingBottom: 80 },
  threadCard: {
    backgroundColor: '#fafafa',
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: '#eee',
    gap: 8,
  },
  threadRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FBEAF0', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#993556', fontWeight: '500', fontSize: 15 },
  threadTitel: { fontSize: 14, fontWeight: '500', color: '#222' },
  threadMeta: { fontSize: 11, color: '#aaa', marginTop: 2 },
  threadPreview: { fontSize: 13, color: '#666', lineHeight: 19 },
  antwortCount: { fontSize: 12, color: '#aaa' },
  threadHeader: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#FBEAF0', borderRadius: 14, padding: 14, marginBottom: 16 },
  threadTitel: { fontSize: 16, fontWeight: '500', color: '#993556' },
  threadAutor: { fontSize: 12, color: '#aaa', marginTop: 4 },
  antwort: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  antwortBody: { flex: 1, backgroundColor: '#fafafa', borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: '#eee' },
  antwortHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  autor: { fontSize: 13, fontWeight: '500', color: '#333' },
  zeit: { fontSize: 11, color: '#aaa' },
  antwortText: { fontSize: 14, color: '#444', lineHeight: 20 },
  backBtn: { padding: 16, paddingBottom: 8 },
  backText: { color: '#993556', fontSize: 14 },
  inputBox: { flexDirection: 'row', padding: 12, gap: 10, borderTopWidth: 0.5, borderTopColor: '#eee', backgroundColor: '#fff', alignItems: 'flex-end' },
  form: { padding: 16, borderTopWidth: 0.5, borderTopColor: '#eee', backgroundColor: '#fff' },
  input: { flex: 1, backgroundColor: '#fafafa', borderRadius: 12, borderWidth: 0.5, borderColor: '#eee', padding: 10, fontSize: 14 },
  button: { backgroundColor: '#993556', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#eee' },
  buttonText: { color: '#fff', fontWeight: '500', fontSize: 14 },
  fab: { position: 'absolute', bottom: 16, right: 16, left: 16, backgroundColor: '#993556', borderRadius: 14, padding: 14, alignItems: 'center' },
  fabText: { color: '#fff', fontWeight: '500', fontSize: 15 },
});
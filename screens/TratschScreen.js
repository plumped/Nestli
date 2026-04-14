import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useHeaderHeight } from '@react-navigation/elements';
import * as ImagePicker from 'expo-image-picker';
import { useTratsch } from '../context/TratschContext';
import ThreadDetailScreen from './ThreadDetailScreen';
import { relativeTime } from '../utils/time';
import { TAGS, tagById } from '../utils/tags';
import { colors } from '../theme';

export default function TratschScreen({ navigation, route }) {
  const {
    threads, answersMap, seenIds,
    addThread, deleteThread, markSeen, currentUser,
    bookmarks, pinnedIds, toggleBookmark, togglePin,
  } = useTratsch();
  const headerHeight = useHeaderHeight();

  const [selected,  setSelected]  = useState(null);
  const cameFromDashboard = useRef(false);
  const [search,    setSearch]    = useState('');
  const [tagFilter, setTagFilter] = useState(null);
  const [showSaved, setShowSaved] = useState(false);

  const [showForm,      setShowForm]      = useState(false);
  const [titel,         setTitel]         = useState('');
  const [body,          setBody]          = useState('');
  const [formTag,       setFormTag]       = useState(null);
  const [imageUri,      setImageUri]      = useState(null);
  const [showPoll,      setShowPoll]      = useState(false);
  const [pollQuestion,  setPollQuestion]  = useState('');
  const [pollOptions,   setPollOptions]   = useState(['', '']);

  // Deep-link from dashboard
  useEffect(() => {
    const id = route?.params?.openThreadId;
    if (!id) return;
    const thread = threads.find(t => t.id === id);
    if (thread) {
      markSeen(thread.id);
      cameFromDashboard.current = true;
      setSelected(thread);
    }
    navigation.setParams({ openThreadId: undefined });
  }, [route?.params?.openThreadId]);

  // Filtering
  const filtered = useMemo(() => {
    let result = threads;
    if (showSaved)        result = result.filter(t => bookmarks.has(t.id));
    if (tagFilter)        result = result.filter(t => t.tag === tagFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.titel.toLowerCase().includes(q) || t.text.toLowerCase().includes(q)
      );
    }
    return result;
  }, [threads, search, tagFilter, showSaved, bookmarks]);

  function openThread(thread) {
    markSeen(thread.id);
    setSelected(thread);
  }

  function confirmDelete(thread) {
    if (thread.autor !== currentUser) return;
    Alert.alert(
      'Thread löschen?',
      `"${thread.titel}" wirklich entfernen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Löschen', style: 'destructive', onPress: () => deleteThread(thread.id) },
      ]
    );
  }

  async function pickImage() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Berechtigung benötigt', 'Bitte erlaube den Zugriff auf deine Fotos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7, allowsEditing: true, aspect: [4, 3],
      });
      if (!result.canceled) setImageUri(result.assets[0].uri);
    } catch {
      Alert.alert('Fehler', 'Foto konnte nicht geladen werden.');
    }
  }

  function resetForm() {
    setTitel(''); setBody(''); setFormTag(null); setImageUri(null);
    setShowPoll(false); setPollQuestion(''); setPollOptions(['', '']);
    setShowForm(false);
  }

  function erstellen() {
    if (!titel.trim()) return;
    const validOptions = pollOptions.filter(o => o.trim());
    const poll =
      showPoll && pollQuestion.trim() && validOptions.length >= 2
        ? { question: pollQuestion.trim(), options: validOptions.map(text => ({ text: text.trim(), voters: [] })) }
        : null;
    addThread(titel, body, formTag, imageUri, poll);
    resetForm();
  }

  if (selected) {
    return <ThreadDetailScreen thread={selected} onBack={() => {
      setSelected(null);
      if (cameFromDashboard.current) {
        cameFromDashboard.current = false;
        navigation.navigate('Home');
      }
    }} />;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={headerHeight}
    >
      <View style={styles.container}>

        {/* Search bar */}
        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Themen suchen..."
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter bar with Bookmarks */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={styles.tagBar} contentContainerStyle={styles.tagBarContent}
        >
          <TouchableOpacity
            style={[styles.tagChip, !tagFilter && !showSaved && styles.tagChipActive]}
            onPress={() => { setTagFilter(null); setShowSaved(false); }}
          >
            <Text style={[styles.tagChipText, !tagFilter && !showSaved && styles.tagChipTextActive]}>Alle</Text>
          </TouchableOpacity>

          {/* Bookmarks filter */}
          <TouchableOpacity
            style={[styles.tagChip, showSaved && styles.tagChipBookmark]}
            onPress={() => { setShowSaved(v => !v); setTagFilter(null); }}
          >
            <Text style={[styles.tagChipText, showSaved && styles.tagChipTextBookmark]}>
              🔖 Gespeichert {bookmarks.size > 0 ? `(${bookmarks.size})` : ''}
            </Text>
          </TouchableOpacity>

          {TAGS.map(tag => (
            <TouchableOpacity
              key={tag.id}
              style={[styles.tagChip, tagFilter === tag.id && styles.tagChipActive]}
              onPress={() => { setTagFilter(tagFilter === tag.id ? null : tag.id); setShowSaved(false); }}
            >
              <Text style={[styles.tagChipText, tagFilter === tag.id && styles.tagChipTextActive]}>
                {tag.emoji} {tag.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Thread list */}
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.list, filtered.length === 0 && styles.listCenter]}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isUnread    = !seenIds.has(item.id);
            const answerCount = (answersMap[item.id] ?? []).length;
            const tag         = tagById(item.tag);
            const isOwn       = item.autor === currentUser;
            const isPinned    = pinnedIds.has(item.id);
            const isBookmarked= bookmarks.has(item.id);

            return (
              <TouchableOpacity
                style={[
                  styles.card,
                  isUnread && styles.cardUnread,
                  item.solved && styles.cardSolved,
                  isPinned && styles.cardPinned,
                ]}
                onPress={() => openThread(item)}
                onLongPress={isOwn ? () => confirmDelete(item) : undefined}
                delayLongPress={600}
                activeOpacity={0.75}
              >
                <View style={styles.cardRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.autor[0]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.titleRow}>
                      {isPinned && <Text style={styles.pinIcon}>📌</Text>}
                      <Text style={styles.cardTitel} numberOfLines={1}>{item.titel}</Text>
                      {item.solved && <Text style={styles.solvedBadge}>✅</Text>}
                      {isUnread && !item.solved && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.cardMeta}>{item.autor} · {relativeTime(item.ts)}</Text>
                  </View>

                  {/* Actions: Bookmark + Pin */}
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      onPress={() => toggleBookmark(item.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.actionBtn}
                    >
                      <Text style={[styles.actionIcon, isBookmarked && styles.actionIconActive]}>
                        {isBookmarked ? '🔖' : '🏷️'}
                      </Text>
                    </TouchableOpacity>
                    {isOwn && (
                      <TouchableOpacity
                        onPress={() => togglePin(item.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.actionBtn}
                      >
                        <Text style={[styles.actionIcon, isPinned && styles.actionIconActive]}>
                          📌
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {!!item.imageUri && (
                  <Image source={{ uri: item.imageUri }} style={styles.cardImage} resizeMode="cover" />
                )}
                {!!item.text && !item.imageUri && (
                  <Text style={styles.cardPreview} numberOfLines={2}>{item.text}</Text>
                )}
                {item.poll && (
                  <View style={styles.pollPreview}>
                    <Text style={styles.pollPreviewText}>📊 {item.poll.question}</Text>
                    <Text style={styles.pollPreviewSub}>
                      {item.poll.options.length} Optionen · {item.poll.options.reduce((s, o) => s + o.voters.length, 0)} Stimmen
                    </Text>
                  </View>
                )}

                <View style={styles.cardFooter}>
                  {tag ? (
                    <View style={styles.tagPill}>
                      <Text style={styles.tagPillText}>{tag.emoji} {tag.label}</Text>
                    </View>
                  ) : <View />}
                  <Text style={styles.replyCount}>💬 {answerCount} Antwort{answerCount !== 1 ? 'en' : ''}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>{showSaved ? '🔖' : search || tagFilter ? '🔍' : '💬'}</Text>
              <Text style={styles.emptyTitle}>
                {showSaved ? 'Noch nichts gespeichert' : search || tagFilter ? 'Nichts gefunden' : 'Noch keine Themen'}
              </Text>
              <Text style={styles.emptySub}>
                {showSaved
                  ? 'Tippe auf 🏷️ bei einem Thread um ihn zu speichern'
                  : search ? `Keine Treffer für "${search}"`
                  : tagFilter ? 'Keine Themen in dieser Kategorie'
                  : 'Erstell das erste Thema für eure Gruppe!'}
              </Text>
            </View>
          }
        />

        {/* New thread form */}
        {showForm && (
          <View style={styles.form}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.formTagBar}>
                {TAGS.map(tag => (
                  <TouchableOpacity
                    key={tag.id}
                    style={[styles.formTagChip, formTag === tag.id && styles.formTagChipActive]}
                    onPress={() => setFormTag(formTag === tag.id ? null : tag.id)}
                  >
                    <Text style={[styles.formTagChipText, formTag === tag.id && styles.formTagChipTextActive]}>
                      {tag.emoji} {tag.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TextInput style={styles.formInput} placeholder="Titel deines Themas *" value={titel} onChangeText={setTitel} />
              <TextInput style={[styles.formInput, styles.formTextarea]} placeholder="Beschreibe dein Anliegen... (optional)" value={body} onChangeText={setBody} multiline />

              <View style={styles.formExtras}>
                <TouchableOpacity style={[styles.extraBtn, !!imageUri && styles.extraBtnActive]} onPress={pickImage}>
                  <Text style={[styles.extraBtnText, !!imageUri && styles.extraBtnTextActive]}>📷 Foto{imageUri ? ' ✓' : ''}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.extraBtn, showPoll && styles.extraBtnActive]} onPress={() => setShowPoll(p => !p)}>
                  <Text style={[styles.extraBtnText, showPoll && styles.extraBtnTextActive]}>📊 Umfrage</Text>
                </TouchableOpacity>
              </View>

              {showPoll && (
                <View style={styles.pollForm}>
                  <TextInput style={styles.formInput} placeholder="Frage der Umfrage *" value={pollQuestion} onChangeText={setPollQuestion} />
                  {pollOptions.map((opt, i) => (
                    <View key={i} style={styles.pollOptionRow}>
                      <TextInput
                        style={[styles.formInput, { flex: 1 }]}
                        placeholder={`Option ${i + 1}${i < 2 ? ' *' : ''}`}
                        value={opt}
                        onChangeText={v => { const next = [...pollOptions]; next[i] = v; setPollOptions(next); }}
                      />
                      {pollOptions.length > 2 && (
                        <TouchableOpacity style={styles.pollRemoveBtn} onPress={() => setPollOptions(prev => prev.filter((_, j) => j !== i))}>
                          <Text style={styles.pollRemoveText}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  {pollOptions.length < 4 && (
                    <TouchableOpacity style={styles.addOptionBtn} onPress={() => setPollOptions(prev => [...prev, ''])}>
                      <Text style={styles.addOptionText}>+ Option hinzufügen</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <View style={styles.formActions}>
                <TouchableOpacity style={[styles.formBtn, styles.formBtnSecondary]} onPress={resetForm}>
                  <Text style={styles.formBtnSecondaryText}>Abbrechen</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.formBtn, !titel.trim() && styles.formBtnDisabled]} onPress={erstellen} disabled={!titel.trim()}>
                  <Text style={styles.formBtnText}>Posten</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}

        {!showForm && (
          <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)}>
            <Text style={styles.fabText}>+ Neues Thema</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  searchRow:   { flexDirection: 'row', alignItems: 'center', margin: 12, marginBottom: 4, backgroundColor: colors.bgAlt, borderRadius: 12, borderWidth: 0.5, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  searchIcon:  { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  searchClear: { color: colors.textMuted, fontSize: 13 },

  tagBar:        { maxHeight: 44 },
  tagBarContent: { paddingHorizontal: 12, paddingVertical: 6, gap: 6, flexDirection: 'row', alignItems: 'center' },
  tagChip:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.bgAlt, borderWidth: 0.5, borderColor: colors.border },
  tagChipActive:   { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  tagChipBookmark: { backgroundColor: '#FFF8E1', borderColor: '#FFB300' },
  tagChipText:     { fontSize: 12, color: colors.textMid },
  tagChipTextActive:   { color: colors.primary, fontWeight: '500' },
  tagChipTextBookmark: { color: '#6D4C00', fontWeight: '500' },

  list:       { padding: 12, gap: 10, paddingBottom: 90 },
  listCenter: { flex: 1, justifyContent: 'center' },

  card:        { backgroundColor: colors.bgAlt, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: colors.border, gap: 8 },
  cardUnread:  { borderColor: colors.primaryMid, backgroundColor: '#fffafc' },
  cardSolved:  { opacity: 0.75 },
  cardPinned:  { borderColor: '#FFB300', borderWidth: 1, backgroundColor: '#FFFDF5' },
  cardRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  pinIcon:     { fontSize: 12 },
  cardTitel:   { fontSize: 14, fontWeight: '500', color: colors.text, flex: 1 },
  solvedBadge: { fontSize: 14 },
  unreadDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, flexShrink: 0 },
  cardMeta:    { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  cardPreview: { fontSize: 13, color: colors.textLight, lineHeight: 19 },
  cardImage:   { width: '100%', height: 140, borderRadius: 10 },

  cardActions: { flexDirection: 'row', gap: 4, alignItems: 'center', flexShrink: 0 },
  actionBtn:   { padding: 4 },
  actionIcon:  { fontSize: 14, opacity: 0.4 },
  actionIconActive: { opacity: 1 },

  pollPreview:    { backgroundColor: colors.primaryLight, borderRadius: 8, padding: 10, gap: 2 },
  pollPreviewText:{ fontSize: 13, color: colors.primary, fontWeight: '500' },
  pollPreviewSub: { fontSize: 11, color: colors.textMuted },

  cardFooter:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  tagPill:     { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: colors.primaryLight, borderRadius: 20 },
  tagPillText: { fontSize: 11, color: colors.primary, fontWeight: '500' },
  replyCount:  { fontSize: 12, color: colors.textMuted },

  avatar:     { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '500', fontSize: 15 },

  emptyState: { alignItems: 'center', gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '500', color: colors.textMid },
  emptySub:   { fontSize: 13, color: colors.textMuted, textAlign: 'center', maxWidth: 260, lineHeight: 20 },

  form: { maxHeight: '70%', borderTopWidth: 0.5, borderTopColor: colors.border, backgroundColor: colors.bg, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  formInput:    { backgroundColor: colors.bgAlt, borderWidth: 0.5, borderColor: colors.border, borderRadius: 12, padding: 12, fontSize: 14 },
  formTextarea: { minHeight: 60, textAlignVertical: 'top' },

  formTagBar:        { gap: 6, paddingBottom: 4 },
  formTagChip:       { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.bgAlt, borderWidth: 0.5, borderColor: colors.border },
  formTagChipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  formTagChipText:   { fontSize: 12, color: colors.textMid },
  formTagChipTextActive: { color: colors.primary, fontWeight: '500' },

  formExtras:     { flexDirection: 'row', gap: 8 },
  extraBtn:       { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.bgAlt, borderWidth: 0.5, borderColor: colors.border, alignItems: 'center' },
  extraBtnActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  extraBtnText:     { fontSize: 13, color: colors.textMid },
  extraBtnTextActive: { color: colors.primary, fontWeight: '500' },

  pollForm:       { gap: 6, backgroundColor: colors.bgAlt, borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: colors.border },
  pollOptionRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pollRemoveBtn:  { padding: 8 },
  pollRemoveText: { color: colors.textMuted, fontSize: 14 },
  addOptionBtn:   { paddingVertical: 8, alignItems: 'center' },
  addOptionText:  { color: colors.primary, fontSize: 13, fontWeight: '500' },

  formActions:          { flexDirection: 'row', gap: 8 },
  formBtn:              { flex: 1, backgroundColor: colors.primary, borderRadius: 12, padding: 12, alignItems: 'center' },
  formBtnDisabled:      { backgroundColor: colors.border },
  formBtnSecondary:     { backgroundColor: colors.bgAlt, borderWidth: 0.5, borderColor: colors.border },
  formBtnText:          { color: '#fff', fontWeight: '500', fontSize: 14 },
  formBtnSecondaryText: { color: colors.textLight, fontWeight: '500', fontSize: 14 },

  fab:     { position: 'absolute', bottom: 16, right: 16, left: 16, backgroundColor: colors.primary, borderRadius: 14, padding: 14, alignItems: 'center' },
  fabText: { color: '#fff', fontWeight: '500', fontSize: 15 },
});
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { useState, useMemo } from 'react';
import { useHeaderHeight } from '@react-navigation/elements';
import * as ImagePicker from 'expo-image-picker';
import { useTratsch } from '../context/TratschContext';
import ThreadDetailScreen from './ThreadDetailScreen';
import { relativeTime } from '../utils/time';
import { TAGS, tagById } from '../utils/tags';
import { colors } from '../theme';

export default function TratschScreen() {
  const {
    threads, answersMap, seenIds,
    addThread, deleteThread, markSeen, currentUser,
  } = useTratsch();
  const headerHeight = useHeaderHeight();

  // Navigation
  const [selected,  setSelected]  = useState(null);

  // Filters
  const [search,    setSearch]    = useState('');
  const [tagFilter, setTagFilter] = useState(null);

  // New thread form
  const [showForm,      setShowForm]      = useState(false);
  const [titel,         setTitel]         = useState('');
  const [body,          setBody]          = useState('');
  const [formTag,       setFormTag]       = useState(null);
  const [imageUri,      setImageUri]      = useState(null);
  const [showPoll,      setShowPoll]      = useState(false);
  const [pollQuestion,  setPollQuestion]  = useState('');
  const [pollOptions,   setPollOptions]   = useState(['', '']);

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = threads;
    if (tagFilter) result = result.filter(t => t.tag === tagFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.titel.toLowerCase().includes(q) || t.text.toLowerCase().includes(q)
      );
    }
    return result;
  }, [threads, search, tagFilter]);

  // ── Actions ───────────────────────────────────────────────────────────────
  function openThread(thread) {
    markSeen(thread.id);
    setSelected(thread);
  }

  function confirmDelete(thread) {
    if (thread.autor !== currentUser) return; // Only own threads
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
        Alert.alert(
          'Berechtigung benötigt',
          'Bitte erlaube den Zugriff auf deine Fotos in den Einstellungen.'
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
        aspect: [4, 3],
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
        ? {
            question: pollQuestion.trim(),
            options: validOptions.map(text => ({ text: text.trim(), voters: [] })),
          }
        : null;
    addThread(titel, body, formTag, imageUri, poll);
    resetForm();
  }

  // ── Thread detail ─────────────────────────────────────────────────────────
  if (selected) {
    return <ThreadDetailScreen thread={selected} onBack={() => setSelected(null)} />;
  }

  // ── Thread list ───────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={headerHeight}
    >
      <View style={styles.container}>

        {/* ── Search bar ── */}
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

        {/* ── Tag filter bar ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tagBar}
          contentContainerStyle={styles.tagBarContent}
        >
          <TouchableOpacity
            style={[styles.tagChip, !tagFilter && styles.tagChipActive]}
            onPress={() => setTagFilter(null)}
          >
            <Text style={[styles.tagChipText, !tagFilter && styles.tagChipTextActive]}>Alle</Text>
          </TouchableOpacity>
          {TAGS.map(tag => (
            <TouchableOpacity
              key={tag.id}
              style={[styles.tagChip, tagFilter === tag.id && styles.tagChipActive]}
              onPress={() => setTagFilter(tagFilter === tag.id ? null : tag.id)}
            >
              <Text style={[styles.tagChipText, tagFilter === tag.id && styles.tagChipTextActive]}>
                {tag.emoji} {tag.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Thread list ── */}
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

            return (
              <TouchableOpacity
                style={[
                  styles.card,
                  isUnread  && styles.cardUnread,
                  item.solved && styles.cardSolved,
                ]}
                onPress={() => openThread(item)}
                onLongPress={isOwn ? () => confirmDelete(item) : undefined}
                delayLongPress={600}
                activeOpacity={0.75}
              >
                {/* Card header row */}
                <View style={styles.cardRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.autor[0]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.titleRow}>
                      <Text style={styles.cardTitel} numberOfLines={1}>{item.titel}</Text>
                      {item.solved  && <Text style={styles.solvedBadge}>✅</Text>}
                      {isUnread && !item.solved && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.cardMeta}>{item.autor} · {relativeTime(item.ts)}</Text>
                  </View>
                </View>

                {/* Image preview */}
                {!!item.imageUri && (
                  <Image source={{ uri: item.imageUri }} style={styles.cardImage} resizeMode="cover" />
                )}

                {/* Text preview (hide if image present) */}
                {!!item.text && !item.imageUri && (
                  <Text style={styles.cardPreview} numberOfLines={2}>{item.text}</Text>
                )}

                {/* Poll preview */}
                {item.poll && (
                  <View style={styles.pollPreview}>
                    <Text style={styles.pollPreviewText}>📊 {item.poll.question}</Text>
                    <Text style={styles.pollPreviewSub}>
                      {item.poll.options.length} Optionen · {item.poll.options.reduce((s, o) => s + o.voters.length, 0)} Stimmen
                    </Text>
                  </View>
                )}

                {/* Footer: tag + reply count */}
                <View style={styles.cardFooter}>
                  {tag ? (
                    <View style={styles.tagPill}>
                      <Text style={styles.tagPillText}>{tag.emoji} {tag.label}</Text>
                    </View>
                  ) : <View />}
                  <Text style={styles.replyCount}>
                    💬 {answerCount} Antwort{answerCount !== 1 ? 'en' : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>{search || tagFilter ? '🔍' : '💬'}</Text>
              <Text style={styles.emptyTitle}>
                {search || tagFilter ? 'Nichts gefunden' : 'Noch keine Themen'}
              </Text>
              <Text style={styles.emptySub}>
                {search
                  ? `Keine Treffer für "${search}"`
                  : tagFilter
                  ? 'Keine Themen in dieser Kategorie'
                  : 'Erstell das erste Thema für eure Gruppe!'}
              </Text>
            </View>
          }
        />

        {/* ── New thread form ── */}
        {showForm && (
          <View style={styles.form}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
            >
              {/* Tag selector */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.formTagBar}
              >
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

              <TextInput
                style={styles.formInput}
                placeholder="Titel deines Themas *"
                value={titel}
                onChangeText={setTitel}
              />
              <TextInput
                style={[styles.formInput, styles.formTextarea]}
                placeholder="Beschreibe dein Anliegen... (optional)"
                value={body}
                onChangeText={setBody}
                multiline
              />

              {/* Extra actions: photo + poll */}
              <View style={styles.formExtras}>
                <TouchableOpacity
                  style={[styles.extraBtn, !!imageUri && styles.extraBtnActive]}
                  onPress={pickImage}
                >
                  <Text style={[styles.extraBtnText, !!imageUri && styles.extraBtnTextActive]}>
                    📷 Foto{imageUri ? ' ✓' : ''}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.extraBtn, showPoll && styles.extraBtnActive]}
                  onPress={() => setShowPoll(p => !p)}
                >
                  <Text style={[styles.extraBtnText, showPoll && styles.extraBtnTextActive]}>
                    📊 Umfrage
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Image preview */}
              {!!imageUri && (
                <View style={styles.imagePreviewWrap}>
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
                  <TouchableOpacity style={styles.imageRemoveBtn} onPress={() => setImageUri(null)}>
                    <Text style={styles.imageRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Poll builder */}
              {showPoll && (
                <View style={styles.pollForm}>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Frage der Umfrage *"
                    value={pollQuestion}
                    onChangeText={setPollQuestion}
                  />
                  {pollOptions.map((opt, i) => (
                    <View key={i} style={styles.pollOptionRow}>
                      <TextInput
                        style={[styles.formInput, { flex: 1 }]}
                        placeholder={`Option ${i + 1}${i < 2 ? ' *' : ''}`}
                        value={opt}
                        onChangeText={v => {
                          const next = [...pollOptions];
                          next[i] = v;
                          setPollOptions(next);
                        }}
                      />
                      {pollOptions.length > 2 && (
                        <TouchableOpacity
                          style={styles.pollRemoveBtn}
                          onPress={() => setPollOptions(prev => prev.filter((_, j) => j !== i))}
                        >
                          <Text style={styles.pollRemoveText}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  {pollOptions.length < 4 && (
                    <TouchableOpacity
                      style={styles.addOptionBtn}
                      onPress={() => setPollOptions(prev => [...prev, ''])}
                    >
                      <Text style={styles.addOptionText}>+ Option hinzufügen</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Form actions */}
              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.formBtn, styles.formBtnSecondary]}
                  onPress={resetForm}
                >
                  <Text style={styles.formBtnSecondaryText}>Abbrechen</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formBtn, !titel.trim() && styles.formBtnDisabled]}
                  onPress={erstellen}
                  disabled={!titel.trim()}
                >
                  <Text style={styles.formBtnText}>Posten</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}

        {/* ── FAB ── */}
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

  // ── Search ──
  searchRow:   { flexDirection: 'row', alignItems: 'center', margin: 12, marginBottom: 4, backgroundColor: colors.bgAlt, borderRadius: 12, borderWidth: 0.5, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  searchIcon:  { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  searchClear: { color: colors.textMuted, fontSize: 13 },

  // ── Tag filter bar ──
  tagBar:        { maxHeight: 44 },
  tagBarContent: { paddingHorizontal: 12, paddingVertical: 6, gap: 6, flexDirection: 'row', alignItems: 'center' },
  tagChip:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.bgAlt, borderWidth: 0.5, borderColor: colors.border },
  tagChipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  tagChipText:   { fontSize: 12, color: colors.textMid },
  tagChipTextActive: { color: colors.primary, fontWeight: '500' },

  // ── List ──
  list:       { padding: 12, gap: 10, paddingBottom: 90 },
  listCenter: { flex: 1, justifyContent: 'center' },

  // ── Thread card ──
  card:        { backgroundColor: colors.bgAlt, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: colors.border, gap: 8 },
  cardUnread:  { borderColor: colors.primaryMid, backgroundColor: '#fffafc' },
  cardSolved:  { opacity: 0.75 },
  cardRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitel:   { fontSize: 14, fontWeight: '500', color: colors.text, flex: 1 },
  solvedBadge: { fontSize: 14 },
  unreadDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, flexShrink: 0 },
  cardMeta:    { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  cardPreview: { fontSize: 13, color: colors.textLight, lineHeight: 19 },
  cardImage:   { width: '100%', height: 140, borderRadius: 10 },

  pollPreview:    { backgroundColor: colors.primaryLight, borderRadius: 8, padding: 10, gap: 2 },
  pollPreviewText:{ fontSize: 13, color: colors.primary, fontWeight: '500' },
  pollPreviewSub: { fontSize: 11, color: colors.textMuted },

  cardFooter:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  tagPill:     { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: colors.primaryLight, borderRadius: 20 },
  tagPillText: { fontSize: 11, color: colors.primary, fontWeight: '500' },
  replyCount:  { fontSize: 12, color: colors.textMuted },

  // ── Avatar ──
  avatar:     { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '500', fontSize: 15 },

  // ── Empty state ──
  emptyState: { alignItems: 'center', gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '500', color: colors.textMid },
  emptySub:   { fontSize: 13, color: colors.textMuted, textAlign: 'center', maxWidth: 240, lineHeight: 20 },

  // ── Form ──
  form: {
    maxHeight: '70%',
    borderTopWidth: 0.5, borderTopColor: colors.border,
    backgroundColor: colors.bg,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
  },
  formInput:    { backgroundColor: colors.bgAlt, borderWidth: 0.5, borderColor: colors.border, borderRadius: 12, padding: 12, fontSize: 14 },
  formTextarea: { minHeight: 60, textAlignVertical: 'top' },

  formTagBar:       { gap: 6, paddingBottom: 4 },
  formTagChip:      { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.bgAlt, borderWidth: 0.5, borderColor: colors.border },
  formTagChipActive:{ backgroundColor: colors.primaryLight, borderColor: colors.primary },
  formTagChipText:  { fontSize: 12, color: colors.textMid },
  formTagChipTextActive: { color: colors.primary, fontWeight: '500' },

  formExtras:       { flexDirection: 'row', gap: 8 },
  extraBtn:         { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.bgAlt, borderWidth: 0.5, borderColor: colors.border, alignItems: 'center' },
  extraBtnActive:   { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  extraBtnText:     { fontSize: 13, color: colors.textMid },
  extraBtnTextActive: { color: colors.primary, fontWeight: '500' },

  imagePreviewWrap: { position: 'relative' },
  imagePreview:     { width: '100%', height: 140, borderRadius: 10 },
  imageRemoveBtn:   { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  imageRemoveText:  { color: '#fff', fontSize: 12, fontWeight: '600' },

  pollForm:       { gap: 6, backgroundColor: colors.bgAlt, borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: colors.border },
  pollOptionRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pollRemoveBtn:  { padding: 8 },
  pollRemoveText: { color: colors.textMuted, fontSize: 14 },
  addOptionBtn:   { paddingVertical: 8, alignItems: 'center' },
  addOptionText:  { color: colors.primary, fontSize: 13, fontWeight: '500' },

  formActions:           { flexDirection: 'row', gap: 8 },
  formBtn:               { flex: 1, backgroundColor: colors.primary, borderRadius: 12, padding: 12, alignItems: 'center' },
  formBtnDisabled:       { backgroundColor: colors.border },
  formBtnSecondary:      { backgroundColor: colors.bgAlt, borderWidth: 0.5, borderColor: colors.border },
  formBtnText:           { color: '#fff', fontWeight: '500', fontSize: 14 },
  formBtnSecondaryText:  { color: colors.textLight, fontWeight: '500', fontSize: 14 },

  // ── FAB ──
  fab:     { position: 'absolute', bottom: 16, right: 16, left: 16, backgroundColor: colors.primary, borderRadius: 14, padding: 14, alignItems: 'center' },
  fabText: { color: '#fff', fontWeight: '500', fontSize: 15 },
});

import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useState, useMemo } from 'react';
import { useHeaderHeight } from '@react-navigation/elements';
import { useTratsch } from '../context/TratschContext';
import ThreadDetailScreen from './ThreadDetailScreen';
import { relativeTime } from '../utils/time';
import { colors } from '../theme';

export default function TratschScreen() {
  const { threads, answersMap, seenIds, addThread, deleteThread, markSeen } = useTratsch();
  const headerHeight = useHeaderHeight();

  const [selected,   setSelected]   = useState(null);
  const [search,     setSearch]     = useState('');
  const [showForm,   setShowForm]   = useState(false);
  const [titel,      setTitel]      = useState('');
  const [body,       setBody]       = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return threads;
    const q = search.toLowerCase();
    return threads.filter(t =>
      t.titel.toLowerCase().includes(q) || t.text.toLowerCase().includes(q)
    );
  }, [threads, search]);

  function openThread(thread) {
    markSeen(thread.id);
    setSelected(thread);
  }

  function confirmDelete(thread) {
    Alert.alert(
      'Thread löschen?',
      `"${thread.titel}" wirklich entfernen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Löschen', style: 'destructive', onPress: () => deleteThread(thread.id) },
      ]
    );
  }

  function erstellen() {
    if (!titel.trim()) return;
    addThread(titel, body);
    setTitel('');
    setBody('');
    setShowForm(false);
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

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, filtered.length === 0 && styles.listCenter]}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const isUnread    = !seenIds.has(item.id);
          const answerCount = (answersMap[item.id] ?? []).length;
          return (
            <TouchableOpacity
              style={[styles.card, isUnread && styles.cardUnread]}
              onPress={() => openThread(item)}
              onLongPress={() => confirmDelete(item)}
              delayLongPress={600}
              activeOpacity={0.75}
            >
              <View style={styles.cardRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.autor[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.cardTitel} numberOfLines={1}>{item.titel}</Text>
                    {isUnread && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.cardMeta}>{item.autor} · {relativeTime(item.ts)}</Text>
                </View>
              </View>
              {!!item.text && (
                <Text style={styles.cardPreview} numberOfLines={2}>{item.text}</Text>
              )}
              <Text style={styles.replyCount}>
                💬 {answerCount} Antwort{answerCount !== 1 ? 'en' : ''}
              </Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>{search ? '🔍' : '💬'}</Text>
            <Text style={styles.emptyTitle}>
              {search ? 'Nichts gefunden' : 'Noch keine Themen'}
            </Text>
            <Text style={styles.emptySub}>
              {search
                ? `Keine Treffer für "${search}"`
                : 'Erstell das erste Thema für eure Gruppe!'}
            </Text>
          </View>
        }
      />

      {/* New thread form */}
      {showForm && (
        <View style={styles.form}>
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
          <View style={styles.formActions}>
            <TouchableOpacity
              style={[styles.formBtn, styles.formBtnSecondary]}
              onPress={() => { setShowForm(false); setTitel(''); setBody(''); }}
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

  // Search
  searchRow:   { flexDirection: 'row', alignItems: 'center', margin: 12, marginBottom: 4, backgroundColor: colors.bgAlt, borderRadius: 12, borderWidth: 0.5, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  searchIcon:  { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  searchClear: { color: colors.textMuted, fontSize: 13 },

  // List
  list:       { padding: 12, gap: 10, paddingBottom: 90 },
  listCenter: { flex: 1, justifyContent: 'center' },

  // Thread card
  card:        { backgroundColor: colors.bgAlt, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: colors.border, gap: 6 },
  cardUnread:  { borderColor: colors.primaryMid, backgroundColor: '#fffafc' },
  cardRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitel:   { fontSize: 14, fontWeight: '500', color: colors.text, flex: 1 },
  unreadDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, flexShrink: 0 },
  cardMeta:    { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  cardPreview: { fontSize: 13, color: colors.textLight, lineHeight: 19 },
  replyCount:  { fontSize: 12, color: colors.textMuted },

  // Avatar
  avatar:     { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '500', fontSize: 15 },

  // Empty state
  emptyState: { alignItems: 'center', gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '500', color: colors.textMid },
  emptySub:   { fontSize: 13, color: colors.textMuted, textAlign: 'center', maxWidth: 240, lineHeight: 20 },

  // Form
  form:              { padding: 16, borderTopWidth: 0.5, borderTopColor: colors.border, backgroundColor: colors.bg, gap: 8 },
  formInput:         { backgroundColor: colors.bgAlt, borderWidth: 0.5, borderColor: colors.border, borderRadius: 12, padding: 12, fontSize: 14 },
  formTextarea:      { minHeight: 70, textAlignVertical: 'top' },
  formActions:       { flexDirection: 'row', gap: 8 },
  formBtn:           { flex: 1, backgroundColor: colors.primary, borderRadius: 12, padding: 12, alignItems: 'center' },
  formBtnDisabled:   { backgroundColor: colors.border },
  formBtnSecondary:  { backgroundColor: colors.bgAlt, borderWidth: 0.5, borderColor: colors.border },
  formBtnText:       { color: '#fff', fontWeight: '500', fontSize: 14 },
  formBtnSecondaryText: { color: colors.textLight, fontWeight: '500', fontSize: 14 },

  // FAB
  fab:     { position: 'absolute', bottom: 16, right: 16, left: 16, backgroundColor: colors.primary, borderRadius: 14, padding: 14, alignItems: 'center' },
  fabText: { color: '#fff', fontWeight: '500', fontSize: 15 },
});
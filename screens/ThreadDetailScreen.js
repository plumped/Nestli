import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, Keyboard, ScrollView, Image, Alert,
} from 'react-native';
import { useState, useRef, useCallback, useMemo } from 'react';
import { useHeaderHeight } from '@react-navigation/elements';
import * as ImagePicker from 'expo-image-picker';
import { useTratsch } from '../context/TratschContext';
import SwipeableMessage from '../components/SwipeableMessage';
import PollView from '../components/PollView';
import { relativeTime } from '../utils/time';
import { tagById } from '../utils/tags';
import { colors } from '../theme';

export default function ThreadDetailScreen({ thread, onBack }) {
  const {
    threads, answersMap, addAnswer, toggleReaction,
    currentUser, hintShown, markHintShown,
    markSolved, votePoll, members,
  } = useTratsch();
  const headerHeight = useHeaderHeight();

  // Always read live thread state (polls, solved, etc. update in real time)
  const liveThread = useMemo(
    () => threads.find(t => t.id === thread.id) ?? thread,
    [threads, thread]
  );

  const tag     = tagById(liveThread.tag);
  const isOwner = liveThread.autor === currentUser;

  const answers = (answersMap[liveThread.id] ?? []).map(a => ({
    ...a,
    zeit: relativeTime(a.ts),
  }));

  // ── Local state ───────────────────────────────────────────────────────────
  const [text,           setText]           = useState('');
  const [replyingTo,     setReplyingTo]     = useState(null);
  const [scrollEnabled,  setScrollEnabled]  = useState(true);
  const [answerImageUri, setAnswerImageUri] = useState(null);
  const flatListRef = useRef(null);

  // ── @-Mention suggestions ─────────────────────────────────────────────────
  const mentionQuery = useMemo(() => {
    const words = text.split(/\s/);
    const last = words[words.length - 1];
    if (last.startsWith('@') && last.length > 1) return last.slice(1).toLowerCase();
    return null;
  }, [text]);

  const mentionSuggestions = useMemo(() => {
    if (!mentionQuery) return [];
    return members.filter(m =>
      m !== currentUser && m.toLowerCase().startsWith(mentionQuery)
    );
  }, [mentionQuery, members, currentUser]);

  function insertMention(name) {
    const words = text.split(/\s/);
    words[words.length - 1] = `@${name} `;
    setText(words.join(' '));
  }

  // ── Swipe / scroll handlers ───────────────────────────────────────────────
  const handleSwipe = useCallback((item) => {
    setReplyingTo(item);
    if (!hintShown) markHintShown();
  }, [hintShown, markHintShown]);

  const handleScrollLock = useCallback((locked) => setScrollEnabled(!locked), []);

  const handleReact = useCallback((answerId, emoji) => {
    toggleReaction(liveThread.id, answerId, emoji);
  }, [liveThread.id, toggleReaction]);

  const handleVotePoll = useCallback((optionIndex) => {
    votePoll(liveThread.id, optionIndex);
  }, [liveThread.id, votePoll]);

  // ── Image picker for answer ───────────────────────────────────────────────
  async function pickAnswerImage() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Berechtigung benötigt', 'Bitte erlaube den Zugriff auf deine Fotos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
        aspect: [4, 3],
      });
      if (!result.canceled) setAnswerImageUri(result.assets[0].uri);
    } catch {
      Alert.alert('Fehler', 'Foto konnte nicht geladen werden.');
    }
  }

  // ── Send answer ───────────────────────────────────────────────────────────
  function send() {
    if (!text.trim() && !answerImageUri) return;
    addAnswer(liveThread.id, text.trim(), replyingTo, answerImageUri);
    setText('');
    setReplyingTo(null);
    setAnswerImageUri(null);
    Keyboard.dismiss();
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 120);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={headerHeight}
    >
      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.backText}>← Zurück</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={answers}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={scrollEnabled}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListHeaderComponent={
          <View>
            {/* ── Thread header ── */}
            <View style={[
              styles.threadHeader,
              liveThread.solved && styles.threadHeaderSolved,
            ]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{liveThread.autor[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.threadTitelRow}>
                  <Text style={styles.threadTitel}>{liveThread.titel}</Text>
                  {liveThread.solved && <Text style={styles.solvedBadge}>✅</Text>}
                </View>
                <View style={styles.threadMetaRow}>
                  <Text style={styles.threadMeta}>
                    {liveThread.autor} · {relativeTime(liveThread.ts)}
                  </Text>
                  {tag && (
                    <View style={styles.tagPill}>
                      <Text style={styles.tagPillText}>{tag.emoji} {tag.label}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Thread body */}
            {!!liveThread.text && (
              <Text style={styles.threadBody}>{liveThread.text}</Text>
            )}

            {/* Thread image */}
            {!!liveThread.imageUri && (
              <Image
                source={{ uri: liveThread.imageUri }}
                style={styles.threadImage}
                resizeMode="cover"
              />
            )}

            {/* Poll */}
            {liveThread.poll && (
              <PollView
                poll={liveThread.poll}
                onVote={handleVotePoll}
                currentUser={currentUser}
              />
            )}

            {/* Solved button – owner only */}
            {isOwner && (
              <TouchableOpacity
                style={[styles.solvedBtn, liveThread.solved && styles.solvedBtnActive]}
                onPress={() => markSolved(liveThread.id)}
              >
                <Text style={[styles.solvedBtnText, liveThread.solved && styles.solvedBtnTextActive]}>
                  {liveThread.solved ? '↩️ Lösung aufheben' : '✅ Als gelöst markieren'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Swipe hint */}
            {!hintShown && answers.length > 0 && (
              <TouchableOpacity style={styles.hint} onPress={markHintShown}>
                <Text style={styles.hintText}>
                  💡 Nachricht nach rechts wischen zum Antworten · Tippen zum Schliessen
                </Text>
              </TouchableOpacity>
            )}

            <Text style={styles.sectionLabel}>
              {answers.length > 0
                ? `${answers.length} Antwort${answers.length !== 1 ? 'en' : ''}`
                : ''}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyText}>Noch keine Antworten. Sei die Erste!</Text>
          </View>
        }
        renderItem={({ item }) => (
          <SwipeableMessage
            item={item}
            onSwipe={handleSwipe}
            onScrollLock={handleScrollLock}
            onReact={handleReact}
            currentUser={currentUser}
          />
        )}
      />

      {/* ── @-mention suggestion strip ── */}
      {mentionSuggestions.length > 0 && (
        <ScrollView
          horizontal
          keyboardShouldPersistTaps="always"
          style={styles.mentionStrip}
          contentContainerStyle={styles.mentionStripContent}
          showsHorizontalScrollIndicator={false}
        >
          {mentionSuggestions.map(name => (
            <TouchableOpacity
              key={name}
              style={styles.mentionChip}
              onPress={() => insertMention(name)}
            >
              <Text style={styles.mentionChipText}>@{name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Answer image preview ── */}
      {!!answerImageUri && (
        <View style={styles.answerImageWrap}>
          <Image source={{ uri: answerImageUri }} style={styles.answerImagePreview} resizeMode="cover" />
          <TouchableOpacity style={styles.imageRemoveBtn} onPress={() => setAnswerImageUri(null)}>
            <Text style={styles.imageRemoveText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Reply banner ── */}
      {replyingTo && (
        <View style={styles.replyBanner}>
          <View style={styles.replyBannerLine} />
          <View style={{ flex: 1 }}>
            <Text style={styles.replyBannerAutor}>{replyingTo.autor}</Text>
            <Text style={styles.replyBannerText} numberOfLines={1}>{replyingTo.text}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setReplyingTo(null)}
            style={styles.replyClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.replyCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Input bar ── */}
      <View style={styles.inputBar}>
        <TouchableOpacity style={styles.imageBtn} onPress={pickAnswerImage}>
          <Text style={styles.imageBtnText}>📷</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Antworten… @Name zum Erwähnen"
          value={text}
          onChangeText={setText}
          multiline
          maxHeight={100}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            (!text.trim() && !answerImageUri) && styles.sendBtnDisabled,
          ]}
          onPress={send}
          disabled={!text.trim() && !answerImageUri}
        >
          <Text style={styles.sendBtnText}>Senden</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backBtn:  { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  backText: { color: colors.primary, fontSize: 14, fontWeight: '500' },

  list: { padding: 16, paddingBottom: 12, gap: 0 },

  // ── Thread header ──
  threadHeader: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: colors.primaryLight, borderRadius: 14, padding: 14, marginBottom: 8,
  },
  threadHeaderSolved: { backgroundColor: '#edfaed' },
  threadTitelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  threadTitel:    { fontSize: 15, fontWeight: '600', color: colors.text, flex: 1 },
  solvedBadge:    { fontSize: 16 },
  threadMetaRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  threadMeta:     { fontSize: 12, color: colors.textMuted },
  tagPill:        { paddingHorizontal: 8, paddingVertical: 2, backgroundColor: colors.primaryMid, borderRadius: 20 },
  tagPillText:    { fontSize: 11, color: colors.primary, fontWeight: '500' },

  threadBody:  { fontSize: 14, color: colors.textLight, lineHeight: 21, marginBottom: 12, paddingHorizontal: 2 },
  threadImage: { width: '100%', height: 200, borderRadius: 12, marginBottom: 12 },

  // ── Avatar ──
  avatar:     { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryMid, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '500', fontSize: 15 },

  // ── Solved button ──
  solvedBtn: {
    flexDirection: 'row', justifyContent: 'center',
    borderRadius: 10, padding: 10, marginBottom: 12,
    backgroundColor: colors.bgAlt, borderWidth: 0.5, borderColor: colors.border,
  },
  solvedBtnActive:    { backgroundColor: '#edfaed', borderColor: '#7bc47b' },
  solvedBtnText:      { fontSize: 13, color: colors.textMid, fontWeight: '500' },
  solvedBtnTextActive:{ color: '#3a8a3a', fontWeight: '500' },

  // ── Hint ──
  hint:     { backgroundColor: '#FFFBEA', borderRadius: 10, padding: 10, marginBottom: 12 },
  hintText: { fontSize: 12, color: '#9A7D2E', textAlign: 'center', lineHeight: 18 },

  sectionLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 10, marginTop: 4 },

  // ── Empty state ──
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyEmoji: { fontSize: 36 },
  emptyText:  { fontSize: 14, color: colors.textMuted },

  // ── @Mention strip ──
  mentionStrip:        { maxHeight: 40, borderTopWidth: 0.5, borderTopColor: colors.border, backgroundColor: colors.bgAlt },
  mentionStripContent: { paddingHorizontal: 12, paddingVertical: 6, gap: 6, alignItems: 'center' },
  mentionChip:         { paddingHorizontal: 12, paddingVertical: 4, backgroundColor: colors.primaryLight, borderRadius: 16, borderWidth: 0.5, borderColor: colors.primary },
  mentionChipText:     { fontSize: 13, color: colors.primary, fontWeight: '500' },

  // ── Answer image preview ──
  answerImageWrap:    { position: 'relative', marginHorizontal: 12, marginBottom: 4 },
  answerImagePreview: { width: '100%', height: 120, borderRadius: 10 },
  imageRemoveBtn:     { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  imageRemoveText:    { color: '#fff', fontSize: 12, fontWeight: '600' },

  // ── Reply banner ──
  replyBanner:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: colors.border, backgroundColor: colors.bgAlt },
  replyBannerLine:  { width: 3, alignSelf: 'stretch', backgroundColor: colors.primary, borderRadius: 2 },
  replyBannerAutor: { fontSize: 12, fontWeight: '600', color: colors.primary },
  replyBannerText:  { fontSize: 12, color: '#888' },
  replyClose:       { padding: 4 },
  replyCloseText:   { color: colors.textMuted, fontSize: 14 },

  // ── Input bar ──
  inputBar: {
    flexDirection: 'row', padding: 12, gap: 8,
    borderTopWidth: 0.5, borderTopColor: colors.border,
    backgroundColor: colors.bg, alignItems: 'flex-end',
  },
  imageBtn:        { padding: 8, justifyContent: 'center' },
  imageBtnText:    { fontSize: 20 },
  input:           { flex: 1, backgroundColor: colors.bgAlt, borderRadius: 12, borderWidth: 0.5, borderColor: colors.border, padding: 10, fontSize: 14 },
  sendBtn:         { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: colors.border },
  sendBtnText:     { color: '#fff', fontWeight: '500', fontSize: 14 },
});

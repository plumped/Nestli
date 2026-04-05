import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { useState, useRef, useCallback } from 'react';
import { useHeaderHeight } from '@react-navigation/elements';
import { useTratsch } from '../context/TratschContext';
import SwipeableMessage from '../components/SwipeableMessage';
import { relativeTime } from '../utils/time';
import { colors } from '../theme';

export default function ThreadDetailScreen({ thread, onBack }) {
  const { answersMap, addAnswer, toggleReaction, currentUser, hintShown, markHintShown } = useTratsch();
  const headerHeight = useHeaderHeight();

  const answers = (answersMap[thread.id] ?? []).map(a => ({
    ...a,
    zeit: relativeTime(a.ts),
  }));

  const [text,         setText]         = useState('');
  const [replyingTo,   setReplyingTo]   = useState(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const flatListRef = useRef(null);

  const handleSwipe = useCallback((item) => {
    setReplyingTo(item);
    if (!hintShown) markHintShown();
  }, [hintShown, markHintShown]);

  const handleScrollLock = useCallback((locked) => setScrollEnabled(!locked), []);

  const handleReact = useCallback((answerId, emoji) => {
    toggleReaction(thread.id, answerId, emoji);
  }, [thread.id, toggleReaction]);

  function send() {
    if (!text.trim()) return;
    addAnswer(thread.id, text.trim(), replyingTo);
    setText('');
    setReplyingTo(null);
    Keyboard.dismiss();
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 120);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={headerHeight}
    >
      {/* Back button – full-width touch target */}
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
            {/* Thread header */}
            <View style={styles.threadHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{thread.autor[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.threadTitel}>{thread.titel}</Text>
                <Text style={styles.threadMeta}>{thread.autor} · {relativeTime(thread.ts)}</Text>
              </View>
            </View>
            {!!thread.text && (
              <Text style={styles.threadBody}>{thread.text}</Text>
            )}

            {/* Swipe hint – visible until user swipes once */}
            {!hintShown && answers.length > 0 && (
              <TouchableOpacity style={styles.hint} onPress={markHintShown}>
                <Text style={styles.hintText}>💡 Nachricht nach rechts wischen zum Antworten · Tippen zum Schliessen</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.sectionLabel}>
              {answers.length > 0 ? `${answers.length} Antwort${answers.length !== 1 ? 'en' : ''}` : ''}
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

      {/* Reply banner */}
      {replyingTo && (
        <View style={styles.replyBanner}>
          <View style={styles.replyBannerLine} />
          <View style={{ flex: 1 }}>
            <Text style={styles.replyBannerAutor}>{replyingTo.autor}</Text>
            <Text style={styles.replyBannerText} numberOfLines={1}>{replyingTo.text}</Text>
          </View>
          <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.replyClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.replyCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Antworten..."
          value={text}
          onChangeText={setText}
          multiline
          maxHeight={100}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={send}
          disabled={!text.trim()}
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

  threadHeader: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.primaryLight, borderRadius: 14, padding: 14, marginBottom: 8 },
  threadTitel:  { fontSize: 15, fontWeight: '600', color: colors.text },
  threadMeta:   { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  threadBody:   { fontSize: 14, color: colors.textLight, lineHeight: 21, marginBottom: 12, paddingHorizontal: 2 },

  avatar:     { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryMid, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '500', fontSize: 15 },

  hint:     { backgroundColor: '#FFFBEA', borderRadius: 10, padding: 10, marginBottom: 12 },
  hintText: { fontSize: 12, color: '#9A7D2E', textAlign: 'center', lineHeight: 18 },

  sectionLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 10, marginTop: 4 },

  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyEmoji: { fontSize: 36 },
  emptyText:  { fontSize: 14, color: colors.textMuted },

  replyBanner:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: colors.border, backgroundColor: colors.bgAlt },
  replyBannerLine:  { width: 3, alignSelf: 'stretch', backgroundColor: colors.primary, borderRadius: 2 },
  replyBannerAutor: { fontSize: 12, fontWeight: '600', color: colors.primary },
  replyBannerText:  { fontSize: 12, color: '#888' },
  replyClose:       { padding: 4 },
  replyCloseText:   { color: colors.textMuted, fontSize: 14 },

  inputBar: { flexDirection: 'row', padding: 12, gap: 10, borderTopWidth: 0.5, borderTopColor: colors.border, backgroundColor: colors.bg, alignItems: 'flex-end' },
  input:    { flex: 1, backgroundColor: colors.bgAlt, borderRadius: 12, borderWidth: 0.5, borderColor: colors.border, padding: 10, fontSize: 14 },
  sendBtn:         { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: colors.border },
  sendBtnText:     { color: '#fff', fontWeight: '500', fontSize: 14 },
});
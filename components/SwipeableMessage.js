import { View, Text, Animated, PanResponder, TouchableOpacity, StyleSheet } from 'react-native';
import { useRef } from 'react';
import { colors } from '../theme';

const SWIPE_THRESHOLD = 60;
const REACTION_EMOJIS = ['❤️', '👍', '😂'];

export default function SwipeableMessage({ item, onSwipe, onScrollLock, onReact, currentUser }) {
  const translateX  = useRef(new Animated.Value(0)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const triggered   = useRef(false);

  // Refs so the PanResponder (created once) always calls the latest callbacks
  const onSwipeRef      = useRef(onSwipe);
  const onScrollLockRef = useRef(onScrollLock);
  onSwipeRef.current      = onSwipe;
  onScrollLockRef.current = onScrollLock;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) =>
        g.dx > 5 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,

      onPanResponderGrant: () => {
        triggered.current = false;
        onScrollLockRef.current(true);
      },
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) return;
        const clamped = Math.min(g.dx, SWIPE_THRESHOLD + 20);
        translateX.setValue(clamped);
        iconOpacity.setValue(Math.min(clamped / SWIPE_THRESHOLD, 1));
        if (!triggered.current && g.dx >= SWIPE_THRESHOLD) {
          triggered.current = true;
          onSwipeRef.current(item);
        }
      },
      onPanResponderRelease:   () => { onScrollLockRef.current(false); snap(); },
      onPanResponderTerminate: () => { onScrollLockRef.current(false); snap(); },
    })
  ).current;

  function snap() {
    Animated.parallel([
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 6 }),
      Animated.timing(iconOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start();
  }

  const activeReactions = Object.entries(item.reactions ?? {}).filter(([, users]) => users.length > 0);

  return (
    <View style={styles.swipeRow}>
      {/* Reply icon revealed by swipe */}
      <Animated.View style={[styles.replyIcon, { opacity: iconOpacity }]}>
        <Text style={{ fontSize: 18 }}>↩️</Text>
      </Animated.View>

      <Animated.View style={{ flex: 1, transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <View style={styles.antwort}>
          {/* Avatar */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.autor[0]}</Text>
          </View>

          {/* Bubble */}
          <View style={styles.bubble}>
            {/* Header */}
            <View style={styles.bubbleHeader}>
              <Text style={styles.autor}>{item.autor}</Text>
              <Text style={styles.zeit}>{item.zeit}</Text>
            </View>

            {/* Quote block */}
            {item.replyTo && (
              <View style={styles.quoteBlock}>
                <View style={styles.quoteLine} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.quoteAutor}>{item.replyTo.autor}</Text>
                  <Text style={styles.quoteText} numberOfLines={2}>{item.replyTo.text}</Text>
                </View>
              </View>
            )}

            {/* Message */}
            <Text style={styles.messageText}>{item.text}</Text>

            {/* Active reactions */}
            {activeReactions.length > 0 && (
              <View style={styles.reactionsRow}>
                {activeReactions.map(([emoji, users]) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[styles.reactionBubble, users.includes(currentUser) && styles.reactionBubbleActive]}
                    onPress={() => onReact(item.id, emoji)}
                  >
                    <Text style={styles.reactionLabel}>{emoji} {users.length}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Add reaction row */}
            <View style={styles.addReactionRow}>
              {REACTION_EMOJIS.map(emoji => (
                <TouchableOpacity key={emoji} style={styles.addReactionBtn} onPress={() => onReact(item.id, emoji)}>
                  <Text style={styles.addReactionEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  swipeRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  replyIcon: { position: 'absolute', left: 4, zIndex: 0 },

  antwort: { flexDirection: 'row', gap: 10, flex: 1 },
  avatar:  { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  avatarText: { color: colors.primary, fontWeight: '500', fontSize: 15 },

  bubble: { flex: 1, backgroundColor: colors.bgAlt, borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: colors.border },
  bubbleHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  autor: { fontSize: 13, fontWeight: '500', color: '#333' },
  zeit:  { fontSize: 11, color: colors.textMuted },
  messageText: { fontSize: 14, color: colors.textMid, lineHeight: 20 },

  quoteBlock: { flexDirection: 'row', gap: 8, backgroundColor: colors.primaryMid, borderRadius: 8, padding: 8, marginBottom: 8 },
  quoteLine:  { width: 3, backgroundColor: colors.primary, borderRadius: 2 },
  quoteAutor: { fontSize: 12, fontWeight: '600', color: colors.primary, marginBottom: 2 },
  quoteText:  { fontSize: 12, color: colors.textLight, lineHeight: 17 },

  reactionsRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  reactionBubble: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.border, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'transparent' },
  reactionBubbleActive: { backgroundColor: colors.primaryMid, borderColor: colors.primaryMid },
  reactionLabel:  { fontSize: 12, color: colors.textMid },

  addReactionRow: { flexDirection: 'row', gap: 2, marginTop: 6 },
  addReactionBtn:  { paddingHorizontal: 3, paddingVertical: 1 },
  addReactionEmoji: { fontSize: 13, opacity: 0.35 },
});

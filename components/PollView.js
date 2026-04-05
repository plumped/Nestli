import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function PollView({ poll, onVote, currentUser }) {
  if (!poll) return null;

  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.voters.length, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.question}>📊 {poll.question}</Text>
      {poll.options.map((opt, i) => {
        const voted = opt.voters.includes(currentUser);
        const pct   = totalVotes > 0 ? opt.voters.length / totalVotes : 0;
        const pctLabel = totalVotes > 0 ? `${Math.round(pct * 100)}%` : '0%';

        return (
          <TouchableOpacity
            key={i}
            style={[styles.option, voted && styles.optionVoted]}
            onPress={() => onVote(i)}
            activeOpacity={0.75}
          >
            {/* Background fill bar */}
            <View style={[styles.bar, { width: pctLabel }]} />

            <View style={styles.optionContent}>
              <View style={styles.optionLeft}>
                <View style={[styles.radio, voted && styles.radioVoted]}>
                  {voted && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.optionText, voted && styles.optionTextVoted]}>
                  {opt.text}
                </Text>
              </View>
              <Text style={[styles.optionPct, voted && styles.optionPctVoted]}>
                {opt.voters.length} · {pctLabel}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
      <Text style={styles.total}>{totalVotes} Stimme{totalVotes !== 1 ? 'n' : ''} insgesamt</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgAlt,
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    marginBottom: 4,
    borderWidth: 0.5,
    borderColor: colors.border,
    gap: 8,
  },
  question: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  option: {
    borderRadius: 9,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    minHeight: 44,
    position: 'relative',
    justifyContent: 'center',
  },
  optionVoted: {
    borderColor: colors.primary,
  },
  bar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    zIndex: 1,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.borderMid,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioVoted: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  optionText: {
    fontSize: 13,
    color: colors.textMid,
    flex: 1,
  },
  optionTextVoted: {
    color: colors.primary,
    fontWeight: '500',
  },
  optionPct: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 8,
  },
  optionPctVoted: {
    color: colors.primary,
    fontWeight: '500',
  },
  total: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 2,
  },
});

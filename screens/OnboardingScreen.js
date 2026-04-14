import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useTratsch } from '../context/TratschContext';
import { colors } from '../theme';

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'NEST-';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function OnboardingScreen({ navigation }) {
  const [mode,      setMode]      = useState('join'); // 'join' | 'create' | 'created'
  const [code,      setCode]      = useState('');
  const [name,      setName]      = useState('');
  const [newCode,   setNewCode]   = useState('');
  const { updateUserName, updateGroupCode } = useTratsch();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  function beitreten() {
    if (!name.trim() || !code.trim()) return;
    updateUserName(name.trim());
    updateGroupCode(code.trim().toUpperCase());
    navigation.replace('MainTabs');
  }

  function startCreate() {
    const generated = generateCode();
    setNewCode(generated);
    setMode('create');
  }

  function confirmCreate() {
    if (!name.trim()) return;
    updateUserName(name.trim());
    updateGroupCode(newCode);
    navigation.replace('MainTabs');
  }

  // ── Join mode ────────────────────────────────────────────────────────────
  if (mode === 'join') {
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <Text style={styles.logo}>🪺</Text>
        <Text style={styles.title}>Nestli</Text>
        <Text style={styles.subtitle}>Eure Nachbarschafts-Community</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Dein Name</Text>
          <TextInput
            style={styles.input}
            placeholder="z.B. Sarah"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Gruppen-Code</Text>
          <TextInput
            style={styles.input}
            placeholder="z.B. NEST-7K3M"
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
          />

          <TouchableOpacity
            style={[styles.button, (!name || !code) && styles.buttonDisabled]}
            onPress={beitreten}
            disabled={!name || !code}
          >
            <Text style={styles.buttonText}>Beitreten</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>oder</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.createBtn} onPress={startCreate}>
            <Text style={styles.createBtnText}>✨ Neue Gruppe erstellen</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  // ── Create mode ──────────────────────────────────────────────────────────
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Text style={styles.logo}>🪺</Text>
      <Text style={styles.title}>Neue Gruppe</Text>
      <Text style={styles.subtitle}>Teile den Code mit deinen Nachbarinnen</Text>

      <View style={styles.card}>
        {/* Generated code display */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Dein Gruppen-Code</Text>
          <Text style={styles.codeDisplay}>{newCode}</Text>
          <Text style={styles.codeHint}>
            📤 Teile diesen Code mit anderen Müttern — sie können damit beitreten
          </Text>
        </View>

        <Text style={styles.label}>Dein Name</Text>
        <TextInput
          style={styles.input}
          placeholder="z.B. Sarah"
          value={name}
          onChangeText={setName}
          autoFocus
        />

        <TouchableOpacity
          style={[styles.button, !name.trim() && styles.buttonDisabled]}
          onPress={confirmCreate}
          disabled={!name.trim()}
        >
          <Text style={styles.buttonText}>Gruppe erstellen & starten</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.link} onPress={() => setMode('join')}>
          <Text style={styles.linkText}>← Zurück zum Beitreten</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  logo:     { fontSize: 56, marginBottom: 8 },
  title:    { fontSize: 32, fontWeight: '600', color: colors.primary },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 32, textAlign: 'center' },

  card: {
    width: '100%', backgroundColor: colors.bgAlt,
    borderRadius: 20, padding: 24,
    borderWidth: 0.5, borderColor: colors.border,
    gap: 8,
  },
  label: { fontSize: 13, color: '#888', marginTop: 6 },
  input: {
    backgroundColor: colors.bg, borderWidth: 0.5, borderColor: colors.borderMid,
    borderRadius: 12, padding: 13, fontSize: 15,
  },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { backgroundColor: colors.border },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  divider:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: colors.border },
  dividerText: { fontSize: 12, color: colors.textMuted },

  createBtn:     { borderWidth: 1.5, borderColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  createBtnText: { color: colors.primary, fontSize: 15, fontWeight: '600' },

  codeCard:    { backgroundColor: colors.primaryLight, borderRadius: 14, padding: 16, alignItems: 'center', gap: 6, borderWidth: 0.5, borderColor: colors.primaryMid },
  codeLabel:   { fontSize: 12, color: colors.primary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  codeDisplay: { fontSize: 32, fontWeight: '800', color: colors.primary, letterSpacing: 3 },
  codeHint:    { fontSize: 12, color: colors.primary, textAlign: 'center', lineHeight: 18, opacity: 0.8 },

  link:     { alignItems: 'center', marginTop: 6 },
  linkText: { color: colors.textMuted, fontSize: 13 },
});
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useTratsch } from '../context/TratschContext';
import { colors } from '../theme';

export default function OnboardingScreen({ navigation }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const { updateUserName } = useTratsch();

  function beitreten() {
    if (!name.trim() || !code.trim()) return;
    updateUserName(name.trim());
    navigation.replace('MainTabs');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🪺</Text>
      <Text style={styles.title}>Nestli</Text>
      <Text style={styles.subtitle}>Nur für euch Mütter</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Dein Name</Text>
        <TextInput
          style={styles.input}
          placeholder="z.B. Sarah"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Klassen-Code</Text>
        <TextInput
          style={styles.input}
          placeholder="z.B. BERN-4A"
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

        <TouchableOpacity style={styles.link}>
          <Text style={styles.linkText}>Neue Gruppe erstellen →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logo:      { fontSize: 52, marginBottom: 8 },
  title:     { fontSize: 32, fontWeight: '500', color: colors.primary },
  subtitle:  { fontSize: 14, color: colors.textMuted, marginBottom: 32 },
  card:      { width: '100%', backgroundColor: colors.bgAlt, borderRadius: 16, padding: 24, borderWidth: 0.5, borderColor: colors.border },
  label:     { fontSize: 13, color: '#888', marginBottom: 6, marginTop: 12 },
  input:     { backgroundColor: colors.bg, borderWidth: 0.5, borderColor: colors.borderMid, borderRadius: 10, padding: 12, fontSize: 15 },
  button:    { backgroundColor: colors.primary, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 20 },
  buttonDisabled: { backgroundColor: colors.border },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  link:      { alignItems: 'center', marginTop: 14 },
  linkText:  { color: colors.primary, fontSize: 13 },
});

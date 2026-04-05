import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🤝</Text>
      <Text style={styles.title}>Hallo bei Nestli!</Text>
      <Text style={styles.sub}>Hier kommen bald deine Playdates, Notfälle und mehr.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '500', color: '#993556', marginBottom: 8 },
  sub: { fontSize: 14, color: '#aaa', textAlign: 'center', lineHeight: 22 },
});
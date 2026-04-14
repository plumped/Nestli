import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  ScrollView, Alert, Share, Modal, Image, KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useTratsch } from '../context/TratschContext';
import { colors } from '../theme';

const AVATAR_EMOJIS = [
  '🌸','🌺','🌻','🌹','🌷','🌼','🍀','🌿',
  '🦋','🐝','🐞','🌙','⭐','🌈','☀️','🍓',
  '🎀','💎','🧁','🎈','🪷','🪻','🫶','💜',
];

// ─── Mitglieder Tab ───────────────────────────────────────────────────────────
function MitgliederTab({ members, kinderMap, currentUser, profileEmoji }) {
  return (
    <ScrollView contentContainerStyle={mt.scroll} showsVerticalScrollIndicator={false}>
      <Text style={mt.hint}>
        {members.length} Mitglieder in eurer Gruppe
      </Text>
      {members.map(name => {
        const kinder = kinderMap[name] ?? [];
        const isMe = name === currentUser;
        return (
          <View key={name} style={[mt.card, isMe && mt.cardMe]}>
            <View style={mt.avatarWrap}>
              <Text style={mt.avatarEmoji}>{isMe ? profileEmoji : name[0]}</Text>
            </View>
            <View style={mt.info}>
              <View style={mt.nameRow}>
                <Text style={mt.name}>{name}</Text>
                {isMe && <View style={mt.meBadge}><Text style={mt.meBadgeText}>Du</Text></View>}
              </View>
              {kinder.length > 0 ? (
                <View style={mt.kinderRow}>
                  {kinder.map((k, i) => (
                    <View key={i} style={mt.kinderChip}>
                      <Text style={mt.kinderChipText}>👶 {k.name}, {k.alter}J</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={mt.noKinder}>Keine Kinder eingetragen</Text>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}
const mt = StyleSheet.create({
  scroll:      { padding: 16, gap: 10, paddingBottom: 40 },
  hint:        { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginBottom: 4 },
  card:        { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.bgAlt, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: colors.border },
  cardMe:      { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  avatarWrap:  { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.primaryMid },
  avatarEmoji: { fontSize: 22 },
  info:        { flex: 1, gap: 6 },
  nameRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name:        { fontSize: 15, fontWeight: '600', color: colors.text },
  meBadge:     { paddingHorizontal: 7, paddingVertical: 2, backgroundColor: colors.primary, borderRadius: 8 },
  meBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  kinderRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  kinderChip:  { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#fff', borderRadius: 16, borderWidth: 0.5, borderColor: colors.borderMid },
  kinderChipText: { fontSize: 12, color: colors.textMid },
  noKinder:    { fontSize: 12, color: colors.textMuted },
});

// ─── Profil Tab ───────────────────────────────────────────────────────────────
function ProfilTab({ navigation }) {
  const {
    currentUser, updateUserName,
    kinderMap, updateKinder,
    groupCode, updateGroupCode,
    profileEmoji, updateProfileEmoji,
    profilePhoto, updateProfilePhoto,
  } = useTratsch();

  const myKinder = kinderMap[currentUser] ?? [];

  const [editingName,  setEditingName]  = useState(false);
  const [nameInput,    setNameInput]    = useState(currentUser);
  const [showEmojis,      setShowEmojis]      = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showAddKind,  setShowAddKind]  = useState(false);
  const [kindName,     setKindName]     = useState('');
  const [kindAlter,    setKindAlter]    = useState('');
  const [kindFoto,     setKindFoto]     = useState(null);

  function saveName() {
    if (!nameInput.trim()) return;
    updateUserName(nameInput.trim());
    setEditingName(false);
  }

  function addKind() {
    Keyboard.dismiss();
    if (!kindName.trim() || !kindAlter.trim()) return;
    const alter = parseInt(kindAlter, 10);
    if (isNaN(alter) || alter < 0 || alter > 18) return;
    updateKinder([...myKinder, { name: kindName.trim(), alter, foto: kindFoto ?? null }]);
    setKindName(''); setKindAlter(''); setKindFoto(null);
    setShowAddKind(false);
  }

  function removeKind(i) {
    Alert.alert('Kind entfernen?', 'Diesen Eintrag löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Entfernen', style: 'destructive', onPress: () => {
        updateKinder(myKinder.filter((_, j) => j !== i));
      }},
    ]);
  }

  async function shareCode() {
    try {
      await Share.share({
        message: `Tritt unserer Nestli-Gruppe bei! Code: ${groupCode}\n\nLad die Nestli-App herunter und gib diesen Code beim Beitreten ein. 🪺`,
      });
    } catch {}
  }

  function generateNewCode() {
    Alert.alert('Neuen Code generieren?', 'Der alte Code funktioniert dann nicht mehr.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Neuen generieren', style: 'destructive', onPress: () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = 'NEST-';
        for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
        updateGroupCode(code);
      }},
    ]);
  }

  async function pickPhoto() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Berechtigung benötigt', 'Bitte erlaube den Zugriff auf deine Fotos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled) updateProfilePhoto(result.assets[0].uri);
    } catch {
      Alert.alert('Fehler', 'Foto konnte nicht geladen werden.');
    }
  }

  async function pickKindFoto() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Berechtigung benötigt', 'Bitte erlaube den Zugriff auf deine Fotos.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, aspect: [1, 1], quality: 0.6,
      });
      if (!result.canceled) setKindFoto(result.assets[0].uri);
    } catch { Alert.alert('Fehler', 'Foto konnte nicht geladen werden.'); }
  }

  function removePhoto() {
    Alert.alert('Foto entfernen?', '', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Entfernen', style: 'destructive', onPress: () => updateProfilePhoto(null) },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={pt.scroll} showsVerticalScrollIndicator={false}>

      {/* Avatar */}
      <View style={pt.avatarSection}>
        <View style={pt.avatarWrap}>
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={pt.avatarPhoto} />
          ) : (
            <View style={pt.avatar}>
              <Text style={pt.avatarEmoji}>{profileEmoji}</Text>
            </View>
          )}
          {/* Edit badge – opens choice sheet */}
          <TouchableOpacity style={pt.avatarEditBadge} onPress={() => setShowAvatarPicker(true)}>
            <Text style={pt.avatarEditText}>📷</Text>
          </TouchableOpacity>
        </View>
        <Text style={pt.avatarHint}>Tippen zum Bearbeiten</Text>
      </View>

      {/* Avatar choice sheet */}
      <Modal visible={showAvatarPicker} transparent animationType="slide">
        <View style={pt.sheetOverlay}>
          <View style={pt.sheet}>
            <Text style={pt.sheetTitle}>Profilbild</Text>
            <TouchableOpacity style={pt.sheetBtn} onPress={() => { setShowAvatarPicker(false); setTimeout(pickPhoto, 300); }}>
              <Text style={pt.sheetBtnEmoji}>📷</Text>
              <Text style={pt.sheetBtnText}>Foto aus Bibliothek</Text>
            </TouchableOpacity>
            <TouchableOpacity style={pt.sheetBtn} onPress={() => { setShowAvatarPicker(false); setShowEmojis(true); }}>
              <Text style={pt.sheetBtnEmoji}>🌸</Text>
              <Text style={pt.sheetBtnText}>Emoji wählen</Text>
            </TouchableOpacity>
            {!!profilePhoto && (
              <TouchableOpacity style={[pt.sheetBtn, pt.sheetBtnDanger]} onPress={() => { setShowAvatarPicker(false); removePhoto(); }}>
                <Text style={pt.sheetBtnEmoji}>🗑️</Text>
                <Text style={[pt.sheetBtnText, { color: '#E53935' }]}>Foto entfernen</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={pt.sheetCancel} onPress={() => setShowAvatarPicker(false)}>
              <Text style={pt.sheetCancelText}>Abbrechen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Emoji Picker Modal */}
      <Modal visible={showEmojis} animationType="slide" transparent>
        <View style={pt.emojiOverlay}>
          <View style={pt.emojiSheet}>
            <Text style={pt.emojiTitle}>Dein Avatar</Text>
            <View style={pt.emojiGrid}>
              {AVATAR_EMOJIS.map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  style={[pt.emojiBtn, profileEmoji === emoji && pt.emojiBtnActive]}
                  onPress={() => { updateProfileEmoji(emoji); setShowEmojis(false); }}
                >
                  <Text style={pt.emojiItem}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={pt.emojiClose} onPress={() => setShowEmojis(false)}>
              <Text style={pt.emojiCloseText}>Schliessen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Name */}
      <View style={pt.section}>
        <Text style={pt.sectionLabel}>Dein Name</Text>
        {editingName ? (
          <View style={pt.editRow}>
            <TextInput
              style={[pt.input, { flex: 1 }]}
              value={nameInput}
              onChangeText={setNameInput}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={saveName}
            />
            <TouchableOpacity style={pt.saveBtn} onPress={saveName}>
              <Text style={pt.saveBtnText}>Speichern</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={pt.nameRow} onPress={() => { setNameInput(currentUser); setEditingName(true); }}>
            <Text style={pt.nameText}>{currentUser}</Text>
            <Text style={pt.editIcon}>✏️</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Kinder */}
      <View style={pt.section}>
        <View style={pt.sectionHeader}>
          <Text style={pt.sectionLabel}>Meine Kinder</Text>
          <TouchableOpacity onPress={() => setShowAddKind(true)}>
            <Text style={pt.addLink}>+ Hinzufügen</Text>
          </TouchableOpacity>
        </View>

        {myKinder.length === 0 ? (
          <TouchableOpacity style={pt.emptyKinder} onPress={() => setShowAddKind(true)}>
            <Text style={pt.emptyKinderText}>👶 Kind hinzufügen</Text>
          </TouchableOpacity>
        ) : (
          <View style={pt.kinderList}>
            {myKinder.map((k, i) => (
              <View key={i} style={pt.kindCard}>
                {k.foto ? (
                  <Image source={{ uri: k.foto }} style={pt.kindAvatarPhoto} />
                ) : (
                  <View style={pt.kindAvatar}><Text style={pt.kindAvatarText}>👶</Text></View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={pt.kindName}>{k.name}</Text>
                  <Text style={pt.kindAlter}>{k.alter} Jahre</Text>
                </View>
                <TouchableOpacity onPress={() => removeKind(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={pt.removeKind}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Add Kind Modal */}
        {/* Add Kind Modal */}
        <Modal visible={showAddKind} transparent animationType="slide">
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <TouchableOpacity style={pt.kindOverlay} activeOpacity={1} onPress={Keyboard.dismiss}>
              <View style={pt.kindSheet}>
                <View style={pt.kindHandle} />
                <Text style={pt.kindSheetTitle}>Kind hinzufügen</Text>

                {/* Foto */}
                <TouchableOpacity style={pt.kindFotoBtn} onPress={pickKindFoto} activeOpacity={0.8}>
                  {kindFoto ? (
                    <>
                      <Image source={{ uri: kindFoto }} style={pt.kindFotoImg} />
                      <TouchableOpacity style={pt.kindFotoRemove} onPress={() => setKindFoto(null)}>
                        <Text style={pt.kindFotoRemoveTxt}>✕</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Text style={pt.kindFotoIcon}>📷</Text>
                      <Text style={pt.kindFotoLabel}>Foto (optional)</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TextInput
                  style={pt.input}
                  placeholder="Vorname des Kindes"
                  value={kindName}
                  onChangeText={setKindName}
                  autoFocus
                  returnKeyType="next"
                />
                <TextInput
                  style={pt.input}
                  placeholder="Alter (z.B. 5)"
                  value={kindAlter}
                  onChangeText={v => setKindAlter(v.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  onSubmitEditing={addKind}
                />

                <View style={pt.kindBtns}>
                  <TouchableOpacity
                    style={pt.kindBtnCancel}
                    onPress={() => { Keyboard.dismiss(); setShowAddKind(false); setKindName(''); setKindAlter(''); setKindFoto(null); }}
                  >
                    <Text style={pt.kindBtnCancelText}>Abbrechen</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[pt.kindBtnOk, (!kindName.trim() || !kindAlter.trim()) && pt.kindBtnDisabled]}
                    onPress={addKind}
                  >
                    <Text style={pt.kindBtnOkText}>Hinzufügen</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>
      </View>

      {/* Gruppe */}
      <View style={pt.section}>
        <Text style={pt.sectionLabel}>Eure Gruppe</Text>
        <View style={pt.groupCard}>
          <View style={pt.groupCodeRow}>
            <View>
              <Text style={pt.groupCodeLabel}>Gruppen-Code</Text>
              <Text style={pt.groupCode}>{groupCode}</Text>
            </View>
            <View style={pt.groupBtns}>
              <TouchableOpacity style={pt.shareBtn} onPress={shareCode}>
                <Text style={pt.shareBtnText}>📤 Teilen</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={pt.groupHint}>
            Teile diesen Code mit anderen Müttern damit sie der Gruppe beitreten können.
          </Text>
          <TouchableOpacity onPress={generateNewCode}>
            <Text style={pt.regenerateLink}>Neuen Code generieren →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Leave / Danger Zone */}
      <TouchableOpacity style={pt.leaveBtn} onPress={() => Alert.alert('Gruppe verlassen?', 'Du verlässt die Gruppe. Deine Daten werden lokal gelöscht.', [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Verlassen', style: 'destructive' },
      ])}>
        <Text style={pt.leaveBtnText}>Gruppe verlassen</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const pt = StyleSheet.create({
  scroll: { padding: 16, gap: 20 },

  avatarSection: { alignItems: 'center', paddingTop: 8, gap: 6 },
  avatar:        { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.primaryMid },
  avatarEmoji:   { fontSize: 40 },
  avatarEditBadge: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarEditText:  { fontSize: 12 },
  avatarHint:    { fontSize: 12, color: colors.textMuted },

  emojiOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  emojiSheet:    { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  emojiTitle:    { fontSize: 16, fontWeight: '600', color: colors.text, textAlign: 'center', marginBottom: 16 },
  emojiGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  emojiBtn:      { width: 52, height: 52, borderRadius: 14, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  emojiBtnActive:{ borderColor: colors.primary, backgroundColor: colors.primaryLight },
  emojiItem:     { fontSize: 28 },
  emojiClose:    { marginTop: 16, padding: 14, backgroundColor: colors.bgAlt, borderRadius: 12, alignItems: 'center' },
  emojiCloseText:{ fontSize: 14, color: colors.textMid, fontWeight: '500' },

  section:       { gap: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel:  { fontSize: 13, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  addLink:       { fontSize: 13, color: colors.primary, fontWeight: '500' },

  nameRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bgAlt, borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: colors.border },
  nameText: { fontSize: 16, fontWeight: '500', color: colors.text },
  editIcon: { fontSize: 16 },
  editRow:  { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input:    { backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 13, fontSize: 15 },
  saveBtn:  { paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.primary, borderRadius: 12 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  emptyKinder: { borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', borderRadius: 12, padding: 16, alignItems: 'center' },
  emptyKinderText: { fontSize: 14, color: colors.textMuted },
  kinderList:  { gap: 8 },
  kindCard:    { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.bgAlt, borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: colors.border },
  kindAvatar:  { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  kindAvatarText: { fontSize: 18 },
  kindName:    { fontSize: 14, fontWeight: '500', color: colors.text },
  kindAlter:   { fontSize: 12, color: colors.textMuted },
  removeKind:  { fontSize: 14, color: colors.textMuted, padding: 4 },

  avatarWrap:       { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  avatarPhoto:      { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: colors.primaryMid },
  avatar:           { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.primaryMid },

  sheetOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:           { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40, gap: 8 },
  sheetTitle:      { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 8 },
  sheetBtn:        { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 8, borderRadius: 14, backgroundColor: colors.bgAlt },
  sheetBtnDanger:  { backgroundColor: '#FFF0F0' },
  sheetBtnEmoji:   { fontSize: 22, width: 32, textAlign: 'center' },
  sheetBtnText:    { fontSize: 16, color: colors.text, fontWeight: '500' },
  sheetCancel:     { marginTop: 4, paddingVertical: 14, alignItems: 'center', backgroundColor: colors.bgAlt, borderRadius: 14 },
  sheetCancelText: { fontSize: 16, color: colors.textMuted, fontWeight: '500' },

  kindOverlay:    { flex: 1, justifyContent: 'flex-end' },
  kindSheet:      { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36, gap: 12 },
  kindSheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  kindHandle:      { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 4 },
  kindSheetSub:    { fontSize: 13, color: colors.textMuted, marginTop: -6 },
  kindFotoBtn:     { alignSelf: 'center', width: 80, height: 80, borderRadius: 40, backgroundColor: colors.bgAlt, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  kindFotoImg:     { width: 80, height: 80, borderRadius: 40 },
  kindFotoRemove:  { position: 'absolute', top: -2, right: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' },
  kindFotoRemoveTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },
  kindFotoIcon:    { fontSize: 24 },
  kindFotoLabel:   { fontSize: 11, color: colors.textMuted, marginTop: 3 },
  kindAvatarPhoto: { width: 42, height: 42, borderRadius: 21, flexShrink: 0 },
  kindBtns:       { flexDirection: 'row', gap: 10, marginTop: 4 },
  kindBtnCancel:       { flex: 1, padding: 13, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  kindBtnOk:           { flex: 1, padding: 13, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' },
  kindBtnDisabled:     { backgroundColor: colors.border },
  kindBtnCancelText:   { color: colors.textMid, fontWeight: '500' },
  kindBtnOkText:       { color: '#fff', fontWeight: '600' },

  groupCard:      { backgroundColor: colors.primaryLight, borderRadius: 14, padding: 16, gap: 10, borderWidth: 0.5, borderColor: colors.primaryMid },
  groupCodeRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  groupCodeLabel: { fontSize: 11, color: colors.primary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  groupCode:      { fontSize: 28, fontWeight: '800', color: colors.primary, letterSpacing: 2, marginTop: 2 },
  groupBtns:      { gap: 8 },
  shareBtn:       { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.primary, borderRadius: 10 },
  shareBtnText:   { color: '#fff', fontWeight: '600', fontSize: 13 },
  groupHint:      { fontSize: 12, color: colors.primary, lineHeight: 18, opacity: 0.8 },
  regenerateLink: { fontSize: 12, color: colors.primary, fontWeight: '500' },

  leaveBtn:      { borderWidth: 1, borderColor: '#E53935', borderRadius: 12, padding: 14, alignItems: 'center', backgroundColor: '#fff' },
  leaveBtnText:  { color: '#E53935', fontWeight: '500', fontSize: 14 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProfilScreen({ navigation }) {
  const { members, kinderMap, currentUser, profileEmoji } = useTratsch();
  const [tab, setTab] = useState('profil');

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backBtn}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 32 }}
        >
          <Text style={s.backText}>← Zurück</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Profil & Gruppe</Text>
        <View style={{ width: 70 }} />
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        <TouchableOpacity
          style={[s.tab, tab === 'profil' && s.tabActive]}
          onPress={() => setTab('profil')}
        >
          <Text style={[s.tabText, tab === 'profil' && s.tabTextActive]}>👤 Mein Profil</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, tab === 'mitglieder' && s.tabActive]}
          onPress={() => setTab('mitglieder')}
        >
          <Text style={[s.tabText, tab === 'mitglieder' && s.tabTextActive]}>👥 Mitglieder</Text>
        </TouchableOpacity>
      </View>

      {tab === 'profil' ? (
        <ProfilTab navigation={navigation} />
      ) : (
        <MitgliederTab
          members={members}
          kinderMap={kinderMap}
          currentUser={currentUser}
          profileEmoji={profileEmoji}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 0.5, borderColor: colors.border },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  backBtn:     { paddingVertical: 8, paddingHorizontal: 4, minWidth: 70 },
  backText:    { color: colors.primary, fontSize: 15, fontWeight: '500' },
  tabs:        { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: colors.border },
  tab:         { flex: 1, paddingVertical: 13, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:   { borderBottomColor: colors.primary },
  tabText:     { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
  tabTextActive: { color: colors.primary },
});
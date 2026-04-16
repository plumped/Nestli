import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  TextInput, ScrollView, Modal, Platform, Alert,
} from 'react-native';
import { useState, useMemo } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTratsch } from '../context/TratschContext';
import { colors } from '../theme';

// ─── Constants ────────────────────────────────────────────────────────────────
const KATEGORIEN = [
  { id: 'spielnachmittag', label: 'Spielnachmittag', emoji: '🛝' },
  { id: 'grillabend',      label: 'Grillabend',      emoji: '🔥' },
  { id: 'geburtstag',      label: 'Geburtstag',      emoji: '🎂' },
  { id: 'ferien',          label: 'Ferien',           emoji: '🏖️' },
  { id: 'sonstiges',       label: 'Sonstiges',        emoji: '📅' },
];

function katById(id) { return KATEGORIEN.find(k => k.id === id) ?? KATEGORIEN[4]; }

const KAT_BG = {
  spielnachmittag: '#E8F5E9',
  grillabend:      '#FFF3E0',
  geburtstag:      '#FCE4EC',
  ferien:          '#E3F2FD',
  sonstiges:       '#F3E5F5',
};
const KAT_TEXT = {
  spielnachmittag: '#2E7D32',
  grillabend:      '#E65100',
  geburtstag:      '#C62828',
  ferien:          '#1565C0',
  sonstiges:       '#6A1B9A',
};

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS   = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatEventDate(isoString) {
  const d   = new Date(isoString);
  const now = new Date();
  const days    = ['So','Mo','Di','Mi','Do','Fr','Sa'];
  const months  = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  if (d.toDateString() === now.toDateString())       return 'Heute';
  if (d.toDateString() === tomorrow.toDateString())  return 'Morgen';
  return `${days[d.getDay()]}, ${d.getDate()}. ${months[d.getMonth()]}`;
}

function formatFullDate(isoString) {
  const d   = new Date(isoString);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`;
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth()    === d2.getMonth()    &&
         d1.getDate()     === d2.getDate();
}

// ─── DatePicker Modal ─────────────────────────────────────────────────────────
function DatePickerModal({ visible, initial, ganztag, onConfirm, onCancel }) {
  const [value, setValue] = useState(initial ?? new Date());
  const [step,  setStep]  = useState('date');

  function handleChange(_, selected) {
    if (!selected) return;
    setValue(selected);
    if (Platform.OS === 'android' && step === 'date' && !ganztag) setStep('time');
  }
  function confirm() { onConfirm(value); setStep('date'); }
  function cancel()  { onCancel(); setStep('date'); setValue(initial ?? new Date()); }

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View style={dp.overlay}>
        <View style={dp.card}>
          <DateTimePicker
            value={value}
            mode={!ganztag && step === 'time' ? 'time' : 'date'}
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={handleChange}
            minimumDate={new Date()}
            locale="de-DE"
          />
          <View style={dp.btns}>
            <TouchableOpacity style={dp.btnCancel} onPress={cancel}>
              <Text style={dp.btnCancelText}>Abbrechen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={dp.btnOk} onPress={confirm}>
              <Text style={dp.btnOkText}>
                {Platform.OS === 'android' && step === 'date' && !ganztag ? 'Weiter →' : 'Übernehmen'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
const dp = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  card:          { backgroundColor: '#fff', borderRadius: 18, padding: 16, margin: 20, width: '90%' },
  btns:          { flexDirection: 'row', gap: 10, marginTop: 12 },
  btnCancel:     { flex: 1, padding: 12, borderRadius: 10, borderWidth: 0.5, borderColor: colors.border, alignItems: 'center' },
  btnOk:         { flex: 1, padding: 12, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' },
  btnCancelText: { color: colors.textMid },
  btnOkText:     { color: '#fff', fontWeight: '600' },
});

// ─── Event Form Modal (Add + Edit) ────────────────────────────────────────────
function EventFormModal({ visible, initialValues, onSubmit, onClose }) {
  const isEdit = !!initialValues;

  const [titel,         setTitel]         = useState('');
  const [beschreibung,  setBeschreibung]  = useState('');
  const [ort,           setOrt]           = useState('');
  const [kategorie,     setKategorie]     = useState('spielnachmittag');
  const [datum,         setDatum]         = useState(null);
  const [ganztag,       setGanztag]       = useState(false);
  const [maxTeilnehmer, setMaxTeilnehmer] = useState('');
  const [showDTP,       setShowDTP]       = useState(false);

  // Populate fields when editing
  useMemo(() => {
    if (!visible) return;
    if (initialValues) {
      setTitel(initialValues.titel ?? '');
      setBeschreibung(initialValues.beschreibung ?? '');
      setOrt(initialValues.ort ?? '');
      setKategorie(initialValues.kategorie ?? 'spielnachmittag');
      setDatum(initialValues.datum ? new Date(initialValues.datum) : null);
      setGanztag(initialValues.ganztag ?? false);
      setMaxTeilnehmer(initialValues.maxTeilnehmer ? String(initialValues.maxTeilnehmer) : '');
    } else {
      setTitel(''); setBeschreibung(''); setOrt('');
      setKategorie('spielnachmittag'); setDatum(null);
      setGanztag(false); setMaxTeilnehmer('');
    }
  }, [visible]);

  function close() { onClose(); }

  function submit() {
    if (!titel.trim() || !datum) return;
    const pad = n => String(n).padStart(2, '0');
    onSubmit({
      ...(isEdit ? { id: initialValues.id } : {}),
      titel:        titel.trim(),
      beschreibung: beschreibung.trim(),
      ort:          ort.trim(),
      kategorie,
      datum:        datum.toISOString(),
      ganztag,
      uhrzeit:      ganztag ? null : `${pad(datum.getHours())}:${pad(datum.getMinutes())}`,
      maxTeilnehmer: maxTeilnehmer ? parseInt(maxTeilnehmer, 10) : null,
    });
    close();
  }

  const datumLabel = datum
    ? ganztag
      ? formatFullDate(datum.toISOString())
      : `${formatFullDate(datum.toISOString())} · ${String(datum.getHours()).padStart(2,'0')}:${String(datum.getMinutes()).padStart(2,'0')} Uhr`
    : 'Datum & Uhrzeit wählen';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={af.container}>
        {/* Header */}
        <View style={af.header}>
          <TouchableOpacity onPress={close} style={af.closeBtn}>
            <Text style={af.closeTxt}>✕</Text>
          </TouchableOpacity>
          <Text style={af.headerTitle}>{isEdit ? 'Termin bearbeiten' : 'Neuer Termin'}</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={af.scroll}>
          {/* Kategorie */}
          <Text style={af.label}>Kategorie</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={af.katRow}>
            {KATEGORIEN.map(k => (
              <TouchableOpacity
                key={k.id}
                style={[af.katChip, kategorie === k.id && af.katChipActive]}
                onPress={() => setKategorie(k.id)}
              >
                <Text style={af.katEmoji}>{k.emoji}</Text>
                <Text style={[af.katText, kategorie === k.id && af.katTextActive]}>{k.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Titel */}
          <Text style={af.label}>Titel *</Text>
          <TextInput
            style={af.input}
            placeholder="z.B. Grillabend im Innenhof"
            value={titel}
            onChangeText={setTitel}
            autoFocus={!isEdit}
          />

          {/* Datum + Ganztags-Toggle */}
          <View style={af.rowBetween}>
            <Text style={af.label}>Datum *</Text>
            <TouchableOpacity
              style={[af.ganztagToggle, ganztag && af.ganztagToggleActive]}
              onPress={() => setGanztag(v => !v)}
            >
              <Text style={[af.ganztagText, ganztag && af.ganztagTextActive]}>☀️ Ganztägig</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[af.datePicker, datum && af.datePickerFilled]}
            onPress={() => setShowDTP(true)}
          >
            <Text style={{ fontSize: 18 }}>🗓️</Text>
            <Text style={[af.dateText, datum && af.dateTextFilled]}>{datumLabel}</Text>
            {datum && (
              <TouchableOpacity onPress={() => setDatum(null)}>
                <Text style={af.clearBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {/* Ort */}
          <Text style={af.label}>Ort <Text style={af.labelOpt}>(optional)</Text></Text>
          <TextInput
            style={af.input}
            placeholder="z.B. Innenhof Block B"
            value={ort}
            onChangeText={setOrt}
          />

          {/* Max. Teilnehmer */}
          <Text style={af.label}>Max. Teilnehmer <Text style={af.labelOpt}>(optional)</Text></Text>
          <View style={af.maxRow}>
            <TextInput
              style={[af.input, { flex: 1 }]}
              placeholder="z.B. 12"
              value={maxTeilnehmer}
              onChangeText={t => setMaxTeilnehmer(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
            />
            {!!maxTeilnehmer && (
              <Text style={af.maxHint}>Plätze insgesamt</Text>
            )}
          </View>

          {/* Beschreibung */}
          <Text style={af.label}>Beschreibung <Text style={af.labelOpt}>(optional)</Text></Text>
          <TextInput
            style={[af.input, af.textarea]}
            placeholder="Details zum Termin..."
            value={beschreibung}
            onChangeText={setBeschreibung}
            multiline
          />
        </ScrollView>

        <View style={af.footer}>
          <TouchableOpacity
            style={[af.submitBtn, (!titel.trim() || !datum) && af.submitBtnDisabled]}
            onPress={submit}
            disabled={!titel.trim() || !datum}
          >
            <Text style={af.submitText}>
              {isEdit ? '✓  Änderungen speichern' : '📅  Termin erstellen'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <DatePickerModal
        visible={showDTP}
        initial={datum ?? new Date()}
        ganztag={ganztag}
        onConfirm={d => { setDatum(d); setShowDTP(false); }}
        onCancel={() => setShowDTP(false)}
      />
    </Modal>
  );
}

const af = StyleSheet.create({
  container:          { flex: 1, backgroundColor: colors.bg },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 0.5, borderColor: colors.border },
  headerTitle:        { fontSize: 16, fontWeight: '600', color: colors.text },
  closeBtn:           { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' },
  closeTxt:           { fontSize: 14, color: colors.textMid },
  scroll:             { padding: 20, gap: 12, paddingBottom: 30 },
  label:              { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  labelOpt:           { fontWeight: '400', color: colors.border },
  rowBetween:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  maxRow:             { flexDirection: 'row', alignItems: 'center', gap: 10 },
  maxHint:            { fontSize: 13, color: colors.textMuted },
  input:              { backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 13, fontSize: 15 },
  textarea:           { minHeight: 72, textAlignVertical: 'top' },
  katRow:             { gap: 8, paddingVertical: 4 },
  katChip:            { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.bgAlt, gap: 3 },
  katChipActive:      { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  katEmoji:           { fontSize: 22 },
  katText:            { fontSize: 11, color: colors.textMid, fontWeight: '500' },
  katTextActive:      { color: colors.primary },
  datePicker:         { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 13 },
  datePickerFilled:   { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  dateText:           { flex: 1, fontSize: 15, color: colors.textMuted },
  dateTextFilled:     { color: colors.primary, fontWeight: '500' },
  clearBtn:           { color: colors.textMuted, fontSize: 14, padding: 2 },
  ganztagToggle:      { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgAlt },
  ganztagToggleActive:{ borderColor: colors.primary, backgroundColor: colors.primaryLight },
  ganztagText:        { fontSize: 12, color: colors.textMid, fontWeight: '500' },
  ganztagTextActive:  { color: colors.primary },
  footer:             { padding: 16, borderTopWidth: 0.5, borderColor: colors.border, backgroundColor: colors.bg },
  submitBtn:          { backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
  submitBtnDisabled:  { backgroundColor: colors.border },
  submitText:         { color: '#fff', fontSize: 16, fontWeight: '600' },
});

// ─── Event Detail Modal ───────────────────────────────────────────────────────
function EventDetailModal({ event, visible, currentUser, onClose, onToggle, onDelete, onEdit, onAddComment }) {
  const [kommentar, setKommentar] = useState('');
  if (!event) return null;

  const kat        = katById(event.kategorie);
  const ichKomme   = event.teilnehmer.includes(currentUser);
  const isOwn      = event.autor === currentUser;
  const isPast     = new Date(event.datum) < new Date();
  const bg         = KAT_BG[event.kategorie]  ?? '#F3E5F5';
  const txtColor   = KAT_TEXT[event.kategorie] ?? '#6A1B9A';
  const kommentare = event.kommentare ?? [];
  const maxReached = event.maxTeilnehmer && event.teilnehmer.length >= event.maxTeilnehmer && !ichKomme;

  function handleToggle() {
    if (ichKomme) {
      Alert.alert('Absagen?', 'Möchtest du diesen Termin wirklich absagen?', [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Ja, absagen', style: 'destructive', onPress: () => onToggle(event.id) },
      ]);
    } else {
      onToggle(event.id);
    }
  }

  function submitKommentar() {
    if (!kommentar.trim()) return;
    onAddComment(event.id, kommentar.trim());
    setKommentar('');
  }

  function handleDelete() {
    Alert.alert('Termin löschen?', 'Diesen Termin wirklich entfernen?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => { onDelete(event.id); onClose(); } },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={ed.container}>
        {/* Coloured header strip */}
        <View style={[ed.header, { backgroundColor: bg }]}>
          <TouchableOpacity onPress={onClose} style={ed.iconBtn}>
            <Text style={ed.iconTxt}>✕</Text>
          </TouchableOpacity>
          <View style={ed.headerMid}>
            <Text style={ed.headerEmoji}>{kat.emoji}</Text>
            <Text style={[ed.headerKat, { color: txtColor }]}>{kat.label}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {isOwn && !isPast && (
              <TouchableOpacity style={ed.iconBtn} onPress={() => { onClose(); setTimeout(() => onEdit(event), 300); }}>
                <Text style={ed.iconTxt}>✏️</Text>
              </TouchableOpacity>
            )}
            {isOwn && (
              <TouchableOpacity style={ed.iconBtn} onPress={handleDelete}>
                <Text style={ed.iconTxt}>🗑️</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView contentContainerStyle={ed.scroll} keyboardShouldPersistTaps="handled">
          {/* Title + meta */}
          <Text style={ed.titel}>{event.titel}</Text>
          <View style={ed.infoRow}>
            <Text style={ed.infoIcon}>📅</Text>
            <Text style={ed.infoText}>
              {formatEventDate(event.datum)}, {formatFullDate(event.datum)}
              {event.ganztag
                ? '  ·  Ganztägig'
                : event.uhrzeit ? `  ·  ${event.uhrzeit} Uhr` : ''}
            </Text>
          </View>
          {!!event.ort && (
            <View style={ed.infoRow}>
              <Text style={ed.infoIcon}>📍</Text>
              <Text style={ed.infoText}>{event.ort}</Text>
            </View>
          )}
          <View style={ed.infoRow}>
            <Text style={ed.infoIcon}>👤</Text>
            <Text style={ed.infoText}>Erstellt von {event.autor}</Text>
          </View>
          {!!event.beschreibung && (
            <Text style={ed.beschreibung}>{event.beschreibung}</Text>
          )}

          {/* Teilnehmer */}
          <View style={ed.section}>
            <Text style={ed.sectionTitle}>
              Teilnehmer ({event.teilnehmer.length}
              {event.maxTeilnehmer ? `/${event.maxTeilnehmer} Plätze` : ''})
            </Text>
            {event.maxTeilnehmer && (
              <View style={ed.progressBar}>
                <View style={[ed.progressFill, {
                  width: `${Math.min(100, (event.teilnehmer.length / event.maxTeilnehmer) * 100)}%`,
                  backgroundColor: maxReached ? '#D32F2F' : colors.primary,
                }]} />
              </View>
            )}
            <View style={ed.teilnehmerList}>
              {event.teilnehmer.map(name => (
                <View key={name} style={ed.teilnehmerChip}>
                  <View style={ed.avatar}><Text style={ed.avatarTxt}>{name[0]}</Text></View>
                  <Text style={ed.teilnehmerName}>{name}</Text>
                </View>
              ))}
              {event.teilnehmer.length === 0 && (
                <Text style={ed.emptyHint}>Noch niemand angemeldet</Text>
              )}
            </View>
          </View>

          {/* Kommentare */}
          <View style={ed.section}>
            <Text style={ed.sectionTitle}>Kommentare ({kommentare.length})</Text>
            {kommentare.map(k => (
              <View key={k.id} style={ed.komCard}>
                <View style={ed.komHeader}>
                  <View style={ed.avatar}><Text style={ed.avatarTxt}>{k.autor[0]}</Text></View>
                  <Text style={ed.komAutor}>{k.autor}</Text>
                  <Text style={ed.komTime}>
                    {new Date(k.ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                  </Text>
                </View>
                <Text style={ed.komText}>{k.text}</Text>
              </View>
            ))}
            {kommentare.length === 0 && (
              <Text style={ed.emptyHint}>Noch keine Kommentare — sei der Erste!</Text>
            )}
          </View>
        </ScrollView>

        {/* Kommentar-Eingabe */}
        <View style={ed.inputRow}>
          <TextInput
            style={ed.commentInput}
            placeholder="Kommentar schreiben..."
            value={kommentar}
            onChangeText={setKommentar}
            multiline
          />
          <TouchableOpacity
            style={[ed.sendBtn, !kommentar.trim() && ed.sendBtnDisabled]}
            onPress={submitKommentar}
            disabled={!kommentar.trim()}
          >
            <Text style={ed.sendTxt}>↑</Text>
          </TouchableOpacity>
        </View>

        {/* Teilnahme / Absage */}
        {!isPast && (
          <View style={ed.footer}>
            <TouchableOpacity
              style={[ed.kommBtn, ichKomme && ed.kommBtnKomme, maxReached && ed.kommBtnFull]}
              onPress={handleToggle}
              disabled={maxReached}
            >
              <Text style={[ed.kommText, ichKomme && ed.kommTextKomme]}>
                {ichKomme ? '✓  Ich komme  ·  Absagen' : maxReached ? '🔒  Ausgebucht' : '+  Ich komme'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const ed = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.bg },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
  iconBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center' },
  iconTxt:         { fontSize: 15 },
  headerMid:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerEmoji:     { fontSize: 20 },
  headerKat:       { fontSize: 14, fontWeight: '700' },
  scroll:          { padding: 20, gap: 14, paddingBottom: 24 },
  titel:           { fontSize: 21, fontWeight: '700', color: colors.text, lineHeight: 28 },
  infoRow:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoIcon:        { fontSize: 14 },
  infoText:        { fontSize: 14, color: colors.textLight },
  beschreibung:    { fontSize: 14, color: colors.textLight, lineHeight: 21, backgroundColor: colors.bgAlt, padding: 12, borderRadius: 12 },
  section:         { gap: 10 },
  sectionTitle:    { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  progressBar:     { height: 6, backgroundColor: colors.bgAlt, borderRadius: 4, overflow: 'hidden' },
  progressFill:    { height: 6, borderRadius: 4 },
  teilnehmerList:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  teilnehmerChip:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.bgAlt, borderRadius: 20, paddingRight: 10, paddingVertical: 4, borderWidth: 0.5, borderColor: colors.border },
  avatar:          { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:       { fontSize: 11, fontWeight: '700', color: colors.primary },
  teilnehmerName:  { fontSize: 13, color: colors.textMid, fontWeight: '500' },
  emptyHint:       { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
  komCard:         { backgroundColor: colors.bgAlt, borderRadius: 12, padding: 12, gap: 6, borderWidth: 0.5, borderColor: colors.border },
  komHeader:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  komAutor:        { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  komTime:         { fontSize: 11, color: colors.textMuted },
  komText:         { fontSize: 14, color: colors.textLight, lineHeight: 20 },
  inputRow:        { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 0.5, borderColor: colors.border, backgroundColor: colors.bg },
  commentInput:    { flex: 1, backgroundColor: colors.bgAlt, borderRadius: 12, padding: 12, fontSize: 14, maxHeight: 80, borderWidth: 1, borderColor: colors.border },
  sendBtn:         { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: colors.border },
  sendTxt:         { color: '#fff', fontWeight: '700', fontSize: 18 },
  footer:          { padding: 16, borderTopWidth: 0.5, borderColor: colors.border, backgroundColor: colors.bg },
  kommBtn:         { borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.bg },
  kommBtnKomme:    { backgroundColor: colors.primaryLight },
  kommBtnFull:     { borderColor: colors.border, backgroundColor: colors.bgAlt },
  kommText:        { fontSize: 15, color: colors.primary, fontWeight: '600' },
  kommTextKomme:   { color: colors.primary },
});

// ─── Month View ───────────────────────────────────────────────────────────────
function MonthView({ events, onDayPress, selectedDay }) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const cells = useMemo(() => {
    const year = month.getFullYear();
    const m    = month.getMonth();
    // Weekday of 1st (0=Sun → shift to Mon-based)
    let startDow = new Date(year, m, 1).getDay() - 1;
    if (startDow < 0) startDow = 6;
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const arr = [];
    for (let i = 0; i < startDow; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(year, m, d));
    return arr;
  }, [month]);

  const eventsByDay = useMemo(() => {
    const map = {};
    events.forEach(ev => {
      const key = new Date(ev.datum).toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [events]);

  const today = new Date();

  return (
    <View style={mv.container}>
      {/* Month header */}
      <View style={mv.header}>
        <TouchableOpacity onPress={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={mv.arrow}>‹</Text>
        </TouchableOpacity>
        <Text style={mv.monthTitle}>{MONTHS[month.getMonth()]} {month.getFullYear()}</Text>
        <TouchableOpacity onPress={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={mv.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Weekday labels */}
      <View style={mv.weekRow}>
        {WEEKDAYS.map(d => (
          <View key={d} style={mv.weekCell}>
            <Text style={mv.weekLabel}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
      <View style={mv.grid}>
        {cells.map((day, i) => {
          if (!day) return <View key={`e-${i}`} style={mv.cell} />;
          const key    = day.toDateString();
          const evs    = eventsByDay[key] ?? [];
          const isToday = isSameDay(day, today);
          const isSel   = selectedDay && isSameDay(day, selectedDay);
          return (
            <TouchableOpacity
              key={key}
              style={[mv.cell, isToday && mv.cellToday, isSel && mv.cellSelected]}
              onPress={() => onDayPress(day)}
            >
              <Text style={[mv.dayNum, isToday && mv.dayNumToday, isSel && mv.dayNumSel]}>
                {day.getDate()}
              </Text>
              {evs.length > 0 && (
                <View style={mv.dotsRow}>
                  {evs.slice(0, 3).map((ev, di) => (
                    <View key={di} style={[mv.dot, { backgroundColor: KAT_TEXT[ev.kategorie] ?? colors.primary }]} />
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const mv = StyleSheet.create({
  container:  { backgroundColor: colors.bg, borderBottomWidth: 0.5, borderColor: colors.border, paddingBottom: 8 },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
  arrow:      { fontSize: 28, color: colors.primary, fontWeight: '300', lineHeight: 32 },
  monthTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  weekRow:    { flexDirection: 'row', paddingHorizontal: 8 },
  weekCell:   { flex: 1, alignItems: 'center', paddingBottom: 4 },
  weekLabel:  { fontSize: 10, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  grid:       { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  cell:       { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  cellToday:  { backgroundColor: colors.primaryLight, borderRadius: 10 },
  cellSelected:{ backgroundColor: colors.primary, borderRadius: 10 },
  dayNum:     { fontSize: 13, color: colors.text },
  dayNumToday:{ color: colors.primary, fontWeight: '700' },
  dayNumSel:  { color: '#fff', fontWeight: '700' },
  dotsRow:    { flexDirection: 'row', gap: 2 },
  dot:        { width: 4, height: 4, borderRadius: 2 },
});

// ─── Event Card ───────────────────────────────────────────────────────────────
function EventCard({ event, currentUser, onPress, onQuickToggle }) {
  const kat       = katById(event.kategorie);
  const ichKomme  = event.teilnehmer.includes(currentUser);
  const isPast    = new Date(event.datum) < new Date();
  const bg        = KAT_BG[event.kategorie]  ?? '#F3E5F5';
  const txtColor  = KAT_TEXT[event.kategorie] ?? '#6A1B9A';
  const maxReached = event.maxTeilnehmer && event.teilnehmer.length >= event.maxTeilnehmer && !ichKomme;

  return (
    <TouchableOpacity style={[ec.wrap, isPast && ec.wrapPast]} onPress={onPress} activeOpacity={0.8}>
      {/* Date strip */}
      <View style={[ec.dateStrip, { backgroundColor: bg }]}>
        <Text style={[ec.dateDay, { color: txtColor }]}>{formatEventDate(event.datum)}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {event.ganztag
            ? <Text style={[ec.badge, { color: txtColor }]}>Ganztägig</Text>
            : event.uhrzeit && <Text style={[ec.dateTime, { color: txtColor }]}>{event.uhrzeit} Uhr</Text>
          }
          {(event.kommentare?.length ?? 0) > 0 && (
            <Text style={[ec.badge, { color: txtColor }]}>💬 {event.kommentare.length}</Text>
          )}
          {event.maxTeilnehmer && (
            <Text style={[ec.badge, { color: txtColor }]}>
              {event.teilnehmer.length}/{event.maxTeilnehmer}
            </Text>
          )}
        </View>
      </View>

      <View style={ec.body}>
        <View style={ec.topRow}>
          <View style={[ec.katBadge, { backgroundColor: bg }]}>
            <Text style={ec.katEmoji}>{kat.emoji}</Text>
            <Text style={[ec.katLabel, { color: txtColor }]}>{kat.label}</Text>
          </View>
        </View>

        <Text style={ec.titel}>{event.titel}</Text>

        {!!event.ort && (
          <View style={ec.infoRow}>
            <Text style={ec.infoIcon}>📍</Text>
            <Text style={ec.infoText}>{event.ort}</Text>
          </View>
        )}
        {!!event.beschreibung && (
          <Text style={ec.beschreibung} numberOfLines={2}>{event.beschreibung}</Text>
        )}

        <View style={ec.footer}>
          {/* Avatar stack */}
          <View style={ec.teilnehmerRow}>
            {event.teilnehmer.slice(0, 4).map((name, i) => (
              <View key={name} style={[ec.avatar, { marginLeft: i > 0 ? -6 : 0 }]}>
                <Text style={ec.avatarTxt}>{name[0]}</Text>
              </View>
            ))}
            <Text style={ec.teilnehmerCount}>
              {event.teilnehmer.length === 0 ? 'Noch niemand' : `${event.teilnehmer.length} kommen`}
            </Text>
          </View>

          {/* Quick-toggle (no confirmation — tap card for full detail) */}
          {!isPast && (
            <TouchableOpacity
              style={[ec.kommBtn, ichKomme && ec.kommBtnActive, maxReached && ec.kommBtnDisabled]}
              onPress={() => onQuickToggle(event.id)}
              disabled={maxReached}
            >
              <Text style={[ec.kommText, ichKomme && ec.kommTextActive]}>
                {ichKomme ? '✓ Dabei' : maxReached ? '🔒 Voll' : '+ Dabei'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const ec = StyleSheet.create({
  wrap:           { backgroundColor: colors.bgAlt, borderRadius: 14, overflow: 'hidden', borderWidth: 0.5, borderColor: colors.border },
  wrapPast:       { opacity: 0.55 },
  dateStrip:      { paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateDay:        { fontSize: 13, fontWeight: '700' },
  dateTime:       { fontSize: 13, fontWeight: '500' },
  badge:          { fontSize: 11, fontWeight: '600', backgroundColor: 'rgba(255,255,255,0.5)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  body:           { padding: 14, gap: 8 },
  topRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  katBadge:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  katEmoji:       { fontSize: 12 },
  katLabel:       { fontSize: 11, fontWeight: '600' },
  titel:          { fontSize: 15, fontWeight: '600', color: colors.text, lineHeight: 21 },
  infoRow:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoIcon:       { fontSize: 12 },
  infoText:       { fontSize: 13, color: colors.textLight },
  beschreibung:   { fontSize: 13, color: colors.textLight, lineHeight: 19 },
  footer:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  teilnehmerRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatar:         { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.bgAlt },
  avatarTxt:      { fontSize: 10, fontWeight: '700', color: colors.primary },
  teilnehmerCount:{ fontSize: 12, color: colors.textMuted },
  kommBtn:        { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.bg },
  kommBtnActive:  { backgroundColor: colors.primary, borderColor: colors.primary },
  kommBtnDisabled:{ borderColor: colors.border, backgroundColor: colors.bgAlt },
  kommText:       { fontSize: 12, color: colors.primary, fontWeight: '600' },
  kommTextActive: { color: '#fff' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function KalenderScreen() {
  const {
    events, currentUser,
    addEvent, updateEvent, deleteEvent,
    toggleEventTeilnehmer, addEventComment,
  } = useTratsch();

  const [viewMode,    setViewMode]    = useState('list'); // 'list' | 'month'
  const [katFilter,   setKatFilter]   = useState(null);
  const [showPast,    setShowPast]    = useState(false);
  const [showForm,    setShowForm]    = useState(false);
  const [editEvent,   setEditEvent]   = useState(null);   // non-null → edit modal
  const [detailEvent, setDetailEvent] = useState(null);   // non-null → detail modal
  const [selectedDay, setSelectedDay] = useState(null);

  const now = new Date();

  const upcoming = useMemo(() =>
    events
      .filter(e => new Date(e.datum) >= now && (!katFilter || e.kategorie === katFilter))
      .sort((a, b) => new Date(a.datum) - new Date(b.datum)),
    [events, katFilter],
  );

  const past = useMemo(() =>
    events
      .filter(e => new Date(e.datum) < now && (!katFilter || e.kategorie === katFilter))
      .sort((a, b) => new Date(b.datum) - new Date(a.datum)),
    [events, katFilter],
  );

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    return events
      .filter(e => isSameDay(new Date(e.datum), selectedDay))
      .sort((a, b) => new Date(a.datum) - new Date(b.datum));
  }, [events, selectedDay]);

  // Keep detail event live with context changes
  const liveDetail = useMemo(
    () => detailEvent ? events.find(e => e.id === detailEvent.id) ?? null : null,
    [detailEvent, events],
  );

  const myCount   = events.filter(e => e.teilnehmer.includes(currentUser)).length;
  const nextEvent = [...events]
    .filter(e => new Date(e.datum) >= now)
    .sort((a, b) => new Date(a.datum) - new Date(b.datum))[0];

  function handleDayPress(day) {
    setSelectedDay(prev => prev && isSameDay(prev, day) ? null : day);
  }

  function handleFormSubmit(values) {
    if (values.id) updateEvent(values);
    else           addEvent(values);
  }

  function handleEditFromDetail(ev) {
    setDetailEvent(null);
    setTimeout(() => setEditEvent(ev), 350);
  }

  const listData = viewMode === 'month' && selectedDay ? selectedDayEvents : upcoming;

  return (
    <View style={s.container}>
      {/* ── Summary bar ── */}
      <View style={s.summary}>
        <View style={s.summaryItem}>
          <Text style={s.summaryNum}>{upcoming.length}</Text>
          <Text style={s.summaryLbl}>Anstehend</Text>
        </View>
        <View style={s.summaryDiv} />
        <View style={s.summaryItem}>
          <Text style={s.summaryNum}>{myCount}</Text>
          <Text style={s.summaryLbl}>Ich komme</Text>
        </View>
        <View style={s.summaryDiv} />
        <View style={s.summaryItem}>
          <Text style={[s.summaryNum, { fontSize: 13, paddingTop: 2 }]} numberOfLines={1}>
            {nextEvent ? formatEventDate(nextEvent.datum) : '—'}
          </Text>
          <Text style={s.summaryLbl}>Nächster</Text>
        </View>
        <View style={s.summaryDiv} />
        {/* View-mode toggle */}
        <TouchableOpacity
          style={s.summaryItem}
          onPress={() => { setViewMode(v => v === 'list' ? 'month' : 'list'); setSelectedDay(null); }}
        >
          <View style={s.viewToggle}>
            <Text style={{ fontSize: 17 }}>{viewMode === 'list' ? '📅' : '≡'}</Text>
          </View>
          <Text style={s.summaryLbl}>{viewMode === 'list' ? 'Monat' : 'Liste'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Month view ── */}
      {viewMode === 'month' && (
        <MonthView events={events} onDayPress={handleDayPress} selectedDay={selectedDay} />
      )}

      {/* ── Category chips ── */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={s.filterBar} contentContainerStyle={s.filterContent}
      >
        <TouchableOpacity
          style={[s.chip, !katFilter && s.chipActive]}
          onPress={() => setKatFilter(null)}
        >
          <Text style={[s.chipText, !katFilter && s.chipTextActive]}>Alle</Text>
        </TouchableOpacity>
        {KATEGORIEN.map(k => (
          <TouchableOpacity
            key={k.id}
            style={[s.chip, katFilter === k.id && s.chipActive]}
            onPress={() => setKatFilter(katFilter === k.id ? null : k.id)}
          >
            <Text style={[s.chipText, katFilter === k.id && s.chipTextActive]}>
              {k.emoji} {k.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Selected-day header ── */}
      {viewMode === 'month' && selectedDay && (
        <View style={s.dayHeader}>
          <Text style={s.dayHeaderTitle}>
            {formatEventDate(selectedDay.toISOString())}
            {'  ·  '}
            {selectedDayEvents.length} Termin{selectedDayEvents.length !== 1 ? 'e' : ''}
          </Text>
          <TouchableOpacity onPress={() => setSelectedDay(null)}>
            <Text style={s.dayHeaderClear}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Event list ── */}
      <FlatList
        data={listData}
        keyExtractor={e => e.id}
        contentContainerStyle={[s.list, listData.length === 0 && s.listCenter]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>
              {viewMode === 'month' && selectedDay ? '🗓️' : katFilter ? '🔍' : '📅'}
            </Text>
            <Text style={s.emptyTitle}>
              {viewMode === 'month' && selectedDay
                ? 'Kein Termin an diesem Tag'
                : katFilter ? 'Keine Termine in dieser Kategorie' : 'Keine anstehenden Termine'}
            </Text>
            <Text style={s.emptySub}>
              {viewMode === 'month' && selectedDay
                ? 'Wähle einen anderen Tag oder erstelle einen neuen Termin.'
                : 'Erstelle den ersten Termin für eure Gruppe!'}
            </Text>
          </View>
        }
        ListFooterComponent={
          viewMode === 'list' && !selectedDay && past.length > 0 ? (
            <View style={{ marginTop: 16, gap: 10 }}>
              <TouchableOpacity style={s.pastToggle} onPress={() => setShowPast(v => !v)}>
                <Text style={s.pastToggleText}>
                  {showPast ? '▲' : '▼'}  {past.length} vergangene Termine
                </Text>
              </TouchableOpacity>
              {showPast && past.map(ev => (
                <EventCard
                  key={ev.id}
                  event={ev}
                  currentUser={currentUser}
                  onPress={() => setDetailEvent(ev)}
                  onQuickToggle={toggleEventTeilnehmer}
                />
              ))}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <EventCard
            event={item}
            currentUser={currentUser}
            onPress={() => setDetailEvent(item)}
            onQuickToggle={toggleEventTeilnehmer}
          />
        )}
      />

      {/* ── FAB ── */}
      <TouchableOpacity style={s.fab} onPress={() => setShowForm(true)}>
        <Text style={s.fabText}>📅  Termin erstellen</Text>
      </TouchableOpacity>

      {/* ── Add / Edit Modal ── */}
      <EventFormModal
        visible={showForm || !!editEvent}
        initialValues={editEvent}
        onSubmit={handleFormSubmit}
        onClose={() => { setShowForm(false); setEditEvent(null); }}
      />

      {/* ── Detail Modal ── */}
      <EventDetailModal
        event={liveDetail}
        visible={!!liveDetail}
        currentUser={currentUser}
        onClose={() => setDetailEvent(null)}
        onToggle={(id) => {
          const ev = events.find(e => e.id === id);
          if (!ev) return;
          if (ev.teilnehmer.includes(currentUser)) {
            Alert.alert('Absagen?', 'Möchtest du diesen Termin wirklich absagen?', [
              { text: 'Abbrechen', style: 'cancel' },
              { text: 'Ja, absagen', style: 'destructive', onPress: () => toggleEventTeilnehmer(id) },
            ]);
          } else {
            toggleEventTeilnehmer(id);
          }
        }}
        onDelete={deleteEvent}
        onEdit={handleEditFromDetail}
        onAddComment={addEventComment}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.bg },
  summary:        { flexDirection: 'row', alignItems: 'center', margin: 12, marginBottom: 4, backgroundColor: colors.primaryLight, borderRadius: 14, paddingVertical: 12, borderWidth: 0.5, borderColor: colors.primaryMid },
  summaryItem:    { flex: 1, alignItems: 'center' },
  summaryNum:     { fontSize: 22, fontWeight: '700', color: colors.primary },
  summaryLbl:     { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  summaryDiv:     { width: 0.5, height: 30, backgroundColor: colors.primaryMid },
  viewToggle:     { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: colors.primaryMid },
  filterBar:      { maxHeight: 48 },
  filterContent:  { paddingHorizontal: 12, paddingVertical: 6, gap: 6, flexDirection: 'row', alignItems: 'center' },
  chip:           { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.bgAlt, borderWidth: 0.5, borderColor: colors.border },
  chipActive:     { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  chipText:       { fontSize: 12, color: colors.textMid },
  chipTextActive: { color: colors.primary, fontWeight: '500' },
  dayHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.primaryLight, borderBottomWidth: 0.5, borderColor: colors.primaryMid },
  dayHeaderTitle: { fontSize: 13, fontWeight: '600', color: colors.primary },
  dayHeaderClear: { fontSize: 14, color: colors.textMid, padding: 4 },
  list:           { padding: 12, gap: 10, paddingBottom: 90 },
  listCenter:     { flexGrow: 1, justifyContent: 'center' },
  empty:          { alignItems: 'center', gap: 8, paddingVertical: 40 },
  emptyEmoji:     { fontSize: 44 },
  emptyTitle:     { fontSize: 16, fontWeight: '500', color: colors.textMid },
  emptySub:       { fontSize: 13, color: colors.textMuted, textAlign: 'center', maxWidth: 240, lineHeight: 20 },
  pastToggle:     { padding: 12, backgroundColor: colors.bgAlt, borderRadius: 10, alignItems: 'center', borderWidth: 0.5, borderColor: colors.border },
  pastToggleText: { fontSize: 13, color: colors.textMid, fontWeight: '500' },
  fab:            { position: 'absolute', bottom: 16, right: 16, left: 16, backgroundColor: colors.primary, borderRadius: 14, padding: 15, alignItems: 'center' },
  fabText:        { color: '#fff', fontWeight: '600', fontSize: 15 },
});
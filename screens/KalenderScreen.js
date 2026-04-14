import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  TextInput, ScrollView, Modal, Platform, Alert,
} from 'react-native';
import { useState, useMemo } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTratsch } from '../context/TratschContext';
import { colors } from '../theme';
import { relativeTime } from '../utils/time';

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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatEventDate(isoString) {
  const d = new Date(isoString);
  const now = new Date();
  const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const isToday    = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  if (isToday)    return 'Heute';
  if (isTomorrow) return 'Morgen';
  return `${days[d.getDay()]}, ${d.getDate()}. ${months[d.getMonth()]}`;
}

function formatFullDate(isoString) {
  const d = new Date(isoString);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`;
}

// ─── Date Picker Modal ────────────────────────────────────────────────────────
function DatePickerModal({ visible, initial, onConfirm, onCancel }) {
  const [value, setValue] = useState(initial ?? new Date());
  const [step,  setStep]  = useState('date');

  function handleChange(_, selected) {
    if (!selected) return;
    setValue(selected);
    if (Platform.OS === 'android' && step === 'date') setStep('time');
  }
  function confirm() { onConfirm(value); setStep('date'); }
  function cancel()  { onCancel(); setStep('date'); setValue(initial ?? new Date()); }
  if (!visible) return null;

  if (Platform.OS === 'ios') {
    return (
      <Modal transparent animationType="slide" visible={visible}>
        <View style={dp.overlay}>
          <View style={dp.sheet}>
            <View style={dp.header}>
              <TouchableOpacity onPress={cancel}><Text style={dp.cancel}>Abbrechen</Text></TouchableOpacity>
              <Text style={dp.title}>Datum & Uhrzeit</Text>
              <TouchableOpacity onPress={confirm}><Text style={dp.done}>Fertig</Text></TouchableOpacity>
            </View>
            <DateTimePicker value={value} mode="datetime" display="spinner" minimumDate={new Date()} onChange={handleChange} locale="de-CH" style={{ width: '100%' }} />
          </View>
        </View>
      </Modal>
    );
  }
  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={dp.overlay}>
        <View style={dp.sheet}>
          <Text style={dp.title}>{step === 'date' ? 'Datum wählen' : 'Uhrzeit wählen'}</Text>
          <DateTimePicker value={value} mode={step} display="default" minimumDate={new Date()} onChange={handleChange} />
          {step === 'time' && (
            <View style={dp.btns}>
              <TouchableOpacity style={dp.btnCancel} onPress={cancel}><Text style={dp.btnCancelText}>Abbrechen</Text></TouchableOpacity>
              <TouchableOpacity style={dp.btnOk} onPress={confirm}><Text style={dp.btnOkText}>OK</Text></TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
const dp = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:   { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderColor: colors.border },
  title:   { fontSize: 15, fontWeight: '600', color: colors.text, textAlign: 'center' },
  cancel:  { fontSize: 14, color: colors.textMuted },
  done:    { fontSize: 14, color: colors.primary, fontWeight: '600' },
  btns:    { flexDirection: 'row', gap: 10, padding: 16 },
  btnCancel:     { flex: 1, padding: 12, borderRadius: 10, borderWidth: 0.5, borderColor: colors.border, alignItems: 'center' },
  btnOk:         { flex: 1, padding: 12, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' },
  btnCancelText: { color: colors.textMid },
  btnOkText:     { color: '#fff', fontWeight: '600' },
});

// ─── Add Event Modal ──────────────────────────────────────────────────────────
function AddEventModal({ visible, onSubmit, onClose }) {
  const [titel,       setTitel]       = useState('');
  const [beschreibung,setBeschreibung]= useState('');
  const [ort,         setOrt]         = useState('');
  const [kategorie,   setKategorie]   = useState('spielnachmittag');
  const [datum,       setDatum]       = useState(null);
  const [showDTP,     setShowDTP]     = useState(false);

  function reset() {
    setTitel(''); setBeschreibung(''); setOrt('');
    setKategorie('spielnachmittag'); setDatum(null);
  }

  function close() { reset(); onClose(); }

  function submit() {
    if (!titel.trim() || !datum) return;
    const pad = n => String(n).padStart(2,'0');
    onSubmit({
      titel, beschreibung, ort,
      kategorie,
      datum: datum.toISOString(),
      uhrzeit: `${pad(datum.getHours())}:${pad(datum.getMinutes())}`,
    });
    close();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={af.container}>
        <View style={af.header}>
          <TouchableOpacity onPress={close} style={af.closeBtn}><Text style={af.closeTxt}>✕</Text></TouchableOpacity>
          <Text style={af.headerTitle}>Neuer Termin</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={af.scroll}>
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

          <Text style={af.label}>Titel *</Text>
          <TextInput style={af.input} placeholder="z.B. Grillabend im Innenhof" value={titel} onChangeText={setTitel} autoFocus />

          <Text style={af.label}>Datum & Uhrzeit *</Text>
          <TouchableOpacity style={[af.datePicker, datum && af.datePickerFilled]} onPress={() => setShowDTP(true)}>
            <Text style={{ fontSize: 18 }}>🗓️</Text>
            <Text style={[af.dateText, datum && af.dateTextFilled]}>
              {datum ? `${formatFullDate(datum.toISOString())} · ${String(datum.getHours()).padStart(2,'0')}:${String(datum.getMinutes()).padStart(2,'0')} Uhr` : 'Datum wählen'}
            </Text>
            {datum && (
              <TouchableOpacity onPress={() => setDatum(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={af.clearBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          <Text style={af.label}>Ort <Text style={af.labelOpt}>(optional)</Text></Text>
          <TextInput style={af.input} placeholder="z.B. Innenhof Block B, Wohnung 12..." value={ort} onChangeText={setOrt} />

          <Text style={af.label}>Details <Text style={af.labelOpt}>(optional)</Text></Text>
          <TextInput style={[af.input, af.textarea]} placeholder="Was sollen die anderen wissen?" value={beschreibung} onChangeText={setBeschreibung} multiline />
        </ScrollView>

        <View style={af.footer}>
          <TouchableOpacity
            style={[af.submitBtn, (!titel.trim() || !datum) && af.submitBtnDisabled]}
            onPress={submit}
            disabled={!titel.trim() || !datum}
          >
            <Text style={af.submitText}>Termin erstellen</Text>
          </TouchableOpacity>
        </View>
      </View>
      <DatePickerModal
        visible={showDTP}
        initial={datum ?? new Date()}
        onConfirm={d => { setDatum(d); setShowDTP(false); }}
        onCancel={() => setShowDTP(false)}
      />
    </Modal>
  );
}
const af = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 0.5, borderColor: colors.border },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  closeBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' },
  closeTxt:    { fontSize: 14, color: colors.textMid },
  scroll:      { padding: 20, gap: 12, paddingBottom: 30 },
  label:       { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  labelOpt:    { fontWeight: '400', color: colors.border },
  input:       { backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 13, fontSize: 15 },
  textarea:    { minHeight: 72, textAlignVertical: 'top' },
  katRow:      { gap: 8, paddingVertical: 4 },
  katChip:     { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.bgAlt, gap: 3 },
  katChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  katEmoji:    { fontSize: 22 },
  katText:     { fontSize: 11, color: colors.textMid, fontWeight: '500' },
  katTextActive: { color: colors.primary },
  datePicker:       { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 13 },
  datePickerFilled: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  dateText:         { flex: 1, fontSize: 15, color: colors.textMuted },
  dateTextFilled:   { color: colors.primary, fontWeight: '500' },
  clearBtn:         { color: colors.textMuted, fontSize: 14, padding: 2 },
  footer:           { padding: 16, borderTopWidth: 0.5, borderColor: colors.border, backgroundColor: colors.bg },
  submitBtn:        { backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
  submitBtnDisabled:{ backgroundColor: colors.border },
  submitText:       { color: '#fff', fontSize: 16, fontWeight: '600' },
});

// ─── Event Card ───────────────────────────────────────────────────────────────
function EventCard({ event, currentUser, onToggle, onDelete }) {
  const kat       = katById(event.kategorie);
  const ichKomme  = event.teilnehmer.includes(currentUser);
  const isOwn     = event.autor === currentUser;
  const isPast    = new Date(event.datum) < new Date();
  const bg        = KAT_BG[event.kategorie]  ?? '#F3E5F5';
  const txtColor  = KAT_TEXT[event.kategorie] ?? '#6A1B9A';

  return (
    <View style={[ec.wrap, isPast && ec.wrapPast]}>
      {/* Date strip */}
      <View style={[ec.dateStrip, { backgroundColor: bg }]}>
        <Text style={[ec.dateDay, { color: txtColor }]}>{formatEventDate(event.datum)}</Text>
        {event.uhrzeit && <Text style={[ec.dateTime, { color: txtColor }]}>{event.uhrzeit} Uhr</Text>}
      </View>

      <View style={ec.body}>
        <View style={ec.topRow}>
          <View style={[ec.katBadge, { backgroundColor: bg }]}>
            <Text style={ec.katEmoji}>{kat.emoji}</Text>
            <Text style={[ec.katLabel, { color: txtColor }]}>{kat.label}</Text>
          </View>
          {isOwn && (
            <TouchableOpacity onPress={() => onDelete(event.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={ec.deleteBtn}>🗑️</Text>
            </TouchableOpacity>
          )}
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
          <View style={ec.teilnehmerRow}>
            {event.teilnehmer.slice(0, 4).map((name, i) => (
              <View key={name} style={[ec.avatar, { marginLeft: i > 0 ? -6 : 0 }]}>
                <Text style={ec.avatarTxt}>{name[0]}</Text>
              </View>
            ))}
            <Text style={ec.teilnehmerCount}>
              {event.teilnehmer.length === 0
                ? 'Noch niemand'
                : `${event.teilnehmer.length} kommen`}
            </Text>
          </View>

          {!isPast && (
            <TouchableOpacity
              style={[ec.kommBtn, ichKomme && ec.kommBtnActive]}
              onPress={() => onToggle(event.id)}
            >
              <Text style={[ec.kommText, ichKomme && ec.kommTextActive]}>
                {ichKomme ? '✓ Ich komme' : '+ Ich komme'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
const ec = StyleSheet.create({
  wrap:     { backgroundColor: colors.bgAlt, borderRadius: 14, overflow: 'hidden', borderWidth: 0.5, borderColor: colors.border },
  wrapPast: { opacity: 0.6 },
  dateStrip:{ paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateDay:  { fontSize: 13, fontWeight: '700' },
  dateTime: { fontSize: 13, fontWeight: '500' },
  body:     { padding: 14, gap: 8 },
  topRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  katBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  katEmoji: { fontSize: 12 },
  katLabel: { fontSize: 11, fontWeight: '600' },
  deleteBtn:{ fontSize: 14 },
  titel:    { fontSize: 15, fontWeight: '600', color: colors.text, lineHeight: 21 },
  infoRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoIcon: { fontSize: 12 },
  infoText: { fontSize: 13, color: colors.textLight },
  beschreibung: { fontSize: 13, color: colors.textLight, lineHeight: 19 },
  footer:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  teilnehmerRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatar:         { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.bgAlt },
  avatarTxt:      { fontSize: 10, fontWeight: '700', color: colors.primary },
  teilnehmerCount:{ fontSize: 12, color: colors.textMuted },
  kommBtn:        { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.bg },
  kommBtnActive:  { backgroundColor: colors.primary, borderColor: colors.primary },
  kommText:       { fontSize: 12, color: colors.primary, fontWeight: '600' },
  kommTextActive: { color: '#fff' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function KalenderScreen() {
  const { events, currentUser, addEvent, deleteEvent, toggleEventTeilnehmer } = useTratsch();
  const [katFilter,  setKatFilter]  = useState(null);
  const [showPast,   setShowPast]   = useState(false);
  const [showForm,   setShowForm]   = useState(false);

  const now = new Date();

  const upcoming = useMemo(() =>
    events
      .filter(e => new Date(e.datum) >= now && (!katFilter || e.kategorie === katFilter))
      .sort((a, b) => new Date(a.datum) - new Date(b.datum)),
    [events, katFilter]
  );

  const past = useMemo(() =>
    events
      .filter(e => new Date(e.datum) < now && (!katFilter || e.kategorie === katFilter))
      .sort((a, b) => new Date(b.datum) - new Date(a.datum)),
    [events, katFilter]
  );

  const myCount    = events.filter(e => e.teilnehmer.includes(currentUser)).length;
  const nextEvent  = [...events].filter(e => new Date(e.datum) >= now).sort((a,b) => new Date(a.datum) - new Date(b.datum))[0];

  function confirmDelete(id) {
    Alert.alert('Termin löschen?', 'Diesen Termin wirklich entfernen?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => deleteEvent(id) },
    ]);
  }

  return (
    <View style={s.container}>
      {/* Summary */}
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
      </View>

      {/* Category filter */}
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

      <FlatList
        data={upcoming}
        keyExtractor={item => item.id}
        contentContainerStyle={[s.list, upcoming.length === 0 && s.listCenter]}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>📅</Text>
            <Text style={s.emptyTitle}>Keine Termine</Text>
            <Text style={s.emptySub}>Erstelle den ersten Termin für eure Gruppe!</Text>
          </View>
        }
        ListFooterComponent={
          past.length > 0 ? (
            <View style={{ marginTop: 16, gap: 10 }}>
              <TouchableOpacity
                style={s.pastToggle}
                onPress={() => setShowPast(v => !v)}
              >
                <Text style={s.pastToggleText}>
                  {showPast ? '▲' : '▼'} {past.length} vergangene Termine
                </Text>
              </TouchableOpacity>
              {showPast && past.map(ev => (
                <EventCard
                  key={ev.id}
                  event={ev}
                  currentUser={currentUser}
                  onToggle={toggleEventTeilnehmer}
                  onDelete={confirmDelete}
                />
              ))}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <EventCard
            event={item}
            currentUser={currentUser}
            onToggle={toggleEventTeilnehmer}
            onDelete={confirmDelete}
          />
        )}
      />

      <TouchableOpacity style={s.fab} onPress={() => setShowForm(true)}>
        <Text style={s.fabText}>📅  Termin erstellen</Text>
      </TouchableOpacity>

      <AddEventModal
        visible={showForm}
        onSubmit={addEvent}
        onClose={() => setShowForm(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  summary:     { flexDirection: 'row', alignItems: 'center', margin: 12, marginBottom: 4, backgroundColor: colors.primaryLight, borderRadius: 14, paddingVertical: 12, borderWidth: 0.5, borderColor: colors.primaryMid },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNum:  { fontSize: 22, fontWeight: '700', color: colors.primary },
  summaryLbl:  { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  summaryDiv:  { width: 0.5, height: 30, backgroundColor: colors.primaryMid },

  filterBar:     { maxHeight: 48 },
  filterContent: { paddingHorizontal: 12, paddingVertical: 6, gap: 6, flexDirection: 'row', alignItems: 'center' },
  chip:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.bgAlt, borderWidth: 0.5, borderColor: colors.border },
  chipActive:    { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  chipText:      { fontSize: 12, color: colors.textMid },
  chipTextActive:{ color: colors.primary, fontWeight: '500' },

  list:       { padding: 12, gap: 10, paddingBottom: 90 },
  listCenter: { flexGrow: 1, justifyContent: 'center' },

  empty:     { alignItems: 'center', gap: 8 },
  emptyEmoji:{ fontSize: 44 },
  emptyTitle:{ fontSize: 16, fontWeight: '500', color: colors.textMid },
  emptySub:  { fontSize: 13, color: colors.textMuted, textAlign: 'center', maxWidth: 240, lineHeight: 20 },

  pastToggle:     { padding: 12, backgroundColor: colors.bgAlt, borderRadius: 10, alignItems: 'center', borderWidth: 0.5, borderColor: colors.border },
  pastToggleText: { fontSize: 13, color: colors.textMid, fontWeight: '500' },

  fab:     { position: 'absolute', bottom: 16, right: 16, left: 16, backgroundColor: colors.primary, borderRadius: 14, padding: 15, alignItems: 'center' },
  fabText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
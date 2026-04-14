import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  TextInput, ScrollView, Alert, Modal, Platform,
} from 'react-native';
import { useState, useMemo, useEffect } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTratsch } from '../context/TratschContext';
import { colors } from '../theme';
import { relativeTime } from '../utils/time';

const TYPES = [
  { id: 'abholen',   label: 'Abholen',   emoji: '🚗', hint: 'Kind von Schule/Kita holen' },
  { id: 'betreuung', label: 'Betreuung', emoji: '👶', hint: 'Kurzfristige Betreuung' },
  { id: 'krank',     label: 'Krank',     emoji: '🤒', hint: 'Kind krank, brauche Hilfe' },
  { id: 'sonstiges', label: 'Sonstiges', emoji: '❓', hint: 'Anderes Anliegen' },
];

function typeById(id) { return TYPES.find(t => t.id === id) ?? TYPES[3]; }

function formatDate(date) {
  if (!date) return null;
  const d   = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())} Uhr`;
  const isToday    = d.toDateString() === now.toDateString();
  const tomorrow   = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  if (isToday)    return `Heute, ${time}`;
  if (isTomorrow) return `Morgen, ${time}`;
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}, ${time}`;
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function NotfallDetailModal({ item, visible, currentUser, onClose, onToggleHelfer, onToggleGedeckt }) {
  if (!item) return null;
  const type    = typeById(item.type);
  const isOwn   = item.autor === currentUser;
  const ichHelfe= item.helfer.includes(currentUser);
  const wannStr = item.wann ? formatDate(item.wann) : null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={dm.container}>
        {/* Header */}
        <View style={dm.header}>
          <TouchableOpacity onPress={onClose} style={dm.closeBtn}>
            <Text style={dm.closeTxt}>✕</Text>
          </TouchableOpacity>
          <Text style={dm.headerTitle} numberOfLines={1}>{item.titel}</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={dm.scroll} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={[dm.hero, item.gedeckt && dm.heroSolved]}>
            <View style={dm.heroIcon}>
              <Text style={{ fontSize: 40 }}>{type.emoji}</Text>
            </View>
            <View style={dm.heroRight}>
              <View style={dm.badgeRow}>
                <View style={[dm.typeBadge]}>
                  <Text style={dm.typeBadgeText}>{type.label}</Text>
                </View>
                {item.gedeckt && (
                  <View style={dm.solvedBadge}>
                    <Text style={dm.solvedBadgeText}>✅ Gedeckt</Text>
                  </View>
                )}
              </View>
              <Text style={dm.titel}>{item.titel}</Text>
              <View style={dm.metaRow}>
                <View style={dm.avatar}><Text style={dm.avatarTxt}>{item.autor[0]}</Text></View>
                <Text style={dm.meta}>{item.autor} · {relativeTime(item.ts)}</Text>
              </View>
            </View>
          </View>

          {/* When */}
          {wannStr && (
            <View style={dm.section}>
              <Text style={dm.sectionLabel}>Wann</Text>
              <View style={dm.wannPill}>
                <Text style={{ fontSize: 16 }}>🕐</Text>
                <Text style={dm.wannText}>{wannStr}</Text>
              </View>
            </View>
          )}

          {/* Description */}
          {!!item.text && (
            <View style={dm.section}>
              <Text style={dm.sectionLabel}>Details</Text>
              <View style={dm.descBox}>
                <Text style={dm.desc}>{item.text}</Text>
              </View>
            </View>
          )}

          {/* Helpers */}
          {item.helfer.length > 0 && (
            <View style={dm.section}>
              <Text style={dm.sectionLabel}>{item.helfer.length} {item.helfer.length === 1 ? 'hilft' : 'helfen'}</Text>
              <View style={dm.helferList}>
                {item.helfer.map(name => (
                  <View key={name} style={dm.helferRow}>
                    <View style={dm.avatar}><Text style={dm.avatarTxt}>{name[0]}</Text></View>
                    <Text style={dm.helferName}>{name}</Text>
                    {name === currentUser && <Text style={dm.duBadge}>Du</Text>}
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer action */}
        <View style={dm.footer}>
          {isOwn ? (
            <TouchableOpacity
              style={[dm.actionBtn, item.gedeckt && dm.actionBtnSolved]}
              onPress={() => { onToggleGedeckt(item.id); onClose(); }}
            >
              <Text style={[dm.actionTxt, item.gedeckt && dm.actionTxtSolved]}>
                {item.gedeckt ? 'Wieder öffnen' : '✅ Als gedeckt markieren'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[dm.actionBtn, ichHelfe && dm.actionBtnActive, item.gedeckt && dm.actionBtnDone]}
              onPress={() => { if (!item.gedeckt) onToggleHelfer(item.id); }}
              activeOpacity={item.gedeckt ? 1 : 0.75}
            >
              {ichHelfe ? (
                <Text style={dm.actionTxtActive}>Ich helfe · Zusage zurückziehen</Text>
              ) : item.gedeckt ? (
                <Text style={dm.actionTxtDone}>Bereits gedeckt</Text>
              ) : (
                <Text style={dm.actionTxt}>🙋 Ich helfe!</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const dm = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 0.5, borderColor: colors.border },
  headerTitle: { fontSize: 15, fontWeight: '600', color: colors.text, flex: 1, textAlign: 'center' },
  closeBtn:  { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' },
  closeTxt:  { fontSize: 14, color: colors.textMid },

  scroll: { padding: 20, gap: 20, paddingBottom: 100 },

  hero:       { flexDirection: 'row', gap: 14, alignItems: 'flex-start', backgroundColor: '#FFF3E0', borderRadius: 16, padding: 16 },
  heroSolved: { backgroundColor: '#E8F5E9' },
  heroIcon:   { width: 64, height: 64, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
  heroRight:  { flex: 1, gap: 6 },
  badgeRow:   { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  typeBadge:  { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: 'rgba(212,112,10,0.15)', borderRadius: 8 },
  typeBadgeText: { fontSize: 12, color: '#D4700A', fontWeight: '600' },
  solvedBadge:     { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#E8F5E9', borderRadius: 8 },
  solvedBadgeText: { fontSize: 12, color: '#2E7D32', fontWeight: '600' },
  titel:    { fontSize: 16, fontWeight: '700', color: colors.text, lineHeight: 22 },
  metaRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta:     { fontSize: 12, color: colors.textMuted },
  avatar:   { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:{ fontSize: 10, fontWeight: '700', color: colors.primary },

  section:      { gap: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  wannPill:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF3E0', borderRadius: 12, padding: 14 },
  wannText:     { fontSize: 15, color: '#D4700A', fontWeight: '500' },
  descBox:      { backgroundColor: colors.bgAlt, borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: colors.border },
  desc:         { fontSize: 14, color: colors.textMid, lineHeight: 21 },

  helferList: { backgroundColor: colors.bgAlt, borderRadius: 12, borderWidth: 0.5, borderColor: colors.border, overflow: 'hidden' },
  helferRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  helferName: { fontSize: 14, color: colors.textMid, flex: 1 },
  duBadge:    { fontSize: 11, color: colors.primary, fontWeight: '600', backgroundColor: colors.primaryLight, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },

  footer:         { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 32, backgroundColor: colors.bg, borderTopWidth: 0.5, borderColor: colors.border },
  actionBtn:      { borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.bg },
  actionBtnActive:{ backgroundColor: colors.primary, borderColor: colors.primary },
  actionBtnDone:  { borderColor: colors.border, backgroundColor: colors.bgAlt },
  actionBtnSolved:{ borderColor: '#7bc47b', backgroundColor: '#edfaed' },
  actionTxt:      { fontSize: 16, color: colors.primary, fontWeight: '600' },
  actionTxtActive:{ fontSize: 15, color: '#fff', fontWeight: '600' },
  actionTxtDone:  { fontSize: 15, color: colors.textMuted },
  actionTxtSolved:{ fontSize: 15, color: '#3a8a3a', fontWeight: '600' },
});

// ─── Date/Time Picker Modal ───────────────────────────────────────────────────
function DateTimePickerModal({ visible, initial, onConfirm, onCancel }) {
  const [step,  setStep]  = useState('date');
  const [value, setValue] = useState(initial ?? new Date());

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
              <Text style={dp.title}>Wann?</Text>
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
          <Text style={dp.title}>{step === 'date' ? 'Datum' : 'Uhrzeit'}</Text>
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

// ─── New Request Form Modal ───────────────────────────────────────────────────
function NewNotfallModal({ visible, onSubmit, onClose }) {
  const [step, setStep]     = useState(1);
  const [type, setType]     = useState(null);
  const [titel, setTitel]   = useState('');
  const [text, setText]     = useState('');
  const [wann, setWann]     = useState(null);
  const [showDTP, setShowDTP] = useState(false);

  function reset() { setStep(1); setType(null); setTitel(''); setText(''); setWann(null); setShowDTP(false); }
  function close() { reset(); onClose(); }
  function submit() {
    if (!titel.trim()) return;
    onSubmit({ type: type ?? 'sonstiges', titel: titel.trim(), text: text.trim(), wann });
    close();
  }
  const selectedType = type ? typeById(type) : null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={fm.container}>
        <View style={fm.header}>
          <TouchableOpacity onPress={close} style={fm.closeBtn}><Text style={fm.closeText}>✕</Text></TouchableOpacity>
          <Text style={fm.headerTitle}>Hilfe anfragen</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={fm.stepRow}>
          <View style={fm.stepDotActive} />
          <View style={[fm.stepLine, step === 2 && fm.stepLineActive]} />
          <View style={[fm.stepDot, step === 2 && fm.stepDotActive]} />
        </View>
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={fm.scrollContent}>
          {step === 1 && (
            <View style={fm.stepContent}>
              <Text style={fm.stepTitle}>Was brauchst du?</Text>
              <Text style={fm.stepSub}>Tippe auf eine Kategorie</Text>
              <View style={fm.typeGrid}>
                {TYPES.map(t => (
                  <TouchableOpacity key={t.id} style={[fm.tile, type === t.id && fm.tileActive]} onPress={() => { setType(t.id); setStep(2); }} activeOpacity={0.75}>
                    <Text style={fm.tileEmoji}>{t.emoji}</Text>
                    <Text style={[fm.tileLabel, type === t.id && fm.tileLabelActive]}>{t.label}</Text>
                    <Text style={fm.tileHint}>{t.hint}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          {step === 2 && (
            <View style={fm.stepContent}>
              <TouchableOpacity style={fm.backType} onPress={() => setStep(1)}>
                <Text style={fm.backTypeText}>{selectedType?.emoji} {selectedType?.label}  <Text style={fm.backTypeChange}>ändern</Text></Text>
              </TouchableOpacity>
              <Text style={fm.stepTitle}>Details</Text>
              <Text style={fm.label}>Kurze Beschreibung *</Text>
              <TextInput style={fm.input} placeholder="z.B. Lena von der Schule abholen" value={titel} onChangeText={setTitel} autoFocus returnKeyType="next" />
              <Text style={fm.label}>Wann?</Text>
              <TouchableOpacity style={[fm.datePicker, wann && fm.datePickerFilled]} onPress={() => setShowDTP(true)}>
                <Text style={fm.datePickerEmoji}>🕐</Text>
                <Text style={[fm.datePickerText, wann && fm.datePickerTextFilled]}>{wann ? formatDate(wann) : 'Datum und Uhrzeit wählen'}</Text>
                {wann && <TouchableOpacity onPress={() => setWann(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><Text style={fm.datePickerClear}>✕</Text></TouchableOpacity>}
              </TouchableOpacity>
              <Text style={fm.label}>Details <Text style={fm.labelOpt}>(optional)</Text></Text>
              <TextInput style={[fm.input, fm.textarea]} placeholder="Adresse, Besonderheiten, Kontakt..." value={text} onChangeText={setText} multiline />
            </View>
          )}
        </ScrollView>
        {step === 2 && (
          <View style={fm.footer}>
            <TouchableOpacity style={[fm.submitBtn, !titel.trim() && fm.submitBtnDisabled]} onPress={submit} disabled={!titel.trim()}>
              <Text style={fm.submitBtnText}>Hilfe anfragen</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <DateTimePickerModal visible={showDTP} initial={wann ?? new Date()} onConfirm={d => { setWann(d); setShowDTP(false); }} onCancel={() => setShowDTP(false)} />
    </Modal>
  );
}

const fm = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 0.5, borderColor: colors.border },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  closeBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' },
  closeText:   { fontSize: 14, color: colors.textMid },
  stepRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  stepDot:        { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border },
  stepDotActive:  { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
  stepLine:       { width: 40, height: 2, backgroundColor: colors.border, marginHorizontal: 6 },
  stepLineActive: { backgroundColor: colors.primary },
  scrollContent: { paddingBottom: 24 },
  stepContent:   { padding: 20, gap: 14 },
  stepTitle:     { fontSize: 22, fontWeight: '600', color: colors.text },
  stepSub:       { fontSize: 14, color: colors.textMuted, marginTop: -8 },
  typeGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  tile:         { width: '47%', borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.bgAlt, padding: 18, gap: 6, alignItems: 'center' },
  tileActive:   { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  tileEmoji:    { fontSize: 32 },
  tileLabel:    { fontSize: 15, fontWeight: '600', color: colors.textMid },
  tileLabelActive: { color: colors.primary },
  tileHint:     { fontSize: 11, color: colors.textMuted, textAlign: 'center', lineHeight: 15 },
  backType:       { flexDirection: 'row' },
  backTypeText:   { fontSize: 13, color: colors.textMid },
  backTypeChange: { color: colors.primary, fontWeight: '500' },
  label:    { fontSize: 13, color: colors.textMuted, fontWeight: '500', marginBottom: -6 },
  labelOpt: { fontWeight: '400', color: colors.border },
  input:    { backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 13, fontSize: 15 },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  datePicker:          { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 13 },
  datePickerFilled:    { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  datePickerEmoji:     { fontSize: 18 },
  datePickerText:      { flex: 1, fontSize: 15, color: colors.textMuted },
  datePickerTextFilled:{ color: colors.primary, fontWeight: '500' },
  datePickerClear:     { color: colors.textMuted, fontSize: 14, padding: 2 },
  footer:           { padding: 16, borderTopWidth: 0.5, borderColor: colors.border, backgroundColor: colors.bg },
  submitBtn:        { backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
  submitBtnDisabled:{ backgroundColor: colors.border },
  submitBtnText:    { color: '#fff', fontSize: 16, fontWeight: '600' },
});

// ─── Notfall Card ─────────────────────────────────────────────────────────────
function NotfallCard({ item, currentUser, onToggleHelfer, onToggleGedeckt, onOpen }) {
  const type    = typeById(item.type);
  const isOwn   = item.autor === currentUser;
  const ichHelfe= item.helfer.includes(currentUser);
  const wannStr = item.wann ? formatDate(item.wann) : null;

  return (
    <TouchableOpacity style={[cd.wrap, item.gedeckt && cd.wrapDim]} onPress={onOpen} activeOpacity={0.82}>
      <View style={cd.top}>
        <View style={[cd.icon, item.gedeckt && cd.iconDim]}>
          <Text style={cd.iconEmoji}>{type.emoji}</Text>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[cd.titel, item.gedeckt && cd.titelDim]} numberOfLines={2}>{item.titel}</Text>
          <View style={cd.metaRow}>
            <Text style={cd.meta}>{item.autor}</Text>
            <Text style={cd.metaDot}>·</Text>
            <Text style={cd.meta}>{relativeTime(item.ts)}</Text>
            {isOwn && <View style={cd.ownBadge}><Text style={cd.ownBadgeText}>Du</Text></View>}
          </View>
        </View>
        {item.gedeckt ? (
          <View style={[cd.status, cd.statusGreen]}><Text style={cd.statusText}>Gedeckt</Text></View>
        ) : item.helfer.length > 0 ? (
          <View style={[cd.status, cd.statusYellow]}><Text style={cd.statusText}>{item.helfer.length} hilft</Text></View>
        ) : (
          <View style={[cd.status, cd.statusRed]}><Text style={cd.statusText}>Offen</Text></View>
        )}
      </View>
      {wannStr && (
        <View style={cd.wannRow}>
          <View style={cd.wannPill}><Text style={cd.wannText}>🕐 {wannStr}</Text></View>
        </View>
      )}
      {!!item.text && <Text style={cd.body} numberOfLines={2}>{item.text}</Text>}
      <View style={cd.divider} />
      {isOwn ? (
        <View style={cd.ownerRow}>
          {item.helfer.length > 0 ? (
            <View style={cd.helferInfo}>
              <View style={cd.avatarStrip}>
                {item.helfer.slice(0, 4).map((name, i) => (
                  <View key={name} style={[cd.avatar, { marginLeft: i > 0 ? -6 : 0 }]}>
                    <Text style={cd.avatarTxt}>{name[0]}</Text>
                  </View>
                ))}
              </View>
              <Text style={cd.helferNames} numberOfLines={1}>
                {item.helfer.slice(0, 2).join(', ')}{item.helfer.length > 2 ? ` +${item.helfer.length - 2}` : ''}
              </Text>
            </View>
          ) : <Text style={cd.noHelfer}>Noch keine Zusagen</Text>}
          <TouchableOpacity style={[cd.manageBtn, item.gedeckt && cd.manageBtnSolved]} onPress={() => onToggleGedeckt(item.id)}>
            <Text style={[cd.manageTxt, item.gedeckt && cd.manageTxtSolved]}>{item.gedeckt ? 'Wieder öffnen' : 'Als gedeckt markieren'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={[cd.helfeBtn, ichHelfe && cd.helfeBtnActive, item.gedeckt && cd.helfeBtnDone]}
          onPress={() => !item.gedeckt && onToggleHelfer(item.id)} activeOpacity={item.gedeckt ? 1 : 0.75}>
          {ichHelfe ? <Text style={cd.helfeTxtActive}>Ich helfe · Zusage zurückziehen</Text>
            : item.gedeckt ? <Text style={cd.helfeTxtDone}>Bereits gedeckt</Text>
            : <Text style={cd.helfeTxt}>🙋 Ich helfe!</Text>}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const cd = StyleSheet.create({
  wrap:     { backgroundColor: colors.bgAlt, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.primary, gap: 10 },
  wrapDim:  { opacity: 0.6 },
  top:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  icon:     { width: 46, height: 46, borderRadius: 13, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconDim:  { backgroundColor: '#e8f5e9' },
  iconEmoji:{ fontSize: 22 },
  titel:    { fontSize: 14, fontWeight: '600', color: colors.text, lineHeight: 20 },
  titelDim: { textDecorationLine: 'line-through', color: colors.textMuted },
  metaRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  meta:     { fontSize: 12, color: colors.textMuted },
  metaDot:  { fontSize: 12, color: colors.border },
  ownBadge: { paddingHorizontal: 6, paddingVertical: 1, backgroundColor: colors.primaryMid, borderRadius: 8 },
  ownBadgeText: { fontSize: 10, color: colors.primary, fontWeight: '600' },
  status:      { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, flexShrink: 0 },
  statusRed:   { backgroundColor: '#FFEBEE' },
  statusYellow:{ backgroundColor: '#FFF8E1' },
  statusGreen: { backgroundColor: '#E8F5E9' },
  statusText:  { fontSize: 11, fontWeight: '600', color: colors.textMid },
  wannRow:  { flexDirection: 'row' },
  wannPill: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#FFF3E0', borderRadius: 20 },
  wannText: { fontSize: 13, color: '#D4700A', fontWeight: '500' },
  body:     { fontSize: 13, color: colors.textLight, lineHeight: 19 },
  divider:  { height: 0.5, backgroundColor: colors.border },
  ownerRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  helferInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  avatarStrip:{ flexDirection: 'row' },
  avatar:     { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.bgAlt },
  avatarTxt:  { fontSize: 10, fontWeight: '700', color: colors.primary },
  helferNames:{ fontSize: 12, color: colors.textMid, flex: 1 },
  noHelfer:   { fontSize: 12, color: colors.textMuted, flex: 1 },
  manageBtn:  { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, flexShrink: 0 },
  manageBtnSolved:  { borderColor: '#7bc47b', backgroundColor: '#edfaed' },
  manageTxt:        { fontSize: 12, color: colors.textMid, fontWeight: '500' },
  manageTxtSolved:  { color: '#3a8a3a' },
  helfeBtn:       { borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.bg },
  helfeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  helfeBtnDone:   { borderColor: colors.border, backgroundColor: colors.bgAlt },
  helfeTxt:       { fontSize: 15, color: colors.primary, fontWeight: '600' },
  helfeTxtActive: { fontSize: 14, color: '#fff', fontWeight: '600' },
  helfeTxtDone:   { fontSize: 14, color: colors.textMuted },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function NotfallScreen({ navigation, route }) {
  const { currentUser, notfaelle, addNotfall, toggleHelfer, toggleGedeckt } = useTratsch();
  const [typeFilter,    setTypeFilter]    = useState(null);
  const [showOnlyOpen,  setShowOnlyOpen]  = useState(false);
  const [showForm,      setShowForm]      = useState(false);
  const [detailItem,    setDetailItem]    = useState(null);

  // ── Deep-link from dashboard ──────────────────────────────────────────────
  useEffect(() => {
    const id     = route?.params?.openNotfallId;
    const filter = route?.params?.openFilter;
    if (filter === 'offen') setShowOnlyOpen(true);
    if (id) {
      const item = notfaelle.find(n => n.id === id);
      if (item) setDetailItem(item);
    }
    if (id || filter) navigation.setParams({ openNotfallId: undefined, openFilter: undefined });
  }, [route?.params?.openNotfallId, route?.params?.openFilter]);

  // Keep detailItem live with context changes
  const liveDetailItem = useMemo(
    () => detailItem ? notfaelle.find(n => n.id === detailItem.id) ?? null : null,
    [detailItem, notfaelle]
  );

  const filtered = useMemo(() => {
    let r = notfaelle;
    if (showOnlyOpen) r = r.filter(n => !n.gedeckt);
    if (typeFilter)   r = r.filter(n => n.type === typeFilter);
    return r;
  }, [notfaelle, typeFilter, showOnlyOpen]);

  const offenCount    = notfaelle.filter(n => !n.gedeckt).length;
  const ichHelfeCount = notfaelle.filter(n => n.helfer.includes(currentUser)).length;

  return (
    <View style={sc.container}>
      <View style={sc.summary}>
        <View style={sc.summaryItem}><Text style={sc.summaryNum}>{offenCount}</Text><Text style={sc.summaryLbl}>Offen</Text></View>
        <View style={sc.summaryDiv} />
        <View style={sc.summaryItem}><Text style={sc.summaryNum}>{notfaelle.filter(n => n.gedeckt).length}</Text><Text style={sc.summaryLbl}>Gedeckt</Text></View>
        <View style={sc.summaryDiv} />
        <View style={sc.summaryItem}><Text style={sc.summaryNum}>{ichHelfeCount}</Text><Text style={sc.summaryLbl}>Ich helfe</Text></View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={sc.filterBar} contentContainerStyle={sc.filterContent}>
        <TouchableOpacity style={[sc.chip, !typeFilter && !showOnlyOpen && sc.chipActive]} onPress={() => { setTypeFilter(null); setShowOnlyOpen(false); }}>
          <Text style={[sc.chipText, !typeFilter && !showOnlyOpen && sc.chipTextActive]}>Alle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[sc.chip, showOnlyOpen && sc.chipOffen]} onPress={() => setShowOnlyOpen(v => !v)}>
          <Text style={[sc.chipText, showOnlyOpen && sc.chipOffenText]}>🔴 Offen</Text>
        </TouchableOpacity>
        {TYPES.map(t => (
          <TouchableOpacity key={t.id} style={[sc.chip, typeFilter === t.id && sc.chipActive]} onPress={() => setTypeFilter(typeFilter === t.id ? null : t.id)}>
            <Text style={[sc.chipText, typeFilter === t.id && sc.chipTextActive]}>{t.emoji} {t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={[sc.list, filtered.length === 0 && sc.listCenter]}
        renderItem={({ item }) => (
          <NotfallCard item={item} currentUser={currentUser}
            onToggleHelfer={toggleHelfer}
            onToggleGedeckt={toggleGedeckt}
            onOpen={() => setDetailItem(item)} />
        )}
        ListEmptyComponent={
          <View style={sc.empty}>
            <Text style={sc.emptyEmoji}>{typeFilter || showOnlyOpen ? '🔍' : '🙌'}</Text>
            <Text style={sc.emptyTitle}>{typeFilter || showOnlyOpen ? 'Keine Einträge' : 'Alles ruhig!'}</Text>
            <Text style={sc.emptySub}>{showOnlyOpen ? 'Gerade sind alle Notfälle gedeckt!' : typeFilter ? 'Keine Notfälle in dieser Kategorie' : 'Gerade braucht niemand Hilfe.'}</Text>
          </View>
        }
      />

      <TouchableOpacity style={sc.fab} onPress={() => setShowForm(true)}>
        <Text style={sc.fabText}>🆘  Hilfe anfragen</Text>
      </TouchableOpacity>

      <NewNotfallModal visible={showForm} onSubmit={addNotfall} onClose={() => setShowForm(false)} />

      <NotfallDetailModal
        item={liveDetailItem}
        visible={!!liveDetailItem}
        currentUser={currentUser}
        onClose={() => setDetailItem(null)}
        onToggleHelfer={toggleHelfer}
        onToggleGedeckt={toggleGedeckt}
      />
    </View>
  );
}

const sc = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.bg },
  summary:      { flexDirection: 'row', alignItems: 'center', margin: 12, marginBottom: 4, backgroundColor: colors.primaryLight, borderRadius: 14, paddingVertical: 12, borderWidth: 0.5, borderColor: colors.primaryMid },
  summaryItem:  { flex: 1, alignItems: 'center' },
  summaryNum:   { fontSize: 22, fontWeight: '700', color: colors.primary },
  summaryLbl:   { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  summaryDiv:   { width: 0.5, height: 30, backgroundColor: colors.primaryMid },
  filterBar:    { height: 48 },
  filterContent:{ paddingHorizontal: 12, paddingVertical: 6, gap: 6, flexDirection: 'row', alignItems: 'center' },
  chip:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.bgAlt, borderWidth: 0.5, borderColor: colors.border },
  chipActive:   { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  chipText:     { fontSize: 12, color: colors.textMid },
  chipTextActive:{ color: colors.primary, fontWeight: '500' },
  chipOffen:     { backgroundColor: '#FFEBEE', borderColor: '#c62828' },
  chipOffenText: { color: '#c62828', fontWeight: '600' },
  list:         { padding: 12, gap: 10, paddingBottom: 90 },
  listCenter:   { flex: 1, justifyContent: 'center' },
  empty:        { alignItems: 'center', gap: 8, paddingVertical: 48 },
  emptyEmoji:   { fontSize: 40 },
  emptyTitle:   { fontSize: 16, fontWeight: '500', color: colors.textMid },
  emptySub:     { fontSize: 13, color: colors.textMuted, textAlign: 'center', maxWidth: 240, lineHeight: 20 },
  fab:          { position: 'absolute', bottom: 16, right: 16, left: 16, backgroundColor: colors.primary, borderRadius: 14, padding: 15, alignItems: 'center' },
  fabText:      { color: '#fff', fontWeight: '600', fontSize: 15 },
});
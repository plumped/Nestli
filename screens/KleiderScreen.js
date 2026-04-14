import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  TextInput, ScrollView, Alert, Modal, Image, Dimensions,
} from 'react-native';
import { useState, useMemo, useCallback } from 'react';
import React from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useTratsch } from '../context/TratschContext';
import { colors } from '../theme';
import { relativeTime } from '../utils/time';

const SCREEN_W = Dimensions.get('window').width;

// ─── Constants ────────────────────────────────────────────────────────────────
const MODI = [
  { id: 'biete',  label: 'Ich biete',  emoji: '🎁', hint: 'Sachen weitergeben' },
  { id: 'suche',  label: 'Ich suche',  emoji: '🔍', hint: 'Etwas benoetigt' },
  { id: 'tausch', label: 'Tauschen',   emoji: '🔄', hint: 'Gegen etwas anderes' },
];
const KATEGORIEN = [
  { id: 'oberteil',  label: 'Oberteil',  emoji: '👕' },
  { id: 'hose',      label: 'Hose',      emoji: '👖' },
  { id: 'jacke',     label: 'Jacke',     emoji: '🧥' },
  { id: 'schuhe',    label: 'Schuhe',    emoji: '👟' },
  { id: 'kleid',     label: 'Kleid',     emoji: '👗' },
  { id: 'sonstiges', label: 'Sonstiges', emoji: '🧸' },
];
const GROESSEN = ['56','62','68','74','80','86','92','98','104','110','116','122','128','134','140','146','152','158','164'];
const MODUS_STYLE = {
  biete:  { bg: '#E8F5E9', text: '#2E7D32' },
  suche:  { bg: '#E3F2FD', text: '#1565C0' },
  tausch: { bg: '#FFF8E1', text: '#E65100' },
};

function modusByID(id) { return MODI.find(m => m.id === id) ?? MODI[0]; }
function katByID(id)   { return KATEGORIEN.find(k => k.id === id) ?? KATEGORIEN[5]; }

const NOW = Date.now();
const SEED = [
  {
    id: 'k1', autor: 'Sarah', modus: 'biete', kategorie: 'jacke',
    titel: 'Winterjacke Gr. 110, kaum getragen',
    text: 'Dunkelblau, Marke Reima. Nur eine Saison getragen. Sehr guter Zustand, keine Flecken.',
    groesse: '110', ts: NOW - 20 * 60000,
    bilder: [], interessenten: [], vergeben: false,
  },
  {
    id: 'k2', autor: 'Anna', modus: 'suche', kategorie: 'schuhe',
    titel: 'Turnschuhe Gr. 32 gesucht',
    text: 'Fuer den Sommer, gerne bunt. Hauptsache guter Zustand.',
    groesse: '32', ts: NOW - 2 * 3600000,
    bilder: [], interessenten: ['Julia'], vergeben: false,
  },
  {
    id: 'k3', autor: 'Julia', modus: 'tausch', kategorie: 'hose',
    titel: 'Jeans Gr. 104 gegen Gr. 110',
    text: 'Slim fit, hellblau. Biete 104, suche 110.',
    groesse: '104', ts: NOW - 5 * 3600000,
    bilder: [], interessenten: [], vergeben: false,
  },
  {
    id: 'k4', autor: 'Monika', modus: 'biete', kategorie: 'kleid',
    titel: 'Sommerkleid Gr. 116, wie neu',
    text: 'Geblumtes Kleid, nur zweimal getragen.',
    groesse: '116', ts: NOW - 1 * 3600000,
    bilder: [], interessenten: ['Sarah', 'Petra'], vergeben: false,
  },
];

// ─── Image Picker Helper ──────────────────────────────────────────────────────
async function pickImages(current, onDone) {
  const remaining = 3 - current.length;
  if (remaining <= 0) return;
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Berechtigung benoetigt', 'Bitte erlaube den Zugriff auf deine Fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });
    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri).slice(0, remaining);
      onDone([...current, ...uris]);
    }
  } catch {
    Alert.alert('Fehler', 'Fotos konnten nicht geladen werden.');
  }
}

// ─── Photo Strip (form) ───────────────────────────────────────────────────────
function PhotoStrip({ bilder, onChange }) {
  return (
    <View style={ph.row}>
      {bilder.map((uri, i) => (
        <View key={i} style={ph.thumb}>
          <Image source={{ uri }} style={ph.thumbImg} resizeMode="cover" />
          <TouchableOpacity
            style={ph.removeBtn}
            onPress={() => onChange(bilder.filter((_, j) => j !== i))}
          >
            <Text style={ph.removeText}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
      {bilder.length < 3 && (
        <TouchableOpacity
          style={ph.addBtn}
          onPress={() => pickImages(bilder, onChange)}
        >
          <Text style={ph.addIcon}>📷</Text>
          <Text style={ph.addText}>{bilder.length === 0 ? 'Fotos' : '+'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const ph = StyleSheet.create({
  row:       { flexDirection: 'row', gap: 10 },
  thumb:     { width: 88, height: 88, borderRadius: 12, overflow: 'visible' },
  thumbImg:  { width: 88, height: 88, borderRadius: 12 },
  removeBtn: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  removeText:{ color: '#fff', fontSize: 11, fontWeight: '700' },
  addBtn:    { width: 88, height: 88, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center', gap: 4 },
  addIcon:   { fontSize: 22 },
  addText:   { fontSize: 11, color: colors.textMuted },
});

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ item, visible, currentUser, onClose, onToggleInteresse, onToggleVergeben, onEdit }) {
  const [photoIdx, setPhotoIdx] = useState(0);

  if (!item) return null;

  const modus      = modusByID(item.modus);
  const kat        = katByID(item.kategorie);
  const isOwn      = item.autor === currentUser;
  const ichWill    = item.interessenten.includes(currentUser);
  const modusColor = MODUS_STYLE[item.modus] ?? MODUS_STYLE.biete;
  const hasPhotos  = item.bilder && item.bilder.length > 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={dt.container}>
        {/* Header */}
        <View style={dt.header}>
          <TouchableOpacity onPress={onClose} style={dt.closeBtn}>
            <Text style={dt.closeTxt}>✕</Text>
          </TouchableOpacity>
          <Text style={dt.headerTitle} numberOfLines={1}>{item.titel}</Text>
          {isOwn ? (
            <TouchableOpacity onPress={() => onEdit(item)} style={dt.editBtn}>
              <Text style={dt.editTxt}>Bearbeiten</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 80 }} />
          )}
        </View>

        <ScrollView contentContainerStyle={dt.scroll} showsVerticalScrollIndicator={false}>
          {/* Photo carousel */}
          {hasPhotos ? (
            <View style={dt.carousel}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={e => {
                  setPhotoIdx(Math.round(e.nativeEvent.contentOffset.x / (SCREEN_W)));
                }}
              >
                {item.bilder.map((uri, i) => (
                  <Image key={i} source={{ uri }} style={dt.carouselImg} resizeMode="cover" />
                ))}
              </ScrollView>
              {item.bilder.length > 1 && (
                <View style={dt.dots}>
                  {item.bilder.map((_, i) => (
                    <View key={i} style={[dt.dot, i === photoIdx && dt.dotActive]} />
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={dt.noPhoto}>
              <Text style={dt.noPhotoEmoji}>{kat.emoji}</Text>
              <Text style={dt.noPhotoText}>Kein Foto</Text>
            </View>
          )}

          {/* Content */}
          <View style={dt.content}>
            {/* Modus + status badges */}
            <View style={dt.badgeRow}>
              <View style={[dt.badge, { backgroundColor: modusColor.bg }]}>
                <Text style={[dt.badgeTxt, { color: modusColor.text }]}>
                  {modus.emoji} {modus.label}
                </Text>
              </View>
              {item.groesse && (
                <View style={dt.badge}>
                  <Text style={dt.badgeTxt}>Gr. {item.groesse}</Text>
                </View>
              )}
              <View style={dt.badge}>
                <Text style={dt.badgeTxt}>{kat.emoji} {kat.label}</Text>
              </View>
              {item.vergeben && (
                <View style={[dt.badge, { backgroundColor: '#E8F5E9' }]}>
                  <Text style={[dt.badgeTxt, { color: '#2E7D32' }]}>✅ Vergeben</Text>
                </View>
              )}
            </View>

            {/* Title */}
            <Text style={dt.titel}>{item.titel}</Text>

            {/* Meta */}
            <View style={dt.metaRow}>
              <View style={dt.avatarSmall}>
                <Text style={dt.avatarSmallTxt}>{item.autor[0]}</Text>
              </View>
              <Text style={dt.meta}>{item.autor}</Text>
              <Text style={dt.metaDot}>·</Text>
              <Text style={dt.meta}>{relativeTime(item.ts)}</Text>
            </View>

            {/* Description */}
            {!!item.text && (
              <View style={dt.descBox}>
                <Text style={dt.desc}>{item.text}</Text>
              </View>
            )}

            {/* Interessenten (owner view) */}
            {isOwn && item.interessenten.length > 0 && (
              <View style={dt.interessentenBox}>
                <Text style={dt.interessentenTitle}>
                  {item.interessenten.length} Person{item.interessenten.length !== 1 ? 'en' : ''} interessiert
                </Text>
                <View style={dt.interessentenList}>
                  {item.interessenten.map(name => (
                    <View key={name} style={dt.interessentRow}>
                      <View style={dt.avatarSmall}>
                        <Text style={dt.avatarSmallTxt}>{name[0]}</Text>
                      </View>
                      <Text style={dt.interessentName}>{name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Action footer */}
        <View style={dt.footer}>
          {isOwn ? (
            <TouchableOpacity
              style={[dt.actionBtn, item.vergeben && dt.actionBtnSolved]}
              onPress={() => { onToggleVergeben(item.id); onClose(); }}
            >
              <Text style={[dt.actionTxt, item.vergeben && dt.actionTxtSolved]}>
                {item.vergeben ? 'Wieder verfugbar markieren' : '✅ Als vergeben markieren'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                dt.actionBtn,
                ichWill       && dt.actionBtnActive,
                item.vergeben && dt.actionBtnDone,
              ]}
              onPress={() => { if (!item.vergeben) onToggleInteresse(item.id); }}
              activeOpacity={item.vergeben ? 1 : 0.75}
            >
              {ichWill ? (
                <Text style={dt.actionTxtActive}>Interesse gemeldet · Zuruck ziehen</Text>
              ) : item.vergeben ? (
                <Text style={dt.actionTxtDone}>Bereits vergeben</Text>
              ) : item.modus === 'suche' ? (
                <Text style={dt.actionTxt}>🙋  Ich habe das!</Text>
              ) : (
                <Text style={dt.actionTxt}>🙋  Ich nehme das!</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const dt = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 0.5, borderColor: colors.border },
  headerTitle: { fontSize: 15, fontWeight: '600', color: colors.text, flex: 1, textAlign: 'center' },
  closeBtn:  { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' },
  closeTxt:  { fontSize: 14, color: colors.textMid },
  editBtn:   { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.primaryLight },
  editTxt:   { fontSize: 13, color: colors.primary, fontWeight: '600' },

  scroll: { paddingBottom: 90 },

  carousel:    { width: SCREEN_W, height: 280 },
  carouselImg: { width: SCREEN_W, height: 280 },
  dots:        { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot:         { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive:   { backgroundColor: '#fff', width: 18, borderRadius: 3 },

  noPhoto:     { height: 180, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', gap: 8 },
  noPhotoEmoji:{ fontSize: 48 },
  noPhotoText: { fontSize: 13, color: colors.textMuted },

  content:  { padding: 20, gap: 14 },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  badge:    { paddingHorizontal: 9, paddingVertical: 4, backgroundColor: colors.primaryLight, borderRadius: 20 },
  badgeTxt: { fontSize: 12, color: colors.primary, fontWeight: '500' },
  titel:    { fontSize: 20, fontWeight: '700', color: colors.text, lineHeight: 26 },
  metaRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta:     { fontSize: 13, color: colors.textMuted },
  metaDot:  { color: colors.border },

  avatarSmall:    { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarSmallTxt: { fontSize: 11, fontWeight: '700', color: colors.primary },

  descBox: { backgroundColor: colors.bgAlt, borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: colors.border },
  desc:    { fontSize: 14, color: colors.textMid, lineHeight: 21 },

  interessentenBox:   { backgroundColor: colors.primaryLight, borderRadius: 12, padding: 14, gap: 10 },
  interessentenTitle: { fontSize: 13, fontWeight: '600', color: colors.primary },
  interessentenList:  { gap: 8 },
  interessentRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  interessentName:    { fontSize: 14, color: colors.textMid },

  footer:         { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 24, backgroundColor: colors.bg, borderTopWidth: 0.5, borderColor: colors.border },
  actionBtn:      { borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.bg },
  actionBtnActive:{ backgroundColor: colors.primary, borderColor: colors.primary },
  actionBtnDone:  { borderColor: colors.border, backgroundColor: colors.bgAlt },
  actionBtnSolved:{ borderColor: '#7bc47b', backgroundColor: '#edfaed' },
  actionTxt:      { fontSize: 16, color: colors.primary, fontWeight: '600' },
  actionTxtActive:{ fontSize: 15, color: '#fff', fontWeight: '600' },
  actionTxtDone:  { fontSize: 15, color: colors.textMuted },
  actionTxtSolved:{ fontSize: 15, color: '#3a8a3a', fontWeight: '600' },
});

// ─── New / Edit Item Form Modal ───────────────────────────────────────────────
function NewKleiderModal({ visible, onSubmit, onClose, editItem }) {
  const isEdit = !!editItem;

  const [step,      setStep]      = useState(isEdit ? 3 : 1);
  const [modus,     setModus]     = useState(editItem?.modus     ?? null);
  const [kategorie, setKategorie] = useState(editItem?.kategorie ?? null);
  const [titel,     setTitel]     = useState(editItem?.titel     ?? '');
  const [text,      setText]      = useState(editItem?.text      ?? '');
  const [groesse,   setGroesse]   = useState(editItem?.groesse   ?? null);
  const [bilder,    setBilder]    = useState(editItem?.bilder    ?? []);

  // Sync when editItem changes (e.g. opening different item)
  const prevEdit = React.useRef(null);
  if (editItem && editItem !== prevEdit.current) {
    prevEdit.current = editItem;
    setTimeout(() => {
      setStep(3); setModus(editItem.modus); setKategorie(editItem.kategorie);
      setTitel(editItem.titel); setText(editItem.text);
      setGroesse(editItem.groesse); setBilder(editItem.bilder ?? []);
    }, 0);
  }

  function reset() {
    setStep(1); setModus(null); setKategorie(null);
    setTitel(''); setText(''); setGroesse(null); setBilder([]);
    prevEdit.current = null;
  }
  function close() { reset(); onClose(); }

  function submit() {
    if (!titel.trim()) return;
    onSubmit({ modus: modus ?? 'biete', kategorie: kategorie ?? 'sonstiges', titel: titel.trim(), text: text.trim(), groesse, bilder });
    close();
  }

  const selectedModus = modus ? modusByID(modus) : null;
  const selectedKat   = kategorie ? katByID(kategorie) : null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={fm.container}>
        <View style={fm.header}>
          <TouchableOpacity onPress={close} style={fm.closeBtn}>
            <Text style={fm.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={fm.headerTitle}>{isEdit ? 'Inserat bearbeiten' : 'Inserat erstellen'}</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Step dots */}
        <View style={fm.stepRow}>
          <View style={fm.stepDotActive} />
          <View style={[fm.stepLine, step >= 2 && fm.stepLineActive]} />
          <View style={[fm.stepDot, step >= 2 && fm.stepDotActive]} />
          <View style={[fm.stepLine, step >= 3 && fm.stepLineActive]} />
          <View style={[fm.stepDot, step >= 3 && fm.stepDotActive]} />
        </View>

        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={fm.scrollContent}>

          {/* Step 1: Modus */}
          {step === 1 && (
            <View style={fm.stepContent}>
              <Text style={fm.stepTitle}>Was moechtest du?</Text>
              <Text style={fm.stepSub}>Tippe auf eine Option</Text>
              <View style={fm.modiGrid}>
                {MODI.map(m => (
                  <TouchableOpacity
                    key={m.id}
                    style={[fm.modusTile, modus === m.id && fm.modusTileActive]}
                    onPress={() => { setModus(m.id); setStep(2); }}
                    activeOpacity={0.75}
                  >
                    <Text style={fm.modusTileEmoji}>{m.emoji}</Text>
                    <Text style={[fm.modusTileLabel, modus === m.id && fm.modusTileLabelActive]}>{m.label}</Text>
                    <Text style={fm.modusTileHint}>{m.hint}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Step 2: Kategorie */}
          {step === 2 && (
            <View style={fm.stepContent}>
              <TouchableOpacity style={fm.backRow} onPress={() => setStep(1)}>
                <Text style={fm.backText}>{selectedModus?.emoji} {selectedModus?.label}{'  '}<Text style={fm.backChange}>andern</Text></Text>
              </TouchableOpacity>
              <Text style={fm.stepTitle}>Was fuer ein Kleidungsstueck?</Text>
              <View style={fm.katGrid}>
                {KATEGORIEN.map(k => (
                  <TouchableOpacity
                    key={k.id}
                    style={[fm.katTile, kategorie === k.id && fm.katTileActive]}
                    onPress={() => { setKategorie(k.id); setStep(3); }}
                    activeOpacity={0.75}
                  >
                    <Text style={fm.katEmoji}>{k.emoji}</Text>
                    <Text style={[fm.katLabel, kategorie === k.id && fm.katLabelActive]}>{k.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Step 3: Details */}
          {step === 3 && (
            <View style={fm.stepContent}>
              <View style={fm.breadcrumb}>
                <TouchableOpacity onPress={() => setStep(1)}>
                  <Text style={fm.breadcrumbItem}>{selectedModus?.emoji} {selectedModus?.label}</Text>
                </TouchableOpacity>
                <Text style={fm.breadcrumbSep}>›</Text>
                <TouchableOpacity onPress={() => setStep(2)}>
                  <Text style={fm.breadcrumbItem}>{selectedKat?.emoji} {selectedKat?.label}</Text>
                </TouchableOpacity>
              </View>

              <Text style={fm.stepTitle}>Details</Text>

              <Text style={fm.label}>Kurze Beschreibung *</Text>
              <TextInput
                style={fm.input}
                placeholder="z.B. Winterjacke Gr. 110, kaum getragen"
                value={titel}
                onChangeText={setTitel}
                autoFocus
                returnKeyType="next"
              />

              <Text style={fm.label}>Groesse</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={fm.groesseRow}>
                {GROESSEN.map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[fm.groesseChip, groesse === g && fm.groesseChipActive]}
                    onPress={() => setGroesse(groesse === g ? null : g)}
                  >
                    <Text style={[fm.groesseText, groesse === g && fm.groesseTextActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={fm.label}>
                Fotos <Text style={fm.labelOpt}>(max. 3)</Text>
              </Text>
              <PhotoStrip bilder={bilder} onChange={setBilder} />

              <Text style={fm.label}>
                Mehr Details <Text style={fm.labelOpt}>(optional)</Text>
              </Text>
              <TextInput
                style={[fm.input, fm.textarea]}
                placeholder="Farbe, Marke, Zustand, Abholort..."
                value={text}
                onChangeText={setText}
                multiline
              />
            </View>
          )}
        </ScrollView>

        {step === 3 && (
          <View style={fm.footer}>
            <TouchableOpacity
              style={[fm.submitBtn, !titel.trim() && fm.submitBtnDisabled]}
              onPress={submit}
              disabled={!titel.trim()}
            >
              <Text style={fm.submitBtnText}>Inserat aufschalten</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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

  modiGrid:          { flexDirection: 'row', gap: 10, marginTop: 4 },
  modusTile:         { flex: 1, borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.bgAlt, padding: 14, gap: 6, alignItems: 'center' },
  modusTileActive:   { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  modusTileEmoji:    { fontSize: 28 },
  modusTileLabel:    { fontSize: 13, fontWeight: '600', color: colors.textMid, textAlign: 'center' },
  modusTileLabelActive: { color: colors.primary },
  modusTileHint:     { fontSize: 10, color: colors.textMuted, textAlign: 'center', lineHeight: 14 },

  katGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  katTile:       { width: '30.5%', borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.bgAlt, paddingVertical: 14, alignItems: 'center', gap: 6 },
  katTileActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  katEmoji:      { fontSize: 26 },
  katLabel:      { fontSize: 12, fontWeight: '500', color: colors.textMid },
  katLabelActive:{ color: colors.primary },

  breadcrumb:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  breadcrumbItem: { fontSize: 13, color: colors.primary, fontWeight: '500' },
  breadcrumbSep:  { fontSize: 13, color: colors.textMuted },
  backRow:        { flexDirection: 'row' },
  backText:       { fontSize: 13, color: colors.textMid },
  backChange:     { color: colors.primary, fontWeight: '500' },

  label:    { fontSize: 13, color: colors.textMuted, fontWeight: '500', marginBottom: -6 },
  labelOpt: { fontWeight: '400', color: colors.border },
  input:    { backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 13, fontSize: 15 },
  textarea: { minHeight: 80, textAlignVertical: 'top' },

  groesseRow:        { paddingVertical: 4, gap: 8 },
  groesseChip:       { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgAlt },
  groesseChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  groesseText:       { fontSize: 13, color: colors.textMid, fontWeight: '500' },
  groesseTextActive: { color: colors.primary },

  footer:            { padding: 16, borderTopWidth: 0.5, borderColor: colors.border, backgroundColor: colors.bg },
  submitBtn:         { backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: colors.border },
  submitBtnText:     { color: '#fff', fontSize: 16, fontWeight: '600' },
});

// ─── Kleider Card ─────────────────────────────────────────────────────────────
function KleiderCard({ item, currentUser, onToggleInteresse, onToggleVergeben, onOpen }) {
  const modus      = modusByID(item.modus);
  const kat        = katByID(item.kategorie);
  const isOwn      = item.autor === currentUser;
  const ichWill    = item.interessenten.includes(currentUser);
  const modusColor = MODUS_STYLE[item.modus] ?? MODUS_STYLE.biete;
  const hasPhotos  = item.bilder && item.bilder.length > 0;

  return (
    <TouchableOpacity style={[cd.wrap, item.vergeben && cd.wrapDim]} onPress={onOpen} activeOpacity={0.88}>
      {/* Photo: first image full width, rest as small strip */}
      {hasPhotos && (
        <View style={cd.photoWrap}>
          <Image source={{ uri: item.bilder[0] }} style={cd.photoMain} resizeMode="cover" />
          {item.bilder.length > 1 && (
            <View style={cd.photoThumbRow}>
              {item.bilder.slice(1).map((uri, i) => (
                <Image key={i} source={{ uri }} style={cd.photoThumb} resizeMode="cover" />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Top row */}
      <View style={cd.top}>
        <View style={[cd.icon, hasPhotos && cd.iconSmall]}>
          <Text style={[cd.iconEmoji, hasPhotos && cd.iconEmojiSmall]}>{kat.emoji}</Text>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[cd.titel, item.vergeben && cd.titelDim]} numberOfLines={2}>{item.titel}</Text>
          <View style={cd.metaRow}>
            <Text style={cd.meta}>{item.autor}</Text>
            <Text style={cd.metaDot}>·</Text>
            <Text style={cd.meta}>{relativeTime(item.ts)}</Text>
            {isOwn && <View style={cd.ownBadge}><Text style={cd.ownBadgeTxt}>Du</Text></View>}
          </View>
        </View>
        {item.vergeben ? (
          <View style={[cd.status, { backgroundColor: '#E8F5E9' }]}>
            <Text style={[cd.statusTxt, { color: '#2E7D32' }]}>Vergeben</Text>
          </View>
        ) : (
          <View style={[cd.status, { backgroundColor: modusColor.bg }]}>
            <Text style={[cd.statusTxt, { color: modusColor.text }]}>{modus.emoji} {modus.label}</Text>
          </View>
        )}
      </View>

      {/* Pills */}
      <View style={cd.pillRow}>
        {item.groesse && <View style={cd.pill}><Text style={cd.pillTxt}>Gr. {item.groesse}</Text></View>}
        <View style={cd.pill}><Text style={cd.pillTxt}>{kat.emoji} {kat.label}</Text></View>
        {hasPhotos && <View style={cd.pill}><Text style={cd.pillTxt}>📷 {item.bilder.length} Foto{item.bilder.length > 1 ? 's' : ''}</Text></View>}
      </View>

      {!!item.text && <Text style={cd.body} numberOfLines={2}>{item.text}</Text>}

      <View style={cd.divider} />

      {/* Actions */}
      {isOwn ? (
        <View style={cd.ownerRow}>
          {item.interessenten.length > 0 ? (
            <View style={cd.interesseInfo}>
              <View style={cd.avatarStrip}>
                {item.interessenten.slice(0, 4).map((name, i) => (
                  <View key={name} style={[cd.avatar, { marginLeft: i > 0 ? -6 : 0 }]}>
                    <Text style={cd.avatarTxt}>{name[0]}</Text>
                  </View>
                ))}
              </View>
              <Text style={cd.interesseNames} numberOfLines={1}>
                {item.interessenten.slice(0, 2).join(', ')}{item.interessenten.length > 2 ? ` +${item.interessenten.length - 2}` : ''}
              </Text>
            </View>
          ) : (
            <Text style={cd.noInteresse}>Noch keine Meldungen</Text>
          )}
          <TouchableOpacity
            style={[cd.manageBtn, item.vergeben && cd.manageBtnDone]}
            onPress={() => onToggleVergeben(item.id)}
          >
            <Text style={[cd.manageTxt, item.vergeben && cd.manageTxtDone]}>
              {item.vergeben ? 'Wieder verfugbar' : 'Als vergeben markieren'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[cd.interBtn, ichWill && cd.interBtnActive, item.vergeben && cd.interBtnDone]}
          onPress={() => !item.vergeben && onToggleInteresse(item.id)}
          activeOpacity={item.vergeben ? 1 : 0.75}
        >
          {ichWill ? (
            <Text style={cd.interTxtActive}>Interesse gemeldet  ·  Zuruck ziehen</Text>
          ) : item.vergeben ? (
            <Text style={cd.interTxtDone}>Bereits vergeben</Text>
          ) : item.modus === 'suche' ? (
            <Text style={cd.interTxt}>🙋  Ich habe das!</Text>
          ) : (
            <Text style={cd.interTxt}>🙋  Ich nehme das!</Text>
          )}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const cd = StyleSheet.create({
  wrap:          { backgroundColor: colors.bgAlt, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.primary, gap: 10, overflow: 'hidden' },
  wrapDim:       { opacity: 0.55 },
  photoWrap:     { marginHorizontal: -16, marginTop: -16, marginBottom: 0 },
  photoMain:     { width: '100%', height: 180 },
  photoThumbRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  photoThumb:    { flex: 1, height: 72 },
  top:           { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  icon:          { width: 46, height: 46, borderRadius: 13, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconSmall:     { width: 36, height: 36, borderRadius: 10 },
  iconEmoji:     { fontSize: 22 },
  iconEmojiSmall:{ fontSize: 18 },
  titel:         { fontSize: 14, fontWeight: '600', color: colors.text, lineHeight: 20 },
  titelDim:      { textDecorationLine: 'line-through', color: colors.textMuted },
  metaRow:       { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  meta:          { fontSize: 12, color: colors.textMuted },
  metaDot:       { fontSize: 12, color: colors.border },
  ownBadge:      { paddingHorizontal: 6, paddingVertical: 1, backgroundColor: colors.primaryMid, borderRadius: 8 },
  ownBadgeTxt:   { fontSize: 10, color: colors.primary, fontWeight: '600' },
  status:        { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, flexShrink: 0 },
  statusTxt:     { fontSize: 11, fontWeight: '600' },
  pillRow:       { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pill:          { paddingHorizontal: 9, paddingVertical: 4, backgroundColor: colors.primaryLight, borderRadius: 20 },
  pillTxt:       { fontSize: 12, color: colors.primary, fontWeight: '500' },
  body:          { fontSize: 13, color: colors.textLight, lineHeight: 19 },
  divider:       { height: 0.5, backgroundColor: colors.border },
  ownerRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  interesseInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  avatarStrip:   { flexDirection: 'row' },
  avatar:        { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.bgAlt },
  avatarTxt:     { fontSize: 10, fontWeight: '700', color: colors.primary },
  interesseNames:{ fontSize: 12, color: colors.textMid, flex: 1 },
  noInteresse:   { fontSize: 12, color: colors.textMuted, flex: 1 },
  manageBtn:     { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, flexShrink: 0 },
  manageBtnDone: { borderColor: '#7bc47b', backgroundColor: '#edfaed' },
  manageTxt:     { fontSize: 12, color: colors.textMid, fontWeight: '500' },
  manageTxtDone: { color: '#3a8a3a' },
  interBtn:      { borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.bg },
  interBtnActive:{ backgroundColor: colors.primary, borderColor: colors.primary },
  interBtnDone:  { borderColor: colors.border, backgroundColor: colors.bgAlt },
  interTxt:      { fontSize: 15, color: colors.primary, fontWeight: '600' },
  interTxtActive:{ fontSize: 14, color: '#fff', fontWeight: '600' },
  interTxtDone:  { fontSize: 14, color: colors.textMuted },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function KleiderScreen() {
  const { currentUser } = useTratsch();
  const [inserate,    setInserate]    = useState(SEED);
  const [modusFilter, setModusFilter] = useState(null);
  const [katFilter,   setKatFilter]   = useState(null);
  const [showForm,    setShowForm]    = useState(false);
  const [editItem,    setEditItem]    = useState(null);
  const [detailItem,  setDetailItem]  = useState(null);

  const filtered = useMemo(() => {
    let r = inserate;
    if (modusFilter) r = r.filter(i => i.modus === modusFilter);
    if (katFilter)   r = r.filter(i => i.kategorie === katFilter);
    return r;
  }, [inserate, modusFilter, katFilter]);

  const bietenCount = inserate.filter(i => i.modus === 'biete' && !i.vergeben).length;
  const suchenCount = inserate.filter(i => i.modus === 'suche'  && !i.vergeben).length;
  const ichCount    = inserate.filter(i => i.interessenten.includes(currentUser)).length;

  const toggleInteresse = useCallback((id) => {
    setInserate(prev => prev.map(i => {
      if (i.id !== id || i.autor === currentUser) return i;
      const already = i.interessenten.includes(currentUser);
      return { ...i, interessenten: already ? i.interessenten.filter(h => h !== currentUser) : [...i.interessenten, currentUser] };
    }));
    setDetailItem(prev => prev?.id === id ? { ...prev, interessenten: prev.interessenten.includes(currentUser) ? prev.interessenten.filter(h => h !== currentUser) : [...prev.interessenten, currentUser] } : prev);
  }, [currentUser]);

  const toggleVergeben = useCallback((id) => {
    setInserate(prev => prev.map(i => i.id === id ? { ...i, vergeben: !i.vergeben } : i));
    setDetailItem(prev => prev?.id === id ? { ...prev, vergeben: !prev.vergeben } : prev);
  }, []);

  function handleSubmit({ modus, kategorie, titel, text, groesse, bilder }) {
    if (editItem) {
      // Update existing
      const updated = { ...editItem, modus, kategorie, titel, text, groesse, bilder };
      setInserate(prev => prev.map(i => i.id === editItem.id ? updated : i));
      setDetailItem(updated);
      setEditItem(null);
    } else {
      // Create new
      setInserate(prev => [{
        id: Date.now().toString(), autor: currentUser,
        modus, kategorie, titel, text, groesse, bilder,
        ts: Date.now(), interessenten: [], vergeben: false,
      }, ...prev]);
    }
  }

  function handleEdit(item) {
    setDetailItem(null);           // close detail first
    setTimeout(() => {             // let modal animate out before opening form
      setEditItem(item);
      setShowForm(true);
    }, 300);
  }

  return (
    <View style={sc.container}>
      {/* Summary */}
      <View style={sc.summary}>
        <View style={sc.summaryItem}>
          <Text style={[sc.summaryNum, { color: '#2E7D32' }]}>{bietenCount}</Text>
          <Text style={sc.summaryLbl}>Angebote</Text>
        </View>
        <View style={sc.summaryDiv} />
        <View style={sc.summaryItem}>
          <Text style={[sc.summaryNum, { color: '#1565C0' }]}>{suchenCount}</Text>
          <Text style={sc.summaryLbl}>Gesuche</Text>
        </View>
        <View style={sc.summaryDiv} />
        <View style={sc.summaryItem}>
          <Text style={[sc.summaryNum, { color: colors.primary }]}>{ichCount}</Text>
          <Text style={sc.summaryLbl}>Mein Interesse</Text>
        </View>
      </View>

      {/* Filter bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={sc.filterBar} contentContainerStyle={sc.filterContent}>
        <TouchableOpacity style={[sc.chip, !modusFilter && !katFilter && sc.chipActive]} onPress={() => { setModusFilter(null); setKatFilter(null); }}>
          <Text style={[sc.chipText, !modusFilter && !katFilter && sc.chipTextActive]}>Alle</Text>
        </TouchableOpacity>
        {MODI.map(m => (
          <TouchableOpacity key={m.id} style={[sc.chip, modusFilter === m.id && sc.chipActive]} onPress={() => setModusFilter(modusFilter === m.id ? null : m.id)}>
            <Text style={[sc.chipText, modusFilter === m.id && sc.chipTextActive]}>{m.emoji} {m.label}</Text>
          </TouchableOpacity>
        ))}
        <View style={sc.chipDivider} />
        {KATEGORIEN.map(k => (
          <TouchableOpacity key={k.id} style={[sc.chip, katFilter === k.id && sc.chipActive]} onPress={() => setKatFilter(katFilter === k.id ? null : k.id)}>
            <Text style={[sc.chipText, katFilter === k.id && sc.chipTextActive]}>{k.emoji} {k.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={[sc.list, filtered.length === 0 && sc.listCenter]}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <KleiderCard
            item={item}
            currentUser={currentUser}
            onToggleInteresse={toggleInteresse}
            onToggleVergeben={toggleVergeben}
            onOpen={() => setDetailItem(item)}
          />
        )}
        ListEmptyComponent={
          <View style={sc.empty}>
            <Text style={sc.emptyEmoji}>{modusFilter || katFilter ? '🔍' : '🧥'}</Text>
            <Text style={sc.emptyTitle}>{modusFilter || katFilter ? 'Keine Treffer' : 'Noch nichts hier'}</Text>
            <Text style={sc.emptySub}>{modusFilter || katFilter ? 'Versuch einen anderen Filter' : 'Sei die Erste und teile etwas!'}</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={sc.fab} onPress={() => setShowForm(true)}>
        <Text style={sc.fabText}>🧥  Inserat erstellen</Text>
      </TouchableOpacity>

      <NewKleiderModal
        visible={showForm}
        editItem={editItem}
        onSubmit={handleSubmit}
        onClose={() => { setShowForm(false); setEditItem(null); }}
      />

      <DetailModal
        item={detailItem}
        visible={!!detailItem}
        currentUser={currentUser}
        onClose={() => setDetailItem(null)}
        onToggleInteresse={toggleInteresse}
        onToggleVergeben={toggleVergeben}
        onEdit={handleEdit}
      />
    </View>
  );
}

const sc = StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.bg },
  summary:       { flexDirection: 'row', alignItems: 'center', margin: 12, marginBottom: 4, backgroundColor: colors.primaryLight, borderRadius: 14, paddingVertical: 12, borderWidth: 0.5, borderColor: colors.primaryMid },
  summaryItem:   { flex: 1, alignItems: 'center' },
  summaryNum:    { fontSize: 22, fontWeight: '700' },
  summaryLbl:    { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  summaryDiv:    { width: 0.5, height: 30, backgroundColor: colors.primaryMid },
  filterBar:     { height: 48 },
  filterContent: { paddingHorizontal: 12, paddingVertical: 6, gap: 6, flexDirection: 'row', alignItems: 'center' },
  chip:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.bgAlt, borderWidth: 0.5, borderColor: colors.border },
  chipActive:    { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  chipText:      { fontSize: 12, color: colors.textMid },
  chipTextActive:{ color: colors.primary, fontWeight: '500' },
  chipDivider:   { width: 0.5, height: 24, backgroundColor: colors.border, marginHorizontal: 4 },
  list:          { padding: 12, gap: 10, paddingBottom: 90 },
  listCenter:    { flex: 1, justifyContent: 'center' },
  empty:         { alignItems: 'center', gap: 8, paddingVertical: 48 },
  emptyEmoji:    { fontSize: 40 },
  emptyTitle:    { fontSize: 16, fontWeight: '500', color: colors.textMid },
  emptySub:      { fontSize: 13, color: colors.textMuted, textAlign: 'center', maxWidth: 240, lineHeight: 20 },
  fab:           { position: 'absolute', bottom: 16, right: 16, left: 16, backgroundColor: colors.primary, borderRadius: 14, padding: 15, alignItems: 'center' },
  fabText:       { color: '#fff', fontWeight: '600', fontSize: 15 },
});
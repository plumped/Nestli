import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Modal, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { useTratsch } from '../context/TratschContext';
import { relativeTime } from '../utils/time';
import { tagById } from '../utils/tags';
import { colors } from '../theme';

// ─── Constants ────────────────────────────────────────────────────────────────
const MODUS_STYLE = {
  biete:  { bg: '#E8F5E9', text: '#2E7D32', label: 'Biete' },
  suche:  { bg: '#E3F2FD', text: '#1565C0', label: 'Suche' },
  tausch: { bg: '#FFF8E1', text: '#E65100', label: 'Tausch' },
};
const KAT_EMOJI = {
  oberteil: '👕', hose: '👖', jacke: '🧥',
  schuhe: '👟', kleid: '👗', sonstiges: '🧸',
};

const ORT_OPTIONS = [
  { id: 'spielplatz',  label: 'Spielplatz',   emoji: '🛝' },
  { id: 'garten',      label: 'Garten',        emoji: '🌿' },
  { id: 'park',        label: 'Park',          emoji: '🌳' },
  { id: 'strasse',     label: 'Vor dem Haus',  emoji: '🏘️' },
  { id: 'sandkasten',  label: 'Sandkasten',    emoji: '🏖️' },
  { id: 'sonstiges',   label: 'Sonstiges',     emoji: '📍' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return 'Gute Nacht';
  if (h < 11) return 'Guten Morgen';
  if (h < 14) return 'Guten Mittag';
  if (h < 18) return 'Guten Nachmittag';
  return 'Guten Abend';
}

function draussenSeit(seit) {
  const min = Math.floor((Date.now() - seit) / 60000);
  if (min < 1)  return 'gerade eben';
  if (min < 60) return `seit ${min} Min`;
  return `seit ${Math.floor(min / 60)} Std`;
}

// ─── Draussen Widget ──────────────────────────────────────────────────────────
function DraussenWidget() {
  const { currentUser, draussenList, geheDraus, geheRein } = useTratsch();
  const [showOrtPicker, setShowOrtPicker] = useState(false);
  const [customOrt,     setCustomOrt]     = useState('');
  const [selectedOrt,   setSelectedOrt]   = useState(null);

  const ichDraussen = draussenList.find(d => d.autor === currentUser);
  const andereD = draussenList.filter(d => d.autor !== currentUser);

  function gueheRausPress() {
    if (ichDraussen) {
      geheRein();
    } else {
      setShowOrtPicker(true);
    }
  }

  function confirmOrt() {
    const ort = selectedOrt === 'sonstiges' && customOrt.trim()
      ? customOrt.trim()
      : ORT_OPTIONS.find(o => o.id === selectedOrt)?.label ?? 'Draussen';
    geheDraus(ort);
    setShowOrtPicker(false);
    setSelectedOrt(null);
    setCustomOrt('');
  }

  return (
    <View style={[dw.wrap, ichDraussen && dw.wrapActive]}>
      <View style={dw.headerRow}>
        <Text style={dw.title}>🛝 Wer ist gerade draussen?</Text>
        {draussenList.length > 0 && (
          <View style={dw.countBadge}>
            <Text style={dw.countText}>{draussenList.length}</Text>
          </View>
        )}
      </View>

      {draussenList.length === 0 && !ichDraussen ? (
        <Text style={dw.emptyText}>Noch niemand draussen — geh als Erste! ☀️</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={dw.scroll} contentContainerStyle={dw.scrollContent}>
          {draussenList.map(d => (
            <View key={d.id} style={[dw.person, d.autor === currentUser && dw.personMe]}>
              <View style={dw.personAvatar}>
                <Text style={dw.personAvatarText}>{d.autor[0]}</Text>
              </View>
              <Text style={dw.personName} numberOfLines={1}>{d.autor === currentUser ? 'Du' : d.autor}</Text>
              <Text style={dw.personOrt} numberOfLines={1}>{d.ort}</Text>
              <Text style={dw.personSeit}>{draussenSeit(d.seit)}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity
        style={[dw.btn, ichDraussen && dw.btnActive]}
        onPress={gueheRausPress}
      >
        <Text style={[dw.btnText, ichDraussen && dw.btnTextActive]}>
          {ichDraussen ? `📍 ${ichDraussen.ort}  ·  Bin wieder drin` : '☀️ Ich gehe raus!'}
        </Text>
      </TouchableOpacity>

      {/* Ort Picker Modal */}
      <Modal visible={showOrtPicker} transparent animationType="slide">
        <View style={dw.ortOverlay}>
          <View style={dw.ortSheet}>
            <Text style={dw.ortTitle}>Wo bist du?</Text>
            <View style={dw.ortGrid}>
              {ORT_OPTIONS.map(o => (
                <TouchableOpacity
                  key={o.id}
                  style={[dw.ortChip, selectedOrt === o.id && dw.ortChipActive]}
                  onPress={() => setSelectedOrt(o.id)}
                >
                  <Text style={dw.ortEmoji}>{o.emoji}</Text>
                  <Text style={[dw.ortLabel, selectedOrt === o.id && dw.ortLabelActive]}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {selectedOrt === 'sonstiges' && (
              <TextInput
                style={dw.ortInput}
                placeholder="z.B. Spielplatz Birkenweg..."
                value={customOrt}
                onChangeText={setCustomOrt}
                autoFocus
              />
            )}
            <View style={dw.ortBtns}>
              <TouchableOpacity style={dw.ortCancel} onPress={() => { setShowOrtPicker(false); setSelectedOrt(null); setCustomOrt(''); }}>
                <Text style={dw.ortCancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[dw.ortConfirm, !selectedOrt && dw.ortConfirmDisabled]}
                onPress={confirmOrt}
                disabled={!selectedOrt}
              >
                <Text style={dw.ortConfirmText}>Los!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const dw = StyleSheet.create({
  wrap:       { backgroundColor: '#FFF8E1', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#FFE082', gap: 10 },
  wrapActive: { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' },
  headerRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title:      { fontSize: 13, fontWeight: '600', color: '#6D4C00' },
  countBadge: { backgroundColor: '#FF8F00', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  countText:  { color: '#fff', fontSize: 11, fontWeight: '700' },
  emptyText:  { fontSize: 13, color: '#9E8000', lineHeight: 19 },
  scroll:     { maxHeight: 90 },
  scrollContent: { gap: 8, paddingVertical: 2 },
  person:     { alignItems: 'center', gap: 3, width: 64 },
  personMe:   { opacity: 1 },
  personAvatar:     { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFE082', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FFB300' },
  personAvatarText: { fontSize: 16, fontWeight: '600', color: '#6D4C00' },
  personName: { fontSize: 11, fontWeight: '600', color: '#4A3000', maxWidth: 60 },
  personOrt:  { fontSize: 10, color: '#8A6500', maxWidth: 62, textAlign: 'center' },
  personSeit: { fontSize: 10, color: '#B8860B' },
  btn:        { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#FFB300', alignItems: 'center' },
  btnActive:  { backgroundColor: '#66BB6A' },
  btnText:    { fontSize: 13, fontWeight: '600', color: '#fff' },
  btnTextActive: { color: '#fff' },
  ortOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  ortSheet:   { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, gap: 14 },
  ortTitle:   { fontSize: 17, fontWeight: '600', color: colors.text },
  ortGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  ortChip:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.bgAlt },
  ortChipActive: { borderColor: '#FFB300', backgroundColor: '#FFF8E1' },
  ortEmoji:   { fontSize: 18 },
  ortLabel:   { fontSize: 13, color: colors.textMid, fontWeight: '500' },
  ortLabelActive: { color: '#6D4C00' },
  ortInput:   { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 13, fontSize: 15 },
  ortBtns:    { flexDirection: 'row', gap: 10 },
  ortCancel:  { flex: 1, padding: 13, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  ortCancelText: { color: colors.textMid, fontWeight: '500' },
  ortConfirm:  { flex: 1, padding: 13, borderRadius: 12, backgroundColor: '#FFB300', alignItems: 'center' },
  ortConfirmDisabled: { backgroundColor: colors.border },
  ortConfirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const navigation = useNavigation();
  const {
    currentUser, profileEmoji,
    threads, answersMap, seenIds, unreadCount, markSeen,
    notfaelle, inserate,
    events,
  } = useTratsch();

  const recentThreads  = threads.slice(0, 3);
  const recentNotfall  = useMemo(() => notfaelle.filter(n => !n.gedeckt).slice(0, 2), [notfaelle]);
  const recentInserate = useMemo(() => inserate.filter(i => !i.vergeben && i.autor !== currentUser).slice(0, 3), [inserate, currentUser]);
  const upcomingEvents = useMemo(() => events.filter(e => new Date(e.datum) >= new Date()).sort((a, b) => new Date(a.datum) - new Date(b.datum)).slice(0, 2), [events]);

  const notfallOffen    = useMemo(() => notfaelle.filter(n => !n.gedeckt).length,                           [notfaelle]);
  const ichHelfe        = useMemo(() => notfaelle.filter(n => n.helfer.includes(currentUser)).length,       [notfaelle, currentUser]);
  const kleiderAngebote = useMemo(() => inserate.filter(i => i.modus === 'biete' && !i.vergeben).length,   [inserate]);
  const kleiderGesuche  = useMemo(() => inserate.filter(i => i.modus === 'suche'  && !i.vergeben).length,  [inserate]);
  const meinInteresse   = useMemo(() => inserate.filter(i => i.interessenten.includes(currentUser)).length, [inserate, currentUser]);
  const nextEvent       = upcomingEvents[0];

  function goTo(tab)          { navigation.navigate(tab); }
  function openThread(thread) { markSeen(thread.id); navigation.navigate('Tratsch', { openThreadId: thread.id }); }
  function openNotfall(item)  { navigation.navigate('Notfall', { openNotfallId: item.id }); }
  function openInserat(item)  { navigation.navigate('Kleider', { openInseratId: item.id }); }
  function goToOffen()        { navigation.navigate('Notfall', { openFilter: 'offen' }); }

  function formatEventDate(iso) {
    const d = new Date(iso);
    const now = new Date();
    const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
    const days = ['So','Mo','Di','Mi','Do','Fr','Sa'];
    if (d.toDateString() === now.toDateString()) return 'Heute';
    if (d.toDateString() === tomorrow.toDateString()) return 'Morgen';
    return `${days[d.getDay()]}, ${d.getDate()}.${d.getMonth()+1}.`;
  }

  const KAT_EMOJI_MAP = { spielnachmittag: '🛝', grillabend: '🔥', geburtstag: '🎂', ferien: '🏖️', sonstiges: '📅' };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* Hero */}
      <View style={s.hero}>
        <View style={s.heroInner}>
          <Text style={s.greeting}>{getGreeting()},</Text>
          <Text style={s.userName}>{currentUser} {profileEmoji}</Text>
          <Text style={s.heroSub}>Willkommen in eurer Community</Text>
        </View>
        <Text style={s.nestEmoji}>🪺</Text>
      </View>

      {/* Draussen Widget */}
      <DraussenWidget />

      {/* Unread banner */}
      {unreadCount > 0 && (
        <TouchableOpacity style={s.unreadBanner} onPress={() => goTo('Tratsch')} activeOpacity={0.82}>
          <View style={s.bannerLeft}>
            <View style={s.unreadDot} />
            <Text style={s.unreadText}>{unreadCount} neue{unreadCount !== 1 ? ' Themen' : 's Thema'} im Tratsch</Text>
          </View>
          <Text style={s.bannerArrow}>→</Text>
        </TouchableOpacity>
      )}

      {/* Notfall banner */}
      {notfallOffen > 0 && (
        <TouchableOpacity style={s.notfallBanner} onPress={goToOffen} activeOpacity={0.82}>
          <View style={s.bannerLeft}>
            <Text style={{ fontSize: 16 }}>🆘</Text>
            <Text style={s.notfallText}>{notfallOffen} offene{notfallOffen !== 1 ? ' Notfälle' : 'r Notfall'} – kannst du helfen?</Text>
          </View>
          <Text style={[s.bannerArrow, { color: '#D4700A' }]}>→</Text>
        </TouchableOpacity>
      )}

      {/* Quick cards */}
      <Text style={s.sectionLabel}>Bereiche</Text>
      <View style={s.quickGrid}>
        <TouchableOpacity style={[s.quickCard, { borderColor: colors.primary }]} onPress={() => goTo('Tratsch')} activeOpacity={0.78}>
          <View style={[s.quickIcon, { backgroundColor: colors.primaryLight }]}>
            <Text style={s.quickEmoji}>💬</Text>
          </View>
          {unreadCount > 0 && <View style={s.quickBadge}><Text style={s.quickBadgeText}>{unreadCount}</Text></View>}
          <Text style={s.quickTitle}>Tratsch</Text>
          <Text style={s.quickStat}>{threads.length} Themen</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.quickCard, { borderColor: notfallOffen > 0 ? '#D4700A' : colors.border }]}
          onPress={goToOffen} activeOpacity={0.78}
        >
          <View style={[s.quickIcon, { backgroundColor: notfallOffen > 0 ? '#FFF3E0' : colors.bgAlt }]}>
            <Text style={s.quickEmoji}>🤒</Text>
          </View>
          {notfallOffen > 0 && <View style={[s.quickBadge, { backgroundColor: '#D4700A' }]}><Text style={s.quickBadgeText}>{notfallOffen}</Text></View>}
          <Text style={s.quickTitle}>Notfall</Text>
          <Text style={s.quickStat}>{ichHelfe > 0 ? `Ich helfe ${ichHelfe}x` : `${notfallOffen} offen`}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.quickCard, { borderColor: colors.border }]} onPress={() => goTo('Kalender')} activeOpacity={0.78}>
          <View style={[s.quickIcon, { backgroundColor: '#E3F2FD' }]}>
            <Text style={s.quickEmoji}>📅</Text>
          </View>
          <Text style={s.quickTitle}>Kalender</Text>
          <Text style={s.quickStat}>{nextEvent ? formatEventDate(nextEvent.datum) : 'Kein Termin'}</Text>
        </TouchableOpacity>
      </View>

      {/* Nächste Termine */}
      {upcomingEvents.length > 0 && (
        <>
          <View style={s.sectionRow}>
            <Text style={s.sectionLabel}>Nächste Termine</Text>
            <TouchableOpacity onPress={() => goTo('Kalender')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.sectionLink}>Alle →</Text>
            </TouchableOpacity>
          </View>
          <View style={s.listCard}>
            {upcomingEvents.map((ev, i) => {
              const ichKomme = ev.teilnehmer.includes(currentUser);
              return (
                <TouchableOpacity
                  key={ev.id}
                  style={[s.listRow, i === upcomingEvents.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => goTo('Kalender')}
                  activeOpacity={0.72}
                >
                  <View style={[s.listAvatar, { backgroundColor: '#E3F2FD' }]}>
                    <Text style={{ fontSize: 18 }}>{KAT_EMOJI_MAP[ev.kategorie] ?? '📅'}</Text>
                  </View>
                  <View style={s.listBody}>
                    <Text style={s.listTitle} numberOfLines={1}>{ev.titel}</Text>
                    <Text style={s.listMeta}>
                      {formatEventDate(ev.datum)}{ev.uhrzeit ? ` · ${ev.uhrzeit} Uhr` : ''}{ev.ort ? `  📍 ${ev.ort}` : ''}
                    </Text>
                  </View>
                  <View style={[s.pill, ichKomme && s.pillActive]}>
                    <Text style={[s.pillText, ichKomme && s.pillTextActive]}>
                      {ichKomme ? '✓ Dabei' : `${ev.teilnehmer.length} kommen`}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {/* Offene Notfälle */}
      {recentNotfall.length > 0 && (
        <>
          <View style={s.sectionRow}>
            <Text style={s.sectionLabel}>Offene Notfälle</Text>
            <TouchableOpacity onPress={goToOffen} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.sectionLink}>Alle →</Text>
            </TouchableOpacity>
          </View>
          <View style={s.listCard}>
            {recentNotfall.map((n, i) => {
              const TYPE_EMOJI = { abholen: '🚗', betreuung: '👶', krank: '🤒', sonstiges: '❓' };
              const ichH = n.helfer.includes(currentUser);
              return (
                <TouchableOpacity
                  key={n.id}
                  style={[s.listRow, i === recentNotfall.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => openNotfall(n)}
                  activeOpacity={0.72}
                >
                  <View style={[s.listAvatar, { backgroundColor: '#FFF3E0' }]}>
                    <Text style={{ fontSize: 18 }}>{TYPE_EMOJI[n.type] ?? '❓'}</Text>
                  </View>
                  <View style={s.listBody}>
                    <Text style={s.listTitle} numberOfLines={1}>{n.titel}</Text>
                    <Text style={s.listMeta}>{n.autor} · {relativeTime(n.ts)}</Text>
                  </View>
                  <View style={[s.pill, ichH && s.pillActive]}>
                    <Text style={[s.pillText, ichH && s.pillTextActive]}>
                      {ichH ? 'Ich helfe' : `${n.helfer.length} helfen`}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {/* Neueste Themen */}
      {recentThreads.length > 0 && (
        <>
          <View style={s.sectionRow}>
            <Text style={s.sectionLabel}>Neueste Themen</Text>
            <TouchableOpacity onPress={() => goTo('Tratsch')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.sectionLink}>Alle →</Text>
            </TouchableOpacity>
          </View>
          <View style={s.listCard}>
            {recentThreads.map((thread, i) => {
              const isUnread    = !seenIds.has(thread.id);
              const answerCount = (answersMap[thread.id] ?? []).length;
              const tag         = tagById(thread.tag);
              return (
                <TouchableOpacity
                  key={thread.id}
                  style={[s.listRow, i === recentThreads.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => openThread(thread)}
                  activeOpacity={0.72}
                >
                  <View style={s.listAvatar}>
                    <Text style={s.listAvatarText}>{thread.autor[0]}</Text>
                  </View>
                  <View style={s.listBody}>
                    <View style={s.listTitleRow}>
                      {isUnread && <View style={s.unreadDotSmall} />}
                      <Text style={s.listTitle} numberOfLines={1}>{thread.titel}</Text>
                      {thread.solved && <Text style={{ fontSize: 11 }}>✅</Text>}
                    </View>
                    <Text style={s.listMeta}>
                      {thread.autor} · {relativeTime(thread.ts)}
                      {tag ? `  ${tag.emoji} ${tag.label}` : ''}
                    </Text>
                  </View>
                  <Text style={s.listRight}>💬 {answerCount}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {/* Neueste Kleider-Inserate */}
      {recentInserate.length > 0 && (
        <>
          <View style={s.sectionRow}>
            <Text style={s.sectionLabel}>Neue Inserate</Text>
            <TouchableOpacity onPress={() => goTo('Kleider')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.sectionLink}>Alle →</Text>
            </TouchableOpacity>
          </View>
          <View style={s.listCard}>
            {recentInserate.map((item, i) => {
              const m       = MODUS_STYLE[item.modus] ?? MODUS_STYLE.biete;
              const emoji   = KAT_EMOJI[item.kategorie] ?? '🧸';
              const ichWill = item.interessenten.includes(currentUser);
              const hasImg  = item.bilder && item.bilder.length > 0;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[s.inseratRow, i === recentInserate.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => openInserat(item)}
                  activeOpacity={0.72}
                >
                  {hasImg ? (
                    <Image source={{ uri: item.bilder[0] }} style={s.inseratThumb} resizeMode="cover" />
                  ) : (
                    <View style={[s.inseratThumbEmpty, { backgroundColor: m.bg }]}>
                      <Text style={{ fontSize: 20 }}>{emoji}</Text>
                    </View>
                  )}
                  <View style={s.listBody}>
                    <Text style={s.listTitle} numberOfLines={1}>{item.titel}</Text>
                    <View style={s.inseratMeta}>
                      <Text style={s.listMeta}>{item.autor} · {relativeTime(item.ts)}</Text>
                      {item.groesse && <Text style={s.inseratGr}>Gr. {item.groesse}</Text>}
                    </View>
                  </View>
                  <View style={s.inseratRight}>
                    <View style={[s.modusBadge, { backgroundColor: m.bg }]}>
                      <Text style={[s.modusBadgeText, { color: m.text }]}>{m.label}</Text>
                    </View>
                    {ichWill && <Text style={s.ichWillStar}>★</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      <View style={s.footer}>
        <Text style={s.footerText}>🪺 Nestli · Eure Nachbarschafts-Community</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content:   { padding: 16, paddingBottom: 40, gap: 14 },

  hero:      { backgroundColor: colors.primaryLight, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 0.5, borderColor: colors.primaryMid },
  heroInner: { flex: 1 },
  greeting:  { fontSize: 13, color: colors.primary, fontWeight: '500', opacity: 0.8 },
  userName:  { fontSize: 24, fontWeight: '700', color: colors.primary, marginTop: 2 },
  heroSub:   { fontSize: 12, color: colors.textMuted, marginTop: 4, lineHeight: 18 },
  nestEmoji: { fontSize: 48 },

  unreadBanner:  { backgroundColor: colors.primaryLight, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.primary },
  notfallBanner: { backgroundColor: '#FFF3E0', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#D4700A' },
  bannerLeft:    { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  unreadDot:     { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  unreadText:    { fontSize: 13, color: colors.primary, fontWeight: '500' },
  notfallText:   { fontSize: 13, color: '#D4700A', fontWeight: '500', flex: 1 },
  bannerArrow:   { fontSize: 16, color: colors.primary, fontWeight: '600' },

  sectionRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  sectionLink:  { fontSize: 12, color: colors.primary, fontWeight: '500' },

  quickGrid: { flexDirection: 'row', gap: 8 },
  quickCard: { flex: 1, backgroundColor: colors.bgAlt, borderRadius: 16, padding: 12, borderWidth: 1, gap: 5, position: 'relative' },
  quickIcon:      { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  quickEmoji:     { fontSize: 18 },
  quickTitle:     { fontSize: 13, fontWeight: '600', color: colors.text },
  quickStat:      { fontSize: 11, color: colors.textMuted },
  quickBadge:     { position: 'absolute', top: 8, right: 8, backgroundColor: colors.primary, borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  quickBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  listCard: { backgroundColor: colors.bgAlt, borderRadius: 16, borderWidth: 0.5, borderColor: colors.border, overflow: 'hidden' },
  listRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  listAvatar:     { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  listAvatarText: { color: colors.primary, fontWeight: '600', fontSize: 15 },
  listBody:       { flex: 1, gap: 3 },
  listTitleRow:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  listTitle:      { fontSize: 13, fontWeight: '500', color: colors.text, flex: 1 },
  unreadDotSmall: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary, flexShrink: 0 },
  listMeta:       { fontSize: 11, color: colors.textMuted },
  listRight:      { fontSize: 11, color: colors.textMuted, flexShrink: 0 },

  pill:          { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: colors.bgAlt, borderWidth: 0.5, borderColor: colors.border },
  pillActive:    { backgroundColor: '#E8F5E9', borderColor: '#7bc47b' },
  pillText:      { fontSize: 11, color: colors.textMuted },
  pillTextActive:{ color: '#2E7D32', fontWeight: '500' },

  inseratRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  inseratThumb:     { width: 52, height: 52, borderRadius: 10, flexShrink: 0 },
  inseratThumbEmpty:{ width: 52, height: 52, borderRadius: 10, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  inseratMeta:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inseratGr:        { fontSize: 11, color: colors.textMuted, backgroundColor: colors.bgAlt, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6, borderWidth: 0.5, borderColor: colors.border },
  inseratRight:     { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  modusBadge:       { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  modusBadgeText:   { fontSize: 11, fontWeight: '600' },
  ichWillStar:      { fontSize: 12, color: colors.primary },

  footer:     { alignItems: 'center', paddingTop: 4 },
  footerText: { fontSize: 11, color: colors.textMuted },
});
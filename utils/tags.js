export const TAGS = [
  { id: 'gesundheit', label: 'Gesundheit', emoji: '🏥' },
  { id: 'termine',    label: 'Termine',    emoji: '📅' },
  { id: 'sachen',     label: 'Sachen',     emoji: '🧸' },
  { id: 'frage',      label: 'Frage',      emoji: '❓' },
  { id: 'allgemein',  label: 'Allgemein',  emoji: '💬' },
];

export function tagById(id) {
  return TAGS.find(t => t.id === id) ?? null;
}

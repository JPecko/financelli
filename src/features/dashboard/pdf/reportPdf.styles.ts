import { StyleSheet } from '@react-pdf/renderer'

export const reportPdfStyles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1f2937',
  },
  title: { fontSize: 18, fontWeight: 700 },
  subtitle: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  section: { marginTop: 20 },
  sectionTitle: {
    fontSize: 11, fontWeight: 700, color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, backgroundColor: '#f3f4f6', borderRadius: 8, padding: 10,
  },
  statLabel: { fontSize: 9, color: '#6b7280' },
  statValue: { fontSize: 14, fontWeight: 700, marginTop: 3 },
  positive: { color: '#059669' },
  negative: { color: '#dc2626' },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowLabel: { fontSize: 10 },
  rowSublabel: { fontSize: 8, color: '#9ca3af' },
  rowValue: { fontSize: 10, fontWeight: 700 },
  barTrack: { height: 5, borderRadius: 3, backgroundColor: '#e5e7eb', marginTop: 3, width: 120 },
  barFill: { height: 5, borderRadius: 3 },
  note: { fontSize: 8, color: '#9ca3af', marginTop: 6 },
  footer: {
    position: 'absolute', bottom: 24, left: 32, right: 32,
    fontSize: 8, color: '#9ca3af', textAlign: 'center',
  },
})

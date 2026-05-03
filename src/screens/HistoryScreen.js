// HistoryScreen.js — shows the user's complete study history

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getStudyHistory, removeStudied } from '../utils/storage';
import { COLORS, SHADOWS } from '../theme';

export default function HistoryScreen() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Reload every time the tab is focused
  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  async function loadHistory() {
    setLoading(true);
    const data = await getStudyHistory();
    setHistory(data);
    setLoading(false);
  }

  function confirmRemove(entry) {
    Alert.alert(
      'הסר מההיסטוריה | Remove from history',
      `${entry.display?.he ?? entry.ref}\n${entry.display?.en ?? ''}`,
      [
        { text: 'ביטול | Cancel', style: 'cancel' },
        {
          text: 'הסר | Remove',
          style: 'destructive',
          onPress: async () => {
            const updated = await removeStudied(entry.ref);
            setHistory(updated);
          },
        },
      ]
    );
  }

  // Format the studiedAt timestamp to a readable string
  function formatStudiedAt(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('en-IL', {
      day:    'numeric',
      month:  'short',
      year:   'numeric',
      hour:   '2-digit',
      minute: '2-digit',
    });
  }

  // ─── Render each history item ────────────────────────────────────────────

  function renderItem({ item, index }) {
    return (
      <View style={[styles.card, SHADOWS.card]}>
        {/* Entry number badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{history.length - index}</Text>
        </View>

        <View style={styles.cardContent}>
          {/* Hebrew daf name */}
          <Text style={styles.hebrewName}>{item.display?.he ?? item.ref}</Text>
          {/* English daf name */}
          <Text style={styles.englishName}>{item.display?.en ?? item.ref}</Text>
          {/* Timestamp */}
          <Text style={styles.timestamp}>⏱  {formatStudiedAt(item.studiedAt)}</Text>
        </View>

        {/* Remove button */}
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => confirmRemove(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.removeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Empty state ──────────────────────────────────────────────────────────

  function renderEmpty() {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>📚</Text>
        <Text style={styles.emptyHe}>עדיין לא סימנת דפים</Text>
        <Text style={styles.emptyEn}>No dafim studied yet.</Text>
        <Text style={styles.emptyHint}>
          חזור לדף הראשי וסמן שלמדת!{'\n'}Go back to Home and mark a daf as studied.
        </Text>
      </View>
    );
  }

  // ─── Stats header ─────────────────────────────────────────────────────────

  function renderHeader() {
    if (history.length === 0) return null;
    return (
      <View style={styles.statsCard}>
        <Text style={styles.statsNumber}>{history.length}</Text>
        <Text style={styles.statsLabel}>
          {history.length === 1
            ? 'דף נלמד | Daf studied'
            : 'דפים נלמדו | Dafim studied'}
        </Text>
        {/* Progress toward full cycle */}
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min((history.length / 2711) * 100, 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.progressLabel}>
          {((history.length / 2711) * 100).toFixed(1)}% of the full cycle (2,711 dafim)
        </Text>
      </View>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.listContent}
      data={history}
      keyExtractor={item => item.ref + item.studiedAt}
      renderItem={renderItem}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmpty}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },

  // Stats
  statsCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  statsNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  statsLabel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 12,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.secondary, // gold
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },

  // History card
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  cardContent: {
    flex: 1,
  },
  hebrewName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 2,
  },
  englishName: {
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.muted,
  },
  removeBtn: {
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  removeBtnText: {
    fontSize: 16,
    color: COLORS.muted,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  emptyHe: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptyEn: {
    fontSize: 16,
    color: COLORS.muted,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
});

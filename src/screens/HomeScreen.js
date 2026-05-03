// HomeScreen.js — shows today's Daf Yomi and lets the user mark it as studied

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView, Linking, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getTodaysDaf }           from '../utils/dafYomi';
import { isDafStudied, markStudied, removeStudied } from '../utils/storage';
import { COLORS, SHADOWS } from '../theme';

export default function HomeScreen() {
  const [daf,        setDaf]        = useState(null);
  const [studied,    setStudied]    = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [actionBusy, setActionBusy] = useState(false);

  // Load daf data on mount
  useEffect(() => {
    loadDaf();
  }, []);

  // Re-check studied status every time this tab is focused
  // (in case the user navigated away and came back)
  useFocusEffect(
    useCallback(() => {
      if (daf) checkStudied(daf.ref);
    }, [daf])
  );

  async function loadDaf() {
    setLoading(true);
    try {
      const todaysDaf = await getTodaysDaf();
      setDaf(todaysDaf);
      await checkStudied(todaysDaf.ref);
    } catch (err) {
      Alert.alert('שגיאה | Error', `Could not load today's daf.\n${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function checkStudied(ref) {
    const result = await isDafStudied(ref);
    setStudied(result);
  }

  async function handleToggleStudied() {
    if (!daf || actionBusy) return;
    setActionBusy(true);
    try {
      if (studied) {
        await removeStudied(daf.ref);
        setStudied(false);
      } else {
        await markStudied(daf);
        setStudied(true);
      }
    } catch {
      Alert.alert('שגיאה | Error', 'Could not update study status.');
    } finally {
      setActionBusy(false);
    }
  }

  function openSefaria() {
    // Build a Sefaria URL from the ref, e.g. "Berakhot 2a" → sefaria.org/Berakhot.2a
    if (!daf?.ref) return;
    const url = `https://www.sefaria.org/${daf.ref.replace(/ /g, '.')}`;
    Linking.openURL(url);
  }

  // Format today's Gregorian date nicely
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00'); // noon to avoid timezone shift
    return d.toLocaleDateString('en-IL', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>טוען דף יומי…{'\n'}Loading today's daf…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Date header */}
      <View style={styles.dateCard}>
        <Text style={styles.dateText}>{formatDate(daf?.date)}</Text>
      </View>

      {/* Main daf card */}
      <View style={[styles.dafCard, SHADOWS.card]}>
        {/* Hebrew (RTL) */}
        <Text style={styles.dafHebrew}>{daf?.display?.he ?? '—'}</Text>

        {/* Divider */}
        <View style={styles.divider} />

        {/* English */}
        <Text style={styles.dafEnglish}>{daf?.display?.en ?? '—'}</Text>

        {/* API source note (subtle) */}
        {daf?.source === 'local' && (
          <Text style={styles.sourceNote}>
            ⚠️ Offline mode — calculated locally
          </Text>
        )}
      </View>

      {/* Studied status badge */}
      {studied && (
        <View style={styles.studiedBadge}>
          <Text style={styles.studiedBadgeText}>✅  למדתי דף זה  |  Studied today!</Text>
        </View>
      )}

      {/* Mark as studied / undo button */}
      <TouchableOpacity
        style={[styles.actionBtn, studied ? styles.undoBtn : styles.studyBtn]}
        onPress={handleToggleStudied}
        disabled={actionBusy}
        activeOpacity={0.8}
      >
        {actionBusy
          ? <ActivityIndicator color="#fff" />
          : (
            <Text style={styles.actionBtnText}>
              {studied
                ? '↩️  ביטול סימון  |  Unmark'
                : '✅  למדתי!  |  Mark as Studied'}
            </Text>
          )
        }
      </TouchableOpacity>

      {/* Open in Sefaria */}
      <TouchableOpacity style={styles.sefariaBtn} onPress={openSefaria} activeOpacity={0.7}>
        <Text style={styles.sefariaBtnText}>📖  קרא ב-Sefaria  |  Read on Sefaria</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    gap: 16,
  },
  loadingText: {
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 24,
  },

  // Date
  dateCard: {
    marginBottom: 20,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 15,
    color: COLORS.muted,
    fontStyle: 'italic',
  },

  // Daf card
  dafCard: {
    width: '100%',
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    marginBottom: 20,
    borderTopWidth: 5,
    borderTopColor: COLORS.secondary,  // gold stripe at top
  },
  dafHebrew: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 12,
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: COLORS.secondary,
    marginVertical: 10,
    borderRadius: 1,
  },
  dafEnglish: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 8,
  },
  sourceNote: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 12,
    textAlign: 'center',
  },

  // Studied badge
  studiedBadge: {
    backgroundColor: '#E8F8EF',
    borderColor: COLORS.success,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  studiedBadgeText: {
    color: COLORS.success,
    fontWeight: '600',
    fontSize: 15,
    textAlign: 'center',
  },

  // Buttons
  actionBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  studyBtn: {
    backgroundColor: COLORS.success,
  },
  undoBtn: {
    backgroundColor: COLORS.muted,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  sefariaBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    marginBottom: 12,
  },
  sefariaBtnText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});

// QuizScreen.js — AI-powered quiz about today's daf, powered by Claude

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { getTodaysDaf }          from '../utils/dafYomi';
import { generateQuizQuestions } from '../utils/claudeApi';
import { COLORS, SHADOWS }       from '../theme';

// Quiz states
const STATE = {
  SETUP:     'setup',      // Choose difficulty
  LOADING:   'loading',    // Claude is generating questions
  QUESTION:  'question',   // Showing a question
  ANSWERED:  'answered',   // User answered, showing explanation
  FINISHED:  'finished',   // All 5 questions done
};

export default function QuizScreen() {
  const [daf,        setDaf]        = useState(null);
  const [dafLoading, setDafLoading] = useState(true);

  const [quizState,  setQuizState]  = useState(STATE.SETUP);
  const [difficulty, setDifficulty] = useState('medium');
  const [questions,  setQuestions]  = useState([]);
  const [qIndex,     setQIndex]     = useState(0);   // current question index
  const [selected,   setSelected]   = useState(null); // "A" | "B" | "C" | "D"
  const [score,      setScore]      = useState(0);

  // Load today's daf on mount
  useEffect(() => {
    getTodaysDaf()
      .then(setDaf)
      .catch(() => {/* silently handled — daf can be null */})
      .finally(() => setDafLoading(false));
  }, []);

  // ─── Actions ──────────────────────────────────────────────────────────────

  async function startQuiz() {
    if (!daf) {
      Alert.alert('שגיאה | Error', "Couldn't determine today's daf. Check your connection.");
      return;
    }

    setQuizState(STATE.LOADING);
    setQuestions([]);
    setQIndex(0);
    setScore(0);
    setSelected(null);

    try {
      const qs = await generateQuizQuestions(daf.ref, daf.display.en, difficulty);
      setQuestions(qs);
      setQuizState(STATE.QUESTION);
    } catch (err) {
      setQuizState(STATE.SETUP);

      if (err.message === 'API_KEY_MISSING') {
        Alert.alert(
          'API Key Required',
          'Open src/config.js and add your Anthropic API key to use the quiz feature.\n\nGet one free at console.anthropic.com',
        );
      } else {
        Alert.alert('שגיאה | Error', `Quiz generation failed:\n${err.message}`);
      }
    }
  }

  function handleAnswer(letter) {
    if (quizState !== STATE.QUESTION) return;

    const correct = questions[qIndex]?.answer === letter;
    setSelected(letter);
    setScore(prev => prev + (correct ? 1 : 0));
    setQuizState(STATE.ANSWERED);
  }

  function nextQuestion() {
    const next = qIndex + 1;
    if (next >= questions.length) {
      setQuizState(STATE.FINISHED);
    } else {
      setQIndex(next);
      setSelected(null);
      setQuizState(STATE.QUESTION);
    }
  }

  function resetQuiz() {
    setQuizState(STATE.SETUP);
    setQuestions([]);
    setQIndex(0);
    setScore(0);
    setSelected(null);
  }

  // ─── Helper: option letter index ─────────────────────────────────────────
  const LETTERS    = ['A', 'B', 'C', 'D'];
  const LETTERS_HE = ['א', 'ב', 'ג', 'ד'];

  // ─── Sub-renders ──────────────────────────────────────────────────────────

  function renderSetup() {
    const difficulties = [
      { key: 'easy',   labelHe: 'קל',    labelEn: 'Easy',       color: COLORS.easyColor   },
      { key: 'medium', labelHe: 'בינוני', labelEn: 'Medium',    color: COLORS.mediumColor },
      { key: 'hard',   labelHe: 'מאתגר', labelEn: 'Challenging', color: COLORS.hardColor  },
    ];

    return (
      <ScrollView contentContainerStyle={styles.setupContainer}>

        {/* Today's daf display */}
        <View style={[styles.dafBanner, SHADOWS.card]}>
          <Text style={styles.dafBannerLabel}>דף יומי | Today's Daf</Text>
          {dafLoading
            ? <ActivityIndicator color={COLORS.primary} />
            : <>
                <Text style={styles.dafBannerHe}>{daf?.display?.he ?? '—'}</Text>
                <Text style={styles.dafBannerEn}>{daf?.display?.en ?? '—'}</Text>
              </>
          }
        </View>

        {/* Difficulty selector */}
        <Text style={styles.sectionTitle}>בחר רמת קושי | Choose Difficulty</Text>
        <View style={styles.difficultyRow}>
          {difficulties.map(d => (
            <TouchableOpacity
              key={d.key}
              style={[
                styles.diffBtn,
                difficulty === d.key && { backgroundColor: d.color, borderColor: d.color },
              ]}
              onPress={() => setDifficulty(d.key)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.diffBtnLabelHe,
                difficulty === d.key && styles.diffBtnLabelActive,
              ]}>
                {d.labelHe}
              </Text>
              <Text style={[
                styles.diffBtnLabelEn,
                difficulty === d.key && styles.diffBtnLabelActive,
              ]}>
                {d.labelEn}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Difficulty description */}
        <Text style={styles.diffDesc}>{difficultyDescription(difficulty)}</Text>

        {/* Start button */}
        <TouchableOpacity
          style={[styles.startBtn, dafLoading && styles.startBtnDisabled]}
          onPress={startQuiz}
          disabled={dafLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.startBtnText}>🚀  התחל בחינה  |  Start Quiz</Text>
        </TouchableOpacity>

      </ScrollView>
    );
  }

  function renderLoading() {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>
          Claude מכין שאלות…{'\n'}Claude is generating your quiz…
        </Text>
        <Text style={styles.loadingSubText}>
          {daf?.display?.en} · {difficulty}
        </Text>
      </View>
    );
  }

  function renderQuestion() {
    const q = questions[qIndex];
    if (!q) return null;

    const isAnswered = quizState === STATE.ANSWERED;

    return (
      <ScrollView contentContainerStyle={styles.questionContainer}>

        {/* Progress */}
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            {qIndex + 1} / {questions.length}
          </Text>
          <View style={styles.progressBarSmall}>
            <View style={[
              styles.progressBarFill,
              { width: `${((qIndex + 1) / questions.length) * 100}%` },
            ]} />
          </View>
          <Text style={styles.scoreText}>✅ {score}</Text>
        </View>

        {/* Question text */}
        <View style={[styles.questionCard, SHADOWS.card]}>
          <Text style={styles.questionHe}>{q.questionHe}</Text>
          <View style={styles.smallDivider} />
          <Text style={styles.questionEn}>{q.questionEn}</Text>
        </View>

        {/* Answer options */}
        {LETTERS.map((letter, i) => {
          const optionEn = q.options?.[i]    ?? '';
          const optionHe = q.optionsHe?.[i]  ?? '';
          const isCorrect   = letter === q.answer;
          const isSelected  = letter === selected;

          let optionStyle  = styles.optionDefault;
          let optionTextStyle = styles.optionTextDefault;

          if (isAnswered) {
            if (isCorrect)                    { optionStyle = styles.optionCorrect;  optionTextStyle = styles.optionTextCorrect; }
            else if (isSelected && !isCorrect){ optionStyle = styles.optionWrong;    optionTextStyle = styles.optionTextWrong; }
          } else if (isSelected) {
            optionStyle = styles.optionSelected;
          }

          return (
            <TouchableOpacity
              key={letter}
              style={[styles.optionBtn, optionStyle]}
              onPress={() => handleAnswer(letter)}
              disabled={isAnswered}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionLetter, isAnswered && isCorrect && styles.optionLetterCorrect]}>
                {LETTERS_HE[i]} / {letter}
              </Text>
              <View style={styles.optionTextCol}>
                <Text style={[styles.optionTextHe, optionTextStyle]}>{optionHe.replace(/^[א-ד]\. /, '')}</Text>
                <Text style={[styles.optionTextEn, optionTextStyle]}>{optionEn.replace(/^[A-D]\. /, '')}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Explanation (shown after answering) */}
        {isAnswered && (
          <View style={[
            styles.explanationCard,
            selected === q.answer ? styles.explanationCorrect : styles.explanationWrong,
          ]}>
            <Text style={styles.explanationTitle}>
              {selected === q.answer ? '✅ נכון! | Correct!' : `❌ לא נכון | Wrong — התשובה הנכונה: ${q.answer}`}
            </Text>
            <Text style={styles.explanationTextHe}>{q.explanationHe}</Text>
            <Text style={styles.explanationTextEn}>{q.explanationEn}</Text>
          </View>
        )}

        {/* Next / Finish button */}
        {isAnswered && (
          <TouchableOpacity style={styles.nextBtn} onPress={nextQuestion} activeOpacity={0.8}>
            <Text style={styles.nextBtnText}>
              {qIndex + 1 < questions.length
                ? 'שאלה הבאה ← | Next Question'
                : 'סיום | Finish'}
            </Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    );
  }

  function renderFinished() {
    const total   = questions.length;
    const pct     = Math.round((score / total) * 100);
    const gradeHe = pct >= 80 ? '🏆 מצוין!' : pct >= 60 ? '👍 כל הכבוד' : '📖 כדאי לחזור…';
    const gradeEn = pct >= 80 ? 'Excellent!'  : pct >= 60 ? 'Well done!'  : 'Keep learning!';

    return (
      <View style={styles.finishedContainer}>
        <Text style={styles.finishedEmoji}>{pct >= 80 ? '🏆' : pct >= 60 ? '🌟' : '📖'}</Text>
        <Text style={styles.finishedGradeHe}>{gradeHe}</Text>
        <Text style={styles.finishedGradeEn}>{gradeEn}</Text>

        <View style={[styles.scoreCircle, SHADOWS.card]}>
          <Text style={styles.scoreCircleNumber}>{score}/{total}</Text>
          <Text style={styles.scoreCirclePct}>{pct}%</Text>
        </View>

        <Text style={styles.finishedDaf}>
          {daf?.display?.he}  ·  {daf?.display?.en}
        </Text>

        <TouchableOpacity style={styles.retryBtn} onPress={resetQuiz} activeOpacity={0.8}>
          <Text style={styles.retryBtnText}>🔄  נסה שוב  |  Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {quizState === STATE.SETUP    && renderSetup()}
      {quizState === STATE.LOADING  && renderLoading()}
      {(quizState === STATE.QUESTION || quizState === STATE.ANSWERED) && renderQuestion()}
      {quizState === STATE.FINISHED && renderFinished()}
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function difficultyDescription(diff) {
  return {
    easy:   '🟢 שאלות בסיסיות על סיפורים ודמויות | Basic recall: stories & characters',
    medium: '🟡 הבנת הדיונים ההלכתיים המרכזיים | Key halachic discussions',
    hard:   '🔴 ניתוח עמוק: השוואת דעות ולוגיקה | Deep analysis: comparing opinions',
  }[diff];
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: COLORS.background },
  centered:   { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

  // Setup
  setupContainer: { padding: 20, paddingBottom: 40 },
  dafBanner: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderTopWidth: 4,
    borderTopColor: COLORS.secondary,
  },
  dafBannerLabel:  { fontSize: 13, color: COLORS.muted, marginBottom: 6 },
  dafBannerHe:     { fontSize: 24, fontWeight: 'bold', color: COLORS.primary, textAlign: 'center', writingDirection: 'rtl' },
  dafBannerEn:     { fontSize: 17, color: COLORS.text, marginTop: 4 },
  sectionTitle:    { fontSize: 16, fontWeight: '600', color: COLORS.text, textAlign: 'center', marginBottom: 12 },
  difficultyRow:   { flexDirection: 'row', gap: 10, marginBottom: 12 },
  diffBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 2, borderColor: COLORS.border, alignItems: 'center',
    backgroundColor: COLORS.cardBg,
  },
  diffBtnLabelHe:     { fontSize: 15, fontWeight: '700', color: COLORS.text },
  diffBtnLabelEn:     { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  diffBtnLabelActive: { color: '#fff' },
  diffDesc: { textAlign: 'center', fontSize: 13, color: COLORS.muted, marginBottom: 24, lineHeight: 20 },
  startBtn:         { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  startBtnDisabled: { opacity: 0.5 },
  startBtnText:     { color: '#fff', fontSize: 17, fontWeight: '700' },

  // Loading
  loadingText:    { marginTop: 16, fontSize: 16, color: COLORS.text, textAlign: 'center', lineHeight: 24 },
  loadingSubText: { marginTop: 8, fontSize: 13, color: COLORS.muted, textAlign: 'center' },

  // Question
  questionContainer: { padding: 16, paddingBottom: 40 },
  progressRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  progressText: { fontSize: 13, color: COLORS.muted, width: 36 },
  progressBarSmall: {
    flex: 1, height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden',
  },
  progressBarFill:  { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  scoreText:        { fontSize: 14, fontWeight: '600', color: COLORS.success, width: 36, textAlign: 'right' },

  questionCard: {
    backgroundColor: COLORS.cardBg, borderRadius: 14, padding: 18, marginBottom: 16,
  },
  questionHe:    { fontSize: 18, fontWeight: '700', color: COLORS.primary, textAlign: 'right', writingDirection: 'rtl', lineHeight: 28 },
  smallDivider:  { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
  questionEn:    { fontSize: 15, color: COLORS.text, lineHeight: 22 },

  optionBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg,
    borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1.5, borderColor: COLORS.border,
  },
  optionDefault:  { borderColor: COLORS.border },
  optionSelected: { borderColor: COLORS.primary, backgroundColor: '#EAF2FA' },
  optionCorrect:  { borderColor: COLORS.success,  backgroundColor: '#E8F8EF' },
  optionWrong:    { borderColor: COLORS.error,     backgroundColor: '#FDECEA' },

  optionLetter: {
    fontSize: 14, fontWeight: '700', color: COLORS.muted, width: 40, textAlign: 'center',
  },
  optionLetterCorrect: { color: COLORS.success },
  optionTextCol:       { flex: 1, paddingLeft: 8 },
  optionTextHe:        { fontSize: 14, fontWeight: '600', color: COLORS.text, textAlign: 'right', writingDirection: 'rtl' },
  optionTextEn:        { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  optionTextCorrect:   { color: COLORS.success },
  optionTextWrong:     { color: COLORS.error },
  optionTextDefault:   {},

  explanationCard:    { borderRadius: 12, padding: 14, marginTop: 8, marginBottom: 12 },
  explanationCorrect: { backgroundColor: '#E8F8EF', borderLeftWidth: 4, borderLeftColor: COLORS.success },
  explanationWrong:   { backgroundColor: '#FDECEA', borderLeftWidth: 4, borderLeftColor: COLORS.error },
  explanationTitle:   { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  explanationTextHe:  { fontSize: 14, color: COLORS.text, textAlign: 'right', writingDirection: 'rtl', marginBottom: 6, lineHeight: 22 },
  explanationTextEn:  { fontSize: 13, color: COLORS.text, lineHeight: 20 },

  nextBtn:     { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Finished
  finishedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  finishedEmoji:     { fontSize: 64 },
  finishedGradeHe:   { fontSize: 26, fontWeight: 'bold', color: COLORS.primary },
  finishedGradeEn:   { fontSize: 18, color: COLORS.muted },
  scoreCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    marginVertical: 8,
  },
  scoreCircleNumber: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  scoreCirclePct:    { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  finishedDaf:       { fontSize: 14, color: COLORS.muted, textAlign: 'center' },
  retryBtn:          { backgroundColor: COLORS.secondary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
  retryBtnText:      { color: '#fff', fontSize: 16, fontWeight: '700' },
});

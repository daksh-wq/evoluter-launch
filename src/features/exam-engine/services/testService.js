import { doc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/services/firebase';
import logger from '@/utils/logger';
import { generateQuestions } from '@/services/geminiService';
import { generateMockQuestions } from '@/utils/helpers';
import { optimizeQuestionsForStorage } from '../utils/testLogic'; // We'll need to export this or just inline it if circular dep concerns arise, but util -> service is fine.

/**
 * Service for handling Test-related database operations
 */
export const testService = {
    /**
     * Initialize a new test session in Firestore (optional, for history tracking)
     * @param {string} userId
     * @param {string} testId
     * @param {string} topic
     * @param {Array} questions
     */
    async initTestSession(userId, testId, topic, questions) {
        try {
            const historyRef = doc(db, 'users', userId, 'history', testId);
            await setDoc(historyRef, {
                timestamp: new Date(),
                topic,
                score: 0,
                totalQuestions: questions.length,
                questions: questions
            });
        } catch (error) {
            logger.error("Failed to init test session:", error);
            // Non-blocking error, allow test to continue
        }
    },

    /**
     * Save completed test results to Firestore
     * @param {string} userId
     * @param {string} testId
     * @param {object} results - Calculated results
     * @param {Array} questions - Full question objects
     * @param {object} answers - User answers
     * @param {string} topic - Test topic
     */
    async saveTestResult(userId, testId, results, questions, answers, topic, options = {}) {
        try {
            // 1. Save to User's History (Standard)
            const userHistoryRef = doc(db, 'users', userId, 'tests', testId);
            const optimizedQuestions = optimizeQuestionsForStorage(questions, answers);

            const payload = {
                ...results,
                completedAt: results.timestamp || new Date(),
                topic: topic || 'Mixed',
                questions: optimizedQuestions,
                type: options.isInstitutionTest ? 'institution' : 'practice',
                institutionTestId: options.isInstitutionTest ? options.originalTestId : null,
                status: options.terminationReason ? 'terminated' : 'completed',
                terminationReason: options.terminationReason || null
            };

            await setDoc(userHistoryRef, payload, { merge: true });

            // 2. If Institution Test, Save to Institution's Records
            if (options.isInstitutionTest && options.originalTestId) {
                // A. Save Attempt Detail
                const attemptRef = doc(db, 'institution_tests', options.originalTestId, 'attempts', `${userId}_${Date.now()}`);
                await setDoc(attemptRef, {
                    userId,
                    studentName: auth.currentUser.displayName || 'Anonymous Student',
                    studentEmail: auth.currentUser.email,
                    score: results.score,
                    percentage: results.percentage,
                    timeTaken: results.timeTaken,
                    submittedAt: new Date(),
                    answers: answers, // Optional: Store full answers if detailed review needed
                    status: options.terminationReason ? 'terminated' : 'completed',
                    terminationReason: options.terminationReason || null
                });

                // B. Update Aggregates on Test Document
                const testRef = doc(db, 'institution_tests', options.originalTestId);
                await updateDoc(testRef, {
                    attemptCount: increment(1),
                    totalScoreSum: increment(results.score)
                });
            }

            return payload;
        } catch (error) {
            logger.error("Failed to save test results:", error);
            throw error;
        }
    },

    /**
     * Store XP earned in the test document
     * @param {string} userId 
     * @param {string} testId 
     * @param {number} xpGained 
     */
    async updateTestXP(userId, testId, xpGained) {
        try {
            const historyRef = doc(db, 'users', userId, 'tests', testId);
            await setDoc(historyRef, { xpEarned: xpGained }, { merge: true });
        } catch (error) {
            logger.error("Failed to update test XP:", error);
        }
    },

    /**
     * Wrapper for AI Question Generation with fallback
     * @param {string} topic 
     * @param {number} count 
     * @param {string} difficulty 
     * @param {string} targetExam 
     * @param {function} onProgress 
     * @returns {Promise<Array>} Generated questions or mock fallback
     */
    async generateTestContent(topic, count, difficulty, targetExam, onProgress) {
        try {
            const questions = await generateQuestions(topic, count, difficulty, targetExam, onProgress);
            if (questions && questions.length > 0) {
                return questions;
            }
            throw new Error("Empty question set generated");
        } catch (error) {
            logger.warn("AI generation failed, falling back to mock:", error);
            return generateMockQuestions(count);
        }
    }
};

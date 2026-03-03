import { doc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db, auth } from '@/services/firebase';
import logger from '@/utils/logger';
import { generateQuestions } from '@/services/geminiService';
import { generateMockQuestions } from '@/utils/helpers';
import { optimizeQuestionsForStorage } from '../utils/testLogic'; // We'll need to export this or just inline it if circular dep concerns arise, but util -> service is fine.
import { PYQ_DATABASE } from '@/constants/pyqDatabase';

// Helper to shuffle an array
const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

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
                testName: options.testName || null,           // institution test title
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
     * @param {string} topic - The target topic or document title
     * @param {number} count 
     * @param {string} difficulty 
     * @param {string} targetExam 
     * @param {function} onProgress 
     * @param {string} [resourceContent] - Extracted PDF/Link text
     * @param {number} [pyqPercentage] - Percentage of PYQs to blend (0-100)
     * @returns {Promise<Array>} Generated questions or mock fallback
     */
    async generateTestContent(topic, count, difficulty, targetExam, onProgress, resourceContent = null, pyqPercentage = 0) {
        try {
            let finalQuestions = [];
            let aiCount = count;

            // 1. Splice PYQs if requested
            if (pyqPercentage > 0) {
                const pyqCount = Math.round(count * (pyqPercentage / 100));
                aiCount = count - pyqCount;

                if (pyqCount > 0) {
                    logger.info(`Extracting ${pyqCount} PYQs for topic: ${topic || 'Mixed'}`);

                    // Filter PYQs by topic/subject if possible, else random
                    let filteredPYQs = PYQ_DATABASE.filter(q =>
                        !topic ||
                        q.subject.toLowerCase().includes(topic.toLowerCase()) ||
                        q.topic.toLowerCase().includes(topic.toLowerCase())
                    );

                    // If not enough strict matches, just take random PYQs (fallback)
                    if (filteredPYQs.length < pyqCount) {
                        filteredPYQs = [...filteredPYQs, ...PYQ_DATABASE.filter(q => !filteredPYQs.find(f => f.id === q.id))];
                    }

                    // Shuffle and slice
                    const selectedPYQs = shuffleArray(filteredPYQs).slice(0, pyqCount);
                    finalQuestions = [...selectedPYQs];
                }
            }

            // 2. Generate remaining questions with AI
            if (aiCount > 0) {
                let aiQuestions = [];
                if (resourceContent) {
                    // IMPORTANT: We dynamically import to avoid circular deps if needed
                    const { generateQuestionsFromDocument } = await import('@/services/geminiService');
                    logger.info('Generating mixed test from resource content...');
                    aiQuestions = await generateQuestionsFromDocument(resourceContent, topic || 'Attached Document', aiCount, difficulty, onProgress);
                } else {
                    aiQuestions = await generateQuestions(topic || 'Mixed Subject', aiCount, difficulty, targetExam, onProgress);
                }
                finalQuestions = [...finalQuestions, ...aiQuestions];
            }

            // 3. Output Validated Mixed Batch
            if (finalQuestions && finalQuestions.length > 0) {
                // Return shuffled array if we mixed PYQs and AI, otherwise normal
                return pyqPercentage > 0 ? shuffleArray(finalQuestions) : finalQuestions;
            }
            throw new Error("Empty question set generated");
        } catch (error) {
            logger.warn("AI generation failed, falling back to mock:", error);
            return generateMockQuestions(count);
        }
    }
};

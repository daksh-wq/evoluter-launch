import { useState, useCallback } from 'react';
import { auth } from '@/services/firebase';
import logger from '@/utils/logger';
import { testService } from '../services/testService';
import { calculateResults } from '../utils/testLogic';
import { generateMockQuestions } from '@/utils/helpers';

/**
 * Custom hook for test state management
 * @returns {object} Test state and handlers
 */
export function useTest() {
    // -- State --
    const [activeTest, setActiveTest] = useState(null);
    const [activeTestId, setActiveTestId] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [markedForReview, setMarkedForReview] = useState(new Set());
    const [timeLeft, setTimeLeft] = useState(0);
    const [totalDuration, setTotalDuration] = useState(0);

    // Status flags
    const [isGeneratingTest, setIsGeneratingTest] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [isTestCompleted, setIsTestCompleted] = useState(false);
    const [testResults, setTestResults] = useState(null);
    const [isInstitutionTest, setIsInstitutionTest] = useState(false);

    /**
     * Start a mock test with generated questions (Fallback/Practice)
     */
    const startMockTest = useCallback((sourceDoc = null, questionCount = 100, durationMinutes = 120) => {
        const newQuestions = generateMockQuestions(questionCount, sourceDoc);
        setupTestSession(newQuestions, durationMinutes * 60);
    }, []);

    /**
     * Helper to initialize test state
     */
    const setupTestSession = (questions, durationSeconds) => {
        setActiveTest(questions);
        setActiveTestId(null);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setMarkedForReview(new Set());
        setTimeLeft(durationSeconds);
        setTotalDuration(durationSeconds);
        setIsTestCompleted(false);
        setTestResults(null);
    };

    /**
     * Generate and start an AI-powered test on a topic
     */
    const startAITest = useCallback(async (topic, count = 10, difficulty = 'Hard', targetExam = 'UPSC CSE') => {
        setIsGeneratingTest(true);
        setGenerationProgress(0);

        // Simulate Progress (Smooth Loading)
        const progressInterval = setInterval(() => {
            setGenerationProgress(prev => {
                if (prev >= 90) return prev; // Stall at 90% until done
                // Slow down as it gets higher
                const increment = prev < 50 ? 2 : prev < 80 ? 1 : 0.5;
                return Math.min(prev + increment, 90);
            });
        }, 150);

        try {
            // 1. Generate Content (Delegate to Service)
            const questions = await testService.generateTestContent(topic, count, difficulty, targetExam);

            clearInterval(progressInterval);
            setGenerationProgress(100);
            await new Promise(r => setTimeout(r, 500)); // Show 100% briefly

            // 2. Setup Local State
            const duration = count * 1.5 * 60; // 1.5 mins per question
            setupTestSession(questions, duration);

            // 3. Initialize History in Backend (Fire & Forget)
            if (auth.currentUser) {
                const testId = `test-${Date.now()}`;
                setActiveTestId(testId);
                testService.initTestSession(auth.currentUser.uid, testId, topic, questions);
            }

            return true;
        } catch (error) {
            logger.error('Error starting AI test:', error);
            clearInterval(progressInterval);
            startMockTest(null, count, count * 1.5);
            return false;
        } finally {
            setIsGeneratingTest(false);
            setGenerationProgress(0);
        }
    }, [startMockTest]);

    /**
     * Start a specific test created by an institution
     */
    const startInstitutionTest = useCallback(async (testData) => {
        setIsGeneratingTest(true);
        try {
            // 1. Setup Local State
            const durationSeconds = (testData.duration || 60) * 60;

            // Format questions if needed (ensure they match structure)
            const questions = testData.questions.map((q, idx) => ({
                id: q.id || idx + 1,
                question: q.text,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation || 'No explanation provided.',
                tags: [{ type: 'subject', label: testData.subject || 'General' }]
            }));

            setupTestSession(questions, durationSeconds);
            setActiveTestId(testData.id); // Track specific test ID
            setIsInstitutionTest(true);

            // 2. Initialize History in Backend
            if (auth.currentUser) {
                // We use the original test ID to link results back to it
                testService.initTestSession(auth.currentUser.uid, testData.id, testData.title, questions);
            }
            return true;
        } catch (error) {
            logger.error('Error starting Institution test:', error);
            return false;
        } finally {
            setIsGeneratingTest(false);
        }
    }, []);

    /**
     * Submit the test and calculate results
     */
    const submitTest = useCallback(async (terminationReason = null) => {
        if (!activeTest) return;

        // 1. Calculate Results (Pure Logic)
        const results = calculateResults(activeTest, answers, timeLeft, totalDuration);
        if (!results) return;

        setTestResults(results);
        setIsTestCompleted(true);

        // 2. Persist to Backend
        if (auth.currentUser) {
            try {
                const testId = activeTestId || `test-${Date.now()}`;
                const topic = activeTest[0]?.tags?.find(t => t.type === 'topic')?.label || 'Mixed';

                // Save Result
                await testService.saveTestResult(
                    auth.currentUser.uid,
                    testId,
                    results,
                    activeTest,
                    answers,
                    topic,
                    {
                        isInstitutionTest,
                        originalTestId: activeTestId,
                        terminationReason
                    }
                );

                // Update User Stats (Side Effect)
                const { updateUserStats } = await import('../../../services/userService');
                const xpGained = await updateUserStats(auth.currentUser.uid, results, activeTest, answers);

                // Update XP history
                await testService.updateTestXP(auth.currentUser.uid, testId, xpGained);

                // Invalidate Cache
                const { removeFromCache } = await import('../../../services/cacheService');
                removeFromCache(`test_history_${auth.currentUser.uid}`);

            } catch (err) {
                logger.error("Failed to save test results:", err);
            }
        }
    }, [activeTest, answers, timeLeft, totalDuration, activeTestId]);

    // -- Answer & Navigation Handlers --

    const selectAnswer = useCallback((questionId, optionIndex) => {
        setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    }, []);

    const toggleMarkForReview = useCallback((questionId) => {
        setMarkedForReview(prev => {
            const newSet = new Set(prev);
            newSet.has(questionId) ? newSet.delete(questionId) : newSet.add(questionId);
            return newSet;
        });
    }, []);

    const goToNextQuestion = useCallback(() => {
        if (activeTest && currentQuestionIndex < activeTest.length - 1) setCurrentQuestionIndex(prev => prev + 1);
    }, [activeTest, currentQuestionIndex]);

    const goToPrevQuestion = useCallback(() => {
        if (currentQuestionIndex > 0) setCurrentQuestionIndex(prev => prev - 1);
    }, [currentQuestionIndex]);

    const goToQuestion = useCallback((index) => {
        if (activeTest && index >= 0 && index < activeTest.length) setCurrentQuestionIndex(index);
    }, [activeTest]);

    const exitTest = useCallback(() => {
        setActiveTest(null);
        setActiveTestId(null);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setMarkedForReview(new Set());
        setTimeLeft(0);
        setIsTestCompleted(false);
        setTestResults(null);
    }, []);

    const getResults = useCallback(() => {
        return calculateResults(activeTest, answers, timeLeft, totalDuration);
    }, [activeTest, answers, timeLeft, totalDuration]);

    return {
        // State
        activeTest,
        currentQuestionIndex,
        currentQuestion: activeTest ? activeTest[currentQuestionIndex] : null,
        answers,
        markedForReview,
        timeLeft,
        isGeneratingTest,
        generationProgress,
        isTestCompleted,
        testResults,
        isInstitutionTest,

        // Actions
        setTimeLeft,
        startMockTest,
        startAITest,
        startInstitutionTest,
        submitTest,
        exitTest,
        goToNextQuestion,
        goToPrevQuestion,
        goToQuestion,
        selectAnswer,
        toggleMarkForReview,
        getResults,
    };
}

export default useTest;

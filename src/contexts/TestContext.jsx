import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTest as useTestHook } from '../hooks';
import { ROUTES } from '../constants/routes';

/**
 * TestContext
 * Manages test state and operations including timer
 */
const TestContext = createContext(null);

export const useTestContext = () => {
    const context = useContext(TestContext);
    if (!context) {
        throw new Error('useTestContext must be used within TestProvider');
    }
    return context;
};

export const TestProvider = ({ children }) => {
    const navigate = useNavigate();
    const testState = useTestHook();

    const {
        activeTest,
        timeLeft,
        setTimeLeft,
        startMockTest,
        startAITest,
        exitTest,
    } = testState;

    // Timer effect
    useEffect(() => {
        let interval;
        if (activeTest && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [activeTest, timeLeft, setTimeLeft]);

    // Navigation-aware test starters
    const startMission = useCallback(() => {
        startMockTest();
        navigate(ROUTES.TEST);
    }, [startMockTest, navigate]);

    const handleGenerateAITest = useCallback(async (topic, count, difficulty) => {
        await startAITest(topic, count, difficulty);
        navigate(ROUTES.TEST);
    }, [startAITest, navigate]);

    const value = {
        ...testState,
        startMission,
        handleGenerateAITest,
    };

    return (
        <TestContext.Provider value={value}>
            {children}
        </TestContext.Provider>
    );
};

export default TestContext;

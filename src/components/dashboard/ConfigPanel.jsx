import React from 'react';
import { Layers, BarChart } from 'lucide-react';
import { DIFFICULTY_LEVELS, QUESTION_COUNTS } from '../../constants/appConstants';

/**
 * ConfigPanel Component
 * Configuration settings for test generation (Question Count, Difficulty).
 * 
 * @param {Object} props
 * @param {boolean} props.showConfig - Whether the panel is visible
 * @param {number} props.questionCount - Current question count
 * @param {function} props.setQuestionCount - State setter for question count
 * @param {string} props.difficulty - Current difficulty level
 * @param {function} props.setDifficulty - State setter for difficulty
 */
export const ConfigPanel = ({
    showConfig,
    questionCount,
    setQuestionCount,
    difficulty,
    setDifficulty
}) => {
    if (!showConfig) return null;

    return (
        <div className="p-4 md:p-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl animate-in fade-in slide-in-from-top-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="text-xs font-bold text-blue-100 uppercase mb-3 flex items-center gap-2">
                    <Layers size={14} /> Question Count
                </label>
                <div className="grid grid-cols-4 gap-2">
                    {QUESTION_COUNTS.map(count => (
                        <button
                            key={count}
                            onClick={() => setQuestionCount(count)}
                            className={`py-2 rounded-lg font-bold text-sm border transition-all ${questionCount === count ? 'bg-white text-blue-600 border-white shadow-lg' : 'bg-transparent text-blue-100 border-white/30 hover:bg-white/10'}`}
                        >
                            {count}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="text-xs font-bold text-blue-100 uppercase mb-3 flex items-center gap-2">
                    <BarChart size={14} /> Difficulty
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {DIFFICULTY_LEVELS.map(level => (
                        <button
                            key={level}
                            onClick={() => setDifficulty(level)}
                            className={`py-2 px-1 rounded-lg font-bold text-xs md:text-sm border transition-all truncate ${difficulty === level ? 'bg-white text-blue-600 border-white shadow-lg' : 'bg-transparent text-blue-100 border-white/30 hover:bg-white/10'}`}
                            title={level}
                        >
                            {level}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

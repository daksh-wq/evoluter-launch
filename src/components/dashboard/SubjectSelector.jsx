import React from 'react';
import { BookOpen, ChevronRight } from 'lucide-react';
import { SUBJECTS, DEFAULT_AI_TOPIC } from '../../constants/appConstants';

/**
 * SubjectSelector Component
 * Dropdown to select the subject for AI test generation.
 * 
 * @param {Object} props
 * @param {function} props.onSelect - Callback function when a subject is selected
 */
export const SubjectSelector = ({ onSelect }) => {
    return (
        <div className="md:col-span-4 relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <BookOpen size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <select
                className="w-full pl-10 pr-4 py-3 md:py-3.5 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-4 focus:ring-blue-400/50 bg-white appearance-none cursor-pointer"
                onChange={(e) => onSelect(e.target.value)}
                defaultValue={DEFAULT_AI_TOPIC}
            >
                <option value="" disabled>Select Subject</option>
                {SUBJECTS.map((subject) => (
                    <option key={subject} value={subject}>{subject}</option>
                ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <ChevronRight size={16} className="text-slate-400 rotate-90" />
            </div>
        </div>
    );
};

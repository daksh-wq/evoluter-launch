import React, { useState } from 'react';
import { Search, Building2, Clock, ListChecks, ArrowRight, AlertCircle } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useNavigate } from 'react-router-dom';
import logger from '../../utils/logger';

const StudentInstitutionView = ({ startInstitutionTest }) => {
    const navigate = useNavigate();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [foundTest, setFoundTest] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!code) return;

        setLoading(true);
        setError(null);
        setFoundTest(null);

        try {
            // Normalize code (uppercase, trim)
            const cleanCode = code.toUpperCase().trim();

            const q = query(
                collection(db, 'institution_tests'),
                where('testCode', '==', cleanCode)
            );

            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                setError('Invalid test code. Please check and try again.');
            } else {
                const doc = snapshot.docs[0];
                setFoundTest({ id: doc.id, ...doc.data() });
            }

        } catch (err) {
            logger.error("Error searching test:", err);
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleStart = async () => {
        if (!foundTest) return;

        const success = await startInstitutionTest(foundTest);
        if (success) {
            navigate('/test');
        } else {
            setError('Failed to start test. Please try again.');
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-10 px-4">
            <div className="text-center mb-10 space-y-4">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto text-indigo-900 mb-4">
                    <Building2 size={32} />
                </div>
                <h1 className="text-3xl font-black text-slate-900">Join Institution Test</h1>
                <p className="text-slate-500">Enter the 6-character code provided by your institution to start the test.</p>
            </div>

            {/* Search Box */}
            <div className="bg-white p-2 rounded-2xl shadow-lg border border-slate-100 flex items-center gap-2 mb-8 transform transition-all focus-within:ring-4 focus-within:ring-indigo-500/10">
                <div className="pl-4 text-slate-400">
                    <Search size={24} />
                </div>
                <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Enter Code (e.g. X7K9P2)"
                    className="flex-1 py-4 text-lg font-bold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-300 uppercase tracking-widest"
                    maxLength={6}
                />
                <button
                    onClick={handleSearch}
                    disabled={loading || !code}
                    className="bg-indigo-950 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {loading ? 'Searching...' : 'Find Test'}
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 mb-8 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={20} />
                    <span className="font-bold">{error}</span>
                </div>
            )}

            {/* Test Preview Card */}
            {foundTest && (
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-[#2278B0]/5 p-8 border-b border-slate-100">
                        <div className="flex items-center gap-2 text-[#2278B0] font-bold text-xs uppercase tracking-wider mb-2">
                            <Building2 size={14} />
                            {foundTest.creatorName || 'Institution Test'}
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 mb-2">{foundTest.title}</h2>
                        <div className="text-slate-500 font-medium">{foundTest.subject}</div>
                    </div>

                    <div className="p-8">
                        <div className="grid grid-cols-2 gap-6 mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-slate-50 rounded-xl text-slate-500">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-400 font-bold uppercase">Duration</div>
                                    <div className="font-bold text-slate-900">{foundTest.duration} Mins</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-slate-50 rounded-xl text-slate-500">
                                    <ListChecks size={20} />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-400 font-bold uppercase">Questions</div>
                                    <div className="font-bold text-slate-900">{foundTest.questions?.length || 0} Qs</div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleStart}
                            className="w-full bg-[#2278B0] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#1a5c8a] transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                        >
                            Start Test Now <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentInstitutionView;

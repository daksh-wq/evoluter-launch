import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { ArrowLeft, Users, Clock, AlignLeft, Calendar, Download, Search, Zap } from 'lucide-react';
import logger from '../../utils/logger';
import { Skeleton } from '../ui/Skeleton';

const TestAnalytics = () => {
    const { testId } = useParams();
    const navigate = useNavigate();

    const [testData, setTestData] = useState(null);
    const [attempts, setAttempts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchTestDetails = async () => {
            if (!testId) return;

            try {
                // 1. Fetch Test Meta
                const testRef = doc(db, 'institution_tests', testId);
                const testSnap = await getDoc(testRef);

                if (testSnap.exists()) {
                    setTestData({ id: testSnap.id, ...testSnap.data() });
                }

                // 2. Fetch Attempts
                const attemptsRef = collection(db, 'institution_tests', testId, 'attempts');
                const q = query(attemptsRef, orderBy('score', 'desc')); // Default sort by high score
                const attemptsSnap = await getDocs(q);

                const attemptsList = [];
                attemptsSnap.forEach(doc => {
                    attemptsList.push({ id: doc.id, ...doc.data() });
                });

                setAttempts(attemptsList);

            } catch (error) {
                logger.error('Error fetching analytics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTestDetails();
    }, [testId]);

    const filteredAttempts = attempts.filter(a =>
        a.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.studentEmail?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 pb-20">
                <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm h-16 flex items-center px-6">
                    <Skeleton className="h-8 w-64" />
                </header>
                <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map(i => (
                            <Skeleton key={i} className="h-32 rounded-2xl" />
                        ))}
                    </div>
                    <Skeleton className="h-96 rounded-3xl" />
                </main>
            </div>
        );
    }

    if (!testData) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col gap-4">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-2">
                    <Search size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Test Not Found</h3>
                <p className="text-slate-500 text-sm max-w-xs text-center">We couldn't find the test report you're looking for. It might have been deleted.</p>
                <button onClick={() => navigate(-1)} className="mt-4 px-6 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-colors shadow-sm">
                    Go Back
                </button>
            </div>
        );
    }

    const avgScore = attempts.length > 0
        ? Math.round(attempts.reduce((acc, curr) => acc + (curr.score || 0), 0) / attempts.length)
        : 0;

    const highestScore = attempts.length > 0
        ? Math.max(...attempts.map(a => a.score || 0))
        : 0;

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-xl font-bold text-slate-800 truncate max-w-md">
                            {testData.title} <span className="text-slate-400 font-medium text-sm ml-2">Report</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                            Code: {testData.testCode}
                        </span>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">
                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="text-slate-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                            <Users size={14} /> Total Attempts
                        </div>
                        <div className="text-3xl font-black text-slate-800">{attempts.length}</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="text-slate-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                            <AlignLeft size={14} /> Average Score
                        </div>
                        <div className="text-3xl font-black text-slate-800">{avgScore}</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="text-slate-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                            <Zap size={14} /> Highest Score
                        </div>
                        <div className="text-3xl font-black text-green-600">{highestScore}</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="text-slate-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                            <Clock size={14} /> Avg. Duration
                        </div>
                        <div className="text-3xl font-black text-slate-800">
                            {attempts.length > 0
                                ? Math.round(attempts.reduce((acc, curr) => acc + (curr.timeTaken || 0), 0) / attempts.length / 60)
                                : 0
                            }m
                        </div>
                    </div>
                </div>

                {/* Students List */}
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h3 className="text-lg font-bold text-slate-800">Student Leaderboard</h3>

                        <div className="relative">
                            <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search by name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full md:w-64"
                            />
                        </div>
                    </div>

                    {filteredAttempts.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-50 rounded-full mb-4">
                                <Users size={32} className="text-slate-300" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-900">No attempts found</h4>
                            <p className="text-slate-500 max-w-sm mx-auto mt-2">
                                {searchTerm ? `No results for "${searchTerm}"` : 'Share the test link with students to start seeing results here.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        <th className="py-4 pl-6 font-bold text-slate-400 text-xs uppercase tracking-wider">Rank</th>
                                        <th className="py-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Student Name</th>
                                        <th className="py-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Score</th>
                                        <th className="py-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Time Taken</th>
                                        <th className="py-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Status</th>
                                        <th className="py-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Submitted</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredAttempts.map((attempt, index) => (
                                        <tr key={attempt.id} className="group hover:bg-slate-50 transition-colors">
                                            <td className="py-4 pl-6">
                                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                    index === 1 ? 'bg-slate-200 text-slate-700' :
                                                        index === 2 ? 'bg-orange-100 text-orange-800' : 'text-slate-400'
                                                    }`}>
                                                    {index + 1}
                                                </span>
                                            </td>
                                            <td className="py-4">
                                                <div className="font-bold text-slate-800">{attempt.studentName}</div>
                                                <div className="text-xs text-slate-400">{attempt.studentEmail}</div>
                                            </td>
                                            <td className="py-4">
                                                <div className="font-black text-slate-700 text-lg">
                                                    {attempt.score} <span className="text-xs font-medium text-slate-400">/ {testData.questions.length * 4}</span>
                                                </div>
                                                <div className="text-xs font-bold text-green-600">
                                                    {attempt.percentage}%
                                                </div>
                                            </td>
                                            <td className="py-4 text-sm font-medium text-slate-600">
                                                {Math.floor(attempt.timeTaken / 60)}m {attempt.timeTaken % 60}s
                                            </td>
                                            <td className="py-4">
                                                {attempt.status === 'terminated' ? (
                                                    <div>
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold uppercase">
                                                            Terminated
                                                        </span>
                                                        {attempt.terminationReason && (
                                                            <div className="text-[10px] text-red-500 max-w-[150px] leading-tight mt-1">
                                                                {attempt.terminationReason}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-bold uppercase">
                                                        Completed
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 text-xs font-bold text-slate-400 uppercase">
                                                {attempt.submittedAt?.toDate
                                                    ? attempt.submittedAt.toDate().toLocaleDateString()
                                                    : 'Unknown'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default TestAnalytics;

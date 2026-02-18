import React, { useState, useEffect } from 'react';
import { Building2, Users, MapPin, CheckCircle, Zap, ListChecks, Plus, ArrowRight, Clock, MoreVertical } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import logger from '../../utils/logger';
import { Skeleton } from '../ui/Skeleton';
import BatchManager from './BatchManager';

const InstitutionDashboard = ({ userData }) => {
    const navigate = useNavigate();
    const profile = userData?.institutionProfile || {};

    // State
    const [stats, setStats] = useState({
        totalTests: 0,
        totalAttempts: 0,
        avgScore: 0
    });
    const [recentTests, setRecentTests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!userData?.uid) return;

            try {
                const q = query(
                    collection(db, 'institution_tests'),
                    where('creatorId', '==', userData.uid),
                    orderBy('createdAt', 'desc')
                );

                const snapshot = await getDocs(q);

                let totalAttempts = 0;
                let totalScoreSum = 0;
                const tests = [];

                snapshot.forEach(doc => {
                    const data = doc.data();
                    tests.push({ id: doc.id, ...data });

                    totalAttempts += (data.attemptCount || 0);
                    totalScoreSum += (data.totalScoreSum || 0);
                });

                // Calculate Average Score across all attempts
                // Avg = Total Score Sum / Total Attempts
                const avgScore = totalAttempts > 0
                    ? Math.round(totalScoreSum / totalAttempts)
                    : 0;

                setStats({
                    totalTests: tests.length,
                    totalAttempts,
                    avgScore
                });
                setRecentTests(tests);

            } catch (error) {
                logger.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [userData]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header / Profile Card */}
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full translate-x-1/3 -translate-y-1/3" />

                <div className="relative z-10 flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-center text-center md:text-left">
                    {/* Logo */}
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white border border-slate-200 p-2 shadow-sm flex-shrink-0">
                        {profile.logoUrl ? (
                            <img src={profile.logoUrl} alt="Logo" className="w-full h-full object-contain rounded-xl" />
                        ) : (
                            <div className="w-full h-full bg-slate-50 flex items-center justify-center rounded-xl text-slate-300">
                                <Building2 size={32} />
                            </div>
                        )}
                    </div>

                    <div className="flex-1">
                        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3 mb-2 justify-center md:justify-start">
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900">{profile.name || 'Institution Name'}</h1>
                            {profile.isVerified && <CheckCircle size={20} className="text-blue-500" fill="currentColor" />}
                        </div>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm font-medium text-slate-500">
                            {profile.city && (
                                <div className="flex items-center gap-1">
                                    <MapPin size={16} /> {profile.city}, {profile.state}
                                </div>
                            )}
                            {profile.studentCount && (
                                <div className="flex items-center gap-1">
                                    <Users size={16} /> ~{profile.studentCount} Students
                                </div>
                            )}
                        </div>
                    </div>

                    <Link to="/institution/create-test" className="w-full md:w-auto">
                        <button className="w-full md:w-auto bg-indigo-950 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-900 transition-all flex items-center justify-center gap-2">
                            <Plus size={20} /> Create New Test
                        </button>
                    </Link>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {/* ... keep existing stat cards ... */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                            <ListChecks size={24} />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Tests</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900">{stats.totalTests}</div>
                    <p className="text-xs text-slate-500 mt-1">Created so far</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-green-50 rounded-xl text-green-600">
                            <Users size={24} />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Attempts</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900">{stats.totalAttempts}</div>
                    <p className="text-xs text-slate-500 mt-1">Student submissions</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-orange-50 rounded-xl text-orange-600">
                            <Zap size={24} />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg. Score</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900">{stats.avgScore}%</div>
                    <p className="text-xs text-slate-500 mt-1">Across all tests</p>
                </div>
            </div>

            {/* Batch Management Section */}
            <div>
                <h3 className="text-xl font-bold text-slate-800 mb-6 px-2">Student Batches & Classrooms</h3>
                <BatchManager userData={userData} />
            </div>

            {/* Recent Activity / Tests List */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold text-slate-800">Recent Tests</h3>
                    {recentTests.length > 0 && (
                        <Link to="/institution/tests" className="text-sm font-bold text-indigo-600 hover:text-indigo-800">
                            View All
                        </Link>
                    )}
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center justify-between py-4 border-b border-slate-50">
                                <div className="space-y-2">
                                    <Skeleton className="h-6 w-48" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                                <Skeleton className="h-8 w-24 rounded-full" />
                            </div>
                        ))}
                    </div>
                ) : recentTests.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-50 rounded-full mb-4">
                            <ListChecks size={32} className="text-slate-300" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-900">No tests created yet</h4>
                        <p className="text-slate-500 max-w-sm mx-auto mt-2 mb-6">Create your first test to start tracking student performance.</p>
                        <Link to="/institution/create-test">
                            <button className="text-[#2278B0] font-bold hover:underline">
                                Create First Test &rarr;
                            </button>
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto -mx-6 md:mx-0">
                        <table className="w-full text-left border-collapse min-w-[600px] md:min-w-0">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="py-4 pl-6 md:pl-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Test Name</th>
                                    <th className="py-4 font-bold text-slate-400 text-xs uppercase tracking-wider hidden sm:table-cell">Subject</th>
                                    <th className="py-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Attempts</th>
                                    <th className="py-4 font-bold text-slate-400 text-xs uppercase tracking-wider hidden md:table-cell">Created</th>
                                    <th className="py-4 text-right pr-6 md:pr-4 font-bold text-slate-400 text-xs uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {recentTests.map((test) => (
                                    <tr key={test.id} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 pl-6 md:pl-4">
                                            <div className="font-bold text-slate-800">{test.title}</div>
                                            <div className="text-xs text-slate-400 font-mono mt-1">Code: {test.testCode}</div>
                                        </td>
                                        <td className="py-4 hidden sm:table-cell">
                                            <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold">
                                                {test.subject}
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            <div className="flex items-center gap-2">
                                                <Users size={14} className="text-slate-400" />
                                                <span className="font-bold text-slate-700">{test.attemptCount || 0}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 text-sm text-slate-500 font-medium hidden md:table-cell">
                                            {test.createdAt?.toDate ? test.createdAt.toDate().toLocaleDateString() : 'Just now'}
                                        </td>
                                        <td className="py-4 pr-6 md:pr-4 text-right">
                                            <button
                                                onClick={() => navigate(`/institution/test/${test.id}`)}
                                                className="text-[#2278B0] font-bold text-sm hover:underline flex items-center gap-1 justify-end"
                                            >
                                                View Report <ArrowRight size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InstitutionDashboard;

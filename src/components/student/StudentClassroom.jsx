import React, { useState, useEffect } from 'react';
import { BookOpen, Clock, ChevronRight, Play, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { batchService } from '../../features/exam-engine/services/batchService';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Skeleton } from '../ui/Skeleton';
import logger from '../../utils/logger';

const StudentClassroom = ({ userData }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [batches, setBatches] = useState([]);
    const [assignedTests, setAssignedTests] = useState([]);

    useEffect(() => {
        const loadClassroom = async () => {
            if (!userData?.uid) return;
            try {
                // 1. Get Enrolled Batches
                const myBatches = await batchService.getStudentBatches(userData.uid);
                setBatches(myBatches);

                if (myBatches.length > 0) {
                    // 2. Get Tests Assigned to these Batches
                    const batchIds = myBatches.map(b => b.id);

                    // Firestore 'array-contains-any' is limited to 10 values. 
                    // If a student is in >10 batches, we might need multiple queries or client-side filter.
                    // For now, assuming <10.
                    const q = query(
                        collection(db, 'institution_tests'),
                        where('accessType', '==', 'private'),
                        where('assignedBatchIds', 'array-contains-any', batchIds.slice(0, 10)),
                        orderBy('createdAt', 'desc')
                    );

                    const snapshot = await getDocs(q);
                    const tests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setAssignedTests(tests);
                }
            } catch (error) {
                logger.error("Failed to load classroom", error);
            } finally {
                setLoading(false);
            }
        };

        loadClassroom();
    }, [userData]);

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-48 w-full rounded-3xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-32 w-full rounded-2xl" />
                    <Skeleton className="h-32 w-full rounded-2xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Stats */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="relative z-10">
                    <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
                        <BookOpen className="text-white/80" /> My Classroom
                    </h1>
                    <p className="text-indigo-100 font-medium max-w-lg">
                        Access private tests and materials assigned by your institution batches.
                    </p>

                    <div className="mt-8 flex gap-6">
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 min-w-[120px]">
                            <div className="text-3xl font-black">{batches.length}</div>
                            <div className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Active Batches</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 min-w-[120px]">
                            <div className="text-3xl font-black">{assignedTests.length}</div>
                            <div className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Pending Tests</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Main: Assigned Tests */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-800">Assigned Tests</h2>
                    </div>

                    {assignedTests.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                <Clock size={32} />
                            </div>
                            <h3 className="font-bold text-slate-700">No Pending Tests</h3>
                            <p className="text-slate-400 text-sm">You're all caught up! relax for now.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {assignedTests.map(test => (
                                <div key={test.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="bg-purple-100 text-purple-700 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wide">
                                                    {test.subject || 'Test'}
                                                </span>
                                                <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                                    <Clock size={12} /> {test.duration} mins
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-lg text-slate-800 group-hover:text-indigo-600 transition-colors">
                                                {test.title}
                                            </h3>
                                            <p className="text-sm text-slate-500 mt-1">
                                                Assigned by {test.creatorName}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/test/${test.testCode}`)}
                                            className="bg-indigo-50 text-indigo-600 p-3 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all"
                                        >
                                            <Play size={20} fill="currentColor" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sidebar: My Batches */}
                <div className="lg:col-span-4 space-y-6">
                    <h2 className="text-xl font-bold text-slate-800">My Batches</h2>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        {batches.length === 0 ? (
                            <div className="p-8 text-center">
                                <p className="text-sm text-slate-400">You haven't joined any batches yet.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {batches.map(batch => (
                                    <div key={batch.id} className="p-4 hover:bg-slate-50 transition-colors">
                                        <div className="font-bold text-slate-700 text-sm">{batch.name}</div>
                                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                            <Users size={12} /> {batch.studentCount || 0} Students
                                        </div>
                                        <div className="text-[10px] text-slate-300 mt-2 uppercase font-bold tracking-wider">
                                            Joined {batch.joinedAt ? new Date(batch.joinedAt.seconds * 1000).toLocaleDateString() : 'Recently'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentClassroom;

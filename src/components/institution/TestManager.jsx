import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { RefreshCw, ListChecks, Calendar, Clock, Copy } from 'lucide-react';
import logger from '../../utils/logger';

const TestManager = ({ userData }) => {
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTests = async () => {
            if (!userData?.uid) return;
            try {
                const q = query(
                    collection(db, 'institution_tests'),
                    where('creatorId', '==', userData.uid),
                    orderBy('createdAt', 'desc')
                );
                const snapshot = await getDocs(q);
                const fetchedTests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setTests(fetchedTests);
            } catch (error) {
                logger.error("Error fetching institution tests", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTests();
    }, [userData]);

    if (loading) return <div className="p-10 flex justify-center"><RefreshCw className="animate-spin text-slate-400" /></div>;

    return (
        <div className="pb-20">
            <h1 className="text-3xl font-black text-slate-900 mb-8">My Tests</h1>

            {tests.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
                    <p className="text-slate-500">No tests found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tests.map(test => (
                        <div key={test.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                                <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">
                                    {test.subject}
                                </span>
                                <div className="flex items-center gap-1 text-slate-400 text-xs font-bold cursor-pointer hover:text-[#2278B0]"
                                    onClick={() => navigator.clipboard.writeText(test.testCode)}
                                >
                                    <Copy size={12} /> {test.testCode}
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-1 line-clamp-2">{test.title}</h3>

                            <div className="flex items-center gap-4 text-xs text-slate-500 mt-4">
                                <span className="flex items-center gap-1"><Clock size={14} /> {test.duration}m</span>
                                <span className="flex items-center gap-1"><ListChecks size={14} /> {test.questions?.length} Qs</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TestManager;

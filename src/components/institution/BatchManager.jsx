import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, UserPlus, Search, X } from 'lucide-react';
import { batchService } from '../../features/exam-engine/services/batchService';
import logger from '../../utils/logger';
import { Skeleton } from '../ui/Skeleton';
import { auth } from '../../services/firebase';

const BatchManager = ({ userData }) => {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newBatchName, setNewBatchName] = useState('');
    const emailInputRef = React.useRef(null);

    // Member Management
    const [members, setMembers] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [newStudentEmail, setNewStudentEmail] = useState('');
    const [inviteError, setInviteError] = useState('');
    const [inviteSuccess, setInviteSuccess] = useState('');

    useEffect(() => {
        fetchBatches();
    }, [userData]);

    const fetchBatches = async () => {
        if (!userData?.uid) return;
        try {
            const data = await batchService.getInstitutionBatches(userData.uid);
            setBatches(data);
        } catch (error) {
            logger.error("Failed to fetch batches", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBatch = async (e) => {
        e.preventDefault();
        if (!newBatchName.trim()) return;

        try {
            await batchService.createBatch(userData.uid, newBatchName);
            setNewBatchName('');
            setShowCreateModal(false);
            fetchBatches(); // Refresh list
        } catch (error) {
            logger.error("Failed to create batch", error);
            alert("Error creating batch: " + error.message);
        }
    };

    const handleSelectBatch = async (batch) => {
        setSelectedBatch(batch);
        setLoadingMembers(true);
        setMembers([]);
        setInviteError('');
        setInviteSuccess('');

        try {
            const memberData = await batchService.getBatchMembers(batch.id);
            setMembers(memberData);
        } catch (error) {
            logger.error("Failed to fetch members", error);
        } finally {
            setLoadingMembers(false);
        }
    };

    const handleAddStudent = async (e) => {
        e.preventDefault();
        setInviteError('');
        setInviteSuccess('');

        const email = emailInputRef.current?.value?.trim();

        if (!email || !selectedBatch) {
            setInviteError("Please enter a valid email.");
            return;
        }

        try {
            await batchService.addStudentToBatch(selectedBatch.id, email);
            setInviteSuccess(`Successfully added ${email}`);

            // Clear input
            if (emailInputRef.current) emailInputRef.current.value = '';

            // Refresh members
            const memberData = await batchService.getBatchMembers(selectedBatch.id);
            setMembers(memberData);
            fetchBatches(); // Update counts
        } catch (error) {
            setInviteError(error.message || "Failed to add student");
        }
    };

    const handleDeleteBatch = async (batchId) => {
        if (!window.confirm("Are you sure? This will remove the batch and student access.")) return;
        try {
            await batchService.deleteBatch(batchId);
            if (selectedBatch?.id === batchId) setSelectedBatch(null);
            fetchBatches();
        } catch (error) {
            logger.error("Failed to delete", error);
        }
    };

    const handleRemoveStudent = async (studentId) => {
        if (!window.confirm("Remove this student?")) return;
        try {
            await batchService.removeStudentFromBatch(selectedBatch.id, studentId);
            setMembers(prev => prev.filter(m => m.id !== studentId));
            fetchBatches(); // Update counts
        } catch (error) {
            logger.error("Failed to remove student", error);
        }
    };

    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm min-h-[400px] md:min-h-[600px] flex flex-col md:flex-row overflow-hidden">
            {/* Sidebar: Batches List */}
            <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50 flex flex-col max-h-[300px] md:max-h-full">
                <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Users size={18} className="text-indigo-600" /> My Batches
                    </h3>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                        <Plus size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? (
                        [1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
                    ) : batches.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm">
                            No batches yet. <br /> Create one to start adding students.
                        </div>
                    ) : (
                        batches.map(batch => (
                            <div
                                key={batch.id}
                                onClick={() => handleSelectBatch(batch)}
                                className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedBatch?.id === batch.id
                                    ? 'bg-white border-indigo-200 shadow-md ring-1 ring-indigo-50'
                                    : 'bg-white border-transparent hover:border-slate-200 shadow-sm'
                                    }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="font-bold text-slate-800">{batch.name}</div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteBatch(batch.id); }}
                                        className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <div className="text-xs text-slate-500 mt-2 font-medium flex items-center gap-1">
                                    <Users size={12} /> {batch.studentCount || 0} Students
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Area: Student List */}
            <div className="flex-1 flex flex-col bg-white min-h-[400px]">
                {selectedBatch ? (
                    <>
                        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white z-10">
                            <div>
                                <h2 className="text-xl font-black text-slate-800">{selectedBatch.name}</h2>
                                <p className="text-xs text-slate-400 font-medium">Manage students in this batch</p>
                            </div>

                            <form onSubmit={handleAddStudent} className="flex gap-2 w-full md:w-auto">
                                <input
                                    ref={emailInputRef}
                                    type="email"
                                    placeholder="Student Email..."
                                    className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full md:w-64"
                                />
                                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors whitespace-nowrap flex items-center gap-1">
                                    <UserPlus size={16} /> Add
                                </button>
                            </form>
                        </div>

                        {/* Messages */}
                        {(inviteError || inviteSuccess) && (
                            <div className={`px-6 py-3 text-sm font-bold ${inviteError ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                {inviteError || inviteSuccess}
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto p-6">
                            {loadingMembers ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                                </div>
                            ) : members.length === 0 ? (
                                <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-slate-300">
                                        <UserPlus size={24} />
                                    </div>
                                    <h4 className="font-bold text-slate-800">No students yet</h4>
                                    <p className="text-xs text-slate-500">Add students by email to verify access.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left min-w-[500px] md:min-w-0">
                                        <thead>
                                            <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                <th className="pb-3 pl-2">Name</th>
                                                <th className="pb-3">Email</th>
                                                <th className="pb-3 text-right pr-2">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {members.map(member => (
                                                <tr key={member.id} className="group hover:bg-slate-50 font-medium text-slate-600 text-sm">
                                                    <td className="py-3 pl-2 text-slate-900 font-bold">{member.studentName}</td>
                                                    <td className="py-3">{member.studentEmail}</td>
                                                    <td className="py-3 text-right pr-2">
                                                        <button
                                                            onClick={() => handleRemoveStudent(member.id)}
                                                            className="text-slate-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-300 flex-col gap-4 py-12 md:py-0">
                        <Users size={48} className="opacity-20" />
                        <p className="font-bold">Select a batch to manage</p>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-black text-slate-900">Create New Batch</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateBatch}>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Batch Name</label>
                            <input
                                autoFocus
                                type="text"
                                placeholder="e.g. Class 10 - Physics"
                                value={newBatchName}
                                onChange={(e) => setNewBatchName(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 mb-6"
                            />
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all">
                                    Create Batch
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BatchManager;

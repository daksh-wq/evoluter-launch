import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMasteryColor } from '../../utils/helpers';
import { Brain, Sparkles, BookOpen, AlertCircle, Target, Trophy } from 'lucide-react';

/**
 * KnowledgeGraph Component
 * Interactive neural network visualization of student mastery
 */
const KnowledgeGraph = ({ mastery = {} }) => {
    const [selectedNode, setSelectedNode] = useState(null);
    const [nodes, setNodes] = useState([]);

    // Transform flat mastery object into graph nodes
    useEffect(() => {
        const topics = Object.entries(mastery);
        if (topics.length === 0) return;

        // Sort by mastery score to create layers
        const sortedTopics = topics.sort(([, a], [, b]) => b - a);

        // Create node structure
        const graphNodes = sortedTopics.map(([topic, score], index) => {
            const angle = (index / sortedTopics.length) * 2 * Math.PI;
            // Distribute nodes in two orbits for depth
            const radius = index % 2 === 0 ? 140 : 200;
            return {
                id: topic,
                label: topic,
                score,
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                color: getMasteryColor(score),
                type: 'topic'
            };
        });

        setNodes(graphNodes);
    }, [mastery]);

    // Center Node (The Student)
    const centerNode = {
        id: 'student',
        label: 'You',
        x: 0,
        y: 0,
        color: '#2278B0',
        type: 'core'
    };

    if (nodes.length === 0) {
        return (
            <div className="h-96 w-full bg-slate-50/50 rounded-3xl flex flex-col items-center justify-center text-slate-400 border border-slate-200 border-dashed">
                <Brain size={48} className="mb-4 opacity-50" />
                <p className="font-medium">No knowledge data yet.</p>
                <p className="text-xs mt-1">Take a test to generate your graph.</p>
            </div>
        );
    }

    return (
        <div className="relative h-[500px] w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center border border-slate-800">
            {/* Background Grid & Effects */}
            <div className="absolute inset-0 opacity-20"
                style={{ backgroundImage: 'radial-gradient(circle, #475569 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
            <div className="absolute inset-0 bg-gradient-to-br from-[#2278B0]/10 via-transparent to-purple-900/20 pointer-events-none" />

            {/* Interactive Area */}
            <div className="relative w-full h-full flex items-center justify-center transform scale-75 md:scale-90 lg:scale-100 transition-transform duration-500">

                {/* Connections (Neural Pathways) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                    <defs>
                        <linearGradient id="gradientLine" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#2278B0" stopOpacity="0" />
                            <stop offset="50%" stopColor="#60A5FA" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="#2278B0" stopOpacity="0.2" />
                        </linearGradient>
                    </defs>
                    <g transform="translate(50%, 50%)" style={{ overflow: 'visible' }}>
                        {nodes.map((node) => (
                            <g key={`link-${node.id}`}>
                                {/* Base Line */}
                                <motion.line
                                    x1={0} y1={0}
                                    x2={node.x} y2={node.y}
                                    stroke="url(#gradientLine)"
                                    strokeWidth="1.5"
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 1 }}
                                    transition={{ duration: 1.5, delay: 0.5 }}
                                />
                                {/* Active Data Packet Animation */}
                                <motion.circle r="2" fill="#fff">
                                    <animateMotion
                                        dur={`${2 + Math.random() * 2}s`}
                                        repeatCount="indefinite"
                                        path={`M0,0 L${node.x},${node.y}`}
                                    />
                                </motion.circle>
                                {/* Reverse Packet (Feedback) */}
                                <motion.circle r="1.5" fill="#60A5FA">
                                    <animateMotion
                                        dur={`${3 + Math.random() * 2}s`}
                                        repeatCount="indefinite"
                                        path={`M${node.x},${node.y} L0,0`}
                                    />
                                </motion.circle>
                            </g>
                        ))}
                    </g>
                </svg>

                {/* Nodes */}
                <div className="relative z-10 w-0 h-0"> {/* Center point wrapper */}

                    {/* Center Core Node */}
                    <motion.div
                        className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        onClick={() => setSelectedNode(centerNode)}
                    >
                        <div className="w-20 h-20 rounded-full bg-slate-900 border-4 border-[#2278B0] shadow-[0_0_30px_rgba(34,120,176,0.5)] flex items-center justify-center relative group">
                            <div className="absolute inset-0 rounded-full border border-[#2278B0]/50 animate-ping opacity-20" />
                            <Brain size={32} className="text-white relative z-10" />
                            <div className="absolute -bottom-8 whitespace-nowrap bg-slate-800/80 backdrop-blur px-3 py-1 rounded-full border border-slate-700 text-xs font-bold text-blue-200">
                                Central Logic
                            </div>
                        </div>
                    </motion.div>

                    {/* Topic Nodes */}
                    {nodes.map((node, index) => (
                        <motion.div
                            key={node.id}
                            className="absolute z-20 cursor-pointer group"
                            style={{ x: node.x, y: node.y, translateX: '-50%', translateY: '-50%' }}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => setSelectedNode(node)}
                            whileHover={{ scale: 1.15, zIndex: 30 }}
                        >
                            {/* Orb */}
                            <div
                                className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center relative transition-shadow duration-300"
                                style={{
                                    backgroundColor: '#0F172A', // Slate 900
                                    border: `2px solid ${node.color}`,
                                    boxShadow: `0 0 15px ${node.color}40`
                                }}
                            >
                                {node.score >= 80 ? (
                                    <Trophy size={18} style={{ color: node.color }} />
                                ) : node.score < 50 ? (
                                    <AlertCircle size={18} style={{ color: node.color }} />
                                ) : (
                                    <BookOpen size={18} style={{ color: node.color }} />
                                )}

                                {/* Orbit Ring animation for active nodes */}
                                {node.score > 0 && (
                                    <div className="absolute inset-[-4px] border border-white/10 rounded-full animate-spin-slow"
                                        style={{ borderTopColor: node.color, animationDuration: '3s' }} />
                                )}
                            </div>

                            {/* Label */}
                            <div className="absolute top-14 left-1/2 -translate-x-1/2 flex flex-col items-center">
                                <span className="text-[10px] font-bold text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded backdrop-blur border border-slate-700 whitespace-nowrap max-w-[120px] truncate">
                                    {node.label}
                                </span>
                                <span className="text-[10px] font-black mt-0.5" style={{ color: node.color }}>
                                    {Math.round(node.score)}%
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Info Panel Overlay */}
            <AnimatePresence>
                {selectedNode && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="absolute right-4 top-4 bottom-4 w-64 bg-slate-900/95 backdrop-blur-xl border-l border-white/10 p-6 shadow-2xl z-30 flex flex-col rounded-2xl"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="font-bold text-white text-lg leading-tight">{selectedNode.label}</h3>
                            <button
                                onClick={(e) => { e.stopPropagation(); setSelectedNode(null); }}
                                className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white"
                            >
                                <Target size={16} />
                            </button>
                        </div>

                        {selectedNode.type === 'core' ? (
                            <div className="space-y-4 text-slate-300 text-sm">
                                <p>Central Nervous System active.</p>
                                <p>Monitoring <strong>{nodes.length}</strong> knowledge nodes.</p>
                                <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                    <div className="text-xs text-blue-300 uppercase font-bold mb-1">System Status</div>
                                    <div className="text-blue-100 font-mono">ONLINE & LEARNING</div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <div className="text-xs text-slate-400 uppercase tracking-wider">Mastery Level</div>
                                    <div className="text-3xl font-black" style={{ color: selectedNode.color }}>
                                        {Math.round(selectedNode.score)}%
                                    </div>
                                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${selectedNode.score}%` }}
                                            className="h-full rounded-full"
                                            style={{ backgroundColor: selectedNode.color }}
                                        />
                                    </div>
                                </div>

                                <div className="text-sm text-slate-300 leading-relaxed">
                                    {selectedNode.score < 50
                                        ? "Critical weakness detected. Recommended immediate reinforcement."
                                        : selectedNode.score < 80
                                            ? "Steady progress. Consistent practice required to reach mastery."
                                            : "Excellent command over this topic. Maintain with periodic review."}
                                </div>

                                <button className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-bold text-white transition-colors flex items-center justify-center gap-2">
                                    <Sparkles size={14} className="text-yellow-400" />
                                    Generate Plan
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default React.memo(KnowledgeGraph);

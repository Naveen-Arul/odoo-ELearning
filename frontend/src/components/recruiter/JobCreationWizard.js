import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    HiBriefcase, HiCurrencyDollar, HiClipboardList, HiMail,
    HiTrash, HiCheck, HiX, HiSparkles
} from 'react-icons/hi';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

export default function JobCreationWizard({ onClose, onJobCreated }) {
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        location: { city: '', remote: false },
        type: 'full-time',
        category: 'software-engineering',
        requirements: { experience: '', education: '', certifications: [] },
        // Advanced Features
        package: { min: 0, max: 0, currency: 'USD', period: 'yearly' },
        configuredSkills: [], // { name, level, importance }
        rounds: [
            { name: 'Resume Screening', type: 'screening', capacity: 0 }
        ],
        maxApplicants: 0,
        emailConfig: {
            triggers: [
                { stage: 'application_received', subject: 'Application Received', template: 'Thanks for applying to {{company_name}} for {{job_title}}.', active: true },
                { stage: 'rejected', subject: 'Update on Application', template: 'Unfortunately...', active: true }
            ]
        }
    });

    // Helper for adding/removing items
    const addItem = (field, item) => {
        setFormData(prev => ({
            ...prev,
            [field]: [...prev[field], item]
        }));
    };

    const removeItem = (field, index) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field].filter((_, i) => i !== index)
        }));
    };

    const updateItem = (field, index, updates) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field].map((item, i) => i === index ? { ...item, ...updates } : item)
        }));
    };

    const handleSubmit = async () => {
        if (!formData.title || !formData.description) {
            toast.error('Please fill in the required fields (Title, Description)');
            return;
        }

        setLoading(true);
        const token = localStorage.getItem('token');

        try {
            // Transform data to match backend schema expected by "POST /api/jobs" (which spreads req.body)
            // Need to map flattened skills to requirements.skills array for backward compatibility
            const payload = {
                ...formData,
                salary: formData.package,
                requirements: {
                    ...formData.requirements,
                    skills: formData.configuredSkills.map(s => s.name)
                }
            };

            const response = await fetch(`${API_URL}/jobs`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (data.success) {
                toast.success('Job posted successfully!');
                onJobCreated();
            } else {
                toast.error(data.message || 'Failed');
            }
        } catch (error) {
            toast.error('Error posting job');
        } finally {
            setLoading(false);
        }
    };

    // --- Render Sections ---

    const renderDetailsSection = () => (
        <div className="space-y-4">
            <h3 className="text-xl text-white font-semibold flex items-center gap-2 mb-4">
                <HiBriefcase className="text-primary" /> Job Details
            </h3>
            <input required placeholder="Job Title" className="input w-full" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
            <div className="grid grid-cols-2 gap-4">
                <select className="input" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                    <option value="full-time">Full-time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                </select>
                <div className="flex gap-2">
                    <input
                        placeholder="Job Role / Category"
                        className="input w-full"
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                    />
                    <button
                        type="button"
                        onClick={async () => {
                            if (!formData.category) return;
                            const toastId = toast.loading('Fixing spelling...');
                            try {
                                const token = localStorage.getItem('token');
                                const res = await fetch(`${API_URL}/ai/fix-text`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${token}`
                                    },
                                    body: JSON.stringify({ text: formData.category })
                                });
                                const data = await res.json();
                                if (data.success) {
                                    setFormData(prev => ({ ...prev, category: data.data.correctedText }));
                                    toast.success('Spelling fixed!', { id: toastId });
                                } else {
                                    toast.error('Could not fix spelling', { id: toastId });
                                }
                            } catch (err) {
                                toast.error('AI Service unavailable', { id: toastId });
                            }
                        }}
                        className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center transition-colors"
                        title="AI Auto-Fix Spelling"
                    >
                        <HiSparkles className="w-5 h-5" />
                    </button>
                </div>
            </div>
            <textarea required rows={5} placeholder="Job Description" className="input w-full" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-4">
                <input placeholder="Location (City)" className="input" value={formData.location.city} onChange={e => setFormData({ ...formData, location: { ...formData.location, city: e.target.value } })} />
                <label className="flex items-center gap-2 p-3 bg-dark-700 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={formData.location.remote} onChange={e => setFormData({ ...formData, location: { ...formData.location, remote: e.target.checked } })} />
                    <span className="text-white text-sm">Remote Position</span>
                </label>
            </div>

            {/* Added Max Applicants here with a proper label */}
            <div>
                <label className="text-xs text-dark-400 mb-1 block">Maximum Applicants Limit (leave 0 for unlimited)</label>
                <input
                    type="number"
                    placeholder="e.g. 100"
                    className="input w-full"
                    value={formData.maxApplicants}
                    onChange={e => setFormData({ ...formData, maxApplicants: Number(e.target.value) })}
                />
            </div>
        </div>
    );

    const renderSkillsPackageSection = () => (
        <div className="space-y-6">
            <h3 className="text-xl text-white font-semibold flex items-center gap-2 mb-4">
                <HiCurrencyDollar className="text-primary" /> Skills & Package
            </h3>

            {/* Package */}
            <div className="p-4 bg-dark-700 rounded-lg space-y-3">
                <h4 className="text-white font-semibold text-sm">Compensation Package</h4>
                <div className="grid grid-cols-3 gap-3">
                    <input type="number" placeholder="Min" className="input" value={formData.package.min} onChange={e => setFormData({ ...formData, package: { ...formData.package, min: Number(e.target.value) } })} />
                    <input type="number" placeholder="Max" className="input" value={formData.package.max} onChange={e => setFormData({ ...formData, package: { ...formData.package, max: Number(e.target.value) } })} />
                    <select className="input" value={formData.package.currency} onChange={e => setFormData({ ...formData, package: { ...formData.package, currency: e.target.value } })}>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="INR">INR</option>
                    </select>
                </div>
            </div>

            {/* Skills */}
            <div className="p-4 bg-dark-700 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                    <h4 className="text-white font-semibold text-sm">Required Skills</h4>
                    <button type="button" onClick={() => addItem('configuredSkills', { name: '', importance: 'mandatory', level: 'intermediate' })} className="text-primary text-sm font-medium">+ Add Skill</button>
                </div>
                {formData.configuredSkills.map((skill, idx) => (
                    <div key={idx} className="flex gap-2">
                        <input placeholder="Skill Name (e.g. React)" className="input flex-1" value={skill.name} onChange={e => updateItem('configuredSkills', idx, { name: e.target.value })} />
                        <select className="input w-24" value={skill.importance} onChange={e => updateItem('configuredSkills', idx, { importance: e.target.value })}>
                            <option value="mandatory">Mandatory</option>
                            <option value="preferred">Preferred</option>
                            <option value="bonus">Bonus</option>
                        </select>
                        <button type="button" onClick={() => removeItem('configuredSkills', idx)} className="text-red-400 p-2"><HiTrash /></button>
                    </div>
                ))}
                {formData.configuredSkills.length === 0 && <p className="text-dark-400 text-sm text-center">No skills added yet</p>}
            </div>

            {/* Removed the orphan input from here */}
        </div>
    );

    const renderRoundsSection = () => (
        <div className="space-y-4">
            <h3 className="text-xl text-white font-semibold flex items-center gap-2 mb-4">
                <HiClipboardList className="text-primary" /> Hiring Rounds
            </h3>

            <div className="flex justify-between items-center mb-2">
                <p className="text-dark-300 text-sm">Define your hiring process rounds in order.</p>
                <button type="button" onClick={() => addItem('rounds', { name: 'New Round', type: 'technical', capacity: 0 })} className="btn-primary py-1 px-3 text-sm">+ Add Round</button>
            </div>

            <div className="space-y-3">
                {formData.rounds.map((round, idx) => (
                    <div key={idx} className="card p-4 relative border border-dark-600 bg-dark-800">
                        <div className="absolute top-2 right-2 text-dark-400 text-xs bg-dark-700 px-2 py-1 rounded">Round {idx + 1}</div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className="text-xs text-dark-400">Round Name</label>
                                <input className="input w-full mt-1" value={round.name} onChange={e => updateItem('rounds', idx, { name: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs text-dark-400">Type</label>
                                <select className="input w-full mt-1" value={round.type} onChange={e => updateItem('rounds', idx, { type: e.target.value })}>
                                    <option value="screening">Screening</option>
                                    <option value="test">Online Test</option>
                                    <option value="technical">Technical Interview</option>
                                    <option value="hr">HR Interview</option>
                                    <option value="assignment">Assignment</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs text-dark-400">Duration</label>
                                <input placeholder="e.g. 45 min" className="input w-full mt-1" value={round.duration || ''} onChange={e => updateItem('rounds', idx, { duration: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs text-dark-400">Passing Score</label>
                                <input type="number" placeholder="0-100" className="input w-full mt-1" value={round.passingScore || ''} onChange={e => updateItem('rounds', idx, { passingScore: Number(e.target.value) })} />
                            </div>
                            <div>
                                <label className="text-xs text-dark-400">Capacity (Opt)</label>
                                <input type="number" placeholder="Max candidates" className="input w-full mt-1" value={round.capacity || ''} onChange={e => updateItem('rounds', idx, { capacity: Number(e.target.value) })} />
                            </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                            <button type="button" onClick={() => removeItem('rounds', idx)} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"><HiTrash className="w-3 h-3" /> Remove Round</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderAutomationSection = () => (
        <div className="space-y-4">
            <h3 className="text-xl text-white font-semibold flex items-center gap-2 mb-4">
                <HiMail className="text-primary" /> Automation
            </h3>

            <p className="text-dark-300 text-sm">Configure automated emails triggered by hiring stages.</p>
            {formData.emailConfig.triggers.map((trigger, idx) => (
                <div key={idx} className="card p-4 bg-dark-800">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-primary font-medium text-sm capitalize">{trigger.stage.replace('_', ' ')} Event</span>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-xs text-dark-400">{trigger.active ? 'Active' : 'Disabled'}</span>
                            {/* Toggle Switch */}
                            <div className={`w-10 h-5 rounded-full transition-colors relative ${trigger.active ? 'bg-primary' : 'bg-dark-600'}`} onClick={(e) => {
                                e.preventDefault();
                                const newTriggers = [...formData.emailConfig.triggers];
                                newTriggers[idx].active = !trigger.active;
                                setFormData({ ...formData, emailConfig: { triggers: newTriggers } });
                            }}>
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${trigger.active ? 'left-6' : 'left-1'}`} />
                            </div>
                        </label>
                    </div>
                    {trigger.active && (
                        <div className="space-y-2 mt-3">
                            <input className="input w-full text-sm" placeholder="Email Subject" value={trigger.subject} onChange={e => {
                                const newTriggers = [...formData.emailConfig.triggers];
                                newTriggers[idx].subject = e.target.value;
                                setFormData({ ...formData, emailConfig: { triggers: newTriggers } });
                            }} />
                            <textarea className="input w-full text-sm font-mono" rows={3} placeholder="Email Template (supports {{candidate_name}}...)" value={trigger.template} onChange={e => {
                                const newTriggers = [...formData.emailConfig.triggers];
                                newTriggers[idx].template = e.target.value;
                                setFormData({ ...formData, emailConfig: { triggers: newTriggers } });
                            }} />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-dark-900 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-dark-700 shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-dark-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">Create New Job</h2>
                    <button onClick={onClose} className="text-dark-400 hover:text-white"><HiX className="w-6 h-6" /></button>
                </div>

                {/* Body - Single Scrolling Page */}
                <div className="p-8 overflow-y-auto flex-1 custom-scrollbar space-y-8">
                    {renderDetailsSection()}
                    <div className="h-px bg-dark-700" />
                    {renderSkillsPackageSection()}
                    <div className="h-px bg-dark-700" />
                    {renderRoundsSection()}
                    <div className="h-px bg-dark-700" />
                    {renderAutomationSection()}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-dark-700 flex justify-end gap-3">
                    <button onClick={onClose} className="btn-secondary">Cancel</button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 rounded-lg font-medium flex items-center gap-2"
                    >
                        {loading ? 'Publishing...' : 'Publish Job'} <HiCheck />
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

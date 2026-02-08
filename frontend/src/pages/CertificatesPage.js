import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiShieldCheck, HiDownload, HiSearch } from 'react-icons/hi';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

export default function CertificatesPage() {
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [verifyId, setVerifyId] = useState('');
    const [verificationResult, setVerificationResult] = useState(null);

    useEffect(() => {
        fetchCertificates();
    }, []);

    const fetchCertificates = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/certificates/my`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setCertificates(data.data);
            }
        } catch (error) {
            console.error('Failed to load certificates', error);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_URL}/certificates/verify/${verifyId}`);
            const data = await response.json();
            if (data.success) {
                setVerificationResult(data.data || { valid: false });
                toast.success(data.valid ? 'Certificate is Valid!' : 'Certificate Invalid/Revoked');
            } else {
                toast.error('Certificate not found');
            }
        } catch (error) {
            toast.error('Verification failed');
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-10">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white">Certificates</h1>
                <p className="text-dark-400 mt-1">Manage and verify your professional achievements</p>
            </div>

            {/* My Certificates Section */}
            <section>
                <h2 className="text-xl font-semibold text-white mb-4">My Certificates</h2>
                {loading ? (
                    <div className="text-center py-10">Loading...</div>
                ) : certificates.length === 0 ? (
                    <div className="card p-8 text-center bg-dark-800/50">
                        <p className="text-dark-400">You haven't earned any certificates yet. Complete a roadmap to earn one!</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {certificates.map(cert => (
                            <motion.div
                                key={cert._id}
                                whileHover={{ y: -5 }}
                                className="card p-0 overflow-hidden border border-dark-700 hover:border-primary-500/50 transition-colors"
                            >
                                <div className="h-32 bg-gradient-to-r from-primary-900 to-secondary-900 relative p-6">
                                    <HiShieldCheck className="w-12 h-12 text-white/20 absolute top-4 right-4" />
                                    <h3 className="text-white font-bold text-lg relative z-10">{cert.roadmap?.title}</h3>
                                    <p className="text-white/60 text-sm relative z-10">{new Date(cert.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className="p-6">
                                    <p className="text-sm text-dark-300 mb-4">ID: <span className="font-mono text-primary-400">{cert.certificateId}</span></p>
                                    <div className="flex gap-2">
                                        <button className="btn-secondary btn-sm flex-1 flex items-center justify-center gap-2">
                                            <HiDownload className="w-4 h-4" /> Download PDF
                                        </button>
                                        <button className="btn-ghost btn-sm text-primary-400">Share</button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </section>

            {/* Verification Section */}
            <section className="card p-8 bg-dark-800/50 border border-dark-700">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">Certificate Verification</h2>
                    <p className="text-dark-400 mb-6">Employers and institutions can verify your credentials here.</p>

                    <form onSubmit={handleVerify} className="flex gap-4 max-w-lg mx-auto mb-8">
                        <input
                            type="text"
                            placeholder="Enter Certificate ID (e.g., SKAI-2026-...)"
                            className="input flex-1"
                            value={verifyId}
                            onChange={e => setVerifyId(e.target.value)}
                        />
                        <button type="submit" className="btn-primary">Verify</button>
                    </form>

                    {verificationResult && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`p-6 rounded-xl border ${verificationResult.certificateId ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}
                        >
                            {verificationResult.certificateId ? (
                                <div>
                                    <div className="flex items-center justify-center gap-2 text-green-400 mb-2">
                                        <HiShieldCheck className="w-6 h-6" />
                                        <span className="font-bold text-lg">Valid Certificate</span>
                                    </div>
                                    <p className="text-white font-medium">{verificationResult.roadmap?.title}</p>
                                    <p className="text-dark-400 text-sm">Issued to {verificationResult.user?.name} on {new Date(verificationResult.createdAt).toLocaleDateString()}</p>
                                </div>
                            ) : (
                                <p className="text-red-400 font-medium">Invalid Certificate ID</p>
                            )}
                        </motion.div>
                    )}
                </div>
            </section>
        </div>
    );
}

/**
 * SkillForge AI - AI Helper Page
 * Analyze uploaded study materials (images/PDFs)
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  HiDocumentText,
  HiUpload,
  HiRefresh,
  HiSparkles
} from 'react-icons/hi';
import ReactMarkdown from 'react-markdown';
import { aiAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function AIHelper() {
  const [files, setFiles] = useState([]);
  const [notes, setNotes] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    setFiles(selected);
  };

  const handleRemoveFile = (indexToRemove) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const stripCitationMarkers = (text = '') => text.replace(/\[\d+\]/g, '').replace(/\s{2,}/g, ' ').trim();

  const handleAnalyze = async () => {
    if (!files.length || loading) {
      toast.error('Please upload at least one file');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      if (notes.trim()) {
        formData.append('notes', notes.trim());
      }

      const res = await aiAPI.helperAnalyze(formData);
      const rawResponse = res.data.data.response || 'No response received.';
      setResponse(stripCitationMarkers(rawResponse));
    } catch (error) {
      toast.error('Failed to analyze the file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setNotes('');
    setResponse('');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500
                        flex items-center justify-center">
            <HiDocumentText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">AI Helper</h1>
            <p className="text-muted-foreground text-sm">Upload study materials and get guided explanations</p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="btn-ghost text-sm"
        >
          <HiRefresh className="w-4 h-4 mr-2" />
          Reset
        </button>
      </div>

      {/* Upload Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 space-y-4"
      >
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <HiSparkles className="w-4 h-4 text-primary" />
          Upload images or PDFs containing notes, questions, diagrams, or study material.
        </div>

        <div className="border border-dashed border-border rounded-xl p-6 text-center bg-muted/20">
          <HiUpload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">Drag & drop or choose files</p>
          <p className="text-muted-foreground text-xs opacity-70">PDF, PNG, JPG, WEBP up to 15MB each</p>
          <input
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            multiple
            onChange={handleFileChange}
            className="mt-4 block w-full text-sm text-muted-foreground
                      file:mr-4 file:py-2 file:px-4 file:rounded-lg
                      file:border-0 file:text-sm file:font-semibold
                      file:bg-primary file:text-primary-foreground
                      hover:file:bg-primary/90"
          />
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Selected files:</p>
            <ul className="space-y-2">
              {files.map((file, idx) => (
                <li key={idx} className="flex items-center justify-between gap-3 text-muted-foreground text-sm">
                  <span className="truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(idx)}
                    className="btn-ghost text-xs px-2 py-1"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-muted-foreground text-sm">Optional instructions</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="E.g., focus on solving the exercises, or summarize the notes."
            rows={3}
            className="input w-full resize-none"
          />
        </div>

        <button
          onClick={handleAnalyze}
          disabled={loading || files.length === 0}
          className="btn-primary w-full"
        >
          {loading ? 'Analyzing...' : 'Analyze with AI Helper'}
        </button>
      </motion.div>

      {/* Response */}
      {response && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500
                          flex items-center justify-center">
              <HiDocumentText className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">AI Helper Response</h2>
          </div>
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown>{response}</ReactMarkdown>
          </div>
        </motion.div>
      )}
    </div>
  );
}

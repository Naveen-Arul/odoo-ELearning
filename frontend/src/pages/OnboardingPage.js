/**
 * SkillForge AI - Onboarding Page
 * User preference setup after registration
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiArrowLeft, HiArrowRight, HiCheck, HiSearch } from 'react-icons/hi';
import { useAuthStore } from '../store/authStore';
import { rolesAPI } from '../services/api';
import toast from 'react-hot-toast';

const steps = [
  { id: 1, title: 'Target Role', description: 'What role are you aiming for?' },
  { id: 2, title: 'Skill Level', description: 'What\'s your current experience?' },
  { id: 3, title: 'Study Time', description: 'How much time can you dedicate daily?' },
  { id: 4, title: 'Language', description: 'Preferred video language' },
];

const skillLevels = [
  { value: 'beginner', label: 'Beginner', description: 'Just starting out', icon: '🌱' },
  { value: 'intermediate', label: 'Intermediate', description: '1-2 years experience', icon: '🌿' },
  { value: 'advanced', label: 'Advanced', description: '3+ years experience', icon: '🌳' },
];

const studyTimes = [
  { value: 30, label: '30 minutes', description: 'Light learning' },
  { value: 60, label: '1 hour', description: 'Balanced approach' },
  { value: 90, label: '1.5 hours', description: 'Serious learner' },
  { value: 120, label: '2+ hours', description: 'Intensive study' },
];

const languages = [
  { value: 'english', label: 'English', flag: '🇺🇸' },
  { value: 'tamil', label: 'Tamil', flag: '🇮🇳' },
  { value: 'hi', label: 'Hindi', flag: '🇮🇳' },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { updatePreferences } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Form data
  const [preferences, setPreferences] = useState({
    targetRole: '',
    skillLevel: '',
    dailyStudyTime: 60,
    preferredLanguage: 'english',
  });

  // Role search
  const [roleQuery, setRoleQuery] = useState('');
  const [roleSuggestions, setRoleSuggestions] = useState([]);
  const [validatedRole, setValidatedRole] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);

  // Fetch role suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (roleQuery.length < 1) {
        setRoleSuggestions([]);
        return;
      }

      try {
        const response = await rolesAPI.getAll({ search: roleQuery });
        setRoleSuggestions(response.data.data || []);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [roleQuery]);

  // Validate role when selected
  const handleRoleSelect = (role) => {
    setRoleQuery(role.name);
    setRoleSuggestions([]);
    setValidatedRole(role);
    setSelectedRole(role);
    setPreferences({ ...preferences, targetRole: role._id });
  };

  const validateTypedRole = async () => {
    if (!roleQuery.trim()) return;

    try {
      const response = await rolesAPI.validate(roleQuery.trim());
      if (response.data.valid) {
        handleRoleSelect(response.data.data);
      } else if (response.data.suggestions?.length) {
        setRoleSuggestions(response.data.suggestions);
        toast.error('Role not found. Please select a suggestion.');
      } else {
        toast.error('Role not found. Please refine your search.');
      }
    } catch (error) {
      console.error('Role validation failed:', error);
    }
  };

  const handleNext = () => {
    // Validate current step
    if (currentStep === 1 && !preferences.targetRole) {
      toast.error('Please select a target role');
      return;
    }
    if (currentStep === 2 && !preferences.skillLevel) {
      toast.error('Please select your skill level');
      return;
    }

    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    const normalizedPreferences = {
      ...preferences,
      dailyStudyTime: Math.min(24, Math.max(1, Math.round(preferences.dailyStudyTime / 60)))
    };

    const result = await updatePreferences(normalizedPreferences);

    if (result.success) {
      toast.success('Preferences saved! Let\'s start learning!');
      navigate('/dashboard');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`flex items-center ${step.id < steps.length ? 'flex-1' : ''}`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-medium
                    ${step.id < currentStep
                      ? 'bg-primary-500 text-white'
                      : step.id === currentStep
                        ? 'bg-primary-500/20 text-primary-400 border-2 border-primary-500'
                        : 'bg-dark-800 text-dark-400'
                    }`}
                >
                  {step.id < currentStep ? <HiCheck className="w-5 h-5" /> : step.id}
                </div>
                {step.id < steps.length && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded-full
                      ${step.id < currentStep ? 'bg-primary-500' : 'bg-dark-700'}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8"
        >
          <AnimatePresence mode="wait">
            {/* Step 1: Target Role */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-2xl font-bold text-white mb-2">
                  What role are you aiming for?
                </h2>
                <p className="text-dark-400 mb-6">
                  We'll create a personalized learning path for you
                </p>

                <div className="relative">
                  <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                  <input
                    type="text"
                    value={roleQuery}
                    onChange={(e) => {
                      setRoleQuery(e.target.value);
                      setValidatedRole(null);
                      setSelectedRole(null);
                      setPreferences({ ...preferences, targetRole: '' });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        validateTypedRole();
                      }
                    }}
                    className="input pl-10"
                    placeholder="e.g., Frontend Developer, Data Scientist, DevOps Engineer..."
                  />

                  {/* Suggestions Dropdown */}
                  {roleSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-dark-800 border border-dark-700
                                    rounded-lg shadow-xl z-10 max-h-64 overflow-y-auto">
                      {roleSuggestions.map((role) => (
                        <button
                          key={role._id}
                          onClick={() => handleRoleSelect(role)}
                          className="w-full px-4 py-3 text-left hover:bg-dark-700 transition-colors
                                     border-b border-dark-700 last:border-0"
                        >
                          <p className="font-medium text-white">{role.name}</p>
                          <p className="text-dark-400 text-sm">{role.category}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {validatedRole && (
                  <div className="mt-4 p-4 bg-accent-500/10 border border-accent-500/30 rounded-lg">
                    <p className="text-accent-400 font-medium">
                      ✓ Great choice! "{selectedRole?.name || roleQuery}" is a valid career path.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 2: Skill Level */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-2xl font-bold text-white mb-2">
                  What's your current skill level?
                </h2>
                <p className="text-dark-400 mb-6">
                  We'll adjust the difficulty of your learning content
                </p>

                <div className="space-y-3">
                  {skillLevels.map((level) => (
                    <button
                      key={level.value}
                      onClick={() => setPreferences({ ...preferences, skillLevel: level.value })}
                      className={`w-full p-4 rounded-lg border transition-all text-left flex items-center gap-4
                        ${preferences.skillLevel === level.value
                          ? 'bg-primary-500/20 border-primary-500 text-white'
                          : 'bg-dark-800 border-dark-700 text-dark-300 hover:border-dark-600'
                        }`}
                    >
                      <span className="text-3xl">{level.icon}</span>
                      <div>
                        <p className="font-medium text-lg">{level.label}</p>
                        <p className="text-dark-400 text-sm">{level.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 3: Study Time */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-2xl font-bold text-white mb-2">
                  How much time can you study daily?
                </h2>
                <p className="text-dark-400 mb-6">
                  We'll create a manageable daily study plan
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {studyTimes.map((time) => (
                    <button
                      key={time.value}
                      onClick={() => setPreferences({ ...preferences, dailyStudyTime: time.value })}
                      className={`p-4 rounded-lg border transition-all text-center
                        ${preferences.dailyStudyTime === time.value
                          ? 'bg-primary-500/20 border-primary-500 text-white'
                          : 'bg-dark-800 border-dark-700 text-dark-300 hover:border-dark-600'
                        }`}
                    >
                      <p className="font-medium text-lg">{time.label}</p>
                      <p className="text-dark-400 text-sm">{time.description}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 4: Language */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-2xl font-bold text-white mb-2">
                  Preferred video language?
                </h2>
                <p className="text-dark-400 mb-6">
                  Choose your preferred language for tutorial videos
                </p>

                <div className="space-y-3">
                  {languages.map((lang) => (
                    <button
                      key={lang.value}
                      onClick={() => setPreferences({ ...preferences, preferredLanguage: lang.value })}
                      className={`w-full p-4 rounded-lg border transition-all text-left flex items-center gap-4
                        ${preferences.preferredLanguage === lang.value
                          ? 'bg-primary-500/20 border-primary-500 text-white'
                          : 'bg-dark-800 border-dark-700 text-dark-300 hover:border-dark-600'
                        }`}
                    >
                      <span className="text-3xl">{lang.flag}</span>
                      <p className="font-medium text-lg">{lang.label}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className={`btn-secondary ${currentStep === 1 ? 'invisible' : ''}`}
            >
              <HiArrowLeft className="w-5 h-5 mr-2" />
              Back
            </button>

            <button
              onClick={handleNext}
              disabled={isLoading}
              className="btn-primary"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="spinner" />
                  Saving...
                </span>
              ) : currentStep === steps.length ? (
                <>
                  Get Started
                  <HiCheck className="w-5 h-5 ml-2" />
                </>
              ) : (
                <>
                  Next
                  <HiArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

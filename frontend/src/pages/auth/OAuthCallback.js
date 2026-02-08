/**
 * SkillForge AI - OAuth Callback Page
 */

import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import LoadingScreen from '../../components/common/LoadingScreen';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleOAuthCallback } = useAuthStore();

  useEffect(() => {
    const processCallback = async () => {
      const token = searchParams.get('token');
      const refreshToken = searchParams.get('refreshToken');
      const error = searchParams.get('error');

      if (error) {
        navigate('/login', { state: { error: 'OAuth authentication failed' } });
        return;
      }

      if (token) {
        const result = await handleOAuthCallback(token, refreshToken || token);
        if (result.success) {
          navigate('/dashboard');
        } else {
          navigate('/login', { state: { error: result.error } });
        }
      } else {
        navigate('/login');
      }
    };

    processCallback();
  }, [searchParams, handleOAuthCallback, navigate]);

  return <LoadingScreen />;
}

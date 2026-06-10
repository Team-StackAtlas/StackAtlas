import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isProfileComplete } from '../lib/account';

export function useRequireAccountAction() {
  const { status, profile, isBackendConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    if (!isBackendConfigured) return true;
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    if (status !== 'authenticated') {
      navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return false;
    }
    if (!isProfileComplete(profile)) {
      navigate(`/profile?complete=1&returnTo=${encodeURIComponent(returnTo)}`);
      return false;
    }
    return true;
  }, [isBackendConfigured, location.hash, location.pathname, location.search, navigate, profile, status]);
}

import { useAuth } from '@/contexts/AuthContext';

/**
 * Legacy hook - approval workflow removed. All authenticated users are allowed.
 */
export const useAllowedUserCheck = () => {
  const { user } = useAuth();

  return {
    isAllowed: !!user,
    loading: false,
    refresh: () => {},
  };
};

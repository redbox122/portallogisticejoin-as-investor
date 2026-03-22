import { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export const useContractEligibility = () => {
  const { getAuthHeaders } = useAuth();
  const [eligibility, setEligibility] = useState({
    canAccessPayments: false,
    hasActiveContract: false,
    activeContractId: null,
    eligibilityStatus: 'no_contract',
    eligibilityReason: null,
    loading: true
  });

  useEffect(() => {
    checkEligibility();
    
    // Refetch when window gains focus (user might have uploaded receipt in another tab)
    const handleFocus = () => checkEligibility();
    window.addEventListener('focus', handleFocus);
    
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const checkEligibility = async () => {
    setEligibility(prev => ({ ...prev, loading: true }));
    
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(
        `${API_BASE_URL}/portallogistice/contracts`,
        { headers }
      );

      if (response.data?.success) {
        const { contracts = [], eligibility_summary } = response.data.data;
        
        // Use eligibility_summary if available, otherwise calculate from contracts
        if (eligibility_summary) {
          setEligibility({
            canAccessPayments: eligibility_summary.can_access_payments || false,
            hasActiveContract: eligibility_summary.has_active_contract || false,
            activeContractId: eligibility_summary.active_contract_id || null,
            eligibilityStatus: eligibility_summary.eligibility_status || 'no_contract',
            eligibilityReason: eligibility_summary.eligibility_reason || null,
            loading: false
          });
        } else {
          // Fallback: Check if any contract is active
          const activeContract = contracts.find(c => c.is_active === true);
          setEligibility({
            canAccessPayments: !!activeContract,
            hasActiveContract: !!activeContract,
            activeContractId: activeContract?.id || null,
            eligibilityStatus: activeContract?.eligibility_status || 'no_contract',
            eligibilityReason: activeContract?.eligibility_reason || null,
            loading: false
          });
        }
      } else {
        setEligibility(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Error checking contract eligibility:', error);
      setEligibility(prev => ({ ...prev, loading: false }));
    }
  };

  return {
    ...eligibility,
    refetch: checkEligibility
  };
};

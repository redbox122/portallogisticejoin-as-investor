import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [userType, setUserType] = useState(null); // 'user' or 'admin'
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    // Use a flag to prevent multiple simultaneous checks
    let isMounted = true;
    
    const initAuth = async () => {
      const storedToken = localStorage.getItem('portal_logistics_token');
      const storedUserType = localStorage.getItem('portal_logistics_user_type');
      
      if (storedToken && storedUserType) {
        // We have stored auth data, restore it
        if (isMounted) {
          setToken(storedToken);
          setUserType(storedUserType);
          
          try {
            if (storedUserType === 'user') {
              const storedUser = localStorage.getItem('portal_logistics_user');
              if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
              }
            } else if (storedUserType === 'admin') {
              const storedAdmin = localStorage.getItem('portal_logistics_admin');
              if (storedAdmin) {
                const parsedAdmin = JSON.parse(storedAdmin);
                setAdmin(parsedAdmin);
              }
            }
            setIsAuthenticated(true);
          } catch (parseError) {
            console.error('Error parsing stored user data:', parseError);
            // Still set authenticated if token exists
            setIsAuthenticated(true);
          }
        }
      } else {
        // No stored auth data
        if (isMounted) {
          setIsAuthenticated(false);
        }
      }
      
      if (isMounted) {
        setLoading(false);
      }
    };
    
    initAuth();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Check if user is authenticated on app load
  const checkAuth = async () => {
    try {
      const storedToken = localStorage.getItem('portal_logistics_token');
      const storedUserType = localStorage.getItem('portal_logistics_user_type');
      
      if (storedToken && storedUserType) {
        setToken(storedToken);
        setUserType(storedUserType);
        
        // Try to restore user/admin data
        try {
          if (storedUserType === 'user') {
            const storedUser = localStorage.getItem('portal_logistics_user');
            if (storedUser) {
              const parsedUser = JSON.parse(storedUser);
              setUser(parsedUser);
              setIsAuthenticated(true);
            } else {
              // Token exists but no user data - still consider authenticated
              setIsAuthenticated(true);
            }
          } else if (storedUserType === 'admin') {
            const storedAdmin = localStorage.getItem('portal_logistics_admin');
            if (storedAdmin) {
              const parsedAdmin = JSON.parse(storedAdmin);
              setAdmin(parsedAdmin);
              setIsAuthenticated(true);
            } else {
              // Token exists but no admin data - still consider authenticated
              setIsAuthenticated(true);
            }
          }
        } catch (parseError) {
          // JSON parsing error - log but don't logout, token might still be valid
          console.error('Error parsing stored user data:', parseError);
          // Still set authenticated if token exists
          setIsAuthenticated(true);
        }
      } else {
        // No token or user type - not authenticated
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      // Don't logout on checkAuth errors - just set not authenticated
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (loginData, isAdmin = false) => {
    try {
      setLoading(true);
      
      const endpoint = isAdmin 
        ? `${API_BASE_URL}/portallogistice/admin/login`
        : `${API_BASE_URL}/portallogistice/login`;
      
      const requestData = isAdmin
        ? { email: loginData.login, password: loginData.password }
        : { login: loginData.login, password: loginData.password };

      const response = await axios.post(endpoint, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-LANG': localStorage.getItem('i18nextLng') || 'ar'
        }
      });

      if (response.data && response.data.success) {
        const authToken = response.data.data?.token;
        const userData = response.data.data?.user || response.data.data?.admin;
        const type = isAdmin ? 'admin' : 'user';
        const requiresOTP = response.data.requiresOTP === true || userData?.is_first_login;

        // إذا الباكند طلب OTP (أول دخول أو requiresOTP)
        if (requiresOTP && userData) {
          try {
            await axios.post(`${API_BASE_URL}/portallogistice/send-otp`, {
              phone: userData.phone
            }, {
              headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
            });
            return { success: true, requiresOTP: true, user: userData };
          } catch (otpError) {
            const msg = otpError.response?.data?.message || otpError.response?.data?.error || 'فشل إرسال رمز التحقق';
            return { success: false, error: msg };
          }
        }

        if (!authToken) {
          return { success: false, error: response.data.message || 'لم يتم استلام رمز الجلسة' };
        }

        // تخزين التوكن ثم التوجيه للوحة التحكم
        localStorage.setItem('portal_logistics_token', authToken);
        localStorage.setItem(`portal_logistics_${type}`, JSON.stringify(userData));
        localStorage.setItem('portal_logistics_user_type', type);

        // Update state IMMEDIATELY and SYNCHRONOUSLY
        setToken(authToken);
        setUserType(type);
        setIsAuthenticated(true);

        if (isAdmin) {
          setAdmin(userData);
        } else {
          setUser(userData);
        }

        // Small delay to ensure state is set before navigation
        await new Promise(resolve => setTimeout(resolve, 100));

        // Return redirect path for component to handle
        const redirectPath = type === 'admin' ? '/admin/dashboard' : '/dashboard';

        return { success: true, data: userData, redirectPath };
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed';
      if (error.response) {
        const d = error.response.data;
        if (error.response.status === 422 && d?.errors) {
          const first = Object.values(d.errors)[0];
          errorMessage = Array.isArray(first) ? first[0] : first;
        } else {
          errorMessage = d?.message || d?.error || (error.response.status === 404 ? 'API endpoint not found.' : 'Login failed');
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      const storedToken = localStorage.getItem('portal_logistics_token');
      const storedUserType = localStorage.getItem('portal_logistics_user_type');
      
      if (storedToken) {
        const endpoint = storedUserType === 'admin'
          ? `${API_BASE_URL}/portallogistice/admin/logout`
          : `${API_BASE_URL}/portallogistice/logout`;
        
        await axios.post(endpoint, {}, {
          headers: {
            'Authorization': `Bearer ${storedToken}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear localStorage
      localStorage.removeItem('portal_logistics_token');
      localStorage.removeItem('portal_logistics_user');
      localStorage.removeItem('portal_logistics_admin');
      localStorage.removeItem('portal_logistics_user_type');

      // Clear state
      setToken(null);
      setUser(null);
      setAdmin(null);
      setUserType(null);
      setIsAuthenticated(false);

      // Redirect handled by component
      window.location.href = '/';
    }
  };

  // Reset password (after OTP verified) — لا يتطلب توكن
  const resetPassword = async (phone, password, password_confirmation) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/portallogistice/reset-password`,
        { phone, password, password_confirmation },
        { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' } }
      );
      if (response.data && response.data.success) {
        return { success: true, message: response.data.message || 'تم تغيير كلمة المرور' };
      }
      return { success: false, error: response.data?.message || 'فشل تغيير كلمة المرور' };
    } catch (error) {
      const d = error.response?.data;
      let msg = 'فشل تغيير كلمة المرور';
      if (error.response?.status === 422 && d?.errors) {
        const first = Object.values(d.errors)[0];
        msg = Array.isArray(first) ? first[0] : first;
      } else if (d?.message) msg = d.message;
      else if (d?.error) msg = d.error;
      return { success: false, error: msg };
    }
  };

  // Get auth headers for API calls
  const getAuthHeaders = () => {
    const storedToken = localStorage.getItem('portal_logistics_token');
    const lang = localStorage.getItem('i18nextLng') || 'ar';
    
    if (!storedToken) {
      console.error('No token found in localStorage');
      return {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-LANG': lang
      };
    }
    
    return {
      'Authorization': `Bearer ${storedToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-LANG': lang
    };
  };

  const value = {
    isAuthenticated,
    user,
    admin,
    userType,
    token,
    loading,
    login,
    logout,
    resetPassword,
    checkAuth,
    getAuthHeaders
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


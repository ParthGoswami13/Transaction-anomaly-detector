import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api, AuthResponse, LoginParams, RegisterParams, ProfileUpdateParams } from '@/lib/api';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

interface AuthContextType {
  user: AuthResponse['user'] | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  macAddresses: string | null;
  register: (params: RegisterParams) => Promise<boolean>;
  login: (params: LoginParams) => Promise<boolean>;
  logout: () => void;
  updateProfile: (params: ProfileUpdateParams) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthResponse['user'] | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('accessToken'));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [macAddresses, setMacAddresses] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const getMacAddresses = async () => {
      try {
        const res = await fetch('http://192.168.4.2/get-mac');
        const macAddress = (await res.json())["mac_address"];
        setMacAddresses(macAddress);
        console.log(macAddress);
      } catch (error) {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        setMacAddresses(result.visitorId);
        console.error('Error getting device ID:', error);
      }
    };
    getMacAddresses();
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (token) {
        setIsLoading(true);
        try {
          const response = await api.getProfile(token);
          console.log(response);
          setUser(response);
        } catch (error) {
          console.error('Error fetching profile:', error);
          setToken(null);
          setUser(null);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchUserProfile();
  }, [token]);

  const register = async (params: RegisterParams): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.register(params);
      localStorage.setItem('accessToken', response.access_token);
      setToken(response.access_token);
      setUser(response.user);
      toast.success('Registration successful!');
      navigate('/dashboard');
      return true;
    } catch (error) {
      setError(error.message || 'Registration failed');
      toast.error(error.message || 'Registration failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (params: LoginParams): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.login({
        ...params,
        token: macAddresses || undefined
      });
      localStorage.setItem('accessToken', response.access_token);
      setToken(response.access_token);
      setUser(response.user);
      localStorage.setItem('user', JSON.stringify(response.user._id));
      localStorage.setItem('amount', JSON.stringify(response.user.amountAvailable));
      toast.success('Login successful!');
      navigate('/dashboard');
      return true;
    } catch (error) {
      setError(error.message || 'Login failed');
      toast.error(error.message || 'Login failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    localStorage.removeItem('accessToken');
    setToken(null);
    setUser(null);
    toast.info('You have been logged out');
    navigate('/login');
  };

  const updateProfile = async (params: ProfileUpdateParams): Promise<boolean> => {
    if (!token) {
      setError('You must be logged in to update your profile');
      toast.error('You must be logged in to update your profile');
      return false;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.updateProfile(params, token);
      setUser(response.user);
      toast.success('Profile updated successfully!');
      return true;
    } catch (error) {
      setError(error.message || 'Profile update failed');
      toast.error(error.message || 'Profile update failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // const fetchAllUsers = async () => {
  //   try {
  //     return await api.getAllUsers();
  //   } catch (error) {
  //     console.error('Error fetching users:', error);
  //     return null;
  //   }
  // };

  const value = {
    user,
    token,
    isLoading,
    error,
    macAddresses,
    register,
    login,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

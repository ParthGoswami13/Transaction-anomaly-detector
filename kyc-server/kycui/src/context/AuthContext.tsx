import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext({
  isAuthenticated: false,
  user: null,
  login: async () => {},  // Default empty function
  logout: () => {},
  register: async () => {},
  forgotPassword: async () => {},
  verifyOtp: async () => {},
  resetPassword: async () => {},
  loading: false
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const res = await axios.post('http://localhost:3001/api/auth/login', { email, password });
      const { access_token, user } = res.data;
      localStorage.setItem('accessToken', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
    } catch (error) {
      console.error('Login failed:', error.response?.data || error.message);
      throw error;
    }
  };

  const register = async (userData: {
    name: string;
    email:string;
    address: string;
    macAddresses: string[]; // Allow multiple device logins
    mobileNumber: string;
    password: string;
    gender: string;
  }) => {
    try {
      const formattedUserData = {
        ...userData,
        macAddresses: Array.isArray(userData.macAddresses) ? userData.macAddresses : [],
      };
      const res = await axios.post('http://localhost:3001/api/auth/register', formattedUserData);
      const { accessToken, userId } = res.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('user', JSON.stringify({ ...userData, _id: userId }));
      setUser({ ...userData, _id: userId });
    } catch (error) {
      console.error('Registration failed:', error.response?.data || error.message);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, register, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

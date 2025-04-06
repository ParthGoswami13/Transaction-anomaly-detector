import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, User, Lock, AlertCircle, MapPin, Smartphone } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import YetiEyes from './YetiEyes';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AuthForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    address: '',
    macAddresses: '',
    mobileNumber: '',
    gender: '',
    occupation: ''
  });
  const [error, setError] = useState(null);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("login");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!formData.mobileNumber || !formData.password) {
      setError("Please fill in all fields.");
      return;
    }
    try {
      const res = await axios.post('http://localhost:3001/api/auth/login', {
        email: formData.mobileNumber,
        password: formData.password,
        token: localStorage.getItem("accessToken"),
      });
      const { accessToken, user } = res.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('user', JSON.stringify(user));
      toast({ title: "Login Successful", description: "You have been logged in." });
      navigate("kyc");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed"+err.message);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.name || !formData.address || !formData.mobileNumber || !formData.gender) {
      setError("Please fill in all fields.");
      return;
    }
    try {
      const formattedUserData = {
        ...formData,
        macAddresses: formData.macAddresses ? formData.macAddresses.split(",").map(mac => mac.trim()) : []
      };
      await axios.post('http://localhost:3001/api/auth/register', formattedUserData);
      toast({ title: "Account created!", description: "Please check your email for a confirmation link before logging in." });
      setActiveTab("login");
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed"+err.message);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  return (
    <Card className="w-full max-w-md border border-border/30 bg-card/70 backdrop-blur-sm">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <form onSubmit={handleLogin}>
            <CardHeader>
              <CardTitle>Login</CardTitle>
              <CardDescription>Access your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mobileNumber">Mobile Number</Label>
                <Input id="mobileNumber" name="mobileNumber" type="tel" placeholder="+1234567890" value={formData.mobileNumber} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" value={formData.password} onChange={handleChange} required minLength={8} />
                <YetiEyes isWatching={showPassword} onClick={togglePasswordVisibility} />
              </div>
              {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
            </CardContent>
            <CardFooter className="flex flex-col">
              <Button type="submit" className="w-full">Login</Button>
            </CardFooter>
          </form>
        </TabsContent>

        <TabsContent value="signup">
          <form onSubmit={handleSignup}>
            <CardHeader>
              <CardTitle>Create an Account</CardTitle>
              <CardDescription>Join our community</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <select id="gender" name="gender" value={formData.gender} onChange={handleChange} required className="w-full p-2 border rounded bg-gray-800 text-white">
                  <option value="" className="w-full p-2 border rounded bg-gray-800 text-white">Select Gender</option>
                  <option value="male" className="w-full p-2 border rounded bg-gray-800 text-white">Male</option>
                  <option value="female" className="w-full p-2 border rounded bg-gray-800 text-white">Female</option>
                  <option value="other" className="w-full p-2 border rounded bg-gray-800 text-white">Other</option>
                </select>
              </div>
            </CardContent>
          </form>
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default AuthForm;

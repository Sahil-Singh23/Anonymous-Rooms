import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Input from '../components/Input';
import Alert from '../components/Alert';
import ChatIcon from '../icons/ChatIcon';
import Glow from '../components/Glow';
import Navbar from '../components/Navbar';
import { Github } from 'lucide-react';

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error'>('error');

  const { signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const fallBackUrl = 'http://localhost:8080';

  // Redirect if already logged in
  if (isAuthenticated) {
    navigate('/');
    return null;
  }

  const validateForm = () => {
    if (!name.trim()) {
      setAlertMessage('Name is required');
      return false;
    }
    if (!email.trim()) {
      setAlertMessage('Email is required');
      return false;
    }
    if (password.length < 6) {
      setAlertMessage('Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setAlertMessage('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setAlertType('error');
      setShowAlert(true);
      return;
    }

    setIsLoading(true);
    try {
      await signup(email, name, password);
      setAlertMessage('Account created successfully!');
      setAlertType('success');
      setShowAlert(true);
      setTimeout(() => navigate('/'), 1500);
    } catch (error: any) {
      setAlertMessage(error.message || 'Signup failed');
      setAlertType('error');
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    const apiUrl = import.meta.env.VITE_API_URL || fallBackUrl;
    window.location.href = `${apiUrl}/auth/login/federated/google`;
  };

  return (
    <section className="min-h-screen bg-[#080605]">
      {showAlert && (
        <Alert
          message={alertMessage}
          type={alertType}
          onClose={() => setShowAlert(false)}
        />
      )}
      <Glow></Glow>
      <Navbar />
      <section className="fixed top-6 right-6 md:right-25 z-50">
        <a
          href="https://github.com/Sahil-Singh23/Chat_App_Websockets"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 border border-neutral-600 px-3 py-1 rounded-lg text-neutral-400 text-sm hover:text-neutral-300 hover:border-neutral-500 transition-all duration-200 whitespace-nowrap"
        >
          <Github size={16} />
          Star us on GitHub
        </a>
      </section>

      <div className="flex flex-col items-center justify-center min-h-screen px-3 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-start p-6 md:p-8 rounded-2xl border border-solid border-neutral-700">
            <div className="flex items-center mb-6 gap-3">
              <ChatIcon></ChatIcon>
              <span className="text-[#FFF6E0] text-2xl font-ntbricksans">Sign Up</span>
            </div>

            {/* Google Signup Button */}
            <button
              onClick={handleGoogleSignup}
              className="w-full px-4 py-2 bg-white hover:bg-neutral-100 text-black font-medium rounded-lg transition-colors duration-200 text-sm flex items-center justify-center gap-2 mb-4"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign up with Google
            </button>

            <div className="w-full my-4 flex items-center gap-3">
              <div className="flex-1 h-px bg-neutral-600"></div>
              <span className="text-neutral-400 text-xs">OR</span>
              <div className="flex-1 h-px bg-neutral-600"></div>
            </div>

            <form onSubmit={handleSubmit} className="w-full space-y-4">
              <div>
                <label className="text-white text-sm mb-2 block">Name</label>
                <Input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.currentTarget.value)}
                  width="w-full"
                />
              </div>

              <div>
                <label className="text-white text-sm mb-2 block">Email</label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                  width="w-full"
                />
              </div>

              <div>
                <label className="text-white text-sm mb-2 block">Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                  width="w-full"
                />
              </div>

              <div>
                <label className="text-white text-sm mb-2 block">Confirm Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.currentTarget.value)}
                  width="w-full"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isLoading) {
                      handleSubmit(e as any);
                    }
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-2 bg-white hover:bg-neutral-100 text-black font-medium rounded-lg transition-colors duration-200 text-sm"
              >
                {isLoading ? 'Creating account...' : 'Sign Up'}
              </button>
            </form>

            <p className="mt-6 text-center text-neutral-400 text-sm w-full">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-400 hover:text-blue-300">
                Login
              </Link>
            </p>

            <p className="mt-3 text-center text-neutral-400 text-sm w-full">
              Or{' '}
              <Link to="/" className="text-blue-400 hover:text-blue-300">
                continue as guest
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Signup;

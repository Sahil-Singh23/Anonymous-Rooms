import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Alert from '../components/Alert';
import Glow from '../components/Glow';

const AuthCallback = () => {
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error'>('error');
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Backend already set JWT in httpOnly cookie
        // Just verify auth state is loaded
        await checkAuth();
        setAlertMessage('Login successful!');
        setAlertType('success');
        setShowAlert(true);
        setTimeout(() => navigate('/'), 1500);
      } catch (error) {
        console.error('Callback error:', error);
        setAlertMessage('Authentication failed. Please try again.');
        setAlertType('error');
        setShowAlert(true);
        setTimeout(() => navigate('/login'), 2000);
      }
    };

    handleCallback();
  }, [navigate, checkAuth]);

  return (
    <section className="min-h-screen bg-[#080605] flex items-center justify-center">
      <Glow></Glow>
      {showAlert && (
        <Alert
          message={alertMessage}
          type={alertType}
          onClose={() => setShowAlert(false)}
        />
      )}
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="text-white mt-4">Authenticating...</p>
      </div>
    </section>
  );
};

export default AuthCallback;

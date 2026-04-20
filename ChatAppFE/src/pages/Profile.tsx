import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import profileService, { type UserProfile } from '../services/profileService';
import ProfilePictureUpload from '../components/ProfilePictureUpload';
import Alert from '../components/Alert';
import Navbar from '../components/Navbar';
import Glow from '../components/Glow';
import Button from '../components/Button';
import { Github } from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    // Redirect if not authenticated
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }

    // Load profile
    if (isAuthenticated) {
      loadProfile();
    }
  }, [isAuthenticated, authLoading, navigate]);

  const loadProfile = async () => {
    if (!isAuthenticated) return;

    try {
      setIsLoading(true);
      const profileData = await profileService.getMyProfile();
      setProfile(profileData);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to load profile';
      setAlertType('error');
      setAlertMessage(errorMessage);
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfilePicSuccess = (newPicUrl: string) => {
    if (profile) {
      setProfile({
        ...profile,
        profilePicUrl: newPicUrl,
      });
    }
    setAlertType('success');
    setAlertMessage('Profile picture updated!');
    setShowAlert(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
      setAlertMessage('Logout failed');
      setAlertType('error');
      setShowAlert(true);
    }
  };

  if (authLoading || isLoading) {
    return (
      <section className="min-h-screen bg-[#080605] flex items-center justify-center">
        <Glow></Glow>
        <Navbar />
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-4 border-neutral-700 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-[#FFFAED] rounded-full animate-spin"></div>
          </div>
          <p className="text-white/70 text-sm font-sfmono">Loading profile...</p>
        </div>
      </section>
    );
  }

  if (!profile) {
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
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Profile not found</h1>
            <Button
              text="Back to Home"
              onClick={() => navigate('/')}
              width="w-full max-w-xs"
            />
          </div>
        </div>
      </section>
    );
  }

  const createdDate = new Date(profile.createdAt);
  const formattedDate = createdDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

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
        <div className="w-full max-w-2xl">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-8 space-y-8">
            {/* Profile Picture Section */}
            <div className="flex flex-col items-center">
              <ProfilePictureUpload
                currentPicUrl={profile.profilePicUrl}
                onSuccess={handleProfilePicSuccess}
              />
            </div>

            {/* Profile Info */}
            <div className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-neutral-400 text-xs mb-2 font-sfmono">NAME</label>
                <p className="text-2xl font-ntbricksans text-[#FFFAED]">{profile.name}</p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-neutral-400 text-xs mb-2 font-sfmono">EMAIL</label>
                <p className="text-base font-sfmono text-neutral-300">{profile.email}</p>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-700">
                <div className="bg-neutral-800 rounded-lg p-4">
                  <p className="text-neutral-400 text-xs font-sfmono mb-2">ROOMS JOINED</p>
                  <p className="text-3xl font-ntbricksans text-[#FFFAED]">
                    {profile.totalRoomsJoined}
                  </p>
                </div>
                <div className="bg-neutral-800 rounded-lg p-4">
                  <p className="text-neutral-400 text-xs font-sfmono mb-2">MEMBER SINCE</p>
                  <p className="text-sm font-sfmono text-neutral-200">
                    {formattedDate}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 flex-col sm:flex-row">
              <Button
                text="Home"
                onClick={() => navigate('/')}
                width="flex-1"
              />
              <Button
                text="Logout"
                onClick={handleLogout}
                width="flex-1"
                variant="ghost"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Profile;

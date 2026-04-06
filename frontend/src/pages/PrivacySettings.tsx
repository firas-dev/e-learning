import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import {
  Shield,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle,
  Info,
} from 'lucide-react';

const API_URL = "http://localhost:5000/api";

export default function PrivacySettings() {
  const { user } = useAuth();

  const [emotionDetectionEnabled, setEmotionDetectionEnabled] = useState(true);
  const [cameraConsentGiven, setCameraConsentGiven] = useState(false);
  const [dataSharingEnabled, setDataSharingEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user?._id) loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    try {
      const res = await fetch(`${API_URL}/preferences/${user._id}`);
      const data = await res.json();

      if (data) {
        setEmotionDetectionEnabled(data.emotionDetectionEnabled);
        setCameraConsentGiven(data.cameraConsentGiven);
        setDataSharingEnabled(data.dataSharingEnabled);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      const res = await fetch(`${API_URL}/preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user._id,
          emotionDetectionEnabled,
          cameraConsentGiven,
          dataSharingEnabled,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  if (loading) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Privacy Settings</h1>

        {saved && (
          <div className="mb-4 p-3 bg-green-100 rounded flex items-center gap-2">
            <CheckCircle /> Saved successfully
          </div>
        )}

        {/* Emotion Detection */}
        <div className="bg-white p-5 rounded shadow mb-4">
          <h2 className="font-bold mb-2">AI Emotion Detection</h2>

          <button
            onClick={() => setEmotionDetectionEnabled(!emotionDetectionEnabled)}
            className="mb-3 px-4 py-2 bg-blue-500 text-white rounded"
          >
            {emotionDetectionEnabled ? 'Disable' : 'Enable'}
          </button>

          {emotionDetectionEnabled && (
            <button
              onClick={() => setCameraConsentGiven(!cameraConsentGiven)}
              className="block px-4 py-2 bg-gray-200 rounded"
            >
              {cameraConsentGiven ? (
                <>
                  <Eye /> Camera Enabled
                </>
              ) : (
                <>
                  <EyeOff /> Enable Camera
                </>
              )}
            </button>
          )}
        </div>

        {/* Data Sharing */}
        <div className="bg-white p-5 rounded shadow mb-4">
          <h2 className="font-bold mb-2">Data Sharing</h2>

          <button
            onClick={() => setDataSharingEnabled(!dataSharingEnabled)}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            {dataSharingEnabled ? 'Disable' : 'Enable'}
          </button>
        </div>

        {/* Save */}
        <button
          onClick={handleSavePreferences}
          className="w-full bg-green-600 text-white py-3 rounded"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import axios from 'axios';
import {
  Shield,
  Camera,
  Share2,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  Brain,
  Lock,
  RefreshCw,
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

interface Preferences {
  emotionDetectionEnabled: boolean;
  cameraConsentGiven: boolean;
  dataSharingEnabled: boolean;
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-blue-600' : 'bg-gray-200'
      }`}
      aria-checked={checked}
      role="switch"
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function SettingCard({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  description,
  checked,
  onChange,
  disabled,
  badge,
}: {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <div className={`bg-white rounded-xl border p-6 transition-all ${
      checked ? 'border-blue-200 shadow-sm' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
              {badge && (
                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                  {badge}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="flex-shrink-0 mt-0.5">
          <ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} />
        </div>
      </div>
    </div>
  );
}

export default function PrivacySettings() {
  const { user } = useAuth();

  const [prefs, setPrefs] = useState<Preferences>({
    emotionDetectionEnabled: true,
    cameraConsentGiven: false,
    dataSharingEnabled: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // ── Load preferences ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user?._id) return;

    const load = async () => {
      try {
        const res = await axios.get(`${API_URL}/preferences/${user._id}`);
        if (res.data) {
          setPrefs({
            emotionDetectionEnabled: res.data.emotionDetectionEnabled ?? true,
            cameraConsentGiven: res.data.cameraConsentGiven ?? false,
            dataSharingEnabled: res.data.dataSharingEnabled ?? true,
          });
        }
      } catch (err: any) {
        // 404 means no preferences saved yet — use defaults
        if (err?.response?.status !== 404) {
          console.error('Failed to load preferences:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?._id]);

  // ── Save preferences ──────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user?._id) return;
    setSaving(true);
    setStatus('idle');
    setErrorMsg('');

    try {
      await axios.post(`${API_URL}/preferences`, {
        userId: user._id,
        ...prefs,
      });
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err?.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  // ── When emotion detection is toggled off, also revoke camera consent ──
  const handleEmotionToggle = (val: boolean) => {
    setPrefs((p) => ({
      ...p,
      emotionDetectionEnabled: val,
      cameraConsentGiven: val ? p.cameraConsentGiven : false,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-80">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Privacy & Settings</h1>
          </div>
          <p className="text-gray-500 text-sm ml-13">
            Control how EduSmart AI uses your data and devices.
          </p>
        </div>

        {/* Status banner */}
        {status === 'success' && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            Settings saved successfully.
          </div>
        )}
        {status === 'error' && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* Section: AI Features */}
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
            AI Features
          </h2>
          <div className="space-y-3">
            <SettingCard
              icon={Brain}
              iconColor="text-purple-600"
              iconBg="bg-purple-100"
              title="AI Emotion Detection"
              description="Allows the platform to analyze your facial expressions during lessons to adapt content and detect engagement levels. No video is stored."
              checked={prefs.emotionDetectionEnabled}
              onChange={handleEmotionToggle}
              badge="AI"
            />

            <SettingCard
              icon={prefs.cameraConsentGiven ? Camera : EyeOff}
              iconColor={prefs.cameraConsentGiven ? 'text-blue-600' : 'text-gray-400'}
              iconBg={prefs.cameraConsentGiven ? 'bg-blue-100' : 'bg-gray-100'}
              title="Camera Access"
              description={
                prefs.emotionDetectionEnabled
                  ? 'Grant permission for your camera to be used during learning sessions. Analysis runs locally in your browser — nothing is uploaded.'
                  : 'Enable AI Emotion Detection above to use camera access.'
              }
              checked={prefs.cameraConsentGiven}
              onChange={(val) => setPrefs((p) => ({ ...p, cameraConsentGiven: val }))}
              disabled={!prefs.emotionDetectionEnabled}
            />
          </div>
        </div>

        {/* Section: Data */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
            Data & Analytics
          </h2>
          <div className="space-y-3">
            <SettingCard
              icon={Share2}
              iconColor="text-teal-600"
              iconBg="bg-teal-100"
              title="Usage Data Sharing"
              description="Share anonymized usage data to help improve EduSmart AI. This includes lesson interaction patterns, feature usage, and engagement metrics — never personal information."
              checked={prefs.dataSharingEnabled}
              onChange={(val) => setPrefs((p) => ({ ...p, dataSharingEnabled: val }))}
            />
          </div>
        </div>

        {/* Privacy notice */}
        <div className="mb-8 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-semibold mb-1">Your privacy is protected</p>
            <ul className="space-y-0.5 text-blue-600">
              <li>• No video or audio is ever recorded or stored</li>
              <li>• Emotion data is processed locally in your browser</li>
              <li>• Only aggregated metrics are saved to our servers</li>
              <li>• You can change these settings at any time</li>
            </ul>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}
import { useMemo, useState, useRef } from 'react';
import {
  ArrowLeft,
  Download,
  ImagePlus,
  Sparkles,
  UploadCloud,
  X,
  Loader,
  AlertCircle,
  Zap,
  FileImage,
} from 'lucide-react';
import { middleware_url } from '../../utils/constants';

const bannerTemplates = [
  {
    id: 'corporate-achievement',
    name: 'Corporate Achievement',
    title: 'Corporate Achievement',
    accent: '#2563eb',
    secondary: '#dbeafe',
    summary: 'Celebrating milestones and corporate success.',
    emoji: '🏆'
  },
  {
    id: 'employee-recognition',
    name: 'Employee Recognition',
    title: 'Employee Recognition',
    accent: '#1e40af',
    secondary: '#bfdbfe',
    summary: 'Celebrating contribution, impact, and teamwork.',
    emoji: '👏'
  },
  {
    id: 'sales-champion',
    name: 'Sales Champion',
    title: 'Sales Champion',
    accent: '#dc2626',
    secondary: '#fee2e2',
    summary: 'Recognizing top sales performers and revenue wins.',
    emoji: '⭐'
  },
  {
    id: 'leadership-award',
    name: 'Leadership Award',
    title: 'Leadership Award',
    accent: '#7c3aed',
    secondary: '#ede9fe',
    summary: 'Honoring excellence in leadership and vision.',
    emoji: '👑'
  },
  {
    id: 'milestone-celebration',
    name: 'Milestone Celebration',
    title: 'Milestone Celebration',
    accent: '#16a34a',
    secondary: '#dcfce7',
    summary: 'Celebrating achievements and company milestones.',
    emoji: '🎉'
  },
  {
    id: 'star-performer',
    name: 'Star Performer',
    title: 'Star Performer',
    accent: '#f59e0b',
    secondary: '#fef3c7',
    summary: 'Recognizing exceptional performance and results.',
    emoji: '✨'
  },
] as const;

interface ImageUploadProps {
  label: string;
  value: string | null;
  onChange: (file: File | null) => void;
  onClear: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
  placeholder?: string;
  accept?: string;
  helpText?: string;
}

function ImageUploadField({ label, value, onChange, onClear, inputRef, placeholder, accept = "image/*", helpText }: ImageUploadProps) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">{label}</label>
      <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-[#005AC3] hover:bg-blue-50">
        {value ? (
          <div className="relative">
            <img src={value} alt={label} className="h-32 w-full rounded-lg object-cover" />
            <button
              type="button"
              onClick={onClear}
              className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 py-6">
            <FileImage size={24} className="text-slate-400" />
            <div className="text-center">
              <div className="text-sm font-medium text-slate-700">{placeholder || 'Click to upload'}</div>
              <div className="text-xs text-slate-500">PNG, JPG, JPEG (Max 10MB)</div>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              onChange={(e) => onChange(e.target.files?.[0] || null)}
              className="sr-only"
            />
          </label>
        )}
      </div>
      {helpText && <p className="mt-1 text-xs text-slate-500">{helpText}</p>}
    </div>
  );
}

function PromptExampleCard({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-600 hover:border-[#005AC3] hover:bg-blue-50"
    >
      {text}
    </button>
  );
}

interface EmployeeData {
  name: string;
  photo: string | null;
  achievement?: string;
}

export function SalesBannerGenerator({ onBack }: { onBack: () => void }) {
  // Core banner fields
  const [selectedTemplate, setSelectedTemplate] = useState<(typeof bannerTemplates)[number]['id']>('employee-recognition');
  const [bannerTitle, setBannerTitle] = useState('Awards Ceremony');
  const [description, setDescription] = useState('');
  const [theme, setTheme] = useState('Award Recognition');

  // Employee data (1-4 employees)
  const [numberOfEmployees, setNumberOfEmployees] = useState<1 | 2 | 3 | 4>(1);
  const [employees, setEmployees] = useState<EmployeeData[]>([
    { name: '', photo: null, achievement: '' },
    { name: '', photo: null, achievement: '' },
    { name: '', photo: null, achievement: '' },
    { name: '', photo: null, achievement: '' },
  ]);

  // Background options
  const [backgroundPrompt, setBackgroundPrompt] = useState('');
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundMode, setBackgroundMode] = useState<'prompt' | 'image'>('prompt');

  // Reference image (optional) for styling guidance
  const [referenceImage, setReferenceImage] = useState<string | null>(null);

  // UI state
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ title: string; time: string; image: string }>>([]);

  // File input refs
  const backgroundImageInputRef = useRef<HTMLInputElement>(null);
  const referenceImageInputRef = useRef<HTMLInputElement>(null);
  const employeePhotoInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const activeTemplate = useMemo(
    () => bannerTemplates.find((template) => template.id === selectedTemplate) ?? bannerTemplates[0],
    [selectedTemplate],
  );

  // Utility functions
  const handleFileUpload = (file: File | null, setImageState: (img: string) => void) => {
    if (!file) return;

    // Validate file
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      setError('Only PNG, JPG, and JPEG files are supported');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setImageState(result);
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const handleEmployeePhotoUpload = (index: number, file: File | null) => {
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      setError('Only PNG, JPG, and JPEG files are supported');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const newEmployees = [...employees];
      newEmployees[index].photo = result;
      setEmployees(newEmployees);
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const handleEmployeeNameChange = (index: number, name: string) => {
    const newEmployees = [...employees];
    newEmployees[index].name = name;
    setEmployees(newEmployees);
  };

  const handleEmployeeAchievementChange = (index: number, achievement: string) => {
    const newEmployees = [...employees];
    newEmployees[index].achievement = achievement;
    setEmployees(newEmployees);
  };

  const clearEmployeePhoto = (index: number) => {
    const newEmployees = [...employees];
    newEmployees[index].photo = null;
    setEmployees(newEmployees);
  };

  // Background prompt examples
  const backgroundPromptExamples = [
    'Modern corporate achievement ceremony with blue and gold theme',
    'Premium employee recognition stage with spotlight effects',
    'Professional sales celebration background with futuristic design',
    'Executive appreciation banner with elegant corporate aesthetics',
    'Vibrant team celebration with dynamic energy and motion',
    'Minimalist professional achievement background'
  ];

  const generateBanner = async () => {
    // Validation
    if (!bannerTitle.trim()) {
      setError('Banner title is required');
      return;
    }

    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    // Background is OPTIONAL if reference image is provided
    const hasReference = !!referenceImage;
    const hasBackgroundImage = !!backgroundImage;
    const hasBackgroundPrompt = !!backgroundPrompt.trim();

    if (!hasReference && !hasBackgroundImage && !hasBackgroundPrompt) {
      setError(
        "Provide reference image, background image or background prompt"
      );
      return;
    }

    // Validate active employees
    for (let i = 0; i < numberOfEmployees; i++) {
      if (!employees[i].name.trim()) {
        setError(`Employee ${i + 1} name is required`);
        return;
      }
      if (!employees[i].photo) {
        setError(`Employee ${i + 1} photo is required`);
        return;
      }
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');

      const payload = {
        title: bannerTitle.trim(),
        description: description.trim(),
        theme: theme.trim() || 'Professional Recognition',
        template_id: selectedTemplate,
        background_prompt: backgroundPrompt.trim() || "",
        background_image: backgroundMode === 'image' ? backgroundImage : null,
        reference_image: referenceImage,
        aspect_ratio: aspectRatio,
        number_of_employees: numberOfEmployees,
        employees: employees.slice(0, numberOfEmployees).map((emp) => ({
          name: emp.name.trim(),
          photo: emp.photo,
          achievement: (emp.achievement || '').trim(),
        })),
        accent_color: activeTemplate.accent,
      };

      const response = await fetch(`${middleware_url}/batch_process/sales_platform/banner/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Banner generation failed');
      }

      const imageData = data.image_base64 || data.banner?.image_base64 || data.preview_url;
      if (!imageData) {
        throw new Error('No banner image returned by the server');
      }

      const bannerImage = imageData.startsWith('data:image') ? imageData : `data:image/png;base64,${imageData}`;
      setPreviewUrl(bannerImage);
      setSuccess('Banner generated successfully!');

      setHistory((prev) => [{
        title: bannerTitle.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        image: bannerImage,
      }, ...prev].slice(0, 6));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate banner');
    } finally {
      setLoading(false);
    }
  };

  const downloadBanner = () => {
    if (!previewUrl) return;
    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = `award-banner-${new Date().getTime()}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-800">
      <div className="mx-auto max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          {/* Left Sidebar - Configuration */}
          <div className="space-y-6 max-h-[calc(100vh-120px)] overflow-y-auto pr-2">
            {/* Template Selection */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <label className="mb-3 block text-sm font-bold text-slate-900">
                <Sparkles size={18} className="mb-2 inline text-[#005AC3]" /> Template
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-[#005AC3] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#005AC3]"
              >
                {bannerTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.emoji} {template.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Banner Content */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                <FileImage size={20} className="text-[#005AC3]" />
                Banner Content
              </h2>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-600">
                    Banner Title *
                  </label>
                  <input
                    value={bannerTitle}
                    onChange={(e) => setBannerTitle(e.target.value)}
                    placeholder="e.g., Annual Awards Ceremony"
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm focus:border-[#005AC3] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#005AC3]"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-600">
                    Description *
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., Recognizing excellence and outstanding performance"
                    className="min-h-[80px] w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm focus:border-[#005AC3] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#005AC3]"
                  />
                </div>

                {/* Theme */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-600">
                    Theme/Category
                  </label>
                  <input
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    placeholder="e.g., Annual Excellence"
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm focus:border-[#005AC3] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#005AC3]"
                  />
                </div>

                {/* Number of Employees */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-600">
                    Number of Recipients *
                  </label>
                  <select
                    value={numberOfEmployees}
                    onChange={(e) => setNumberOfEmployees(parseInt(e.target.value) as any)}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-[#005AC3] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#005AC3]"
                  >
                    <option value={1}>1 Recipient</option>
                    <option value={2}>2 Recipients</option>
                    <option value={3}>3 Recipients</option>
                    <option value={4}>4 Recipients</option>
                  </select>
                </div>

                {/* Aspect Ratio */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-600">
                    Aspect Ratio
                  </label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-[#005AC3] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#005AC3]"
                  >
                    <option value="16:9">16:9 (Widescreen)</option>
                    <option value="1:1">1:1 (Square)</option>
                    <option value="4:5">4:5 (Portrait)</option>
                    <option value="9:16">9:16 (Vertical)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right Main Area */}
          <div className="space-y-6">
            {/* Background Section */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-slate-900">
                <UploadCloud size={20} className="text-[#005AC3]" />
                Background
              </h2>
              <p className="mb-4 text-xs text-slate-500">
                {referenceImage 
                  ? "Optional: Provide background if you want to customize beyond reference image" 
                  : "Required: Upload image or provide description for AI to generate"}
              </p>

              <div className="mb-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setBackgroundMode('prompt')}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    backgroundMode === 'prompt'
                      ? 'border-[#005AC3] bg-blue-50 text-[#005AC3]'
                      : 'border border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                  disabled={referenceImage ? false : false}
                >
                  AI Prompt
                </button>
                <button
                  type="button"
                  onClick={() => setBackgroundMode('image')}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    backgroundMode === 'image'
                      ? 'border-[#005AC3] bg-blue-50 text-[#005AC3]'
                      : 'border border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                >
                  Upload Image
                </button>
              </div>

              {backgroundMode === 'prompt' ? (
                <div>
                  <textarea
                    value={backgroundPrompt}
                    onChange={(e) => setBackgroundPrompt(e.target.value)}
                    placeholder="Describe your desired background..."
                    className="min-h-[100px] w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:border-[#005AC3] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#005AC3]"
                  />
                </div>
              ) : (
                <div>
                  <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-[#005AC3] hover:bg-blue-50">
                    {backgroundImage ? (
                      <div className="relative">
                        <img src={backgroundImage} alt="Background" className="h-32 w-full rounded-lg object-cover" />
                        <button
                          type="button"
                          onClick={() => setBackgroundImage(null)}
                          className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 py-6">
                        <UploadCloud size={24} className="text-slate-400" />
                        <div className="text-center">
                          <div className="text-sm font-medium text-slate-700">Click to upload background</div>
                          <div className="text-xs text-slate-500">PNG, JPG, JPEG (Max 10MB)</div>
                        </div>
                        <input
                          ref={backgroundImageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e.target.files?.[0] || null, setBackgroundImage)}
                          className="sr-only"
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Reference Image Section (Optional) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-slate-900">
                <ImagePlus size={20} className="text-[#005AC3]" />
                Reference Image
              </h2>
              <p className="mb-4 text-xs text-slate-500">Optional: Upload a reference banner for styling guidance and similar appearance</p>

              <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-[#005AC3] hover:bg-blue-50">
                {referenceImage ? (
                  <div className="relative">
                    <img src={referenceImage} alt="Reference" className="h-32 w-full rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => setReferenceImage(null)}
                      className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 py-6">
                    <ImagePlus size={24} className="text-slate-400" />
                    <div className="text-center">
                      <div className="text-sm font-medium text-slate-700">Click to upload reference banner</div>
                      <div className="text-xs text-slate-500">PNG, JPG, JPEG (Max 10MB)</div>
                    </div>
                    <input
                      ref={referenceImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e.target.files?.[0] || null, setReferenceImage)}
                      className="sr-only"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Recipients Section */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                <ImagePlus size={20} className="text-[#005AC3]" />
                Recipients ({numberOfEmployees})
              </h2>

              <div className="space-y-6">
                {Array.from({ length: numberOfEmployees }).map((_, index) => (
                  <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">Recipient {index + 1}</span>
                    </div>

                    {/* Name Input */}
                    <div className="mb-3">
                      <label className="mb-2 block text-xs font-semibold text-slate-600">Name *</label>
                      <input
                        value={employees[index].name}
                        onChange={(e) => handleEmployeeNameChange(index, e.target.value)}
                        placeholder="Enter recipient name"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#005AC3] focus:outline-none focus:ring-1 focus:ring-[#005AC3]"
                      />
                    </div>

                    {/* Achievement Input */}
                    <div className="mb-3">
                      <label className="mb-2 block text-xs font-semibold text-slate-600">Specific Achievement <span className="text-slate-400">(Optional)</span></label>
                      <textarea
                        value={employees[index].achievement || ''}
                        onChange={(e) => handleEmployeeAchievementChange(index, e.target.value)}
                        placeholder="e.g., Top Sales Performer - 150% of Target, Led Q4 Digital Transformation Initiative"
                        className="min-h-[60px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-[#005AC3] focus:outline-none focus:ring-1 focus:ring-[#005AC3] resize-none"
                      />
                      <p className="mt-1 text-xs text-slate-500">Highlight specific accomplishments or awards</p>
                    </div>

                    {/* Photo Input */}
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-slate-600">Photo *</label>
                      <div className="rounded-lg border-2 border-dashed border-slate-300 bg-white p-3 transition hover:border-[#005AC3] hover:bg-blue-50">
                        {employees[index].photo ? (
                          <div className="relative">
                            <img
                              src={employees[index].photo}
                              alt={`Recipient ${index + 1}`}
                              className="h-24 w-full rounded-lg object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => clearEmployeePhoto(index)}
                              className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <label className="flex cursor-pointer flex-col items-center justify-center gap-1 py-4">
                            <ImagePlus size={20} className="text-slate-400" />
                            <div className="text-center">
                              <div className="text-xs font-medium text-slate-700">Click to upload</div>
                              <div className="text-xs text-slate-500">PNG, JPG (Max 10MB)</div>
                            </div>
                            <input
                              ref={(ref) => {
                                if (ref) employeePhotoInputRefs.current[index] = ref;
                              }}
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleEmployeePhotoUpload(index, e.target.files?.[0] || null)}
                              className="sr-only"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview Section */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <Sparkles size={20} className="text-[#005AC3]" />
                  Preview
                </h2>
                {previewUrl && (
                  <button
                    onClick={downloadBanner}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                  >
                    <Download size={16} />
                    Download PNG
                  </button>
                )}
              </div>

              <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4">
                {previewUrl ? (
                  <img src={previewUrl} alt="Generated banner" className="mx-auto max-h-[400px] w-full rounded-lg object-contain shadow-md" />
                ) : (
                  <div className="flex min-h-[300px] items-center justify-center">
                    <div className="text-center">
                      <Sparkles size={40} className="mx-auto mb-3 text-slate-400" />
                      <p className="text-sm font-medium text-slate-600">Your banner preview will appear here</p>
                      <p className="mt-1 text-xs text-slate-500">Fill in all required fields and click Generate</p>
                    </div>
                  </div>
                )}
              </div>

              {history.length > 0 && (
                <div className="mt-6 space-y-2">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest">Recent Banners</p>
                  <div className="grid grid-cols-3 gap-3">
                    {history.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => setPreviewUrl(item.image)}
                        className="group relative overflow-hidden rounded-lg border border-slate-200 hover:border-[#005AC3]"
                      >
                        <img src={item.image} alt={item.title} className="h-20 w-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-end p-2">
                          <div className="truncate text-xs font-semibold text-white opacity-0 group-hover:opacity-100 transition">
                            {item.title}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={generateBanner}
                disabled={loading}
                className="flex-1 rounded-xl bg-gradient-to-r from-[#005AC3] to-[#0049aa] px-6 py-3 text-center font-semibold text-white shadow-lg hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap size={18} />
                    Generate Award Banner
                  </>
                )}
              </button>
            </div>

            {/* Messages */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-red-900">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex items-start gap-3">
                <Sparkles size={18} className="mt-0.5 flex-shrink-0 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">{success}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { operationsService } from '../../services/operationsService';
import { schoolService, DEFAULT_SCHOOL_ID, DEFAULT_WEBSITE_CONTENT } from '../../services/schoolService';
import { WebsiteContent, HeroSlide, TypographyStyle, WebsiteTypographyConfig } from '../../types';
import { compressImage } from '../../utils/imageCompressor';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import {
  Globe,
  Save,
  Upload,
  Image as ImageIcon,
  PlusCircle,
  Trash2,
  Edit2,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Sparkles,
  Layers,
  Check,
  Eye,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Palette,
  School as SchoolIcon,
  RefreshCw,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Smartphone,
  Building,
  BarChart2,
  Users,
  Award,
  DollarSign,
  Megaphone,
} from 'lucide-react';

const PRESET_IMAGES = [
  {
    name: 'School Front & Campus Grounds',
    url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1600&q=80',
  },
  {
    name: 'Integrated Science & Robotics Lab',
    url: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1600&q=80',
  },
  {
    name: 'Semi-Olympic Swimming Pool',
    url: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=1600&q=80',
  },
  {
    name: 'Digital CBC Library & E-Readers',
    url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1600&q=80',
  },
  {
    name: 'Early Years Sensory Playground',
    url: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=1600&q=80',
  },
  {
    name: 'Choir & Musical Arts Auditorium',
    url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1600&q=80',
  },
];

const PRESET_LOGOS = [
  {
    name: 'Modern Torch of Knowledge',
    url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=200&q=80',
  },
  {
    name: 'Excellence Crest & Open Book',
    url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=200&q=80',
  },
];

const COLOR_SWATCHES = [
  { label: 'Pure White', value: '#ffffff' },
  { label: 'Golden Amber', value: '#fbbf24' },
  { label: 'Emerald Green', value: '#34d399' },
  { label: 'Sky Blue', value: '#93c5fd' },
  { label: 'Slate Silver', value: '#cbd5e1' },
  { label: 'Rose Gold', value: '#f472b6' },
  { label: 'Deep Blue', value: '#1e3a8a' },
  { label: 'Charcoal Black', value: '#0f172a' },
];

interface WebsiteCMSViewProps {
  onOpenPublicSite?: () => void;
}

export const WebsiteCMSView: React.FC<WebsiteCMSViewProps> = ({ onOpenPublicSite }) => {
  const { school, reloadSchoolData } = useAuth();
  const { showToast } = useToast();

  const [content, setContent] = useState<WebsiteContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'slides' | 'announcement' | 'logo' | 'stats' | 'typography' | 'about' | 'facilities' | 'payment' | 'faqs'
  >('slides');

  // Preview Slide Index
  const [previewSlideIdx, setPreviewSlideIdx] = useState(0);

  // Slide Modal (Create / Edit)
  const [isSlideModalOpen, setIsSlideModalOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);
  const [slideForm, setSlideForm] = useState<HeroSlide>({
    id: '',
    title: '',
    subtitle: '',
    imageUrl: '',
    badgeText: 'CBC Competency Excellence',
    buttonText: 'Enroll Your Child',
    buttonLink: 'admission',
    order: 1,
    isActive: true,
  });

  // File Inputs Ref
  const slideFileInputRef = useRef<HTMLInputElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadContent();
  }, [school?.id]);

  const loadContent = async () => {
    setLoading(true);
    try {
      const sid = school?.id || DEFAULT_SCHOOL_ID;
      const data = await operationsService.getWebsiteContent(sid);
      if (data) {
        // Ensure defaults for slides and typography if not present
        const ensuredSlides =
          data.heroSlides && data.heroSlides.length > 0
            ? data.heroSlides
            : [
                {
                  id: 'slide-1',
                  title: data.heroTitle || 'Inspiring Young Minds, Building Future Leaders',
                  subtitle:
                    data.heroSubtitle ||
                    'A Premier Kenyan Primary & Junior School from Playgroup to Grade 9.',
                  imageUrl:
                    data.heroBannerUrl ||
                    'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1600&q=80',
                  badgeText: 'Leading CBC Competency-Based Education in Kasarani Mwiki',
                  buttonText: 'Enroll Your Child (2026 Intake)',
                  buttonLink: 'admission',
                  order: 1,
                  isActive: true,
                },
              ];

        const ensuredStats = {
          ...DEFAULT_WEBSITE_CONTENT.stats,
          ...(data.stats || {}),
        };

        const ensuredFacilities =
          data.facilities && data.facilities.length > 0
            ? data.facilities
            : DEFAULT_WEBSITE_CONTENT.facilities;

        const ensuredFaqs =
          data.faqs && data.faqs.length > 0
            ? data.faqs
            : DEFAULT_WEBSITE_CONTENT.faqs;

        const ensuredTypography: WebsiteTypographyConfig = data.typography || {
          heroTitle: {
            fontSize: '5xl',
            fontWeight: 'black',
            fontStyle: 'normal',
            textAlign: 'left',
            fontFamily: 'sans',
            textColor: '#ffffff',
          },
          heroSubtitle: {
            fontSize: 'lg',
            fontWeight: 'normal',
            fontStyle: 'normal',
            textAlign: 'left',
            fontFamily: 'sans',
            textColor: '#cbd5e1',
          },
          heroBadge: {
            fontSize: 'sm',
            fontWeight: 'semibold',
            fontStyle: 'normal',
            textAlign: 'left',
            textColor: '#93c5fd',
          },
        };

        setContent({
          ...DEFAULT_WEBSITE_CONTENT,
          ...data,
          heroSlides: ensuredSlides,
          typography: ensuredTypography,
          stats: ensuredStats,
          facilities: ensuredFacilities,
          faqs: ensuredFaqs,
          logoUrl: data.logoUrl || school?.logoUrl || '',
        });
        setHasUnsavedChanges(false);
      }
    } catch (e: any) {
      showToast('Error loading CMS content: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e?: React.FormEvent, customContent?: WebsiteContent) => {
    if (e) e.preventDefault();
    const toSave = customContent || content;
    if (!toSave) return;
    const sid = school?.id || DEFAULT_SCHOOL_ID;
    setSaving(true);
    try {
      // Sync heroBannerUrl with primary slide image
      const primarySlide = toSave.heroSlides?.find((s) => s.isActive) || toSave.heroSlides?.[0];
      const updatedContent: WebsiteContent = {
        ...toSave,
        schoolId: sid,
        heroTitle: primarySlide ? primarySlide.title : toSave.heroTitle,
        heroSubtitle: primarySlide ? primarySlide.subtitle : toSave.heroSubtitle,
        heroBannerUrl: primarySlide ? primarySlide.imageUrl : toSave.heroBannerUrl,
        updatedAt: new Date().toISOString(),
      };

      // 1. Update CMS collection in Firestore and localStorage
      await operationsService.updateWebsiteContent(sid, updatedContent);

      // 2. Also update school logo in main school document
      if (toSave.logoUrl) {
        await schoolService.updateSchool(sid, { logoUrl: toSave.logoUrl });
        if (reloadSchoolData) {
          await reloadSchoolData();
        }
      }

      showToast('Public website & branding published successfully!', 'success');
      setContent(updatedContent);
      setHasUnsavedChanges(false);
    } catch (e: any) {
      console.error('Error updating website:', e);
      showToast('Error updating website: ' + (e.message || 'Unknown error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Image Upload Handler for Slide in Modal with automatic compression
  const handleSlideImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPG, PNG, WebP)', 'warning');
      return;
    }
    try {
      showToast('Compressing and optimizing slide photo...', 'info');
      const compressed = await compressImage(file, {
        maxWidth: 1200,
        maxHeight: 675,
        quality: 0.65,
        mimeType: 'image/jpeg',
        maxSizeBytes: 90 * 1024,
      });
      setSlideForm((prev) => ({ ...prev, imageUrl: compressed }));
      showToast('Slide photo optimized successfully!', 'success');
    } catch (err: any) {
      showToast('Could not process photo: ' + (err.message || 'Unknown error'), 'error');
    }
  };

  // Direct image upload & instant publish for any slide by ID (e.g. from card or live preview)
  const handleDirectSlideImageUpload = async (slideId: string, file: File) => {
    if (!content) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPG, PNG, WebP)', 'warning');
      return;
    }
    try {
      showToast('Optimizing and updating hero photo...', 'info');
      const compressed = await compressImage(file, {
        maxWidth: 1200,
        maxHeight: 675,
        quality: 0.65,
        mimeType: 'image/jpeg',
        maxSizeBytes: 90 * 1024,
      });

      const updatedSlides = (content.heroSlides || []).map((s) =>
        s.id === slideId ? { ...s, imageUrl: compressed } : s
      );

      const newContent: WebsiteContent = {
        ...content,
        heroSlides: updatedSlides,
        heroBannerUrl: slideId === updatedSlides[0]?.id ? compressed : content.heroBannerUrl,
      };

      setContent(newContent);
      showToast('Hero photo updated! Publishing changes...', 'info');
      await handleSave(undefined, newContent);
    } catch (err: any) {
      showToast('Could not update slide photo: ' + (err.message || 'Unknown error'), 'error');
    }
  };

  // Logo Upload Handler with automatic compression & auto-save
  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, SVG, WebP)', 'warning');
      return;
    }
    try {
      showToast('Optimizing school logo...', 'info');
      const compressed = await compressImage(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.8,
        mimeType: 'image/png',
        maxSizeBytes: 60 * 1024,
      });
      if (content) {
        const updated = { ...content, logoUrl: compressed };
        setContent(updated);
        showToast('School logo updated! Publishing...', 'info');
        await handleSave(undefined, updated);
      }
    } catch (err: any) {
      showToast('Could not process logo: ' + err.message, 'error');
    }
  };

  // Slide CRUD
  const handleOpenAddSlide = () => {
    setEditingSlide(null);
    setSlideForm({
      id: `slide-${Date.now()}`,
      title: 'Modern Science & ICT Hub',
      subtitle: 'Hands-on experiential learning where learners build robotics and digital skills.',
      imageUrl: PRESET_IMAGES[1].url,
      badgeText: 'Junior School STEAM Lab',
      buttonText: 'Explore Facilities',
      buttonLink: 'facilities',
      order: (content?.heroSlides?.length || 0) + 1,
      isActive: true,
    });
    setIsSlideModalOpen(true);
  };

  const handleOpenEditSlide = (slide: HeroSlide) => {
    setEditingSlide(slide);
    setSlideForm({ ...slide });
    setIsSlideModalOpen(true);
  };

  const handleSaveSlideModal = async () => {
    if (!content) return;
    if (!slideForm.title.trim() || !slideForm.imageUrl) {
      showToast('Please provide a title and photo for the slide', 'warning');
      return;
    }

    const currentSlides = content.heroSlides || [];
    let updated: HeroSlide[];

    if (editingSlide) {
      updated = currentSlides.map((s) => (s.id === editingSlide.id ? slideForm : s));
    } else {
      updated = [...currentSlides, slideForm];
    }

    const newContent = { ...content, heroSlides: updated };
    setContent(newContent);
    setIsSlideModalOpen(false);
    showToast(editingSlide ? 'Slide updated! Publishing changes...' : 'New slide added! Publishing changes...', 'success');
    await handleSave(undefined, newContent);
  };

  const handleDeleteSlide = async (id: string) => {
    if (!content) return;
    const currentSlides = content.heroSlides || [];
    if (currentSlides.length <= 1) {
      showToast('At least one hero slide is required for the website header', 'warning');
      return;
    }
    const updated = currentSlides.filter((s) => s.id !== id);
    const newContent = { ...content, heroSlides: updated };
    setContent(newContent);
    if (previewSlideIdx >= updated.length) setPreviewSlideIdx(0);
    showToast('Slide removed. Publishing changes...', 'info');
    await handleSave(undefined, newContent);
  };

  const handleToggleSlideActive = async (id: string) => {
    if (!content) return;
    const updated = (content.heroSlides || []).map((s) =>
      s.id === id ? { ...s, isActive: !s.isActive } : s
    );
    const newContent = { ...content, heroSlides: updated };
    setContent(newContent);
    await handleSave(undefined, newContent);
  };

  // Typography helper
  const updateTypography = (
    target: 'heroTitle' | 'heroSubtitle' | 'heroBadge',
    field: keyof TypographyStyle,
    val: any
  ) => {
    if (!content) return;
    const currentTypo = content.typography || {};
    const targetObj = currentTypo[target] || {};

    setContent({
      ...content,
      typography: {
        ...currentTypo,
        [target]: {
          ...targetObj,
          [field]: val,
        },
      },
    });
    setHasUnsavedChanges(true);
  };

  if (loading) {
    return (
      <div className="bg-white p-12 text-center text-xs text-slate-400 rounded-2xl border border-slate-200">
        Loading website CMS & styling controls...
      </div>
    );
  }

  if (!content) {
    return (
      <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
        <Globe className="w-8 h-8 text-slate-300 mx-auto" />
        <div className="text-sm font-bold text-slate-800">No CMS Content Found</div>
        <p className="text-xs text-slate-500">Seed sample data to generate default marketing pages.</p>
      </div>
    );
  }

  const activeSlides = (content.heroSlides || []).filter((s) => s.isActive);
  const currentPreviewSlide =
    activeSlides[previewSlideIdx] || content.heroSlides?.[0] || {
      title: content.heroTitle,
      subtitle: content.heroSubtitle,
      imageUrl: content.heroBannerUrl,
    };

  const titleTypo = content.typography?.heroTitle || {
    fontSize: '5xl',
    fontWeight: 'black',
    fontStyle: 'normal',
    textAlign: 'left',
    fontFamily: 'sans',
    textColor: '#ffffff',
  };

  const subtitleTypo = content.typography?.heroSubtitle || {
    fontSize: 'lg',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
    fontFamily: 'sans',
    textColor: '#cbd5e1',
  };

  // Tailwind class converters for typography preview
  const getFontSizeClass = (size?: string) => {
    switch (size) {
      case 'sm':
        return 'text-sm';
      case 'base':
        return 'text-base';
      case 'lg':
        return 'text-lg sm:text-xl';
      case 'xl':
        return 'text-xl sm:text-2xl';
      case '2xl':
        return 'text-2xl sm:text-3xl';
      case '3xl':
        return 'text-3xl sm:text-4xl';
      case '4xl':
        return 'text-4xl sm:text-5xl';
      case '5xl':
        return 'text-3xl sm:text-5xl lg:text-6xl';
      case '6xl':
        return 'text-4xl sm:text-6xl lg:text-7xl';
      default:
        return 'text-3xl sm:text-5xl';
    }
  };

  const getFontWeightClass = (weight?: string) => {
    switch (weight) {
      case 'normal':
        return 'font-normal';
      case 'medium':
        return 'font-medium';
      case 'semibold':
        return 'font-semibold';
      case 'bold':
        return 'font-bold';
      case 'black':
        return 'font-black';
      default:
        return 'font-extrabold';
    }
  };

  const getFontFamilyClass = (fam?: string) => {
    switch (fam) {
      case 'serif':
        return 'font-serif';
      case 'mono':
        return 'font-mono';
      default:
        return 'font-sans';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Public Website CMS & Branding</h2>
            <Badge variant="primary" size="sm">
              Live Visual Editor
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage hero slides, upload institutional logo, customize typography (font size, bold, italic, alignment), and marketing sections.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {onOpenPublicSite && (
            <Button
              variant="outline"
              size="sm"
              icon={<Globe className="w-4 h-4 text-blue-900" />}
              onClick={onOpenPublicSite}
              className="text-xs font-bold"
            >
              View Live Website
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            icon={<Save className="w-4 h-4" />}
            loading={saving}
            onClick={() => handleSave()}
          >
            Publish Website Changes
          </Button>
        </div>
      </div>

      {/* Interactive Live Hero Banner Preview Card */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-xl overflow-hidden text-white relative">
        <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-200">Live Header Preview</span>
            <span className="text-[10px] text-slate-400">
              (Showing slide {previewSlideIdx + 1} of {Math.max(1, activeSlides.length)})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {activeSlides.length > 1 && (
              <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                <button
                  onClick={() =>
                    setPreviewSlideIdx((prev) => (prev > 0 ? prev - 1 : activeSlides.length - 1))
                  }
                  className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white cursor-pointer"
                  title="Previous Slide"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 text-[10px] font-mono text-slate-300">
                  {previewSlideIdx + 1}/{activeSlides.length}
                </span>
                <button
                  onClick={() =>
                    setPreviewSlideIdx((prev) => (prev < activeSlides.length - 1 ? prev + 1 : 0))
                  }
                  className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white cursor-pointer"
                  title="Next Slide"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {currentPreviewSlide && (
              <label className="cursor-pointer bg-blue-600/80 hover:bg-blue-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors">
                <Upload className="w-3 h-3" />
                <span>Upload New Banner Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0] && currentPreviewSlide) {
                      handleDirectSlideImageUpload(currentPreviewSlide.id, e.target.files[0]);
                    }
                  }}
                />
              </label>
            )}
            <Badge variant="success" size="sm">
              Live Preview
            </Badge>
          </div>
        </div>

        {/* Hero Visual Display - 100% Visible Photo with Clean Unobstructed Overlay */}
        <div className="relative py-12 px-6 sm:px-12 overflow-hidden min-h-[340px] flex items-center bg-slate-900">
          {currentPreviewSlide?.imageUrl && (
            <div
              className="absolute inset-0 bg-cover bg-center transition-all duration-700"
              style={{ backgroundImage: `url(${currentPreviewSlide.imageUrl})` }}
            />
          )}
          {/* Subtle Bottom Scrim for Crisp Text Contrast Without Obscuring the Photo */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none" />

          {/* Clean Floating Text Container (No Obstructive Dark Box) */}
          <div
            className={`relative max-w-3xl w-full space-y-3.5 z-10 ${
              titleTypo.textAlign === 'center'
                ? 'mx-auto text-center'
                : titleTypo.textAlign === 'right'
                ? 'ml-auto text-right'
                : 'mr-auto text-left'
            }`}
          >
            {/* Badge Tag */}
            <div
              className={`inline-flex items-center gap-2 bg-slate-900/60 backdrop-blur-xs px-3.5 py-1 rounded-full border border-white/30 text-xs font-semibold shadow-lg ${
                titleTypo.textAlign === 'center' ? 'mx-auto' : ''
              }`}
              style={{ color: content.typography?.heroBadge?.textColor || '#93c5fd' }}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="drop-shadow-sm">{currentPreviewSlide?.badgeText || 'Leading CBC Education in Nairobi'}</span>
            </div>

            {/* Main Title with Dynamic Font Size, Bold, Italic, Alignment & Family */}
            <h2
              className={`tracking-tight leading-tight transition-all duration-200 drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] ${getFontSizeClass(
                titleTypo.fontSize
              )} ${getFontWeightClass(titleTypo.fontWeight)} ${
                titleTypo.fontStyle === 'italic' ? 'italic' : 'not-italic'
              } ${getFontFamilyClass(titleTypo.fontFamily)}`}
              style={{
                color: titleTypo.textColor || '#ffffff',
                textShadow: '0 2px 14px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.9)',
              }}
            >
              {currentPreviewSlide?.title || 'Inspiring Young Minds, Building Future Leaders'}
            </h2>

            {/* Subtitle */}
            <p
              className={`transition-all duration-200 drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)] ${getFontSizeClass(
                subtitleTypo.fontSize
              )} ${getFontWeightClass(subtitleTypo.fontWeight)} ${
                subtitleTypo.fontStyle === 'italic' ? 'italic' : 'not-italic'
              } ${getFontFamilyClass(subtitleTypo.fontFamily)} ${
                titleTypo.textAlign === 'center' ? 'max-w-2xl mx-auto' : 'max-w-2xl'
              }`}
              style={{
                color: subtitleTypo.textColor || '#f1f5f9',
                textShadow: '0 1px 8px rgba(0,0,0,0.85)',
              }}
            >
              {currentPreviewSlide?.subtitle ||
                'A Premier Kenyan Primary & Junior School from Playgroup to Grade 9.'}
            </p>

            {/* Action Buttons */}
            <div
              className={`flex flex-wrap gap-3 pt-2 ${
                titleTypo.textAlign === 'center'
                  ? 'justify-center'
                  : titleTypo.textAlign === 'right'
                  ? 'justify-end'
                  : 'justify-start'
              }`}
            >
              <span className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-xl flex items-center gap-1.5 cursor-pointer">
                {currentPreviewSlide?.buttonText || 'Enroll Your Child'}
              </span>
              <span className="px-4 py-2.5 bg-slate-900/60 hover:bg-slate-900/80 text-white font-bold rounded-xl text-xs border border-white/30 backdrop-blur-xs shadow-xl cursor-pointer">
                View 2026 Fee Structure
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 text-xs font-bold pb-px">
        <button
          onClick={() => setActiveTab('slides')}
          className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'slides'
              ? 'border-blue-900 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Hero Slides ({content.heroSlides?.length || 1})</span>
        </button>

        <button
          onClick={() => setActiveTab('announcement')}
          className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'announcement'
              ? 'border-blue-900 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Header Announcement & Contacts</span>
        </button>

        <button
          onClick={() => setActiveTab('logo')}
          className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'logo'
              ? 'border-blue-900 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <SchoolIcon className="w-4 h-4" />
          <span>School Logo & Crest</span>
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'stats'
              ? 'border-blue-900 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Stats & Impact</span>
        </button>

        <button
          onClick={() => setActiveTab('about')}
          className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'about'
              ? 'border-blue-900 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Mission & Welcome</span>
        </button>

        <button
          onClick={() => setActiveTab('facilities')}
          className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'facilities'
              ? 'border-blue-900 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Facilities ({content.facilities?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('payment')}
          className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'payment'
              ? 'border-blue-900 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>M-Pesa & Bank</span>
        </button>

        <button
          onClick={() => setActiveTab('faqs')}
          className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'faqs'
              ? 'border-blue-900 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Admissions FAQs ({content.faqs?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('typography')}
          className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'typography'
              ? 'border-blue-900 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Type className="w-4 h-4" />
          <span>Typography & Colors</span>
        </button>
      </div>

      {/* Tab 1: Hero Slides & Photos Manager */}
      {activeTab === 'slides' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Hero Carousel Slides</h3>
              <p className="text-xs text-slate-500">
                Add multiple high-resolution photo slides that rotate automatically on the website header.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<PlusCircle className="w-4 h-4" />}
              onClick={handleOpenAddSlide}
            >
              Add New Slide
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(content.heroSlides || []).map((slide, idx) => (
              <div
                key={slide.id}
                className={`bg-white rounded-2xl border overflow-hidden shadow-xs flex flex-col justify-between transition-all ${
                  slide.isActive ? 'border-slate-200/90' : 'border-slate-200 opacity-60'
                }`}
              >
                <div>
                  {/* Slide Image Preview */}
                  <div className="h-40 bg-slate-900 relative overflow-hidden group">
                    <img
                      src={slide.imageUrl}
                      alt={slide.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                          Slide #{idx + 1}
                        </span>
                        <span
                          onClick={() => handleToggleSlideActive(slide.id)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                            slide.isActive
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {slide.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="text-white text-xs font-semibold line-clamp-1">
                          {slide.badgeText}
                        </div>
                        <label className="bg-slate-900/80 hover:bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-md cursor-pointer transition-colors flex items-center gap-1 shrink-0 backdrop-blur-xs">
                          <Upload className="w-2.5 h-2.5" />
                          <span>Change Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleDirectSlideImageUpload(slide.id, e.target.files[0]);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Slide Text Content */}
                  <div className="p-4 space-y-2 text-xs">
                    <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{slide.title}</h4>
                    <p className="text-slate-500 text-[11px] line-clamp-2">{slide.subtitle}</p>
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-blue-900 font-semibold">
                      <span>CTA Button:</span>
                      <span className="bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 font-mono">
                        {slide.buttonText || 'Enroll Now'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">Order: {slide.order}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Edit2 className="w-3.5 h-3.5" />}
                      onClick={() => handleOpenEditSlide(slide)}
                    >
                      Edit
                    </Button>
                    <button
                      onClick={() => handleDeleteSlide(slide.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Slide"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Header Announcement & Contacts */}
      {activeTab === 'announcement' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-blue-900" />
              <span>Top Announcement Bar & Official School Contacts</span>
            </h3>
            <p className="text-xs text-slate-500">
              Customize the top banner notice, intake badge, admissions phone, email, and campus address.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Announcement Tag / Badge</label>
              <input
                type="text"
                value={content.announcementTag || ''}
                onChange={(e) => {
                  setContent({ ...content, announcementTag: e.target.value });
                  setHasUnsavedChanges(true);
                }}
                placeholder="2026 INTAKE"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold uppercase text-slate-900"
              />
              <p className="text-[10px] text-slate-400 mt-1">Highlighted in amber pill at top of website.</p>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Admissions Phone Number</label>
              <input
                type="text"
                value={content.contactPhone || ''}
                onChange={(e) => {
                  setContent({ ...content, contactPhone: e.target.value });
                  setHasUnsavedChanges(true);
                }}
                placeholder="+254 722 000 123"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold text-slate-900"
              />
              <p className="text-[10px] text-slate-400 mt-1">Direct inquiries phone displayed in top header.</p>
            </div>

            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Top Announcement Headline Text</label>
              <input
                type="text"
                value={content.announcementText || ''}
                onChange={(e) => {
                  setContent({ ...content, announcementText: e.target.value });
                  setHasUnsavedChanges(true);
                }}
                placeholder="Admissions Open for Playgroup to Grade 9 (Junior School) • CBC Competency Curriculum"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Official Admissions Email</label>
              <input
                type="email"
                value={content.contactEmail || ''}
                onChange={(e) => {
                  setContent({ ...content, contactEmail: e.target.value });
                  setHasUnsavedChanges(true);
                }}
                placeholder="admissions@gracialearningcentre.ac.ke"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Campus Physical Location</label>
              <input
                type="text"
                value={content.contactAddress || ''}
                onChange={(e) => {
                  setContent({ ...content, contactAddress: e.target.value });
                  setHasUnsavedChanges(true);
                }}
                placeholder="Mariru Park, Kasarani Mwiki, Nairobi, Kenya"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {hasUnsavedChanges ? (
                <span className="text-amber-600 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Unsaved Announcement edits pending
                </span>
              ) : (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Header Announcement published
                </span>
              )}
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<Save className="w-4 h-4" />}
              loading={saving}
              onClick={() => handleSave()}
            >
              Publish Announcement & Contacts
            </Button>
          </div>
        </div>
      )}

      {/* Tab: Stats & Academic Impact */}
      {activeTab === 'stats' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-900" />
              <span>Institutional Statistics & Impact Counters</span>
            </h3>
            <p className="text-xs text-slate-500">
              These impressive counters are showcased below the hero section on the public website.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
              <label className="font-bold text-slate-700 block">Enrolled Learners Count</label>
              <input
                type="number"
                value={content.stats?.studentsCount ?? DEFAULT_WEBSITE_CONTENT.stats?.studentsCount ?? 680}
                onChange={(e) => {
                  setContent({
                    ...content,
                    stats: { ...(content.stats || DEFAULT_WEBSITE_CONTENT.stats), studentsCount: Number(e.target.value) || 0 },
                  });
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-black text-lg text-blue-900 bg-white"
              />
              <span className="text-[10px] text-slate-400">Displayed as e.g. 850+ Enrolled Learners</span>
            </div>

            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
              <label className="font-bold text-slate-700 block">TSC-Certified Teachers</label>
              <input
                type="number"
                value={content.stats?.teachersCount ?? DEFAULT_WEBSITE_CONTENT.stats?.teachersCount ?? 42}
                onChange={(e) => {
                  setContent({
                    ...content,
                    stats: { ...(content.stats || DEFAULT_WEBSITE_CONTENT.stats), teachersCount: Number(e.target.value) || 0 },
                  });
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-black text-lg text-emerald-700 bg-white"
              />
              <span className="text-[10px] text-slate-400">Displayed as e.g. 45+ TSC Teachers</span>
            </div>

            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
              <label className="font-bold text-slate-700 block">CBC Pass Rate % / Graduated</label>
              <input
                type="number"
                value={content.stats?.graduatesCount ?? DEFAULT_WEBSITE_CONTENT.stats?.graduatesCount ?? 1450}
                onChange={(e) => {
                  setContent({
                    ...content,
                    stats: { ...(content.stats || DEFAULT_WEBSITE_CONTENT.stats), graduatesCount: Number(e.target.value) || 0 },
                  });
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-black text-lg text-amber-700 bg-white"
              />
              <span className="text-[10px] text-slate-400">Displayed as 100% CBC Transition</span>
            </div>

            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
              <label className="font-bold text-slate-700 block">Years of Excellence</label>
              <input
                type="number"
                value={content.stats?.yearsOfExcellence ?? DEFAULT_WEBSITE_CONTENT.stats?.yearsOfExcellence ?? 18}
                onChange={(e) => {
                  setContent({
                    ...content,
                    stats: { ...(content.stats || DEFAULT_WEBSITE_CONTENT.stats), yearsOfExcellence: Number(e.target.value) || 0 },
                  });
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-black text-lg text-indigo-700 bg-white"
              />
              <span className="text-[10px] text-slate-400">Displayed as e.g. 12+ Years Heritage</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {hasUnsavedChanges ? (
                <span className="text-amber-600 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Unsaved Stats edits pending
                </span>
              ) : (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Stats published to website
                </span>
              )}
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<Save className="w-4 h-4" />}
              loading={saving}
              onClick={() => handleSave()}
            >
              Publish Stats Counters
            </Button>
          </div>
        </div>
      )}

      {/* Tab 2: School Logo & Branding */}
      {activeTab === 'logo' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900">Institutional School Logo & Crest</h3>
            <p className="text-xs text-slate-500">
              Upload your official school logo. It will appear on website headers, student report cards, receipts, and parent portal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Upload Area */}
            <div className="space-y-4">
              <input
                ref={logoFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleLogoUpload(e.target.files[0]);
                }}
              />

              <div
                onClick={() => logoFileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/30 rounded-2xl p-8 text-center cursor-pointer transition-all space-y-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-900 flex items-center justify-center mx-auto shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-bold text-sm text-slate-900 block">
                    Click to Upload School Logo
                  </span>
                  <span className="text-xs text-slate-400">
                    Supports PNG with transparency, SVG, JPG, WebP (Max 5MB)
                  </span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-xs text-slate-700">Or Paste Direct Image URL</label>
                <input
                  type="text"
                  placeholder="https://example.com/logo.png"
                  value={content.logoUrl || ''}
                  onChange={(e) => setContent({ ...content, logoUrl: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              {/* Preset Logos */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-slate-700">Curated Sample Crests:</span>
                <div className="flex gap-2">
                  {PRESET_LOGOS.map((pl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setContent({ ...content, logoUrl: pl.url })}
                      className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs text-slate-700 font-medium cursor-pointer"
                    >
                      <img src={pl.url} alt={pl.name} className="w-5 h-5 rounded object-cover" />
                      <span>{pl.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Visual Previews on Light and Dark Backdrops */}
            <div className="space-y-4">
              <div className="font-bold text-xs text-slate-700">Logo Presentation Preview:</div>

              {/* Light background preview */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center p-2 overflow-hidden">
                  {content.logoUrl ? (
                    <img src={content.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <SchoolIcon className="w-8 h-8 text-blue-900" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900">Light Header Preview</div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {school?.name || 'Gracia Learning Centre'}
                  </div>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded mt-1 inline-block">
                    Official Report Cards & Receipts Header
                  </span>
                </div>
              </div>

              {/* Dark background preview */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-4 text-white">
                <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 shadow-xs flex items-center justify-center p-2 overflow-hidden">
                  {content.logoUrl ? (
                    <img src={content.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <SchoolIcon className="w-8 h-8 text-white" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-100">Dark Navigation Preview</div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    {school?.name || 'Gracia Learning Centre'}
                  </div>
                  <span className="text-[10px] text-blue-300 font-bold bg-blue-900/50 px-1.5 py-0.2 rounded mt-1 inline-block">
                    Public Website & Portal Navbar
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Typography, Font Size, Bold, Italic, and Alignment Controls */}
      {activeTab === 'typography' && (
        <div className="space-y-6">
          {/* Main Title Typography Box */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Type className="w-4 h-4 text-blue-900" />
                  <span>Hero Main Headline Typography</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Format font size, styles (bold, italic), text alignment (left, center, right), and font family.
                </p>
              </div>
              <Badge variant="primary" size="sm">
                Primary Header
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Font Size */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Font Size</label>
                <select
                  value={titleTypo.fontSize || '5xl'}
                  onChange={(e) => updateTypography('heroTitle', 'fontSize', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold text-slate-800 bg-white"
                >
                  <option value="xl">Extra Large (XL - 20px)</option>
                  <option value="2xl">2X Large (2XL - 24px)</option>
                  <option value="3xl">3X Large (3XL - 30px)</option>
                  <option value="4xl">4X Large (4XL - 36px)</option>
                  <option value="5xl">5X Display (5XL - 48px)</option>
                  <option value="6xl">6X Hero Impact (6XL - 60px)</option>
                </select>
              </div>

              {/* Bold & Italic Style Toggles */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Font Style & Weight</label>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  {/* Bold button */}
                  <button
                    type="button"
                    onClick={() =>
                      updateTypography(
                        'heroTitle',
                        'fontWeight',
                        titleTypo.fontWeight === 'black' ? 'normal' : 'black'
                      )
                    }
                    className={`flex-1 py-1.5 px-2 rounded-lg font-black text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                      titleTypo.fontWeight === 'black' || titleTypo.fontWeight === 'bold'
                        ? 'bg-blue-900 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                    title="Toggle Bold"
                  >
                    <Bold className="w-3.5 h-3.5" />
                    <span>Bold</span>
                  </button>

                  {/* Italic button */}
                  <button
                    type="button"
                    onClick={() =>
                      updateTypography(
                        'heroTitle',
                        'fontStyle',
                        titleTypo.fontStyle === 'italic' ? 'normal' : 'italic'
                      )
                    }
                    className={`flex-1 py-1.5 px-2 rounded-lg italic text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                      titleTypo.fontStyle === 'italic'
                        ? 'bg-blue-900 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                    title="Toggle Italic"
                  >
                    <Italic className="w-3.5 h-3.5" />
                    <span>Italic</span>
                  </button>
                </div>
              </div>

              {/* Alignment: Left, Center, Right */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Text Alignment</label>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => updateTypography('heroTitle', 'textAlign', 'left')}
                    className={`flex-1 py-1.5 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                      titleTypo.textAlign === 'left' || !titleTypo.textAlign
                        ? 'bg-blue-900 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                    title="Align Left"
                  >
                    <AlignLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateTypography('heroTitle', 'textAlign', 'center')}
                    className={`flex-1 py-1.5 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                      titleTypo.textAlign === 'center'
                        ? 'bg-blue-900 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                    title="Align Center"
                  >
                    <AlignCenter className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateTypography('heroTitle', 'textAlign', 'right')}
                    className={`flex-1 py-1.5 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                      titleTypo.textAlign === 'right'
                        ? 'bg-blue-900 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                    title="Align Right"
                  >
                    <AlignRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Font Family */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Font Family</label>
                <select
                  value={titleTypo.fontFamily || 'sans'}
                  onChange={(e) => updateTypography('heroTitle', 'fontFamily', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold text-slate-800 bg-white"
                >
                  <option value="sans">Modern Geometric Sans (Default)</option>
                  <option value="serif">Classical Academic Serif</option>
                  <option value="mono">Technical Modern Monospace</option>
                </select>
              </div>
            </div>

            {/* Text Color Swatches */}
            <div className="pt-2">
              <label className="font-bold text-xs text-slate-700 block mb-2">Headline Color Palette</label>
              <div className="flex flex-wrap gap-2 items-center">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.value}
                    type="button"
                    onClick={() => updateTypography('heroTitle', 'textColor', swatch.value)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      titleTypo.textColor === swatch.value
                        ? 'border-blue-900 bg-blue-50 text-blue-950 ring-2 ring-blue-900/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-slate-300"
                      style={{ backgroundColor: swatch.value }}
                    />
                    <span>{swatch.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Subtitle Typography Box */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-800" />
                  <span>Hero Subtitle & Description Typography</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Format font size, italic styling, and text colors for the supporting text.
                </p>
              </div>
              <Badge variant="secondary" size="sm">
                Supporting Paragraph
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Subtitle Size</label>
                <select
                  value={subtitleTypo.fontSize || 'lg'}
                  onChange={(e) => updateTypography('heroSubtitle', 'fontSize', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold text-slate-800 bg-white"
                >
                  <option value="sm">Small (14px)</option>
                  <option value="base">Base (16px)</option>
                  <option value="lg">Large (18px - Recommended)</option>
                  <option value="xl">Extra Large (20px)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Subtitle Style</label>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() =>
                      updateTypography(
                        'heroSubtitle',
                        'fontWeight',
                        subtitleTypo.fontWeight === 'bold' ? 'normal' : 'bold'
                      )
                    }
                    className={`flex-1 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                      subtitleTypo.fontWeight === 'bold'
                        ? 'bg-emerald-800 text-white'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Bold className="w-3.5 h-3.5" />
                    <span>Bold</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updateTypography(
                        'heroSubtitle',
                        'fontStyle',
                        subtitleTypo.fontStyle === 'italic' ? 'normal' : 'italic'
                      )
                    }
                    className={`flex-1 py-1.5 rounded-lg italic text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                      subtitleTypo.fontStyle === 'italic'
                        ? 'bg-emerald-800 text-white'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Italic className="w-3.5 h-3.5" />
                    <span>Italic</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Color Tone</label>
                <div className="flex gap-2">
                  {COLOR_SWATCHES.slice(0, 4).map((swatch) => (
                    <button
                      key={swatch.value}
                      type="button"
                      onClick={() => updateTypography('heroSubtitle', 'textColor', swatch.value)}
                      className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                        subtitleTypo.textColor === swatch.value
                          ? 'border-emerald-700 bg-emerald-50 ring-2 ring-emerald-700/20'
                          : 'border-slate-200 bg-white'
                      }`}
                      title={swatch.label}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-slate-300"
                        style={{ backgroundColor: swatch.value }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: About, Mission & Principal Message */}
      {activeTab === 'about' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Mission & Vision */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="font-bold text-sm text-slate-900">Institutional Mission & Vision</h3>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Mission Statement</label>
                <textarea
                  rows={3}
                  value={content.mission}
                  onChange={(e) => {
                    setContent({ ...content, mission: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Vision Statement</label>
                <textarea
                  rows={3}
                  value={content.vision}
                  onChange={(e) => {
                    setContent({ ...content, vision: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">About Intro Paragraph</label>
                <textarea
                  rows={4}
                  value={content.aboutIntro}
                  onChange={(e) => {
                    setContent({ ...content, aboutIntro: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            {/* Principal's Message */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="font-bold text-sm text-slate-900">Principal&apos;s Welcome Message</h3>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Principal Full Name & Credentials</label>
                <input
                  type="text"
                  value={content.principalName}
                  onChange={(e) => {
                    setContent({ ...content, principalName: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Principal Portrait URL</label>
                <input
                  type="text"
                  value={content.principalPhotoUrl || ''}
                  onChange={(e) => {
                    setContent({ ...content, principalPhotoUrl: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Principal Welcome Address</label>
                <textarea
                  rows={6}
                  value={content.principalMessage}
                  onChange={(e) => {
                    setContent({ ...content, principalMessage: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Bottom Save Bar for Tab 4 */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 bg-white p-4 rounded-2xl shadow-xs">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {hasUnsavedChanges ? (
                <span className="text-amber-600 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Unsaved Mission / Welcome edits pending
                </span>
              ) : (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> All About & Welcome changes published
                </span>
              )}
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<Save className="w-4 h-4" />}
              loading={saving}
              onClick={() => handleSave()}
            >
              Publish Mission & About Info
            </Button>
          </div>
        </div>
      )}

      {/* Tab 5: Facilities & Gallery */}
      {activeTab === 'facilities' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">School Facilities & Campus Highlights</h3>
              <p className="text-xs text-slate-500">
                Showcase laboratories, aquatic pool, library, and sports pitches to prospective parents.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(content.facilities || []).map((fac, idx) => (
              <div key={idx} className="p-4 border border-slate-200 rounded-xl space-y-3">
                <input
                  type="text"
                  value={fac.title}
                  onChange={(e) => {
                    const copy = [...(content.facilities || [])];
                    copy[idx] = { ...copy[idx], title: e.target.value };
                    setContent({ ...content, facilities: copy });
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full font-bold text-xs px-3 py-1.5 border border-slate-200 rounded-lg"
                />
                <textarea
                  rows={2}
                  value={fac.description}
                  onChange={(e) => {
                    const copy = [...(content.facilities || [])];
                    copy[idx] = { ...copy[idx], description: e.target.value };
                    setContent({ ...content, facilities: copy });
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg"
                />
                <input
                  type="text"
                  value={fac.imageUrl || ''}
                  onChange={(e) => {
                    const copy = [...(content.facilities || [])];
                    copy[idx] = { ...copy[idx], imageUrl: e.target.value };
                    setContent({ ...content, facilities: copy });
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Image URL"
                  className="w-full text-[11px] font-mono px-3 py-1.5 border border-slate-200 rounded-lg"
                />
              </div>
            ))}
          </div>

          {/* Bottom Save Bar for Tab 5 */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {hasUnsavedChanges ? (
                <span className="text-amber-600 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Unsaved facilities edits pending
                </span>
              ) : (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Facilities published to website
                </span>
              )}
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<Save className="w-4 h-4" />}
              loading={saving}
              onClick={() => handleSave()}
            >
              Publish Facilities
            </Button>
          </div>
        </div>
      )}

      {/* Tab 6: Admissions FAQs */}
      {activeTab === 'faqs' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900">Prospective Parents FAQ</h3>
            <p className="text-xs text-slate-500">
              Frequently asked questions concerning curriculum, CBC transition, transport, and lunches.
            </p>
          </div>

          <div className="space-y-4">
            {(content.faqs || []).map((faq, idx) => (
              <div key={idx} className="p-4 border border-slate-200 rounded-xl space-y-2 text-xs">
                <input
                  type="text"
                  value={faq.question}
                  onChange={(e) => {
                    const copy = [...(content.faqs || [])];
                    copy[idx] = { ...copy[idx], question: e.target.value };
                    setContent({ ...content, faqs: copy });
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full font-bold text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-900"
                />
                <textarea
                  rows={2}
                  value={faq.answer}
                  onChange={(e) => {
                    const copy = [...(content.faqs || [])];
                    copy[idx] = { ...copy[idx], answer: e.target.value };
                    setContent({ ...content, faqs: copy });
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700"
                />
              </div>
            ))}
          </div>

          {/* Bottom Save Bar for Tab: FAQs */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {hasUnsavedChanges ? (
                <span className="text-amber-600 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Unsaved FAQs edits pending
                </span>
              ) : (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> FAQs published to website
                </span>
              )}
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<Save className="w-4 h-4" />}
              loading={saving}
              onClick={() => handleSave()}
            >
              Publish Admissions FAQs
            </Button>
          </div>
        </div>
      )}

      {/* Tab: Lipa na M-Pesa & Direct Bank Deposit Channels */}
      {activeTab === 'payment' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>Official School Payment Channels (M-Pesa & Bank)</span>
            </h3>
            <p className="text-xs text-slate-500">
              These details are prominently displayed in the fee structure section for parent guidance.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            {/* M-Pesa Card */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Lipa na M-Pesa Paybill</h4>
                  <p className="text-[11px] text-slate-500">Mobile payment channel for tuition</p>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">M-Pesa Business / Paybill No. *</label>
                <input
                  type="text"
                  value={content.mpesaPaybill || ''}
                  onChange={(e) => {
                    setContent({ ...content, mpesaPaybill: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="522522"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-900 bg-white"
                />
              </div>

              <div className="p-3 bg-emerald-50/80 border border-emerald-100 rounded-xl text-[11px] text-emerald-800">
                Parents are advised to enter <strong>Student Admission Number</strong> as the account number for automated ERP reconciliation.
              </div>
            </div>

            {/* Direct Bank Account Card */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Official Bank Deposit Details</h4>
                  <p className="text-[11px] text-slate-500">Direct deposit / EFT instructions</p>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Bank Name, Branch & Account No. *</label>
                <input
                  type="text"
                  value={content.bankDetails || ''}
                  onChange={(e) => {
                    setContent({ ...content, bankDetails: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Equity Bank Kenya • Nyahururu Branch • Acc: 0180293847192"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 bg-white"
                />
              </div>

              <div className="p-3 bg-blue-50/80 border border-blue-100 rounded-xl text-[11px] text-blue-800">
                Bank deposit slips must be presented or uploaded via Parent Portal for bursar clearance.
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {hasUnsavedChanges ? (
                <span className="text-amber-600 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Unsaved Payment Channel edits pending
                </span>
              ) : (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Payment channels published
                </span>
              )}
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<Save className="w-4 h-4" />}
              loading={saving}
              onClick={() => handleSave()}
            >
              Publish Payment Channels
            </Button>
          </div>
        </div>
      )}

      {/* Slide Add/Edit Modal */}
      <Modal
        isOpen={isSlideModalOpen}
        onClose={() => setIsSlideModalOpen(false)}
        title={editingSlide ? 'Edit Hero Banner Slide' : 'Add New Hero Slide'}
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs">
          {/* Photo upload section */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Slide Photo *</label>
            <input
              ref={slideFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleSlideImageUpload(e.target.files[0]);
              }}
            />

            <div className="flex flex-col sm:flex-row gap-3 items-start">
              {slideForm.imageUrl ? (
                <div className="w-full sm:w-48 h-28 rounded-xl bg-slate-900 overflow-hidden relative group shrink-0">
                  <img
                    src={slideForm.imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div
                    onClick={() => slideFileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[11px] font-bold transition-opacity cursor-pointer"
                  >
                    Change Photo
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => slideFileInputRef.current?.click()}
                  className="w-full sm:w-48 h-28 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl flex flex-col items-center justify-center text-center p-2 bg-slate-50 cursor-pointer shrink-0"
                >
                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="font-bold text-[11px] text-slate-700">Upload Photo</span>
                </div>
              )}

              <div className="flex-1 space-y-2 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Upload className="w-3.5 h-3.5" />}
                  onClick={() => slideFileInputRef.current?.click()}
                >
                  Choose Image File from Computer
                </Button>

                <div>
                  <label className="text-[10px] text-slate-400 font-semibold">Or Image URL</label>
                  <input
                    type="text"
                    value={slideForm.imageUrl}
                    onChange={(e) => setSlideForm({ ...slideForm, imageUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>

            {/* Presets */}
            <div className="pt-2">
              <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                Quick Select Curated School Photos:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PRESET_IMAGES.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSlideForm({ ...slideForm, imageUrl: img.url })}
                    className="flex items-center gap-1.5 p-1.5 border border-slate-200 rounded-lg hover:border-blue-900 bg-white text-left cursor-pointer transition-colors"
                  >
                    <img src={img.url} alt={img.name} className="w-7 h-7 rounded object-cover" />
                    <span className="text-[10px] font-medium text-slate-800 line-clamp-1">
                      {img.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Slide Details */}
          <div>
            <label className="font-bold text-slate-700">Hero Main Title *</label>
            <input
              type="text"
              required
              value={slideForm.title}
              onChange={(e) => setSlideForm({ ...slideForm, title: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl font-bold"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700">Hero Subtitle</label>
            <textarea
              rows={2}
              value={slideForm.subtitle}
              onChange={(e) => setSlideForm({ ...slideForm, subtitle: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700">Badge Tagline</label>
              <input
                type="text"
                value={slideForm.badgeText || ''}
                onChange={(e) => setSlideForm({ ...slideForm, badgeText: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700">Action Button Label</label>
              <input
                type="text"
                value={slideForm.buttonText || ''}
                onChange={(e) => setSlideForm({ ...slideForm, buttonText: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl font-semibold"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsSlideModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveSlideModal}>
              {editingSlide ? 'Update Slide' : 'Add Slide'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

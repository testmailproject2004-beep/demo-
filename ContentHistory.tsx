import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Trash2,
  User,
  Mic,
  Video,
  Map,
  FileText,
  HelpCircle,
  Volume2,
  Share2,
  Zap,
  BookOpen,
  ScrollText,
  Send,
  X,
  RefreshCw,
  Filter,
  Check,
  BarChart3,
  Mail,
  Upload,
  History,
  Pencil,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import { Separator } from '../ui/separator';
import { Textarea } from '../ui/textarea';
import { Card } from '../ui/card';
import { flask_url, middleware_url } from '../../../utils/constants';
import { getAllBrands, Brand } from '../../services/brandsApi';
import { RefineWithAI } from './RefineWithAI';
import { MicroDramaRefineWithAI } from './MicroDramaRefineWithAI';
import { ContentFeedback, MiniStarRating, InlineTextFeedback, isFeedbackFormat } from './ContentFeedback';
import { PodcastPreview } from './PodcastPreview';
import { VideoPreview } from './VideoPreview';
import { BlogPreview } from './BlogPreview';
import { MindMapPreview } from './MindMapPreview';
import { QuizPreview } from './QuizPreview';
import { pushToVeeva, VeevaPushResult } from '../../services/veevaPushApi';
import { CorporateCommunicationPreview } from './CorporateCommunicationPreview';
import { HeroBannerPreview } from './HeroBannerPreview';
import { BannerRefinePanel, BannerVersion } from './BannerRefinePanel';
import { SalesBannerRefinePanel, SalesBannerVersion } from './SalesBannerRefinePanel';
import { EmailPreview } from './EmailPreview';
import { HtmlEmailPreview } from './HtmlEmailPreview';
import { LinkedInPreview } from './LinkedInPreview';
import { FacebookPreview } from './FacebookPreview';
import QuizModal from './QuizModal';
import MindElixir from 'mind-elixir';
import {
  generateQuizPDF,
  generateEmailPDF,
  generateSocialMediaPDF,
  generateMarkdownPDF,
} from '../../utils/pdfGenerator';
import { getDomain } from '../../context/DomainContext';

const historyPromptCategories = [
  {
    category: 'Tone & Style',
    prompts: [
      'Make it more professional',
      'Make it more casual',
      'Add more technical depth',
      'Simplify for general audience',
    ]
  },
  {
    category: 'Length',
    prompts: [
      'Make it more concise',
      'Expand with more details',
      'Add examples',
      'Remove redundancy',
    ]
  },
  {
    category: 'Content Enhancement',
    prompts: [
      'Add key takeaways',
      'Improve clarity',
      'Enhance readability',
      'Add action items',
    ]
  },
];

export interface HistoryItem {
  id: string;
  uuid: string;
  timestamp: Date;
  sourceFiles: string[];
  format: string;
  status: 'completed' | 'failed' | 'pending';
  outputFilename: string;
  outputFilePath: string;
  editedFilePaths: string[];
  createdBy: string;
  createdPerson: string;
  inputTokens?: number;
  outputTokens?: number;
  totalCost?: number;
}

interface ApiTransaction {
  id: string;
  uuid: string;
  format_type: string;
  input_file_paths: string[];
  output_file_path: string;
  edited_file_paths: string[];
  created_by: string;
  created_person: string;
  created_at: string;
  input_tokens?: number;
  output_tokens?: number;
  total_cost?: number;
}

interface VideoVersion {
  label: string;
  filePath: string;
  blobUrl: string | null;
}

interface ContentVersion {
  label: string;
  filePath: string;
  content: any; // null means not yet loaded
}

// Helper function to expand all nodes in mindmap
const expandAllNodes = (nodeData: any) => {
  if (!nodeData) return;
  nodeData.expanded = true;
  if (nodeData.children && nodeData.children.length > 0) {
    nodeData.children.forEach((child: any) => {
      expandAllNodes(child);
    });
  }
};

// Helper function to export mindmap to SVG
const exportMindmapToSvg = async (mindmapData: any, filename: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Create temporary container for MindElixir
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'fixed';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      tempDiv.style.width = '1200px';
      tempDiv.style.height = '800px';
      document.body.appendChild(tempDiv);

      // Initialize MindElixir
      const mind = new MindElixir({
        el: tempDiv,
        direction: MindElixir.SIDE,
        draggable: false,
        contextMenu: false,
        toolBar: false,
        keypress: false,
      });

      // Prepare data - handle both direct nodeData and wrapped formats
      let dataToLoad;
      if (mindmapData.nodeData) {
        dataToLoad = mindmapData;
      } else if (mindmapData.id && mindmapData.topic) {
        dataToLoad = { nodeData: mindmapData };
      } else {
        throw new Error('Invalid mindmap data format');
      }

      // Expand all nodes
      if (dataToLoad.nodeData) {
        expandAllNodes(dataToLoad.nodeData);
      }

      // Initialize with data
      mind.init(dataToLoad);

      // Wait for rendering and export
      setTimeout(() => {
        try {
          const styles = `
            .mind-elixir {
              --main-bgcolor: #f7f8fb;
              --color: #1f2937;
              --root-bgcolor: #d9d6ff;
              --node-bgcolor: #eeecff;
              --line-color: #c4c7e6;
              --node-border-radius: 16px;
              --node-padding-x: 18px;
              --node-padding-y: 10px;
            }
            .mind-elixir .node {
              box-shadow: 0 10px 24px rgba(60, 64, 130, 0.15);
            }
          `;
          
          const blob = mind.exportSvg(false, styles);
          if (!blob) {
            throw new Error('Failed to generate SVG blob');
          }

          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);

          // Cleanup
          document.body.removeChild(tempDiv);
          resolve();
        } catch (err) {
          document.body.removeChild(tempDiv);
          reject(err);
        }
      }, 500);
    } catch (err) {
      reject(err);
    }
  });
};

const formatTokens = (tokens: number): string => {
  if (tokens >= 1000) {
    return (tokens / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return tokens.toString();
};


export const ContentHistory = forwardRef((props, ref) => {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingItem, setViewingItem] = useState<HistoryItem | null>(null);
  const [viewingFileContent, setViewingFileContent] = useState<string | any>(null);
  const [viewingLoading, setViewingLoading] = useState(false);
  const [editedVideoUrl, setEditedVideoUrl] = useState<string | null>(null);
  const [videoVersions, setVideoVersions] = useState<VideoVersion[]>([]);
  const [activeVersionIdx, setActiveVersionIdx] = useState(0);
  const [contentVersions, setContentVersions] = useState<ContentVersion[]>([]);
  const [activeContentVersionIdx, setActiveContentVersionIdx] = useState(0);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizData, setQuizData] = useState<any>(null);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [selectedCreatedPersons, setSelectedCreatedPersons] = useState<string[]>([]);
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [hlsEmailHistoryPreviewType, setHlsEmailHistoryPreviewType] = useState<'email' | 'mlr'>('email'); // Track which preview to show for HLS emails in history
  const [isPushing, setIsPushing] = useState(false);
  const [pushSuccess, setPushSuccess] = useState(false);
  const domain = getDomain();

  // Track per-item quick feedback (star + text) that the user submits from the card directly
  const [itemFeedback, setItemFeedback] = useState<Record<string, { rating: number | null; text: string | null }>>({});

  const fetchContentHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch data from the API endpoint
      const response = await fetch(`${middleware_url}/batch_process/hls_platform/content_history?domain=${domain}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch content history: ${response.statusText}`);
      }

      const apiResponse = await response.json();

      if (apiResponse.status === 'success' && apiResponse.data) {
        // Transform API data to HistoryItem format
        const transformedData: HistoryItem[] = apiResponse.data.map(
          (transaction: ApiTransaction) => {
            const inputPaths = transaction.input_file_paths && transaction.input_file_paths.length > 0
              ? transaction.input_file_paths
              : [];
            const outputPath = transaction.output_file_path || '';
            
            // Append 'Z' to explicitly mark as UTC (backend sends datetime without timezone)
            const utcTimestamp = transaction.created_at.includes('Z') 
              ? transaction.created_at 
              : transaction.created_at + 'Z';

            return {
              id: transaction.id.toString(),
              uuid: transaction.uuid,
              timestamp: new Date(utcTimestamp),
              sourceFiles: inputPaths.map(path => extractFileName(path)),
              format: transaction.format_type || 'Unknown',
              status: 'completed' as const,
              outputFilename: extractFileName(outputPath),
              outputFilePath: outputPath,
              editedFilePaths: transaction.edited_file_paths || [],
              createdBy: transaction.created_by,
              createdPerson: transaction.created_person,
              inputTokens: transaction.input_tokens,
              outputTokens: transaction.output_tokens,
              totalCost: transaction.total_cost,
              feedback: (transaction as any).feedback
            };
          }
        );

        // Populate initial feedback state to avoid extra API calls
        const initialFeedback: Record<string, { rating: number | null; text: string | null }> = {};
        apiResponse.data.forEach((item: any) => {
          if (item.uuid && item.feedback) {
            initialFeedback[item.uuid] = {
              rating: item.feedback.star_rating ?? null,
              text: item.feedback.feedback_text ?? null
            };
          }
        });
        setItemFeedback(prev => ({ ...prev, ...initialFeedback }));

        // Sort by timestamp (newest first)
        transformedData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setHistoryItems(transformedData);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
      console.error('Error fetching content history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch history only on component mount
    if (historyItems.length === 0) {
      fetchContentHistory();
    }
  }, []);

  useEffect(() => {
    getAllBrands(domain).then(setBrands).catch(() => {});
  }, []);

  const getBrandLogoUrl = (brandName: string): string => {
    if (!brandName) return '';
    const lowerName = brandName.toLowerCase();
    const brand = brands.find(b => b.brand_name?.toLowerCase() === lowerName);
    if (brand?.brand_logo) return `${middleware_url}/batch_process/hls_platform/brand_logo/${brand.brand_logo}`;
    return '';
  };

  // Expose refresh function to parent component
  useImperativeHandle(ref, () => ({
    refreshHistory: fetchContentHistory
  }));

  const extractFileName = (filePath: string): string => {
    if (!filePath) return 'Unknown';
    // Handle both Windows (\\) and Unix (/) path separators, including double slashes
    const normalized = filePath.replace(/\\/g, '/');
    const parts = normalized.split('/').filter(part => part.length > 0);
    return parts[parts.length - 1] || 'Unknown';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="size-3.5 text-green-600" />;
      case 'failed':
        return <AlertCircle className="size-3.5 text-red-600" />;
      case 'pending':
        return <Loader2 className="size-3.5 text-yellow-600 animate-spin" />;
      default:
        return null;
    }
  };

  const formatTypeName = (format: string): string => {
    if (!format) return 'Unknown';
    // Convert snake_case or kebab-case to Title Case
    return format
      .replace(/[_-]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };
  const formatFileName = (filename: string): string => {
    if (!filename) return 'Unknown';
    // Remove file extension
    const nameWithoutExt = filename.replace(/\.[^.]*$/, '');
    // Replace underscores and hyphens with spaces
    const withSpaces = nameWithoutExt.replace(/[_-]/g, ' ');
    // Capitalize first letter of each word
    return withSpaces
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };
  const getFormatIcon = (format: string) => {
    const formatLower = format.toLowerCase().replace(/[\s_-]/g, '');
    const iconConfig: Record<string, JSX.Element> = {
      'podcast': <Mic className="size-3.5 text-purple-600" />,
      'video': <Video className="size-3.5 text-blue-600" />,
      'videoformat': <Video className="size-3.5 text-blue-600" />,
      'moviemaker': <Video className="size-3.5 text-red-600" />,
      'microdrama': <Video className="size-3.5 text-violet-600" />,
      'mindmap': <Map className="size-3.5 text-green-600" />,
      'blog': <FileText className="size-3.5 text-blue-600" />,
      'bloguserstory': <FileText className="size-3.5 text-blue-700" />,
      'story': <BookOpen className="size-3.5 text-indigo-600" />,
      'usecase': <Share2 className="size-3.5 text-teal-600" />,
      'techpaper': <ScrollText className="size-3.5 text-sky-600" />,
      'whitepaper': <FileText className="size-3.5 text-slate-600" />,
      'casestudy': <FileText className="size-3.5 text-cyan-600" />,
      'quiz': <HelpCircle className="size-3.5 text-orange-600" />,
      'audiosummary': <Volume2 className="size-3.5 text-indigo-600" />,
      'documentgeneration': <Zap className="size-3.5 text-cyan-600" />,
      'codeanalysis': <Zap className="size-3.5 text-amber-600" />,
      'deployment': <Zap className="size-3.5 text-lime-600" />,
      'corporatecommunication': <BarChart3 className="size-3.5 text-blue-600" />,
      'email': <Mail className="size-3.5 text-sky-600" />,
      'socialmedia': <Share2 className="size-3.5 text-blue-700" />,
      'banner': <BarChart3 className="size-3.5 text-red-500" />,
    };
    return iconConfig[formatLower] || <FileText className="size-3.5 text-gray-600" />;
  };

  const handleView = async (item: HistoryItem) => {
    try {
      if (!item.outputFilePath) {
        alert('No output file path available');
        return;
      }

      // Presentations are binary — open modal with icon, no need to fetch file
      const formatLowerCheck = item.format.toLowerCase().replace(/[\s_-]/g, '');
      if (formatLowerCheck === 'presentation') {
        setViewingItem(item);
        setViewingFileContent(item.outputFilePath || item.outputFilename || 'presentation.pptx');
        return;
      }

      setViewingLoading(true);
      setViewingItem(item);

      // Send request to backend with file_path in payload
      const response = await fetch(`${middleware_url}/batch_process/hls_platform/view_file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          file_path: item.outputFilePath,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to load file: ${response.statusText}`);
      }

      // Determine content type based on format and file extension
      const contentType = response.headers.get('content-type') || '';
      const fileExtension = item.outputFilePath.split('.').pop()?.toLowerCase() || '';
      const formatLower = item.format.toLowerCase().replace(/[\s_-]/g, '');

      // Determine if this should be text content
      const isTextFormat = ['blog', 'bloguserstory', 'story', 'usecase', 'techpaper', 'whitepaper', 'casestudy', 'mindmap', 'quiz', 'email', 'socialmedia'].includes(formatLower);
      const isAudioVideo = ['podcast', 'video', 'videoformat', 'audiosummary', 'microdrama', 'moviemaker'].includes(formatLower);
      const isTextExtension = ['md', 'json', 'txt', 'html'].includes(fileExtension);
      const isImageExtension = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(fileExtension);

      let data;

      if (contentType.includes('application/zip') || contentType.includes('application/x-zip')) {
        // ZIP content (HLS email with MLR)
        const blob = await response.blob();
        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(blob);
        
        const files: { name: string; content: string }[] = [];
        
        for (const fileName of Object.keys(zip.files)) {
          const file = zip.files[fileName];
          if (!file.dir) {
            const content = await file.async('text');
            files.push({ name: fileName, content });
          }
        }
        
        data = {
          isZip: true,
          files,
          blob
        };
      }
      else if (contentType.includes('application/json') || (isTextFormat && fileExtension === 'json')) {
        // JSON content
        data = await response.json();
      } else if (contentType.includes('text') || (isTextFormat && isTextExtension)) {
        // Text content (markdown, plain text, etc.)
        data = await response.text();
      } else if (isAudioVideo || (contentType.includes('audio') || contentType.includes('video'))) {
        // Audio/Video: create blob URL
        const blob = await response.blob();
        data = window.URL.createObjectURL(blob);
      } else if (isImageExtension || contentType.includes('image')) {
        // Image: create blob URL for images
        const blob = await response.blob();
        data = window.URL.createObjectURL(blob);
      } else {
        // Default: try text first, fallback to blob URL
        try {
          data = await response.text();
          // If it looks like a valid JSON or markdown, keep it as text
          if (data.startsWith('{') || data.startsWith('[') || data.includes('#')) {
            // Already set to data
          }
        } catch {
          // If text parsing fails, create blob URL
          const blob = await response.blob();
          data = window.URL.createObjectURL(blob);
        }
      }

      setViewingFileContent(data);

      // For microdrama / banner: initialise version tabs (Original + any existing edits from DB)
      const fmtCheck = item.format.toLowerCase().replace(/[\s_-]/g, '');
      if (fmtCheck === 'microdrama' || fmtCheck === 'banner') {
        const versions: VideoVersion[] = [
          { label: 'Original', filePath: item.outputFilePath, blobUrl: data },
          ...item.editedFilePaths.map((fp, i) => ({
            label: `v${i + 2}`,
            filePath: fp,
            blobUrl: null,
          })),
        ];
        setVideoVersions(versions);
        setActiveVersionIdx(0);
      } else if (item.editedFilePaths.length > 0) {
        // For all other formats with edited versions: set up content version tabs
        setContentVersions([
          { label: 'Original', filePath: item.outputFilePath, content: data },
          ...item.editedFilePaths.map((fp, i) => ({
            label: `Edit ${i + 1}`,
            filePath: fp,
            content: null,
          })),
        ]);
        setActiveContentVersionIdx(0);
      } else {
        setContentVersions([]);
        setActiveContentVersionIdx(0);
      }
    } catch (err) {
      console.error('Error loading file for preview:', err);
      alert(`Failed to load preview: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setViewingItem(null);
      setViewingFileContent(null);
      setHlsEmailHistoryPreviewType('email');
    } finally {
      setViewingLoading(false);
    }
  };

  const renderPreview = () => {
    if (!viewingItem || viewingFileContent === null) return null;

    const formatLower = viewingItem.format.toLowerCase().replace(/[\s_-]/g, '');

    switch (formatLower) {
      case 'podcast':
        return (
          <PodcastPreview
            content={{ fileUrl: viewingFileContent, blob: null }}
            podcastFileUrl={viewingFileContent}
          />
        );
      case 'video':
      case 'videoformat':
      case 'moviemaker':
        return (
          <VideoPreview
            content={{ fileUrl: viewingFileContent, blob: null }}
            videoFileUrl={viewingFileContent}
            videoFileName={viewingItem.outputFilename}
          />
        );
      case 'microdrama': {
        const activeUrl = videoVersions[activeVersionIdx]?.blobUrl ?? viewingFileContent;
        return (
          <div className="flex flex-col h-full">
            {/* Version tabs */}
            {videoVersions.length > 1 && (
              <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-gray-100 flex-shrink-0">
                {videoVersions.map((v, i) => (
                  <button
                    key={i}
                    onClick={() => handleVersionSelect(i)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-t-md border-b-2 transition-colors flex items-center gap-1 ${
                      activeVersionIdx === i
                        ? 'border-[#53A2FF] text-[#53A2FF] bg-blue-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {v.label}
                    {activeVersionIdx === i && !v.blobUrl && (
                      <Loader2 className="size-3 animate-spin" />
                    )}
                  </button>
                ))}
              </div>
            )}
            {/* Active video */}
            <div className="flex-1 overflow-hidden">
              {activeUrl ? (
                <VideoPreview
                  content={{ fileUrl: activeUrl, blob: null }}
                  videoFileUrl={activeUrl}
                  videoFileName={videoVersions[activeVersionIdx]?.label === 'Original'
                    ? viewingItem.outputFilename
                    : `${viewingItem.outputFilename.replace('.mp4', '')}_${videoVersions[activeVersionIdx]?.label.toLowerCase().replace(' ', '_')}.mp4`
                  }
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="size-8 text-[#53A2FF] animate-spin" />
                </div>
              )}
            </div>
          </div>
        );
      }
      case 'blog':
        return (
          <BlogPreview
            content={{
              title: formatTypeName(viewingItem.format),
              author: viewingItem.createdPerson,
              date: viewingItem.timestamp.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
              readTime: '5-7 min',
              category: 'Healthcare'
            }}
            previewContent={typeof viewingFileContent === 'string' ? viewingFileContent : JSON.stringify(viewingFileContent)}
          />
        );
      case 'bloguserstory':
        return (
          <BlogPreview
            content={{
              title: 'Blog User Story',
              author: viewingItem.createdPerson,
              date: viewingItem.timestamp.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
              readTime: '5-7 min',
              category: 'User Story'
            }}
            previewContent={typeof viewingFileContent === 'string' ? viewingFileContent : JSON.stringify(viewingFileContent)}
          />
        );
      case 'story':
        return (
          <BlogPreview
            content={{
              title: 'Patient Story',
              author: viewingItem.createdPerson,
              date: viewingItem.timestamp.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
              readTime: '5-7 min',
              category: 'Story'
            }}
            previewContent={typeof viewingFileContent === 'string' ? viewingFileContent : JSON.stringify(viewingFileContent)}
          />
        );
      case 'usecase':
        return (
          <BlogPreview
            content={{
              title: 'Use Case',
              author: viewingItem.createdPerson,
              date: viewingItem.timestamp.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
              readTime: '6-8 min',
              category: 'Use Case'
            }}
            previewContent={typeof viewingFileContent === 'string' ? viewingFileContent : JSON.stringify(viewingFileContent)}
          />
        );
      case 'techpaper':
        return (
          <BlogPreview
            content={{
              title: 'Technology Paper',
              author: viewingItem.createdPerson,
              date: viewingItem.timestamp.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
              readTime: '8-10 min',
              category: 'Technology'
            }}
            previewContent={typeof viewingFileContent === 'string' ? viewingFileContent : JSON.stringify(viewingFileContent)}
          />
        );
      case 'whitepaper':
        return (
          <BlogPreview
            content={{
              title: 'Whitepaper',
              author: viewingItem.createdPerson,
              date: viewingItem.timestamp.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
              readTime: '10-15 min',
              category: 'Whitepaper'
            }}
            previewContent={typeof viewingFileContent === 'string' ? viewingFileContent : JSON.stringify(viewingFileContent)}
          />
        );
      case 'casestudy':
        return (
          <BlogPreview
            content={{
              title: 'Case Study',
              author: viewingItem.createdPerson,
              date: viewingItem.timestamp.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
              readTime: '8-12 min',
              category: 'Case Study'
            }}
            previewContent={typeof viewingFileContent === 'string' ? viewingFileContent : JSON.stringify(viewingFileContent)}
          />
        );
      case 'mindmap':
        return (
          <MindMapPreview
            data={typeof viewingFileContent === 'string' ? JSON.parse(viewingFileContent) : viewingFileContent}
            isLoading={false}
          />
        );
      case 'quiz':
        const parsedQuizData = typeof viewingFileContent === 'string' ? JSON.parse(viewingFileContent) : viewingFileContent;
        return (
          <QuizPreview
            previewContent={{ quiz: { data: parsedQuizData } }}
            onStartQuiz={() => {
              setQuizData(parsedQuizData);
              setShowQuizModal(true);
            }}
          />
        );
      case 'audiosummary':
        return (
          <PodcastPreview
            content={{ fileUrl: viewingFileContent, blob: null }}
            podcastFileUrl={viewingFileContent}
          />
        );
      case 'corporatecommunication':
        if (viewingFileContent?.isZip && viewingFileContent.files?.length >= 2 && domain.toLowerCase() === 'hls') {
          const emailFile = viewingFileContent.files.find((f: any) => !f.name.startsWith('mlr_'));
          const mlrFile = viewingFileContent.files.find((f: any) => f.name.startsWith('mlr_'));
          
          if (emailFile && mlrFile) {
            return (
              <>
                <div className="flex justify-center gap-2 mb-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div onClick={() => setHlsEmailHistoryPreviewType('email')} className={`cursor-pointer transition-all rounded-md overflow-hidden px-3 py-1.5 flex items-center justify-center text-sm font-medium ${hlsEmailHistoryPreviewType === 'email'? 'bg-[#53A2FF] hover:bg-[#3d8beb] text-white shadow-md' : 'bg-white hover:bg-gray-50 border border-[#b3e0ff] text-slate-700'}`}>Preview</div>
                    <div onClick={() => setHlsEmailHistoryPreviewType('mlr')} className={`cursor-pointer transition-all rounded-md overflow-hidden px-3 py-1.5 flex items-center justify-center text-sm font-medium ${hlsEmailHistoryPreviewType === 'mlr' ? 'bg-[#53A2FF] hover:bg-[#3d8beb] text-white shadow-md' : 'bg-white hover:bg-gray-50 border border-[#b3e0ff] text-slate-700'}`}>MLR Pre-Check Dossier</div>
                  </div>
                </div>
                <HtmlEmailPreview 
                  html={hlsEmailHistoryPreviewType === 'email' ? emailFile.content : mlrFile.content} 
                />
              </>
            );
          }
        }
        return (
          <CorporateCommunicationPreview
            content={{ fileUrl: viewingFileContent, blob: null }}
            corporateCommunicationFileUrl={viewingFileContent}
          />
        );
      case 'srl':
        if (typeof viewingFileContent === 'string' && viewingFileContent.trim().startsWith('<')) {
          return <HtmlEmailPreview html={viewingFileContent} />;
        }
        if (viewingFileContent?.isZip && viewingFileContent.files?.length >= 2 && domain.toLowerCase() === 'hls') {
          const emailFile = viewingFileContent.files.find((f: any) => !f.name.startsWith('mlr_'));
          const mlrFile = viewingFileContent.files.find((f: any) => f.name.startsWith('mlr_'));

          // return (
          //       <HtmlEmailPreview 
          //         html={emailFile.content} 
          //       />
          // )
          
          if (emailFile && mlrFile) {
            return (
              <>
                <div className="flex justify-center gap-2 mb-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div onClick={() => setHlsEmailHistoryPreviewType('email')} className={`cursor-pointer transition-all rounded-md overflow-hidden px-3 py-1.5 flex items-center justify-center text-sm font-medium ${hlsEmailHistoryPreviewType === 'email'? 'bg-[#53A2FF] hover:bg-[#3d8beb] text-white shadow-md' : 'bg-white hover:bg-gray-50 border border-[#b3e0ff] text-slate-700'}`}>Preview</div>
                    <div onClick={() => setHlsEmailHistoryPreviewType('mlr')} className={`cursor-pointer transition-all rounded-md overflow-hidden px-3 py-1.5 flex items-center justify-center text-sm font-medium ${hlsEmailHistoryPreviewType === 'mlr' ? 'bg-[#53A2FF] hover:bg-[#3d8beb] text-white shadow-md' : 'bg-white hover:bg-gray-50 border border-[#b3e0ff] text-slate-700'}`}>MLR Pre-Check Dossier</div>
                  </div>
                </div>
                <HtmlEmailPreview 
                  html={hlsEmailHistoryPreviewType === 'email' ? emailFile.content : mlrFile.content} 
                />
              </>
            );
          }
        }
        return (
          <></>
        );
      case 'banner': {
        const activeBannerUrl = videoVersions[activeVersionIdx]?.blobUrl ?? viewingFileContent;
        return (
          <HeroBannerPreview
            content={{ fileUrl: activeBannerUrl, blob: null }}
          />
        );
      }

      
      case 'infographic':
        console.log('viewingFileContent =', viewingFileContent);

        return (
          <div className="w-full h-full flex items-center justify-center bg-white p-4">
            {viewingFileContent
              ? (
                <img
                  src={viewingFileContent}
                  alt="Infographic"
                  className="max-w-full max-h-full object-contain"
                />
              ) : null}
          </div>
        );

      case 'email': {
        // Check if content is ZIP (HLS domain with email + MLR)
        if (viewingFileContent?.isZip && viewingFileContent.files?.length >= 2 && domain.toLowerCase() === 'hls') {
          const emailFile = viewingFileContent.files.find((f: any) => f.name.startsWith('email_'));
          const mlrFile = viewingFileContent.files.find((f: any) => f.name.startsWith('mlr_'));
          
          if (emailFile && mlrFile) {
            return (
              <>
                <div className="flex justify-center gap-2 mb-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div onClick={() => setHlsEmailHistoryPreviewType('email')} className={`cursor-pointer transition-all rounded-md overflow-hidden px-3 py-1.5 flex items-center justify-center text-sm font-medium ${hlsEmailHistoryPreviewType === 'email'? 'bg-[#53A2FF] hover:bg-[#3d8beb] text-white shadow-md' : 'bg-white hover:bg-gray-50 border border-[#b3e0ff] text-slate-700'}`}>Email Preview</div>
                    <div onClick={() => setHlsEmailHistoryPreviewType('mlr')} className={`cursor-pointer transition-all rounded-md overflow-hidden px-3 py-1.5 flex items-center justify-center text-sm font-medium ${hlsEmailHistoryPreviewType === 'mlr' ? 'bg-[#53A2FF] hover:bg-[#3d8beb] text-white shadow-md' : 'bg-white hover:bg-gray-50 border border-[#b3e0ff] text-slate-700'}`}>MLR Pre-Check Dossier</div>
                  </div>
                </div>
                <HtmlEmailPreview 
                  html={hlsEmailHistoryPreviewType === 'email' ? emailFile.content : mlrFile.content} 
                />
              </>
            );
          }
        }
        
        // Check if content is HTML (non-HLS domain or single file)
        if (typeof viewingFileContent === 'string' && viewingFileContent.trim().startsWith('<')) {
          return <HtmlEmailPreview html={viewingFileContent} />;
        }
        
        // JSON email data
        const emailData = typeof viewingFileContent === 'string'
          ? JSON.parse(viewingFileContent)
          : viewingFileContent;
        return <EmailPreview data={emailData} />;
      }
      case 'socialmedia': {
        const postData = typeof viewingFileContent === 'string'
          ? JSON.parse(viewingFileContent)
          : viewingFileContent;

        const platform = postData?.post_metadata?.platform?.toLowerCase() || 'linkedin';
        const brandLogoUrl = getBrandLogoUrl(postData?.post_metadata?.brand || '');

        if (platform === 'facebook') {
          return <FacebookPreview data={postData} brandLogoUrl={brandLogoUrl} domain={domain} />;
        } else {
          return <LinkedInPreview data={postData} brandLogoUrl={brandLogoUrl} domain={domain} />;
        }
      }
      case 'presentation':
        return (
          <div className="flex flex-col items-center justify-center h-full py-20">
            <div
              onClick={() => viewingItem && handleDownload(viewingItem)}
              className="flex flex-col items-center gap-5 cursor-pointer group select-none"
              title="Click to download"
            >
              {/* PPTX File Icon */}
              <div className="relative w-24 h-28 group-hover:scale-105 transition-transform duration-150">
                <div className="absolute inset-0 bg-white rounded-lg border border-gray-200 shadow-lg" />
                <div
                  className="absolute top-0 right-0 w-7 h-7 bg-gray-100 border-l border-b border-gray-200 rounded-bl-sm"
                  style={{ borderRadius: '0 6px 0 0', background: 'linear-gradient(225deg, #e5e7eb 50%, #f9fafb 50%)' }}
                />
                <div className="absolute bottom-0 left-0 right-0 h-10 bg-red-600 rounded-b-lg flex items-center justify-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <path d="M9 12h6M9 16h4M7 4H4a1 1 0 00-1 1v14a1 1 0 001 1h16a1 1 0 001-1V8l-5-4H7z" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
                  </svg>
                  <span className="text-white font-bold text-xs tracking-widest">PPTX</span>
                </div>
                <div className="absolute top-4 left-0 right-0 flex items-center justify-center">
                  <span className="text-red-600 font-bold text-3xl" style={{ fontFamily: 'Calibri, sans-serif' }}>P</span>
                </div>
              </div>
              <p className="text-gray-800 font-semibold text-sm max-w-xs text-center break-all px-4 leading-snug">
                {viewingItem.outputFilename || 'presentation.pptx'}
              </p>
              <div className="flex items-center gap-2 text-gray-400 text-xs">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                <span className="group-hover:text-red-500 transition-colors">Click to download</span>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="w-full h-full flex items-center justify-center bg-slate-50">
            <div className="text-center">
              <FileText className="size-12 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-600 text-sm">File: {viewingItem.outputFilename}</p>
            </div>
          </div>
        );
    }
  };

  const closePreview = () => {
    if (typeof viewingFileContent === 'string' && viewingFileContent.startsWith('blob:')) {
      window.URL.revokeObjectURL(viewingFileContent);
    }
    // Revoke any edit blob URLs we created
    videoVersions.forEach((v, i) => {
      if (i > 0 && v.blobUrl && v.blobUrl.startsWith('blob:')) {
        window.URL.revokeObjectURL(v.blobUrl);
      }
    });
    // Revoke any blob URLs stored in contentVersions
    contentVersions.forEach((v, i) => {
      if (i > 0 && typeof v.content === 'string' && v.content.startsWith('blob:')) {
        window.URL.revokeObjectURL(v.content);
      }
    });
    setViewingItem(null);
    setViewingFileContent(null);
    setHlsEmailHistoryPreviewType('email');
    setEditedVideoUrl(null);
    setVideoVersions([]);
    setActiveVersionIdx(0);
    setContentVersions([]);
    setActiveContentVersionIdx(0);
    setShowQuizModal(false);
    setQuizData(null);
  };

  const handleVersionSelect = async (idx: number) => {
    setActiveVersionIdx(idx);
    if (videoVersions[idx]?.blobUrl) return; // already loaded

    const fp = videoVersions[idx]?.filePath;
    if (!fp) return;

    try {
      const response = await fetch(`${middleware_url}/batch_process/hls_platform/view_file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        credentials: 'include',
        body: JSON.stringify({ file_path: fp }),
      });
      if (!response.ok) throw new Error(response.statusText);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setVideoVersions(prev => prev.map((v, i) => i === idx ? { ...v, blobUrl: url } : v));
    } catch (err) {
      console.error('Failed to load version:', err);
    }
  };

  const handleContentVersionSelect = async (idx: number) => {
    setActiveContentVersionIdx(idx);
    const version = contentVersions[idx];
    if (!version) return;

    // Already loaded — just switch the displayed content
    if (version.content !== null) {
      setViewingFileContent(version.content);
      return;
    }

    const fp = version.filePath;
    if (!fp || !viewingItem) return;

    try {
      setViewingLoading(true);
      const response = await fetch(`${middleware_url}/batch_process/hls_platform/view_file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        credentials: 'include',
        body: JSON.stringify({ file_path: fp }),
      });
      if (!response.ok) throw new Error(response.statusText);

      const contentType = response.headers.get('content-type') || '';
      const fileExtension = fp.split('.').pop()?.toLowerCase() || '';
      const formatLower = viewingItem.format.toLowerCase().replace(/[\s_-]/g, '');
      const isTextFormat = ['blog', 'bloguserstory', 'story', 'usecase', 'techpaper', 'whitepaper', 'casestudy', 'mindmap', 'quiz', 'email', 'socialmedia'].includes(formatLower);
      const isAudioVideo = ['podcast', 'video', 'videoformat', 'audiosummary', 'microdrama', 'moviemaker'].includes(formatLower);
      const isTextExtension = ['md', 'json', 'txt', 'html'].includes(fileExtension);

      let content: any;
      if (contentType.includes('application/json') || (isTextFormat && fileExtension === 'json')) {
        content = await response.json();
      } else if (contentType.includes('text') || (isTextFormat && isTextExtension)) {
        content = await response.text();
      } else {
        const blob = await response.blob();
        content = window.URL.createObjectURL(blob);
      }

      setContentVersions(prev => prev.map((v, i) => i === idx ? { ...v, content } : v));
      setViewingFileContent(content);
    } catch (err) {
      console.error('Failed to load version content:', err);
    } finally {
      setViewingLoading(false);
    }
  };

  const handleDownload = async (item: HistoryItem) => {
    try {
      if (!item.outputFilePath) {
        alert('No output file path available');
        return;
      }

      const formatLower = item.format.toLowerCase().replace(/[\s_-]/g, '');

      // Send request to backend with file_path in payload
      const response = await fetch(`${middleware_url}/batch_process/hls_platform/view_file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          file_path: item.outputFilePath,
        }),
        credentials: 'include',
      });

      // Get the content type from response
      const contentType = response.headers.get('content-type') || '';

      // For formats that need PDF conversion
      if (['quiz', 'email', 'socialmedia', 'blog', 'story', 'usecase', 'technologypaper', 'techpaper', 'whitepaper', 'casestudy', 'srl'].includes(formatLower)) {
        // Generate filename (remove backend extension, add .pdf)
        const baseFilename = item.outputFilename.replace(/\.(json|md|txt)$/i, '');
        const pdfFilename = `${baseFilename}.pdf`;

        if (formatLower === 'quiz') {
          // Get content as JSON for quiz
          const content = await response.json();
          generateQuizPDF(content, pdfFilename);
        } else if (formatLower === 'email') {
          // Check if content is ZIP (HLS domain with MLR document)
          if (contentType.includes('application/zip')) {
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            const zipFilename = `${baseFilename}.zip`;
            link.download = zipFilename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } else {
            // Get content as text or JSON
            let content;
            if (contentType.includes('application/json')) {
              content = await response.json();
            } else {
              content = await response.text();
            }

            // Check if content is HTML (from HLS domain)
            if (typeof content === 'string' && content.trim().startsWith('<')) {
              const htmlFilename = `${baseFilename}.html`;
              const blob = new Blob([content], { type: 'text/html' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = htmlFilename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
            // Fallback to PDF for JSON email content
            else {
              generateEmailPDF(content, pdfFilename);
            }
          }
        } else if (formatLower === 'socialmedia') {
          if (contentType.includes('application/zip')) {
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            const zipFilename = `${baseFilename}.zip`;
            link.download = zipFilename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } else {
            const content = await response.json();
            const platform = content.platform || content.post_metadata?.platform || 'Social Media';
            generateSocialMediaPDF(content, platform, pdfFilename);
          }
        } else if (formatLower === 'srl') {
          if (contentType.includes('application/zip')) {
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            const zipFilename = `${baseFilename}.zip`;
            link.download = zipFilename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } 
        } else if (['blog', 'story', 'usecase', 'technologypaper', 'techpaper', 'whitepaper', 'casestudy'].includes(formatLower)) {
        } else if (['blog', 'story', 'usecase', 'technologypaper', 'techpaper', 'whitepaper', 'casestudy'].includes(formatLower)) {
          let content;
          if (contentType.includes('application/json')) {
            content = await response.json();
          } else {
            content = await response.text();
          }
          const title = item.format.split(/[\s_-]/).map((word: string) => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
          generateMarkdownPDF(content, title, pdfFilename);
        }
      } else if (formatLower === 'mindmap') {
        // Handle mindmap - export as SVG
        let mindmapData;
        if (contentType.includes('application/json')) {
          mindmapData = await response.json();
        } else {
          const text = await response.text();
          mindmapData = JSON.parse(text);
        }

        const svgFilename = item.outputFilename.replace(/\.json$/i, '.svg') || 'mindmap.svg';
        await exportMindmapToSvg(mindmapData, svgFilename);
      }
      else if (formatLower === 'corporatecommunication') {
        const baseFilename = item.outputFilename.replace(/\.(json|md|txt)$/i, '');
        const pdfFilename = `${baseFilename}.pdf`;

        if (contentType.includes('application/zip') && domain === 'hls') {
          const blob = await response.blob();
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          const zipFilename = `${baseFilename}.zip`;
          link.download = zipFilename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        else {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = item.outputFilename || 'download';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }
      
      } else {
        // For other formats (podcast, video, corporate communication), download as-is
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = item.outputFilename || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error downloading file:', err);
      alert(`Download failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handlePushToVeeva = async () => {
    if (!viewingItem) return;
    setIsPushing(true);
    setPushSuccess(false);
    try {
      console.log("Viewing item: ", viewingItem)
      const uuid = viewingItem.uuid;  // Use the history item's UUID as transactionUuid

      // Derive brandName (similar to ContentPersonalizationEngine.tsx)
      let brandName = 'Verveen';  // Fallback
      // If you have format-specific options in history, use them; otherwise, use brands list
      if (brands.length > 0) {
        brandName = brands[0].brand_name || 'Verveen';  // Default to first brand
      }

      // Get documentId: This is tricky since HistoryItem doesn't have it.
      // Option 1: If backend adds it, use viewingItem.documentId
      // Option 2: Infer from sourceFiles (e.g., parse filename for ID)
      // For now, use a placeholder or skip if unavailable
      const documentId = (viewingItem as any).documentId || 1514;  // Fallback to default, or handle error

      const result: VeevaPushResult = await pushToVeeva(uuid, brandName, documentId, domain);

      if (result.success) {
        setPushSuccess(true);
        setTimeout(() => {
          setPushSuccess(false);
          closePreview();  // Optionally close modal on success
        }, 2000);
      } else {
        alert(`Push failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Push to Veeva error:', error);
      alert('An error occurred while pushing to Veeva.');
    } finally {
      setIsPushing(false);
    }
  };

  const getFormatColor = (format: string) => {
    const formatLower = format.toLowerCase().replace(/[\s_-]/g, '');
    const formatColors: Record<string, string> = {
      'podcast': 'bg-purple-50 text-purple-700 border-purple-200',
      'video': 'bg-blue-50 text-blue-700 border-blue-200',
      'mindmap': 'bg-green-50 text-green-700 border-green-200',
      'blog': 'bg-blue-50 text-blue-700 border-blue-200',
      'bloguserstory': 'bg-blue-100 text-blue-800 border-blue-300',
      'story': 'bg-indigo-50 text-indigo-700 border-indigo-200',
      'usecase': 'bg-teal-50 text-teal-700 border-teal-200',
      'techpaper': 'bg-sky-50 text-sky-700 border-sky-200',
      'whitepaper': 'bg-slate-50 text-slate-700 border-slate-200',
      'casestudy': 'bg-cyan-50 text-cyan-700 border-cyan-200',
      'quiz': 'bg-orange-50 text-orange-700 border-orange-200',
      'audiosummary': 'bg-indigo-50 text-indigo-700 border-indigo-200',
      'documentgeneration': 'bg-cyan-50 text-cyan-700 border-cyan-200',
      'codeanalysis': 'bg-amber-50 text-amber-700 border-amber-200',
      'deployment': 'bg-lime-50 text-lime-700 border-lime-200',
      'corporatecommunication': 'bg-blue-50 text-blue-700 border-blue-200',
      'email': 'bg-sky-50 text-sky-700 border-sky-200',
      'microdrama': 'bg-violet-50 text-violet-700 border-violet-200',
      'banner': 'bg-red-50 text-red-700 border-red-200',
    };
    return formatColors[formatLower] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getUniqueFormats = (): string[] => {
    const uniqueFormats = Array.from(new Set(historyItems.map(item => item.format)));
    return uniqueFormats.sort();
  };

  const getUniqueCreatedPersons = (): string[] => {
    const uniquePersons = Array.from(new Set(historyItems.map(item => item.createdPerson).filter(Boolean)));
    return uniquePersons.sort();
  };

  const getUniqueFileNames = (): string[] => {
    const allFileNames = historyItems.flatMap(item => item.sourceFiles);
    const uniqueFileNames = Array.from(new Set(allFileNames));
    return uniqueFileNames.sort();
  };

  const toggleFormatFilter = (format: string) => {
    setSelectedFormats(prev =>
      prev.includes(format)
        ? prev.filter(f => f !== format)
        : [...prev, format]
    );
  };

  const toggleCreatedPersonFilter = (person: string) => {
    setSelectedCreatedPersons(prev =>
      prev.includes(person)
        ? prev.filter(p => p !== person)
        : [...prev, person]
    );
  };

  const toggleFileNameFilter = (fileName: string) => {
    setSelectedFileNames(prev =>
      prev.includes(fileName)
        ? prev.filter(f => f !== fileName)
        : [...prev, fileName]
    );
  };

  const getFilteredHistoryItems = (): HistoryItem[] => {
    let filtered = historyItems;

    if (selectedFormats.length > 0) {
      filtered = filtered.filter(item => selectedFormats.includes(item.format));
    }

    if (selectedCreatedPersons.length > 0) {
      filtered = filtered.filter(item => selectedCreatedPersons.includes(item.createdPerson));
    }

    if (selectedFileNames.length > 0) {
      filtered = filtered.filter(item => 
        item.sourceFiles.some(file => selectedFileNames.includes(file))
      );
    }

    return filtered;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-col h-full overflow-hidden px-6 opacity-95">




        <div className="mb-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="bg-[#53A2FF] text-white size-7 rounded-full flex items-center justify-center text-sm font-medium shadow-sm">3</div>
              <b className="text-slate-800 text-2xl">Content History</b>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchContentHistory}
                disabled={loading}
                className="text-[#53A2FF] hover:bg-[#e6f5ff] p-1.5"
                title="Refresh history"
              >
                <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              {/* Format Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`text-[#53A2FF] hover:bg-[#e6f5ff] p-1.5 ${selectedFormats.length > 0 ? 'bg-[#e6f5ff]' : ''}`}
                    title="Filter by format"
                  >
                    <Filter className="size-4" />
                    {selectedFormats.length > 0 && <span className="ml-1 text-xs font-semibold text-[#53A2FF]">({selectedFormats.length})</span>}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 bg-white border-[#b3e0ff]">
                  <DropdownMenuLabel className="text-xs font-semibold text-slate-700">Filter by Format</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-[#b3e0ff]" />
                  <div className="max-h-64 overflow-y-auto">
                    {getUniqueFormats().map(format => (
                      <DropdownMenuItem
                        key={format}
                        onSelect={() => toggleFormatFilter(format)}
                        className="text-xs text-slate-700 cursor-pointer hover:bg-[#f0f8ff] focus:bg-[#f0f8ff] flex items-center gap-2 px-2 py-1.5"
                      >
                        <div className="flex items-center gap-1.5 flex-1">
                          {getFormatIcon(format)}
                          <span>{formatTypeName(format)}</span>
                        </div>
                        {selectedFormats.includes(format) && (
                          <Check className="size-4 text-[#53A2FF] flex-shrink-0" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </div>
                  {selectedFormats.length > 0 && (
                    <>
                      <DropdownMenuSeparator className="bg-[#b3e0ff]" />
                      <DropdownMenuItem
                        onSelect={() => setSelectedFormats([])}
                        className="text-xs text-[#53A2FF] cursor-pointer hover:bg-[#e6f5ff] focus:bg-[#e6f5ff] py-1.5"
                      >
                        Clear All
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Created Person Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`text-[#53A2FF] hover:bg-[#e6f5ff] p-1.5 ${selectedCreatedPersons.length > 0 ? 'bg-[#e6f5ff]' : ''}`}
                    title="Filter by created person"
                  >
                    <User className="size-4" />
                    {selectedCreatedPersons.length > 0 && <span className="ml-1 text-xs font-semibold text-[#53A2FF]">({selectedCreatedPersons.length})</span>}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 bg-white border-[#b3e0ff]">
                  <DropdownMenuLabel className="text-xs font-semibold text-slate-700">Filter by Creator</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-[#b3e0ff]" />
                  <div className="max-h-64 overflow-y-auto">
                    {getUniqueCreatedPersons().map(person => (
                      <DropdownMenuItem
                        key={person}
                        onSelect={() => toggleCreatedPersonFilter(person)}
                        className="text-xs text-slate-700 cursor-pointer hover:bg-[#f0f8ff] focus:bg-[#f0f8ff] flex items-center gap-2 px-2 py-1.5"
                      >
                        <div className="flex items-center gap-1.5 flex-1">
                          <User className="size-3 text-slate-400" />
                          <span>{person}</span>
                        </div>
                        {selectedCreatedPersons.includes(person) && (
                          <Check className="size-4 text-[#53A2FF] flex-shrink-0" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </div>
                  {selectedCreatedPersons.length > 0 && (
                    <>
                      <DropdownMenuSeparator className="bg-[#b3e0ff]" />
                      <DropdownMenuItem
                        onSelect={() => setSelectedCreatedPersons([])}
                        className="text-xs text-[#53A2FF] cursor-pointer hover:bg-[#e6f5ff] focus:bg-[#e6f5ff] py-1.5"
                      >
                        Clear All
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* File Name Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`text-[#53A2FF] hover:bg-[#e6f5ff] p-1.5 ${selectedFileNames.length > 0 ? 'bg-[#e6f5ff]' : ''}`}
                    title="Filter by file name"
                  >
                    <FileText className="size-4" />
                    {selectedFileNames.length > 0 && <span className="ml-1 text-xs font-semibold text-[#53A2FF]">({selectedFileNames.length})</span>}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72 bg-white border-[#b3e0ff]">
                  <DropdownMenuLabel className="text-xs font-semibold text-slate-700">Filter by File Name</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-[#b3e0ff]" />
                  <div className="max-h-64 overflow-y-auto">
                    {getUniqueFileNames().map(fileName => (
                      <DropdownMenuItem
                        key={fileName}
                        onSelect={() => toggleFileNameFilter(fileName)}
                        className="text-xs text-slate-700 cursor-pointer hover:bg-[#f0f8ff] focus:bg-[#f0f8ff] flex items-center gap-2 px-2 py-1.5"
                      >
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <FileText className="size-3 text-slate-400 flex-shrink-0" />
                          <span className="truncate" title={fileName}>{fileName}</span>
                        </div>
                        {selectedFileNames.includes(fileName) && (
                          <Check className="size-4 text-[#53A2FF] flex-shrink-0" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </div>
                  {selectedFileNames.length > 0 && (
                    <>
                      <DropdownMenuSeparator className="bg-[#b3e0ff]" />
                      <DropdownMenuItem
                        onSelect={() => setSelectedFileNames([])}
                        className="text-xs text-[#53A2FF] cursor-pointer hover:bg-[#e6f5ff] focus:bg-[#e6f5ff] py-1.5"
                      >
                        Clear All
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-slate-600 text-xs">Recent generations</p>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 text-[#53A2FF] border-[#b3e0ff] hover:bg-[#e6f5ff]"
            >
              View History
            </Button>
          </div>
        </div>


        <div className="flex-1 overflow-y-auto min-h-0 scrollbar scrollbar-thumb-slate-300 scrollbar-track-slate-100">
          <div className="space-y-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <svg className="animate-spin size-10 text-[#53A2FF]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                  <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
                <p className="text-sm text-slate-500">Loading history...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-8 text-red-500">
                <AlertCircle className="size-8 mb-2" />
                <p className="text-xs text-center">{error}</p>
              </div>
            ) : historyItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <Clock className="size-8 mb-2 opacity-50" />
                <p className="text-xs text-center">No history yet</p>
              </div>
            ) : getFilteredHistoryItems().length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <Clock className="size-8 mb-2 opacity-50" />
                <p className="text-xs text-center">No items match selected filters</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {getFilteredHistoryItems().map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className={`p-2.5 rounded-lg border-1 cursor-pointer transition-all duration-200 ${selectedItemId === item.id
                      ? 'bg-[#e6f5ff] border-1 border-[#53A2FF] shadow-sm'
                      : 'bg-white border-1 border-[#b3e0ff] hover:bg-[#f0f8ff]'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex-1 min-w-0">
                        <div className="space-y-0.5">
                          {item.sourceFiles.map((file, idx) => (
                            <p key={idx} className="text-xs text-slate-700 truncate pl-2 border-l-2 border-blue-300 font-medium leading-tight">
                              {file}
                            </p>
                          ))}
                        </div>
                        {/* Quick star rating and text feedback for Sales CF formats */}
                        {domain === 'sales' && isFeedbackFormat(item.format) && (
                          <div className="mt-1.5 pl-2 flex items-center gap-3">
                            <MiniStarRating
                              transactionUuid={item.uuid}
                              formatType={item.format}
                              domain={domain}
                              externalRating={itemFeedback[item.uuid]?.rating ?? null}
                            />
                            <InlineTextFeedback
                              transactionUuid={item.uuid}
                              formatType={item.format}
                              domain={domain}
                              externalText={itemFeedback[item.uuid]?.text ?? null}
                              onSaved={(text) => setItemFeedback(prev => ({ ...prev, [item.uuid]: { ...prev[item.uuid], text } }))}
                            />
                          </div>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className="flex-shrink-0 flex items-center gap-1 bg-green-100 text-green-800 border-green-300 h-5"
                      >
                        {getStatusIcon(item.status)}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <Badge
                        variant="outline"
                        className={`text-xs py-1 px-2 font-medium flex items-center gap-1.5 whitespace-nowrap ${getFormatColor(item.format)}`}
                      >
                        {getFormatIcon(item.format)}
                        <span>{formatTypeName(item.format)}</span>
                      </Badge>
                      {item.editedFilePaths.length > 0 && (
                        <Badge
                          variant="outline"
                          className="text-xs py-1 px-2 font-medium flex items-center gap-1 bg-violet-50 text-violet-700 border-violet-200 whitespace-nowrap"
                        >
                          <Zap className="size-3" />
                          {item.editedFilePaths.length + 1} versions
                        </Badge>
                      )}
                      {item.totalCost !== undefined && (
                        <>
                          <Badge
                            variant="outline"
                            className="text-xs py-1 px-2 font-medium flex items-center gap-1 bg-slate-50 text-slate-600 border-slate-200 whitespace-nowrap"
                          >
                            {formatTokens((Number(item.inputTokens) || 0) + (Number(item.outputTokens) || 0))} tokens
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-xs py-1 px-2 font-medium flex items-center gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 whitespace-nowrap"
                          >
                            ${Number(item.totalCost).toFixed(4)} cost
                          </Badge>
                        </>
                      )}
                      <div className="flex flex-col items-end ml-auto">
                        <span className="text-xs text-slate-500 font-medium tracking-wide flex items-center gap-1">
                          <Clock className="size-3 text-slate-400" />
                          {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium tracking-wide mt-0.5">
                          {item.timestamp.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-')}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 mb-1.5 flex items-center gap-1.5">
                      <User className="size-3 text-slate-400 flex-shrink-0" />
                      <span className="font-medium text-slate-700 truncate">{item.createdPerson}</span>
                    </div>

                    {selectedItemId === item.id && (
                      <>
                        <Separator className="mb-1.5 bg-[#b3e0ff]" />
                        <div className="flex gap-1 items-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-[#53A2FF] hover:bg-[#e6f5ff]"
                            disabled={item.status !== 'completed'}
                            onClick={() => handleView(item)}
                          >
                            <Eye className="size-3 mr-0.5" />
                            View
                          </Button>
                          {item.format.toLowerCase().replace(/[\s_-]/g, '') === 'moviemaker' && (props as any).onEditStoryboard && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-[#53A2FF] hover:bg-[#e6f5ff]"
                              disabled={item.status !== 'completed'}
                              onClick={() => (props as any).onEditStoryboard(item.uuid)}
                            >
                              <Pencil className="size-3 mr-0.5" />
                              Edit
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-[#53A2FF] hover:bg-[#e6f5ff]"
                            disabled={item.status !== 'completed'}
                            onClick={() => handleDownload(item)}
                          >
                            <Download className="size-3 mr-0.5" />
                            Download
                          </Button>
                          
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal - Outside opacity container */}
      {viewingItem && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2"
          onClick={closePreview}
        >
          <div
            className="bg-white w-full max-w-7xl h-[90vh] flex flex-col rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-[#b3e0ff] flex items-center justify-between flex-shrink-0 bg-gradient-to-r from-blue-50/30 to-transparent">
              <div className="flex-1">
                <b className="text-slate-800 text-2xl font-bold block mb-1">
                  {formatFileName(viewingItem.outputFilename)}
                </b>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    {getFormatIcon(viewingItem.format)}
                    {formatTypeName(viewingItem.format)}
                  </span>
                  <span>•</span>
                  <span>{viewingItem.createdPerson}</span>
                  <span>•</span>
                  <span>{viewingItem.timestamp.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
              <button
                onClick={closePreview}
                className="ml-6 h-10 w-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-800 transition-all flex-shrink-0 shadow-sm hover:shadow-md"
                title="Close preview"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Content and Refine Panel */}
            <div className="flex-1 overflow-hidden flex gap-0">
              {/* Content Area */}
              <div className="flex-1 overflow-hidden p-6 border-r border-[#b3e0ff] flex flex-col">
                {/* Version tabs for non-microdrama items with multiple versions */}
                {contentVersions.length > 1 && (
                  <div className="flex items-center gap-1 mb-2 border-b border-gray-100 shrink-0">
                    {contentVersions.map((v, i) => (
                      <button
                        key={i}
                        onClick={() => handleContentVersionSelect(i)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-t-md border-b-2 transition-colors flex items-center gap-1 ${
                          activeContentVersionIdx === i
                            ? 'border-[#53A2FF] text-[#53A2FF] bg-blue-50'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {v.label}
                        {activeContentVersionIdx === i && v.content === null && (
                          <Loader2 className="size-3 animate-spin" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
                <div className={`${contentVersions.length > 1 ? 'flex-1' : 'h-full'} bg-white rounded-lg border border-[#b3e0ff] overflow-y-auto`}>
                  {viewingLoading ? (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <Loader2 className="size-8 text-[#53A2FF] mb-2 animate-spin" />
                      <p className="text-xs text-slate-600">Loading preview...</p>
                    </div>
                  ) : (
                    renderPreview()
                  )}
                </div>
              </div>

              {/* Right Panel — Feedback (Sales CF formats) or AI Refinement (others) */}
              {domain === 'sales' && viewingItem && isFeedbackFormat(viewingItem.format) ? (
                <div
                  className="flex flex-col h-full border-l border-[#b3e0ff] bg-white overflow-y-auto"
                  style={{ width: '350px', minWidth: '350px' }}
                >
                  <ContentFeedback
                    transactionUuid={viewingItem.uuid}
                    formatType={viewingItem.format}
                    domain={domain}
                    onFeedbackSubmitted={(rating, text) =>
                      setItemFeedback(prev => ({ ...prev, [viewingItem.uuid]: { rating, text } }))
                    }
                  />
                </div>
              ) : viewingItem && viewingItem.format.toLowerCase().replace(/[\s_-]/g, '') === 'microdrama' ? (
                <MicroDramaRefineWithAI
                  filePath={viewingItem.outputFilePath}
                  onEditedUrl={(blobUrl, editedFilePath) => {
                    setEditedVideoUrl(blobUrl);
                    setVideoVersions(prev => {
                      const newVersion: VideoVersion = {
                        label: `Edit ${prev.length}`,
                        filePath: editedFilePath,
                        blobUrl,
                      };
                      const updated = [...prev, newVersion];
                      setActiveVersionIdx(updated.length - 1);
                      return updated;
                    });
                  }}
                  className="w-[350px] shrink-0 border-l border-[#b3e0ff]"
                />
                ) : viewingItem && viewingItem.format.toLowerCase().replace(/[\s_-]/g, '') === 'banner' && domain === 'sales' ? (
                <SalesBannerRefinePanel
                  transactionUuid={viewingItem.uuid}
                  versions={videoVersions.map((v, i) => ({
                    version: i + 1,
                    label: v.label,
                    url: v.blobUrl || '',
                    blob: new Blob(),
                  }))}
                  activeVersionIdx={activeVersionIdx}
                  onNewVersion={(newVersion: SalesBannerVersion) => {
                    setVideoVersions(prev => {
                      const updated = [...prev, {
                        label: newVersion.label,
                        filePath: '',
                        blobUrl: newVersion.url,
                      }];
                      setActiveVersionIdx(updated.length - 1);
                      return updated;
                    });
                  }}
                  onSelectVersion={(idx) => handleVersionSelect(idx)}
                  className="w-[350px] shrink-0 border-l border-[#b3e0ff]"
                />
              ) : viewingItem && viewingItem.format.toLowerCase().replace(/[\s_-]/g, '') === 'banner' ? (
                <BannerRefinePanel
                  transactionUuid={viewingItem.uuid}
                  bannerOptions={null}
                  versions={videoVersions.map((v, i) => ({
                    version: i + 1,
                    label: v.label,
                    url: v.blobUrl || '',
                    blob: new Blob(),
                  }))}
                  activeVersionIdx={activeVersionIdx}
                  onNewVersion={(newVersion: BannerVersion) => {
                    setVideoVersions(prev => {
                      const updated = [...prev, {
                        label: newVersion.label,
                        filePath: '',
                        blobUrl: newVersion.url,
                      }];
                      setActiveVersionIdx(updated.length - 1);
                      return updated;
                    });
                  }}
                  onSelectVersion={(idx) => handleVersionSelect(idx)}
                  domain={domain}
                  className="w-[350px] shrink-0 border-l border-[#b3e0ff]"
                />
              ) : (
                <RefineWithAI
                  categories={historyPromptCategories}
                  className="w-[350px] shrink-0 border-l border-[#b3e0ff]"
                />
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-[#b3e0ff] flex items-center justify-between flex-shrink-0">
              <Button
                onClick={() => handleDownload(viewingItem)}
                disabled={viewingLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {viewingLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : <Download className="size-4 mr-2" />}
                Download
              </Button>

              {domain !== 'sales' && (
                <Button
                  onClick={handlePushToVeeva}
                  disabled={isPushing || !viewingItem}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isPushing ? <Loader2 className="size-4 animate-spin mr-2" /> : <Upload className="size-4 mr-2" />}
                  {pushSuccess ? 'Pushed!' : 'Push to Veeva'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quiz Modal - Outside opacity container */}
      <QuizModal
        isOpen={showQuizModal}
        quizData={quizData}
        onClose={() => {
          setShowQuizModal(false);
          setQuizData(null);
        }}
      />
    </div>
  );
});

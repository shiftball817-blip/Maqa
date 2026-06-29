import React, { useState } from 'react';
import { ScenePrompt, AspectRatio, ArtStyle } from '../types';
import { 
  Download, Play, RefreshCw, Trash2, CheckCircle2, 
  XCircle, Image as ImageIcon, Search, Check, Square, 
  CheckSquare, Sliders, ExternalLink, ZoomIn, X, ChevronRight, HelpCircle
} from 'lucide-react';

interface ImageGridProps {
  scenes: ScenePrompt[];
  onUpdateScene: (id: string, updatedFields: Partial<ScenePrompt>) => void;
  onDeleteScene: (id: string) => void;
  onGenerateSingle: (id: string) => Promise<void>;
  onGenerateBatch: () => Promise<void>;
  onDownloadAllZip: () => Promise<void>;
  isGeneratingAny: boolean;
  globalRatio: AspectRatio;
  setGlobalRatio: (ratio: AspectRatio) => void;
  globalStyle: ArtStyle;
  setGlobalStyle: (style: ArtStyle) => void;
  concurrencyLimit: number;
  setConcurrencyLimit: (limit: number) => void;
}

const ART_STYLES: { value: ArtStyle; label: string; preview: string }[] = [
  { value: 'none', label: 'Varsayılan (Tarzsız)', preview: 'bg-slate-100 text-slate-600 border-slate-200' },
  { value: 'photorealistic', label: 'Fotoğraf (Gerçekçi)', preview: 'bg-amber-50 text-amber-800 border-amber-200' },
  { value: 'digital-art', label: 'Dijital Çizim', preview: 'bg-blue-50 text-blue-800 border-blue-200' },
  { value: 'anime', label: 'Anime / Ghibli', preview: 'bg-pink-50 text-pink-800 border-pink-200' },
  { value: 'watercolor', label: 'Sulu Boya', preview: 'bg-purple-50 text-purple-800 border-purple-200' },
  { value: '3d-render', label: '3D Render / Blender', preview: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { value: 'cyberpunk', label: 'Siberpunk', preview: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  { value: 'oil-painting', label: 'Yağlı Boya Tablo', preview: 'bg-orange-50 text-orange-800 border-orange-200' },
  { value: 'fantasy', label: 'Epik Fantastik', preview: 'bg-teal-50 text-teal-800 border-teal-200' },
  { value: 'comic-book', label: 'Çizgi Roman Pop-Art', preview: 'bg-red-50 text-red-800 border-red-200' },
];

const ASPECT_RATIOS: { value: AspectRatio; label: string; ratioClass: string }[] = [
  { value: '1:1', label: '1:1 (Kare)', ratioClass: 'aspect-square' },
  { value: '16:9', label: '16:9 (Geniş)', ratioClass: 'aspect-video' },
  { value: '9:16', label: '9:16 (Mobil Dikey)', ratioClass: 'aspect-[9/16]' },
  { value: '4:3', label: '4:3 (Klasik)', ratioClass: 'aspect-[4/3]' },
  { value: '3:4', label: '3:4 (Portre)', ratioClass: 'aspect-[3/4]' },
];

export default function ImageGrid({
  scenes,
  onUpdateScene,
  onDeleteScene,
  onGenerateSingle,
  onGenerateBatch,
  onDownloadAllZip,
  isGeneratingAny,
  globalRatio,
  setGlobalRatio,
  globalStyle,
  setGlobalStyle,
  concurrencyLimit,
  setConcurrencyLimit,
}: ImageGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeLightbox, setActiveLightbox] = useState<string | null>(null);

  // Filter scenes based on search query and status dropdown
  const filteredScenes = scenes.filter((scene) => {
    const matchesSearch = 
      scene.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scene.prompt.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && scene.status === filterStatus;
  });

  const selectedCount = scenes.filter(s => s.selected).length;
  const successCount = scenes.filter(s => s.status === 'success').length;
  const generatingCount = scenes.filter(s => s.status === 'generating').length;
  const failedCount = scenes.filter(s => s.status === 'failed').length;
  const idleCount = scenes.filter(s => s.status === 'idle').length;

  const handleSelectAll = (select: boolean) => {
    scenes.forEach(s => onUpdateScene(s.id, { selected: select }));
  };

  const handleToggleSelect = (id: string) => {
    const scene = scenes.find(s => s.id === id);
    if (scene) {
      onUpdateScene(id, { selected: !scene.selected });
    }
  };

  return (
    <div className="space-y-6" id="image-grid-container">
      {/* Settings Panel & Overall Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Sliders size={18} className="text-indigo-600" />
            <h3 className="text-sm font-semibold text-slate-800">Global Görsel Ayarları (Tüm Sahneler İçin)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Aspect Ratio */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">Boyut / Oran (Aspect Ratio)</label>
              <div className="grid grid-cols-5 gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio.value}
                    type="button"
                    onClick={() => setGlobalRatio(ratio.value)}
                    className={`py-1.5 text-center text-xs font-medium rounded-md transition-colors ${
                      globalRatio === ratio.value
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    title={ratio.label}
                  >
                    {ratio.value}
                  </button>
                ))}
              </div>
            </div>

            {/* Concurrency Limit */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">
                Aynı Anda Üretilecek Görsel Sayısı (Eş Zamanlı Limit)
              </label>
              <div className="grid grid-cols-4 gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
                {[1, 3, 5, 10].map((limit) => (
                  <button
                    key={limit}
                    type="button"
                    onClick={() => setConcurrencyLimit(limit)}
                    className={`py-1.5 text-center text-xs font-medium rounded-md transition-colors ${
                      concurrencyLimit === limit
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {limit}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Art Style Grid */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">
              Sanat Tarzı (Otomatik olarak her promta eklenir)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 max-h-36 overflow-y-auto pr-1">
              {ART_STYLES.map((style) => (
                <button
                  key={style.value}
                  type="button"
                  onClick={() => setGlobalStyle(style.value)}
                  className={`px-2 py-2 text-left text-xs font-medium rounded-lg border transition-all flex items-center justify-between ${
                    globalStyle === style.value
                      ? 'border-indigo-600 ring-2 ring-indigo-50 bg-indigo-50/50 text-indigo-900'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <span className="truncate">{style.label}</span>
                  {globalStyle === style.value && <Check size={12} className="text-indigo-600 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dashboard Progress Stats */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Genel Durum</h3>
            
            {/* Progress Bar */}
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-4 flex">
              <div 
                className="bg-emerald-500 transition-all duration-300" 
                style={{ width: `${scenes.length > 0 ? (successCount / scenes.length) * 100 : 0}%` }}
                title="Başarılı"
              />
              <div 
                className="bg-indigo-500 animate-pulse transition-all duration-300" 
                style={{ width: `${scenes.length > 0 ? (generatingCount / scenes.length) * 100 : 0}%` }}
                title="Üretiliyor"
              />
              <div 
                className="bg-rose-500 transition-all duration-300" 
                style={{ width: `${scenes.length > 0 ? (failedCount / scenes.length) * 100 : 0}%` }}
                title="Hata Aldı"
              />
            </div>

            {/* Grid of badges */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Toplam Sahne</span>
                <span className="text-lg font-semibold text-slate-700">{scenes.length}</span>
              </div>
              <div className="bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/30">
                <span className="block text-[10px] uppercase font-bold tracking-wider text-indigo-500">Seçili</span>
                <span className="text-lg font-semibold text-indigo-700">{selectedCount} / {scenes.length}</span>
              </div>
              <div className="bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-100/50">
                <span className="block text-[10px] uppercase font-bold tracking-wider text-emerald-500">Tamamlanan</span>
                <span className="text-lg font-semibold text-emerald-700">{successCount}</span>
              </div>
              <div className="bg-rose-50/80 p-2.5 rounded-xl border border-rose-100/50">
                <span className="block text-[10px] uppercase font-bold tracking-wider text-rose-500">Hatalı</span>
                <span className="text-lg font-semibold text-rose-700">{failedCount}</span>
              </div>
            </div>
          </div>

          {/* Bulk Action Buttons */}
          <div className="space-y-2 mt-2">
            <button
              type="button"
              disabled={isGeneratingAny || selectedCount === 0}
              onClick={onGenerateBatch}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                !isGeneratingAny && selectedCount > 0
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 hover:scale-[1.01] cursor-pointer'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
              id="btn-generate-selected"
            >
              <Play size={16} />
              Seçilenleri Eş Zamanlı Üret ({selectedCount})
            </button>

            <button
              type="button"
              disabled={successCount === 0}
              onClick={onDownloadAllZip}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                successCount > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-100 hover:scale-[1.01] cursor-pointer'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
              id="btn-download-all-zip"
            >
              <Download size={16} />
              Tümünü ZIP Olarak İndir ({successCount} Fotoğraf)
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Select All, Filters */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Select Buttons */}
          <button
            type="button"
            onClick={() => handleSelectAll(true)}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 flex items-center gap-1"
          >
            <CheckSquare size={14} className="text-indigo-600" />
            Tümünü Seç
          </button>
          <button
            type="button"
            onClick={() => handleSelectAll(false)}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 flex items-center gap-1"
          >
            <Square size={14} />
            Seçimleri Kaldır
          </button>

          <div className="h-4 w-[1px] bg-slate-200 mx-1 hidden sm:block" />

          {/* Filter Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Filtrele: Tüm Durumlar</option>
            <option value="idle">Hazır (Üretilmemiş)</option>
            <option value="generating">Üretiliyor</option>
            <option value="success">Başarılı</option>
            <option value="failed">Hatalı</option>
          </select>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder="Sahnelerde ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50/50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Grid List of Scene Cards */}
      {filteredScenes.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400">
          <ImageIcon size={48} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-medium">Herhangi bir sahne bulunamadı.</p>
          <p className="text-xs text-slate-400 mt-1">Ayrıştırılacak metin yazın veya filtreleri değiştirin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" id="scene-cards-grid">
          {filteredScenes.map((scene) => {
            const ratioObj = ASPECT_RATIOS.find(r => r.value === globalRatio) || ASPECT_RATIOS[0];
            return (
              <div 
                key={scene.id}
                className={`bg-white rounded-2xl border transition-all duration-300 flex flex-col overflow-hidden group ${
                  scene.selected 
                    ? 'border-indigo-200 ring-4 ring-indigo-500/5' 
                    : 'border-slate-100 hover:border-slate-200'
                }`}
                id={`card-${scene.id}`}
              >
                {/* Image Section or Placeholder */}
                <div className={`relative bg-slate-50 w-full overflow-hidden ${ratioObj.ratioClass}`}>
                  {scene.imageUrl ? (
                    <>
                      <img 
                        src={scene.imageUrl} 
                        alt={scene.label}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500 cursor-pointer"
                        onClick={() => setActiveLightbox(scene.imageUrl || null)}
                        id={`img-${scene.id}`}
                      />
                      {/* Zoom Trigger Button Overlay on Hover */}
                      <button
                        type="button"
                        onClick={() => setActiveLightbox(scene.imageUrl || null)}
                        className="absolute bottom-3 right-3 p-2 bg-slate-900/70 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                        title="Tam Ekran Görüntüle"
                      >
                        <ZoomIn size={14} />
                      </button>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                      {scene.status === 'generating' ? (
                        <div className="flex flex-col items-center gap-3">
                          <RefreshCw className="animate-spin text-indigo-600" size={28} />
                          <span className="text-xs font-semibold text-indigo-600">Gemini ile üretiliyor...</span>
                        </div>
                      ) : scene.status === 'failed' ? (
                        <div className="flex flex-col items-center gap-1.5 p-3 text-rose-500">
                          <XCircle size={24} />
                          <span className="text-xs font-semibold text-rose-600">Üretim Başarısız</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-400">
                          <ImageIcon size={28} className="text-slate-300" />
                          <span className="text-xs font-medium">Henüz üretilmedi</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Top Overlay Badge & Selection */}
                  <div className="absolute top-3 left-3 right-3 flex justify-between items-center pointer-events-none">
                    {/* Scene Label Badge */}
                    <span className="bg-slate-900/80 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-xs">
                      {scene.label}
                    </span>

                    {/* Checkbox Selector */}
                    <button
                      type="button"
                      onClick={() => handleToggleSelect(scene.id)}
                      className="pointer-events-auto p-1 bg-white/95 rounded-lg border shadow-xs hover:scale-105 active:scale-95 transition-transform flex items-center justify-center text-slate-600 cursor-pointer"
                    >
                      {scene.selected ? (
                        <CheckSquare size={18} className="text-indigo-600" />
                      ) : (
                        <Square size={18} className="text-slate-300" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Card Body - Editable Text Area */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Görsel Açıklaması (Düzenlenebilir)</label>
                    <textarea
                      value={scene.prompt}
                      disabled={scene.status === 'generating'}
                      onChange={(e) => onUpdateScene(scene.id, { prompt: e.target.value })}
                      placeholder="Promt girin..."
                      className="w-full h-18 bg-slate-50/50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white resize-none leading-relaxed transition-all"
                      id={`prompt-text-${scene.id}`}
                    />
                  </div>

                  {/* Error Box if failed */}
                  {scene.status === 'failed' && scene.error && (
                    <div className="p-2 bg-rose-50 border border-rose-100 rounded-lg flex gap-1 text-[10px] text-rose-600 leading-normal">
                      <XCircle size={12} className="shrink-0 mt-0.5" />
                      <span className="break-words w-full">{scene.error}</span>
                    </div>
                  )}

                  {/* Scene Actions */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => onDeleteScene(scene.id)}
                      disabled={scene.status === 'generating'}
                      className="text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-slate-400 p-1 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
                      title="Sil"
                    >
                      <Trash2 size={15} />
                    </button>

                    <div className="flex items-center gap-1.5">
                      {scene.imageUrl && scene.status === 'success' && (
                        <button
                          type="button"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = scene.imageUrl!;
                            link.download = `${scene.label.toLowerCase().replace(/\s+/g, '_')}.png`;
                            link.click();
                          }}
                          className="px-2.5 py-1 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 flex items-center gap-1 transition-colors cursor-pointer"
                          title="Görseli Bilgisayara İndir"
                        >
                          <Download size={12} />
                          İndir
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onGenerateSingle(scene.id)}
                        disabled={scene.status === 'generating' || !scene.prompt.trim()}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all ${
                          scene.status === 'success'
                            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/50 cursor-pointer'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer'
                        }`}
                        id={`btn-generate-${scene.id}`}
                      >
                        {scene.status === 'generating' ? (
                          <>
                            <RefreshCw className="animate-spin" size={12} />
                            Üretiliyor
                          </>
                        ) : scene.status === 'success' ? (
                          <>
                            <RefreshCw size={12} />
                            Yeniden Üret
                          </>
                        ) : (
                          <>
                            <Play size={12} />
                            Görsel Üret
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox / Modal */}
      {activeLightbox && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={() => setActiveLightbox(null)}
          id="lightbox-overlay"
        >
          <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
            {/* Download Inside Lightbox */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const link = document.createElement('a');
                link.href = activeLightbox;
                link.download = 'scene_image_full.png';
                link.click();
              }}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors flex items-center justify-center"
              title="Görseli İndir"
            >
              <Download size={20} />
            </button>
            
            {/* Close */}
            <button
              type="button"
              onClick={() => setActiveLightbox(null)}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors flex items-center justify-center"
            >
              <X size={20} />
            </button>
          </div>

          <div 
            className="max-w-5xl max-h-[90vh] flex flex-col items-center justify-center relative select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={activeLightbox} 
              alt="Görsel Önizleme" 
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl animate-scale-up"
            />
          </div>
        </div>
      )}
    </div>
  );
}

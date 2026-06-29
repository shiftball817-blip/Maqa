import React, { useState } from 'react';
import PromptParser from './components/PromptParser';
import ImageGrid from './components/ImageGrid';
import { ScenePrompt, AspectRatio, ArtStyle } from './types';
import { downloadBlob } from './utils';
import JSZip from 'jszip';
import { Sparkles, Sliders, Play, Download, Trash2, HelpCircle, AlertTriangle } from 'lucide-react';

export default function App() {
  const [scenes, setScenes] = useState<ScenePrompt[]>([]);
  const [isGeneratingAny, setIsGeneratingAny] = useState(false);
  
  // Global generation preferences
  const [globalRatio, setGlobalRatio] = useState<AspectRatio>('1:1');
  const [globalStyle, setGlobalStyle] = useState<ArtStyle>('none');
  const [concurrencyLimit, setConcurrencyLimit] = useState<number>(3);

  // Parse callback from parser component
  const handleScenesParsed = (parsedScenes: ScenePrompt[]) => {
    // Merge or replace
    setScenes(parsedScenes);
  };

  // Update specific fields of a scene card (e.g. editable prompt, status, etc)
  const handleUpdateScene = (id: string, updatedFields: Partial<ScenePrompt>) => {
    setScenes((prev) =>
      prev.map((scene) => (scene.id === id ? { ...scene, ...updatedFields } : scene))
    );
  };

  // Delete scene card
  const handleDeleteScene = (id: string) => {
    setScenes((prev) => prev.filter((scene) => scene.id !== id));
  };

  // Generate single scene image
  const handleGenerateSingle = async (id: string) => {
    const scene = scenes.find((s) => s.id === id);
    if (!scene) return;

    handleUpdateScene(id, { status: 'generating', error: undefined });

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: scene.prompt,
          aspectRatio: globalRatio,
          style: globalStyle,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.imageUrl) {
        handleUpdateScene(id, {
          status: 'success',
          imageUrl: data.imageUrl,
          error: undefined,
        });
      } else {
        handleUpdateScene(id, {
          status: 'failed',
          error: data.error || 'Görsel üretilirken bir hata oluştu.',
        });
      }
    } catch (error: any) {
      handleUpdateScene(id, {
        status: 'failed',
        error: error.message || 'Sunucuyla bağlantı kurulamadı.',
      });
    }
  };

  // Queue-based concurrent batch generation
  const handleGenerateBatch = async () => {
    if (isGeneratingAny) return;

    // Filter selected scenes that are ready or failed (don't re-run currently generating)
    const targets = scenes.filter((s) => s.selected && s.status !== 'generating');
    if (targets.length === 0) return;

    setIsGeneratingAny(true);

    // Set all selected scenes to generating state immediately to show visual queue indicators
    setScenes((prev) =>
      prev.map((s) =>
        targets.some((t) => t.id === s.id)
          ? { ...s, status: 'generating', error: undefined }
          : s
      )
    );

    // Create a shadow copy of the queue
    const queue = [...targets];

    // Concurrency Worker Pool: Run up to concurrencyLimit workers in parallel
    const workers = Array(Math.min(concurrencyLimit, queue.length))
      .fill(null)
      .map(async () => {
        while (queue.length > 0) {
          const task = queue.shift();
          if (!task) break;

          try {
            const response = await fetch('/api/generate-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt: task.prompt,
                aspectRatio: globalRatio,
                style: globalStyle,
              }),
            });

            const data = await response.json();

            if (response.ok && data.success && data.imageUrl) {
              setScenes((prev) =>
                prev.map((s) =>
                  s.id === task.id
                    ? { ...s, status: 'success', imageUrl: data.imageUrl, error: undefined }
                    : s
                )
              );
            } else {
              setScenes((prev) =>
                prev.map((s) =>
                  s.id === task.id
                    ? { ...s, status: 'failed', error: data.error || 'Hata oluştu' }
                    : s
                )
              );
            }
          } catch (error: any) {
            setScenes((prev) =>
              prev.map((s) =>
                s.id === task.id
                  ? { ...s, status: 'failed', error: error.message || 'Sunucu bağlantı hatası' }
                  : s
              )
            );
          }
        }
      });

    // Wait for all workers to complete drawing down the queue
    await Promise.all(workers);
    setIsGeneratingAny(false);
  };

  // Download all successfully generated images into a single ZIP file
  const handleDownloadAllZip = async () => {
    const successfulScenes = scenes.filter((s) => s.imageUrl && s.status === 'success');
    if (successfulScenes.length === 0) return;

    try {
      const zip = new JSZip();

      successfulScenes.forEach((scene, index) => {
        if (scene.imageUrl) {
          // Extract base64 data (split at the comma: "data:image/png;base64,iVBOR...")
          const parts = scene.imageUrl.split(',');
          if (parts.length > 1) {
            const base64Data = parts[1];
            // Format name as e.g. scene_01_label.png
            const cleanLabel = scene.label
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9]+/g, '_');
            const fileName = `${cleanLabel || 'scene'}_${index + 1}.png`;
            zip.file(fileName, base64Data, { base64: true });
          }
        }
      });

      // Generate the ZIP blob
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      // Trigger download
      downloadBlob(zipBlob, `scenes_gallery_${Date.now()}.zip`);
    } catch (err: any) {
      alert('ZIP sıkıştırılırken bir hata oluştu: ' + (err.message || String(err)));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 flex flex-col font-sans" id="app-root">
      {/* Header Banner */}
      <header className="bg-white border-b border-slate-100 py-6 px-4 md:px-8 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Scene Art Studio</h1>
              <p className="text-xs text-slate-500">
                Toplu senaryo metinlerinden akıllı sahne analizi ve eş zamanlı yapay zekâ görsel üretimi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-slate-600 font-mono">Gemini-2.5-Flash-Image Aktif</span>
          </div>
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-8">
        
        {/* Welcome Instructions Card */}
        <div className="bg-linear-to-r from-indigo-900 to-slate-950 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl shadow-slate-100">
          <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 pointer-events-none hidden md:block">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full scale-150 transform translate-x-12 translate-y-12">
              <circle cx="50" cy="50" r="40" stroke="white" strokeWidth="1" />
              <path d="M50 10V90M10 50H90" stroke="white" strokeWidth="0.5" />
            </svg>
          </div>

          <div className="relative max-w-3xl space-y-4">
            <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full border border-indigo-500/30">
              Kılavuz
            </span>
            <h2 className="text-2xl font-bold tracking-tight">Akıllı Sahne ve Promt Oluşturucu</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Bu uygulama ile yazdığınız uzun senaryoları, kitap bölümlerini veya <strong>100'den fazla satırlık devasa promt listelerini</strong> tek seferde ayrıştırabilirsiniz. 
              <strong>"Scene"</strong> veya <strong>"Sahne"</strong> ile başlayan tüm satırlar anında tespit edilir, düzenlenebilir kartlara dönüştürülür ve tek tuşla 
              Gemini üzerinden <strong>eş zamanlı olarak üretilerek</strong> tek bir tıklamayla toplu <strong>ZIP</strong> olarak indirilebilir.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <span className="text-xs font-bold text-indigo-300">1. Metni Yapıştırın</span>
                <p className="text-xs text-slate-400 mt-1">İçinde Scene veya Sahne geçen senaryo metnini yapıştırıp ayrıştırın.</p>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <span className="text-xs font-bold text-indigo-300">2. Görselleri İnceleyin</span>
                <p className="text-xs text-slate-400 mt-1">Sahneleri tek tek düzenleyin, global sanat tarzınızı seçin ve kuyruğu başlatın.</p>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <span className="text-xs font-bold text-indigo-300">3. Toplu İndirin</span>
                <p className="text-xs text-slate-400 mt-1">Tüm başarılı görselleri tek tuşla ZIP sıkıştırılmış dosya olarak indirin.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 1: Prompt Input Panel */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 bg-indigo-600 text-white rounded-full text-xs font-bold">1</span>
            <h2 className="text-base font-bold text-slate-800">Senaryoyu Ayrıştırın</h2>
          </div>
          <PromptParser onParsed={handleScenesParsed} />
        </section>

        {/* Step 2: Gallery and Generation Manager */}
        {scenes.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-slate-200/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 bg-indigo-600 text-white rounded-full text-xs font-bold">2</span>
                <h2 className="text-base font-bold text-slate-800 font-sans">Görsel Üretim Paneli ve Galeri</h2>
              </div>
              
              <button
                type="button"
                onClick={() => setScenes([])}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 size={13} />
                Tümünü Sıfırla
              </button>
            </div>

            <ImageGrid
              scenes={scenes}
              onUpdateScene={handleUpdateScene}
              onDeleteScene={handleDeleteScene}
              onGenerateSingle={handleGenerateSingle}
              onGenerateBatch={handleGenerateBatch}
              onDownloadAllZip={handleDownloadAllZip}
              isGeneratingAny={isGeneratingAny}
              globalRatio={globalRatio}
              setGlobalRatio={setGlobalRatio}
              globalStyle={globalStyle}
              setGlobalStyle={setGlobalStyle}
              concurrencyLimit={concurrencyLimit}
              setConcurrencyLimit={setConcurrencyLimit}
            />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-6 mt-12 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Scene Art Studio. Tüm Hakları Saklıdır.</p>
          <p>Google AI Studio Build & Gemini API tarafından desteklenmektedir.</p>
        </div>
      </footer>
    </div>
  );
}

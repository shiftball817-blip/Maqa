import React, { useState, useEffect } from 'react';
import { parseScenePrompts } from '../utils';
import { ScenePrompt } from '../types';
import { Sparkles, FileText, Settings, AlertCircle } from 'lucide-react';

interface PromptParserProps {
  onParsed: (scenes: ScenePrompt[]) => void;
  initialText?: string;
}

const DEMO_SCRIPT = `Kralın Dönüşü - Fantastik Senaryo Örneği

Scene 1: Bir dağın tepesinde parıldayan kadim bir şato, dolunay ışığı altında, sisli atmosfer, fantastik dijital sanat tarzı.

Scene 2: Şatonun kapısında bekleyen zırhlı muhafızlar, ellerinde meşaleler, ortaçağ mimarisi.

Sahne 3: Muhafızların arasından süzülen gizemli mavi gözlü beyaz bir kurt, karla kaplı patika.

Scene 4: Şatonun taht odasında tek başına oturan yaşlı kral, başında altın taç, hüzünlü bakışlar, yağlı boya tarzı.

Sahne 5: Kralın elinde tuttuğu parıldayan sihirli bir zümrüt taş, yakın çekim, büyülü yeşil ışık yansımaları.`;

export default function PromptParser({ onParsed, initialText = '' }: PromptParserProps) {
  const [text, setText] = useState(initialText);
  const [keywords, setKeywords] = useState('scene, sahne');
  const [realtimeCount, setRealtimeCount] = useState(0);

  // Parse in real-time to show how many prompts will be extracted
  useEffect(() => {
    if (text.trim() === '') {
      setRealtimeCount(0);
      return;
    }
    const tempParsed = parseScenePrompts(text, keywords);
    setRealtimeCount(tempParsed.length);
  }, [text, keywords]);

  const handleParse = () => {
    const parsed = parseScenePrompts(text, keywords);
    onParsed(parsed);
  };

  const loadDemo = () => {
    setText(DEMO_SCRIPT);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6" id="prompt-parser-container">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <FileText size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Senaryo / Promt Girişi</h2>
            <p className="text-xs text-slate-500">100+ promt içeren metni buraya yapıştırın. Sahneler otomatik ayrıştırılır.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadDemo}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50 px-3 py-1.5 rounded-lg border border-indigo-100 transition-colors"
          id="btn-load-demo"
        >
          Örnek Senaryo Yükle
        </button>
      </div>

      <div className="space-y-4">
        {/* Keywords and Help */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1">
              <Settings size={14} className="text-slate-400" />
              Sahne Başlangıç Kelimeleri (Virgülle Ayırın)
            </label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="scene, sahne, prompt"
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
              id="input-keywords"
            />
          </div>
          <div className="flex flex-col justify-end">
            <div className="text-xs text-slate-500 flex items-start gap-1">
              <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <span>
                Metindeki her bir <strong>"{keywords.split(',')[0]}"</strong> veya <strong>"{keywords.split(',')[1] || 'sahne'}"</strong> ile başlayan satır ayrı bir görsel promtu olarak algılanır.
              </span>
            </div>
          </div>
        </div>

        {/* Text Area */}
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Senaryonuzu veya promt listenizi buraya yazın ya da yapıştırın...&#10;&#10;Örnek:&#10;Scene 1: Karlı dağlar ardında parlayan güneş...&#10;Scene 2: Ormanın derinliklerindeki sihirli ev..."
            className="w-full h-64 bg-slate-50/50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-sans resize-y leading-relaxed"
            id="textarea-raw-script"
          />
          {realtimeCount > 0 && (
            <div className="absolute bottom-4 right-4 bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md flex items-center gap-1 animate-pulse">
              <Sparkles size={12} />
              <span>{realtimeCount} Sahne Algılandı</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleParse}
            disabled={realtimeCount === 0}
            className={`w-full md:w-auto px-6 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
              realtimeCount > 0
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:scale-[1.01] cursor-pointer'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
            id="btn-parse-script"
          >
            <Sparkles size={16} />
            Sahneleri Ayrıştır ve Listele ({realtimeCount})
          </button>
        </div>
      </div>
    </div>
  );
}

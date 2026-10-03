/**
 * OpenWebProject - Top Bar Header
 * Follows the Universal Top Bar Contract:
 * [Brand Zone] - [Navigation Views] - [Language & Primary Actions]
 */
import React, { useState, useRef, useEffect } from 'react';
import { Download, Upload, Save, Laptop, Container, Globe, ChevronDown } from 'lucide-react';
import { Workspace } from '../types/project';
import { useLanguage } from '../i18n/LanguageContext';
import { SupportedLanguage } from '../i18n/translations';

export type ActiveView = 'split' | 'gantt' | 'table' | 'timeline' | 'dashboard';

interface TopHeaderProps {
  workspace: Workspace;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  onOpenImport: () => void;
  onOpenExport: () => void;
  onQuickSave: () => void;
  onDownloadOfflineApp?: () => void;
  onOpenRunLocalModal?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  workspace,
  activeView,
  setActiveView,
  onOpenImport,
  onOpenExport,
  onQuickSave,
  onDownloadOfflineApp,
  onOpenRunLocalModal,
}) => {
  const { language, setLanguage, languages, t } = useLanguage();
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  // Close language menu on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    if (isLangMenuOpen) {
      document.addEventListener('mousedown', handleOutside);
      return () => document.removeEventListener('mousedown', handleOutside);
    }
  }, [isLangMenuOpen]);

  const views: { id: ActiveView; label: string }[] = [
    { id: 'split', label: t('viewSplit') },
    { id: 'table', label: t('viewTable') },
    { id: 'gantt', label: t('viewGantt') },
    { id: 'timeline', label: t('viewTimeline') },
    { id: 'dashboard', label: t('viewDashboard') },
  ];

  const currentLangObj = languages.find((l) => l.code === language) || languages[0];

  return (
    <header className="h-12 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 select-none">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-xs">
          P
        </div>
        <span className="text-base font-bold tracking-tight text-slate-900">
          OpenWebProject
        </span>
        <span className="hidden sm:inline text-xs text-slate-400 font-mono">v1.1</span>
      </div>

      {/* Zone 2: Clean text navigation views */}
      <nav className="flex items-center gap-1 p-0.5 bg-slate-100/90 rounded-lg">
        {views.map((v) => {
          const isActive = activeView === v.id;
          return (
            <button
              key={v.id}
              onClick={() => setActiveView(v.id)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              {v.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Language Selector & Primary actions */}
      <div className="flex items-center gap-2">
        {/* Language Switcher Dropdown */}
        <div className="relative" ref={langMenuRef}>
          <button
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shadow-2xs"
            title={t('language')}
          >
            <span className="text-sm leading-none">{currentLangObj.flag}</span>
            <span className="hidden sm:inline uppercase text-[11px] font-bold text-slate-800">
              {currentLangObj.code}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isLangMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-36 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                {t('language')}
              </div>
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    setLanguage(l.code);
                    setIsLangMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors ${
                    language === l.code
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
                  </span>
                  {language === l.code && <span className="text-blue-600 text-xs">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {onOpenRunLocalModal && (
          <button
            onClick={onOpenRunLocalModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-lg transition-colors shadow-2xs"
            title={t('runDockerTitle')}
          >
            <Container className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">{t('runDocker')}</span>
          </button>
        )}

        {onDownloadOfflineApp && (
          <button
            onClick={onDownloadOfflineApp}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-lg transition-colors shadow-2xs"
            title={t('appOfflineTitle')}
          >
            <Laptop className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden lg:inline">{t('appOffline')}</span>
          </button>
        )}

        <button
          onClick={onOpenImport}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-lg transition-colors shadow-2xs"
          title={t('importTitle')}
        >
          <Upload className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden md:inline">{t('import')}</span>
        </button>

        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-lg transition-colors shadow-2xs"
          title={t('exportTitle')}
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden md:inline">{t('export')}</span>
        </button>

        <button
          onClick={onQuickSave}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
          title={t('saveProjectTitle')}
        >
          <Save className="w-3.5 h-3.5 text-slate-200" />
          <span className="hidden sm:inline">{t('saveProject')}</span>
        </button>
      </div>
    </header>
  );
};

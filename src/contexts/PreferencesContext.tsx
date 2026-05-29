import React, { createContext, useContext, useState, useEffect } from 'react';
import { t } from '../lib/i18n';

type Language = 'en' | 'mr';
type Density = 'comfortable' | 'compact';

interface PreferencesContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  density: Density;
  setDensity: (density: Density) => void;
  t: (key: string) => string;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [density, setDensityState] = useState<Density>('comfortable');

  useEffect(() => {
    const savedLang = localStorage.getItem('tms_language') as Language;
    const savedDensity = localStorage.getItem('tms_density') as Density;
    if (savedLang) setLanguageState(savedLang);
    if (savedDensity) setDensityState(savedDensity);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('tms_language', lang);
  };

  const setDensity = (d: Density) => {
    setDensityState(d);
    localStorage.setItem('tms_density', d);
    if (d === 'compact') {
      document.body.classList.add('compact-mode');
    } else {
      document.body.classList.remove('compact-mode');
    }
  };

  // Initialize body class for density
  useEffect(() => {
    if (density === 'compact') document.body.classList.add('compact-mode');
    else document.body.classList.remove('compact-mode');
  }, [density]);

  const translate = (key: string) => t(key, language);

  return (
    <PreferencesContext.Provider value={{ language, setLanguage, density, setDensity, t: translate }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}

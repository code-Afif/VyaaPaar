import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, translate } from '@/i18n';

const LANGUAGE_STORAGE_KEY = '@dukaansaathi_language_v1';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (path: string, params?: Record<string, string | number>) => string;
  isLoadingLanguage: boolean;
  hasLanguagePreference: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [isLoadingLanguage, setIsLoadingLanguage] = useState<boolean>(true);
  const [hasLanguagePreference, setHasLanguagePreference] = useState<boolean>(false);

  useEffect(() => {
    async function loadSavedLanguage() {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (saved && (saved === 'en' || saved === 'hi' || saved === 'hinglish')) {
          setLanguageState(saved as Language);
          setHasLanguagePreference(true);
        } else {
          setHasLanguagePreference(false);
        }
      } catch (err) {
        console.warn('Failed to load language preference from storage:', err);
      } finally {
        setIsLoadingLanguage(false);
      }
    }

    loadSavedLanguage();
  }, []);

  const setLanguage = useCallback(async (newLang: Language) => {
    try {
      setLanguageState(newLang);
      setHasLanguagePreference(true);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
    } catch (err) {
      console.warn('Failed to save language preference:', err);
    }
  }, []);

  const t = useCallback(
    (path: string, params?: Record<string, string | number>) => {
      return translate(language, path, params);
    },
    [language]
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isLoadingLanguage,
        hasLanguagePreference,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};


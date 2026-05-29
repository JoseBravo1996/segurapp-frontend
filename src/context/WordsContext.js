import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import VoiceService from '../services/VoiceService';
import * as segurappApi from '../services/segurappApi';
import { useAuth } from './AuthContext';

const WordsContext = createContext();

function mapKeyword(k) {
  return {
    id: k.id,
    word: k.word,
    type: 'Alerta',
    description: k.contactName || 'Contacto asignado',
    contactId: k.contactId,
    date: new Date().toLocaleDateString('es-AR'),
  };
}

export const WordsProvider = ({ children }) => {
  const { isAuthenticated, isReady } = useAuth();
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(false);

  const refreshWords = useCallback(async () => {
    if (!isAuthenticated) {
      setWords([]);
      return;
    }
    setLoading(true);
    try {
      const data = await segurappApi.getKeywords();
      setWords(data.map(mapKeyword));
    } catch (error) {
      console.log('Error cargando palabras clave:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isReady) refreshWords();
  }, [isReady, refreshWords]);

  const addWord = async ({ word, contactId }) => {
    await segurappApi.createKeyword({ word, contactId });
    await refreshWords();
  };

  const updateWord = async (id, { word, contactId }) => {
    await segurappApi.updateKeyword(id, { word, contactId });
    await refreshWords();
  };

  const removeWord = async (id) => {
    await segurappApi.deleteKeyword(id);
    setWords((prev) => prev.filter((w) => w.id !== id));
  };

  useEffect(() => {
    const wordList = words.map((w) => w.word);
    VoiceService.setWords(wordList);
  }, [words]);

  return (
    <WordsContext.Provider value={{ words, addWord, updateWord, removeWord, refreshWords, loading }}>
      {children}
    </WordsContext.Provider>
  );
};

export const useWords = () => useContext(WordsContext);

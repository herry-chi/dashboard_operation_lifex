import { useState, useEffect } from 'react';

export interface ChartComment {
  id: string;
  content: string;
  updatedAt: string;
}

export interface ChartComments {
  [chartId: string]: ChartComment;
}

const STORAGE_KEY = 'deals-dashboard-chart-comments';

export function useChartComments() {
  const [comments, setComments] = useState<ChartComments>({});

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setComments(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to parse chart comments from localStorage:', error);
      }
    }
  }, []);

  const saveToStorage = (newComments: ChartComments) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newComments));
    } catch (error) {
      console.error('Failed to save chart comments to localStorage:', error);
    }
  };

  const updateComment = (chartId: string, content: string) => {
    const newComments = {
      ...comments,
      [chartId]: {
        id: chartId,
        content,
        updatedAt: new Date().toISOString()
      }
    };
    setComments(newComments);
    saveToStorage(newComments);
  };

  const deleteComment = (chartId: string) => {
    const newComments = { ...comments };
    delete newComments[chartId];
    setComments(newComments);
    saveToStorage(newComments);
  };

  const getComment = (chartId: string): ChartComment | undefined => {
    return comments[chartId];
  };

  return {
    comments,
    updateComment,
    deleteComment,
    getComment
  };
}
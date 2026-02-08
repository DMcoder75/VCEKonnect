import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { getNotes, saveNote as saveNoteService, deleteNote as deleteNoteService } from '@/services/notesService';
import { Note } from '@/types';

export function useNotes(subjectId?: string) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadNotes();
    }
  }, [user, subjectId]);

  async function loadNotes() {
    if (!user) return;

    try {
      const fetchedNotes = await getNotes(user.id, subjectId);
      setNotes(fetchedNotes);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function saveNote(note: Note) {
    if (!user) return;

    const { error } = await saveNoteService(user.id, note);
    if (error) {
      alert(error);
      return;
    }

    await loadNotes();
  }

  async function deleteNote(noteId: string) {
    if (!user) return;

    const { error } = await deleteNoteService(user.id, noteId);
    if (error) {
      alert(error);
      return;
    }

    setNotes(notes.filter(n => n.id !== noteId));
  }

  return {
    notes,
    isLoading,
    saveNote,
    deleteNote,
    refreshNotes: loadNotes,
  };
}

import { supabase } from './supabase';
import { Note } from '@/types';

// Get all notes for a user
export async function getNotes(userId: string, subjectId?: string): Promise<Note[]> {
  try {
    let query = supabase
      .from('vk_notes')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch notes:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      subjectId: row.subject_id,
      title: row.title,
      content: row.content || '',
      tags: row.tags || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    console.error('Error fetching notes:', err);
    return [];
  }
}

// Save a note (create or update)
export async function saveNote(
  userId: string,
  note: Partial<Note> & { id?: string }
): Promise<{ error: string | null }> {
  try {
    const payload: any = {
      user_id: userId,
      subject_id: note.subjectId,
      title: note.title,
      content: note.content,
      tags: note.tags,
    };

    // Only include ID if editing existing note (valid UUID)
    if (note.id && note.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      payload.id = note.id;
    }

    const { error } = await supabase
      .from('vk_notes')
      .upsert(payload);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Failed to save note' };
  }
}

// Delete a note
export async function deleteNote(
  userId: string,
  noteId: string
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('vk_notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', userId);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Failed to delete note' };
  }
}

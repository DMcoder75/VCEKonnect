import { supabase } from './supabase';
import { Note, NoteAttachment } from '@/types';
import { requireNetwork, isOnline } from './networkService';
import { getNotes as getOfflineNotes, saveNotes as saveOfflineNotes } from './offlineDatabase';

// Get all notes for a user
export async function getNotes(userId: string, subjectId?: string): Promise<Note[]> {
  // If offline, return cached data
  if (!isOnline()) {
    console.log('📡 Notes: Offline - loading from SQLite');
    return await getOfflineNotes(userId);
  }

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
      // Fallback to offline data
      return await getOfflineNotes(userId);
    }

    const notes = (data || []).map(row => ({
      id: row.id,
      userId,
      subjectId: row.subject_id,
      title: row.title,
      content: row.content || '',
      contentFormat: row.content_format || 'plain',
      tags: row.tags || [],
      attachments: row.attachments || [],
      isShared: row.is_shared || false,
      shareToken: row.share_token,
      isVoiceNote: row.is_voice_note || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    // Cache for offline use
    await saveOfflineNotes(notes);

    return notes;
  } catch (err) {
    console.error('Error fetching notes:', err);
    // Fallback to offline data
    return await getOfflineNotes(userId);
  }
}

// Advanced search for notes
export async function searchNotes(
  userId: string,
  filters: {
    searchQuery?: string;
    subjectId?: string;
    tags?: string[];
    startDate?: string;
    endDate?: string;
    isVoiceNote?: boolean;
    contentFormat?: 'plain' | 'markdown' | 'html';
  }
): Promise<Note[]> {
  try {
    const { data, error } = await supabase.rpc('search_notes', {
      p_user_id: userId,
      p_search_query: filters.searchQuery || null,
      p_subject_id: filters.subjectId || null,
      p_tags: filters.tags || null,
      p_start_date: filters.startDate || null,
      p_end_date: filters.endDate || null,
      p_is_voice_note: filters.isVoiceNote ?? null,
      p_content_format: filters.contentFormat || null,
    });

    if (error) {
      console.error('Failed to search notes:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      subjectId: row.subject_id,
      title: row.title,
      content: row.content || '',
      contentFormat: row.content_format || 'plain',
      tags: row.tags || [],
      attachments: row.attachments || [],
      isShared: row.is_shared || false,
      isVoiceNote: row.is_voice_note || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    console.error('Error searching notes:', err);
    return [];
  }
}

// Save a note (create or update)
export async function saveNote(
  userId: string,
  note: Partial<Note> & { id?: string }
): Promise<{ error: string | null }> {
  // Require network for write operations
  try {
    requireNetwork();
  } catch (error) {
    return { error: (error as Error).message };
  }

  try {
    const payload: any = {
      user_id: userId,
      subject_id: note.subjectId,
      title: note.title,
      content: note.content,
      content_format: note.contentFormat || 'plain',
      tags: note.tags,
      attachments: note.attachments || [],
      is_voice_note: note.isVoiceNote || false,
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
  // Require network for write operations
  try {
    requireNetwork();
  } catch (error) {
    return { error: (error as Error).message };
  }

  try {
    // First, get note to delete its attachments
    const { data: note } = await supabase
      .from('vk_notes')
      .select('attachments')
      .eq('id', noteId)
      .eq('user_id', userId)
      .single();

    // Delete attachments from storage
    if (note?.attachments && Array.isArray(note.attachments)) {
      for (const attachment of note.attachments) {
        await supabase.storage
          .from('note-attachments')
          .remove([attachment.file_path]);
      }
    }

    // Delete note
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

// Upload note attachment
export async function uploadAttachment(
  file: { uri: string; name: string; type: string }
): Promise<{ data: NoteAttachment | null; error: string | null }> {
  try {
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `attachments/${fileName}`;

    // Convert file URI to blob for upload
    const response = await fetch(file.uri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from('note-attachments')
      .upload(filePath, blob, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return { data: null, error: uploadError.message };
    }

    const { data: { publicUrl } } = supabase.storage
      .from('note-attachments')
      .getPublicUrl(filePath);

    const attachment: NoteAttachment = {
      file_path: filePath,
      file_name: file.name,
      file_type: file.type,
      file_size: blob.size,
      uploaded_at: new Date().toISOString(),
      url: publicUrl,
    };

    return { data: attachment, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Failed to upload attachment' };
  }
}

// Delete attachment
export async function deleteAttachment(
  filePath: string
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.storage
      .from('note-attachments')
      .remove([filePath]);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Failed to delete attachment' };
  }
}

// Share note
export async function shareNote(
  noteId: string,
  shouldShare: boolean
): Promise<{ data: { shareToken?: string; sharedAt?: string } | null; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc('share_note', {
      note_id: noteId,
      should_share: shouldShare,
    });

    if (error) return { data: null, error: error.message };
    return { data: data || null, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Failed to share note' };
  }
}

// Get shared note by token (public access)
export async function getSharedNote(
  token: string
): Promise<{ data: Note | null; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc('get_shared_note', {
      token,
    });

    if (error) return { data: null, error: error.message };
    if (!data || data.length === 0) {
      return { data: null, error: 'Note not found or not shared' };
    }

    const row = data[0];
    const note: Note = {
      id: row.id,
      subjectId: row.subject_id,
      title: row.title,
      content: row.content || '',
      contentFormat: row.content_format || 'plain',
      tags: row.tags || [],
      attachments: row.attachments || [],
      isShared: true,
      createdAt: row.created_at,
      updatedAt: row.created_at,
    };

    return { data: note, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Failed to get shared note' };
  }
}

// Mark note as accessed
export async function markNoteAccessed(
  noteId: string
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.rpc('mark_note_accessed', {
      note_id: noteId,
    });

    if (error) return { error: error.message };
    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Failed to mark note as accessed' };
  }
}

// Export note as text
export function exportNoteAsText(note: Note): string {
  let text = `${note.title}\n`;
  text += `${'='.repeat(note.title.length)}\n\n`;
  text += `Subject: ${note.subjectId}\n`;
  text += `Created: ${new Date(note.createdAt).toLocaleString()}\n`;
  if (note.tags && note.tags.length > 0) {
    text += `Tags: ${note.tags.join(', ')}\n`;
  }
  text += `\n${note.content}\n`;
  
  if (note.attachments && note.attachments.length > 0) {
    text += `\n\nAttachments:\n`;
    note.attachments.forEach((att: NoteAttachment) => {
      text += `- ${att.file_name} (${att.file_type})\n`;
    });
  }
  
  return text;
}

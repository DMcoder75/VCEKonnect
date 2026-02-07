import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { getNotes, saveNote, deleteNote } from '@/services/storage';
import { Note } from '@/types';
import { VCE_SUBJECTS } from '@/constants/vceData';

export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    loadNotes();
  }, []);

  async function loadNotes() {
    const allNotes = await getNotes();
    setNotes(allNotes);
  }

  const filteredNotes = selectedSubject === 'all'
    ? notes
    : notes.filter(n => n.subjectId === selectedSubject);

  const userSubjects = VCE_SUBJECTS.filter(s => user?.selectedSubjects.includes(s.id));

  async function handleSaveNote() {
    const note: Note = {
      id: editingNote?.id || `note_${Date.now()}`,
      subjectId: selectedSubject === 'all' ? userSubjects[0]?.id || 'general' : selectedSubject,
      title: title.trim() || 'Untitled Note',
      content: content.trim(),
      tags: [],
      createdAt: editingNote?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveNote(note);
    await loadNotes();
    setIsCreating(false);
    setEditingNote(null);
    setTitle('');
    setContent('');
  }

  async function handleDeleteNote(noteId: string) {
    await deleteNote(noteId);
    await loadNotes();
  }

  function handleEditNote(note: Note) {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setIsCreating(true);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Notes & Progress</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => setIsCreating(true)}
        >
          <MaterialIcons name="add" size={24} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* Subject Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
      >
        <Pressable
          style={[styles.filterChip, selectedSubject === 'all' && styles.filterChipActive]}
          onPress={() => setSelectedSubject('all')}
        >
          <Text style={[styles.filterText, selectedSubject === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </Pressable>
        {userSubjects.map(subject => (
          <Pressable
            key={subject.id}
            style={[styles.filterChip, selectedSubject === subject.id && styles.filterChipActive]}
            onPress={() => setSelectedSubject(subject.id)}
          >
            <Text style={[styles.filterText, selectedSubject === subject.id && styles.filterTextActive]}>
              {subject.code}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isCreating ? (
        <View style={styles.editorContainer}>
          <View style={styles.editorHeader}>
            <Text style={styles.editorTitle}>
              {editingNote ? 'Edit Note' : 'New Note'}
            </Text>
            <Pressable onPress={() => {
              setIsCreating(false);
              setEditingNote(null);
              setTitle('');
              setContent('');
            }}>
              <MaterialIcons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>
          
          <TextInput
            style={styles.titleInput}
            placeholder="Note title..."
            placeholderTextColor={colors.textTertiary}
            value={title}
            onChangeText={setTitle}
          />
          
          <TextInput
            style={styles.contentInput}
            placeholder="Start writing..."
            placeholderTextColor={colors.textTertiary}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
          
          <Pressable style={styles.saveButton} onPress={handleSaveNote}>
            <Text style={styles.saveButtonText}>Save Note</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredNotes.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="note" size={64} color={colors.textTertiary} />
              <Text style={styles.emptyText}>No notes yet</Text>
              <Text style={styles.emptyDesc}>Tap + to create your first note</Text>
            </View>
          ) : (
            filteredNotes.map(note => {
              const subject = VCE_SUBJECTS.find(s => s.id === note.subjectId);
              return (
                <View key={note.id} style={styles.noteCard}>
                  <View style={styles.noteHeader}>
                    <View style={styles.noteTitleContainer}>
                      <Text style={styles.noteTitle}>{note.title}</Text>
                      <Text style={styles.noteSubject}>{subject?.name || 'General'}</Text>
                    </View>
                    <View style={styles.noteActions}>
                      <Pressable onPress={() => handleEditNote(note)} style={styles.iconButton}>
                        <MaterialIcons name="edit" size={20} color={colors.textSecondary} />
                      </Pressable>
                      <Pressable onPress={() => handleDeleteNote(note.id)} style={styles.iconButton}>
                        <MaterialIcons name="delete" size={20} color={colors.error} />
                      </Pressable>
                    </View>
                  </View>
                  <Text style={styles.noteContent} numberOfLines={3}>
                    {note.content}
                  </Text>
                  <Text style={styles.noteDate}>
                    {new Date(note.updatedAt).toLocaleDateString('en-AU')}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.h1,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: typography.medium,
  },
  filterTextActive: {
    color: colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  emptyText: {
    fontSize: typography.h3,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyDesc: {
    fontSize: typography.bodySmall,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  noteCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  noteTitleContainer: {
    flex: 1,
  },
  noteTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  noteSubject: {
    fontSize: typography.caption,
    color: colors.primary,
    marginTop: 2,
  },
  noteActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    padding: spacing.xs,
  },
  noteContent: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  noteDate: {
    fontSize: typography.caption,
    color: colors.textTertiary,
  },
  editorContainer: {
    flex: 1,
    padding: spacing.md,
  },
  editorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  editorTitle: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.textPrimary,
  },
  titleInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  contentInput: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
});

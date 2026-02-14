import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useNotes } from '@/hooks/useNotes';
import { Note } from '@/types';
import { getUserSubjects } from '@/services/userSubjectsService';
import { VCESubject } from '@/services/vceSubjectsService';

export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { notes, saveNote: saveNoteHook, deleteNote: deleteNoteHook } = useNotes();
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteSubject, setNoteSubject] = useState<string>('');

  const [userSubjects, setUserSubjects] = useState<VCESubject[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);

  const filteredNotes = selectedSubject === 'all'
    ? notes
    : notes.filter(n => n.subjectId === selectedSubject);

  useEffect(() => {
    loadSubjects();
  }, [user]);

  useEffect(() => {
    if (notes !== undefined) {
      setIsLoadingNotes(false);
    }
  }, [notes]);

  async function loadSubjects() {
    if (!user) return;
    setIsLoadingSubjects(true);
    const subjects = await getUserSubjects(user.id);
    setUserSubjects(subjects);
    setIsLoadingSubjects(false);
  }

  async function handleSaveNote() {
    if (!noteSubject) {
      alert('Please select a subject for this note');
      return;
    }

    const note: any = {
      subjectId: noteSubject,
      title: title.trim() || 'Untitled Note',
      content: content.trim(),
      tags: [],
    };

    if (editingNote?.id) {
      note.id = editingNote.id;
      note.createdAt = editingNote.createdAt;
    }
    
    note.updatedAt = new Date().toISOString();

    await saveNoteHook(note);
    closeNoteEditor();
  }

  async function handleDeleteNote(noteId: string) {
    await deleteNoteHook(noteId);
  }

  function handleEditNote(note: Note) {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setNoteSubject(note.subjectId);
    setIsCreating(true);
  }

  function openNoteEditor() {
    setIsCreating(true);
    if (selectedSubject !== 'all') {
      setNoteSubject(selectedSubject);
    } else if (userSubjects.length > 0) {
      setNoteSubject(userSubjects[0].id);
    }
  }

  function closeNoteEditor() {
    setIsCreating(false);
    setEditingNote(null);
    setTitle('');
    setContent('');
    setNoteSubject('');
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerPlaceholder} />
        <Text style={styles.title}>Notes & Progress</Text>
        <Pressable
          style={styles.addButton}
          onPress={openNoteEditor}
        >
          <MaterialIcons name="add" size={24} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* Subject Filter */}
      <View style={styles.filterWrapper}>
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
      </View>

      {(isLoadingSubjects || isLoadingNotes) && !isCreating ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading notes...</Text>
        </View>
      ) : isCreating ? (
        <View style={styles.editorContainer}>
          <View style={styles.editorHeader}>
            <Text style={styles.editorTitle}>
              {editingNote ? 'Edit Note' : 'New Note'}
            </Text>
            <Pressable onPress={closeNoteEditor}>
              <MaterialIcons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.subjectSelectorContainer}>
            <Text style={styles.subjectLabel}>Subject</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.subjectSelector}
            >
              {userSubjects.map(subject => (
                <Pressable
                  key={subject.id}
                  style={[
                    styles.subjectChip,
                    noteSubject === subject.id && styles.subjectChipActive,
                  ]}
                  onPress={() => setNoteSubject(subject.id)}
                >
                  <Text
                    style={[
                      styles.subjectChipText,
                      noteSubject === subject.id && styles.subjectChipTextActive,
                    ]}
                  >
                    {subject.code}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
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
              const subject = userSubjects.find(s => s.id === note.subjectId);
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
    marginBottom: spacing.xs,
  },
  headerPlaceholder: {
    width: 40,
  },
  title: {
    fontSize: typography.h1,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterWrapper: {
    height: 44,
    marginBottom: spacing.xs,
  },
  filterContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    gap: spacing.sm,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
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
    paddingHorizontal: spacing.md,
    paddingTop: 0,
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
  subjectSelectorContainer: {
    marginBottom: spacing.md,
  },
  subjectLabel: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  subjectSelector: {
    gap: spacing.sm,
  },
  subjectChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subjectChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  subjectChipText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  subjectChipTextActive: {
    color: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.body,
    color: colors.textSecondary,
  },
});

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useNotes } from '@/hooks/useNotes';
import { useAI } from '@/hooks/useAI';
import { LoadingSpinner } from '@/components/ui';
import { Note } from '@/types';
import { getUserSubjects } from '@/services/userSubjectsService';
import { VCESubject } from '@/services/vceSubjectsService';

export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { notes, saveNote: saveNoteHook, deleteNote: deleteNoteHook } = useNotes();
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'subject'>('date');
  const [isCreating, setIsCreating] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteSubject, setNoteSubject] = useState<string>('');
  const [noteTags, setNoteTags] = useState<string>('');

  const [userSubjects, setUserSubjects] = useState<VCESubject[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [summarizingNoteId, setSummarizingNoteId] = useState<string | null>(null);
  const [noteSummaries, setNoteSummaries] = useState<{ [noteId: string]: string }>({});
  const { summarize, isLoading: isAILoading } = useAI();

  // Get all unique tags from notes
  const allTags = Array.from(new Set(notes.flatMap(note => note.tags || [])));

  // Advanced filtering
  let filteredNotes = notes;
  
  // Filter by subject
  if (selectedSubject !== 'all') {
    filteredNotes = filteredNotes.filter(n => n.subjectId === selectedSubject);
  }
  
  // Filter by search query (title or content)
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredNotes = filteredNotes.filter(n => 
      n.title.toLowerCase().includes(query) || 
      n.content.toLowerCase().includes(query)
    );
  }
  
  // Filter by tags
  if (selectedTags.length > 0) {
    filteredNotes = filteredNotes.filter(n => 
      selectedTags.some(tag => (n.tags || []).includes(tag))
    );
  }
  
  // Sort notes
  filteredNotes = [...filteredNotes].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    } else {
      return a.subjectId.localeCompare(b.subjectId);
    }
  });

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

  function toggleTag(tag: string) {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  }

  async function handleSaveNote() {
    if (!noteSubject) {
      alert('Please select a subject for this note');
      return;
    }

    const tags = noteTags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const note: any = {
      subjectId: noteSubject,
      title: title.trim() || 'Untitled Note',
      content: content.trim(),
      tags,
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

  async function handleSummarizeNote(note: Note) {
    if (!user) return;
    
    setSummarizingNoteId(note.id);
    const subject = userSubjects.find(s => s.id === note.subjectId);
    
    const result = await summarize(
      user.id,
      note.title,
      note.content,
      subject?.code || 'General',
      subject?.name || 'General Studies'
    );
    
    if (result.data) {
      setNoteSummaries(prev => ({
        ...prev,
        [note.id]: result.data!.response,
      }));
    }
    
    setSummarizingNoteId(null);
  }

  function handleEditNote(note: Note) {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setNoteSubject(note.subjectId);
    setNoteTags((note.tags || []).join(', '));
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
    setNoteTags('');
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerPlaceholder} />
          <Text style={styles.title}>Notes & Progress</Text>
          <View style={styles.headerButtons}>
            <Pressable
              style={styles.iconButtonHeader}
              onPress={() => setShowFilters(!showFilters)}
            >
              <MaterialIcons 
                name={showFilters ? "filter-list-off" : "filter-list"} 
                size={24} 
                color={showFilters ? colors.primary : colors.textSecondary} 
              />
            </Pressable>
            <Pressable
              style={styles.addButton}
              onPress={openNoteEditor}
            >
              <MaterialIcons name="add" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color={colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search notes..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Advanced Filters */}
        {showFilters && (
          <View style={styles.filtersContainer}>
            {/* Sort By */}
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Sort by:</Text>
              <View style={styles.sortButtons}>
                <Pressable
                  style={[styles.sortChip, sortBy === 'date' && styles.sortChipActive]}
                  onPress={() => setSortBy('date')}
                >
                  <Text style={[styles.sortText, sortBy === 'date' && styles.sortTextActive]}>Date</Text>
                </Pressable>
                <Pressable
                  style={[styles.sortChip, sortBy === 'subject' && styles.sortChipActive]}
                  onPress={() => setSortBy('subject')}
                >
                  <Text style={[styles.sortText, sortBy === 'subject' && styles.sortTextActive]}>Subject</Text>
                </Pressable>
              </View>
            </View>

            {/* Tag Filters */}
            {allTags.length > 0 && (
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Tags:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.tagsScroll}
                >
                  {allTags.map(tag => (
                    <Pressable
                      key={tag}
                      style={[styles.tagChip, selectedTags.includes(tag) && styles.tagChipActive]}
                      onPress={() => toggleTag(tag)}
                    >
                      <Text style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextActive]}>
                        {tag}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Clear Filters */}
            {(searchQuery || selectedTags.length > 0 || selectedSubject !== 'all') && (
              <Pressable
                style={styles.clearFiltersButton}
                onPress={() => {
                  setSearchQuery('');
                  setSelectedTags([]);
                  setSelectedSubject('all');
                }}
              >
                <MaterialIcons name="clear-all" size={16} color={colors.error} />
                <Text style={styles.clearFiltersText}>Clear All Filters</Text>
              </Pressable>
            )}
          </View>
        )}

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
        <LoadingSpinner message="Loading notes..." />
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
          
          <View style={styles.tagInputContainer}>
            <Text style={styles.tagInputLabel}>Tags (comma separated)</Text>
            <TextInput
              style={styles.tagInput}
              placeholder="e.g., revision, important, exam"
              placeholderTextColor={colors.textTertiary}
              value={noteTags}
              onChangeText={setNoteTags}
            />
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
                      <Pressable 
                        onPress={() => handleSummarizeNote(note)} 
                        style={styles.iconButton}
                        disabled={summarizingNoteId === note.id}
                      >
                        <MaterialIcons 
                          name={summarizingNoteId === note.id ? "hourglass-empty" : "auto-awesome"} 
                          size={20} 
                          color={summarizingNoteId === note.id ? colors.textTertiary : colors.warning} 
                        />
                      </Pressable>
                      <Pressable onPress={() => handleEditNote(note)} style={styles.iconButton}>
                        <MaterialIcons name="edit" size={20} color={colors.textSecondary} />
                      </Pressable>
                      <Pressable onPress={() => handleDeleteNote(note.id)} style={styles.iconButton}>
                        <MaterialIcons name="delete" size={20} color={colors.error} />
                      </Pressable>
                    </View>
                  </View>
                  <Text style={styles.noteContent} numberOfLines={noteSummaries[note.id] ? undefined : 3}>
                    {note.content}
                  </Text>
                  
                  {/* AI Summary */}
                  {noteSummaries[note.id] && (
                    <View style={styles.summaryCard}>
                      <View style={styles.summaryHeader}>
                        <MaterialIcons name="auto-awesome" size={16} color={colors.success} />
                        <Text style={styles.summaryTitle}>AI Summary</Text>
                      </View>
                      <Text style={styles.summaryText}>{noteSummaries[note.id]}</Text>
                      <Pressable 
                        onPress={() => setNoteSummaries(prev => {
                          const newSummaries = { ...prev };
                          delete newSummaries[note.id];
                          return newSummaries;
                        })}
                        style={styles.dismissButton}
                      >
                        <Text style={styles.dismissText}>Dismiss</Text>
                      </Pressable>
                    </View>
                  )}
                  
                  {summarizingNoteId === note.id && (
                    <View style={styles.summarizingCard}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={styles.summarizingText}>AI is summarizing your note...</Text>
                    </View>
                  )}
                  
                  {note.tags && note.tags.length > 0 && (
                    <View style={styles.noteTags}>
                      {note.tags.map((tag, idx) => (
                        <View key={idx} style={styles.noteTag}>
                          <Text style={styles.noteTagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
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
  headerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButtonHeader: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
  },
  filtersContainer: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  filterRow: {
    gap: spacing.xs,
  },
  filterLabel: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sortChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortText: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
  },
  sortTextActive: {
    color: colors.background,
  },
  tagsScroll: {
    gap: spacing.xs,
  },
  tagChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tagText: {
    fontSize: typography.caption,
    color: colors.textSecondary,
  },
  tagTextActive: {
    color: colors.background,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  clearFiltersText: {
    fontSize: typography.bodySmall,
    color: colors.error,
    fontWeight: typography.semibold,
  },
  tagInputContainer: {
    marginBottom: spacing.md,
  },
  tagInputLabel: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  tagInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.body,
    color: colors.textPrimary,
  },
  noteTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  noteTag: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  noteTagText: {
    fontSize: 10,
    color: colors.background,
    fontWeight: typography.medium,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.success,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  summaryTitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.success,
  },
  summaryText: {
    fontSize: typography.bodySmall,
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  dismissButton: {
    alignSelf: 'flex-end',
  },
  dismissText: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    fontWeight: typography.semibold,
  },
  summarizingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  summarizingText: {
    fontSize: typography.caption,
    color: colors.textSecondary,
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

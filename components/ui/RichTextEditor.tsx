import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Pressable, ScrollView, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '@/constants/theme';

interface RichTextEditorProps {
  value: string;
  onChange: (text: string, format: 'plain' | 'markdown') => void;
  placeholder?: string;
  contentFormat?: 'plain' | 'markdown';
}

export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = 'Start writing...',
  contentFormat = 'plain'
}: RichTextEditorProps) {
  const [format, setFormat] = useState<'plain' | 'markdown'>(contentFormat);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);

  function wrapSelection(before: string, after: string = before) {
    const text = value || '';
    const selectedText = text.substring(selectionStart, selectionEnd);
    const newText = 
      text.substring(0, selectionStart) +
      before +
      selectedText +
      after +
      text.substring(selectionEnd);
    
    onChange(newText, 'markdown');
    setFormat('markdown');
  }

  function insertText(text: string) {
    const current = value || '';
    const newText = 
      current.substring(0, selectionStart) +
      text +
      current.substring(selectionEnd);
    
    onChange(newText, 'markdown');
    setFormat('markdown');
  }

  const tools = [
    { icon: 'format-bold', label: 'Bold', action: () => wrapSelection('**') },
    { icon: 'format-italic', label: 'Italic', action: () => wrapSelection('*') },
    { icon: 'format-list-bulleted', label: 'Bullet List', action: () => insertText('\n- ') },
    { icon: 'format-list-numbered', label: 'Number List', action: () => insertText('\n1. ') },
    { icon: 'title', label: 'Heading', action: () => insertText('\n## ') },
  ];

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.toolbar}
        contentContainerStyle={styles.toolbarContent}
      >
        {tools.map((tool, index) => (
          <Pressable
            key={index}
            style={({ pressed }) => [
              styles.toolButton,
              pressed && styles.toolButtonPressed,
            ]}
            onPress={tool.action}
          >
            <MaterialIcons name={tool.icon as any} size={20} color={colors.textPrimary} />
          </Pressable>
        ))}
        
        {/* Format indicator */}
        <View style={styles.formatIndicator}>
          <Text style={styles.formatText}>{format === 'markdown' ? 'MD' : 'TXT'}</Text>
        </View>
      </ScrollView>

      {/* Editor */}
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        value={value}
        onChangeText={(text) => onChange(text, format)}
        onSelectionChange={(e) => {
          setSelectionStart(e.nativeEvent.selection.start);
          setSelectionEnd(e.nativeEvent.selection.end);
        }}
        multiline
        textAlignVertical="top"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  toolbar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    maxHeight: 48,
  },
  toolbarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  toolButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
  toolButtonPressed: {
    backgroundColor: colors.surfaceElevated,
  },
  formatIndicator: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  formatText: {
    fontSize: typography.caption,
    fontWeight: typography.bold,
    color: colors.background,
  },
  input: {
    flex: 1,
    padding: spacing.md,
    fontSize: typography.body,
    color: colors.textPrimary,
    lineHeight: 22,
  },
});

import { supabase } from './supabase';

export interface VCESubject {
  id: string;
  code: string;
  name: string;
  category: string;
  scaledMean: number | null;
  scaledStdDev: number | null;
  stateId: string;
  createdAt: string;
}

export interface AustralianState {
  id: string;
  name: string;
  abbreviation: string;
  educationSystem: string;
  authorityName: string;
  authorityWebsite: string | null;
  usesAtar: boolean;
  scalingSystem: string;
}

// =====================================================
// UNIFIED TABLE: All states now use vk_subjects
// =====================================================
// Legacy state-specific tables (vk_subjects_vic, vk_subjects_nsw, etc.)
// have been migrated to single unified vk_subjects table with state_id column

/**
 * Get all Australian states/territories
 */
export async function getAllStates(): Promise<AustralianState[]> {
  try {
    const { data, error } = await supabase
      .from('vk_states')
      .select('*')
      .order('abbreviation', { ascending: true });

    if (error) {
      console.error('Error fetching states:', error);
      return [];
    }

    return data.map(row => ({
      id: row.id,
      name: row.name,
      abbreviation: row.abbreviation,
      educationSystem: row.education_system,
      authorityName: row.authority_name,
      authorityWebsite: row.authority_website,
      usesAtar: row.uses_atar,
      scalingSystem: row.scaling_system,
    }));
  } catch (err) {
    console.error('getAllStates error:', err);
    return [];
  }
}

/**
 * Get all subjects for a specific state from unified vk_subjects table
 */
export async function getSubjectsByState(stateId: string): Promise<VCESubject[]> {
  try {
    const { data, error } = await supabase
      .from('vk_subjects')
      .select('*')
      .eq('state_id', stateId.toLowerCase())
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error(`Error fetching ${stateId} subjects:`, error);
      return [];
    }

    return data.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      category: row.category,
      scaledMean: row.scaled_mean,
      scaledStdDev: row.scaled_std_dev,
      stateId: row.state_id,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error('getSubjectsByState error:', err);
    return [];
  }
}

/**
 * Get all available VCE subjects from catalog (legacy - VIC only)
 * @deprecated Use getSubjectsByState('vic') instead
 */
export async function getAllVCESubjects(): Promise<VCESubject[]> {
  return getSubjectsByState('vic');
}

/**
 * Get subjects by category for a specific state from unified vk_subjects table
 */
export async function getSubjectsByCategory(category: string, stateId: string = 'vic'): Promise<VCESubject[]> {
  try {
    const { data, error } = await supabase
      .from('vk_subjects')
      .select('*')
      .eq('state_id', stateId.toLowerCase())
      .eq('category', category)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching subjects by category:', error);
      return [];
    }

    return data.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      category: row.category,
      scaledMean: row.scaled_mean,
      scaledStdDev: row.scaled_std_dev,
      stateId: row.state_id,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error('getSubjectsByCategory error:', err);
    return [];
  }
}

/**
 * Get all unique categories for a specific state from unified vk_subjects table
 */
export async function getSubjectCategories(stateId: string = 'vic'): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('vk_subjects')
      .select('category')
      .eq('state_id', stateId.toLowerCase())
      .order('category', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }

    // Remove duplicates
    const categories = [...new Set(data.map(row => row.category))];
    return categories;
  } catch (err) {
    console.error('getSubjectCategories error:', err);
    return [];
  }
}

/**
 * Search subjects by name or code for a specific state from unified vk_subjects table
 */
export async function searchSubjects(query: string, stateId: string = 'vic'): Promise<VCESubject[]> {
  try {
    const searchTerm = `%${query.toLowerCase()}%`;
    
    const { data, error } = await supabase
      .from('vk_subjects')
      .select('*')
      .eq('state_id', stateId.toLowerCase())
      .or(`name.ilike.${searchTerm},code.ilike.${searchTerm}`)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error searching subjects:', error);
      return [];
    }

    return data.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      category: row.category,
      scaledMean: row.scaled_mean,
      scaledStdDev: row.scaled_std_dev,
      stateId: row.state_id,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error('searchSubjects error:', err);
    return [];
  }
}

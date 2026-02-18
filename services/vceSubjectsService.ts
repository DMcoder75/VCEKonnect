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

// State to table mapping
const STATE_TABLE_MAP: Record<string, string> = {
  'vic': 'vk_subjects_vic',
  'nsw': 'vk_subjects_nsw',
  'qld': 'vk_subjects_qld',
  'wa': 'vk_subjects_wa',
  'sa': 'vk_subjects_sa',
  'tas': 'vk_subjects_tas',
  'act': 'vk_subjects_act',
  'nt': 'vk_subjects_nt',
};

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
 * Get all subjects for a specific state
 */
export async function getSubjectsByState(stateId: string): Promise<VCESubject[]> {
  try {
    const tableName = STATE_TABLE_MAP[stateId.toLowerCase()];
    if (!tableName) {
      console.error('Invalid state ID:', stateId);
      return [];
    }

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
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
      stateId: row.state_id || stateId,
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
 * Get subjects by category for a specific state
 */
export async function getSubjectsByCategory(category: string, stateId: string = 'vic'): Promise<VCESubject[]> {
  try {
    const tableName = STATE_TABLE_MAP[stateId.toLowerCase()];
    if (!tableName) {
      console.error('Invalid state ID:', stateId);
      return [];
    }

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
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
      stateId: row.state_id || stateId,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error('getSubjectsByCategory error:', err);
    return [];
  }
}

/**
 * Get all unique categories for a specific state
 */
export async function getSubjectCategories(stateId: string = 'vic'): Promise<string[]> {
  try {
    const tableName = STATE_TABLE_MAP[stateId.toLowerCase()];
    if (!tableName) {
      console.error('Invalid state ID:', stateId);
      return [];
    }

    const { data, error } = await supabase
      .from(tableName)
      .select('category')
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
 * Search subjects by name or code for a specific state
 */
export async function searchSubjects(query: string, stateId: string = 'vic'): Promise<VCESubject[]> {
  try {
    const tableName = STATE_TABLE_MAP[stateId.toLowerCase()];
    if (!tableName) {
      console.error('Invalid state ID:', stateId);
      return [];
    }

    const searchTerm = `%${query.toLowerCase()}%`;
    
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
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
      stateId: row.state_id || stateId,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error('searchSubjects error:', err);
    return [];
  }
}

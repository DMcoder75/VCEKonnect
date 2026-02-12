import { supabase } from './supabase';

export interface VCESubject {
  id: string;
  code: string;
  name: string;
  category: string;
  scaledMean: number | null;
  scaledStdDev: number | null;
  createdAt: string;
}

/**
 * Get all available VCE subjects from catalog
 */
export async function getAllVCESubjects(): Promise<VCESubject[]> {
  try {
    const { data, error } = await supabase
      .from('vk_vce_subjects')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching VCE subjects:', error);
      return [];
    }

    return data.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      category: row.category,
      scaledMean: row.scaled_mean,
      scaledStdDev: row.scaled_std_dev,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error('getAllVCESubjects error:', err);
    return [];
  }
}

/**
 * Get subjects by category
 */
export async function getSubjectsByCategory(category: string): Promise<VCESubject[]> {
  try {
    const { data, error } = await supabase
      .from('vk_vce_subjects')
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
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error('getSubjectsByCategory error:', err);
    return [];
  }
}

/**
 * Get all unique categories
 */
export async function getSubjectCategories(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('vk_vce_subjects')
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
 * Search subjects by name or code
 */
export async function searchSubjects(query: string): Promise<VCESubject[]> {
  try {
    const searchTerm = `%${query.toLowerCase()}%`;
    
    const { data, error } = await supabase
      .from('vk_vce_subjects')
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
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error('searchSubjects error:', err);
    return [];
  }
}

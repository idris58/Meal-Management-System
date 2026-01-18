// client/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Database {
  public: {
    Tables: {
      members: {
        Row: {
          id: string;
          name: string;
          role: 'admin' | 'viewer';
          deposit: number;
          is_active: boolean;
          avatar: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          role: 'admin' | 'viewer';
          deposit?: number;
          is_active?: boolean;
          avatar?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          role?: 'admin' | 'viewer';
          deposit?: number;
          is_active?: boolean;
          avatar?: string | null;
        };
      };
      expenses: {
        Row: {
          id: string;
          amount: number;
          description: string;
          type: 'meal' | 'fixed';
          paid_by: string;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          amount: number;
          description: string;
          type: 'meal' | 'fixed';
          paid_by: string;
          date?: string;
        };
      };
      meal_logs: {
        Row: {
          id: string;
          member_id: string;
          date: string;
          count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          date: string;
          count: number;
        };
        Update: {
          count?: number;
        };
      };
      archives: {
        Row: {
          id: string;
          end_date: string;
          stats: any;
          members: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          end_date: string;
          stats: any;
          members: any;
        };
      };
    };
  };
}
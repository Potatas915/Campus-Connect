// Generated from the versioned migrations by npm run db:types. Do not edit.
export type Database = { public: { Tables: {
  attendance: {
    Row: {
      id: string;
      registration_id: string;
      event_id: string;
      checked_in_at: string;
      checked_in_by: string;
    };
    Insert: {
      id?: string;
      registration_id: string;
      event_id: string;
      checked_in_at?: string;
      checked_in_by: string;
    };
    Update: {
      id?: string;
      registration_id?: string;
      event_id?: string;
      checked_in_at?: string;
      checked_in_by?: string;
    };
    Relationships: [];
  };
  events: {
    Row: {
      id: string;
      organization_id: string;
      title: string;
      description: string;
      venue: string;
      category: string;
      start_at: string;
      end_at: string | null;
      registration_deadline: string | null;
      capacity: number;
      status: string;
      banner_url: string | null;
      theme: number;
      created_by: string;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      organization_id: string;
      title: string;
      description: string;
      venue: string;
      category: string;
      start_at: string;
      end_at?: string | null;
      registration_deadline?: string | null;
      capacity: number;
      status?: string;
      banner_url?: string | null;
      theme?: number;
      created_by: string;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      organization_id?: string;
      title?: string;
      description?: string;
      venue?: string;
      category?: string;
      start_at?: string;
      end_at?: string | null;
      registration_deadline?: string | null;
      capacity?: number;
      status?: string;
      banner_url?: string | null;
      theme?: number;
      created_by?: string;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  organizations: {
    Row: {
      id: string;
      name: string;
      short: string;
      description: string | null;
      logo_url: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      name: string;
      short: string;
      description?: string | null;
      logo_url?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      name?: string;
      short?: string;
      description?: string | null;
      logo_url?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  profiles: {
    Row: {
      id: string;
      full_name: string;
      student_id: string | null;
      email: string;
      program: string | null;
      year_level: number | null;
      organization_id: string | null;
      role: string;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id: string;
      full_name: string;
      student_id?: string | null;
      email: string;
      program?: string | null;
      year_level?: number | null;
      organization_id?: string | null;
      role?: string;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      full_name?: string;
      student_id?: string | null;
      email?: string;
      program?: string | null;
      year_level?: number | null;
      organization_id?: string | null;
      role?: string;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  registration_notifications: {
    Row: {
      registration_id: string;
      event_id: string;
      user_id: string;
      ticket_id: string | null;
      status: string;
      message: string | null;
      error_message: string | null;
      attempts: number;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      registration_id: string;
      event_id: string;
      user_id: string;
      ticket_id?: string | null;
      status?: string;
      message?: string | null;
      error_message?: string | null;
      attempts?: number;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      registration_id?: string;
      event_id?: string;
      user_id?: string;
      ticket_id?: string | null;
      status?: string;
      message?: string | null;
      error_message?: string | null;
      attempts?: number;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  registrations: {
    Row: {
      id: string;
      event_id: string;
      user_id: string;
      status: string;
      registered_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      event_id: string;
      user_id: string;
      status?: string;
      registered_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      event_id?: string;
      user_id?: string;
      status?: string;
      registered_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  tickets: {
    Row: {
      id: string;
      registration_id: string;
      event_id: string;
      payload: string;
      created_at: string;
    };
    Insert: {
      id?: string;
      registration_id: string;
      event_id: string;
      payload: string;
      created_at?: string;
    };
    Update: {
      id?: string;
      registration_id?: string;
      event_id?: string;
      payload?: string;
      created_at?: string;
    };
    Relationships: [];
  };
}; Views: Record<never, never>; Functions: {
  event_counts: { Args: Record<never, never>; Returns: { event_id: string; accepted_count: number }[] };
  scan_ticket: { Args: { selected_event: string; qr_payload: string }; Returns: string };
  publish_confirmation: { Args: { registration: string }; Returns: string };
}; Enums: Record<never, never>; CompositeTypes: Record<never, never>; } };

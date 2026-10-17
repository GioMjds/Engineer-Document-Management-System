export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_reviews: {
        Row: {
          comment: string | null
          created_at: string
          decision: string
          document_id: string
          id: string
          level: string
          reviewer_id: string
          revision_label: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          decision: string
          document_id: string
          id?: string
          level: string
          reviewer_id: string
          revision_label?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          decision?: string
          document_id?: string
          id?: string
          level?: string
          reviewer_id?: string
          revision_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_reviews_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          created_at: string
          description: string | null
          discipline: string | null
          doc_number: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          project_id: string | null
          revision: string
          status: Database["public"]["Enums"]["doc_status"]
          status_before_archive:
            | Database["public"]["Enums"]["doc_status"]
            | null
          title: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          description?: string | null
          discipline?: string | null
          doc_number: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          project_id?: string | null
          revision?: string
          status?: Database["public"]["Enums"]["doc_status"]
          status_before_archive?:
            | Database["public"]["Enums"]["doc_status"]
            | null
          title: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          description?: string | null
          discipline?: string | null
          doc_number?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          project_id?: string | null
          revision?: string
          status?: Database["public"]["Enums"]["doc_status"]
          status_before_archive?:
            | Database["public"]["Enums"]["doc_status"]
            | null
          title?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      master_authorities: {
        Row: {
          id: number
          jurisdiction: string | null
          name: string
        }
        Insert: {
          id?: never
          jurisdiction?: string | null
          name: string
        }
        Update: {
          id?: never
          jurisdiction?: string | null
          name?: string
        }
        Relationships: []
      }
      noc_matrix_items: {
        Row: {
          active: boolean
          blocking_sequence_no: number | null
          created_at: string
          default_fee: number
          description: string
          id: string
          master_authority_id: number
          reviewing_authority_id: number
          sequence_no: number
          stage: Database["public"]["Enums"]["noc_stage"]
          submitted_by: Database["public"]["Enums"]["noc_submitter"]
          updated_at: string
          validity_days: number
        }
        Insert: {
          active?: boolean
          blocking_sequence_no?: number | null
          created_at?: string
          default_fee?: number
          description: string
          id?: string
          master_authority_id: number
          reviewing_authority_id: number
          sequence_no: number
          stage: Database["public"]["Enums"]["noc_stage"]
          submitted_by?: Database["public"]["Enums"]["noc_submitter"]
          updated_at?: string
          validity_days?: number
        }
        Update: {
          active?: boolean
          blocking_sequence_no?: number | null
          created_at?: string
          default_fee?: number
          description?: string
          id?: string
          master_authority_id?: number
          reviewing_authority_id?: number
          sequence_no?: number
          stage?: Database["public"]["Enums"]["noc_stage"]
          submitted_by?: Database["public"]["Enums"]["noc_submitter"]
          updated_at?: string
          validity_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "noc_matrix_items_master_authority_id_fkey"
            columns: ["master_authority_id"]
            isOneToOne: false
            referencedRelation: "master_authorities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "noc_matrix_items_reviewing_authority_id_fkey"
            columns: ["reviewing_authority_id"]
            isOneToOne: false
            referencedRelation: "reviewing_authorities"
            referencedColumns: ["id"]
          },
        ]
      }
      noc_matrix_requirements: {
        Row: {
          created_at: string
          id: string
          mandatory: boolean
          matrix_item_id: string
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          mandatory?: boolean
          matrix_item_id: string
          sort_order?: number
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          mandatory?: boolean
          matrix_item_id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "noc_matrix_requirements_matrix_item_id_fkey"
            columns: ["matrix_item_id"]
            isOneToOne: false
            referencedRelation: "noc_matrix_items"
            referencedColumns: ["id"]
          },
        ]
      }
      noc_matrix_revisions: {
        Row: {
          action: string
          change_summary: string
          changed_by: string
          created_at: string
          id: string
          master_authority_id: number
          matrix_item_id: string | null
          new_data: Json | null
          previous_data: Json | null
          propagated_nocs_count: number
          propagated_projects_count: number
        }
        Insert: {
          action: string
          change_summary: string
          changed_by: string
          created_at?: string
          id?: string
          master_authority_id: number
          matrix_item_id?: string | null
          new_data?: Json | null
          previous_data?: Json | null
          propagated_nocs_count?: number
          propagated_projects_count?: number
        }
        Update: {
          action?: string
          change_summary?: string
          changed_by?: string
          created_at?: string
          id?: string
          master_authority_id?: number
          matrix_item_id?: string | null
          new_data?: Json | null
          previous_data?: Json | null
          propagated_nocs_count?: number
          propagated_projects_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "noc_matrix_revisions_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "noc_matrix_revisions_master_authority_id_fkey"
            columns: ["master_authority_id"]
            isOneToOne: false
            referencedRelation: "master_authorities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "noc_matrix_revisions_matrix_item_id_fkey"
            columns: ["matrix_item_id"]
            isOneToOne: false
            referencedRelation: "noc_matrix_items"
            referencedColumns: ["id"]
          },
        ]
      }
      noc_resubmission_history: {
        Row: {
          id: string
          project_noc_id: string
          rejection_date: string
          rejection_reason: string
          resubmission_date: string
          resubmitted_by: string
          revision: string
        }
        Insert: {
          id?: string
          project_noc_id: string
          rejection_date: string
          rejection_reason: string
          resubmission_date?: string
          resubmitted_by: string
          revision: string
        }
        Update: {
          id?: string
          project_noc_id?: string
          rejection_date?: string
          rejection_reason?: string
          resubmission_date?: string
          resubmitted_by?: string
          revision?: string
        }
        Relationships: [
          {
            foreignKeyName: "noc_resubmission_history_project_noc_id_fkey"
            columns: ["project_noc_id"]
            isOneToOne: false
            referencedRelation: "project_nocs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "noc_resubmission_history_project_noc_id_fkey"
            columns: ["project_noc_id"]
            isOneToOne: false
            referencedRelation: "v_project_nocs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "noc_resubmission_history_resubmitted_by_fkey"
            columns: ["resubmitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      noc_statuses: {
        Row: {
          code: string
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          label: string
          sort_order: number
        }
        Update: {
          code?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string | null
          full_name: string
          id: string
          office: Database["public"]["Enums"]["office_site"] | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          office?: Database["public"]["Enums"]["office_site"] | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          office?: Database["public"]["Enums"]["office_site"] | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      project_code_counters: {
        Row: {
          last_seq: number
          year: number
        }
        Insert: {
          last_seq?: number
          year: number
        }
        Update: {
          last_seq?: number
          year?: number
        }
        Relationships: []
      }
      project_confidential: {
        Row: {
          client_consultant_amount: number
          project_id: string
          updated_at: string
        }
        Insert: {
          client_consultant_amount?: number
          project_id: string
          updated_at?: string
        }
        Update: {
          client_consultant_amount?: number
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_confidential_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          assigned_at: string
          discipline: string | null
          project_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          discipline?: string | null
          project_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          discipline?: string | null
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_noc_requirements: {
        Row: {
          file_url: string | null
          id: string
          is_satisfied: boolean
          project_noc_id: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          file_url?: string | null
          id?: string
          is_satisfied?: boolean
          project_noc_id: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          file_url?: string | null
          id?: string
          is_satisfied?: boolean
          project_noc_id?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_noc_requirements_project_noc_id_fkey"
            columns: ["project_noc_id"]
            isOneToOne: false
            referencedRelation: "project_nocs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_noc_requirements_project_noc_id_fkey"
            columns: ["project_noc_id"]
            isOneToOne: false
            referencedRelation: "v_project_nocs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_noc_requirements_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_nocs: {
        Row: {
          apply_date: string | null
          blocking_sequence_no: number | null
          created_at: string
          current_revision: string
          description: string
          expiry_date: string | null
          file_url: string | null
          id: string
          is_paid: boolean
          matrix_item_id: string | null
          overridden_at: string | null
          overridden_by: string | null
          override_reason: string | null
          payer_type: string | null
          payment_fee: number
          plan_date: string | null
          project_id: string
          receipt_file_url: string | null
          receive_date: string | null
          reference_no: string | null
          remarks: string | null
          reviewing_authority_id: number
          sequence_no: number
          stage: Database["public"]["Enums"]["noc_stage"]
          status_code: string
          submitted_by: Database["public"]["Enums"]["noc_submitter"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          apply_date?: string | null
          blocking_sequence_no?: number | null
          created_at?: string
          current_revision?: string
          description: string
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          is_paid?: boolean
          matrix_item_id?: string | null
          overridden_at?: string | null
          overridden_by?: string | null
          override_reason?: string | null
          payer_type?: string | null
          payment_fee?: number
          plan_date?: string | null
          project_id: string
          receipt_file_url?: string | null
          receive_date?: string | null
          reference_no?: string | null
          remarks?: string | null
          reviewing_authority_id: number
          sequence_no?: number
          stage: Database["public"]["Enums"]["noc_stage"]
          status_code?: string
          submitted_by?: Database["public"]["Enums"]["noc_submitter"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          apply_date?: string | null
          blocking_sequence_no?: number | null
          created_at?: string
          current_revision?: string
          description?: string
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          is_paid?: boolean
          matrix_item_id?: string | null
          overridden_at?: string | null
          overridden_by?: string | null
          override_reason?: string | null
          payer_type?: string | null
          payment_fee?: number
          plan_date?: string | null
          project_id?: string
          receipt_file_url?: string | null
          receive_date?: string | null
          reference_no?: string | null
          remarks?: string | null
          reviewing_authority_id?: number
          sequence_no?: number
          stage?: Database["public"]["Enums"]["noc_stage"]
          status_code?: string
          submitted_by?: Database["public"]["Enums"]["noc_submitter"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_nocs_matrix_item_id_fkey"
            columns: ["matrix_item_id"]
            isOneToOne: false
            referencedRelation: "noc_matrix_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_nocs_overridden_by_fkey"
            columns: ["overridden_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_nocs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_nocs_reviewing_authority_id_fkey"
            columns: ["reviewing_authority_id"]
            isOneToOne: false
            referencedRelation: "reviewing_authorities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_nocs_status_code_fkey"
            columns: ["status_code"]
            isOneToOne: false
            referencedRelation: "noc_statuses"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "project_nocs_status_code_fkey"
            columns: ["status_code"]
            isOneToOne: false
            referencedRelation: "v_project_nocs"
            referencedColumns: ["effective_status"]
          },
          {
            foreignKeyName: "project_nocs_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          archived_at: string | null
          client_contractor_amount: number
          client_emails: string[] | null
          client_name: string | null
          code: string
          contractor_emails: string[] | null
          contractor_name: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          image_path: string | null
          master_authority_id: number
          stage: Database["public"]["Enums"]["project_stage"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          client_contractor_amount?: number
          client_emails?: string[] | null
          client_name?: string | null
          code: string
          contractor_emails?: string[] | null
          contractor_name?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          image_path?: string | null
          master_authority_id: number
          stage?: Database["public"]["Enums"]["project_stage"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          client_contractor_amount?: number
          client_emails?: string[] | null
          client_name?: string | null
          code?: string
          contractor_emails?: string[] | null
          contractor_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          image_path?: string | null
          master_authority_id?: number
          stage?: Database["public"]["Enums"]["project_stage"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_master_authority_id_fkey"
            columns: ["master_authority_id"]
            isOneToOne: false
            referencedRelation: "master_authorities"
            referencedColumns: ["id"]
          },
        ]
      }
      reviewing_authorities: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: never
          name: string
        }
        Update: {
          id?: never
          name?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          decision: Database["public"]["Enums"]["review_decision"]
          document_id: string
          id: string
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          decision: Database["public"]["Enums"]["review_decision"]
          document_id: string
          id?: string
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          decision?: Database["public"]["Enums"]["review_decision"]
          document_id?: string
          id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      mv_extension_status: {
        Row: {
          comment: string | null
          default_version: string | null
          default_version_schema: unknown
          installed_version: string | null
          name: unknown
          schema: unknown
        }
        Relationships: []
      }
      v_project_nocs: {
        Row: {
          apply_date: string | null
          created_at: string | null
          days_to_expiry: number | null
          description: string | null
          effective_label: string | null
          effective_status: string | null
          expiry_date: string | null
          file_url: string | null
          id: string | null
          matrix_item_id: string | null
          plan_date: string | null
          project_id: string | null
          receive_date: string | null
          reference_no: string | null
          remarks: string | null
          reviewing_authority_id: number | null
          sequence_no: number | null
          stage: Database["public"]["Enums"]["noc_stage"] | null
          status_code: string | null
          submitted_by: Database["public"]["Enums"]["noc_submitter"] | null
          updated_at: string | null
          updated_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_nocs_matrix_item_id_fkey"
            columns: ["matrix_item_id"]
            isOneToOne: false
            referencedRelation: "noc_matrix_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_nocs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_nocs_reviewing_authority_id_fkey"
            columns: ["reviewing_authority_id"]
            isOneToOne: false
            referencedRelation: "reviewing_authorities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_nocs_status_code_fkey"
            columns: ["status_code"]
            isOneToOne: false
            referencedRelation: "noc_statuses"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "project_nocs_status_code_fkey"
            columns: ["status_code"]
            isOneToOne: false
            referencedRelation: "v_project_nocs"
            referencedColumns: ["effective_status"]
          },
          {
            foreignKeyName: "project_nocs_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_matrix_item_atomic: {
        Args: {
          p_blocking_seq: number | null
          p_caller_id: string
          p_change_summary: string
          p_default_fee: number
          p_description: string
          p_master_authority_id: number
          p_requirements?: Json
          p_reviewing_authority_id: number
          p_stage: Database["public"]["Enums"]["noc_stage"]
          p_submitted_by: Database["public"]["Enums"]["noc_submitter"]
          p_validity_days: number
        }
        Returns: Json
      }
      example: { Args: never; Returns: undefined }
      next_project_code: { Args: never; Returns: string }
      propagate_matrix_item_change: {
        Args: {
          p_blocking_seq: number | null
          p_caller_id: string
          p_change_summary: string
          p_default_fee: number
          p_description: string
          p_matrix_item_id: string
          p_reviewing_authority_id: number
          p_stage: Database["public"]["Enums"]["noc_stage"]
          p_submitted_by: Database["public"]["Enums"]["noc_submitter"]
          p_validity_days: number
        }
        Returns: Json
      }
      save_matrix_item_atomic: {
        Args: {
          p_blocking_seq: number | null
          p_caller_id: string
          p_change_summary: string
          p_default_fee: number
          p_description: string
          p_matrix_item_id: string
          p_requirements?: Json
          p_reviewing_authority_id: number
          p_stage: Database["public"]["Enums"]["noc_stage"]
          p_submitted_by: Database["public"]["Enums"]["noc_submitter"]
          p_validity_days: number
        }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "dc"
        | "authority_engineer"
        | "engineer"
        | "resident_engineer"
        | "area_manager"
        | "ceo"
      doc_status:
        | "draft"
        | "submitted"
        | "approved"
        | "rejected"
        | "archived"
        | "escalated"
        | "ready_for_authority"
      noc_stage: "design" | "information" | "construction" | "handover"
      noc_submitter: "consultant" | "client" | "contractor" | "specialist"
      office_site: "head_office" | "site_office"
      project_stage:
        | "planning"
        | "design"
        | "construction"
        | "handover"
        | "completed"
      review_decision: "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "dc",
        "authority_engineer",
        "engineer",
        "resident_engineer",
        "area_manager",
        "ceo",
      ],
      doc_status: [
        "draft",
        "submitted",
        "approved",
        "rejected",
        "archived",
        "escalated",
        "ready_for_authority",
      ],
      noc_stage: ["design", "information", "construction", "handover"],
      noc_submitter: ["consultant", "client", "contractor", "specialist"],
      office_site: ["head_office", "site_office"],
      project_stage: [
        "planning",
        "design",
        "construction",
        "handover",
        "completed",
      ],
      review_decision: ["approved", "rejected"],
    },
  },
} as const

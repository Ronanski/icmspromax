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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      breakin_orders: {
        Row: {
          action_taken: string | null
          as_found: string | null
          as_left: string | null
          associated_wo: string | null
          completion_time: string | null
          created_date: string
          deferred_reason: string | null
          description: string | null
          equipment_tag: string | null
          ex_breakin: boolean | null
          id: string
          job_type: string | null
          maintenance_type: string | null
          materials: Json | null
          owner_id: string
          planned_finish: string | null
          planned_start: string | null
          pr_number: string | null
          priority: string | null
          ptw_number: string | null
          shutdown_item: boolean | null
          start_time: string | null
          status: string | null
          system: string | null
          technician: string | null
          unit: string | null
          updated_date: string
          wo_number: string | null
          workspace_id: string
        }
        Insert: {
          action_taken?: string | null
          as_found?: string | null
          as_left?: string | null
          associated_wo?: string | null
          completion_time?: string | null
          created_date?: string
          deferred_reason?: string | null
          description?: string | null
          equipment_tag?: string | null
          ex_breakin?: boolean | null
          id?: string
          job_type?: string | null
          maintenance_type?: string | null
          materials?: Json | null
          owner_id: string
          planned_finish?: string | null
          planned_start?: string | null
          pr_number?: string | null
          priority?: string | null
          ptw_number?: string | null
          shutdown_item?: boolean | null
          start_time?: string | null
          status?: string | null
          system?: string | null
          technician?: string | null
          unit?: string | null
          updated_date?: string
          wo_number?: string | null
          workspace_id: string
        }
        Update: {
          action_taken?: string | null
          as_found?: string | null
          as_left?: string | null
          associated_wo?: string | null
          completion_time?: string | null
          created_date?: string
          deferred_reason?: string | null
          description?: string | null
          equipment_tag?: string | null
          ex_breakin?: boolean | null
          id?: string
          job_type?: string | null
          maintenance_type?: string | null
          materials?: Json | null
          owner_id?: string
          planned_finish?: string | null
          planned_start?: string | null
          pr_number?: string | null
          priority?: string | null
          ptw_number?: string | null
          shutdown_item?: boolean | null
          start_time?: string | null
          status?: string | null
          system?: string | null
          technician?: string | null
          unit?: string | null
          updated_date?: string
          wo_number?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "breakin_orders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      cm_orders: {
        Row: {
          action_taken: string | null
          as_found: string | null
          as_left: string | null
          associated_wo: string | null
          completion_time: string | null
          created_date: string
          deferred_reason: string | null
          description: string | null
          equipment_tag: string | null
          id: string
          job_type: string | null
          maintenance_type: string | null
          materials: Json | null
          owner_id: string
          planned_finish: string | null
          planned_start: string | null
          pr_number: string | null
          priority: string | null
          ptw_number: string | null
          shutdown_item: boolean | null
          start_time: string | null
          status: string | null
          system: string | null
          technician: string | null
          unit: string | null
          updated_date: string
          wo_number: string | null
          workspace_id: string
        }
        Insert: {
          action_taken?: string | null
          as_found?: string | null
          as_left?: string | null
          associated_wo?: string | null
          completion_time?: string | null
          created_date?: string
          deferred_reason?: string | null
          description?: string | null
          equipment_tag?: string | null
          id?: string
          job_type?: string | null
          maintenance_type?: string | null
          materials?: Json | null
          owner_id: string
          planned_finish?: string | null
          planned_start?: string | null
          pr_number?: string | null
          priority?: string | null
          ptw_number?: string | null
          shutdown_item?: boolean | null
          start_time?: string | null
          status?: string | null
          system?: string | null
          technician?: string | null
          unit?: string | null
          updated_date?: string
          wo_number?: string | null
          workspace_id: string
        }
        Update: {
          action_taken?: string | null
          as_found?: string | null
          as_left?: string | null
          associated_wo?: string | null
          completion_time?: string | null
          created_date?: string
          deferred_reason?: string | null
          description?: string | null
          equipment_tag?: string | null
          id?: string
          job_type?: string | null
          maintenance_type?: string | null
          materials?: Json | null
          owner_id?: string
          planned_finish?: string | null
          planned_start?: string | null
          pr_number?: string | null
          priority?: string | null
          ptw_number?: string | null
          shutdown_item?: boolean | null
          start_time?: string | null
          status?: string | null
          system?: string | null
          technician?: string | null
          unit?: string | null
          updated_date?: string
          wo_number?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cm_orders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      item_master: {
        Row: {
          bin_location: string | null
          category: string | null
          code: string
          created_date: string
          description: string | null
          id: string
          owner_id: string
          stock: number | null
          unit: string | null
          updated_date: string
          workspace_id: string
        }
        Insert: {
          bin_location?: string | null
          category?: string | null
          code: string
          created_date?: string
          description?: string | null
          id?: string
          owner_id: string
          stock?: number | null
          unit?: string | null
          updated_date?: string
          workspace_id: string
        }
        Update: {
          bin_location?: string | null
          category?: string | null
          code?: string
          created_date?: string
          description?: string | null
          id?: string
          owner_id?: string
          stock?: number | null
          unit?: string | null
          updated_date?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_master_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          category: string
          created_at: string
          detail: string
          event_at: string
          id: string
          is_read: boolean
          owner_id: string
          read_at: string | null
          source_key: string
          title: string
          type: string
        }
        Insert: {
          category?: string
          created_at?: string
          detail?: string
          event_at?: string
          id?: string
          is_read?: boolean
          owner_id: string
          read_at?: string | null
          source_key: string
          title?: string
          type?: string
        }
        Update: {
          category?: string
          created_at?: string
          detail?: string
          event_at?: string
          id?: string
          is_read?: boolean
          owner_id?: string
          read_at?: string | null
          source_key?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      pm_orders: {
        Row: {
          associated_wo: string | null
          completion_time: string | null
          created_date: string
          deferred_reason: string | null
          description: string | null
          equipment_tag: string | null
          id: string
          job_type: string | null
          maintenance_type: string | null
          materials: Json | null
          owner_id: string
          planned_finish: string | null
          planned_start: string | null
          pm_frequency: string | null
          pr_number: string | null
          priority: string | null
          ptw_number: string | null
          shutdown_item: boolean | null
          start_time: string | null
          status: string | null
          system: string | null
          technician: string | null
          unit: string | null
          updated_date: string
          wo_number: string | null
          workspace_id: string
        }
        Insert: {
          associated_wo?: string | null
          completion_time?: string | null
          created_date?: string
          deferred_reason?: string | null
          description?: string | null
          equipment_tag?: string | null
          id?: string
          job_type?: string | null
          maintenance_type?: string | null
          materials?: Json | null
          owner_id: string
          planned_finish?: string | null
          planned_start?: string | null
          pm_frequency?: string | null
          pr_number?: string | null
          priority?: string | null
          ptw_number?: string | null
          shutdown_item?: boolean | null
          start_time?: string | null
          status?: string | null
          system?: string | null
          technician?: string | null
          unit?: string | null
          updated_date?: string
          wo_number?: string | null
          workspace_id: string
        }
        Update: {
          associated_wo?: string | null
          completion_time?: string | null
          created_date?: string
          deferred_reason?: string | null
          description?: string | null
          equipment_tag?: string | null
          id?: string
          job_type?: string | null
          maintenance_type?: string | null
          materials?: Json | null
          owner_id?: string
          planned_finish?: string | null
          planned_start?: string | null
          pm_frequency?: string | null
          pr_number?: string | null
          priority?: string | null
          ptw_number?: string | null
          shutdown_item?: boolean | null
          start_time?: string | null
          status?: string | null
          system?: string | null
          technician?: string | null
          unit?: string | null
          updated_date?: string
          wo_number?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_orders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisor_daily_logs: {
        Row: {
          activity_description: string
          created_date: string
          id: string
          log_date: string
          owner_id: string
          updated_date: string
          workspace_id: string
        }
        Insert: {
          activity_description: string
          created_date?: string
          id?: string
          log_date: string
          owner_id: string
          updated_date?: string
          workspace_id: string
        }
        Update: {
          activity_description?: string
          created_date?: string
          id?: string
          log_date?: string
          owner_id?: string
          updated_date?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_daily_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisor_todos: {
        Row: {
          completed: boolean | null
          created_date: string
          id: string
          owner_id: string
          sort_order: number | null
          text: string
          updated_date: string
          workspace_id: string
        }
        Insert: {
          completed?: boolean | null
          created_date?: string
          id?: string
          owner_id: string
          sort_order?: number | null
          text: string
          updated_date?: string
          workspace_id: string
        }
        Update: {
          completed?: boolean | null
          created_date?: string
          id?: string
          owner_id?: string
          sort_order?: number | null
          text?: string
          updated_date?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_todos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      system_registry: {
        Row: {
          area: string | null
          created_date: string
          id: string
          owner_id: string
          system_name: string
          unit: string
          updated_date: string
          workspace_id: string
        }
        Insert: {
          area?: string | null
          created_date?: string
          id?: string
          owner_id: string
          system_name: string
          unit: string
          updated_date?: string
          workspace_id: string
        }
        Update: {
          area?: string | null
          created_date?: string
          id?: string
          owner_id?: string
          system_name?: string
          unit?: string
          updated_date?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_registry_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          designation: string | null
          id: string
          member_emails: string[] | null
          name: string
          owner_id: string
          plant: string | null
          plant_role: string | null
          shift: string | null
          updated_date: string
        }
        Insert: {
          created_at?: string
          designation?: string | null
          id?: string
          member_emails?: string[] | null
          name?: string
          owner_id: string
          plant?: string | null
          plant_role?: string | null
          shift?: string | null
          updated_date?: string
        }
        Update: {
          created_at?: string
          designation?: string | null
          id?: string
          member_emails?: string[] | null
          name?: string
          owner_id?: string
          plant?: string | null
          plant_role?: string | null
          shift?: string | null
          updated_date?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      birthdays: {
        Row: {
          birth_date: string;
          created_at: string;
          google_contact_id: string | null;
          google_contact_snapshot: string | null;
          google_event_id: string | null;
          id: string;
          name: string;
          notes: string | null;
          relationship: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          birth_date: string;
          created_at?: string;
          google_contact_id?: string | null;
          google_contact_snapshot?: string | null;
          google_event_id?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          relationship?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          birth_date?: string;
          created_at?: string;
          google_contact_id?: string | null;
          google_contact_snapshot?: string | null;
          google_event_id?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          relationship?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      google_calendar_connections: {
        Row: {
          connected_at: string;
          deletions_checked_at: string;
          last_pulled_at: string;
          last_synced_at: string | null;
          status: string;
          sync_running_until: string;
          user_id: string;
        };
        Insert: {
          connected_at?: string;
          deletions_checked_at?: string;
          last_pulled_at?: string;
          last_synced_at?: string | null;
          status: string;
          sync_running_until?: string;
          user_id: string;
        };
        Update: {
          connected_at?: string;
          deletions_checked_at?: string;
          last_pulled_at?: string;
          last_synced_at?: string | null;
          status?: string;
          sync_running_until?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      notification_deliveries: {
        Row: {
          local_date: string;
          user_id: string;
        };
        Insert: {
          local_date: string;
          user_id: string;
        };
        Update: {
          local_date?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      notification_settings: {
        Row: {
          hour: number;
          remind_day_before: boolean;
          remind_on_day: boolean;
          time_zone: string;
          user_id: string;
        };
        Insert: {
          hour?: number;
          remind_day_before?: boolean;
          remind_on_day?: boolean;
          time_zone: string;
          user_id?: string;
        };
        Update: {
          hour?: number;
          remind_day_before?: boolean;
          remind_on_day?: boolean;
          time_zone?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          id: string;
          p256dh: string;
          user_id: string;
        };
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          p256dh: string;
          user_id?: string;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          p256dh?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      claim_due_birthday_notifications: {
        Args: { batch_size?: number };
        Returns: {
          local_date: string;
          remind_day_before: boolean;
          remind_on_day: boolean;
          user_id: string;
        }[];
      };
      delete_google_calendar_refresh_token: {
        Args: { target_user_id: string };
        Returns: undefined;
      };
      due_birthday_notifications: {
        Args: never;
        Returns: {
          local_date: string;
          user_id: string;
        }[];
      };
      get_google_calendar_refresh_token: {
        Args: { target_user_id: string };
        Returns: string;
      };
      get_notification_birthdays: {
        Args: { local_date: string; target_user_id: string };
        Returns: {
          birth_date: string;
          name: string;
        }[];
      };
      is_valid_time_zone: {
        Args: { time_zone: string };
        Returns: boolean;
      };
      request_birthday_notifications: {
        Args: never;
        Returns: undefined;
      };
      set_google_calendar_refresh_token: {
        Args: { refresh_token: string; target_user_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views']) | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;

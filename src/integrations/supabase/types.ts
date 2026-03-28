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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          assistant: string
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          assistant: string
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          assistant?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      checklist_checks: {
        Row: {
          colaborador: string
          concluido: boolean
          concluido_em: string | null
          data: string
          grupo: string | null
          id: string
          periodo: string | null
          tarefa_id: string
          tarefa_tipo: string | null
          tarefa_titulo: string
        }
        Insert: {
          colaborador: string
          concluido?: boolean
          concluido_em?: string | null
          data?: string
          grupo?: string | null
          id?: string
          periodo?: string | null
          tarefa_id: string
          tarefa_tipo?: string | null
          tarefa_titulo: string
        }
        Update: {
          colaborador?: string
          concluido?: boolean
          concluido_em?: string | null
          data?: string
          grupo?: string | null
          id?: string
          periodo?: string | null
          tarefa_id?: string
          tarefa_tipo?: string | null
          tarefa_titulo?: string
        }
        Relationships: []
      }
      checklist_projetos: {
        Row: {
          cliente_id: string
          concluida: boolean | null
          created_at: string
          data_conclusao: string | null
          etapa: number
          id: string
          nome_etapa: string
          notas: string | null
          responsavel: string | null
          updated_at: string
        }
        Insert: {
          cliente_id: string
          concluida?: boolean | null
          created_at?: string
          data_conclusao?: string | null
          etapa: number
          id?: string
          nome_etapa: string
          notas?: string | null
          responsavel?: string | null
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          concluida?: boolean | null
          created_at?: string
          data_conclusao?: string | null
          etapa?: number
          id?: string
          nome_etapa?: string
          notas?: string | null
          responsavel?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      clientes_ativos: {
        Row: {
          contato: string | null
          created_at: string
          data_inicio: string | null
          data_previsao: string | null
          email: string | null
          empresa: string
          id: string
          inclui_modelagem: boolean | null
          notas: string | null
          progresso: number | null
          projeto: string
          qtd_imagens: number | null
          segundos_animacao: number | null
          status: string
          telefone: string | null
          updated_at: string
          valor_total: number | null
        }
        Insert: {
          contato?: string | null
          created_at?: string
          data_inicio?: string | null
          data_previsao?: string | null
          email?: string | null
          empresa: string
          id?: string
          inclui_modelagem?: boolean | null
          notas?: string | null
          progresso?: number | null
          projeto: string
          qtd_imagens?: number | null
          segundos_animacao?: number | null
          status?: string
          telefone?: string | null
          updated_at?: string
          valor_total?: number | null
        }
        Update: {
          contato?: string | null
          created_at?: string
          data_inicio?: string | null
          data_previsao?: string | null
          email?: string | null
          empresa?: string
          id?: string
          inclui_modelagem?: boolean | null
          notas?: string | null
          progresso?: number | null
          projeto?: string
          qtd_imagens?: number | null
          segundos_animacao?: number | null
          status?: string
          telefone?: string | null
          updated_at?: string
          valor_total?: number | null
        }
        Relationships: []
      }
      comissoes: {
        Row: {
          comissao_contratos: number | null
          contratos_indicados: number | null
          created_at: string
          id: string
          leads_gerados: number | null
          mes_referencia: string
          reunioes_realizadas: number | null
          salario_fixo: number | null
          total_comissao: number | null
          valor_contratos: number | null
          valor_leads: number | null
          valor_reunioes: number | null
          vendedor_id: string
          vendedor_nome: string | null
        }
        Insert: {
          comissao_contratos?: number | null
          contratos_indicados?: number | null
          created_at?: string
          id?: string
          leads_gerados?: number | null
          mes_referencia: string
          reunioes_realizadas?: number | null
          salario_fixo?: number | null
          total_comissao?: number | null
          valor_contratos?: number | null
          valor_leads?: number | null
          valor_reunioes?: number | null
          vendedor_id: string
          vendedor_nome?: string | null
        }
        Update: {
          comissao_contratos?: number | null
          contratos_indicados?: number | null
          created_at?: string
          id?: string
          leads_gerados?: number | null
          mes_referencia?: string
          reunioes_realizadas?: number | null
          salario_fixo?: number | null
          total_comissao?: number | null
          valor_contratos?: number | null
          valor_leads?: number | null
          valor_reunioes?: number | null
          vendedor_id?: string
          vendedor_nome?: string | null
        }
        Relationships: []
      }
      financeiro_clientes: {
        Row: {
          cliente_id: string
          created_at: string
          data_pagamento: string | null
          data_vencimento: string | null
          descricao: string
          forma_pagamento: string | null
          id: string
          notas: string | null
          status: Database["public"]["Enums"]["payment_status"]
          valor: number
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao: string
          forma_pagamento?: string | null
          id?: string
          notas?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          valor?: number
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao?: string
          forma_pagamento?: string | null
          id?: string
          notas?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          valor?: number
        }
        Relationships: []
      }
      financeiro_empresa: {
        Row: {
          categoria: string
          created_at: string
          data: string
          descricao: string
          id: string
          notas: string | null
          recorrente: boolean | null
          subcategoria: string | null
          tipo: string
          valor: number
        }
        Insert: {
          categoria: string
          created_at?: string
          data?: string
          descricao: string
          id?: string
          notas?: string | null
          recorrente?: boolean | null
          subcategoria?: string | null
          tipo: string
          valor?: number
        }
        Update: {
          categoria?: string
          created_at?: string
          data?: string
          descricao?: string
          id?: string
          notas?: string | null
          recorrente?: boolean | null
          subcategoria?: string | null
          tipo?: string
          valor?: number
        }
        Relationships: []
      }
      leads: {
        Row: {
          cargo: string | null
          cidade: string | null
          contato: string | null
          created_by: string | null
          data_atualizacao: string
          data_criacao: string
          data_fechamento: string | null
          email: string | null
          empresa: string
          estado: string | null
          id: string
          motivo_perda: string | null
          notas: string | null
          origem: string | null
          responsavel_id: string | null
          responsavel_nome: string | null
          status: Database["public"]["Enums"]["lead_status"]
          telefone: string | null
          valor_estimado: number | null
        }
        Insert: {
          cargo?: string | null
          cidade?: string | null
          contato?: string | null
          created_by?: string | null
          data_atualizacao?: string
          data_criacao?: string
          data_fechamento?: string | null
          email?: string | null
          empresa: string
          estado?: string | null
          id?: string
          motivo_perda?: string | null
          notas?: string | null
          origem?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          telefone?: string | null
          valor_estimado?: number | null
        }
        Update: {
          cargo?: string | null
          cidade?: string | null
          contato?: string | null
          created_by?: string | null
          data_atualizacao?: string
          data_criacao?: string
          data_fechamento?: string | null
          email?: string | null
          empresa?: string
          estado?: string | null
          id?: string
          motivo_perda?: string | null
          notas?: string | null
          origem?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          telefone?: string | null
          valor_estimado?: number | null
        }
        Relationships: []
      }
      metas: {
        Row: {
          ano: number
          created_at: string
          id: string
          mes: string | null
          meta_contratos: number | null
          meta_leads: number | null
          meta_receita: number | null
          meta_reunioes: number | null
          periodo: string
          realizado_contratos: number | null
          realizado_leads: number | null
          realizado_receita: number | null
          realizado_reunioes: number | null
          trimestre: string | null
          updated_at: string
        }
        Insert: {
          ano?: number
          created_at?: string
          id?: string
          mes?: string | null
          meta_contratos?: number | null
          meta_leads?: number | null
          meta_receita?: number | null
          meta_reunioes?: number | null
          periodo: string
          realizado_contratos?: number | null
          realizado_leads?: number | null
          realizado_receita?: number | null
          realizado_reunioes?: number | null
          trimestre?: string | null
          updated_at?: string
        }
        Update: {
          ano?: number
          created_at?: string
          id?: string
          mes?: string | null
          meta_contratos?: number | null
          meta_leads?: number | null
          meta_receita?: number | null
          meta_reunioes?: number | null
          periodo?: string
          realizado_contratos?: number | null
          realizado_leads?: number | null
          realizado_receita?: number | null
          realizado_reunioes?: number | null
          trimestre?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      metas_distribuidas: {
        Row: {
          criado_em: string
          data: string
          demos_dia: number
          id: string
          leads_contatados_dia: number
          leads_milena_dia: number
          mes_ano: string
        }
        Insert: {
          criado_em?: string
          data: string
          demos_dia?: number
          id?: string
          leads_contatados_dia?: number
          leads_milena_dia?: number
          mes_ano: string
        }
        Update: {
          criado_em?: string
          data?: string
          demos_dia?: number
          id?: string
          leads_contatados_dia?: number
          leads_milena_dia?: number
          mes_ano?: string
        }
        Relationships: []
      }
      metas_mensais: {
        Row: {
          contratos: number
          criado_em: string
          demos_aline: number
          id: string
          leads_contatados_aline: number
          leads_milena: number
          mes_ano: string
          minimo_viavel: number
          receita_esperada: number
        }
        Insert: {
          contratos?: number
          criado_em?: string
          demos_aline?: number
          id?: string
          leads_contatados_aline?: number
          leads_milena?: number
          mes_ano: string
          minimo_viavel?: number
          receita_esperada?: number
        }
        Update: {
          contratos?: number
          criado_em?: string
          demos_aline?: number
          id?: string
          leads_contatados_aline?: number
          leads_milena?: number
          mes_ano?: string
          minimo_viavel?: number
          receita_esperada?: number
        }
        Relationships: []
      }
      planejamento_mensal: {
        Row: {
          aprovado: boolean
          aprovado_em: string | null
          ciclo_dia: number
          criado_em: string
          data: string
          dia_semana: string
          editado: boolean
          grupo: string | null
          id: string
          mes_ano: string
          responsavel: string
          tarefas_json: Json
        }
        Insert: {
          aprovado?: boolean
          aprovado_em?: string | null
          ciclo_dia?: number
          criado_em?: string
          data: string
          dia_semana: string
          editado?: boolean
          grupo?: string | null
          id?: string
          mes_ano: string
          responsavel: string
          tarefas_json?: Json
        }
        Update: {
          aprovado?: boolean
          aprovado_em?: string | null
          ciclo_dia?: number
          criado_em?: string
          data?: string
          dia_semana?: string
          editado?: boolean
          grupo?: string | null
          id?: string
          mes_ano?: string
          responsavel?: string
          tarefas_json?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          founder_pin: string | null
          full_name: string
          id: string
          updated_at: string
          vendedor_sub_role:
            | Database["public"]["Enums"]["vendedor_sub_role"]
            | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          founder_pin?: string | null
          full_name?: string
          id: string
          updated_at?: string
          vendedor_sub_role?:
            | Database["public"]["Enums"]["vendedor_sub_role"]
            | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          founder_pin?: string | null
          full_name?: string
          id?: string
          updated_at?: string
          vendedor_sub_role?:
            | Database["public"]["Enums"]["vendedor_sub_role"]
            | null
        }
        Relationships: []
      }
      relatorios_meta: {
        Row: {
          conteudo: string
          data_geracao: string
          id: string
          mes_ano: string
          tipo: string
        }
        Insert: {
          conteudo: string
          data_geracao?: string
          id?: string
          mes_ano: string
          tipo?: string
        }
        Update: {
          conteudo?: string
          data_geracao?: string
          id?: string
          mes_ano?: string
          tipo?: string
        }
        Relationships: []
      }
      reunioes_realizadas: {
        Row: {
          created_at: string
          data_reuniao: string
          duracao_minutos: number | null
          gerou_proposta: boolean | null
          id: string
          lead_id: string | null
          notas: string | null
          resultado: string | null
          valor_proposta: number | null
          vendedor_id: string | null
          vendedor_nome: string | null
        }
        Insert: {
          created_at?: string
          data_reuniao?: string
          duracao_minutos?: number | null
          gerou_proposta?: boolean | null
          id?: string
          lead_id?: string | null
          notas?: string | null
          resultado?: string | null
          valor_proposta?: number | null
          vendedor_id?: string | null
          vendedor_nome?: string | null
        }
        Update: {
          created_at?: string
          data_reuniao?: string
          duracao_minutos?: number | null
          gerou_proposta?: boolean | null
          id?: string
          lead_id?: string | null
          notas?: string | null
          resultado?: string | null
          valor_proposta?: number | null
          vendedor_id?: string | null
          vendedor_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reunioes_realizadas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      scripts: {
        Row: {
          categoria: string
          conteudo: string
          created_at: string
          favorito: boolean | null
          id: string
          ordem: number | null
          titulo: string
        }
        Insert: {
          categoria: string
          conteudo: string
          created_at?: string
          favorito?: boolean | null
          id?: string
          ordem?: number | null
          titulo: string
        }
        Update: {
          categoria?: string
          conteudo?: string
          created_at?: string
          favorito?: boolean | null
          id?: string
          ordem?: number | null
          titulo?: string
        }
        Relationships: []
      }
      strategic_decisions: {
        Row: {
          arquivado: boolean | null
          created_at: string
          data: string
          descricao: string
          id: string
          resultado_esperado: string | null
          tags: string[] | null
          tipo: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          arquivado?: boolean | null
          created_at?: string
          data?: string
          descricao: string
          id?: string
          resultado_esperado?: string | null
          tags?: string[] | null
          tipo: string
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          arquivado?: boolean | null
          created_at?: string
          data?: string
          descricao?: string
          id?: string
          resultado_esperado?: string | null
          tags?: string[] | null
          tipo?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "fundador" | "vendedor"
      lead_status:
        | "lead"
        | "contatado"
        | "reuniao_agendada"
        | "reuniao_realizada"
        | "proposta"
        | "fechado"
        | "perdido"
      payment_status: "pendente" | "pago" | "atrasado" | "cancelado"
      vendedor_sub_role: "sdr" | "ldr"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["fundador", "vendedor"],
      lead_status: [
        "lead",
        "contatado",
        "reuniao_agendada",
        "reuniao_realizada",
        "proposta",
        "fechado",
        "perdido",
      ],
      payment_status: ["pendente", "pago", "atrasado", "cancelado"],
      vendedor_sub_role: ["sdr", "ldr"],
    },
  },
} as const

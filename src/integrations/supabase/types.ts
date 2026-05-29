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
      ai_assistant_actions: {
        Row: {
          affected_count: number | null
          assistant: string
          created_at: string
          error_message: string | null
          id: string
          input: Json | null
          output: Json | null
          success: boolean
          tool_name: string
          user_id: string
        }
        Insert: {
          affected_count?: number | null
          assistant: string
          created_at?: string
          error_message?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          success?: boolean
          tool_name: string
          user_id: string
        }
        Update: {
          affected_count?: number | null
          assistant?: string
          created_at?: string
          error_message?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          success?: boolean
          tool_name?: string
          user_id?: string
        }
        Relationships: []
      }
      balanco: {
        Row: {
          aluguel_pagar: number | null
          atualizado_em: string
          banco: number | null
          caixa: number | null
          capital_social: number | null
          criado_em: string
          depreciacao: number | null
          duplicatas_receber: number | null
          emprestimos_cp: number | null
          emprestimos_lp: number | null
          equipamentos: number | null
          estoques: number | null
          financiamentos_lp: number | null
          fornecedores_pagar: number | null
          id: string
          imobilizado: number | null
          impostos_recolher: number | null
          instalacoes: number | null
          mes: string
          outros_circulante: number | null
          resultado_acumulado: number | null
          salarios_pagar: number | null
          titulos_receber_lp: number | null
        }
        Insert: {
          aluguel_pagar?: number | null
          atualizado_em?: string
          banco?: number | null
          caixa?: number | null
          capital_social?: number | null
          criado_em?: string
          depreciacao?: number | null
          duplicatas_receber?: number | null
          emprestimos_cp?: number | null
          emprestimos_lp?: number | null
          equipamentos?: number | null
          estoques?: number | null
          financiamentos_lp?: number | null
          fornecedores_pagar?: number | null
          id?: string
          imobilizado?: number | null
          impostos_recolher?: number | null
          instalacoes?: number | null
          mes: string
          outros_circulante?: number | null
          resultado_acumulado?: number | null
          salarios_pagar?: number | null
          titulos_receber_lp?: number | null
        }
        Update: {
          aluguel_pagar?: number | null
          atualizado_em?: string
          banco?: number | null
          caixa?: number | null
          capital_social?: number | null
          criado_em?: string
          depreciacao?: number | null
          duplicatas_receber?: number | null
          emprestimos_cp?: number | null
          emprestimos_lp?: number | null
          equipamentos?: number | null
          estoques?: number | null
          financiamentos_lp?: number | null
          fornecedores_pagar?: number | null
          id?: string
          imobilizado?: number | null
          impostos_recolher?: number | null
          instalacoes?: number | null
          mes?: string
          outros_circulante?: number | null
          resultado_acumulado?: number | null
          salarios_pagar?: number | null
          titulos_receber_lp?: number | null
        }
        Relationships: []
      }
      cadence_templates: {
        Row: {
          channel: Database["public"]["Enums"]["cadence_channel"]
          day_in_flow: number
          id: string
          period: Database["public"]["Enums"]["cadence_period"]
          playbook_type: Database["public"]["Enums"]["campaign_playbook"]
          task_template: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["cadence_channel"]
          day_in_flow: number
          id?: string
          period: Database["public"]["Enums"]["cadence_period"]
          playbook_type: Database["public"]["Enums"]["campaign_playbook"]
          task_template: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["cadence_channel"]
          day_in_flow?: number
          id?: string
          period?: Database["public"]["Enums"]["cadence_period"]
          playbook_type?: Database["public"]["Enums"]["campaign_playbook"]
          task_template?: string
        }
        Relationships: []
      }
      campaign_leads: {
        Row: {
          campaign_id: string
          current_day_in_flow: number
          entered_flow_at: string
          group_label: string | null
          id: string
          last_synced_at: string | null
          lead_company: string | null
          lead_name: string | null
          notes: string | null
          pipedrive_deal_id: number | null
          status: Database["public"]["Enums"]["campaign_lead_status"]
        }
        Insert: {
          campaign_id: string
          current_day_in_flow?: number
          entered_flow_at?: string
          group_label?: string | null
          id?: string
          last_synced_at?: string | null
          lead_company?: string | null
          lead_name?: string | null
          notes?: string | null
          pipedrive_deal_id?: number | null
          status?: Database["public"]["Enums"]["campaign_lead_status"]
        }
        Update: {
          campaign_id?: string
          current_day_in_flow?: number
          entered_flow_at?: string
          group_label?: string | null
          id?: string
          last_synced_at?: string | null
          lead_company?: string | null
          lead_name?: string | null
          notes?: string | null
          pipedrive_deal_id?: number | null
          status?: Database["public"]["Enums"]["campaign_lead_status"]
        }
        Relationships: [
          {
            foreignKeyName: "campaign_leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          custom_templates: Json | null
          description: string | null
          end_date: string | null
          id: string
          kpis: Json | null
          monthly_strategy_id: string | null
          name: string
          owner_user_id: number | null
          playbook_type: Database["public"]["Enums"]["campaign_playbook"]
          start_date: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          target_description: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_templates?: Json | null
          description?: string | null
          end_date?: string | null
          id?: string
          kpis?: Json | null
          monthly_strategy_id?: string | null
          name: string
          owner_user_id?: number | null
          playbook_type?: Database["public"]["Enums"]["campaign_playbook"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          target_description?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_templates?: Json | null
          description?: string | null
          end_date?: string | null
          id?: string
          kpis?: Json | null
          monthly_strategy_id?: string | null
          name?: string
          owner_user_id?: number | null
          playbook_type?: Database["public"]["Enums"]["campaign_playbook"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          target_description?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_monthly_strategy_id_fkey"
            columns: ["monthly_strategy_id"]
            isOneToOne: false
            referencedRelation: "monthly_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          assistant: string
          content: string
          created_at: string
          id: string
          parts: Json | null
          role: string
          user_id: string
        }
        Insert: {
          assistant: string
          content: string
          created_at?: string
          id?: string
          parts?: Json | null
          role: string
          user_id: string
        }
        Update: {
          assistant?: string
          content?: string
          created_at?: string
          id?: string
          parts?: Json | null
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
          apelidos: string[]
          concluido_em: string | null
          contato: string | null
          created_at: string
          data_inicio: string | null
          data_previsao: string | null
          email: string | null
          empresa: string
          id: string
          inclui_modelagem: boolean | null
          notas: string | null
          parcelas: Json
          plano_software: string | null
          progresso: number | null
          projeto: string
          qtd_imagens: number | null
          recorrente: boolean
          segundos_animacao: number | null
          servicos_adicionais: string | null
          status: string
          telefone: string | null
          tem_animacao: boolean
          tem_imagens: boolean
          tem_software: boolean
          tem_tour_virtual: boolean
          updated_at: string
          valor_servicos_adicionais: number
          valor_total: number | null
          valor_tour_virtual: number
          vendedor_id: string | null
        }
        Insert: {
          apelidos?: string[]
          concluido_em?: string | null
          contato?: string | null
          created_at?: string
          data_inicio?: string | null
          data_previsao?: string | null
          email?: string | null
          empresa: string
          id?: string
          inclui_modelagem?: boolean | null
          notas?: string | null
          parcelas?: Json
          plano_software?: string | null
          progresso?: number | null
          projeto: string
          qtd_imagens?: number | null
          recorrente?: boolean
          segundos_animacao?: number | null
          servicos_adicionais?: string | null
          status?: string
          telefone?: string | null
          tem_animacao?: boolean
          tem_imagens?: boolean
          tem_software?: boolean
          tem_tour_virtual?: boolean
          updated_at?: string
          valor_servicos_adicionais?: number
          valor_total?: number | null
          valor_tour_virtual?: number
          vendedor_id?: string | null
        }
        Update: {
          apelidos?: string[]
          concluido_em?: string | null
          contato?: string | null
          created_at?: string
          data_inicio?: string | null
          data_previsao?: string | null
          email?: string | null
          empresa?: string
          id?: string
          inclui_modelagem?: boolean | null
          notas?: string | null
          parcelas?: Json
          plano_software?: string | null
          progresso?: number | null
          projeto?: string
          qtd_imagens?: number | null
          recorrente?: boolean
          segundos_animacao?: number | null
          servicos_adicionais?: string | null
          status?: string
          telefone?: string | null
          tem_animacao?: boolean
          tem_imagens?: boolean
          tem_software?: boolean
          tem_tour_virtual?: boolean
          updated_at?: string
          valor_servicos_adicionais?: number
          valor_total?: number | null
          valor_tour_virtual?: number
          vendedor_id?: string | null
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
      crm_activities: {
        Row: {
          concluida: boolean
          concluida_em: string | null
          created_at: string
          deal_id: string | null
          descricao: string | null
          duracao_min: number | null
          id: string
          owner_label: string | null
          owner_user_id: string | null
          person_id: string | null
          pipedrive_activity_id: number | null
          resultado: string | null
          scheduled_at: string | null
          tipo: Database["public"]["Enums"]["crm_activity_type"]
          titulo: string
          updated_at: string
        }
        Insert: {
          concluida?: boolean
          concluida_em?: string | null
          created_at?: string
          deal_id?: string | null
          descricao?: string | null
          duracao_min?: number | null
          id?: string
          owner_label?: string | null
          owner_user_id?: string | null
          person_id?: string | null
          pipedrive_activity_id?: number | null
          resultado?: string | null
          scheduled_at?: string | null
          tipo?: Database["public"]["Enums"]["crm_activity_type"]
          titulo: string
          updated_at?: string
        }
        Update: {
          concluida?: boolean
          concluida_em?: string | null
          created_at?: string
          deal_id?: string | null
          descricao?: string | null
          duracao_min?: number | null
          id?: string
          owner_label?: string | null
          owner_user_id?: string | null
          person_id?: string | null
          pipedrive_activity_id?: number | null
          resultado?: string | null
          scheduled_at?: string | null
          tipo?: Database["public"]["Enums"]["crm_activity_type"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "crm_persons"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deal_files: {
        Row: {
          created_at: string
          deal_id: string
          file_name: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          deal_id: string
          file_name: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          deal_id?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_deal_files_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deal_history: {
        Row: {
          actor_label: string | null
          actor_user_id: string | null
          created_at: string
          deal_id: string
          evento: string
          id: string
          payload: Json | null
        }
        Insert: {
          actor_label?: string | null
          actor_user_id?: string | null
          created_at?: string
          deal_id: string
          evento: string
          id?: string
          payload?: Json | null
        }
        Update: {
          actor_label?: string | null
          actor_user_id?: string | null
          created_at?: string
          deal_id?: string
          evento?: string
          id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_deal_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deals: {
        Row: {
          created_at: string
          data_fechamento: string | null
          deleted_in_pipedrive: boolean
          expected_close_date: string | null
          flow_started_at: string
          id: string
          label_ids: string[]
          motivo_perda: string | null
          notas: string | null
          organization_id: string | null
          origem: string | null
          owner_label: string | null
          owner_user_id: string | null
          person_id: string | null
          pipedrive_id: number | null
          pipeline_id: string
          probabilidade: number | null
          score_budget: number | null
          score_fit: number | null
          score_urgencia: number | null
          stage_entered_at: string
          stage_id: string
          status: Database["public"]["Enums"]["crm_deal_status"]
          temperatura: string | null
          titulo: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_fechamento?: string | null
          deleted_in_pipedrive?: boolean
          expected_close_date?: string | null
          flow_started_at?: string
          id?: string
          label_ids?: string[]
          motivo_perda?: string | null
          notas?: string | null
          organization_id?: string | null
          origem?: string | null
          owner_label?: string | null
          owner_user_id?: string | null
          person_id?: string | null
          pipedrive_id?: number | null
          pipeline_id: string
          probabilidade?: number | null
          score_budget?: number | null
          score_fit?: number | null
          score_urgencia?: number | null
          stage_entered_at?: string
          stage_id: string
          status?: Database["public"]["Enums"]["crm_deal_status"]
          temperatura?: string | null
          titulo: string
          updated_at?: string
          valor?: number
        }
        Update: {
          created_at?: string
          data_fechamento?: string | null
          deleted_in_pipedrive?: boolean
          expected_close_date?: string | null
          flow_started_at?: string
          id?: string
          label_ids?: string[]
          motivo_perda?: string | null
          notas?: string | null
          organization_id?: string | null
          origem?: string | null
          owner_label?: string | null
          owner_user_id?: string | null
          person_id?: string | null
          pipedrive_id?: number | null
          pipeline_id?: string
          probabilidade?: number | null
          score_budget?: number | null
          score_fit?: number | null
          score_urgencia?: number | null
          stage_entered_at?: string
          stage_id?: string
          status?: Database["public"]["Enums"]["crm_deal_status"]
          temperatura?: string | null
          titulo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_deals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "crm_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "crm_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_field_definitions: {
        Row: {
          entity_type: string
          field_key: string
          field_type: string | null
          id: string
          is_custom: boolean
          name: string
          options: Json | null
          pipedrive_field_id: number | null
          updated_at: string
        }
        Insert: {
          entity_type: string
          field_key: string
          field_type?: string | null
          id?: string
          is_custom?: boolean
          name: string
          options?: Json | null
          pipedrive_field_id?: number | null
          updated_at?: string
        }
        Update: {
          entity_type?: string
          field_key?: string
          field_type?: string | null
          id?: string
          is_custom?: boolean
          name?: string
          options?: Json | null
          pipedrive_field_id?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      crm_labels: {
        Row: {
          cor: string
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          cor?: string
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          cor?: string
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      crm_notes: {
        Row: {
          author_label: string | null
          author_user_id: string | null
          conteudo: string
          created_at: string
          deal_id: string
          id: string
        }
        Insert: {
          author_label?: string | null
          author_user_id?: string | null
          conteudo: string
          created_at?: string
          deal_id: string
          id?: string
        }
        Update: {
          author_label?: string | null
          author_user_id?: string | null
          conteudo?: string
          created_at?: string
          deal_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_notes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_organizations: {
        Row: {
          cep: string | null
          cidade: string | null
          created_at: string
          custom_fields: Json | null
          email: string | null
          endereco: string | null
          endereco_completo: string | null
          estado: string | null
          faturamento: number | null
          id: string
          industry: string | null
          instagram: string | null
          linkedin: string | null
          nome: string
          notas: string | null
          num_colaboradores: number | null
          pais: string | null
          pipedrive_org_id: number | null
          porte: string | null
          raw_payload: Json | null
          segmento: string | null
          site: string | null
          telefone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          created_at?: string
          custom_fields?: Json | null
          email?: string | null
          endereco?: string | null
          endereco_completo?: string | null
          estado?: string | null
          faturamento?: number | null
          id?: string
          industry?: string | null
          instagram?: string | null
          linkedin?: string | null
          nome: string
          notas?: string | null
          num_colaboradores?: number | null
          pais?: string | null
          pipedrive_org_id?: number | null
          porte?: string | null
          raw_payload?: Json | null
          segmento?: string | null
          site?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          created_at?: string
          custom_fields?: Json | null
          email?: string | null
          endereco?: string | null
          endereco_completo?: string | null
          estado?: string | null
          faturamento?: number | null
          id?: string
          industry?: string | null
          instagram?: string | null
          linkedin?: string | null
          nome?: string
          notas?: string | null
          num_colaboradores?: number | null
          pais?: string | null
          pipedrive_org_id?: number | null
          porte?: string | null
          raw_payload?: Json | null
          segmento?: string | null
          site?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      crm_persons: {
        Row: {
          cargo: string | null
          created_at: string
          custom_fields: Json | null
          email: string | null
          emails: Json | null
          first_name: string | null
          id: string
          last_name: string | null
          linkedin: string | null
          nome: string
          organization_id: string | null
          pipedrive_person_id: number | null
          raw_payload: Json | null
          telefone: string | null
          telefones: Json | null
          updated_at: string
        }
        Insert: {
          cargo?: string | null
          created_at?: string
          custom_fields?: Json | null
          email?: string | null
          emails?: Json | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          linkedin?: string | null
          nome: string
          organization_id?: string | null
          pipedrive_person_id?: number | null
          raw_payload?: Json | null
          telefone?: string | null
          telefones?: Json | null
          updated_at?: string
        }
        Update: {
          cargo?: string | null
          created_at?: string
          custom_fields?: Json | null
          email?: string | null
          emails?: Json | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          linkedin?: string | null
          nome?: string
          organization_id?: string | null
          pipedrive_person_id?: number | null
          raw_payload?: Json | null
          telefone?: string | null
          telefones?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_persons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "crm_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipelines: {
        Row: {
          ativo: boolean
          created_at: string
          flow_id: string | null
          flow_type: Database["public"]["Enums"]["pipeline_flow_type"]
          id: string
          nome: string
          ordem: number
          owner_label: string | null
          owner_user_id: string | null
          sheet_id: string | null
          sheet_tab: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          flow_id?: string | null
          flow_type?: Database["public"]["Enums"]["pipeline_flow_type"]
          id?: string
          nome: string
          ordem?: number
          owner_label?: string | null
          owner_user_id?: string | null
          sheet_id?: string | null
          sheet_tab?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          flow_id?: string | null
          flow_type?: Database["public"]["Enums"]["pipeline_flow_type"]
          id?: string
          nome?: string
          ordem?: number
          owner_label?: string | null
          owner_user_id?: string | null
          sheet_id?: string | null
          sheet_tab?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      crm_stages: {
        Row: {
          cor: string | null
          created_at: string
          id: string
          is_lost: boolean
          is_won: boolean
          nome: string
          ordem: number
          pipedrive_stage_id: number | null
          pipeline_id: string
        }
        Insert: {
          cor?: string | null
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          nome: string
          ordem?: number
          pipedrive_stage_id?: number | null
          pipeline_id: string
        }
        Update: {
          cor?: string | null
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          nome?: string
          ordem?: number
          pipedrive_stage_id?: number | null
          pipeline_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_activities: {
        Row: {
          concluido: boolean
          concluido_em: string | null
          criado_em: string
          criado_por: string | null
          data: string
          descricao: string | null
          id: string
          quantidade: number | null
          responsavel: string
          tipo: string
          titulo: string
        }
        Insert: {
          concluido?: boolean
          concluido_em?: string | null
          criado_em?: string
          criado_por?: string | null
          data?: string
          descricao?: string | null
          id?: string
          quantidade?: number | null
          responsavel: string
          tipo?: string
          titulo: string
        }
        Update: {
          concluido?: boolean
          concluido_em?: string | null
          criado_em?: string
          criado_por?: string | null
          data?: string
          descricao?: string | null
          id?: string
          quantidade?: number | null
          responsavel?: string
          tipo?: string
          titulo?: string
        }
        Relationships: []
      }
      custos_config: {
        Row: {
          aluguel: number | null
          atualizado_em: string
          condominio_iptu: number | null
          contabilidade_juridico: number | null
          criado_em: string
          depreciacao: number | null
          diretoria_prolabore: number | null
          educacao: number | null
          energia_agua_telefone: number | null
          financeiro_bancario: number | null
          gastos_variaveis_unitarios: number | null
          id: string
          internet_ti: number | null
          marketing_publicidade: number | null
          mes: string
          outros_fixos: number | null
          pessoal: number | null
          preco_venda_unitario: number | null
          seguros: number | null
          software: number | null
          veiculos: number | null
          volume_vendas: number | null
        }
        Insert: {
          aluguel?: number | null
          atualizado_em?: string
          condominio_iptu?: number | null
          contabilidade_juridico?: number | null
          criado_em?: string
          depreciacao?: number | null
          diretoria_prolabore?: number | null
          educacao?: number | null
          energia_agua_telefone?: number | null
          financeiro_bancario?: number | null
          gastos_variaveis_unitarios?: number | null
          id?: string
          internet_ti?: number | null
          marketing_publicidade?: number | null
          mes: string
          outros_fixos?: number | null
          pessoal?: number | null
          preco_venda_unitario?: number | null
          seguros?: number | null
          software?: number | null
          veiculos?: number | null
          volume_vendas?: number | null
        }
        Update: {
          aluguel?: number | null
          atualizado_em?: string
          condominio_iptu?: number | null
          contabilidade_juridico?: number | null
          criado_em?: string
          depreciacao?: number | null
          diretoria_prolabore?: number | null
          educacao?: number | null
          energia_agua_telefone?: number | null
          financeiro_bancario?: number | null
          gastos_variaveis_unitarios?: number | null
          id?: string
          internet_ti?: number | null
          marketing_publicidade?: number | null
          mes?: string
          outros_fixos?: number | null
          pessoal?: number | null
          preco_venda_unitario?: number | null
          seguros?: number | null
          software?: number | null
          veiculos?: number | null
          volume_vendas?: number | null
        }
        Relationships: []
      }
      daily_activities: {
        Row: {
          assignee_label: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          flow_node_id: string | null
          flow_run_id: string | null
          id: string
          notes: string | null
          priority: number
          related_campaign_id: string | null
          related_deal_id: number | null
          scheduled_date: string
          source: Database["public"]["Enums"]["activity_source"]
          task_description: string
          task_type: Database["public"]["Enums"]["activity_type"]
          user_id: string | null
          user_pipedrive_id: number | null
        }
        Insert: {
          assignee_label?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          flow_node_id?: string | null
          flow_run_id?: string | null
          id?: string
          notes?: string | null
          priority?: number
          related_campaign_id?: string | null
          related_deal_id?: number | null
          scheduled_date?: string
          source?: Database["public"]["Enums"]["activity_source"]
          task_description: string
          task_type?: Database["public"]["Enums"]["activity_type"]
          user_id?: string | null
          user_pipedrive_id?: number | null
        }
        Update: {
          assignee_label?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          flow_node_id?: string | null
          flow_run_id?: string | null
          id?: string
          notes?: string | null
          priority?: number
          related_campaign_id?: string | null
          related_deal_id?: number | null
          scheduled_date?: string
          source?: Database["public"]["Enums"]["activity_source"]
          task_description?: string
          task_type?: Database["public"]["Enums"]["activity_type"]
          user_id?: string | null
          user_pipedrive_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_activities_related_campaign_id_fkey"
            columns: ["related_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_audience_segments: {
        Row: {
          created_at: string
          created_by: string | null
          filtros: Json
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          filtros?: Json
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          filtros?: Json
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_campaign_recipients: {
        Row: {
          bounce_reason: string | null
          campaign_id: string
          click_count: number
          created_at: string
          deal_id: string | null
          delivered_at: string | null
          error_message: string | null
          first_clicked_at: string | null
          first_opened_at: string | null
          id: string
          last_clicked_at: string | null
          last_opened_at: string | null
          open_count: number
          person_id: string | null
          recipient_email: string
          recipient_name: string | null
          resend_message_id: string | null
          sent_at: string | null
          status: string
          updated_at: string
          urls_clicadas: Json
        }
        Insert: {
          bounce_reason?: string | null
          campaign_id: string
          click_count?: number
          created_at?: string
          deal_id?: string | null
          delivered_at?: string | null
          error_message?: string | null
          first_clicked_at?: string | null
          first_opened_at?: string | null
          id?: string
          last_clicked_at?: string | null
          last_opened_at?: string | null
          open_count?: number
          person_id?: string | null
          recipient_email: string
          recipient_name?: string | null
          resend_message_id?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          urls_clicadas?: Json
        }
        Update: {
          bounce_reason?: string | null
          campaign_id?: string
          click_count?: number
          created_at?: string
          deal_id?: string | null
          delivered_at?: string | null
          error_message?: string | null
          first_clicked_at?: string | null
          first_opened_at?: string | null
          id?: string
          last_clicked_at?: string | null
          last_opened_at?: string | null
          open_count?: number
          person_id?: string | null
          recipient_email?: string
          recipient_name?: string | null
          resend_message_id?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          urls_clicadas?: Json
        }
        Relationships: [
          {
            foreignKeyName: "email_campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          anexos: Json
          body_html: string
          created_at: string
          criado_por: string | null
          from_email: string
          from_name: string
          id: string
          nome: string
          parent_campaign_id: string | null
          reply_to: string | null
          scheduled_at: string | null
          segment_id: string | null
          sent_at: string | null
          status: string
          subject: string
          teste_enviado_para: string | null
          total_bounced: number
          total_clicked: number
          total_delivered: number
          total_failed: number
          total_opened: number
          total_recipients: number
          total_sent: number
          updated_at: string
        }
        Insert: {
          anexos?: Json
          body_html: string
          created_at?: string
          criado_por?: string | null
          from_email?: string
          from_name?: string
          id?: string
          nome: string
          parent_campaign_id?: string | null
          reply_to?: string | null
          scheduled_at?: string | null
          segment_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          teste_enviado_para?: string | null
          total_bounced?: number
          total_clicked?: number
          total_delivered?: number
          total_failed?: number
          total_opened?: number
          total_recipients?: number
          total_sent?: number
          updated_at?: string
        }
        Update: {
          anexos?: Json
          body_html?: string
          created_at?: string
          criado_por?: string | null
          from_email?: string
          from_name?: string
          id?: string
          nome?: string
          parent_campaign_id?: string | null
          reply_to?: string | null
          scheduled_at?: string | null
          segment_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          teste_enviado_para?: string | null
          total_bounced?: number
          total_clicked?: number
          total_delivered?: number
          total_failed?: number
          total_opened?: number
          total_recipients?: number
          total_sent?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_messages: {
        Row: {
          body_html: string | null
          body_text: string | null
          cc_emails: string[] | null
          created_at: string
          deal_id: string | null
          direction: string
          from_email: string | null
          from_name: string | null
          gmail_message_id: string
          gmail_thread_id: string
          id: string
          is_read: boolean | null
          labels: string[] | null
          person_id: string | null
          raw_payload: Json | null
          received_at: string
          snippet: string | null
          subject: string | null
          to_emails: string[] | null
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          cc_emails?: string[] | null
          created_at?: string
          deal_id?: string | null
          direction: string
          from_email?: string | null
          from_name?: string | null
          gmail_message_id: string
          gmail_thread_id: string
          id?: string
          is_read?: boolean | null
          labels?: string[] | null
          person_id?: string | null
          raw_payload?: Json | null
          received_at: string
          snippet?: string | null
          subject?: string | null
          to_emails?: string[] | null
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          cc_emails?: string[] | null
          created_at?: string
          deal_id?: string | null
          direction?: string
          from_email?: string | null
          from_name?: string | null
          gmail_message_id?: string
          gmail_thread_id?: string
          id?: string
          is_read?: boolean | null
          labels?: string[] | null
          person_id?: string | null
          raw_payload?: Json | null
          received_at?: string
          snippet?: string | null
          subject?: string | null
          to_emails?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "email_messages_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_messages_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "crm_persons"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequence_drafts: {
        Row: {
          created_at: string
          enrollment_id: string
          error_message: string | null
          gmail_draft_id: string | null
          id: string
          recipient_email: string | null
          rendered_body: string | null
          rendered_subject: string | null
          scheduled_for: string
          status: string
          step_id: string
        }
        Insert: {
          created_at?: string
          enrollment_id: string
          error_message?: string | null
          gmail_draft_id?: string | null
          id?: string
          recipient_email?: string | null
          rendered_body?: string | null
          rendered_subject?: string | null
          scheduled_for: string
          status?: string
          step_id: string
        }
        Update: {
          created_at?: string
          enrollment_id?: string
          error_message?: string | null
          gmail_draft_id?: string | null
          id?: string
          recipient_email?: string | null
          rendered_body?: string | null
          rendered_subject?: string | null
          scheduled_for?: string
          status?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sequence_drafts_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "email_sequence_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sequence_drafts_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "email_sequence_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequence_enrollments: {
        Row: {
          cancelled_reason: string | null
          current_step: number
          deal_id: string | null
          id: string
          owner_user_id: string | null
          person_id: string | null
          sequence_id: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          cancelled_reason?: string | null
          current_step?: number
          deal_id?: string | null
          id?: string
          owner_user_id?: string | null
          person_id?: string | null
          sequence_id: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          cancelled_reason?: string | null
          current_step?: number
          deal_id?: string | null
          id?: string
          owner_user_id?: string | null
          person_id?: string | null
          sequence_id?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sequence_enrollments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sequence_enrollments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "crm_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sequence_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequence_steps: {
        Row: {
          body_template: string
          created_at: string
          dia_offset: number
          id: string
          ordem: number
          sequence_id: string
          subject_template: string
        }
        Insert: {
          body_template: string
          created_at?: string
          dia_offset?: number
          id?: string
          ordem: number
          sequence_id: string
          subject_template: string
        }
        Update: {
          body_template?: string
          created_at?: string
          dia_offset?: number
          id?: string
          ordem?: number
          sequence_id?: string
          subject_template?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequences: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          owner_user_id: string | null
          trigger_stage_id: string | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          owner_user_id?: string | null
          trigger_stage_id?: string | null
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          owner_user_id?: string | null
          trigger_stage_id?: string | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sequences_trigger_stage_id_fkey"
            columns: ["trigger_stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_signatures: {
        Row: {
          corpo_html: string
          created_at: string
          id: string
          is_default: boolean
          nome: string
          owner_user_id: string | null
          updated_at: string
        }
        Insert: {
          corpo_html: string
          created_at?: string
          id?: string
          is_default?: boolean
          nome: string
          owner_user_id?: string | null
          updated_at?: string
        }
        Update: {
          corpo_html?: string
          created_at?: string
          id?: string
          is_default?: boolean
          nome?: string
          owner_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_suppressions: {
        Row: {
          created_at: string
          detalhe: string | null
          email: string
          id: string
          motivo: string
        }
        Insert: {
          created_at?: string
          detalhe?: string | null
          email: string
          id?: string
          motivo?: string
        }
        Update: {
          created_at?: string
          detalhe?: string | null
          email?: string
          id?: string
          motivo?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          arquivado: boolean
          body_html: string
          categoria: string | null
          created_at: string
          criado_por: string | null
          id: string
          nome: string
          subject: string
          thumbnail_html: string | null
          updated_at: string
          variables: Json
          vezes_usado: number
        }
        Insert: {
          arquivado?: boolean
          body_html: string
          categoria?: string | null
          created_at?: string
          criado_por?: string | null
          id?: string
          nome: string
          subject: string
          thumbnail_html?: string | null
          updated_at?: string
          variables?: Json
          vezes_usado?: number
        }
        Update: {
          arquivado?: boolean
          body_html?: string
          categoria?: string | null
          created_at?: string
          criado_por?: string | null
          id?: string
          nome?: string
          subject?: string
          thumbnail_html?: string | null
          updated_at?: string
          variables?: Json
          vezes_usado?: number
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          token?: string
          used_at?: string | null
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
      flow_run_steps: {
        Row: {
          error: string | null
          executed_at: string
          id: string
          node_id: string
          node_type: string
          output: Json | null
          run_id: string
          status: string
        }
        Insert: {
          error?: string | null
          executed_at?: string
          id?: string
          node_id: string
          node_type: string
          output?: Json | null
          run_id: string
          status: string
        }
        Update: {
          error?: string | null
          executed_at?: string
          id?: string
          node_id?: string
          node_type?: string
          output?: Json | null
          run_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_run_steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "flow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_runs: {
        Row: {
          context: Json | null
          crm_deal_id: string | null
          current_node_id: string | null
          error: string | null
          finished_at: string | null
          flow_id: string
          id: string
          project_deal_id: string | null
          resume_at: string | null
          started_at: string
          status: string
          waiting_activity_id: string | null
        }
        Insert: {
          context?: Json | null
          crm_deal_id?: string | null
          current_node_id?: string | null
          error?: string | null
          finished_at?: string | null
          flow_id: string
          id?: string
          project_deal_id?: string | null
          resume_at?: string | null
          started_at?: string
          status?: string
          waiting_activity_id?: string | null
        }
        Update: {
          context?: Json | null
          crm_deal_id?: string | null
          current_node_id?: string | null
          error?: string | null
          finished_at?: string | null
          flow_id?: string
          id?: string
          project_deal_id?: string | null
          resume_at?: string | null
          started_at?: string
          status?: string
          waiting_activity_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_runs_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_runs_project_deal_id_fkey"
            columns: ["project_deal_id"]
            isOneToOne: false
            referencedRelation: "project_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_task_completions: {
        Row: {
          completed_at: string
          completed_by: string | null
          deal_id: string
          flow_id: string
          id: string
          node_id: string
          nota: string | null
        }
        Insert: {
          completed_at?: string
          completed_by?: string | null
          deal_id: string
          flow_id: string
          id?: string
          node_id: string
          nota?: string | null
        }
        Update: {
          completed_at?: string
          completed_by?: string | null
          deal_id?: string
          flow_id?: string
          id?: string
          node_id?: string
          nota?: string | null
        }
        Relationships: []
      }
      flows: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          edges: Json
          id: string
          nodes: Json
          nome: string
          scope: string
          trigger_config: Json
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          edges?: Json
          id?: string
          nodes?: Json
          nome: string
          scope?: string
          trigger_config?: Json
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          edges?: Json
          id?: string
          nodes?: Json
          nome?: string
          scope?: string
          trigger_config?: Json
          updated_at?: string
        }
        Relationships: []
      }
      fluxo_caixa: {
        Row: {
          aporte_capital_proj: number | null
          aporte_capital_real: number | null
          aquisicao_imobilizado_proj: number | null
          aquisicao_imobilizado_real: number | null
          atualizado_em: string
          captacao_emprestimos_proj: number | null
          captacao_emprestimos_real: number | null
          criado_em: string
          id: string
          impostos_proj: number | null
          impostos_real: number | null
          mes: string
          outros_investimentos_proj: number | null
          outros_investimentos_real: number | null
          pagamento_despesas_proj: number | null
          pagamento_despesas_real: number | null
          pagamento_emprestimos_proj: number | null
          pagamento_emprestimos_real: number | null
          pagamento_pessoal_proj: number | null
          pagamento_pessoal_real: number | null
          pagamentos_fornecedores_proj: number | null
          pagamentos_fornecedores_real: number | null
          recebimentos_clientes_proj: number | null
          recebimentos_clientes_real: number | null
          venda_ativos_proj: number | null
          venda_ativos_real: number | null
        }
        Insert: {
          aporte_capital_proj?: number | null
          aporte_capital_real?: number | null
          aquisicao_imobilizado_proj?: number | null
          aquisicao_imobilizado_real?: number | null
          atualizado_em?: string
          captacao_emprestimos_proj?: number | null
          captacao_emprestimos_real?: number | null
          criado_em?: string
          id?: string
          impostos_proj?: number | null
          impostos_real?: number | null
          mes: string
          outros_investimentos_proj?: number | null
          outros_investimentos_real?: number | null
          pagamento_despesas_proj?: number | null
          pagamento_despesas_real?: number | null
          pagamento_emprestimos_proj?: number | null
          pagamento_emprestimos_real?: number | null
          pagamento_pessoal_proj?: number | null
          pagamento_pessoal_real?: number | null
          pagamentos_fornecedores_proj?: number | null
          pagamentos_fornecedores_real?: number | null
          recebimentos_clientes_proj?: number | null
          recebimentos_clientes_real?: number | null
          venda_ativos_proj?: number | null
          venda_ativos_real?: number | null
        }
        Update: {
          aporte_capital_proj?: number | null
          aporte_capital_real?: number | null
          aquisicao_imobilizado_proj?: number | null
          aquisicao_imobilizado_real?: number | null
          atualizado_em?: string
          captacao_emprestimos_proj?: number | null
          captacao_emprestimos_real?: number | null
          criado_em?: string
          id?: string
          impostos_proj?: number | null
          impostos_real?: number | null
          mes?: string
          outros_investimentos_proj?: number | null
          outros_investimentos_real?: number | null
          pagamento_despesas_proj?: number | null
          pagamento_despesas_real?: number | null
          pagamento_emprestimos_proj?: number | null
          pagamento_emprestimos_real?: number | null
          pagamento_pessoal_proj?: number | null
          pagamento_pessoal_real?: number | null
          pagamentos_fornecedores_proj?: number | null
          pagamentos_fornecedores_real?: number | null
          recebimentos_clientes_proj?: number | null
          recebimentos_clientes_real?: number | null
          venda_ativos_proj?: number | null
          venda_ativos_real?: number | null
        }
        Relationships: []
      }
      integration_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      lancamentos: {
        Row: {
          categoria: string
          classificacao: string
          criado_em: string
          data: string
          descricao: string
          id: string
          mes: string
          notas: string | null
          valor: number
        }
        Insert: {
          categoria: string
          classificacao: string
          criado_em?: string
          data?: string
          descricao: string
          id?: string
          mes?: string
          notas?: string | null
          valor?: number
        }
        Update: {
          categoria?: string
          classificacao?: string
          criado_em?: string
          data?: string
          descricao?: string
          id?: string
          mes?: string
          notas?: string | null
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
      leads_qualified: {
        Row: {
          aprovado_em: string | null
          assigned_to: string | null
          contatado_em: string | null
          created_at: string | null
          id: string
          lead_raw_id: string | null
          mensagem_aprovada: string | null
          mensagem_editada: string | null
          mensagem_rascunho: string | null
          processado_em: string | null
          qualificado: boolean | null
          razao: string | null
          score: number | null
          status: string | null
          tipo_lead: string | null
          username: string
        }
        Insert: {
          aprovado_em?: string | null
          assigned_to?: string | null
          contatado_em?: string | null
          created_at?: string | null
          id?: string
          lead_raw_id?: string | null
          mensagem_aprovada?: string | null
          mensagem_editada?: string | null
          mensagem_rascunho?: string | null
          processado_em?: string | null
          qualificado?: boolean | null
          razao?: string | null
          score?: number | null
          status?: string | null
          tipo_lead?: string | null
          username: string
        }
        Update: {
          aprovado_em?: string | null
          assigned_to?: string | null
          contatado_em?: string | null
          created_at?: string | null
          id?: string
          lead_raw_id?: string | null
          mensagem_aprovada?: string | null
          mensagem_editada?: string | null
          mensagem_rascunho?: string | null
          processado_em?: string | null
          qualificado?: boolean | null
          razao?: string | null
          score?: number | null
          status?: string | null
          tipo_lead?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_qualified_lead_raw_id_fkey"
            columns: ["lead_raw_id"]
            isOneToOne: false
            referencedRelation: "leads_raw"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_raw: {
        Row: {
          bio: string | null
          created_at: string | null
          fonte: string
          fonte_detalhe: string | null
          hashtags_usadas: string | null
          id: string
          localizacao: string | null
          nome_completo: string | null
          posts_count: number | null
          seguidores: number | null
          seguindo: number | null
          status: string | null
          temas_posts: string | null
          ultimo_post_em: string | null
          updated_at: string | null
          username: string
          website: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          fonte: string
          fonte_detalhe?: string | null
          hashtags_usadas?: string | null
          id?: string
          localizacao?: string | null
          nome_completo?: string | null
          posts_count?: number | null
          seguidores?: number | null
          seguindo?: number | null
          status?: string | null
          temas_posts?: string | null
          ultimo_post_em?: string | null
          updated_at?: string | null
          username: string
          website?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          fonte?: string
          fonte_detalhe?: string | null
          hashtags_usadas?: string | null
          id?: string
          localizacao?: string | null
          nome_completo?: string | null
          posts_count?: number | null
          seguidores?: number | null
          seguindo?: number | null
          status?: string | null
          temas_posts?: string | null
          ultimo_post_em?: string | null
          updated_at?: string | null
          username?: string
          website?: string | null
        }
        Relationships: []
      }
      login_events: {
        Row: {
          email: string | null
          id: string
          logged_in_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          email?: string | null
          id?: string
          logged_in_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          email?: string | null
          id?: string
          logged_in_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      meeting_checks: {
        Row: {
          agendada: boolean
          agendada_em: string | null
          colaborador: string
          criado_em: string
          id: string
          mes: string
          numero_reuniao: number
          realizada: boolean
          realizada_em: string | null
        }
        Insert: {
          agendada?: boolean
          agendada_em?: string | null
          colaborador: string
          criado_em?: string
          id?: string
          mes: string
          numero_reuniao: number
          realizada?: boolean
          realizada_em?: string | null
        }
        Update: {
          agendada?: boolean
          agendada_em?: string | null
          colaborador?: string
          criado_em?: string
          id?: string
          mes?: string
          numero_reuniao?: number
          realizada?: boolean
          realizada_em?: string | null
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
      metas_comerciais: {
        Row: {
          aprovado: boolean | null
          aprovado_em: string | null
          criado_em: string
          grupo_a_leads: number | null
          grupo_b_leads: number | null
          id: string
          mes: string
          meta_contratos: number | null
          meta_demos: number | null
          meta_receita: number | null
          minimo_viavel: number | null
          total_leads: number | null
        }
        Insert: {
          aprovado?: boolean | null
          aprovado_em?: string | null
          criado_em?: string
          grupo_a_leads?: number | null
          grupo_b_leads?: number | null
          id?: string
          mes: string
          meta_contratos?: number | null
          meta_demos?: number | null
          meta_receita?: number | null
          minimo_viavel?: number | null
          total_leads?: number | null
        }
        Update: {
          aprovado?: boolean | null
          aprovado_em?: string | null
          criado_em?: string
          grupo_a_leads?: number | null
          grupo_b_leads?: number | null
          id?: string
          mes?: string
          meta_contratos?: number | null
          meta_demos?: number | null
          meta_receita?: number | null
          minimo_viavel?: number | null
          total_leads?: number | null
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
      monthly_strategies: {
        Row: {
          allocation: Json | null
          cash_target: number | null
          created_at: string
          id: string
          key_priorities: Json | null
          locked: boolean
          month: string
          operational_minimum: number | null
          session_notes: string | null
          source: Database["public"]["Enums"]["strategy_source"]
          strategic_focus: string | null
        }
        Insert: {
          allocation?: Json | null
          cash_target?: number | null
          created_at?: string
          id?: string
          key_priorities?: Json | null
          locked?: boolean
          month: string
          operational_minimum?: number | null
          session_notes?: string | null
          source?: Database["public"]["Enums"]["strategy_source"]
          strategic_focus?: string | null
        }
        Update: {
          allocation?: Json | null
          cash_target?: number | null
          created_at?: string
          id?: string
          key_priorities?: Json | null
          locked?: boolean
          month?: string
          operational_minimum?: number | null
          session_notes?: string | null
          source?: Database["public"]["Enums"]["strategy_source"]
          strategic_focus?: string | null
        }
        Relationships: []
      }
      n8n_event_bindings: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          event_filter: Json
          event_type: string
          id: string
          updated_at: string
          webhook_url: string
          workflow_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          event_filter?: Json
          event_type: string
          id?: string
          updated_at?: string
          webhook_url: string
          workflow_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          event_filter?: Json
          event_type?: string
          id?: string
          updated_at?: string
          webhook_url?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "n8n_event_bindings_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "n8n_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      n8n_executions: {
        Row: {
          created_at: string
          crm_deal_id: string | null
          error: string | null
          event_payload: Json | null
          event_type: string | null
          finished_at: string | null
          id: string
          n8n_execution_id: string | null
          n8n_workflow_id: string | null
          related_activity_id: string | null
          started_at: string
          status: string
          workflow_id: string | null
        }
        Insert: {
          created_at?: string
          crm_deal_id?: string | null
          error?: string | null
          event_payload?: Json | null
          event_type?: string | null
          finished_at?: string | null
          id?: string
          n8n_execution_id?: string | null
          n8n_workflow_id?: string | null
          related_activity_id?: string | null
          started_at?: string
          status?: string
          workflow_id?: string | null
        }
        Update: {
          created_at?: string
          crm_deal_id?: string | null
          error?: string | null
          event_payload?: Json | null
          event_type?: string | null
          finished_at?: string | null
          id?: string
          n8n_execution_id?: string | null
          n8n_workflow_id?: string | null
          related_activity_id?: string | null
          started_at?: string
          status?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "n8n_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "n8n_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      n8n_workflows: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          last_synced_at: string
          n8n_workflow_id: string
          nome: string
          tags: string[] | null
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          last_synced_at?: string
          n8n_workflow_id: string
          nome: string
          tags?: string[] | null
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          last_synced_at?: string
          n8n_workflow_id?: string
          nome?: string
          tags?: string[] | null
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      pipedrive_import_runs: {
        Row: {
          error: string | null
          finished_at: string | null
          id: string
          phase: string
          started_at: string
          success: boolean | null
          summary: Json | null
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          id?: string
          phase: string
          started_at?: string
          success?: boolean | null
          summary?: Json | null
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          id?: string
          phase?: string
          started_at?: string
          success?: boolean | null
          summary?: Json | null
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
          colaborador_slug: string | null
          created_at: string
          email: string | null
          founder_pin: string | null
          full_name: string
          id: string
          status: string
          sub_role: string | null
          updated_at: string
          vendedor_sub_role:
            | Database["public"]["Enums"]["vendedor_sub_role"]
            | null
        }
        Insert: {
          avatar_url?: string | null
          colaborador_slug?: string | null
          created_at?: string
          email?: string | null
          founder_pin?: string | null
          full_name?: string
          id: string
          status?: string
          sub_role?: string | null
          updated_at?: string
          vendedor_sub_role?:
            | Database["public"]["Enums"]["vendedor_sub_role"]
            | null
        }
        Update: {
          avatar_url?: string | null
          colaborador_slug?: string | null
          created_at?: string
          email?: string | null
          founder_pin?: string | null
          full_name?: string
          id?: string
          status?: string
          sub_role?: string | null
          updated_at?: string
          vendedor_sub_role?:
            | Database["public"]["Enums"]["vendedor_sub_role"]
            | null
        }
        Relationships: []
      }
      project_deals: {
        Row: {
          cliente_ativo_id: string | null
          created_at: string
          crm_deal_id: string | null
          id: string
          notas: string | null
          pipeline_id: string
          progresso: number | null
          responsavel_label: string | null
          responsavel_user_id: string | null
          stage_entered_at: string
          stage_id: string
          status: string
          titulo: string
          updated_at: string
          valor: number | null
        }
        Insert: {
          cliente_ativo_id?: string | null
          created_at?: string
          crm_deal_id?: string | null
          id?: string
          notas?: string | null
          pipeline_id: string
          progresso?: number | null
          responsavel_label?: string | null
          responsavel_user_id?: string | null
          stage_entered_at?: string
          stage_id: string
          status?: string
          titulo: string
          updated_at?: string
          valor?: number | null
        }
        Update: {
          cliente_ativo_id?: string | null
          created_at?: string
          crm_deal_id?: string | null
          id?: string
          notas?: string | null
          pipeline_id?: string
          progresso?: number | null
          responsavel_label?: string | null
          responsavel_user_id?: string | null
          stage_entered_at?: string
          stage_id?: string
          status?: string
          titulo?: string
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_deals_cliente_ativo_id_fkey"
            columns: ["cliente_ativo_id"]
            isOneToOne: false
            referencedRelation: "clientes_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_deals_crm_deal_id_fkey"
            columns: ["crm_deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "project_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "project_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      project_pipelines: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          is_default: boolean
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          is_default?: boolean
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          is_default?: boolean
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      project_stages: {
        Row: {
          cor: string | null
          created_at: string
          id: string
          is_final: boolean
          nome: string
          ordem: number
          pipeline_id: string
        }
        Insert: {
          cor?: string | null
          created_at?: string
          id?: string
          is_final?: boolean
          nome: string
          ordem?: number
          pipeline_id: string
        }
        Update: {
          cor?: string | null
          created_at?: string
          id?: string
          is_final?: boolean
          nome?: string
          ordem?: number
          pipeline_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "project_pipelines"
            referencedColumns: ["id"]
          },
        ]
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
      strategic_inputs: {
        Row: {
          created_at: string
          id: string
          priority: number
          processed: boolean
          processed_at: string | null
          related_deal_id: number | null
          source_type: Database["public"]["Enums"]["strategic_input_source"]
          target_assignee_label: string | null
          target_user_id: string | null
          task_description: string
        }
        Insert: {
          created_at?: string
          id?: string
          priority?: number
          processed?: boolean
          processed_at?: string | null
          related_deal_id?: number | null
          source_type?: Database["public"]["Enums"]["strategic_input_source"]
          target_assignee_label?: string | null
          target_user_id?: string | null
          task_description: string
        }
        Update: {
          created_at?: string
          id?: string
          priority?: number
          processed?: boolean
          processed_at?: string | null
          related_deal_id?: number | null
          source_type?: Database["public"]["Enums"]["strategic_input_source"]
          target_assignee_label?: string | null
          target_user_id?: string | null
          task_description?: string
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
      weekly_plans: {
        Row: {
          approved_at: string | null
          cadencia_semana: Json
          created_at: string
          estrategia_semana: string | null
          estrategias_fora_da_caixa: Json
          extras_aline: Json
          extras_felipe: Json
          extras_milena: Json
          id: string
          meta_milena_dia: number
          prioridades: Json
          status: string
          updated_at: string
          week_end: string
          week_start: string
        }
        Insert: {
          approved_at?: string | null
          cadencia_semana?: Json
          created_at?: string
          estrategia_semana?: string | null
          estrategias_fora_da_caixa?: Json
          extras_aline?: Json
          extras_felipe?: Json
          extras_milena?: Json
          id?: string
          meta_milena_dia?: number
          prioridades?: Json
          status?: string
          updated_at?: string
          week_end: string
          week_start: string
        }
        Update: {
          approved_at?: string | null
          cadencia_semana?: Json
          created_at?: string
          estrategia_semana?: string | null
          estrategias_fora_da_caixa?: Json
          extras_aline?: Json
          extras_felipe?: Json
          extras_milena?: Json
          id?: string
          meta_milena_dia?: number
          prioridades?: Json
          status?: string
          updated_at?: string
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
      weekly_reports: {
        Row: {
          generated_at: string
          id: string
          metrics: Json | null
          monthly_strategy_id: string | null
          narrative_text: string | null
          week_end: string
          week_start: string
        }
        Insert: {
          generated_at?: string
          id?: string
          metrics?: Json | null
          monthly_strategy_id?: string | null
          narrative_text?: string | null
          week_end: string
          week_start: string
        }
        Update: {
          generated_at?: string
          id?: string
          metrics?: Json | null
          monthly_strategy_id?: string | null
          narrative_text?: string | null
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_reports_monthly_strategy_id_fkey"
            columns: ["monthly_strategy_id"]
            isOneToOne: false
            referencedRelation: "monthly_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_colaborador_slug: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_monthly_strategy: {
        Args: { api_key: string; payload: Json }
        Returns: Json
      }
      insert_strategic_input: {
        Args: {
          api_key: string
          priority: number
          related_deal_id?: number
          source_type: string
          target_user_id: string
          task_description: string
        }
        Returns: Json
      }
    }
    Enums: {
      activity_source: "auto" | "manual" | "claude_briefing" | "flow"
      activity_type:
        | "cadence"
        | "strategic"
        | "reactivation"
        | "followup"
        | "meeting"
        | "custom"
      app_role: "fundador" | "vendedor"
      cadence_channel: "email" | "whatsapp" | "linkedin" | "call"
      cadence_period: "morning" | "afternoon"
      campaign_lead_status: "active" | "paused" | "done" | "won" | "lost"
      campaign_playbook:
        | "cadence_2_0"
        | "reactivation"
        | "freela_hunter"
        | "custom"
      campaign_status: "active" | "paused" | "done" | "cancelled"
      crm_activity_type:
        | "ligacao"
        | "email"
        | "reuniao"
        | "tarefa"
        | "followup"
        | "outro"
      crm_deal_status: "open" | "won" | "lost"
      lead_status:
        | "lead"
        | "contatado"
        | "reuniao_agendada"
        | "reuniao_realizada"
        | "proposta"
        | "fechado"
        | "perdido"
      payment_status: "pendente" | "pago" | "atrasado" | "cancelado"
      pipeline_flow_type:
        | "cadencia_10_dias"
        | "nutricao"
        | "vendas"
        | "personalizado"
      strategic_input_source:
        | "stale_proposal"
        | "hot_lead"
        | "varredura"
        | "custom"
      strategy_source: "manual" | "claude_session"
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
      activity_source: ["auto", "manual", "claude_briefing", "flow"],
      activity_type: [
        "cadence",
        "strategic",
        "reactivation",
        "followup",
        "meeting",
        "custom",
      ],
      app_role: ["fundador", "vendedor"],
      cadence_channel: ["email", "whatsapp", "linkedin", "call"],
      cadence_period: ["morning", "afternoon"],
      campaign_lead_status: ["active", "paused", "done", "won", "lost"],
      campaign_playbook: [
        "cadence_2_0",
        "reactivation",
        "freela_hunter",
        "custom",
      ],
      campaign_status: ["active", "paused", "done", "cancelled"],
      crm_activity_type: [
        "ligacao",
        "email",
        "reuniao",
        "tarefa",
        "followup",
        "outro",
      ],
      crm_deal_status: ["open", "won", "lost"],
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
      pipeline_flow_type: [
        "cadencia_10_dias",
        "nutricao",
        "vendas",
        "personalizado",
      ],
      strategic_input_source: [
        "stale_proposal",
        "hot_lead",
        "varredura",
        "custom",
      ],
      strategy_source: ["manual", "claude_session"],
      vendedor_sub_role: ["sdr", "ldr"],
    },
  },
} as const

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
          created_at: string
          estrategia_semana: string | null
          extras_aline: Json
          extras_felipe: Json
          extras_milena: Json
          id: string
          prioridades: Json
          status: string
          updated_at: string
          week_end: string
          week_start: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          estrategia_semana?: string | null
          extras_aline?: Json
          extras_felipe?: Json
          extras_milena?: Json
          id?: string
          prioridades?: Json
          status?: string
          updated_at?: string
          week_end: string
          week_start: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          estrategia_semana?: string | null
          extras_aline?: Json
          extras_felipe?: Json
          extras_milena?: Json
          id?: string
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
      activity_source: "auto" | "manual" | "claude_briefing"
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
      lead_status:
        | "lead"
        | "contatado"
        | "reuniao_agendada"
        | "reuniao_realizada"
        | "proposta"
        | "fechado"
        | "perdido"
      payment_status: "pendente" | "pago" | "atrasado" | "cancelado"
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
      activity_source: ["auto", "manual", "claude_briefing"],
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

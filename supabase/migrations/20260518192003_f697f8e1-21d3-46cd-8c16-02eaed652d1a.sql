
DO $$
DECLARE
  p_alfa uuid := gen_random_uuid();
  p_beta uuid := gen_random_uuid();
  p_pos  uuid := gen_random_uuid();
  s_id uuid;
  org_id uuid;
  per_id uuid;
  stages_alfa uuid[] := ARRAY[]::uuid[];
  stages_beta uuid[] := ARRAY[]::uuid[];
  stages_pos  uuid[] := ARRAY[]::uuid[];
  i int;
  empresas text[] := ARRAY[
    'Construtora Almeida','Incorporadora Vila Nova','MR Engenharia','Edifica Brasil',
    'Patrimar Construções','Arquiteta Silva & Co','Studio Mendes','Atelier Ramos',
    'Realiza Imóveis','Habita Construções','Plano A Arquitetura','Concreta Obras',
    'Visão 360 Imobiliária','Verticalize SP','Casa & Obra Eng.','Marca Construtora',
    'Linha Reta Arquitetos','Origem Construtora','Núcleo Imobiliário','Galpão Studio'
  ];
  contatos text[] := ARRAY[
    'Carlos Mendes','Ana Beatriz Lima','Roberto Almeida','Fernanda Costa','Juliana Ramos',
    'Marcos Pereira','Patrícia Souza','Eduardo Tavares','Camila Ribeiro','Rafael Nogueira',
    'Bianca Martins','Thiago Carvalho','Luciana Freitas','Pedro Henrique Sá','Mariana Oliveira',
    'Gabriel Costa','Isabela Rocha','Vinícius Andrade','Letícia Moraes','Henrique Borges'
  ];
  owners text[] := ARRAY['Aline','Milena','Felipe','Aline','Aline','Milena'];
  valores int[] := ARRAY[15000,18000,20000,22000,25000,28000,32000,40000,48000,55000,60000,75000];
BEGIN
  INSERT INTO crm_pipelines (id, nome, ordem, ativo) VALUES
    (p_alfa, 'ALFA - Pipeline Aline', 1, true),
    (p_beta, 'BETA - Outbound Milena', 2, true),
    (p_pos,  'Pós-venda', 3, true);

  FOR i IN 1..7 LOOP
    s_id := gen_random_uuid();
    stages_alfa := array_append(stages_alfa, s_id);
    INSERT INTO crm_stages (id, pipeline_id, nome, ordem, cor, is_won, is_lost) VALUES
      (s_id, p_alfa,
        (ARRAY['Lead Novo','Qualificação','Reunião Agendada','Diagnóstico','Proposta Enviada','Negociação','Fechamento'])[i],
        i,
        (ARRAY['#64748b','#3b82f6','#8b5cf6','#06b6d4','#f59e0b','#f97316','#10b981'])[i],
        false, false);
  END LOOP;

  FOR i IN 1..6 LOOP
    s_id := gen_random_uuid();
    stages_beta := array_append(stages_beta, s_id);
    INSERT INTO crm_stages (id, pipeline_id, nome, ordem, cor, is_won, is_lost) VALUES
      (s_id, p_beta,
        (ARRAY['Prospect Frio','Primeiro Contato','Discovery','Apresentação','Proposta','Ganho'])[i],
        i,
        (ARRAY['#475569','#0ea5e9','#8b5cf6','#f59e0b','#f97316','#10b981'])[i],
        i = 6, false);
  END LOOP;

  FOR i IN 1..5 LOOP
    s_id := gen_random_uuid();
    stages_pos := array_append(stages_pos, s_id);
    INSERT INTO crm_stages (id, pipeline_id, nome, ordem, cor, is_won, is_lost) VALUES
      (s_id, p_pos,
        (ARRAY['Onboarding','Em Produção','Revisão','Entrega','Concluído'])[i],
        i,
        (ARRAY['#3b82f6','#f59e0b','#8b5cf6','#06b6d4','#10b981'])[i],
        i = 5, false);
  END LOOP;

  FOR i IN 1..18 LOOP
    org_id := gen_random_uuid();
    per_id := gen_random_uuid();
    INSERT INTO crm_organizations (id, nome) VALUES (org_id, empresas[((i-1) % array_length(empresas,1)) + 1]);
    INSERT INTO crm_persons (id, nome, email, telefone, organization_id) VALUES
      (per_id, contatos[((i-1) % array_length(contatos,1)) + 1],
        lower(replace(contatos[((i-1) % array_length(contatos,1)) + 1],' ','.')) || '@empresa.com',
        '+5511' || lpad((90000000 + i*137)::text, 9, '0'),
        org_id);
    INSERT INTO crm_deals (
      pipeline_id, stage_id, organization_id, person_id, titulo, valor, owner_label, status,
      stage_entered_at, expected_close_date, origem
    ) VALUES (
      p_alfa,
      stages_alfa[((i-1) % 7) + 1],
      org_id, per_id,
      empresas[((i-1) % array_length(empresas,1)) + 1] || ' - Projeto ' || (CASE (i % 3) WHEN 0 THEN 'Residencial' WHEN 1 THEN 'Comercial' ELSE 'Corporativo' END),
      valores[((i-1) % array_length(valores,1)) + 1],
      owners[((i-1) % array_length(owners,1)) + 1],
      'open',
      now() - ((i * 2 + (i % 5) * 3) || ' days')::interval,
      (now() + ((30 - i) || ' days')::interval)::date,
      'mock'
    );
  END LOOP;

  FOR i IN 1..12 LOOP
    org_id := gen_random_uuid();
    per_id := gen_random_uuid();
    INSERT INTO crm_organizations (id, nome) VALUES (org_id, empresas[((i+5) % array_length(empresas,1)) + 1]);
    INSERT INTO crm_persons (id, nome, email, telefone, organization_id) VALUES
      (per_id, contatos[((i+3) % array_length(contatos,1)) + 1], NULL, NULL, org_id);
    INSERT INTO crm_deals (
      pipeline_id, stage_id, organization_id, person_id, titulo, valor, owner_label, status,
      stage_entered_at, expected_close_date, origem
    ) VALUES (
      p_beta,
      stages_beta[((i-1) % 6) + 1],
      org_id, per_id,
      empresas[((i+5) % array_length(empresas,1)) + 1] || ' - Outbound',
      valores[((i+2) % array_length(valores,1)) + 1],
      'Milena',
      'open',
      now() - ((i * 3) || ' days')::interval,
      (now() + ((45 - i*2) || ' days')::interval)::date,
      'mock'
    );
  END LOOP;

  FOR i IN 1..8 LOOP
    org_id := gen_random_uuid();
    per_id := gen_random_uuid();
    INSERT INTO crm_organizations (id, nome) VALUES (org_id, empresas[((i+10) % array_length(empresas,1)) + 1]);
    INSERT INTO crm_persons (id, nome, email, telefone, organization_id) VALUES
      (per_id, contatos[((i+7) % array_length(contatos,1)) + 1], NULL, NULL, org_id);
    INSERT INTO crm_deals (
      pipeline_id, stage_id, organization_id, person_id, titulo, valor, owner_label, status,
      stage_entered_at, expected_close_date, origem
    ) VALUES (
      p_pos,
      stages_pos[((i-1) % 5) + 1],
      org_id, per_id,
      empresas[((i+10) % array_length(empresas,1)) + 1] || ' - Pós-venda',
      valores[((i+5) % array_length(valores,1)) + 1],
      'Felipe',
      'open',
      now() - ((i * 4) || ' days')::interval,
      NULL,
      'mock'
    );
  END LOOP;

  INSERT INTO crm_activities (deal_id, tipo, titulo, scheduled_at, concluida, owner_label)
  SELECT id,
    (ARRAY['ligacao','reuniao','email','tarefa']::crm_activity_type[])[(floor(random()*4)+1)::int],
    (ARRAY['Ligar para follow-up','Reunião de diagnóstico','Enviar proposta','Confirmar agenda'])[(floor(random()*4)+1)::int],
    now() + ((floor(random()*10)+1) || ' days')::interval,
    false,
    owner_label
  FROM crm_deals
  WHERE origem = 'mock'
  ORDER BY created_at
  LIMIT 25;
END $$;

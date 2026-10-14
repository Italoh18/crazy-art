-- ==============================================================================
-- MIGRAÇÃO / PREENCHIMENTO DE SLUG E ALT_TEXT PARA TODAS AS ARTES EXISTENTES NO D1
-- ==============================================================================
-- Execute no Cloudflare Dashboard: Workers & Pages > D1 SQL Console
-- Ou via Wrangler CLI: npx wrangler d1 execute <NOME_DO_BANCO> --file=./d1_populate_slugs.sql

UPDATE catalog SET slug = '043-brasil-geek-naruto-sport-manga', alt_text = COALESCE(alt_text, 'Estampa vetorial ninja estilo mangá com textura de esboços e elementos orientais para camiseta geek') WHERE id = 83;
UPDATE catalog SET slug = '042-brasil-waves-wathermark', alt_text = COALESCE(alt_text, 'Arte 042 - BRASIL WAVES WATHERMARK vetor para estamparia') WHERE id = 81;
UPDATE catalog SET slug = '041-brasil-canario-brush-soccer', alt_text = COALESCE(alt_text, 'Arte 041 - BRASIL CANARIO BRUSH SOCCER vetor para estamparia') WHERE id = 80;
UPDATE catalog SET slug = '040-arte-impactante-para-o-dia-internacional-da-mulher', alt_text = COALESCE(alt_text, 'Arte 040 Arte impactante para o Dia Internacional da Mulher ✊ vetor para estamparia') WHERE id = 72;
UPDATE catalog SET slug = '039-dia-dasmulheres-logo-mulher-flores-rosa-womens', alt_text = COALESCE(alt_text, 'Arte 039 DIA DASMULHERES LOGO MULHER FLORES ROSA WOMENS vetor para estamparia') WHERE id = 71;
UPDATE catalog SET slug = '038-terceirao-panter-claws-shirt-school', alt_text = COALESCE(alt_text, 'Arte 038 TERCEIRÃO PANTER CLAWS SHIRT SCHOOL vetor para estamparia') WHERE id = 70;
UPDATE catalog SET slug = '037-orient-black-dragon-fire-abstract-background', alt_text = COALESCE(alt_text, 'Arte 037 ORIENT BLACK DRAGON FIRE ABSTRACT BACKGROUND vetor para estamparia') WHERE id = 69;
UPDATE catalog SET slug = '036-terceirao-fenix-vermelha-fogo', alt_text = COALESCE(alt_text, 'Arte 036 TERCEIRÃO FENIX VERMELHA FOGO vetor para estamparia') WHERE id = 68;
UPDATE catalog SET slug = '035-jesus-in-yang-favela-black-and-white', alt_text = COALESCE(alt_text, 'Arte 035 JESUS IN YANG FAVELA BLACK AND WHITE vetor para estamparia') WHERE id = 67;
UPDATE catalog SET slug = '034-padroes-litras-verdes-com-entalhes-ouro-futebol', alt_text = COALESCE(alt_text, 'Arte 034 PADROES LITRAS VERDES COM ENTALHES OURO FUTEBOL vetor para estamparia') WHERE id = 66;
UPDATE catalog SET slug = '033-nono-ano-agua-viva-2026-roxo-grunged', alt_text = COALESCE(alt_text, 'Arte 033 NONO ANO AGUA VIVA 2026 ROXO GRUNGED vetor para estamparia') WHERE id = 65;
UPDATE catalog SET slug = '032-terceirao-tornado-e-smile', alt_text = COALESCE(alt_text, 'Arte 032 TERCEIRÃO TORNADO E SMILE vetor para estamparia') WHERE id = 64;
UPDATE catalog SET slug = '032-dragao-azul-branco-e-marcad-agua', alt_text = COALESCE(alt_text, 'Arte 032 dragao azul branco e marcad agua vetor para estamparia') WHERE id = 61;
UPDATE catalog SET slug = '031-coelho-futebol-escolar-longa', alt_text = COALESCE(alt_text, 'Arte 031 coelho futebol escolar longa vetor para estamparia') WHERE id = 60;
UPDATE catalog SET slug = '030-pink-panter-college-preto-e-rosa', alt_text = COALESCE(alt_text, 'Arte 030 pink panter college  preto e rosa vetor para estamparia') WHERE id = 56;
UPDATE catalog SET slug = '029-terceirao-dragao-roxo-com-fogo', alt_text = COALESCE(alt_text, 'Arte 029 terceirão dragão roxo com fogo vetor para estamparia') WHERE id = 55;
UPDATE catalog SET slug = '028-gratidao-dando-as-maos-salmo', alt_text = COALESCE(alt_text, 'Arte 028 gratidão dando as mãos salmo vetor para estamparia') WHERE id = 54;
UPDATE catalog SET slug = '027-spider-homem-black-com-teias', alt_text = COALESCE(alt_text, 'Arte 027 SPIDER HOMEM BLACK COM TEIAS vetor para estamparia') WHERE id = 53;
UPDATE catalog SET slug = '026-pipas-black-and-wite-grunged-favela', alt_text = COALESCE(alt_text, 'Arte 026 pipas black and wite grunged favela vetor para estamparia') WHERE id = 52;
UPDATE catalog SET slug = '025-heineken-verde-sons', alt_text = COALESCE(alt_text, 'Arte 025 CERVEJA VERDE SONS') WHERE id = 51;
UPDATE catalog SET slug = '024-volei-dragao-azul-e-branco', alt_text = COALESCE(alt_text, 'Arte 024 VOLEI DRAGÃO AZUL E BRANCO vetor para estamparia') WHERE id = 50;
UPDATE catalog SET slug = '023-terceirao-coelho-perna-mural', alt_text = COALESCE(alt_text, 'Arte 023 TERCEIRÃO COELHO PERNA MURAL vetor para estamparia') WHERE id = 47;
UPDATE catalog SET slug = '022-logo-amarelo-font-cheia-heavy', alt_text = COALESCE(alt_text, 'Arte 022 LOGO AMARELO FONT CHEIA HEAVY vetor para estamparia') WHERE id = 45;
UPDATE catalog SET slug = '021-logo-oval-folhas-tropicais', alt_text = COALESCE(alt_text, 'Arte 021 LOGO OVAL FOLHAS TROPICAIS vetor para estamparia') WHERE id = 44;
UPDATE catalog SET slug = '020-abada-amarelo-formas-tinta-e-cores', alt_text = COALESCE(alt_text, 'Arte 020 ABADA AMARELO FORMAS TINTA E CORES vetor para estamparia') WHERE id = 43;
UPDATE catalog SET slug = '019-abada-rosa-tropical-folhas-flores-e-tinta', alt_text = COALESCE(alt_text, 'Arte 019 ABADA ROSA TROPICAL FOLHAS FLORES E TINTA vetor para estamparia') WHERE id = 42;
UPDATE catalog SET slug = '018-abada-verde-tropical-folhas-e-manchas', alt_text = COALESCE(alt_text, 'Arte 018 ABADA VERDE TROPICAL FOLHAS E MANCHAS vetor para estamparia') WHERE id = 41;
UPDATE catalog SET slug = '017-abada-amarelo-gotas-e-circulos', alt_text = COALESCE(alt_text, 'Arte 017 ABADA AMARELO GOTAS E CIRCULOS vetor para estamparia') WHERE id = 40;
UPDATE catalog SET slug = '016-abada-roxo-amarelo-linhas-folhas-tropicais', alt_text = COALESCE(alt_text, 'Arte 016 ABADA ROXO AMARELO LINHAS FOLHAS TROPICAIS vetor para estamparia') WHERE id = 39;
UPDATE catalog SET slug = '015-abada-amarelo-roxo-disco-e-folhas', alt_text = COALESCE(alt_text, 'Arte 015 ABADA AMARELO ROXO DISCO E FOLHAS vetor para estamparia') WHERE id = 38;
UPDATE catalog SET slug = '014-abada-azul-mandala-pincel-cores', alt_text = COALESCE(alt_text, 'Arte 014 ABADA AZUL MANDALA PINCEL CORES vetor para estamparia') WHERE id = 37;
UPDATE catalog SET slug = '013-abada-roxo-cornetas', alt_text = COALESCE(alt_text, 'Arte 013 ABADA ROXO CORNETAS vetor para estamparia') WHERE id = 36;
UPDATE catalog SET slug = '012-abada-primavera-flores-rosa-amarelo', alt_text = COALESCE(alt_text, 'Arte 012 ABADA PRIMAVERA FLORES ROSA AMARELO vetor para estamparia') WHERE id = 35;
UPDATE catalog SET slug = '011-abada-azul-ondas-laranja-skate', alt_text = COALESCE(alt_text, 'Arte 011 ABADA AZUL ONDAS LARANJA SKATE vetor para estamparia') WHERE id = 34;
UPDATE catalog SET slug = '010-abada-amarelo-estrelas-e-penas', alt_text = COALESCE(alt_text, 'Arte 010 ABADA AMARELO ESTRELAS E PENAS vetor para estamparia') WHERE id = 33;
UPDATE catalog SET slug = '009-abada-preto-espirais-e-cores', alt_text = COALESCE(alt_text, 'Arte 009 ABADA PRETO ESPIRAIS E CORES vetor para estamparia') WHERE id = 32;
UPDATE catalog SET slug = '008-abada-azul-cores-linhas-formas-e-tentaculos', alt_text = COALESCE(alt_text, 'Arte 008 ABADA AZUL CORES LINHAS FORMAS E TENTACULOS vetor para estamparia') WHERE id = 31;
UPDATE catalog SET slug = '007-abada-horizonte-praia-rosa-roxa-com-palmeiras', alt_text = COALESCE(alt_text, 'Arte 007 ABADA HORIZONTE PRAIA ROSA ROXA COM PALMEIRAS vetor para estamparia') WHERE id = 30;
UPDATE catalog SET slug = '006-abada-folhas-e-fitas-azul-escuro', alt_text = COALESCE(alt_text, 'Arte 006 ABADA FOLHAS E FITAS AZUL ESCURO vetor para estamparia') WHERE id = 29;
UPDATE catalog SET slug = '005-abada-laranja-lagartos-deserto-e-formas', alt_text = COALESCE(alt_text, 'Arte 005 abada laranja lagartos deserto e formas vetor para estamparia') WHERE id = 28;
UPDATE catalog SET slug = '004-abada-flores-tropicais-e-argolas-rosas', alt_text = COALESCE(alt_text, 'Arte 004 abada flores tropicais e argolas rosas vetor para estamparia') WHERE id = 27;
UPDATE catalog SET slug = '003-abada-multi-cores-e-formas-agua', alt_text = COALESCE(alt_text, 'Arte 003 ABADA MULTI CORES E FORMAS AGUA vetor para estamparia') WHERE id = 26;
UPDATE catalog SET slug = '002-abada-azul-detalhes-verdes', alt_text = COALESCE(alt_text, 'Arte 002 abada azul detalhes verdes vetor para estamparia') WHERE id = 25;
UPDATE catalog SET slug = '001-abada-amarelo-gotas-e-efeitos', alt_text = COALESCE(alt_text, 'Arte 001 abada amarelo gotas e efeitos vetor para estamparia') WHERE id = 24;

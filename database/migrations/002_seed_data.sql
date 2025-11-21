-- EmotioxV3 - Seed Data
-- Version: 1.0.0
-- Description: Insert initial data for development and testing

-- ==========================================
-- SEED DATA FOR RESEARCH TYPES
-- ==========================================

-- Research Type: Interest Study
INSERT INTO research_types (name, description, default_modules, settings, is_active)
VALUES (
    'interest',
    'Investigación de intereses y preferencias generales',
    '[
        {
            "name": "Datos Demográficos",
            "description": "Información básica del participante",
            "order": 1,
            "is_default": true,
            "questions": [
                {
                    "type": "range",
                    "text": "¿Cuál es tu edad?",
                    "config": {
                        "min": 18,
                        "max": 100,
                        "step": 1,
                        "labels": {
                            "min": "18 años",
                            "max": "100 años"
                        },
                        "showValue": true
                    },
                    "required": true
                },
                {
                    "type": "text",
                    "text": "¿Cuál es tu género?",
                    "config": {
                        "placeholder": "Ej: Masculino, Femenino, Otro",
                        "maxLength": 50
                    },
                    "required": false
                }
            ]
        },
        {
            "name": "Intereses Generales",
            "description": "Preguntas sobre hobbies y preferencias",
            "order": 2,
            "is_default": true,
            "questions": [
                {
                    "type": "textarea",
                    "text": "Describe tus hobbies principales",
                    "config": {
                        "placeholder": "Escribe aquí tus hobbies...",
                        "rows": 5,
                        "maxLength": 500
                    },
                    "required": false
                }
            ]
        }
    ]'::jsonb,
    '{
        "allowCustomModules": true,
        "requireAllDefaults": false
    }'::jsonb,
    true
)
ON CONFLICT (name) DO NOTHING;

-- Research Type: Biometric Study
INSERT INTO research_types (name, description, default_modules, settings, is_active)
VALUES (
    'biometric',
    'Estudios biométricos y de salud',
    '[
        {
            "name": "Datos Biométricos Básicos",
            "description": "Medidas físicas del participante",
            "order": 1,
            "is_default": true,
            "questions": [
                {
                    "type": "range",
                    "text": "Altura (cm)",
                    "config": {
                        "min": 100,
                        "max": 250,
                        "step": 1,
                        "showValue": true
                    },
                    "required": true
                },
                {
                    "type": "range",
                    "text": "Peso (kg)",
                    "config": {
                        "min": 30,
                        "max": 200,
                        "step": 0.5,
                        "showValue": true
                    },
                    "required": true
                }
            ]
        },
        {
            "name": "Estado de Salud",
            "description": "Información sobre salud general",
            "order": 2,
            "is_default": false,
            "questions": [
                {
                    "type": "range",
                    "text": "¿Cómo calificarías tu estado de salud general?",
                    "config": {
                        "min": 1,
                        "max": 10,
                        "step": 1,
                        "labels": {
                            "min": "Muy malo",
                            "max": "Excelente"
                        },
                        "showValue": true
                    },
                    "required": true
                }
            ]
        }
    ]'::jsonb,
    '{
        "allowCustomModules": true,
        "requireAllDefaults": false
    }'::jsonb,
    true
)
ON CONFLICT (name) DO NOTHING;

-- Research Type: Visual Preference Study
INSERT INTO research_types (name, description, default_modules, settings, is_active)
VALUES (
    'visual_preference',
    'Estudios de preferencias visuales y estéticas',
    '[
        {
            "name": "Preferencias de Imágenes",
            "description": "Selección y ranking de imágenes",
            "order": 1,
            "is_default": true,
            "questions": [
                {
                    "type": "image_preference",
                    "text": "Selecciona tus imágenes favoritas",
                    "config": {
                        "images": [],
                        "selectionType": "multiple",
                        "minSelections": 1,
                        "maxSelections": 3
                    },
                    "required": true
                }
            ]
        },
        {
            "name": "Zonas de Interés",
            "description": "Click en áreas de interés en imágenes",
            "order": 2,
            "is_default": false,
            "questions": [
                {
                    "type": "image_hitzone",
                    "text": "Haz click en las áreas que más te llamen la atención",
                    "config": {
                        "imageUrl": "",
                        "allowMultiple": true,
                        "zones": []
                    },
                    "required": true
                }
            ]
        }
    ]'::jsonb,
    '{
        "allowCustomModules": true,
        "requireAllDefaults": false
    }'::jsonb,
    true
)
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- SEED DATA FOR ANALYSIS MODULES
-- ==========================================

INSERT INTO analysis_modules (name, description, module_type, config, is_active)
VALUES 
(
    'Distribución de Respuestas',
    'Muestra la distribución de respuestas para preguntas tipo range',
    'distribution_chart',
    '{
        "chartType": "bar",
        "supportedQuestionTypes": ["range"]
    }'::jsonb,
    true
),
(
    'Nube de Palabras',
    'Genera nube de palabras para respuestas de texto',
    'word_cloud',
    '{
        "maxWords": 100,
        "supportedQuestionTypes": ["text", "textarea"]
    }'::jsonb,
    true
),
(
    'Mapa de Calor',
    'Visualiza clicks en imágenes como mapa de calor',
    'heatmap',
    '{
        "supportedQuestionTypes": ["image_hitzone"]
    }'::jsonb,
    true
),
(
    'Ranking de Preferencias',
    'Muestra ranking de imágenes más seleccionadas',
    'preference_ranking',
    '{
        "supportedQuestionTypes": ["image_preference"]
    }'::jsonb,
    true
),
(
    'Estadísticas Básicas',
    'Media, mediana, moda, desviación estándar',
    'basic_stats',
    '{
        "supportedQuestionTypes": ["range"]
    }'::jsonb,
    true
)
ON CONFLICT DO NOTHING;

-- ==========================================
-- SUCCESS MESSAGE
-- ==========================================
DO $$
BEGIN
    RAISE NOTICE '✓ Seed data inserted successfully!';
    RAISE NOTICE '✓ 3 research types created';
    RAISE NOTICE '✓ 5 analysis modules created';
END $$;

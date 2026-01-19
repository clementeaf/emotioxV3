-- EmotioxV3 - Seed Data (MySQL)
-- Version: 1.0.0
-- Description: Insert initial data for development and testing

-- ==========================================
-- SEED DATA FOR RESEARCH TYPES
-- ==========================================

-- Research Type: Interest Study
INSERT INTO research_types (id, name, description, default_modules, settings, is_active)
VALUES (
    UUID(),
    'interest',
    'Investigación de intereses y preferencias generales',
    JSON_ARRAY(
        JSON_OBJECT(
            'name', 'Datos Demográficos',
            'description', 'Información básica del participante',
            'order', 1,
            'is_default', true,
            'questions', JSON_ARRAY(
                JSON_OBJECT(
                    'type', 'range',
                    'text', '¿Cuál es tu edad?',
                    'config', JSON_OBJECT(
                        'min', 18,
                        'max', 100,
                        'step', 1,
                        'labels', JSON_OBJECT('min', '18 años', 'max', '100 años'),
                        'showValue', true
                    ),
                    'required', true
                ),
                JSON_OBJECT(
                    'type', 'text',
                    'text', '¿Cuál es tu género?',
                    'config', JSON_OBJECT('placeholder', 'Ej: Masculino, Femenino, Otro', 'maxLength', 50),
                    'required', false
                )
            )
        ),
        JSON_OBJECT(
            'name', 'Intereses Generales',
            'description', 'Preguntas sobre hobbies y preferencias',
            'order', 2,
            'is_default', true,
            'questions', JSON_ARRAY(
                JSON_OBJECT(
                    'type', 'textarea',
                    'text', 'Describe tus hobbies principales',
                    'config', JSON_OBJECT('placeholder', 'Escribe aquí tus hobbies...', 'rows', 5, 'maxLength', 500),
                    'required', false
                )
            )
        )
    ),
    JSON_OBJECT('allowCustomModules', true, 'requireAllDefaults', false),
    true
)
ON DUPLICATE KEY UPDATE name=name;

-- Research Type: Biometric Study
INSERT INTO research_types (id, name, description, default_modules, settings, is_active)
VALUES (
    UUID(),
    'biometric',
    'Estudios biométricos y de salud',
    JSON_ARRAY(
        JSON_OBJECT(
            'name', 'Datos Biométricos Básicos',
            'description', 'Medidas físicas del participante',
            'order', 1,
            'is_default', true,
            'questions', JSON_ARRAY(
                JSON_OBJECT(
                    'type', 'range',
                    'text', 'Altura (cm)',
                    'config', JSON_OBJECT('min', 100, 'max', 250, 'step', 1, 'showValue', true),
                    'required', true
                ),
                JSON_OBJECT(
                    'type', 'range',
                    'text', 'Peso (kg)',
                    'config', JSON_OBJECT('min', 30, 'max', 200, 'step', 0.5, 'showValue', true),
                    'required', true
                )
            )
        ),
        JSON_OBJECT(
            'name', 'Estado de Salud',
            'description', 'Información sobre salud general',
            'order', 2,
            'is_default', false,
            'questions', JSON_ARRAY(
                JSON_OBJECT(
                    'type', 'range',
                    'text', '¿Cómo calificarías tu estado de salud general?',
                    'config', JSON_OBJECT(
                        'min', 1,
                        'max', 10,
                        'step', 1,
                        'labels', JSON_OBJECT('min', 'Muy malo', 'max', 'Excelente'),
                        'showValue', true
                    ),
                    'required', true
                )
            )
        )
    ),
    JSON_OBJECT('allowCustomModules', true, 'requireAllDefaults', false),
    true
)
ON DUPLICATE KEY UPDATE name=name;

-- Research Type: Visual Preference Study
INSERT INTO research_types (id, name, description, default_modules, settings, is_active)
VALUES (
    UUID(),
    'visual_preference',
    'Estudios de preferencias visuales y estéticas',
    JSON_ARRAY(
        JSON_OBJECT(
            'name', 'Preferencias de Imágenes',
            'description', 'Selección y ranking de imágenes',
            'order', 1,
            'is_default', true,
            'questions', JSON_ARRAY(
                JSON_OBJECT(
                    'type', 'image_preference',
                    'text', 'Selecciona tus imágenes favoritas',
                    'config', JSON_OBJECT(
                        'images', JSON_ARRAY(),
                        'selectionType', 'multiple',
                        'minSelections', 1,
                        'maxSelections', 3
                    ),
                    'required', true
                )
            )
        ),
        JSON_OBJECT(
            'name', 'Zonas de Interés',
            'description', 'Click en áreas de interés en imágenes',
            'order', 2,
            'is_default', false,
            'questions', JSON_ARRAY(
                JSON_OBJECT(
                    'type', 'image_hitzone',
                    'text', 'Haz click en las áreas que más te llamen la atención',
                    'config', JSON_OBJECT('imageUrl', '', 'allowMultiple', true, 'zones', JSON_ARRAY()),
                    'required', true
                )
            )
        )
    ),
    JSON_OBJECT('allowCustomModules', true, 'requireAllDefaults', false),
    true
)
ON DUPLICATE KEY UPDATE name=name;

-- ==========================================
-- SEED DATA FOR ANALYSIS MODULES
-- ==========================================

INSERT INTO analysis_modules (id, name, description, module_type, config, is_active)
VALUES 
(UUID(), 'Distribución de Respuestas', 'Muestra la distribución de respuestas para preguntas tipo range', 'distribution_chart', JSON_OBJECT('chartType', 'bar', 'supportedQuestionTypes', JSON_ARRAY('range')), true),
(UUID(), 'Nube de Palabras', 'Genera nube de palabras para respuestas de texto', 'word_cloud', JSON_OBJECT('maxWords', 100, 'supportedQuestionTypes', JSON_ARRAY('text', 'textarea')), true),
(UUID(), 'Mapa de Calor', 'Visualiza clicks en imágenes como mapa de calor', 'heatmap', JSON_OBJECT('supportedQuestionTypes', JSON_ARRAY('image_hitzone')), true),
(UUID(), 'Ranking de Preferencias', 'Muestra ranking de imágenes más seleccionadas', 'preference_ranking', JSON_OBJECT('supportedQuestionTypes', JSON_ARRAY('image_preference')), true),
(UUID(), 'Estadísticas Básicas', 'Media, mediana, moda, desviación estándar', 'basic_stats', JSON_OBJECT('supportedQuestionTypes', JSON_ARRAY('range')), true)
ON DUPLICATE KEY UPDATE name=name;

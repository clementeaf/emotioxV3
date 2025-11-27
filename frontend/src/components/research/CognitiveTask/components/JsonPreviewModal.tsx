import React, { useEffect, useRef, useState } from 'react';

interface JsonPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  jsonData: string;
  pendingAction: 'save' | 'preview' | null;
  hasValidationErrors?: boolean;
}

/**
 * Componente para mostrar una vista previa visual del formulario de tareas cognitivas
 */
export const JsonPreviewModal: React.FC<JsonPreviewModalProps> = ({
  isOpen,
  onClose,
  onContinue,
  jsonData,
  pendingAction,
  hasValidationErrors = false
}) => {
  const [showRawJson, setShowRawJson] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<any>({ questions: [] });
  const [questionsHtml, setQuestionsHtml] = useState('');

  // Referencia a los botones de navegación
  const navButtonsRef = useRef<HTMLDivElement>(null);

  // Mover la lógica de parseo JSON a un useEffect para evitar actualizar estado durante el renderizado
  useEffect(() => {
    let newParsedData: any = { questions: [] };
    let newQuestionsHtml = '';

    try {
      // Verificar que jsonData no sea vacío o inválido antes de intentar parsearlo
      if (!jsonData || jsonData.trim() === '') {
        // En lugar de lanzar un error, simplemente establecemos un mensaje de error
        setParseError('Los datos JSON están vacíos');
        setParsedData({ questions: [] });
        setQuestionsHtml('');
        return; // Salimos temprano de la función
      }

      newParsedData = JSON.parse(jsonData);

      // Función para determinar si una pregunta ha sido modificada
      const isQuestionModified = (question: any) => {
        // Considera una pregunta como modificada si tiene alguna propiedad
        // distinta a los valores predeterminados o si tiene archivos o elecciones
        return (
          question.title !== `Pregunta ${question.id}` ||
          question.description !== '' ||
          (question.choices && question.choices.length > 0) ||
          (question.files && question.files.length > 0)
        );
      };

      // Función para determinar si una pregunta se enviará
      // (requiere archivos para ciertos tipos de preguntas)
      const willQuestionBeSent = (question: any) => {
        const requiresFiles = ['navigation_flow', 'preference_test'].includes(question.type);

        if (requiresFiles) {
          return question.files && question.files.length > 0;
        }

        return true;
      };

      // Genera el HTML para cada pregunta
      if (newParsedData.questions && Array.isArray(newParsedData.questions)) {
        newQuestionsHtml = newParsedData.questions
          .map((question: any, index: number) => {
            const isModified = isQuestionModified(question);
            const willSend = willQuestionBeSent(question);

            // Determina el estilo de la tarjeta
            let cardClass = 'question-card';
            if (!isModified) {cardClass += ' red-card';}
            else if (!willSend) {cardClass += ' yellow-card';}
            else {cardClass += ' blue-card';}

            // Función para renderizar las opciones en preguntas de selección
            const renderChoices = (choices: any[]) => {
              if (!choices || choices.length === 0) {return '<p class="empty-notice">Sin opciones</p>';}

              return `
                <div class="choices-list">
                  ${choices.map((choice, i) => `
                    <div class="choice-item">
                      <span class="choice-number">${i + 1}.</span>
                      <span class="choice-text">${choice.text || 'Sin texto'}</span>
                    </div>
                  `).join('')}
                </div>
              `;
            };

            // Función para mostrar archivos
            const renderFiles = (files: any[]) => {
              if (!files || files.length === 0) {return '<p class="empty-notice">Sin archivos</p>';}
              return `
                <div class="files-list" style="display: flex; flex-direction: column; align-items: center; gap: 2.5rem;">
                  ${files.map(file => {
    // Calcular overlays de hitzones si existen
    let overlays = '';
    if (Array.isArray(file.hitZones) && file.hitZones.length > 0) {
      overlays = file.hitZones.map((hz: any) => {
        // Asumimos que las coords están en px y relativas al tamaño natural de la imagen
        // Usar porcentajes para el overlay visual
        const left = ((hz.region?.x ?? hz.x) / (file.width || 1000)) * 100;
        const top = ((hz.region?.y ?? hz.y) / (file.height || 1000)) * 100;
        const width = ((hz.region?.width ?? hz.width) / (file.width || 1000)) * 100;
        const height = ((hz.region?.height ?? hz.height) / (file.height || 1000)) * 100;
        return `<div style="position:absolute; left:${left}%; top:${top}%; width:${width}%; height:${height}%; background:rgba(34,197,94,0.25); border:2px solid #22c55e; border-radius:6px;"></div>`;
      }).join('');
    }
    return `
                      <div class="file-item" style="position:relative; display:flex; flex-direction:column; align-items:center; margin-bottom:2rem;">
                        <div style="position:relative; width:420px; max-width:90vw; aspect-ratio:16/9; background:#f8fafc; border-radius:10px; overflow:hidden; box-shadow:0 2px 12px #0001;">
                          <img src="${file.url}" alt="${file.name || 'Archivo'}" style="width:100%; height:100%; object-fit:contain; display:block; background:#f8fafc;" />
                          ${overlays}
                          ${!file.hitZones || file.hitZones.length === 0 ? '<div style=\'position:absolute;top:10px;right:10px; background:#f3f4f6; color:#64748b; border-radius:12px; padding:2px 12px; font-size:0.9em; border:1px solid #d1d5db;\'>Sin hitzone configurado</div>' : ''}
                        </div>
                        <div style="margin-top:1rem; font-size:1.05em; color:#334155; font-weight:500;">${file.name || 'Archivo sin nombre'}</div>
                      </div>
                    `;
  }).join('')}
                </div>
                <div style="margin-top:1.5rem; text-align:center; color:#64748b; font-size:1.05em;">Haz clic en el área correcta para continuar (solo ejemplo visual, no interactivo)</div>
              `;
            };

            // Función para obtener la etiqueta del tipo de pregunta
            const getQuestionTypeLabel = (type: string) => {
              const typeMap: Record<string, string> = {
                'short_text': 'Texto corto',
                'long_text': 'Texto largo',
                'single_choice': 'Opción única',
                'multiple_choice': 'Opción múltiple',
                'linear_scale': 'Escala lineal',
                'ranking': 'Clasificación',
                'navigation_flow': 'Flujo de navegación',
                'preference_test': 'Prueba de preferencia'
              };

              return typeMap[type] || type;
            };

            return `
              <div class="${cardClass}" id="question-${question.id}">
                <div class="question-header" data-id="${question.id}">
                  <h3>Pregunta ${index + 1}: ${question.title}</h3>
                  <span class="question-type">${getQuestionTypeLabel(question.type)}</span>
                </div>

                <div class="question-body">
                  <div class="detail-row">
                    <strong>Descripción:</strong>
                    <span>${question.description || '<span class="empty-value">Sin descripción</span>'}</span>
                  </div>

                  <div class="detail-row">
                    <strong>Obligatoria:</strong>
                    <span>${question.required ? 'Sí' : 'No'}</span>
                  </div>

                  ${['single_choice', 'multiple_choice'].includes(question.type) ? `
                    <div class="detail-section">
                      <strong>Opciones:</strong>
                      ${renderChoices(question.choices)}
                    </div>
                  ` : ''}

                  ${['navigation_flow', 'preference_test'].includes(question.type) ? `
                    <div class="detail-section">
                      <strong>Archivos:</strong>
                      ${renderFiles(question.files)}
                    </div>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('');
      }

      // Actualizar estados
      setParseError(null);
      setParsedData(newParsedData);
      setQuestionsHtml(newQuestionsHtml);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Error al procesar los datos JSON');
      setParsedData({ questions: [] });
      setQuestionsHtml('');
    }
  }, [jsonData]); // Solo se ejecuta cuando cambia jsonData

  // Hooks para agregar funcionalidad de scroll a los botones de navegación
  useEffect(() => {
    // La función para gestionar clicks en los botones de navegación
    const handleNavButtonClick = (e: Event) => {
      const target = e.currentTarget as HTMLElement;
      const questionId = target.getAttribute('data-question');
      if (questionId) {
        const questionElement = document.getElementById(`question-${questionId}`);
        if (questionElement) {
          questionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });

          // Actualizar botón activo
          const allButtons = document.querySelectorAll('.nav-button');
          allButtons.forEach(btn => btn.classList.remove('active'));
          target.classList.add('active');
        }
      }
    };

    // Solo configurar el event listener si el modal está abierto
    if (isOpen) {
      // Usar setTimeout para asegurarnos que el DOM ya está renderizado
      const timerId = setTimeout(() => {
        const navButtons = document.querySelectorAll('.nav-button');
        navButtons.forEach(button => {
          button.addEventListener('click', handleNavButtonClick);
        });
      }, 100);

      // Cleanup function para eliminar los event listeners
      return () => {
        clearTimeout(timerId);
        const navButtons = document.querySelectorAll('.nav-button');
        navButtons.forEach(button => {
          button.removeEventListener('click', handleNavButtonClick);
        });
      };
    }

    // Función de limpieza vacía si el modal no está abierto
    return () => {};
  }, [isOpen]); // Solo re-ejecutar si cambia isOpen

  // Retorno temprano
  if (!isOpen) {return null;}

  // Función para continuar con la acción
  const handleContinue = () => {
    // Si la acción es previsualizar, abrimos una nueva ventana con el HTML
    if (pendingAction === 'preview') {
      const previewWindow = window.open('', '_blank');

      if (previewWindow) {
        try {
          // Inicializar la ventana con un mensaje de carga
          previewWindow.document.write('<html><body><h1>Cargando vista previa...</h1></body></html>');

          // Contenido HTML para la vista previa
          previewWindow.document.write(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Vista previa de tarea cognitiva</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                  line-height: 1.6;
                  color: #333;
                  margin: 0;
                  padding: 0;
                  background-color: #f8f9fa;
                }
                .container {
                  max-width: 800px;
                  margin: 2rem auto;
                  padding: 2rem;
                  background-color: #fff;
                  border-radius: 8px;
                  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                }
                header {
                  margin-bottom: 2rem;
                  text-align: center;
                }
                h1 {
                  color: #2563eb;
                  margin-bottom: 0.5rem;
                }
                .description {
                  color: #64748b;
                  margin-bottom: 2rem;
                }
                form {
                  display: flex;
                  flex-direction: column;
                  gap: 2rem;
                }
                .question {
                  padding: 1.5rem;
                  background-color: #f8fafc;
                  border-radius: 8px;
                  border: 1px solid #e2e8f0;
                }
                .question-number {
                  font-size: 0.875rem;
                  color: #64748b;
                  margin-bottom: 0.5rem;
                }
                .question-title {
                  font-size: 1.25rem;
                  font-weight: 600;
                  margin-bottom: 1rem;
                  color: #0f172a;
                }
                .question-description {
                  margin-bottom: 1rem;
                  color: #475569;
                }
                .required {
                  color: #ef4444;
                  margin-left: 0.25rem;
                }
                /* Estilos para campos de formulario */
                .form-field {
                  margin-top: 1rem;
                }
                .sr-only {
                  position: absolute;
                  width: 1px;
                  height: 1px;
                  padding: 0;
                  margin: -1px;
                  overflow: hidden;
                  clip: rect(0, 0, 0, 0);
                  white-space: nowrap;
                  border-width: 0;
                }
                .input-text, .textarea {
                  width: 100%;
                  padding: 0.75rem;
                  border: 1px solid #cbd5e1;
                  border-radius: 4px;
                  font-size: 1rem;
                }
                /* Estilos para grupos de opciones */
                .choices-container {
                  border: none;
                  padding: 0;
                  margin: 0;
                }
                .choices {
                  display: flex;
                  flex-direction: column;
                  gap: 0.75rem;
                  margin-top: 1rem;
                }
                .choice {
                  margin: 0;
                }
                .choice-label {
                  display: flex;
                  align-items: center;
                  gap: 0.5rem;
                  cursor: pointer;
                }
                .choice-text {
                  font-size: 1rem;
                  color: #334155;
                }
                /* Estilos para escalas */
                .scale-container {
                  border: none;
                  padding: 0;
                  margin: 0;
                }
                .linear-scale {
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(40px, 1fr));
                  gap: 0.5rem;
                  margin-top: 1rem;
                }
                .scale-option {
                  text-align: center;
                }
                .scale-label {
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  cursor: pointer;
                }
                .scale-text {
                  font-size: 0.875rem;
                  color: #64748b;
                  margin-top: 0.25rem;
                }
                .radio-input, .checkbox-input, .scale-input {
                  margin: 0;
                }
                /* Otros estilos existentes */
                .submit-btn {
                  margin-top: 2rem;
                  padding: 0.75rem 1.5rem;
                  background-color: #2563eb;
                  color: white;
                  border: none;
                  border-radius: 4px;
                  font-size: 1rem;
                  font-weight: 500;
                  cursor: pointer;
                  align-self: center;
                }
                .submit-btn:hover {
                  background-color: #1d4ed8;
                }
                .ranking-item {
                  display: flex;
                  align-items: center;
                  gap: 0.75rem;
                  padding: 0.75rem;
                  background-color: #fff;
                  border: 1px solid #e2e8f0;
                  border-radius: 4px;
                  margin-bottom: 0.5rem;
                }
                .ranking-number {
                  font-weight: 600;
                  color: #64748b;
                }
                .file-preview {
                  display: flex;
                  flex-direction: column;
                  gap: 1rem;
                  margin-top: 1rem;
                }
                .file-item {
                  text-align: center;
                }
                .file-item img {
                  max-width: 100%;
                  border-radius: 4px;
                  border: 1px solid #e2e8f0;
                }
                .file-name {
                  font-size: 0.875rem;
                  color: #64748b;
                  margin-top: 0.5rem;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <header>
                  <h1>${parsedData.title || 'Tarea cognitiva'}</h1>
                  <div class="description">${parsedData.description || 'Complete las siguientes preguntas.'}</div>
                </header>

                <form>
                  ${parsedData.questions?.map((q: any, index: number) => {
    let questionContent = '';

    switch(q.type) {
      case 'short_text':
        questionContent = `
                          <div class="form-field">
                            <label class="sr-only">Respuesta de texto corto</label>
                            <input type="text" name="question-${q.id}" placeholder="${q.answerPlaceholder || 'Tu respuesta'}" class="input-text">
                          </div>
                        `;
        break;
      case 'long_text':
        questionContent = `
                          <div class="form-field">
                            <label class="sr-only">Respuesta de texto largo</label>
                            <textarea name="question-${q.id}" rows="4" placeholder="${q.answerPlaceholder || 'Tu respuesta'}" class="textarea"></textarea>
                          </div>
                        `;
        break;
      case 'single_choice':
        questionContent = `
                          <fieldset class="choices-container">
                            <legend class="sr-only">Seleccione una opción</legend>
                            <div class="choices">
                              ${q.choices?.map((choice: any, choiceIndex: number) => `
                                <div class="choice">
                                  <label class="choice-label">
                                    <input type="radio" name="question-${q.id}" value="${choiceIndex}" class="radio-input">
                                    <span class="choice-text">${choice.text || `Opción ${choiceIndex + 1}`}</span>
                                  </label>
                                </div>
                              `).join('') || '<p>No hay opciones disponibles</p>'}
                            </div>
                          </fieldset>
                        `;
        break;
      case 'multiple_choice':
        questionContent = `
                          <fieldset class="choices-container">
                            <legend class="sr-only">Seleccione una o más opciones</legend>
                            <div class="choices">
                              ${q.choices?.map((choice: any, choiceIndex: number) => `
                                <div class="choice">
                                  <label class="choice-label">
                                    <input type="checkbox" name="question-${q.id}" value="${choiceIndex}" class="checkbox-input">
                                    <span class="choice-text">${choice.text || `Opción ${choiceIndex + 1}`}</span>
                                  </label>
                                </div>
                              `).join('') || '<p>No hay opciones disponibles</p>'}
                            </div>
                          </fieldset>
                        `;
        break;
      case 'linear_scale':
        const scaleStart = q.scaleConfig?.startValue || 1;
        const scaleEnd = q.scaleConfig?.endValue || 5;
        const startLabel = q.scaleConfig?.startLabel || '';
        const endLabel = q.scaleConfig?.endLabel || '';
        
        questionContent = `
                          <fieldset class="scale-container">
                            <legend class="sr-only">Seleccione un valor en la escala</legend>
                            <div class="linear-scale">
                              ${Array.from({ length: scaleEnd - scaleStart + 1 }, (_, i) => scaleStart + i).map(value => `
                                <div class="scale-option">
                                  <label class="scale-label">
                                    <input type="radio" name="question-${q.id}" value="${value}" class="scale-input">
                                    <span class="scale-text">${value}</span>
                                  </label>
                                </div>
                              `).join('')}
                            </div>
                            ${startLabel || endLabel ? `
                              <div class="scale-labels" style="display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 0.875rem; color: #64748b;">
                                <span>${startLabel}</span>
                                <span>${endLabel}</span>
                              </div>
                            ` : ''}
                          </fieldset>
                        `;
        break;
      case 'ranking':
        questionContent = `
                          <div class="ranking">
                            ${q.choices?.map((choice: any, choiceIndex: number) => `
                              <div class="ranking-item">
                                <span class="ranking-number">${choiceIndex + 1}</span>
                                <span>${choice.text || `Opción ${choiceIndex + 1}`}</span>
                              </div>
                            `).join('')}
                          </div>
                          <div style="margin-top: 20px;">
                            <input type="text" placeholder="Tu respuesta">
                          </div>
                        `;
        break;
      case 'navigation_flow':
        const navigationFiles = q.files || [];
        if (navigationFiles.length > 0) {
          questionContent = `
                          <div class="file-preview">
                            <div style="text-align: center; margin-bottom: 1rem;">
                              <h4 style="margin-bottom: 0.5rem; color: #374151;">Imagen de navegación</h4>
                              <p style="color: #6b7280; font-size: 0.875rem;">Haz clic en las áreas marcadas para continuar</p>
                            </div>
                            ${navigationFiles.map((file: any, fileIndex: number) => `
                              <div class="file-item">
                                <img src="${file.url || file.preview}" alt="${file.name || 'Imagen de navegación'}" 
                                     style="max-width: 100%; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer;">
                                <div class="file-name">${file.name || `Imagen ${fileIndex + 1}`}</div>
                                ${file.hitZones && file.hitZones.length > 0 ? `
                                  <div style="margin-top: 0.5rem; font-size: 0.75rem; color: #6b7280;">
                                    ${file.hitZones.length} zona(s) de clic configurada(s)
                                  </div>
                                ` : ''}
                              </div>
                            `).join('')}
                          </div>
                        `;
        } else {
          questionContent = `
                          <div style="text-align: center; padding: 2rem; background: #f9fafb; border: 2px dashed #d1d5db; border-radius: 8px;">
                            <p style="color: #6b7280; margin: 0;">No hay imágenes configuradas para el flujo de navegación</p>
                          </div>
                        `;
        }
        break;
      case 'preference_test':
        const preferenceFiles = q.files || [];
        if (preferenceFiles.length >= 2) {
          questionContent = `
                          <div class="file-preview">
                            <div style="text-align: center; margin-bottom: 1rem;">
                              <h4 style="margin-bottom: 0.5rem; color: #374151;">Prueba de Preferencia A/B</h4>
                              <p style="color: #6b7280; font-size: 0.875rem;">Selecciona la opción que prefieras</p>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; max-width: 600px; margin: 0 auto;">
                              ${preferenceFiles.slice(0, 2).map((file: any, fileIndex: number) => `
                                <div class="file-item" style="text-align: center;">
                                  <div style="border: 2px solid #e5e7eb; border-radius: 8px; padding: 1rem; cursor: pointer; transition: border-color 0.2s;" 
                                       onmouseover="this.style.borderColor='#3b82f6'" 
                                       onmouseout="this.style.borderColor='#e5e7eb'">
                                    <img src="${file.url || file.preview}" alt="${file.name || 'Opción A/B'}" 
                                         style="max-width: 100%; border-radius: 4px;">
                                    <div class="file-name" style="margin-top: 0.5rem; font-weight: 500;">
                                      Opción ${fileIndex === 0 ? 'A' : 'B'}
                                    </div>
                                  </div>
                                </div>
                              `).join('')}
                            </div>
                          </div>
                        `;
        } else {
          questionContent = `
                          <div style="text-align: center; padding: 2rem; background: #f9fafb; border: 2px dashed #d1d5db; border-radius: 8px;">
                            <p style="color: #6b7280; margin: 0;">Se necesitan al menos 2 imágenes para la prueba de preferencia</p>
                          </div>
                        `;
        }
        break;
      default:
        questionContent = '<p style="color: #666;">Tipo de pregunta no compatible con la vista previa.</p>';
    }

    return `
                      <div class="question">
                        <div class="question-number">Pregunta ${index + 1}</div>
                        <div class="question-title">
                          ${q.title || 'Pregunta sin título'}
                          ${q.required ? '<span class="required">*</span>' : ''}
                        </div>
                        ${q.description ? `<div class="question-description">${q.description}</div>` : ''}
                        ${questionContent}
                      </div>
                    `;
  }).join('')}

                  <button type="button" class="submit-btn">Enviar respuestas</button>
                </form>
              </div>
            </body>
            </html>
          `);
          previewWindow.document.close();
        } catch (error) {
          previewWindow.document.write(`
            <html><body>
              <h1>Error al generar la vista previa</h1>
              <p>Ocurrió un error al procesar los datos del formulario.</p>
            </body></html>
          `);
          previewWindow.document.close();
        }
      }
    }

    // Continuar con la acción
    onContinue();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">
            Vista previa del formulario
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            &times;
          </button>
        </div>
        <div className="p-6 overflow-auto flex-grow flex items-center justify-center">
          {/* Contenido eliminado */}
        </div>
        <div className="p-4 border-t bg-gray-50 flex justify-end items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 bg-white rounded text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

import { processFilesWithUrls } from '../../../utils/s3-url.utils';
import { NavigationFlowTask } from '../cognitive/NavigationFlowTask';
import PreferenceTestTask from '../cognitive/PreferenceTestTask';
import { QuestionComponent } from '../QuestionComponent';
import { RankingList } from '../components/RankingList';
import { CognitiveRendererArgs, ImageFile, ScaleConfig } from './CognitiveTypes';

export const cognitiveRenderers = {
  cognitive: ({ contentConfiguration, currentQuestionKey, formData }: CognitiveRendererArgs) => (
    <QuestionComponent
      question={{
        title: String(contentConfiguration?.title || 'Pregunta Cognitive Task'),
        questionKey: currentQuestionKey,
        type: currentQuestionKey,
        config: contentConfiguration as Record<string, unknown>,
        choices: Array.isArray(contentConfiguration?.choices) 
          ? contentConfiguration.choices.map(choice => ({
              ...choice,
              label: choice.label || choice.text,
              value: choice.value || choice.id
            }))
          : [],
        description: String(contentConfiguration?.description || '')
      }}
      currentStepKey={currentQuestionKey}
      initialFormData={formData}
    />
  ),

  cognitive_navigation_flow: ({ contentConfiguration, currentQuestionKey }: CognitiveRendererArgs) => {
    
    const filesWithUrls = Array.isArray(contentConfiguration?.files)
      ? processFilesWithUrls(contentConfiguration.files as ImageFile[])
      : [] as ImageFile[];

    return (
      <NavigationFlowTask
        stepConfig={{
          id: currentQuestionKey,
          type: 'cognitive_navigation_flow',
          title: String(contentConfiguration?.title || 'Flujo de Navegación'),
          description: String(contentConfiguration?.description || '¿En cuál de las siguientes pantallas encuentras el objetivo indicado?'),
          files: filesWithUrls as ImageFile[]
        }}
        currentQuestionKey={currentQuestionKey}
      />
    );
  },

  cognitive_preference_test: ({ contentConfiguration, currentQuestionKey }: CognitiveRendererArgs) => {
    const filesWithUrls = Array.isArray(contentConfiguration?.files)
      ? processFilesWithUrls(contentConfiguration.files as ImageFile[])
      : [] as ImageFile[];

    return (
      <PreferenceTestTask
        stepConfig={{
          id: currentQuestionKey,
          type: 'cognitive_preference_test',
          title: String(contentConfiguration?.title || 'Test de Preferencia'),
          description: String(contentConfiguration?.description || 'Selecciona tu preferencia'),
          files: filesWithUrls as ImageFile[]
        }}
        currentQuestionKey={currentQuestionKey}
      />
    );
  },

  cognitive_ranking: ({ contentConfiguration, currentQuestionKey, formData }: CognitiveRendererArgs) => {
    const rankingItems = Array.isArray(contentConfiguration?.choices)
      ? contentConfiguration.choices
          .map((choice: Record<string, unknown>) => String(choice.text || choice.id || ''))
          .filter(item => item)
      : [] as string[];

    return (
      <div className='flex flex-col items-center justify-center h-full w-full gap-6 p-[2.5%] sm:p-[3%]'>
        {contentConfiguration?.title && String(contentConfiguration.title).trim() !== '' && (
          <h1 className='text-2xl md:text-3xl font-bold text-gray-900 text-center w-full max-w-4xl'>
            {String(contentConfiguration.title)}
          </h1>
        )}
        {contentConfiguration?.description && String(contentConfiguration.description).trim() !== '' && (
          <p className='text-gray-600 text-center w-full max-w-4xl'>
            {String(contentConfiguration.description)}
          </p>
        )}
        <div className='w-full max-w-4xl'>
          <RankingList
            items={rankingItems}
            onMoveUp={() => { }}
            onMoveDown={() => { }}
            isSaving={false}
            isApiLoading={false}
            dataLoading={false}
            currentQuestionKey={currentQuestionKey}
            initialFormData={formData}
          />
        </div>
      </div>
    );
  },

  cognitive_short_text: ({ contentConfiguration, currentQuestionKey, formData }: CognitiveRendererArgs) => {
    const questionConfig = {
      title: String(contentConfiguration?.title || 'Respuesta Corta'),
      questionKey: currentQuestionKey,
      type: 'cognitive_short_text',
      config: {
        ...contentConfiguration,
        placeholder: String(contentConfiguration?.answerPlaceholder || 'Escribe tu respuesta aquí...')
      },
      choices: [],
      description: String(contentConfiguration?.description || 'Escribe tu respuesta')
    };

    return (
      <QuestionComponent
        question={questionConfig}
        currentStepKey={currentQuestionKey}
        initialFormData={formData}
      />
    );
  },

  cognitive_long_text: ({ contentConfiguration, currentQuestionKey, formData }: CognitiveRendererArgs) => (
    <QuestionComponent
      question={{
        title: String(contentConfiguration?.title || 'Respuesta Larga'),
        questionKey: currentQuestionKey,
        type: 'text',
        config: {
          ...contentConfiguration,
          placeholder: String(contentConfiguration?.answerPlaceholder || 'Escribe tu respuesta aquí...')
        },
        choices: [],
        description: String(contentConfiguration?.description || 'Escribe tu respuesta detallada')
      }}
      currentStepKey={currentQuestionKey}
      initialFormData={formData}
    />
  ),

  cognitive_multiple_choice: ({ contentConfiguration, currentQuestionKey, formData }: CognitiveRendererArgs) => {
    const questionConfig = {
      title: String(contentConfiguration?.title || 'Selección Múltiple'),
      questionKey: currentQuestionKey,
      type: 'choice',
      config: { ...contentConfiguration, multiple: true },
      choices: Array.isArray(contentConfiguration?.choices) ? contentConfiguration.choices : [],
      description: String(contentConfiguration?.description || 'Selecciona todas las opciones que apliquen')
    };

    return (
      <QuestionComponent
        question={questionConfig}
        currentStepKey={currentQuestionKey}
        initialFormData={formData}
      />
    );
  },

  cognitive_single_choice: ({ contentConfiguration, currentQuestionKey, formData }: CognitiveRendererArgs) => {
    const questionConfig = {
      title: String(contentConfiguration?.title || 'Selección Única'),
      questionKey: currentQuestionKey,
      type: 'choice',
      config: { ...contentConfiguration, multiple: false },
      choices: Array.isArray(contentConfiguration?.choices) ? contentConfiguration.choices : [],
      description: String(contentConfiguration?.description || 'Selecciona una opción')
    };

    return (
      <QuestionComponent
        question={questionConfig}
        currentStepKey={currentQuestionKey}
        initialFormData={formData}
      />
    );
  },

  cognitive_linear_scale: ({ contentConfiguration, currentQuestionKey, formData }: CognitiveRendererArgs) => {
    const scaleConfig: ScaleConfig = contentConfiguration?.scaleConfig || {};
    const min = scaleConfig.startValue || 0;
    const max = scaleConfig.endValue || 10;
    const startLabel = scaleConfig.startLabel || 'Strongly disagree';
    const endLabel = scaleConfig.endLabel || 'Strongly agree';

    return (
      <QuestionComponent
        question={{
          title: String(contentConfiguration?.title || 'Escala Lineal'),
          questionKey: currentQuestionKey,
          type: 'linear_scale',
          config: {
            ...contentConfiguration,
            min,
            max,
            startLabel,
            endLabel
          },
          choices: [],
          description: String(contentConfiguration?.description || 'Selecciona un valor en la escala')
        }}
        currentStepKey={currentQuestionKey}
        initialFormData={formData}
      />
    );
  },

  cognitive_rating: ({ contentConfiguration, currentQuestionKey, formData }: CognitiveRendererArgs) => (
    <QuestionComponent
      question={{
        title: String(contentConfiguration?.title || 'Calificación'),
        questionKey: currentQuestionKey,
        type: 'emoji',
        config: contentConfiguration as Record<string, unknown>,
        choices: [],
        description: String(contentConfiguration?.description || 'Califica usando las opciones')
      }}
      currentStepKey={currentQuestionKey}
      initialFormData={formData}
    />
  )
};

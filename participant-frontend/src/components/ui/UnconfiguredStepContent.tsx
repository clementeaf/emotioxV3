interface UnconfiguredStepContentProps {
  currentStep: string;
}

export const UnconfiguredStepContent = ({ currentStep }: UnconfiguredStepContentProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">
        Step: {currentStep}
      </h1>
      <p className="text-gray-500">
        Este paso aún no está configurado.
      </p>
    </div>
  );
};

interface InvalidResearchScreenProps {
  title?: string;
  message?: string;
}

export const InvalidResearchScreen = ({
  title = 'Invalid Research',
  message = 'No research ID provided'
}: InvalidResearchScreenProps) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {title}
        </h1>
        <p className="text-gray-600">
          {message}
        </p>
      </div>
    </div>
  );
};

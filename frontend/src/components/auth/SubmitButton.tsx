interface SubmitButtonProps {
  isLoading: boolean;
  loadingText: string;
  text: string;
  disabled?: boolean;
}

export const SubmitButton = ({
  isLoading,
  loadingText,
  text,
  disabled = false
}: SubmitButtonProps) => {
  return (
    <button
      type="submit"
      disabled={isLoading || disabled}
      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? loadingText : text}
    </button>
  );
};

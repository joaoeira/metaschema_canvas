interface ApiKeyFormProps {
  apiKey: string;
  error: string | null;
  isValidating: boolean;
  onApiKeyChange: (key: string) => void;
  onSubmit: () => void;
}

export function ApiKeyForm({
  apiKey,
  error,
  isValidating,
  onApiKeyChange,
  onSubmit,
}: ApiKeyFormProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSubmit();
    }
  };

  const canSubmit = apiKey.trim() && !isValidating;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-100 font-sans">
      <div className="bg-white p-8 rounded-lg shadow-lg min-w-96">
        <h2 className="text-xl font-semibold text-center mb-4">
          OpenAI API Key Required
        </h2>
        <p className="text-gray-600 text-center mb-6">
          Please enter your OpenAI API key to continue
        </p>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="sk-..."
          className="w-full p-3 border border-gray-300 rounded text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isValidating}
        />
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className={`w-full p-3 rounded text-sm font-medium transition-colors ${
            canSubmit
              ? "bg-blue-500 hover:bg-blue-600 text-white cursor-pointer"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {isValidating ? "Validating..." : "Save API Key"}
        </button>
      </div>
    </div>
  );
}

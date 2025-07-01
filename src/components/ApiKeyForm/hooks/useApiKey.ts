import { useEffect, useReducer } from "react";

interface ApiKeyState {
	apiKey: string;
	isValidated: boolean;
	isValidating: boolean;
	error: string | null;
}

type ApiKeyAction =
	| { type: "INIT_FROM_STORAGE"; payload: string }
	| { type: "UPDATE_KEY"; payload: string }
	| { type: "VALIDATION_START" }
	| { type: "VALIDATION_SUCCESS" }
	| { type: "VALIDATION_ERROR"; payload: string }
	| { type: "CLEAR_ERROR" };

const initialState: ApiKeyState = {
	apiKey: "",
	isValidated: false,
	isValidating: false,
	error: null,
};

function apiKeyReducer(state: ApiKeyState, action: ApiKeyAction): ApiKeyState {
	switch (action.type) {
		case "INIT_FROM_STORAGE":
			return {
				...state,
				apiKey: action.payload,
				isValidated: true,
				error: null,
			};

		case "UPDATE_KEY":
			return {
				...state,
				apiKey: action.payload,
				error: null,
			};

		case "VALIDATION_START":
			return {
				...state,
				isValidating: true,
				error: null,
			};

		case "VALIDATION_SUCCESS":
			return {
				...state,
				isValidating: false,
				isValidated: true,
				error: null,
			};

		case "VALIDATION_ERROR":
			return {
				...state,
				isValidating: false,
				isValidated: false,
				error: action.payload,
			};

		case "CLEAR_ERROR":
			return {
				...state,
				error: null,
			};

		default:
			return state;
	}
}

const STORAGE_KEY = "OPENAI_API_KEY";

async function validateOpenAIKey(apiKey: string): Promise<boolean> {
	try {
		const response = await fetch("https://api.openai.com/v1/models", {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
		});
		return response.ok;
	} catch (error) {
		console.error(error);
		throw new Error("Error while validating API key");
	}
}

export function useApiKey() {
	const [state, dispatch] = useReducer(apiKeyReducer, initialState);

	useEffect(() => {
		const savedApiKey = localStorage.getItem(STORAGE_KEY);
		if (savedApiKey) {
			dispatch({ type: "INIT_FROM_STORAGE", payload: savedApiKey });
		}
	}, []);

	const updateApiKey = (key: string) => {
		dispatch({ type: "UPDATE_KEY", payload: key });
	};

	const clearError = () => {
		dispatch({ type: "CLEAR_ERROR" });
	};

	const validateAndSaveApiKey = async () => {
		const trimmedKey = state.apiKey.trim();

		if (!trimmedKey) {
			dispatch({
				type: "VALIDATION_ERROR",
				payload: "Please enter an API key",
			});
			return;
		}

		dispatch({ type: "VALIDATION_START" });

		try {
			const isValid = await validateOpenAIKey(trimmedKey);

			if (isValid) {
				localStorage.setItem(STORAGE_KEY, trimmedKey);
				dispatch({ type: "VALIDATION_SUCCESS" });
			} else {
				dispatch({
					type: "VALIDATION_ERROR",
					payload: "Invalid API key. Please check your key and try again.",
				});
			}
		} catch (error) {
			console.error(error);
			dispatch({
				type: "VALIDATION_ERROR",
				payload:
					"Failed to validate API key. Please check your internet connection.",
			});
		}
	};

	return {
		apiKey: state.apiKey,
		isValidated: state.isValidated,
		isValidating: state.isValidating,
		error: state.error,
		updateApiKey,
		validateAndSaveApiKey,
		clearError,
	};
}

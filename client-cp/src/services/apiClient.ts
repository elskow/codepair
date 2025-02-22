import axios, {type AxiosInstance, type AxiosRequestConfig, type AxiosResponse} from "axios";

const API_BASE_URL =
	import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export class ApiError extends Error {
	constructor(
		public status: number,
		public message: string,
		public data?: unknown,
	) {
		super(message);
		this.name = "ApiError";
	}
}

class ApiClient {
	private client: AxiosInstance;

	constructor() {
		this.client = axios.create({
			baseURL: API_BASE_URL,
			headers: {
				"Content-Type": "application/json",
			},
		});

		// Request interceptor
		this.client.interceptors.request.use(
			(config) => {
				const token = localStorage.getItem("token");
				if (token) {
					config.headers.Authorization = `Bearer ${token}`;
				}
				return config;
			},
			(error) => Promise.reject(error),
		);

		// Response interceptor
		this.client.interceptors.response.use(
			(response) => response,
			(error) => {
				if (error.response) {
					// The request was made and the server responded with a status code
					// that falls out of the range of 2xx
					throw new ApiError(
						error.response.status,
						error.response.data?.message || "An error occurred",
						error.response.data,
					);
				}

				if (error.request) {
					// The request was made but no response was received
					throw new ApiError(0, "No response received from server");
				}

				// Something happened in setting up the request
				throw new ApiError(0, error.message);
			},
		);
	}

	// GET request
	async get<T>(endpoint: string, config: AxiosRequestConfig = {}): Promise<T> {
		return this.request<T>({
			...config,
			method: "get",
			url: endpoint,
		});
	}

	// POST request
	async post<T>(
		endpoint: string,
		data?: unknown,
		config: AxiosRequestConfig = {},
	): Promise<T> {
		return this.request<T>({
			...config,
			method: "post",
			url: endpoint,
			data,
		});
	}

	// PUT request
	async put<T>(
		endpoint: string,
		data?: unknown,
		config: AxiosRequestConfig = {},
	): Promise<T> {
		return this.request<T>({
			...config,
			method: "put",
			url: endpoint,
			data,
		});
	}

	// DELETE request
	async delete<T>(
		endpoint: string,
		config: AxiosRequestConfig = {},
	): Promise<T> {
		return this.request<T>({
			...config,
			method: "delete",
			url: endpoint,
		});
	}

	// PATCH request
	async patch<T>(
		endpoint: string,
		data?: unknown,
		config: AxiosRequestConfig = {},
	): Promise<T> {
		return this.request<T>({
			...config,
			method: "patch",
			url: endpoint,
			data,
		});
	}

	// Generic request method
	private async request<T>(config: AxiosRequestConfig): Promise<T> {
		const response: AxiosResponse<T> = await this.client.request(config);
		return response.data;
	}
}

export const apiClient = new ApiClient();

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../services/apiClient";
import type {
	CreateInterviewerRequest,
	Interviewer,
	UpdateInterviewerRequest,
} from "../types/interviewer.ts";

export function useInterviewers() {
	const queryClient = useQueryClient();

	const interviewersQuery = useQuery({
		queryKey: ["interviewers"],
		queryFn: () => apiClient.get<Interviewer[]>("/users/interviewers"),
	});

	const createInterviewerMutation = useMutation({
		mutationFn: (data: CreateInterviewerRequest) =>
			apiClient.post("/users/interviewers", data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["interviewers"] });
		},
	});

	const updateInterviewerMutation = useMutation({
		mutationFn: ({ id, ...data }: UpdateInterviewerRequest) =>
			apiClient.patch(`/users/interviewers/${id}`, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["interviewers"] });
		},
	});

	const deleteInterviewerMutation = useMutation({
		mutationFn: (id: string) => apiClient.delete(`/users/interviewers/${id}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["interviewers"] });
		},
	});

	return {
		interviewers: interviewersQuery.data || [],
		isLoading: interviewersQuery.isLoading,
		error: interviewersQuery.error,
		createInterviewer: createInterviewerMutation.mutateAsync,
		updateInterviewer: updateInterviewerMutation.mutateAsync,
		deleteInterviewer: deleteInterviewerMutation.mutateAsync,
	};
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type SubmitKeyRequest } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useSubmitKey() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: SubmitKeyRequest) => {
      const validated = api.earn.submitKey.input.parse(data);
      const res = await fetch(api.earn.submitKey.path, {
        method: api.earn.submitKey.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.earn.submitKey.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        if (res.status === 401) {
          throw new Error("Please login first");
        }
        throw new Error("Failed to submit key");
      }

      return api.earn.submitKey.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      toast({
        title: "Success!",
        description: data.message, // "Key submitted +40 TK"
        className: "bg-primary text-white border-none",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

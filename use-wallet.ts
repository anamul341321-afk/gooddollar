import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type WithdrawRequest } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useWithdraw() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: WithdrawRequest) => {
      const validated = api.withdraw.request.input.parse(data);
      const res = await fetch(api.withdraw.request.path, {
        method: api.withdraw.request.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.withdraw.request.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Withdrawal failed");
      }

      return api.withdraw.request.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      toast({
        title: "Request Sent",
        description: data.message,
      });
    },
    onError: (error) => {
      toast({
        title: "Withdrawal Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useTransactions() {
  return useQuery({
    queryKey: [api.transactions.list.path],
    queryFn: async () => {
      const res = await fetch(api.transactions.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return api.transactions.list.responses[200].parse(await res.json());
    },
  });
}

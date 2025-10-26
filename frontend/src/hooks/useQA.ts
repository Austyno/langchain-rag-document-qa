import { useMutation } from "@tanstack/react-query";
import { qaApi } from "../services/api";
import type { Message } from "../types";

export const useAskQuestion = () => {
  return useMutation({
    mutationFn: qaApi.ask,
  });
};

export const useChatQuestion = () => {
  return useMutation({
    mutationFn: ({ question, history }: { question: string; history: Message[] }) =>
      qaApi.chat(question, history),
  });
};

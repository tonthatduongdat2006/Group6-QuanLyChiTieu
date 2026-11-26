import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, type UpdateMeRequest } from '../auth';
import { qk } from './keys';

export const useMe = () => useQuery({ queryKey: qk.me, queryFn: authApi.me });

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateMeRequest) => authApi.updateMe(body),
    onSuccess: (user) => qc.setQueryData(qk.me, user),
  });
}

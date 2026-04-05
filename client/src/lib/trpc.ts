import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/routers";

/**
 * Cliente tRPC tipado para uso nos componentes React.
 *
 * O tipo `AppRouter` é importado diretamente do servidor,
 * garantindo inferência de tipos end-to-end (frontend ↔ backend)
 * sem necessidade de geração de código ou schemas adicionais.
 *
 * Uso nos componentes:
 * @example
 * // Query
 * const { data } = trpc.auth.me.useQuery();
 *
 * // Mutation
 * const activate = trpc.auth.activateAdminAccount.useMutation();
 * activate.mutate({ token, password, confirmPassword });
 */
export const trpc = createTRPCReact<AppRouter>();
import { useMemo } from 'react';
import { useQueries } from 'convex/react';
import type { RequestForQueries } from 'convex/react';
import { getFunctionName, makeFunctionReference } from 'convex/server';
import { convexToJson, jsonToConvex } from 'convex/values';
import type { Value } from 'convex/values';
import type {
 FunctionArgs,
 FunctionReference,
 FunctionReturnType,
} from 'convex/server';

export const useAdminQuery = <
 Query extends FunctionReference<'query', 'public'>,
>(
 query: Query,
 args: FunctionArgs<Query> | 'skip',
): { data: FunctionReturnType<Query> | undefined; error: string | null } => {
 const name = getFunctionName(query);
 const serializedArgs =
 args === 'skip' ? null : JSON.stringify(convexToJson(args));
 // useQueries needs a stable request object, including for skipped queries.
 const queries = useMemo<RequestForQueries>((): RequestForQueries => {
 if (serializedArgs === null) return {};
 return {
 data: {
 query: makeFunctionReference<'query'>(name),
 args: jsonToConvex(JSON.parse(serializedArgs)) as Record<string, Value>,
 },
 };
 }, [name, serializedArgs]);
 const result: unknown = useQueries(queries).data;
 if (result instanceof Error) {
 return {
 data: undefined,
 error:
 'Datele nu pot fi încărcate. Verifică accesul, conexiunea și publicarea funcțiilor Convex, apoi reîncarcă pagina.',
 };
 }
 return { data: result as FunctionReturnType<Query> | undefined, error: null };
};

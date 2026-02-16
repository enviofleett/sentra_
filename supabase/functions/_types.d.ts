declare module "https://deno.land/std@0.190.0/http/server.ts" {
  export function serve(handler: (req: Request) => Promise<Response> | Response): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2.45.0" {
  export interface SupabaseClient {
    auth: {
      getUser(token: string): Promise<{ data: { user: { id: string } | null }; error: any }>;
    };
    rpc(name: string, args?: Record<string, any>): Promise<{ data: any; error: any }>;
    from(table: string): {
      select(cols: string): any;
      eq(col: string, value: any): any;
      order(col: string, opts: { ascending: boolean }): any;
      limit(n: number): any;
    };
  }
  export function createClient(url: string, key: string): SupabaseClient;
}

declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
};

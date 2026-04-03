import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import B2BLayout from "@/components/b2b/B2BLayout";

export default async function B2BProtectedLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: Promise<{ slug: string }> | { slug: string };
}) {
    const resolvedParams = await Promise.resolve(params);
    const orgSlug = resolvedParams.slug;

    const supabase = await createClient();

    // 1. Verify User Session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        redirect("/login?type=business");
    }

    // 2. Fetch the requested organization — RLS: "Auth: Miembros ven su propia organizacion" (006)
    const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("id, commercial_name, status")
        .eq("slug", orgSlug)
        .single();

    if (orgError || !org) {
        redirect("/b2b/onboarding");
    }

    // 3. Verify membership — RLS: "Auth: Usuarios ven sus propias membresias" (006)
    const { data: membership, error: memError } = await supabase
        .from("organization_members")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("org_id", org.id)
        .single();

    if (memError || !membership || membership.status !== 'ACTIVE') {
        redirect("/b2b/onboarding");
    }

    return (
        <B2BLayout slug={orgSlug} orgNameProp={org.commercial_name}>
            {children}
        </B2BLayout>
    );
}

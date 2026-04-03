import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import PendingInvitations from "@/components/b2b/PendingInvitations";

export default async function B2BRoutingHub({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    const supabase = await createClient();
    const intent = searchParams?.intent as string | undefined;

    // 1. Validate Session
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        redirect('/login');
    }

    // 2. Fetch memberships — RLS: "Auth: Usuarios ven sus propias membresias" (006)
    const { data: memberships, error } = await supabase
        .from('organization_members')
        .select(`
            id,
            org_id,
            role_code,
            status,
            organizations (
                id,
                slug,
                status,
                commercial_name,
                created_at
            )
        `)
        .eq('user_id', user.id)
        .in('status', ['ACTIVE', 'INVITED']);



    if (error) {
        console.error("Error fetching memberships", error);
        redirect('/login?error=membership_check_failed');
    }

    // 3. Separate Active vs Invited
    const invitedMemberships = memberships?.filter(m => m.status === 'INVITED') || [];
    const activeMemberships = memberships?.filter(m => m.status === 'ACTIVE') || [];

    // 4. If there are pending invitations, HALT routing and show the acceptance UI
    if (invitedMemberships.length > 0) {
        return <PendingInvitations invitations={invitedMemberships} />;
    }

    // 5. If intent is 'owner' but they have NO active owner memberships, send to onboarding
    if (intent === 'owner') {
        const ownerMemberships = activeMemberships.filter(m => m.role_code === 'OWNER');
        if (ownerMemberships.length === 0) {
            redirect('/b2b/onboarding');
        }
    }

    // 6. If no active memberships at all, send to onboarding
    if (activeMemberships.length === 0) {
        redirect('/b2b/onboarding');
    }

    // 7. Sort Active memberships 
    const prioritizeRole = intent === 'owner' ? 'OWNER' : (intent === 'cashier' ? 'CASHIER' : null);

    const sortedMemberships = [...activeMemberships].sort((a, b) => {
        // Prioritize by intended role
        if (prioritizeRole) {
            if (a.role_code === prioritizeRole && b.role_code !== prioritizeRole) return -1;
            if (b.role_code === prioritizeRole && a.role_code !== prioritizeRole) return 1;
        }

        const orgA = a.organizations as any;
        const orgB = b.organizations as any;
        return new Date(orgB.created_at).getTime() - new Date(orgA.created_at).getTime();
    });

    const firstMembership = sortedMemberships[0];
    const orgData = firstMembership.organizations as any;

    if (!orgData || !orgData.slug) {
        redirect('/b2b/onboarding');
    }

    // 7. Redirect based on role
    if (firstMembership.role_code === 'CASHIER') {
        redirect(`/b2b/${orgData.slug}/pos`);
    } else {
        redirect(`/b2b/${orgData.slug}/dashboard`);
    }

    return (
        <div className="flex h-screen items-center justify-center">
            <p>Redirigiendo a tu espacio de trabajo...</p>
        </div>
    );
}

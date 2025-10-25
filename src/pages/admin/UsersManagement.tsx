import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Shield } from 'lucide-react';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: string;
}

export function UsersManagement() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('*');

    if (profilesError || rolesError) {
      toast.error('Failed to load users');
      console.error(profilesError || rolesError);
    } else {
      setProfiles(profilesData || []);
      setUserRoles(rolesData || []);
    }
    setLoading(false);
  };

  const getUserRoles = (userId: string) => {
    return userRoles.filter(ur => ur.user_id === userId).map(ur => ur.role);
  };

  const hasRole = (userId: string, role: string) => {
    return userRoles.some(ur => ur.user_id === userId && ur.role === role);
  };

  const toggleRole = async (userId: string, role: 'admin' | 'product_manager' | 'order_processor') => {
    const currentlyHasRole = hasRole(userId, role);

    if (currentlyHasRole) {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) {
        toast.error('Failed to remove role');
        console.error(error);
      } else {
        toast.success('Role removed successfully');
        fetchUsers();
      }
    } else {
      const { error } = await supabase
        .from('user_roles')
        .insert([{ user_id: userId, role }]);

      if (error) {
        toast.error('Failed to add role');
        console.error(error);
      } else {
        toast.success('Role added successfully');
        fetchUsers();
      }
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Users & Roles</h2>

      <Card>
        <CardHeader>
          <CardTitle>All Users ({profiles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => {
                const roles = getUserRoles(profile.id);
                return (
                  <TableRow key={profile.id}>
                    <TableCell>{profile.email}</TableCell>
                    <TableCell>{profile.full_name || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {roles.length > 0 ? (
                          roles.map(role => (
                            <span key={role} className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                              {role}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-xs">No roles</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(profile.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={hasRole(profile.id, 'admin') ? 'default' : 'outline'}
                          onClick={() => toggleRole(profile.id, 'admin')}
                        >
                          <Shield className="h-4 w-4 mr-1" />
                          Admin
                        </Button>
                        <Button
                          size="sm"
                          variant={hasRole(profile.id, 'product_manager') ? 'default' : 'outline'}
                          onClick={() => toggleRole(profile.id, 'product_manager')}
                        >
                          Product Mgr
                        </Button>
                        <Button
                          size="sm"
                          variant={hasRole(profile.id, 'order_processor') ? 'default' : 'outline'}
                          onClick={() => toggleRole(profile.id, 'order_processor')}
                        >
                          Order Proc
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

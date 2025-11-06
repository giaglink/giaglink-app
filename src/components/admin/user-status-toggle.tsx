'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { toggleUserStatus } from '@/app/admin/users/actions';
import { Label } from '@/components/ui/label';

interface UserStatusToggleProps {
  userId: string;
  initialIsActive: boolean;
}

export function UserStatusToggle({ userId, initialIsActive }: UserStatusToggleProps) {
  const [isActive, setIsActive] = useState(initialIsActive);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleToggle = async (checked: boolean) => {
    setIsLoading(true);
    try {
      const result = await toggleUserStatus(userId, checked);
      if (result.success) {
        setIsActive(checked);
        toast({
          title: 'Status Updated',
          description: result.message,
        });
      } else {
        toast({
          title: 'Update Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2 justify-end">
      <Label htmlFor={`status-toggle-${userId}`} className={isActive ? 'text-green-500' : 'text-destructive'}>
        {isActive ? 'Active' : 'Inactive'}
      </Label>
      <Switch
        id={`status-toggle-${userId}`}
        checked={isActive}
        onCheckedChange={handleToggle}
        disabled={isLoading}
        aria-label="Toggle user status"
      />
    </div>
  );
}

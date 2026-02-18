import { AccessDenied } from '@/gradian-ui/schema-manager/components/AccessDenied';

export default function ForbiddenPage() {
  return (
    <AccessDenied
      title="Access Denied"
      description="You don't have permission to view this resource."
      helperText="If you believe you should have access, please contact your system administrator."
      homeHref="/apps"
      showGoBackButton={false}
    />
  );
}


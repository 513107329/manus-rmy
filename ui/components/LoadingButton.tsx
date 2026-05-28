import { LoaderCircle } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type Props = ComponentProps<typeof Button> & {
  isLoading?: boolean;
  text: string;
  icon?: ReactNode;
};

const LoadingButton = ({ text, isLoading = false, icon, ...props }: Props) => {
  return (
    <Button {...props} disabled={isLoading}>
      {isLoading && <LoaderCircle className="animate-spin" />}
      {!isLoading && icon}
      {text}
    </Button>
  );
};

export default LoadingButton;

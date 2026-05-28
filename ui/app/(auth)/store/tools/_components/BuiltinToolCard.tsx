import type { ComponentProps } from 'react';
import BaseCard from '@/components/BaseCard';
import TimeCardFooter from '@/components/TimeCardFooter';
import { authClient } from '@/lib/auth-client';
import BuiltinToolCardHeader from './BuiltinToolCardHeader';

type Props = {
  description: string;
  createdAt: number;
  onClick: () => void;
} & ComponentProps<typeof BuiltinToolCardHeader>;

const BuiltinToolCard = ({
  description,
  createdAt,
  onClick,
  ...headerProps
}: Props) => {
  const { data: session } = authClient.useSession();

  const header = <BuiltinToolCardHeader {...headerProps} />;

  const footer = (
    <TimeCardFooter
      nickname="Leslie"
      avatarSrc={session?.user?.image ?? undefined}
      time={createdAt}
      timeLabel="Published time"
    />
  );

  return (
    <BaseCard
      top={header}
      middle={description}
      bottom={footer}
      onClick={onClick}
    />
  );
};

export default BuiltinToolCard;

'use client';

import type { ComponentProps } from 'react';
import BaseCard from '@/components/BaseCard';
import TimeCardFooter from '@/components/TimeCardFooter';
import ApiToolCardHeader from './ApiToolCardHeader';

type Props = {
  description: string;
  createdAt: number;
  onClick: () => void;
  authorName: string;
  authorAvatar?: string;
} & ComponentProps<typeof ApiToolCardHeader>;

const ApiToolCard = ({
  description,
  createdAt,
  onClick,
  authorAvatar,
  authorName,
  ...headerProps
}: Props) => {
  const header = <ApiToolCardHeader {...headerProps} authorName={authorName} />;

  const footer = (
    <TimeCardFooter
      nickname={authorName}
      avatarSrc={authorAvatar}
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

export default ApiToolCard;

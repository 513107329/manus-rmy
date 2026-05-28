import TitleCardHeader from '@/components/TitleCardHeader';

type Props = {
  providerLabel: string;
  toolCount: number;
  authorName: string;
  providerIcon: string;
};

const ApiToolCardHeader = ({
  providerIcon,
  providerLabel,
  authorName,
  toolCount,
}: Props) => {
  const subTitle = `${authorName} · ${toolCount} tools`;

  return (
    <TitleCardHeader
      title={providerLabel}
      subtitle={subTitle}
      imgSrc={providerIcon}
      imgAlt={providerLabel}
    />
  );
};

export default ApiToolCardHeader;

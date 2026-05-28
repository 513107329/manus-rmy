import TitleCardHeader from '@/components/TitleCardHeader';

type Props = {
  providerLabel: string;
  providerName: string;
  toolCount: number;
  providerIcon: string;
  providerBgColor: string;
};

const BuiltinToolCardHeader = ({
  providerIcon,
  providerLabel,
  providerName,
  toolCount,
  providerBgColor,
}: Props) => {
  const subTitle = `${providerName} · ${toolCount} tools`;

  return (
    <TitleCardHeader
      title={providerLabel}
      subtitle={subTitle}
      imgSrc={providerIcon}
      imgAlt={providerLabel}
      imgBgColor={providerBgColor}
    />
  );
};

export default BuiltinToolCardHeader;

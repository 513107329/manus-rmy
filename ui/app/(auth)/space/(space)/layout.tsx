import { User } from 'lucide-react';
import type { ReactNode } from 'react';
import TitleHeader from '../../_components/TitleHeader';
import SpaceHeader from './_components/SpaceHeader';

type Props = {
  children: ReactNode;
  action: ReactNode;
  modal: ReactNode;
};

const SpaceLayout = ({ children, action, modal }: Props) => {
  return (
    <div className="h-full flex flex-col">
      <TitleHeader
        className="mb-1 shrink-0 min-h-0"
        title="Space"
        icon={<User />}
      >
        {action}
      </TitleHeader>
      <SpaceHeader className="mb-2 shrink-0 min-h-0" />
      <div className="grow min-h-0">{children}</div>
      {modal}
    </div>
  );
};

export default SpaceLayout;

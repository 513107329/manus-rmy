import { AvatarImage } from '@radix-ui/react-avatar';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type Props = {
  nickname: string;
  time: number;
  timeLabel: string;
  avatarSrc?: string;
  avatarFallback?: string;
};

const TimeCardFooter = ({
  nickname,
  time,
  timeLabel,
  avatarSrc,
  avatarFallback = nickname[0],
}: Props) => {
  const msg = `${nickname} · ${timeLabel} ${format(time, 'MM-dd HH:mm')}`;

  return (
    <div className="flex gap-1 items-center">
      <Avatar className="size-4">
        <AvatarImage src={avatarSrc} alt={nickname} />
        <AvatarFallback className="text-xs bg-primary text-background">
          {avatarFallback}
        </AvatarFallback>
      </Avatar>
      <p className="text-xs text-muted-foreground">{msg}</p>
    </div>
  );
};

export default TimeCardFooter;

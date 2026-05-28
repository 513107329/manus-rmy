import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';

type Props = {
  name: string;
  icon: string;
  documentCount: number;
  hitCount: number;
  relatedAppCount: number;
};

const DatasetTitle = ({
  name,
  icon,
  documentCount,
  hitCount,
  relatedAppCount,
}: Props) => {
  return (
    <div className="h-10 flex items-center justify-start gap-3 my-6">
      <Link href="/space/datasets">
        <Button variant="ghost" size="icon">
          <ChevronLeft className="size-4" />
        </Button>
      </Link>
      <Avatar className="size-10 rounded-lg">
        <AvatarImage src={icon} alt={name} />
        <AvatarFallback>{name[0]}</AvatarFallback>
      </Avatar>
      <div>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Dataset</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="space-x-2">
          <Badge variant="secondary">{documentCount} docs</Badge>
          <Badge variant="secondary">{hitCount} hits</Badge>
          <Badge variant="secondary">{relatedAppCount} related apps</Badge>
        </div>
      </div>
    </div>
  );
};

export default DatasetTitle;

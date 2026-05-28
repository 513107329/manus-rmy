import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getApiToolProvider } from '@/services/api-tool-service';
import EditTool from './_components/EditTool';

type Props = {
  params: Promise<{ toolId: string }>;
};

const EditApiToolPage = async ({ params }: Props) => {
  const { toolId } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const toolProvider = await getApiToolProvider(
    session?.user?.id ?? '',
    toolId,
  );

  return (
    <div className="h-full p-8">
      <EditTool toolProvider={toolProvider} />
    </div>
  );
};

export default EditApiToolPage;

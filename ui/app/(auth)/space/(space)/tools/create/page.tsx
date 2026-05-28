'use client';

import { useRouter } from 'next/navigation';
import CreateToolForm from '../../_components/tools/CreateToolForm';

const CreateToolPage = () => {
  const router = useRouter();

  return (
    <div className="h-full p-8">
      <CreateToolForm onCancel={() => router.replace('/space/tools')} />
    </div>
  );
};

export default CreateToolPage;
